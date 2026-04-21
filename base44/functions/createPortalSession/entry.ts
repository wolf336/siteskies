import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_TEST_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { return_url } = await req.json().catch(() => ({}));
    const returnUrl = return_url || `${req.headers.get('origin')}/Settings?section=billing`;

    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    const customerId = subs[0]?.stripe_customer_id;

    if (!customerId) {
      return Response.json({ error: 'No Stripe customer found for this user' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createPortalSession error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});