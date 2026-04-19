import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TIER_CONFIG } from '@/lib/subscriptionConfig';
import { UserPlus, Trash2, Clock, CheckCircle2, Loader2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_META = {
  pending: {
    label: 'Invite sent',
    color: 'text-muted-foreground',
    icon: Clock,
    description: 'Waiting for them to sign in and accept.',
  },
  awaiting_own_sub_end: {
    label: 'Accepted — pending',
    color: 'text-warning',
    icon: AlertCircle,
    description: 'Accepted, but they had their own subscription. Joins your plan when theirs ends.',
  },
  active: {
    label: 'Active',
    color: 'text-success',
    icon: CheckCircle2,
    description: null,
  },
  removed: {
    label: 'Removed',
    color: 'text-muted-foreground',
    icon: Info,
    description: 'No longer on your plan.',
  },
};

export default function TeamMembersList({ subscription, teamMembers = [] }) {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const queryClient = useQueryClient();

  const tier = subscription?.tier || 'free';
  const config = TIER_CONFIG[tier];

  const visibleMembers = teamMembers;
  const seatsUsed = visibleMembers.length + 1; // +1 for owner
  const isTeamMember = subscription?.effective_source === 'team';
  const canInvite = seatsUsed < config.maxMembers && !isTeamMember;

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await base44.functions.invoke('inviteTeamMember', { email: email.trim() });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } catch (err) {
      toast.error(err.message);
    }
    setInviting(false);
  };

  const handleRemove = async (member) => {
    const confirmMsg = member.status === 'active'
      ? `Remove ${member.member_email}? They will immediately lose access to your plan features and drop to the Free tier on their own account. Their existing projects will remain but be subject to Free limits.`
      : `Remove the invite for ${member.member_email}?`;

    if (!confirm(confirmMsg)) return;

    setRemoving(member.id);
    try {
      if (member.status === 'active' || member.status === 'awaiting_own_sub_end') {
        await base44.entities.TeamMember.update(member.id, { status: 'removed' });
      } else {
        await base44.entities.TeamMember.delete(member.id);
      }
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } catch (err) {
      toast.error('Failed to remove: ' + (err?.message || 'Unknown error'));
    }
    setRemoving(null);
  };

  if (isTeamMember) {
    return (
      <div className="rounded-md bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground">
        Only the plan owner can invite and manage seats.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {visibleMembers.map((m) => {
          const meta = STATUS_META[m.status] || STATUS_META.pending;
          const StatusIcon = meta.icon;
          return (
            <div key={m.id} className="flex items-start justify-between rounded-lg border border-border px-3 py-2.5 gap-3">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${meta.color}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-foreground truncate">{m.member_email}</span>
                    <span className={`text-[11px] font-medium ${meta.color}`}>{meta.label}</span>
                  </div>
                  {meta.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{meta.description}</p>
                  )}
                  {m.status === 'active' && m.accepted_at && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">Joined {format(new Date(m.accepted_at), 'MMM d, yyyy')}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemove(m)}
                disabled={removing === m.id}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title={m.status === 'pending' ? 'Cancel invite' : 'Remove member'}
              >
                {removing === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          );
        })}

        {visibleMembers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-3">No seats assigned yet.</p>
        )}
      </div>

      {canInvite ? (
        <div className="flex gap-2">
          <Input
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
          />
          <Button onClick={handleInvite} disabled={inviting || !email.trim()} className="shrink-0 gap-1.5">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Invite
          </Button>
        </div>
      ) : !isTeamMember && (
        <p className="text-xs text-muted-foreground">
          You've used all {config.maxMembers} seats on your {config.name} plan. Upgrade to add more.
        </p>
      )}
    </div>
  );
}