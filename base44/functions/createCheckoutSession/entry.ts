import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICE_IDS = {
  small_team_monthly: 'price_1TOhQOARwXv1I17HFJ8p7dHo',
  small_team_yearly:  'price_1TOhQfARwXv1I17H4BCSeuIy',
  large_team_monthly: 'price_1TOhPbARwXv1I17HqOh1Hokh',
  large_team_yearly:  'price_1TOhPbARwXv1I17H2PWcgA2C',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tier, billing_interval, success_url, cancel_url } = await req.json();

    const priceKey = `${tier}_${billing_interval}`;
    const priceId = PRICE_IDS[priceKey];
    if (!priceId) return Response.json({ error: 'Invalid plan' }, { status: 400 });

    // Check for existing subscription to get customer ID
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    let customerId = subs[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.full_name });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          user_id: user.id,
          user_email: user.email,
          tier,
          billing_interval,
        },
      },
      mode: 'subscription',
      success_url: success_url || `${req.headers.get('origin')}/Settings?success=true`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/Settings?canceled=true`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: user.id,
        user_email: user.email,
        tier,
        billing_interval,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createCheckoutSession error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});