import { base44 } from "@/api/base44Client";
import { differenceInDays } from "date-fns";

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

/**
 * Refreshes a project's weather forecast and stores the result.
 * Designed to be called after edits — fails silently if not possible
 * (project is in the past, daily limit hit, geocode fails, etc.).
 *
 * Returns { ok: true } on success, { ok: false, reason: string } on skip/failure.
 * Never throws.
 */
export async function refreshProjectWeather(project) {
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    // Skip past projects
    if (project.end_date < todayStr) {
      return { ok: false, reason: "past" };
    }

    // Skip projects that start more than 16 days out — Open-Meteo can't forecast them
    const today = new Date();
    const diffDays = Math.ceil((new Date(project.start_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 16) {
      return { ok: false, reason: "too_far_future" };
    }

    // Consume a credit. If it fails (limit hit, etc.), bail silently.
    let creditRes;
    try {
      creditRes = await base44.functions.invoke("consumeRefreshCredit", {});
    } catch {
      return { ok: false, reason: "limit" };
    }
    if (!creditRes?.data?.allowed) {
      return { ok: false, reason: "limit" };
    }

    const req = project.required_weather || {};

    // Use stored coordinates or geocode from location string
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
        base44.functions.invoke("refundRefreshCredit", {}).catch(() => {});
        return { ok: false, reason: "geocode_failed" };
      }
      latitude = geoData.results[0].latitude;
      longitude = geoData.results[0].longitude;
    }

    // Cap end_date to today + 15 to stay within Open-Meteo's 16-day window
    const capDate = new Date(today);
    capDate.setDate(today.getDate() + 15);
    const capDateStr = capDate.toISOString().split("T")[0];
    const effectiveEndDate = project.end_date < capDateStr ? project.end_date : capDateStr;

    const fRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,weathercode&timezone=auto&start_date=${project.start_date}&end_date=${effectiveEndDate}`
    );
    const fData = await fRes.json();
    if (!fData.daily?.time?.length) {
      base44.functions.invoke("refundRefreshCredit", {}).catch(() => {});
      return { ok: false, reason: "no_forecast_data" };
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
        issues.push(`Wind speed ${wind_speed_kmh} km/h exceeds limit of ${req.max_wind_speed_kmh} km/h`);
      if (req.max_precipitation_mm != null && precipitation_mm > req.max_precipitation_mm)
        issues.push(`Precipitation ${precipitation_mm} mm exceeds limit of ${req.max_precipitation_mm} mm`);
      if (req.min_temperature_c != null && temp_low_c < req.min_temperature_c)
        issues.push(`Low temp ${temp_low_c}°C is below minimum ${req.min_temperature_c}°C`);
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

    const projectLengthDays = differenceInDays(new Date(project.end_date), new Date(project.start_date)) + 1;
    const isPartial = daily_forecasts.length < projectLengthDays;
    const forecastCoversUntil = isPartial ? daily_forecasts[daily_forecasts.length - 1]?.date : null;

    await base44.entities.Project.update(project.id, {
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

    return { ok: true };
  } catch (err) {
    console.error("refreshProjectWeather error:", err);
    base44.functions.invoke("refundRefreshCredit", {}).catch(() => {});
    return { ok: false, reason: "error" };
  }
}