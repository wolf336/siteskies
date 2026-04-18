import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ProjectStatusBar from "@/components/projects/ProjectStatusBar.jsx";
import {
  ArrowLeft,
  RefreshCw,
  MapPin,
  Calendar,
  Clock,
  Thermometer,
  Wind,
  Droplets,
  CloudLightning,
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
import { useSubscription } from "@/hooks/useSubscription";
import { TIER_CONFIG } from "@/lib/subscriptionConfig";
import { Link as RouterLink } from "react-router-dom";

export default function ProjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const { data: subData } = useSubscription();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => base44.entities.Project.list().then((list) => list.find((p) => p.id === projectId)),
    enabled: !!projectId,
  });

  // Auto-check weather when a new project is first loaded with no forecast
  const hasAutoChecked = React.useRef(false);
  React.useEffect(() => {
    if (project && !project.weather_forecast?.last_checked && !hasAutoChecked.current) {
      const daysUntil = differenceInDays(new Date(project.start_date), new Date());
      if (daysUntil <= 16) {
        hasAutoChecked.current = true;
        checkWeather();
      }
    }
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      window.location.href = createPageUrl("Dashboard");
    },
  });

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

  const checkWeather = async () => {
    // Check daily refresh limit
    const sub = subData?.subscription;
    const tier = sub?.tier || 'free';
    const config = TIER_CONFIG[tier];
    const todayRefreshes = sub?.daily_refresh_count || 0;
    if (todayRefreshes >= config.maxRefreshesPerDay) {
      toast.error(`You've used all ${config.maxRefreshesPerDay} daily refreshes on your ${config.name} plan. Upgrade for more.`, { duration: 5000 });
      return;
    }

    setChecking(true);
    setForecastError("");
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
      setChecking(false);
      setForecastError("Weather forecast is not yet available for these project dates. Forecasts are available up to 16 days ahead.");
      return;
    }
    const daily = fData.daily;

    // Step 3 — Map to daily_forecasts
    const daily_forecasts = daily.time.map((date, i) => {
      const temp_high_c = daily.temperature_2m_max[i];
      const temp_low_c = daily.temperature_2m_min[i];
      const precipitation_mm = daily.precipitation_sum[i];
      const wind_speed_kmh = daily.windspeed_10m_max[i];
      const condition = wmoToCondition(daily.weathercode[i]);
      const precipitation_probability = daily.precipitation_probability_max[i];

      // Step 4 — Check requirements
      const issues = [];
      if (req.max_wind_speed_kmh != null && wind_speed_kmh >= req.max_wind_speed_kmh)
        issues.push(`Wind speed ${wind_speed_kmh} km/h exceeds limit of ${req.max_wind_speed_kmh} km/h`);
      if (req.max_precipitation_mm != null && precipitation_mm > req.max_precipitation_mm)
        issues.push(`Precipitation ${precipitation_mm} mm exceeds limit of ${req.max_precipitation_mm} mm`);
      if (req.min_temperature_c != null && temp_low_c < req.min_temperature_c)
        issues.push(`Low temp ${temp_low_c}°C is below minimum ${req.min_temperature_c}°C`);
      if (req.max_temperature_c != null && temp_high_c > req.max_temperature_c)
        issues.push(`High temp ${temp_high_c}°C exceeds maximum ${req.max_temperature_c}°C`);
      if (req.no_thunderstorms && condition === "Thunderstorm")
        issues.push("Thunderstorm forecast");
      if (req.no_snow && condition === "Snow")
        issues.push("Snow forecast");
      if (req.no_fog && condition === "Fog")
        issues.push("Fog forecast");

      return { date, condition, temp_high_c, temp_low_c, precipitation_mm, precipitation_probability, wind_speed_kmh, meets_requirements: issues.length === 0, issues };
    });

    // Step 5 — Rule-based weather signal
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
      status: project.status === "planning" ? "monitoring" : project.status,
    });

    queryClient.invalidateQueries({ queryKey: ["project", projectId] });

    // Increment daily refresh count
    if (subData?.subscription?.id) {
      const today = new Date().toISOString().split('T')[0];
      const sub = subData.subscription;
      const currentCount = sub.daily_refresh_date === today ? (sub.daily_refresh_count || 0) : 0;
      await base44.entities.Subscription.update(sub.id, {
        daily_refresh_count: currentCount + 1,
        daily_refresh_date: today,
      });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }

    setChecking(false);
    toast.success("Weather updated successfully", { duration: 3000 });
    } catch (err) {
      console.error("Weather update error:", err);
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
      updateMutation={updateMutation}
      deleteMutation={deleteMutation}
    />
  );
}

