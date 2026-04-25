import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, FileText, CloudSun, Loader2, Plus } from "lucide-react";
import { differenceInDays } from "date-fns";
import { resolveLocationName } from "@/lib/geocode";
import { Link } from "react-router-dom";
import WeatherRequirementsForm from "@/components/projects/WeatherRequirementsForm.jsx";
import LocationPicker from "@/components/projects/LocationPicker.jsx";
import { useSubscription } from "@/hooks/useSubscription";
import { TIER_CONFIG } from "@/lib/subscriptionConfig";

export default function NewProject() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const { data: subData } = useSubscription();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    latitude: null,
    longitude: null,
    location_name: null,
    start_date: today,
    end_date: "",
  });
  const [requirements, setRequirements] = useState({
    max_wind_speed_kmh: null,
    max_precipitation_mm: null,
    min_temperature_c: null,
    max_temperature_c: null,
    no_thunderstorms: true,
    no_snow: false,
    no_fog: false,
    custom_notes: "",
  });

  const projectLength =
    form.start_date && form.end_date
      ? differenceInDays(new Date(form.end_date), new Date(form.start_date)) + 1
      : 0;

  const tier = subData?.subscription?.tier || 'free';
  const tierConfig = TIER_CONFIG[tier];
  const projectCount = subData?.projectCount || 0;
  const atProjectLimit = projectCount >= tierConfig.maxProjects;

  const isValid = form.name && form.location && form.start_date && form.end_date && projectLength > 0 && !atProjectLimit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Atomic backend check — uses effective plan (inherits team owner's tier if applicable)
    try {
      const res = await base44.functions.invoke('checkProjectLimit', {});
      if (res.data?.allowed === false) {
        const { limit, tier } = res.data;
        const tierName = TIER_CONFIG[tier]?.name || tier;
        toast.error(`You've reached the ${limit} project limit on the ${tierName} plan.`, { duration: 5000 });
        setSaving(false);
        return;
      }
      if (res.data?.error) throw new Error(res.data.error);
    } catch (err) {
      console.error("Project limit check failed:", err);
      toast.error("Couldn't verify your project quota. Please try again.", { duration: 4000 });
      setSaving(false);
      return;
    }

    let finalLocationName = form.location_name;
    if (!finalLocationName && form.latitude != null && form.longitude != null) {
      finalLocationName = await resolveLocationName(form.latitude, form.longitude, 2000);
    }

    const project = await base44.entities.Project.create({
      ...form,
      location_name: finalLocationName || null,
      project_length_days: projectLength,
      required_weather: requirements,
    });
    navigate(createPageUrl(`ProjectDetail?id=${project.id}`));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        to={createPageUrl("Dashboard")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">New Project</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up your project details and weather requirements
        </p>
      </div>

      {atProjectLimit && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          You've reached the <strong>{tierConfig.maxProjects} project</strong> limit on the <strong>{tierConfig.name}</strong> plan.{' '}
          <Link to={createPageUrl("Settings") + "?section=billing"} className="underline font-medium">Upgrade your plan</Link> to create more projects.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                placeholder="e.g. Roof Installation – 42 Smith St"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of the project..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <LocationPicker
              location={form.location}
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={({ location, latitude, longitude, location_name }) =>
                setForm((f) => ({ ...f, location, latitude, longitude, location_name: location_name ?? null }))
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  End Date
                </Label>
                <Input
                  type="date"
                  value={form.end_date}
                  min={form.start_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            {projectLength > 0 && (
              <p className="text-sm text-muted-foreground">
                Project duration: <span className="font-medium text-foreground">{projectLength} day{projectLength !== 1 ? "s" : ""}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Weather requirements */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <CloudSun className="h-4 w-4 text-primary" />
              Weather Requirements
            </CardTitle>
            <p className="text-xs text-muted-foreground">Fields left blank impose no restriction on that condition.</p>
          </CardHeader>
          <CardContent>
            <WeatherRequirementsForm
              requirements={requirements}
              onChange={setRequirements}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link to={createPageUrl("Dashboard")}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={!isValid || saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create Project
          </Button>
        </div>
      </form>
    </div>
  );
}