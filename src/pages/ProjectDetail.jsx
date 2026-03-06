import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import RecommendationBanner from "@/components/projects/RecommendationBanner.jsx";
import ForecastTimeline from "@/components/projects/ForecastTimeline.jsx";

export default function ProjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => base44.entities.Project.list().then((list) => list.find((p) => p.id === projectId)),
    enabled: !!projectId,
  });

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

  const checkWeather = async () => {
    setChecking(true);
    const req = project.required_weather || {};

    const prompt = `You are a weather forecasting assistant. For the location "${project.location}", provide a detailed weather forecast for the dates from ${project.start_date} to ${project.end_date}.

For each day, provide:
- date (YYYY-MM-DD format)
- condition (e.g. sunny, cloudy, rain, thunderstorm, snow, fog, partly cloudy)
- temp_high_c (high temperature in celsius)
- temp_low_c (low temperature in celsius)
- precipitation_mm (expected precipitation in mm)
- wind_speed_kmh (expected wind speed in km/h)
- humidity_pct (humidity percentage)

Also evaluate each day against these requirements:
${req.max_wind_speed_kmh ? `- Max wind speed: ${req.max_wind_speed_kmh} km/h` : ""}
${req.max_precipitation_mm != null ? `- Max precipitation: ${req.max_precipitation_mm} mm/day` : ""}
${req.min_temperature_c != null ? `- Min temperature: ${req.min_temperature_c}°C` : ""}
${req.max_temperature_c != null ? `- Max temperature: ${req.max_temperature_c}°C` : ""}
${req.no_thunderstorms ? "- No thunderstorms allowed" : ""}
${req.no_snow ? "- No snow allowed" : ""}
${req.no_fog ? "- No fog allowed" : ""}
${req.custom_notes ? `- Additional: ${req.custom_notes}` : ""}

For each day, set meets_requirements to true/false and list any issues.

Also provide:
- An overall summary of the weather outlook
- A recommendation: "proceed" if weather looks good, "caution" if some days are borderline, or "postpone" if conditions are clearly unfavorable
- Detailed recommendation reasoning

Be realistic and use your knowledge of typical weather patterns for this location and time of year. Today's date is ${new Date().toISOString().split("T")[0]}.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          daily_forecasts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                condition: { type: "string" },
                temp_high_c: { type: "number" },
                temp_low_c: { type: "number" },
                precipitation_mm: { type: "number" },
                wind_speed_kmh: { type: "number" },
                humidity_pct: { type: "number" },
                meets_requirements: { type: "boolean" },
                issues: { type: "array", items: { type: "string" } },
              },
            },
          },
          summary: { type: "string" },
          recommendation: { type: "string", enum: ["proceed", "caution", "postpone"] },
          recommendation_details: { type: "string" },
          sources: { type: "array", items: { type: "string" } },
        },
      },
    });

    await base44.entities.Project.update(projectId, {
      weather_forecast: {
        last_checked: new Date().toISOString(),
        sources: result.sources || ["AI Weather Analysis", "Internet Weather Data"],
        daily_forecasts: result.daily_forecasts || [],
        summary: result.summary || "",
      },
      recommendation: result.recommendation || "pending",
      recommendation_details: result.recommendation_details || "",
      status: project.status === "planning" ? "monitoring" : project.status,
    });

    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    setChecking(false);
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

  const daysUntilStart = differenceInDays(new Date(project.start_date), new Date());
  const canCheckWeather = daysUntilStart <= 28;
  const req = project.required_weather || {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
              {project.location}
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
          <Select
            value={project.status}
            onValueChange={(value) => updateMutation.mutate({ id: project.id, data: { status: value } })}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="monitoring">Monitoring</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="postponed">Postponed</SelectItem>
            </SelectContent>
          </Select>
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
        recommendation={project.recommendation}
        details={project.recommendation_details}
      />

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
          Weather checks become available 4 weeks before the project start date.
          <span className="font-medium text-foreground ml-1">
            {daysUntilStart} days until start
          </span>
          — check back in {daysUntilStart - 28} day{daysUntilStart - 28 !== 1 ? "s" : ""}.
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