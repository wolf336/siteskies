import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Inline weather evaluation helpers (cannot import from lib/ in backend functions) ───

const wmoToCondition = (code) => {
  if (code === 0) return "clear_sky";
  if (code <= 2) return "partly_cloudy";
  if (code === 3) return "cloudy";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain_showers";
  if (code <= 99) return "thunderstorm";
  return "unknown";
};

const isThunderstorm = (code) => code >= 80 && code <= 99;
const isSnow = (code) => code >= 70 && code <= 77;
const isFog = (code) => code >= 40 && code <= 48;

function evaluateDay({ temp_high_c, temp_low_c, precipitation_mm, wind_speed_kmh, condition, weathercode }, req) {
  const issues = [];
  if (req.max_wind_speed_kmh != null && wind_speed_kmh != null && wind_speed_kmh >= req.max_wind_speed_kmh)
    issues.push(`Wind ${wind_speed_kmh} km/h exceeds limit of ${req.max_wind_speed_kmh} km/h`);
  if (req.max_precipitation_mm != null && precipitation_mm != null && precipitation_mm > req.max_precipitation_mm)
    issues.push(`Precipitation ${precipitation_mm} mm exceeds limit of ${req.max_precipitation_mm} mm`);
  if (req.min_temperature_c != null && temp_low_c != null && temp_low_c < req.min_temperature_c)
    issues.push(`Low temp ${temp_low_c}°C below minimum ${req.min_temperature_c}°C`);
  if (req.max_temperature_c != null && temp_high_c != null && temp_high_c > req.max_temperature_c)
    issues.push(`High temp ${temp_high_c}°C exceeds maximum ${req.max_temperature_c}°C`);
  const condStr = condition || "";
  const code = weathercode;
  if (req.no_thunderstorms && (condStr === "thunderstorm" || (code != null && isThunderstorm(code)))) issues.push("Thunderstorm forecast");
  if (req.no_snow && (condStr === "snow" || (code != null && isSnow(code)))) issues.push("Snow forecast");
  if (req.no_fog && (condStr === "fog" || (code != null && isFog(code)))) issues.push("Fog forecast");
  return { meets_requirements: issues.length === 0, issues };
}

function buildDayFromDaily({ date, daily, i, req }) {
  const temp_high_c = daily.temperature_2m_max[i];
  const temp_low_c = daily.temperature_2m_min[i];
  const precipitation_mm = daily.precipitation_sum[i];
  const wind_speed_kmh = daily.windspeed_10m_max[i];
  const weathercode = daily.weathercode[i];
  const condition = wmoToCondition(weathercode);
  const precipitation_probability = daily.precipitation_probability_max[i];
  const { meets_requirements, issues } = evaluateDay(
    { temp_high_c, temp_low_c, precipitation_mm, wind_speed_kmh, condition, weathercode }, req
  );
  return { date, condition, temp_high_c, temp_low_c, precipitation_mm, precipitation_probability, wind_speed_kmh, meets_requirements, issues };
}

function buildDayFromHourly({ date, hourly, req }) {
  const startHHmm = req.work_start_time;
  const endHHmm = req.work_end_time;

  const windowIndices = [];
  hourly.time.forEach((isoTime, idx) => {
    if (!isoTime.startsWith(date)) return;
    const timePart = isoTime.split("T")[1];
    if (timePart >= startHHmm && timePart < endHHmm) windowIndices.push(idx);
  });

  const hourly_forecasts = [];
  hourly.time.forEach((isoTime, idx) => {
    if (!isoTime.startsWith(date)) return;
    const timePart = isoTime.split("T")[1];
    const inWindow = timePart >= startHHmm && timePart < endHHmm;
    const weathercode = hourly.weathercode[idx];
    hourly_forecasts.push({
      time: timePart,
      condition: wmoToCondition(weathercode),
      weathercode,
      temp_c: hourly.temperature_2m[idx],
      precipitation_mm: hourly.precipitation[idx],
      precipitation_probability: hourly.precipitation_probability[idx],
      wind_speed_kmh: hourly.windspeed_10m[idx],
      in_work_window: inWindow,
    });
  });

  if (windowIndices.length === 0) {
    return { date, condition: "unknown", temp_high_c: null, temp_low_c: null, precipitation_mm: null, precipitation_probability: null, wind_speed_kmh: null, meets_requirements: false, issues: ["No hourly data available for the work window"], hourly_forecasts };
  }

  const temps = windowIndices.map((idx) => hourly.temperature_2m[idx]).filter((v) => v != null);
  const precips = windowIndices.map((idx) => hourly.precipitation[idx]).filter((v) => v != null);
  const precipProbs = windowIndices.map((idx) => hourly.precipitation_probability[idx]).filter((v) => v != null);
  const winds = windowIndices.map((idx) => hourly.windspeed_10m[idx]).filter((v) => v != null);
  const codes = windowIndices.map((idx) => hourly.weathercode[idx]).filter((v) => v != null);

  const temp_high_c = temps.length ? Math.max(...temps) : null;
  const temp_low_c = temps.length ? Math.min(...temps) : null;
  const precipitation_mm = precips.length ? precips.reduce((a, b) => a + b, 0) : null;
  const precipitation_probability = precipProbs.length ? Math.max(...precipProbs) : null;
  const wind_speed_kmh = winds.length ? Math.max(...winds) : null;
  const worstCode = codes.length ? Math.max(...codes) : null;
  const condition = worstCode != null ? wmoToCondition(worstCode) : "unknown";

  const { meets_requirements, issues } = evaluateDay(
    { temp_high_c, temp_low_c, precipitation_mm, wind_speed_kmh, condition, weathercode: worstCode }, req
  );

  return { date, condition, temp_high_c, temp_low_c, precipitation_mm, precipitation_probability, wind_speed_kmh, meets_requirements, issues, hourly_forecasts };
}

