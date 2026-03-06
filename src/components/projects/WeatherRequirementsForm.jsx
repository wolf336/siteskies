import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Thermometer, Wind, Droplets, CloudLightning, Snowflake, CloudFog } from "lucide-react";

export default function WeatherRequirementsForm({ requirements, onChange }) {
  const update = (key, value) => {
    onChange({ ...requirements, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Temperature range */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Thermometer className="h-4 w-4 text-primary" />
            Min Temperature (°C)
          </Label>
          <Input
            type="number"
            placeholder="e.g. 5"
            value={requirements.min_temperature_c ?? ""}
            onChange={(e) => update("min_temperature_c", e.target.value ? Number(e.target.value) : null)}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Thermometer className="h-4 w-4 text-destructive" />
            Max Temperature (°C)
          </Label>
          <Input
            type="number"
            placeholder="e.g. 35"
            value={requirements.max_temperature_c ?? ""}
            onChange={(e) => update("max_temperature_c", e.target.value ? Number(e.target.value) : null)}
          />
        </div>

        {/* Wind */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Wind className="h-4 w-4 text-primary" />
            Max Wind Speed (km/h)
          </Label>
          <Input
            type="number"
            placeholder="e.g. 40"
            value={requirements.max_wind_speed_kmh ?? ""}
            onChange={(e) => update("max_wind_speed_kmh", e.target.value ? Number(e.target.value) : null)}
          />
        </div>

        {/* Precipitation */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Droplets className="h-4 w-4 text-primary" />
            Max Precipitation (mm/day)
          </Label>
          <Input
            type="number"
            placeholder="e.g. 5"
            value={requirements.max_precipitation_mm ?? ""}
            onChange={(e) => update("max_precipitation_mm", e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      </div>

      {/* Toggle conditions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
          <Label className="flex items-center gap-2 text-sm cursor-pointer">
            <CloudLightning className="h-4 w-4 text-warning" />
            No Thunderstorms
          </Label>
          <Switch
            checked={requirements.no_thunderstorms || false}
            onCheckedChange={(v) => update("no_thunderstorms", v)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
          <Label className="flex items-center gap-2 text-sm cursor-pointer">
            <Snowflake className="h-4 w-4 text-primary" />
            No Snow
          </Label>
          <Switch
            checked={requirements.no_snow || false}
            onCheckedChange={(v) => update("no_snow", v)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
          <Label className="flex items-center gap-2 text-sm cursor-pointer">
            <CloudFog className="h-4 w-4 text-muted-foreground" />
            No Fog
          </Label>
          <Switch
            checked={requirements.no_fog || false}
            onCheckedChange={(v) => update("no_fog", v)}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Additional Requirements</Label>
        <Textarea
          placeholder="Any other weather conditions to watch for..."
          value={requirements.custom_notes || ""}
          onChange={(e) => update("custom_notes", e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}