import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invite_id } = await req.json();
    if (!invite_id) return Response.json({ error: 'invite_id required' }, { status: 400 });

    // Fetch invite and verify it's addressed to this user and still pending
    const invites = await base44.asServiceRole.entities.TeamMember.filter({ id: invite_id });
    const invite = invites[0];
    if (!invite) return Response.json({ error: 'Invite not found' }, { status: 404 });
    if (invite.member_email !== user.email) {
      return Response.json({ error: 'This invite is not for you' }, { status: 403 });
    }
    if (invite.status !== 'pending') {
      return Response.json({ error: `Invite is already in status: ${invite.status}` }, { status: 400 });
    }

    // Check if invitee has their own paid subscription
    const ownSubs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    const ownPaidSub = ownSubs.find(s =>
      s.tier !== 'free' &&
      s.status === 'active' &&
      !!s.stripe_subscription_id
    );

    if (ownPaidSub) {
      // Set the user's own Stripe sub to cancel at period end
      try {
        await stripe.subscriptions.update(ownPaidSub.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      } catch (err) {
        console.error('Stripe cancel_at_period_end failed:', err);
        return Response.json({
          error: 'Could not schedule cancellation of your existing subscription. Please try again or contact support.',
        }, { status: 500 });
      }

      // Mirror the cancellation in our Subscription record
      await base44.asServiceRole.entities.Subscription.update(ownPaidSub.id, {
        cancel_at_period_end: true,
      });

      // Link the TeamMember as awaiting_own_sub_end
      await base44.asServiceRole.entities.TeamMember.update(invite.id, {
        member_user_id: user.id,
        status: 'awaiting_own_sub_end',
        accepted_at: new Date().toISOString(),
        activates_at: ownPaidSub.current_period_end,
      });

      return Response.json({
        success: true,
        status: 'awaiting_own_sub_end',
        activates_at: ownPaidSub.current_period_end,
      });
    }

    // Simple case: no paid sub. Activate immediately.
    await base44.asServiceRole.entities.TeamMember.update(invite.id, {
      member_user_id: user.id,
      status: 'active',
      accepted_at: new Date().toISOString(),
      activates_at: new Date().toISOString(),
    });

    return Response.json({ success: true, status: 'active' });
  } catch (err) {
    console.error('acceptTeamInvite error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});