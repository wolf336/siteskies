import React from "react";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
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
  const lower = condition.toLowerCase();
  for (const [key, Icon] of Object.entries(conditionIcons)) {
    if (lower.includes(key)) return Icon;
  }
  return Cloud;
}

export default function ForecastTimeline({ forecasts }) {
  const { t, i18n } = useTranslation();
  const dateFnsLocale = i18n.language === "de" ? de : enUS;
  if (!forecasts || forecasts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        {t('forecast.noForecast')}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {forecasts.map((day, i) => {
          const ConditionIcon = getConditionIcon(day.condition);
          const meetsReqs = day.meets_requirements !== false;
          const issues = day.issues || [];

          return (
            <div
              key={day.date || i}
              className={`group flex items-center gap-4 rounded-xl border p-3.5 transition-all ${
                meetsReqs
                  ? "border-border bg-card hover:border-success/30"
                  : "border-destructive/20 bg-destructive/[0.03] hover:border-destructive/40"
              }`}
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

              {/* Status badge */}
              <div className="shrink-0">
                {meetsReqs ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15">
                    <Check className="h-3.5 w-3.5 text-success" />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}