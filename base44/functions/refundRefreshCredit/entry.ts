import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    if (subs.length === 0) return Response.json({ success: false, reason: 'No subscription' });

    const sub = subs[0];
    const today = new Date().toISOString().split('T')[0];

    if (sub.daily_refresh_date === today && (sub.daily_refresh_count || 0) > 0) {
      await base44.asServiceRole.entities.Subscription.update(sub.id, {
        daily_refresh_count: sub.daily_refresh_count - 1,
      });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('refundRefreshCredit error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});