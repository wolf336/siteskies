import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const wmoToCondition = (code) => {
  if (code === 0) return "Clear Sky";
  if (code <= 3) return "Partly Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
};

const updateProjectWeather = async (project, base44) => {
  const req = project.required_weather || {};

  // Geocode if needed
  let latitude, longitude;
  if (project.latitude != null && project.longitude != null) {
    latitude = project.latitude;
    longitude = project.longitude;
  } else {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(project.location)}&count=1`
    );
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      throw new Error(`Location not found: ${project.location}`);
    }
    latitude = geoData.results[0].latitude;
    longitude = geoData.results[0].longitude;
  }

  // Cap end_date to today + 15
  const today = new Date();
  const capDate = new Date(today);
  capDate.setDate(today.getDate() + 15);
  const capDateStr = capDate.toISOString().split("T")[0];
  const effectiveEndDate = project.end_date < capDateStr ? project.end_date : capDateStr;

  const fRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,weathercode&timezone=auto&start_date=${project.start_date}&end_date=${effectiveEndDate}`
  );
  const fData = await fRes.json();
  if (!fData.daily?.time?.length) {
    throw new Error(`No forecast data available for project dates`);
  }

  const daily = fData.daily;
  const daily_forecasts = daily.time.map((date, i) => {
    const temp_high_c = daily.temperature_2m_max[i];
    const temp_low_c = daily.temperature_2m_min[i];
    const precipitation_mm = daily.precipitation_sum[i];
    const wind_speed_kmh = daily.windspeed_10m_max[i];
    const condition = wmoToCondition(daily.weathercode[i]);
    const precipitation_probability = daily.precipitation_probability_max[i];

    const issues = [];
    if (req.max_wind_speed_kmh != null && wind_speed_kmh >= req.max_wind_speed_kmh)
      issues.push(`Wind ${wind_speed_kmh} km/h exceeds limit of ${req.max_wind_speed_kmh} km/h`);
    if (req.max_precipitation_mm != null && precipitation_mm > req.max_precipitation_mm)
      issues.push(`Precipitation ${precipitation_mm} mm exceeds limit of ${req.max_precipitation_mm} mm`);
    if (req.min_temperature_c != null && temp_low_c < req.min_temperature_c)
      issues.push(`Low temp ${temp_low_c}°C below minimum ${req.min_temperature_c}°C`);
    if (req.max_temperature_c != null && temp_high_c > req.max_temperature_c)
      issues.push(`High temp ${temp_high_c}°C exceeds maximum ${req.max_temperature_c}°C`);
    if (req.no_thunderstorms && condition === "Thunderstorm") issues.push("Thunderstorm forecast");
    if (req.no_snow && condition === "Snow") issues.push("Snow forecast");
    if (req.no_fog && condition === "Fog") issues.push("Fog forecast");

    return { date, condition, temp_high_c, temp_low_c, precipitation_mm, precipitation_probability, wind_speed_kmh, meets_requirements: issues.length === 0, issues };
  });

  const badDays = daily_forecasts.filter(d => !d.meets_requirements).length;
  const forecastedDays = daily_forecasts.length;
  const badPercentage = forecastedDays > 0 ? badDays / forecastedDays : 0;
  let weather_signal;
  if (badDays === 0) weather_signal = "proceed";
  else if (badPercentage < 0.5) weather_signal = "caution";
  else weather_signal = "postpone";

  const weather_signal_details = `${badDays} of ${forecastedDays} forecasted days do not meet weather requirements.`;

  // Calculate project length
  const startMs = new Date(project.start_date).getTime();
  const endMs = new Date(project.end_date).getTime();
  const projectLengthDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
  const isPartial = daily_forecasts.length < projectLengthDays;
  const forecastCoversUntil = isPartial ? daily_forecasts[daily_forecasts.length - 1]?.date : null;

  await base44.asServiceRole.entities.Project.update(project.id, {
    weather_forecast: {
      last_checked: new Date().toISOString(),
      sources: ["Open-Meteo"],
      daily_forecasts,
      summary: "",
      partial_forecast: isPartial,
      forecast_covers_until: forecastCoversUntil,
    },
    weather_signal,
    weather_signal_details,
    status: project.status === "planning" ? "monitoring" : project.status,
  });
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await base44.asServiceRole.entities.Project.list();

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Only sync projects where start_date is within 16 days from today
    const eligibleProjects = projects.filter((p) => {
      if (!p.start_date) return false;
      const diffMs = new Date(p.start_date).getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays <= 16;
    });

    const results = await Promise.allSettled(
      eligibleProjects.map((p) => updateProjectWeather(p, base44))
    );

    const failed = [];
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        failed.push({ name: eligibleProjects[i].name, reason: result.reason?.message || "Unknown error" });
      }
    });

    const successCount = eligibleProjects.length - failed.length;

    // Save last bulk sync time and result to AppSetting
    const syncResult = {
      synced_at: new Date().toISOString(),
      success_count: successCount,
      failed_count: failed.length,
      failed_projects: failed,
      total_eligible: eligibleProjects.length,
    };

    // Upsert the AppSetting record
    const existing = await base44.asServiceRole.entities.AppSetting.filter({ key: "last_bulk_weather_sync" });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.AppSetting.update(existing[0].id, {
        value: JSON.stringify(syncResult),
      });
    } else {
      await base44.asServiceRole.entities.AppSetting.create({
        key: "last_bulk_weather_sync",
        value: JSON.stringify(syncResult),
      });
    }

    return Response.json({ success: true, successCount, failed, totalEligible: eligibleProjects.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});