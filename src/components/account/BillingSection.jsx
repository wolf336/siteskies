import React, { useState } from 'react';
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
  const queryClient = useQueryClient();

  const subscription = data?.subscription;
  const tier = subscription?.tier || 'free';

  const params = new URLSearchParams(window.location.search);
  const showSuccess = params.get('success') === 'true';
  const showCanceled = params.get('canceled') === 'true';

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

      {showSuccess && (
        <div className="rounded-lg bg-success/10 border border-success/30 text-success px-4 py-3 text-sm font-medium">
          🎉 Subscription activated! Your plan has been upgraded.
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
              {tier !== 'free' && !subscription?.cancel_at_period_end && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                  onClick={handleCancel}
                  disabled={canceling}
                >
                  {canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel Subscription'}
                </Button>
              )}
            </CardContent>
          </Card>

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
        </div>
      )}
    </div>
  );
}