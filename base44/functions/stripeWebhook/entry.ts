import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const TIER_BY_PRICE = {
  'price_1TOhQOARwXv1I17HFJ8p7dHo': 'small_team',
  'price_1TOhQfARwXv1I17H4BCSeuIy': 'small_team',
  'price_1TOhPbARwXv1I17HqOh1Hokh': 'large_team',
  'price_1TOhPbARwXv1I17H2PWcgA2C': 'large_team',
};

const INTERVAL_BY_PRICE = {
  'price_1TOhQOARwXv1I17HFJ8p7dHo': 'monthly',
  'price_1TOhQfARwXv1I17H4BCSeuIy': 'yearly',
  'price_1TOhPbARwXv1I17HqOh1Hokh': 'monthly',
  'price_1TOhPbARwXv1I17H2PWcgA2C': 'yearly',
};

// Safe timestamp converter — handles Stripe API versions that moved current_period_end to items
const toISO = (ts) => (typeof ts === 'number' && ts > 0) ? new Date(ts * 1000).toISOString() : null;

async function upsertSubscription(base44, userId, userEmail, data) {
  const existing = await base44.asServiceRole.entities.Subscription.filter({ user_id: userId });
  if (existing.length > 0) {
    await base44.asServiceRole.entities.Subscription.update(existing[0].id, data);
  } else {
    await base44.asServiceRole.entities.Subscription.create({ user_id: userId, user_email: userEmail, ...data });
  }
}

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  try {
    const expectedAppId = Deno.env.get('BASE44_APP_ID');
    const eventAppId = event.data.object.metadata?.base44_app_id;

    if (eventAppId && expectedAppId && eventAppId !== expectedAppId) {
      console.log(`Skipping event ${event.id} — app_id mismatch (got ${eventAppId}, expected ${expectedAppId})`);
      return Response.json({ received: true });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { user_id, user_email, tier, billing_interval } = session.metadata || {};
      if (!user_id) return Response.json({ received: true });

      const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
      const priceId = stripeSub.items.data[0]?.price?.id;
      // Read current_period_end from item level (Stripe API 2025+)
      const periodEnd = toISO(stripeSub.items?.data?.[0]?.current_period_end);

      await upsertSubscription(base44, user_id, user_email, {
        tier: tier || TIER_BY_PRICE[priceId] || 'free',
        billing_interval: billing_interval || INTERVAL_BY_PRICE[priceId] || 'monthly',
        status: 'active',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        stripe_price_id: priceId,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
      });
    }

    if (event.type === 'customer.subscription.updated') {
      const stripeSub = event.data.object;
      const priceId = stripeSub.items.data[0]?.price?.id;
      // Read current_period_end from item level (Stripe API 2025+)
      const periodEnd = toISO(stripeSub.items?.data?.[0]?.current_period_end);

      const existing = await base44.asServiceRole.entities.Subscription.filter({ stripe_subscription_id: stripeSub.id });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
          status: stripeSub.status,
          tier: TIER_BY_PRICE[priceId] || existing[0].tier,
          billing_interval: INTERVAL_BY_PRICE[priceId] || existing[0].billing_interval,
          stripe_price_id: priceId,
          current_period_end: periodEnd,
          cancel_at_period_end: stripeSub.cancel_at_period_end,
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const stripeSub = event.data.object;
      const existing = await base44.asServiceRole.entities.Subscription.filter({ stripe_subscription_id: stripeSub.id });
      if (existing.length > 0) {
        // Fully reset to free — clear ALL Stripe-related fields to avoid stale data
        await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
          tier: 'free',
          status: 'canceled',
          stripe_subscription_id: null,
          stripe_price_id: null,
          stripe_customer_id: null,
          billing_interval: null,
          current_period_end: null,
          cancel_at_period_end: false,
        });
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (!subscriptionId) return Response.json({ received: true });

      const existing = await base44.asServiceRole.entities.Subscription.filter({ stripe_subscription_id: subscriptionId });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
          status: 'past_due',
          last_payment_failed_at: new Date().toISOString(),
        });
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});