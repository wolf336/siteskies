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
        <div className="flex-1 flex items-stretch h-9 hidden">
          {STAGES.map((stage, i) => {
            const isActive = i <= activeIndex && !isPostponed;
            const isCurrent = i === activeIndex && !isPostponed;
            const isLast = i === STAGES.length - 1;
            const isFirst = i === 0;

            return (
              <button
                key={stage.value}
                onClick={() => onStatusChange(stage.value)}
                title={`Set to ${stage.label}`}
                style={{ clipPath: isLast ? undefined : "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)", marginLeft: isFirst ? 0 : "-1px" }}
                className={cn(
                  "relative flex-1 flex items-center justify-center text-[11px] font-semibold transition-all border whitespace-nowrap px-2",
                  isFirst ? "rounded-l-md" : "",
                  isLast ? "rounded-r-md" : "",
                  isActive ?
                  "bg-primary border-primary text-primary-foreground" :
                  "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                
                {stage.label}
              </button>);

          })}
        </div>

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