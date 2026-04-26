import React from 'react';
import { TIER_CONFIG } from '@/lib/subscriptionConfig';
import { FolderOpen, RefreshCw, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

function StatBar({ label, icon: Icon, used, max }) {
  const pct = max >= 999 ? 0 : Math.min(100, (used / max) * 100);
  const isUnlimited = max >= 999;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </div>
        <span className="text-muted-foreground text-xs">
          {isUnlimited ? `${used} / unlimited` : `${used} / ${max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-warning' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function UsageOverview({ subscription, projectCount, teamMemberCount }) {
  const { t } = useTranslation();
  const tier = subscription?.tier || 'free';
  const config = TIER_CONFIG[tier];
  const todayRefreshes = subscription?.daily_refresh_count || 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{t('usage.title')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t('usage.subtitle', { plan: config.name })}</p>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-5">
          <StatBar label={t('usage.projects')} icon={FolderOpen} used={projectCount} max={config.maxProjects} />
          <StatBar label={t('usage.dailyRefreshes')} icon={RefreshCw} used={todayRefreshes} max={config.maxRefreshesPerDay} />
          <StatBar label={t('usage.seats')} icon={Users} used={teamMemberCount} max={config.maxMembers} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1 border-t border-border">
            <Calendar className="h-4 w-4" />
            <span>{t('usage.forecastWindowLabel')} <strong className="text-foreground">{config.forecastDays} {t('project.days')}</strong></span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}