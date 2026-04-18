import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TIER_CONFIG } from '@/lib/subscriptionConfig';
import { UserPlus, Trash2, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamMembersList({ subscription, teamMembers = [] }) {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const queryClient = useQueryClient();

  const tier = subscription?.tier || 'free';
  const config = TIER_CONFIG[tier];
  const canInvite = teamMembers.length + 1 < config.maxMembers; // +1 for owner

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await base44.functions.invoke('inviteTeamMember', { email: email.trim() });
      if (res.data.error) throw new Error(res.data.error);
      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } catch (err) {
      toast.error(err.message);
    }
    setInviting(false);
  };

  const handleRemove = async (memberId) => {
    setRemoving(memberId);
    await base44.entities.TeamMember.delete(memberId);
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    setRemoving(null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {teamMembers.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div className="flex items-center gap-2">
              {m.status === 'pending' ? (
                <Clock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-success" />
              )}
              <span className="text-sm text-foreground">{m.member_email}</span>
              {m.status === 'pending' && (
                <span className="text-xs text-muted-foreground">(pending)</span>
              )}
            </div>
            <button
              onClick={() => handleRemove(m.id)}
              disabled={removing === m.id}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              {removing === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        ))}

        {teamMembers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-3">No team members yet.</p>
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
      ) : (
        <p className="text-xs text-muted-foreground">
          Your plan allows {config.maxMembers} member(s) total. Upgrade to add more.
        </p>
      )}
    </div>
  );
}