function buildDailyForecasts({ daily, hourly, req }) {
  const useWorkHours =
    req.evaluate_work_hours_only === true &&
    req.work_start_time &&
    req.work_end_time &&
    hourly != null;

  return daily.time.map((date, i) => {
    if (useWorkHours) return buildDayFromHourly({ date, hourly, req });
    return buildDayFromDaily({ date, daily, i, req });
  });
}

function computeWeatherSignal(daily_forecasts) {
  const forecastedDays = daily_forecasts.length;
  const badDays = daily_forecasts.filter((d) => !d.meets_requirements).length;
  const badPercentage = forecastedDays > 0 ? badDays / forecastedDays : 0;
  let weather_signal;
  if (badDays === 0) weather_signal = "proceed";
  else if (badPercentage < 0.5) weather_signal = "caution";
  else weather_signal = "postpone";
  const weather_signal_details = `${badDays} of ${forecastedDays} forecasted days do not meet weather requirements.`;
  return { weather_signal, weather_signal_details };
}

// ─── End inline helpers ───

const updateProjectWeather = async (project, base44) => {
  const req = project.required_weather || {};

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

  const today = new Date();
  const capDate = new Date(today);
  capDate.setDate(today.getDate() + 15);
  const capDateStr = capDate.toISOString().split("T")[0];
  const effectiveEndDate = project.end_date < capDateStr ? project.end_date : capDateStr;

  // Always fetch daily data (needed for both modes)
  const fRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,weathercode&timezone=Europe%2FBerlin&start_date=${project.start_date}&end_date=${effectiveEndDate}`
  );
  const fData = await fRes.json();
  if (!fData.daily?.time?.length) {
    throw new Error(`No forecast data available for project dates`);
  }

  // Phase 3 will add hourly fetch here when work-hours mode is on
  const hourly = null;

  const daily_forecasts = buildDailyForecasts({ daily: fData.daily, hourly, req });
  const { weather_signal, weather_signal_details } = computeWeatherSignal(daily_forecasts);

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
  });
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Consume a SINGLE refresh credit for the entire bulk sync
    let creditRes;
    try {
      creditRes = await base44.functions.invoke('consumeRefreshCredit', {});
    } catch (err) {
      const data = err?.response?.data;
      if (data && data.allowed === false) {
        return Response.json({
          success: false,
          allowed: false,
          error: `Daily refresh limit reached`,
          limit: data.limit,
          tier: data.tier,
        }, { status: 200 });
      }
      throw err;
    }

    if (!creditRes?.data?.allowed) {
      const { limit, tier } = creditRes?.data || {};
      return Response.json({
        success: false,
        allowed: false,
        error: `Daily refresh limit reached`,
        limit,
        tier,
      }, { status: 200 });
    }

    const projects = await base44.asServiceRole.entities.Project.filter({ created_by: user.email });

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const eligibleProjects = projects.filter((p) => {
      if (!p.start_date || !p.end_date) return false;
      if (p.end_date < todayStr) return false;
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

    const settingKey = `last_bulk_weather_sync:${user.id}`;
    const syncResult = {
      synced_at: new Date().toISOString(),
      success_count: successCount,
      failed_count: failed.length,
      failed_projects: failed,
      total_eligible: eligibleProjects.length,
    };

    const existing = await base44.asServiceRole.entities.AppSetting.filter({ key: settingKey });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.AppSetting.update(existing[0].id, { value: JSON.stringify(syncResult) });
    } else {
      await base44.asServiceRole.entities.AppSetting.create({ key: settingKey, value: JSON.stringify(syncResult) });
    }

    return Response.json({ success: true, successCount, failed, totalEligible: eligibleProjects.length });
  } catch (error) {
    console.error("bulkUpdateWeather error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});