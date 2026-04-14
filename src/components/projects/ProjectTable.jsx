import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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

export default function ProjectTable({ projects }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3 font-medium">Project</th>
            <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Location</th>
            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Dates</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Forecast</th>
            <th className="text-left px-4 py-3 font-medium">Recommendation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((project) => {
            const forecasts = project.weather_forecast?.daily_forecasts || [];
            return (
              <tr
                key={project.id}
                onClick={() => navigate(createPageUrl(`ProjectDetail?id=${project.id}`))}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-foreground max-w-[180px]">
                  <span className="line-clamp-1">{project.name}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell max-w-[140px]">
                  <span className="line-clamp-1">{project.location}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                  {format(new Date(project.start_date + 'T00:00:00'), 'MMM d')} – {format(new Date(project.end_date + 'T00:00:00'), 'MMM d')}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[project.status] || STATUS_STYLES.planning}`}>
                    {project.status?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <WeatherDots forecasts={forecasts} />
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${REC_STYLES[project.recommendation] || REC_STYLES.pending}`}>
                    {project.recommendation || 'pending'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}