import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Step 1 — Cancel Stripe subscription immediately (if any).
    // We do Stripe FIRST so that if it fails, we haven't deleted Base44 data yet
    // and the user can safely retry.
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    for (const sub of subs) {
      if (sub.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        } catch (err) {
          const code = err?.code || err?.raw?.code;
          if (code === 'resource_missing') {
            console.warn(`Stripe sub ${sub.stripe_subscription_id} already gone, continuing.`);
          } else {
            console.error('Stripe subscription cancel failed:', err);
            return Response.json({
              error: 'Failed to cancel your subscription with Stripe. Your account was not deleted. Please try again or contact support.',
            }, { status: 500 });
          }
        }
      }
    }

    // Step 2 — Delete Base44 data. Stripe customer record is intentionally retained
    // for audit/tax records per our billing policy.
    const [projects, teamMemberships] = await Promise.all([
      base44.asServiceRole.entities.Project.filter({ created_by: user.email }),
      base44.asServiceRole.entities.TeamMember.filter({ owner_user_id: user.id }),
    ]);

    await Promise.all([
      ...projects.map(p => base44.asServiceRole.entities.Project.delete(p.id)),
      ...subs.map(s => base44.asServiceRole.entities.Subscription.delete(s.id)),
      ...teamMemberships.map(t => base44.asServiceRole.entities.TeamMember.delete(t.id)),
    ]);

    return Response.json({
      success: true,
      deleted: {
        projects: projects.length,
        subscriptions: subs.length,
        team_memberships: teamMemberships.length,
      },
    });
  } catch (err) {
    console.error('deleteAccount error:', err);
    return Response.json({ error: err.message || 'Account deletion failed' }, { status: 500 });
  }
});