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

function HourlyRow({ hour }) {
  const HourIcon = getConditionIcon(hour.condition);
  const { t } = useTranslation();
  return (
    <div className={`flex items-center gap-3 px-3 py-1.5 text-xs ${hour.in_work_window ? "bg-primary/5" : "opacity-50"}`}>
      <span className="w-12 shrink-0 font-mono text-muted-foreground">{hour.time}</span>
      <HourIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="w-14 shrink-0 text-muted-foreground">{hour.temp_c != null ? `${hour.temp_c}°` : "–"}</span>
      <span className="w-16 shrink-0 text-muted-foreground">{hour.precipitation_mm != null ? `${hour.precipitation_mm}mm` : "–"}</span>
      <span className="w-16 shrink-0 text-muted-foreground">{hour.precipitation_probability != null ? `${hour.precipitation_probability} %` : "–"}</span>
      <span className="text-muted-foreground">{hour.wind_speed_kmh != null ? `${hour.wind_speed_kmh}km/h` : "–"}</span>
      {hour.in_work_window && (
        <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {t('forecast.workBadge')}
        </span>
      )}
    </div>
  );
}

export default function ForecastTimeline({ forecasts, workHoursMode, workStartTime, workEndTime }) {
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
              <div className={`group flex items-center gap-4 p-3.5 ${hasHourly ? "cursor-pointer" : ""}`}
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
                      {issues.join(" · ")}
                    </p>
                  )}
                </div>

                {/* Weather stats */}
                <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Thermometer className="h-3.5 w-3.5" />
                        <span>{day.temp_low_c ?? "–"}° / {day.temp_high_c ?? "–"}°</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t('forecast.tempTooltip')}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Droplets className="h-3.5 w-3.5" />
                        <span>{day.precipitation_mm ?? 0}mm</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t('forecast.precipTooltip')}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Wind className="h-3.5 w-3.5" />
                        <span>{day.wind_speed_kmh ?? 0}km/h</span>
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
                <div className="border-t border-border">
                  <div className="flex items-center gap-3 px-3 py-1.5 text-[11px] font-medium text-muted-foreground border-b border-border/50">
                    <span className="w-12 shrink-0">{t('forecast.hourlyTime')}</span>
                    <span className="w-5 shrink-0" />
                    <span className="w-14 shrink-0">{t('forecast.hourlyTemp')}</span>
                    <span className="w-16 shrink-0">{t('forecast.hourlyRain')}</span>
                    <span className="w-16 shrink-0">{t('forecast.hourlyProb')}</span>
                    <span>{t('forecast.hourlyWind')}</span>
                  </div>
                  {day.hourly_forecasts.map((hour) => (
                    <HourlyRow key={hour.time} hour={hour} />
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