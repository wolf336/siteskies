import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, AlertCircle, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AcceptInviteBanner() {
  const queryClient = useQueryClient();
  const [acting, setActing] = useState(null); // 'accept' | 'decline' | null

  const { data, isLoading } = useQuery({
    queryKey: ['pendingInvite'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPendingInvite', {});
      return res.data;
    },
    staleTime: 60_000,
  });

  if (isLoading || !data?.invite) return null;

  const invite = data.invite;
  const hasOwnSub = data.has_own_paid_sub;
  const ownPeriodEnd = data.own_sub_period_end;
  const ownTier = data.own_sub_tier;

  const handleAccept = async () => {
    setActing('accept');
    try {
      const res = await base44.functions.invoke('acceptTeamInvite', { invite_id: invite.id });
      if (res.data?.error) throw new Error(res.data.error);

      if (res.data?.status === 'awaiting_own_sub_end') {
        const endDate = res.data.activates_at ? format(new Date(res.data.activates_at), 'MMM d, yyyy') : 'the end of your billing period';
        toast.success(`Accepted. Your current subscription will end on ${endDate}, then you'll join ${invite.owner_name}'s plan.`, { duration: 6000 });
      } else {
        toast.success(`You've joined ${invite.owner_name}'s team plan.`);
      }
      queryClient.invalidateQueries({ queryKey: ['pendingInvite'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } catch (err) {
      toast.error(err.message || 'Failed to accept invite');
    }
    setActing(null);
  };

  const handleDecline = async () => {
    if (!confirm(`Decline invite from ${invite.owner_name}?`)) return;
    setActing('decline');
    try {
      const res = await base44.functions.invoke('declineTeamInvite', { invite_id: invite.id });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success('Invite declined.');
      queryClient.invalidateQueries({ queryKey: ['pendingInvite'] });
    } catch (err) {
      toast.error(err.message || 'Failed to decline invite');
    }
    setActing(null);
  };

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {invite.owner_name} invited you to their SiteSkies plan
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Accept to get paid features (more projects, longer forecasts) at no cost to you. {invite.owner_name} covers the bill.
              </p>
            </div>

            {hasOwnSub && (
              <div className="flex items-start gap-2 rounded-md bg-warning/10 border border-warning/30 p-3 text-xs">
                <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                <div className="text-foreground/90">
                  <strong>You currently have your own paid {ownTier?.replace('_', ' ')} subscription.</strong> Accepting this invite will schedule your existing subscription to cancel at the end of your current billing period{ownPeriodEnd ? ` (${format(new Date(ownPeriodEnd), 'MMM d, yyyy')})` : ''}. You'll keep your features without interruption, and {invite.owner_name} will be billed going forward. No refund will be issued for your current period.
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAccept} disabled={acting !== null} className="gap-2">
                {acting === 'accept' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline} disabled={acting !== null} className="gap-2">
                {acting === 'decline' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Decline
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}