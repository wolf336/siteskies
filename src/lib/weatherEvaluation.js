/**
 * Shared weather evaluation helpers.
 *
 * buildDailyForecasts() converts Open-Meteo API data into the daily_forecasts
 * array stored on the Project entity. It supports two evaluation modes:
 *
 *   1. Full-day mode (default / legacy): uses daily summary fields from
 *      Open-Meteo's `daily` response object — unchanged from the original
 *      behaviour. All existing projects without work-hour settings use this.
 *
 *   2. Working-hours mode: uses Open-Meteo hourly data, filtering each day's
 *      rows to those whose local time falls within [work_start_time, work_end_time].
 *      Activated when required_weather.evaluate_work_hours_only === true AND
 *      hourly data is supplied.
 *
 * Phase 2 wires up the helper in both places (refreshProjectWeather + bulkUpdateWeather)
 * while keeping the API calls unchanged. Phase 3 will add the actual hourly API call.
 */

export const wmoToCondition = (code) => {
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

// Human-readable label used in issue strings (kept simple for existing behaviour)
export const wmoToLabel = (code) => {
  if (code === 0) return "Clear Sky";
  if (code <= 2) return "Partly Cloudy";
  if (code === 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
};

/** Return true if the WMO code represents a thunderstorm condition */
const isThunderstorm = (code) => code >= 80 && code <= 99;
/** Return true if the WMO code represents snow */
const isSnow = (code) => code >= 70 && code <= 77;
/** Return true if the WMO code represents fog */
const isFog = (code) => code >= 40 && code <= 48;

/**
 * Evaluate a single day against requirements using pre-computed summary values.
 * Returns { meets_requirements, issues }.
 */
export function evaluateDay({ temp_high_c, temp_low_c, precipitation_mm, wind_speed_kmh, condition, weathercode }, req) {
  const issues = [];

  if (req.max_wind_speed_kmh != null && wind_speed_kmh != null && wind_speed_kmh >= req.max_wind_speed_kmh)
    issues.push(`Wind ${wind_speed_kmh} km/h exceeds limit of ${req.max_wind_speed_kmh} km/h`);
  if (req.max_precipitation_mm != null && precipitation_mm != null && precipitation_mm > req.max_precipitation_mm)
    issues.push(`Precipitation ${precipitation_mm} mm exceeds limit of ${req.max_precipitation_mm} mm`);
  if (req.min_temperature_c != null && temp_low_c != null && temp_low_c < req.min_temperature_c)
    issues.push(`Low temp ${temp_low_c}°C below minimum ${req.min_temperature_c}°C`);
  if (req.max_temperature_c != null && temp_high_c != null && temp_high_c > req.max_temperature_c)
    issues.push(`High temp ${temp_high_c}°C exceeds maximum ${req.max_temperature_c}°C`);

  // Condition-based checks — support both string labels and WMO codes
  const condStr = condition || "";
  const code = weathercode;
  const hasThunderstorm = condStr === "thunderstorm" || (code != null && isThunderstorm(code));
  const hasSnow = condStr === "snow" || (code != null && isSnow(code));
  const hasFog = condStr === "fog" || (code != null && isFog(code));

  if (req.no_thunderstorms && hasThunderstorm) issues.push("Thunderstorm forecast");
  if (req.no_snow && hasSnow) issues.push("Snow forecast");
  if (req.no_fog && hasFog) issues.push("Fog forecast");

  return { meets_requirements: issues.length === 0, issues };
}

/**
 * Build the daily_forecasts array from Open-Meteo API data.
 *
 * @param {object} params
 * @param {object} params.daily        - Open-Meteo daily response object (always required)
 * @param {object|null} params.hourly  - Open-Meteo hourly response object (required for work-hours mode)
 * @param {object} params.req          - project.required_weather
 * @returns {Array} daily_forecasts array ready to store on the entity
 */
export function buildDailyForecasts({ daily, hourly, req }) {
  const useWorkHours =
    req.evaluate_work_hours_only === true &&
    req.work_start_time &&
    req.work_end_time &&
    hourly != null;

  return daily.time.map((date, i) => {
    if (useWorkHours) {
      return buildDayFromHourly({ date, hourly, req });
    } else {
      return buildDayFromDaily({ date, daily, i, req });
    }
  });
}

/** Full-day evaluation from Open-Meteo daily summary fields (legacy / default mode) */
function buildDayFromDaily({ date, daily, i, req }) {
  const temp_high_c = daily.temperature_2m_max[i];
  const temp_low_c = daily.temperature_2m_min[i];
  const precipitation_mm = daily.precipitation_sum[i];
  const wind_speed_kmh = daily.windspeed_10m_max[i];
  const weathercode = daily.weathercode[i];
  const condition = wmoToCondition(weathercode);
  const precipitation_probability = daily.precipitation_probability_max[i];

  const { meets_requirements, issues } = evaluateDay(
    { temp_high_c, temp_low_c, precipitation_mm, wind_speed_kmh, condition, weathercode },
    req
  );

  return {
    date,
    condition,
    temp_high_c,
    temp_low_c,
    precipitation_mm,
    precipitation_probability,
    wind_speed_kmh,
    meets_requirements,
    issues,
  };
}

/**
 * Working-hours evaluation from Open-Meteo hourly data.
 * Filters hourly rows to those within [work_start_time, work_end_time] for the given date.
 * If no rows fall within the window, marks the day as not meeting requirements.
 */
function buildDayFromHourly({ date, hourly, req }) {
  const startHHmm = req.work_start_time; // e.g. "07:00"
  const endHHmm = req.work_end_time;     // e.g. "17:00"

  // Find hourly indices for this date within the work window
  const windowIndices = [];
  hourly.time.forEach((isoTime, idx) => {
    // Open-Meteo hourly time format: "2024-05-01T09:00" (local time when timezone=Europe/Berlin)
    if (!isoTime.startsWith(date)) return;
    const timePart = isoTime.split("T")[1]; // "09:00"
    if (timePart >= startHHmm && timePart < endHHmm) {
      windowIndices.push(idx);
    }
  });

  // Build hourly_forecasts array for all hours of this day (for UI display)
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

  // If no hourly data at all for this day, fall back to "no data" — mark as not meeting reqs
  if (windowIndices.length === 0) {
    return {
      date,
      condition: "unknown",
      temp_high_c: null,
      temp_low_c: null,
      precipitation_mm: null,
      precipitation_probability: null,
      wind_speed_kmh: null,
      meets_requirements: false,
      issues: ["No hourly data available for the work window"],
      hourly_forecasts,
    };
  }

  // Aggregate work-window values
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

  // Most severe condition: pick the highest WMO code in the window
  const worstCode = codes.length ? Math.max(...codes) : null;
  const condition = worstCode != null ? wmoToCondition(worstCode) : "unknown";

  const { meets_requirements, issues } = evaluateDay(
    { temp_high_c, temp_low_c, precipitation_mm, wind_speed_kmh, condition, weathercode: worstCode },
    req
  );

  return {
    date,
    condition,
    temp_high_c,
    temp_low_c,
    precipitation_mm,
    precipitation_probability,
    wind_speed_kmh,
    meets_requirements,
    issues,
    hourly_forecasts,
  };
}

/**
 * Compute weather_signal and weather_signal_details from a daily_forecasts array.
 */
export function computeWeatherSignal(daily_forecasts) {
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