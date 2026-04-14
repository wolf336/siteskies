import React from 'react';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function WeatherDots({ forecasts, size = 'sm' }) {
  if (!forecasts || forecasts.length === 0) {
    return <span className="text-xs text-muted-foreground italic">No forecast</span>;
  }

  const dotClass = size === 'lg' ? 'h-2.5 w-2.5' : 'h-2 w-2';

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 flex-wrap">
        {forecasts.map((day, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <div className={cn(
                "rounded-full cursor-default",
                dotClass,
                day.meets_requirements === true ? "bg-success" :
                day.meets_requirements === false ? "bg-destructive" :
                "bg-muted-foreground/40"
              )} />
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-48">
              {day.date && <p className="font-medium mb-1">{new Date(day.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</p>}
              {day.condition && <p>{day.condition}</p>}
              {day.meets_requirements === true && <p className="text-green-400">✓ Meets requirements</p>}
              {day.meets_requirements === false && day.issues?.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-red-400">
                  {day.issues.map((issue, j) => <li key={j}>• {issue}</li>)}
                </ul>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}