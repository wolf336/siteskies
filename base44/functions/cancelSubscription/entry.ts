import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    if (subs.length === 0) return Response.json({ error: 'No subscription found' }, { status: 404 });

    const sub = subs[0];
    if (!sub.stripe_subscription_id) return Response.json({ error: 'No active Stripe subscription' }, { status: 400 });

    // Cancel at period end (not immediately)
    await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });

    await base44.asServiceRole.entities.Subscription.update(sub.id, { cancel_at_period_end: true });

    return Response.json({ success: true, message: 'Subscription will cancel at the end of the billing period.' });
  } catch (error) {
    console.error('cancelSubscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});