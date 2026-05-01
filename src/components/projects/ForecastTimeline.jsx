import React, { useState } from "react";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const fmt = {
  temp: (v) => v != null ? `${parseFloat(v).toFixed(1)}°` : "–",
  precip: (v) => v != null ? `${parseFloat(v).toFixed(1)} mm` : "–",
  wind: (v) => v != null ? `${parseFloat(v).toFixed(1)} km/h` : "–",
  prob: (v) => v != null ? `${Math.round(v)} %` : "–",
};

const conditionIcons = {
  sunny: Sun,
  clear: Sun,
  "partly cloudy": Cloud,
  cloudy: Cloud,
  overcast: Cloud,
  rain: CloudRain,
  "light rain": CloudRain,
  "heavy rain": CloudRain,
  showers: CloudRain,
  drizzle: CloudRain,
  snow: CloudSnow,
  "light snow": CloudSnow,
  thunderstorm: CloudLightning,
  fog: CloudFog,
  mist: CloudFog,
};

function getConditionIcon(condition) {
  if (!condition) return Cloud;
  const lower = condition.toLowerCase().replace(/_/g, " ");
  for (const [key, Icon] of Object.entries(conditionIcons)) {
    if (lower.includes(key)) return Icon;
  }
  return Cloud;
}

/** Display-only per-hour evaluation — does NOT affect daily aggregation */
function evaluateHour(hour, req) {
  if (!req) return { meets: true, issues: [] };
  const issues = [];
  const { temp_c, precipitation_mm, wind_speed_kmh, condition, weathercode } = hour;
  if (req.min_temperature_c != null && temp_c != null && temp_c < req.min_temperature_c)
    issues.push(`${temp_c}° < min ${req.min_temperature_c}°`);
  if (req.max_temperature_c != null && temp_c != null && temp_c > req.max_temperature_c)
    issues.push(`${temp_c}° > max ${req.max_temperature_c}°`);
  if (req.max_precipitation_mm != null && precipitation_mm != null && precipitation_mm > req.max_precipitation_mm)
    issues.push(`${precipitation_mm}mm rain`);
  if (req.max_wind_speed_kmh != null && wind_speed_kmh != null && wind_speed_kmh >= req.max_wind_speed_kmh)
    issues.push(`${wind_speed_kmh}km/h wind`);
  const cond = condition || "";
  const code = weathercode;
  if (req.no_thunderstorms && (cond === "thunderstorm" || (code != null && code >= 95 && code <= 99)))
    issues.push("Thunderstorm");
  if (req.no_snow && (cond === "snow" || (code != null && ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)))))
    issues.push("Snow");
  if (req.no_fog && (cond === "fog" || (code != null && code >= 45 && code <= 48)))
    issues.push("Fog");
  return { meets: issues.length === 0, issues };
}

