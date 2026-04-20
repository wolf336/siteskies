import React, { useState, useEffect, useRef } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { TIER_CONFIG } from '@/lib/subscriptionConfig';
import PlanCard from '@/components/billing/PlanCard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function BillingSection() {
  const { data, isLoading } = useSubscription();
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [canceling, setCanceling] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const queryClient = useQueryClient();

  const subscription = data?.subscription;
  const tier = subscription?.tier || 'free';

  const params = new URLSearchParams(window.location.search);
  const showSuccess = params.get('success') === 'true';
  const showCanceled = params.get('canceled') === 'true';

  // Strip success/canceled/session_id params from URL after reading them
  useEffect(() => {
    if (showSuccess || showCanceled) {
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('canceled');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for subscription upgrade after successful checkout
  useEffect(() => {
    if (!showSuccess) return;

    const intervalRef = { id: null };
    const startTime = Date.now();
    const MAX_POLL_MS = 10000;
    const POLL_INTERVAL_MS = 1500;

    intervalRef.id = setInterval(() => {
      const currentData = queryClient.getQueryData(['subscription']);
      const currentTier = currentData?.subscription?.tier;

      if (currentTier && currentTier !== 'free') {
        clearInterval(intervalRef.id);
        return;
      }

      if (Date.now() - startTime >= MAX_POLL_MS) {
        clearInterval(intervalRef.id);
        const latestData = queryClient.getQueryData(['subscription']);
        if (!latestData?.subscription?.tier || latestData.subscription.tier === 'free') {
          setPollTimedOut(true);
        }
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalRef.id);
  }, [showSuccess, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const res = await base44.functions.invoke('createPortalSession', {
        return_url: window.location.origin + '/Settings?section=billing',
      });
      if (res.data.error) throw new Error(res.data.error);
      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.message);
      setOpeningPortal(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure? Your subscription will remain active until the end of the billing period.')) return;
    setCanceling(true);
    try {
      const res = await base44.functions.invoke('cancelSubscription', {});
      if (res.data.error) throw new Error(res.data.error);
      toast.success('Subscription will cancel at the end of the billing period.');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } catch (err) {
      toast.error(err.message);
    }
    setCanceling(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Billing & Subscription</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your plan and billing details.</p>
      </div>

      {subscription?.status === 'past_due' && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 text-sm flex items-start gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Payment failed</p>
            <p className="mt-0.5 text-destructive/80">
              Your most recent payment could not be processed. Please update your payment method to keep your subscription active.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={handleManageSubscription}
              disabled={openingPortal}
            >
              {openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update payment method'}
            </Button>
          </div>
        </div>
      )}

      {showSuccess && !pollTimedOut && (
        <div className="rounded-lg bg-success/10 border border-success/30 text-success px-4 py-3 text-sm font-medium">
          🎉 Subscription activated! Your plan has been upgraded.
        </div>
      )}
      {pollTimedOut && tier === 'free' && (
        <div className="rounded-lg bg-amber-100 border border-amber-300 text-amber-900 px-4 py-3 text-sm font-medium">
          ⚠️ Your payment was received but it's taking longer than usual to activate. Please refresh this page in a minute. If the problem persists, contact support.
        </div>
      )}
      {showCanceled && (
        <div className="rounded-lg bg-muted border border-border px-4 py-3 text-sm text-muted-foreground">
          Checkout was canceled. You haven't been charged.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {subscription?.effective_source === 'team' && subscription?.inherited_from && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
              <strong className="text-foreground">You're on {subscription.inherited_from.owner_name}'s team plan.</strong>
              <span className="text-muted-foreground"> They cover the subscription. You have your own account and projects, just with their plan features.</span>
            </div>
          )}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Current Plan</h3>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {TIER_CONFIG[tier]?.name}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {subscription?.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  {subscription.cancel_at_period_end
                    ? `Cancels on ${format(new Date(subscription.current_period_end), 'MMM d, yyyy')}`
                    : `Renews on ${format(new Date(subscription.current_period_end), 'MMM d, yyyy')}`}
                </p>
              )}
              {subscription?.cancel_at_period_end && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-2.5 py-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Cancellation scheduled
                </div>
              )}
              {tier !== 'free' && subscription?.effective_source !== 'team' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={openingPortal}
                >
                  {openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Manage subscription'}
                </Button>
              )}
            </CardContent>
          </Card>

          {tier === 'free' && <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Available Plans</h3>
            <Tabs value={billingInterval} onValueChange={setBillingInterval}>
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">
                  Yearly <span className="ml-1 text-[10px] text-success font-semibold">Save ~8%</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(TIER_CONFIG).map(([tierKey, config]) => (
              <PlanCard
                key={tierKey}
                tierKey={tierKey}
                config={config}
                currentTier={tier}
                billingInterval={billingInterval}
                isCurrentInterval={subscription?.billing_interval === billingInterval}
              />
            ))}
          </div>
          </>}
        </div>
      )}
    </div>
  );
}