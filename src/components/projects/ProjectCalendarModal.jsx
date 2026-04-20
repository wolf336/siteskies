import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import WeatherDots from './WeatherDots';

const REC_STYLES = {
  proceed: 'bg-success/10 text-success',
  caution: 'bg-warning/10 text-warning-foreground',
  postpone: 'bg-destructive/10 text-destructive',
  pending: 'bg-muted text-muted-foreground',
};

export default function ProjectCalendarModal({ project, onClose }) {
  const navigate = useNavigate();
  const forecasts = project.weather_forecast?.daily_forecasts || [];
  const clearDays = forecasts.filter(d => d.meets_requirements).length;

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Title + Recommendation */}
        <div className="pr-6 space-y-2">
          <h2 className="text-lg font-bold text-foreground leading-tight">{project.name}</h2>
          <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${REC_STYLES[project.recommendation] || REC_STYLES.pending}`}>
            {project.recommendation || 'pending'}
          </span>
        </div>

        {/* Location & dates */}
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{project.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>
              {format(new Date(project.start_date + 'T00:00:00'), 'MMM d')} – {format(new Date(project.end_date + 'T00:00:00'), 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        {/* Forecast dots */}
        <div className="space-y-2 border-t border-border pt-3">
          <WeatherDots forecasts={forecasts} size="lg" />
          <p className="text-xs text-muted-foreground">
            {forecasts.length > 0
              ? `${clearDays} of ${forecasts.length} days meet requirements`
              : 'No forecast data yet'}
          </p>
        </div>

        {/* Open project button */}
        <Button
          className="w-full gap-2"
          onClick={() => navigate(createPageUrl(`ProjectDetail?id=${project.id}`))}
        >
          Open project →
        </Button>
      </div>
    </div>
  );
}