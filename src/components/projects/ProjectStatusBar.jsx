import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { value: "planning", label: "Planning" },
  { value: "monitoring", label: "Monitoring" },
  { value: "ready", label: "Ready" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export default function ProjectStatusBar({ status, onStatusChange }) {
  const isPostponed = status === "postponed";
  const activeIndex = STAGES.findIndex((s) => s.value === status);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Progress bar */}
        <div className="flex-1 flex items-center">
          {STAGES.map((stage, i) => {
            const isActive = i <= activeIndex && !isPostponed;
            const isCurrent = i === activeIndex && !isPostponed;

            return (
              <React.Fragment key={stage.value}>
                {/* Connector line */}
                {i > 0 && (
                  <div className={cn(
                    "flex-1 h-0.5 transition-colors",
                    isActive ? "bg-primary" : "bg-border"
                  )} />
                )}

                {/* Stage node */}
                <button
                  onClick={() => onStatusChange(stage.value)}
                  className="flex flex-col items-center gap-1.5 group"
                  title={`Set to ${stage.label}`}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all",
                    isActive
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background border-border text-muted-foreground",
                    isCurrent && "ring-2 ring-primary/30 ring-offset-1",
                    !isActive && "group-hover:border-primary/60 group-hover:text-primary"
                  )}>
                    <span className="text-[10px] font-bold">{i + 1}</span>
                  </div>
                  <span className={cn(
                    "text-[11px] font-medium whitespace-nowrap transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                    !isActive && "group-hover:text-primary"
                  )}>
                    {stage.label}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Postponed badge */}
        {isPostponed && (
          <button
            onClick={() => onStatusChange("monitoring")}
            className="flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/30 px-3 py-1 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors shrink-0"
            title="Click to remove postponed status"
          >
            <X className="h-3.5 w-3.5" />
            Postponed
          </button>
        )}
      </div>

      {/* Mark as postponed button */}
      {!isPostponed && (
        <button
          onClick={() => onStatusChange("postponed")}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive/50 hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
          Mark as Postponed
        </button>
      )}
    </div>
  );
}