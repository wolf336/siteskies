import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find invites matching this user's email in pending status
    const invites = await base44.asServiceRole.entities.TeamMember.filter({
      member_email: user.email,
      status: 'pending',
    });

    if (invites.length === 0) {
      return Response.json({ invite: null });
    }

    const invite = invites[0];

    // Also check if this user has their own paid subscription — the accept UI needs to warn them
    const ownSubs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    const ownPaidSub = ownSubs.find(s =>
      s.tier !== 'free' &&
      s.status === 'active' &&
      !!s.stripe_subscription_id
    );

    return Response.json({
      invite: {
        id: invite.id,
        owner_name: invite.owner_name,
        owner_email: invite.owner_email,
      },
      has_own_paid_sub: !!ownPaidSub,
      own_sub_period_end: ownPaidSub?.current_period_end || null,
      own_sub_tier: ownPaidSub?.tier || null,
    });
  } catch (err) {
    console.error('getPendingInvite error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});