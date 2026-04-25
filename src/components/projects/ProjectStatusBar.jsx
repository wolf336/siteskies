import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
{ value: "planning", label: "Planning" },
{ value: "monitoring", label: "Monitoring" },
{ value: "ready", label: "Ready" },
{ value: "in_progress", label: "In Progress" },
{ value: "completed", label: "Completed" }];


export default function ProjectStatusBar({ status, onStatusChange }) {
  const isPostponed = status === "postponed";
  const activeIndex = STAGES.findIndex((s) => s.value === status);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Progress bar */}
        

























        

        {/* Postponed badge */}
        {isPostponed &&
        <button
          onClick={() => onStatusChange("monitoring")}
          className="flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/30 px-3 py-1 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors shrink-0"
          title="Click to remove postponed status">
          
            <X className="h-3.5 w-3.5" />
            Postponed
          </button>
        }
      </div>

      {/* Mark as postponed button */}
      {!isPostponed &&
      <button
        onClick={() => onStatusChange("postponed")}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive/50 hover:text-destructive hover:bg-destructive/5 transition-colors">
        
          Mark as Postponed
        </button>
      }
    </div>);

}