function HourlyRow({ hour, req, workHoursMode }) {
  const HourIcon = getConditionIcon(hour.condition);
  const inWindow = hour.in_work_window;
  // Only evaluate and highlight when work-hours mode is active
  const { meets, issues } = (workHoursMode && inWindow) ? evaluateHour(hour, req) : { meets: true, issues: [] };
  const hasProblem = workHoursMode && inWindow && !meets;
  const dimmed = workHoursMode && !inWindow;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-3 px-3 py-1.5 text-xs transition-colors ${
          hasProblem
            ? "bg-destructive/5 hover:bg-destructive/10"
            : (workHoursMode && inWindow)
              ? "bg-primary/5 hover:bg-primary/10"
              : "hover:bg-muted/40"
        } ${dimmed ? "opacity-50" : ""}`}>
          <span className={`w-12 shrink-0 font-mono ${dimmed ? "text-muted-foreground" : "text-foreground font-medium"}`}>
            {hour.time}
          </span>
          <HourIcon className={`h-3.5 w-3.5 shrink-0 ${hasProblem ? "text-destructive" : dimmed ? "text-muted-foreground" : "text-foreground"}`} />
          <span className={`w-14 shrink-0 ${dimmed ? "text-muted-foreground" : "text-foreground"}`}>
            {fmt.temp(hour.temp_c)}
          </span>
          <span className={`w-16 shrink-0 ${dimmed ? "text-muted-foreground" : "text-foreground"}`}>
            {fmt.precip(hour.precipitation_mm)}
          </span>
          <span className={`w-16 shrink-0 ${dimmed ? "text-muted-foreground" : "text-foreground"}`}>
            {fmt.prob(hour.precipitation_probability)}
          </span>
          <span className={`flex-1 ${dimmed ? "text-muted-foreground" : "text-foreground"}`}>
            {fmt.wind(hour.wind_speed_kmh)}
          </span>
          {workHoursMode && inWindow && (
            <span className="ml-auto shrink-0 flex items-center gap-1.5">
              {hasProblem ? (
                <>
                  <span className="text-[10px] text-destructive font-medium hidden sm:inline truncate max-w-[120px]">
                    {issues[0]}{issues.length > 1 ? ` +${issues.length - 1}` : ""}
                  </span>
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                </>
              ) : (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </span>
          )}
        </div>
      </TooltipTrigger>
      {workHoursMode && inWindow && hasProblem && issues.length > 0 && (
        <TooltipContent side="left" className="max-w-[200px]">
          <p className="font-medium mb-1">Issues this hour:</p>
          <ul className="space-y-0.5">
            {issues.map((iss, i) => <li key={i}>• {iss}</li>)}
          </ul>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export default function ForecastTimeline({ forecasts, workHoursMode, workStartTime, workEndTime, requirements }) {
  const { t, i18n } = useTranslation();
  const dateFnsLocale = i18n.language === "de" ? de : enUS;
  const [expandedDays, setExpandedDays] = useState({});

  if (!forecasts || forecasts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        {t('forecast.noForecast')}
      </div>
    );
  }

  const toggleDay = (date) => setExpandedDays((prev) => ({ ...prev, [date]: !prev[date] }));

  return (
    <TooltipProvider>
      {workHoursMode && workStartTime && workEndTime && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {t('weather.evaluateWorkHoursOnly')}: <strong>{workStartTime} – {workEndTime}</strong>
        </div>
      )}
      <div className="space-y-2">
        {forecasts.map((day, i) => {
          const ConditionIcon = getConditionIcon(day.condition);
          const meetsReqs = day.meets_requirements !== false;
          const issues = day.issues || [];
          const hasHourly = day.hourly_forecasts?.length > 0;
          const isExpanded = expandedDays[day.date];

          return (
            <div
              key={day.date || i}
              className={`rounded-xl border transition-all ${
                meetsReqs
                  ? "border-border bg-card"
                  : "border-destructive/20 bg-destructive/[0.03]"
              }`}
            >
              {/* Day row */}
              <div
                className={`group flex items-center gap-4 p-3.5 ${hasHourly ? "cursor-pointer" : ""}`}
                onClick={hasHourly ? () => toggleDay(day.date) : undefined}
              >
                {/* Date */}
                <div className="w-20 shrink-0 text-center">
                  <p className="text-xs font-medium text-muted-foreground">
                    {day.date ? format(new Date(day.date + "T00:00:00"), "EEE", { locale: dateFnsLocale }) : "—"}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {day.date ? format(new Date(day.date + "T00:00:00"), "MMM d", { locale: dateFnsLocale }) : "—"}
                  </p>
                </div>

                {/* Condition icon */}
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  meetsReqs ? "bg-primary/10" : "bg-destructive/10"
                }`}>
                  <ConditionIcon className={`h-5 w-5 ${meetsReqs ? "text-primary" : "text-destructive"}`} />
                </div>

                {/* Condition text */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground capitalize">
                    {day.condition ? t(`condition.${day.condition.toLowerCase().replace(/ /g, '_')}`, { defaultValue: day.condition }) : t('condition.unknown')}
                  </p>
                  {issues.length > 0 && (
                    <p className="text-xs text-destructive mt-0.5 truncate">
                      {issues.map(s => s.replace(/\d+\.\d+/g, n => parseFloat(n).toFixed(1))).join(" · ")}
                    </p>
                  )}
                </div>

                {/* Weather stats */}
                <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Thermometer className="h-3.5 w-3.5" />
                        <span>{fmt.temp(day.temp_low_c)} / {fmt.temp(day.temp_high_c)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t('forecast.tempTooltip')}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Droplets className="h-3.5 w-3.5" />
                        <span>{fmt.precip(day.precipitation_mm ?? 0)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t('forecast.precipTooltip')}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Wind className="h-3.5 w-3.5" />
                        <span>{fmt.wind(day.wind_speed_kmh ?? 0)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t('forecast.windTooltip')}</TooltipContent>
                  </Tooltip>
                </div>

                {/* Status badge + expand toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  {meetsReqs ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15">
                      <Check className="h-3.5 w-3.5 text-success" />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    </div>
                  )}
                  {hasHourly && (
                    isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Hourly breakdown */}
              {hasHourly && isExpanded && (
                <div className="border-t border-border bg-card rounded-b-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground border-b border-border/50 bg-muted/30">
                    <span className="w-12 shrink-0">{t('forecast.hourlyTime')}</span>
                    <span className="w-5 shrink-0" />
                    <span className="w-14 shrink-0">{t('forecast.hourlyTemp')}</span>
                    <span className="w-16 shrink-0">{t('forecast.hourlyRain')}</span>
                    <span className="w-16 shrink-0">%</span>
                    <span className="flex-1">{t('forecast.hourlyWind')}</span>
                  </div>
                  {day.hourly_forecasts.map((hour) => (
                    <HourlyRow key={hour.time} hour={hour} req={requirements} workHoursMode={workHoursMode} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}