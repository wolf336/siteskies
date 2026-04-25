import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { differenceInDays } from "date-fns";
import { resolveLocationName } from "@/lib/geocode";
import WeatherRequirementsForm from "./WeatherRequirementsForm.jsx";
import LocationPicker from "./LocationPicker.jsx";

export default function EditProjectModal({ project, open, onClose }) {
  const queryClient = useQueryClient();
  const [dialogEl, setDialogEl] = useState(null);
  const [form, setForm] = useState({
    name: project.name || "",
    description: project.description || "",
    location: project.location || "",
    latitude: project.latitude ?? null,
    longitude: project.longitude ?? null,
    location_name: project.location_name || null,
    start_date: project.start_date || "",
    end_date: project.end_date || "",
  });
  const [requirements, setRequirements] = useState(project.required_weather || {
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

  const isValid = form.name && form.location && form.start_date && form.end_date && projectLength > 0;

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(project.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      onClose();
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    let finalLocationName = form.location_name;
    if (!finalLocationName && form.latitude != null && form.longitude != null) {
      finalLocationName = await resolveLocationName(form.latitude, form.longitude, 2000);
    }

    updateMutation.mutate({
      ...form,
      location_name: finalLocationName || null,
      project_length_days: projectLength,
      required_weather: requirements,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent ref={setDialogEl} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Project name"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
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
            portalTarget={dialogEl}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
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
              Duration: <span className="font-medium text-foreground">{projectLength} day{projectLength !== 1 ? "s" : ""}</span>
            </p>
          )}
          <div className="border-t border-border pt-4">
            <Label className="text-sm font-semibold mb-3 block">Weather Requirements</Label>
            <WeatherRequirementsForm requirements={requirements} onChange={setRequirements} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!isValid || updateMutation.isPending} className="gap-2">
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}