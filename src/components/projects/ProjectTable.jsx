import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import WeatherDots from './WeatherDots';
import { useFormattedLocation } from "@/hooks/useFormattedLocation";
import { useTranslation } from 'react-i18next';

const REC_STYLES = {
  proceed: 'bg-success/10 text-success',
  caution: 'bg-warning/10 text-warning-foreground',
  postpone: 'bg-destructive/10 text-destructive',
  pending: 'bg-muted text-muted-foreground',
};

function ProjectTableRow({ project }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateFnsLocale = i18n.language === "de" ? de : enUS;
  const formattedLocation = useFormattedLocation(project.location, project.location_name);
  const forecasts = project.weather_forecast?.daily_forecasts || [];

  return (
    <tr
      onClick={() => navigate(createPageUrl(`ProjectDetail?id=${project.id}`))}
      className="hover:bg-muted/30 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 font-medium text-foreground max-w-[180px]">
        <span className="line-clamp-1">{project.name}</span>
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell max-w-[140px]">
        <span className="line-clamp-1">{formattedLocation}</span>
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
        {format(new Date(project.start_date + 'T00:00:00'), 'MMM d', { locale: dateFnsLocale })} – {format(new Date(project.end_date + 'T00:00:00'), 'MMM d', { locale: dateFnsLocale })}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <WeatherDots forecasts={forecasts} />
      </td>
      <td className="px-4 py-3">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${REC_STYLES[project.weather_signal] || REC_STYLES.pending}`}>
          {t(`signal.${project.weather_signal || 'pending'}`)}
        </span>
      </td>
    </tr>
  );
}

export default function ProjectTable({ projects }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3 font-medium">{t('table.project')}</th>
            <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">{t('table.location')}</th>
            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">{t('table.dates')}</th>
            <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">{t('table.forecast')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('table.recommendation')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((project) => (
            <ProjectTableRow key={project.id} project={project} />
          ))}
        </tbody>
      </table>
    </div>
  );
}