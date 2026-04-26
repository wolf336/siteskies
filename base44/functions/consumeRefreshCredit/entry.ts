import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIER_LIMITS = {
  free: 5,
  small_team: 999,
  large_team: 999,
  enterprise: 999,
};

// NOTE: resolveEffectiveTier is the canonical copy of this logic.
// If you change tier resolution rules, change them here AND in checkProjectLimit AND in getSubscriptionStatus inline logic.
async function resolveEffectiveTier(base44, user, ownSub, nowIso) {
  // Own paid active wins
  if (ownSub.tier !== 'free' && ownSub.status === 'active') {
    return { tier: ownSub.tier, source: 'own' };
  }

  const memberships = await base44.asServiceRole.entities.TeamMember.filter({ member_user_id: user.id });

  const activeMembership = memberships.find(m => m.status === 'active');
  if (activeMembership) {
    const ownerSubs = await base44.asServiceRole.entities.Subscription.filter({ user_id: activeMembership.owner_user_id });
    const ownerSub = ownerSubs[0];
    if (ownerSub && ownerSub.tier !== 'free' && ownerSub.status === 'active') {
      return { tier: ownerSub.tier, source: 'team' };
    }
  }

  // awaiting_own_sub_end: user keeps their old plan until period_end
  const awaiting = memberships.find(m => m.status === 'awaiting_own_sub_end');
  if (awaiting && ownSub.tier !== 'free' && ownSub.current_period_end && ownSub.current_period_end > nowIso) {
    return { tier: ownSub.tier, source: 'awaiting' };
  }

  return { tier: 'free', source: 'own' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Admin bypass: unlimited refreshes
    const ADMIN_EMAILS = ['liam.stienen@gmail.com', 'liam1@posteo.de'];
    if (ADMIN_EMAILS.includes(user.email)) {
      return Response.json({ allowed: true, remaining: 999, effective_tier: 'enterprise' });
    }

    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    // Get or create the user's own subscription record (counter lives here)
    let subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    let sub;
    if (subs.length === 0) {
      sub = await base44.asServiceRole.entities.Subscription.create({
        user_id: user.id,
        user_email: user.email,
        tier: 'free',
        status: 'active',
        daily_refresh_count: 0,
        daily_refresh_date: today,
      });
    } else {
      sub = subs[0];
    }

    // Limit comes from effective plan; counter is always the user's own
    const { tier: effectiveTier } = await resolveEffectiveTier(base44, user, sub, nowIso);
    const limit = TIER_LIMITS[effectiveTier] ?? TIER_LIMITS.free;

    // Reset counter if new day
    let currentCount = sub.daily_refresh_count || 0;
    if (sub.daily_refresh_date !== today) {
      currentCount = 0;
    }

    if (currentCount >= limit) {
      return Response.json({ allowed: false, limit, tier: effectiveTier, used: currentCount }, { status: 403 });
    }

    const newCount = currentCount + 1;
    await base44.asServiceRole.entities.Subscription.update(sub.id, {
      daily_refresh_count: newCount,
      daily_refresh_date: today,
    });

    return Response.json({
      allowed: true,
      remaining: limit - newCount,
      subscription_id: sub.id,
      effective_tier: effectiveTier,
    });
  } catch (err) {
    console.error('consumeRefreshCredit error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});