function ProjectDetailContent({ project, projectId, checking, setChecking, forecastError, setForecastError, editOpen, setEditOpen, checkWeather, updateMutation, deleteMutation }) {
  const formattedLocation = useFormattedLocation(project.location);

  const daysUntilStart = differenceInDays(new Date(project.start_date), new Date());
  const canCheckWeather = daysUntilStart <= 16;
  const forecastAvailableDate = new Date(project.start_date);
  forecastAvailableDate.setDate(forecastAvailableDate.getDate() - 16);
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
            Back to Projects
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
              {project.project_length_days || differenceInDays(new Date(project.end_date), new Date(project.start_date)) + 1} days
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

      {/* Status progress bar */}
      <ProjectStatusBar
        status={project.status}
        onStatusChange={(value) => updateMutation.mutate({ id: project.id, data: { status: value } })}
      />

      {/* Recommendation banner */}
      <RecommendationBanner
        weather_signal={project.weather_signal}
        weather_signal_details={project.weather_signal_details}
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
          <h2 className="text-lg font-semibold text-foreground">Weather Forecast</h2>
          {project.weather_forecast?.last_checked && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last checked: {format(new Date(project.weather_forecast.last_checked), "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>
        <Button
          onClick={checkWeather}
          disabled={checking || !canCheckWeather}
          className="gap-2"
        >
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {checking ? "Checking..." : "Check Weather"}
        </Button>
      </div>

      {!canCheckWeather && (
        <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
          Forecast not yet available. Your first forecast will be ready on{" "}
          <span className="font-medium text-foreground">
            {format(forecastAvailableDate, "MMMM d, yyyy")}
          </span>.
        </div>
      )}

      {project.weather_forecast?.partial_forecast && project.weather_forecast?.daily_forecasts?.length > 0 && (
        <div className="rounded-lg bg-accent/10 border border-accent/30 p-4 text-sm text-accent-foreground">
          Showing forecast for{" "}
          <span className="font-medium">{project.weather_forecast.daily_forecasts.length}</span> of{" "}
          <span className="font-medium">{project.project_length_days || differenceInDays(new Date(project.end_date), new Date(project.start_date)) + 1}</span> project days.
          Full forecast available from{" "}
          <span className="font-medium">
            {format(new Date(new Date(project.end_date).setDate(new Date(project.end_date).getDate() - 16)), "MMMM d, yyyy")}
          </span>.
        </div>
      )}

      {/* Forecast timeline */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <ForecastTimeline forecasts={project.weather_forecast?.daily_forecasts} />
        </CardContent>
      </Card>

      {/* Requirements summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weather Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {req.min_temperature_c != null && (
              <RequirementChip icon={Thermometer} label="Min Temp" value={`${req.min_temperature_c}°C`} />
            )}
            {req.max_temperature_c != null && (
              <RequirementChip icon={Thermometer} label="Max Temp" value={`${req.max_temperature_c}°C`} />
            )}
            {req.max_wind_speed_kmh != null && (
              <RequirementChip icon={Wind} label="Max Wind" value={`${req.max_wind_speed_kmh} km/h`} />
            )}
            {req.max_precipitation_mm != null && (
              <RequirementChip icon={Droplets} label="Max Rain" value={`${req.max_precipitation_mm} mm`} />
            )}
            {req.no_thunderstorms && (
              <RequirementChip icon={CloudLightning} label="No Storms" value="Required" />
            )}
            {req.no_snow && (
              <RequirementChip icon={Snowflake} label="No Snow" value="Required" />
            )}
            {req.no_fog && (
              <RequirementChip icon={CloudFog} label="No Fog" value="Required" />
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