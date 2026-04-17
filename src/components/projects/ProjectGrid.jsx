import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import WeatherDots from './WeatherDots';

const STATUS_STYLES = {
  planning: 'bg-muted text-muted-foreground',
  monitoring: 'bg-primary/10 text-primary',
  ready: 'bg-success/10 text-success',
  in_progress: 'bg-accent/20 text-accent-foreground',
  completed: 'bg-muted text-muted-foreground',
  postponed: 'bg-destructive/10 text-destructive',
};

const REC_STYLES = {
  proceed: 'bg-success/10 text-success',
  caution: 'bg-warning/10 text-warning-foreground',
  postpone: 'bg-destructive/10 text-destructive',
  pending: 'bg-muted text-muted-foreground',
};

export default function ProjectGrid({ projects }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => {
        const forecasts = project.weather_forecast?.daily_forecasts || [];
        const clearDays = forecasts.filter(d => d.meets_requirements).length;

        return (
          <div
            key={project.id}
            onClick={() => navigate(createPageUrl(`ProjectDetail?id=${project.id}`))}
            className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">{project.name}</h3>
              <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[project.status] || STATUS_STYLES.planning}`}>
                {project.status?.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{project.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>
                  {format(new Date(project.start_date + 'T00:00:00'), 'MMM d')} – {format(new Date(project.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <WeatherDots forecasts={forecasts} />
              {forecasts.length > 0 && (
                <p className="text-[11px] text-muted-foreground">{clearDays} of {forecasts.length} days clear</p>
              )}
            </div>

            <div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${REC_STYLES[project.weather_signal] || REC_STYLES.pending}`}>
                {project.weather_signal || 'pending'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}