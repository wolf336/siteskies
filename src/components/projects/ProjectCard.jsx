import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, CloudRain, Sun, TriangleAlert, Hourglass, Pencil } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import EditProjectModal from "./EditProjectModal.jsx";
import { useFormattedLocation } from "@/hooks/useFormattedLocation";

const statusConfig = {
  planning: { label: "Planning", className: "bg-secondary text-secondary-foreground" },
  monitoring: { label: "Monitoring", className: "bg-primary/10 text-primary" },
  ready: { label: "Ready", className: "bg-success/15 text-success" },
  in_progress: { label: "In Progress", className: "bg-primary/10 text-primary" },
  completed: { label: "Completed", className: "bg-success/15 text-success" },
  postponed: { label: "Postponed", className: "bg-destructive/10 text-destructive" },
};

const recommendationConfig = {
  proceed: { label: "Proceed", icon: Sun, className: "border-success/30 bg-success/10 text-success" },
  caution: { label: "Caution", icon: TriangleAlert, className: "border-warning/30 bg-warning/10 text-warning" },
  postpone: { label: "Postpone", icon: CloudRain, className: "border-destructive/30 bg-destructive/10 text-destructive" },
  pending: { label: "Pending", icon: Hourglass, className: "border-border bg-muted text-muted-foreground" },
};

export default function ProjectCard({ project }) {
  const [editOpen, setEditOpen] = useState(false);
  const formattedLocation = useFormattedLocation(project.location);
  const daysUntilStart = differenceInDays(new Date(project.start_date), new Date());
  const rec = recommendationConfig[project.weather_signal || "pending"];
  const RecIcon = rec.icon;
  const stat = statusConfig[project.status || "planning"];

  return (
    <>
    {editOpen && <EditProjectModal project={project} open={editOpen} onClose={() => setEditOpen(false)} />}
    <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
      <Card className="group relative overflow-hidden border border-border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        <div
          className={`absolute left-0 top-0 h-full w-1 ${
            project.weather_signal === "proceed"
              ? "bg-success"
              : project.weather_signal === "caution"
              ? "bg-warning"
              : project.weather_signal === "postpone"
              ? "bg-destructive"
              : "bg-muted-foreground/20"
          }`}
        />
        <CardContent className="p-5 pl-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 mb-1.5">
                <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <Badge variant="outline" className={`shrink-0 text-[11px] font-medium ${stat.className} border-0`}>
                  {stat.label}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{formattedLocation}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {format(new Date(project.start_date), "MMM d")} – {format(new Date(project.end_date), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {daysUntilStart > 0
                      ? `${daysUntilStart} day${daysUntilStart !== 1 ? "s" : ""} away`
                      : isPast(new Date(project.end_date))
                      ? "Ended"
                      : "Started"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.preventDefault(); setEditOpen(true); }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Edit project"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 ${rec.className}`}>
                <RecIcon className="h-4 w-4" />
                <span className="text-xs font-semibold">{rec.label}</span>
              </div>
            </div>
          </div>


        </CardContent>
      </Card>
    </Link>
    </>
  );
}