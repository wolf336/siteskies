import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function PlanCard({ tierKey, config, currentTier, billingInterval, isCurrentInterval }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const isCurrent = currentTier === tierKey && isCurrentInterval;
  const isEnterprise = tierKey === 'enterprise';
  const isFree = tierKey === 'free';

  const price = billingInterval === 'yearly' ? config.yearlyPrice : config.monthlyPrice;

  const handleUpgrade = async () => {
    // Block checkout if inside an iframe (Base44 preview)
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not in the preview.');
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('createCheckoutSession', {
        tier: tierKey,
        billing_interval: billingInterval,
        success_url: window.location.origin + '/Settings?section=billing&success=true&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: window.location.origin + '/Settings?section=billing&canceled=true',
      });
      if (res.data.error) throw new Error(res.data.error);
      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  const projectsLabel = config.maxProjects >= 999
    ? t('planCard.unlimitedProjects')
    : config.projectsPerSeatLabel
      ? t('planCard.projectsPerSeat', { count: config.maxProjects })
      : t('planCard.projects', { count: config.maxProjects });

  const features = [
    projectsLabel,
    config.maxRefreshesPerDay >= 999
      ? t('planCard.unlimitedRefreshes')
      : t('planCard.refreshes', { count: config.maxRefreshesPerDay }),
    t('planCard.forecastDays', { count: config.forecastDays }),
    config.maxMembers >= 999
      ? t('planCard.unlimitedSeats')
      : t('planCard.seats', { count: config.maxMembers }),
  ];

  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-4 transition-all ${isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-foreground">{config.name}</h3>
          {isCurrent && <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{t('planCard.current')}</span>}
        </div>
        {!isFree && !isEnterprise && (
          <p className="text-2xl font-bold text-foreground">
            €{price}
            <span className="text-sm font-normal text-muted-foreground">/{billingInterval === 'yearly' ? t('planCard.yr') : t('planCard.mo')}</span>
          </p>
        )}
        {isFree && <p className="text-2xl font-bold text-foreground">{t('planCard.free')}</p>}
        {isEnterprise && <p className="text-sm text-muted-foreground mt-1">{t('planCard.enterpriseDesc')}</p>}
      </div>

      <ul className="space-y-1.5 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-success shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {!isCurrent && !isFree && (
        isEnterprise ? (
          <a href="mailto:liam.stienen@gmail.com" className="w-full">
            <Button variant="outline" className="w-full">{t('planCard.contactUs')}</Button>
          </a>
        ) : (
          <Button onClick={handleUpgrade} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('planCard.upgrade')}
          </Button>
        )
      )}
      {isCurrent && !isFree && (
        <Button variant="outline" className="w-full" disabled>{t('planCard.currentPlan')}</Button>
      )}
      {isCurrent && isFree && (
        <Button variant="outline" className="w-full" disabled>{t('planCard.freeForever')}</Button>
      )}
    </div>
  );
}