import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIER_PROJECT_LIMITS = {
  free: 3,
  small_team: 10,
  large_team: 30,
  enterprise: 999,
};

async function resolveEffectiveTier(base44, user, ownSub, nowIso) {
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

    // Admin bypass: unlimited projects
    if (user.email === 'liam.stienen@gmail.com') {
      return Response.json({ allowed: true, limit: 999, used: 0, remaining: 999, tier: 'enterprise' });
    }

    const nowIso = new Date().toISOString();
    const ownSubs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    const ownSub = ownSubs[0] || { tier: 'free', status: 'active' };
    const { tier } = await resolveEffectiveTier(base44, user, ownSub, nowIso);
    const limit = TIER_PROJECT_LIMITS[tier] ?? TIER_PROJECT_LIMITS.free;

    const projects = await base44.asServiceRole.entities.Project.filter({ created_by: user.email });
    const used = projects.length;

    if (used >= limit) {
      return Response.json({ allowed: false, limit, used, tier }, { status: 403 });
    }

    return Response.json({ allowed: true, limit, used, remaining: limit - used, tier });
  } catch (err) {
    console.error('checkProjectLimit error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});