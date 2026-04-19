import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIER_LIMITS = {
  free: 5,
  small_team: 999,
  large_team: 999,
  enterprise: 999,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date().toISOString().split('T')[0];

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

    const tier = sub.tier || 'free';
    const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;

    let currentCount = sub.daily_refresh_count || 0;
    if (sub.daily_refresh_date !== today) {
      currentCount = 0;
    }

    if (currentCount >= limit) {
      return Response.json({ allowed: false, limit, tier, used: currentCount }, { status: 403 });
    }

    const newCount = currentCount + 1;
    await base44.asServiceRole.entities.Subscription.update(sub.id, {
      daily_refresh_count: newCount,
      daily_refresh_date: today,
    });

    return Response.json({ allowed: true, remaining: limit - newCount, subscription_id: sub.id });
  } catch (err) {
    console.error('consumeRefreshCredit error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});