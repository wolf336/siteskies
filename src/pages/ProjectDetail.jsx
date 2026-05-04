import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  RefreshCw,
  MapPin,
  Calendar,
  Clock,
  Thermometer,
  Wind,
  Droplets,
  Snowflake,
  CloudFog,
  Trash2,
  Loader2,
  Pencil,
} from "lucide-react";
import EditProjectModal from "@/components/projects/EditProjectModal.jsx";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import RecommendationBanner from "@/components/projects/RecommendationBanner.jsx";
import ForecastTimeline from "@/components/projects/ForecastTimeline.jsx";
import { useFormattedLocation } from "@/hooks/useFormattedLocation";
import { useTranslation } from "react-i18next";
import { buildDailyForecasts, computeWeatherSignal } from "@/lib/weatherEvaluation";

import { Link as RouterLink } from "react-router-dom";

export default function ProjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const results = await base44.entities.Project.filter({ id: projectId });
      return results[0] || null;
    },
    enabled: !!projectId,
  });

  // Auto-check weather when a new project is first loaded with no forecast
  const hasAutoChecked = React.useRef(false);
  React.useEffect(() => {
    if (project && !project.weather_forecast?.last_checked && !hasAutoChecked.current) {
      const today = new Date();
      const latestForecastDate = new Date(today);
      latestForecastDate.setDate(today.getDate() + 15);
      const startDate = new Date(project.start_date + "T00:00:00");
      if (startDate <= latestForecastDate) {
        hasAutoChecked.current = true;
        checkWeather();
      }
    }
  }, [project]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      window.location.href = createPageUrl("Dashboard");
    },
  });

  const checkWeather = async () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const latestForecastDate = new Date(today);
    latestForecastDate.setDate(today.getDate() + 15);
    const startDate = new Date(project.start_date + "T00:00:00");

    if (project.end_date < todayStr) {
      toast.error("This project has already ended. Weather can't be updated.");
      return;
    }

    // Guard: project starts beyond the forecast window — skip without consuming credit
    if (startDate > latestForecastDate) {
      setForecastError("Weather forecast is not yet available for these project dates. Forecasts are available up to 16 days ahead.");
      return;
    }

    setChecking(true);
    setForecastError("");

    // Atomically check + consume a refresh credit on the server
    let creditRes;
    try {
      creditRes = await base44.functions.invoke('consumeRefreshCredit', {});
    } catch (err) {
      const data = err?.response?.data;
      setChecking(false);
      if (data && data.allowed === false) {
        const { limit, tier } = data;
        toast.error(`Daily limit reached — you've used all ${limit} refresh${limit !== 1 ? 'es' : ''} today on your ${tier} plan. Upgrade for more.`, { duration: 5000 });
      } else {
        toast.error("Failed to check refresh limit. Please try again.", { duration: 4000 });
      }
      return;
    }

    if (!creditRes?.data?.allowed) {
      setChecking(false);
      const { limit, tier } = creditRes?.data || {};
      toast.error(`Daily limit reached — you've used all ${limit} refresh${limit !== 1 ? 'es' : ''} today on your ${tier} plan. Upgrade for more.`, { duration: 5000 });
      return;
    }

    try {
    const req = project.required_weather || {};

    // Step 1 — Geocode (skip if coordinates already stored)
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
        setForecastError("Location not found. Please check the project location and try again.");
        toast.error("Weather update failed. Please try again.", { duration: 3000 });
        setChecking(false);
        return;
      }
      latitude = geoData.results[0].latitude;
      longitude = geoData.results[0].longitude;
    }

    // Step 2 — Fetch forecast (cap end_date to today + 15 days = 16-day window)
    const capDate = new Date(today);
    capDate.setDate(today.getDate() + 15);
    const capDateStr = capDate.toISOString().split("T")[0];
    const effectiveEndDate = project.end_date < capDateStr ? project.end_date : capDateStr;

    // Defensive guard: effectiveEndDate before start_date means no data will be available
    if (effectiveEndDate < project.start_date) {
      setChecking(false);
      setForecastError("Weather forecast is not yet available for these project dates. Forecasts are available up to 16 days ahead.");
      return;
    }

    const baseUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=Europe%2FBerlin&start_date=${project.start_date}&end_date=${effectiveEndDate}`;
    const fRes = await fetch(`${baseUrl}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,weathercode`);
    const fData = await fRes.json();
    if (!fData.daily?.time?.length) {
      setChecking(false);
      setForecastError("Weather forecast is not yet available for these project dates. Forecasts are available up to 16 days ahead.");
      return;
    }

    // Always fetch hourly data for display; required for work-hours evaluation too
    let hourly = null;
    const hRes = await fetch(`${baseUrl}&hourly=temperature_2m,precipitation,precipitation_probability,windspeed_10m,weathercode`);
    const hData = await hRes.json();
    if (hData.hourly?.time?.length) hourly = hData.hourly;

    const daily_forecasts = buildDailyForecasts({ daily: fData.daily, hourly, req });
    const { weather_signal, weather_signal_details } = computeWeatherSignal(daily_forecasts);

    const projectLengthDays = differenceInDays(new Date(project.end_date), new Date(project.start_date)) + 1;
    const isPartial = daily_forecasts.length < projectLengthDays;
    const forecastCoversUntil = isPartial ? daily_forecasts[daily_forecasts.length - 1]?.date : null;

    await base44.entities.Project.update(projectId, {
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

    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    queryClient.invalidateQueries({ queryKey: ['subscription'] });

    setChecking(false);
    toast.success("Weather updated successfully", { duration: 3000 });
    } catch (err) {
      console.error("Weather update error:", err);
      // Refund the credit since the weather fetch/update failed
      base44.functions.invoke('refundRefreshCredit', {}).catch(e => console.error('Refund failed:', e));
      setChecking(false);
      setForecastError(`Weather update failed: ${err?.message || String(err)}`);
      toast.error(`Weather update failed: ${err?.message || "Unknown error"}`, { duration: 5000 });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Project not found.{" "}
        <Link to={createPageUrl("Dashboard")} className="text-primary underline">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <ProjectDetailContent
      project={project}
      projectId={projectId}
      checking={checking}
      setChecking={setChecking}
      forecastError={forecastError}
      setForecastError={setForecastError}
      editOpen={editOpen}
      setEditOpen={setEditOpen}
      checkWeather={checkWeather}
      deleteMutation={deleteMutation}
    />
  );
}

function ProjectDetailContent({ project, projectId, checking, setChecking, forecastError, setForecastError, editOpen, setEditOpen, checkWeather, deleteMutation }) {
  const { t } = useTranslation();
  const formattedLocation = useFormattedLocation(project.location, project.location_name);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const isCompleted = project.end_date < todayStr;
  const latestForecastDate = new Date(today);
  latestForecastDate.setDate(today.getDate() + 15);
  const startDate = new Date(project.start_date + "T00:00:00");
  const canCheckWeather = startDate <= latestForecastDate && !isCompleted;
  // Date when the project start will come within forecast range (start - 15 days)
  const forecastAvailableDate = new Date(project.start_date + "T00:00:00");
  forecastAvailableDate.setDate(forecastAvailableDate.getDate() - 15);
  const req = project.required_weather || {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {editOpen && <EditProjectModal project={project} open={editOpen} onClose={() => setEditOpen(false)} />}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={createPageUrl("Dashboard")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('project.backToProjects')}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {formattedLocation}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(project.start_date), "MMM d")} – {format(new Date(project.end_date), "MMM d, yyyy")}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {project.project_length_days || differenceInDays(new Date(project.end_date), new Date(project.start_date)) + 1} {t('project.days')}
            </div>
          </div>
        </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setEditOpen(true)}
              title="Edit project"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (window.confirm("Delete this project?")) {
                  deleteMutation.mutate(project.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
      </div>

      {/* Recommendation banner */}
      <RecommendationBanner
        weather_signal={project.weather_signal}
        bad_days={project.weather_forecast?.daily_forecasts?.filter(d => !d.meets_requirements).length ?? null}
        total_days={project.weather_forecast?.daily_forecasts?.length ?? null}
      />

      {/* Forecast error */}
      {forecastError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {forecastError}
        </div>
      )}

      {/* Check Weather button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('project.weatherForecast')}</h2>
          {project.weather_forecast?.last_checked && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('project.lastChecked', { date: format(new Date(project.weather_forecast.last_checked), "MMM d, yyyy 'at' h:mm a") })}
            </p>
          )}
        </div>
        <Button
          onClick={checkWeather}
          disabled={checking || !canCheckWeather || isCompleted}
          className="gap-2"
        >
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {checking ? t('project.checking') : t('project.checkWeather')}
        </Button>
      </div>

      {isCompleted && (
        <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
          {t('project.projectEnded', { date: format(new Date(project.end_date + "T00:00:00"), "MMMM d, yyyy") })}
        </div>
      )}

      {!canCheckWeather && !isCompleted && (
        <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
          {t('project.forecastNotAvailable', { date: format(forecastAvailableDate, "MMMM d, yyyy") })}
        </div>
      )}


      {project.weather_forecast?.partial_forecast && project.weather_forecast?.daily_forecasts?.length > 0 && (
        <div className="rounded-lg bg-accent/10 border border-accent/30 p-4 text-sm text-accent-foreground">
          {t('project.partialForecast', {
            shown: project.weather_forecast.daily_forecasts.length,
            total: project.project_length_days || differenceInDays(new Date(project.end_date), new Date(project.start_date)) + 1,
            date: format(new Date(new Date(project.end_date).setDate(new Date(project.end_date).getDate() - 16)), "MMMM d, yyyy"),
          })}
        </div>
      )}

      {/* Forecast timeline */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <ForecastTimeline
            forecasts={project.weather_forecast?.daily_forecasts}
            workHoursMode={req.evaluate_work_hours_only}
            workStartTime={req.work_start_time}
            workEndTime={req.work_end_time}
            requirements={req}
          />
        </CardContent>
      </Card>

      {/* Requirements summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('project.weatherRequirements')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {req.min_temperature_c != null && (
              <RequirementChip icon={Thermometer} label={t('project.minTemp')} value={`${req.min_temperature_c}°C`} />
            )}
            {req.max_temperature_c != null && (
              <RequirementChip icon={Thermometer} label={t('project.maxTemp')} value={`${req.max_temperature_c}°C`} />
            )}
            {req.max_wind_speed_kmh != null && (
              <RequirementChip icon={Wind} label={t('project.maxWind')} value={`${req.max_wind_speed_kmh} km/h`} />
            )}
            {req.max_precipitation_mm != null && (
              <RequirementChip icon={Droplets} label={t('project.maxRain')} value={`${req.max_precipitation_mm} mm`} />
            )}
            {req.no_snow && (
              <RequirementChip icon={Snowflake} label={t('project.noSnow')} value={t('project.required')} />
            )}
            {req.no_fog && (
              <RequirementChip icon={CloudFog} label={t('project.noFog')} value={t('project.required')} />
            )}
            {req.evaluate_work_hours_only && req.work_start_time && req.work_end_time && (
              <RequirementChip icon={Clock} label={t('weather.evaluateWorkHoursOnly')} value={`${req.work_start_time} – ${req.work_end_time}`} />
            )}
          </div>
          {req.custom_notes && (
            <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3">
              {req.custom_notes}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequirementChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}