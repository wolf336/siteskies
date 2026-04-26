import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Admin bypass: return enterprise tier with no limits
    if (user.email === 'liam.stienen@gmail.com') {
      const projects = await base44.asServiceRole.entities.Project.filter({ created_by: user.email });
      return Response.json({
        subscription: {
          user_id: user.id,
          user_email: user.email,
          tier: 'enterprise',
          billing_interval: null,
          status: 'active',
          current_period_end: null,
          cancel_at_period_end: false,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          stripe_price_id: null,
          daily_refresh_count: 0,
          daily_refresh_date: new Date().toISOString().split('T')[0],
          effective_source: 'admin',
          inherited_from: null,
        },
        teamMembers: [],
        projectCount: projects.length,
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    // --- Step 1: load or create the user's own Subscription record ---
    let ownSubs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    let ownSub;
    if (ownSubs.length === 0) {
      ownSub = await base44.asServiceRole.entities.Subscription.create({
        user_id: user.id,
        user_email: user.email,
        tier: 'free',
        status: 'active',
        daily_refresh_count: 0,
        daily_refresh_date: today,
      });
    } else {
      ownSub = ownSubs[0];
      // Reset daily counter if it's a new day
      if (ownSub.daily_refresh_date !== today) {
        ownSub = await base44.asServiceRole.entities.Subscription.update(ownSub.id, {
          daily_refresh_count: 0,
          daily_refresh_date: today,
        });
      }
    }

    // --- Step 2: determine the effective plan ---
    let effectivePlan = {
      tier: 'free',
      billing_interval: null,
      status: 'active',
      source: 'own',
      inherited_from: null,
      current_period_end: null,
      cancel_at_period_end: false,
    };

    const hasOwnPaidActive = ownSub.tier !== 'free' && ownSub.status === 'active';

    if (hasOwnPaidActive) {
      effectivePlan = {
        tier: ownSub.tier,
        billing_interval: ownSub.billing_interval || null,
        status: ownSub.status,
        source: 'own',
        inherited_from: null,
        current_period_end: ownSub.current_period_end || null,
        cancel_at_period_end: !!ownSub.cancel_at_period_end,
      };
    } else {
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({ member_user_id: user.id });

      const activeMembership = memberships.find(m => m.status === 'active');
      if (activeMembership) {
        const ownerSubs = await base44.asServiceRole.entities.Subscription.filter({ user_id: activeMembership.owner_user_id });
        const ownerSub = ownerSubs[0];
        if (ownerSub && ownerSub.tier !== 'free' && ownerSub.status === 'active') {
          effectivePlan = {
            tier: ownerSub.tier,
            billing_interval: ownerSub.billing_interval || null,
            status: ownerSub.status,
            source: 'team',
            inherited_from: {
              owner_name: activeMembership.owner_name || activeMembership.owner_email || 'your team owner',
              owner_email: activeMembership.owner_email || null,
            },
            current_period_end: ownerSub.current_period_end || null,
            cancel_at_period_end: !!ownerSub.cancel_at_period_end,
          };
        }
      }

      if (effectivePlan.source === 'own' && effectivePlan.tier === 'free') {
        const awaitingMembership = memberships.find(m => m.status === 'awaiting_own_sub_end');
        if (awaitingMembership) {
          const oldPeriodEnd = awaitingMembership.activates_at;
          const oldSubStillActive = oldPeriodEnd && oldPeriodEnd > nowIso;

          if (oldSubStillActive) {
            effectivePlan = {
              tier: ownSub.tier !== 'free' ? ownSub.tier : 'free',
              billing_interval: ownSub.billing_interval || null,
              status: 'active',
              source: 'awaiting',
              inherited_from: null,
              current_period_end: oldPeriodEnd,
              cancel_at_period_end: true,
            };
          } else if (oldPeriodEnd && oldPeriodEnd <= nowIso) {
            await base44.asServiceRole.entities.TeamMember.update(awaitingMembership.id, {
              status: 'active',
              activates_at: nowIso,
            });
            const ownerSubs = await base44.asServiceRole.entities.Subscription.filter({ user_id: awaitingMembership.owner_user_id });
            const ownerSub = ownerSubs[0];
            if (ownerSub && ownerSub.tier !== 'free' && ownerSub.status === 'active') {
              effectivePlan = {
                tier: ownerSub.tier,
                billing_interval: ownerSub.billing_interval || null,
                status: ownerSub.status,
                source: 'team',
                inherited_from: {
                  owner_name: awaitingMembership.owner_name || awaitingMembership.owner_email || 'your team owner',
                  owner_email: awaitingMembership.owner_email || null,
                },
                current_period_end: ownerSub.current_period_end || null,
                cancel_at_period_end: !!ownerSub.cancel_at_period_end,
              };
            }
          }
        }
      }
    }

    // --- Step 3: team members list (owners only) and project count ---
    let teamMembers = [];
    if (hasOwnPaidActive) {
      const allMembers = await base44.asServiceRole.entities.TeamMember.filter({ owner_user_id: user.id });
      teamMembers = allMembers.filter(m => m.status !== 'removed');
    }
    const projects = await base44.asServiceRole.entities.Project.filter({ created_by: user.email });

    // --- Step 4: build backwards-compatible effectiveSubscription ---
    const effectiveSubscription = {
      id: ownSub.id,
      user_id: user.id,
      user_email: user.email,
      tier: effectivePlan.tier,
      billing_interval: effectivePlan.billing_interval,
      status: effectivePlan.status,
      current_period_end: effectivePlan.current_period_end,
      cancel_at_period_end: effectivePlan.cancel_at_period_end,
      stripe_customer_id: effectivePlan.source === 'own' || effectivePlan.source === 'awaiting' ? ownSub.stripe_customer_id : null,
      stripe_subscription_id: effectivePlan.source === 'own' || effectivePlan.source === 'awaiting' ? ownSub.stripe_subscription_id : null,
      stripe_price_id: effectivePlan.source === 'own' || effectivePlan.source === 'awaiting' ? ownSub.stripe_price_id : null,
      daily_refresh_count: ownSub.daily_refresh_count || 0,
      daily_refresh_date: ownSub.daily_refresh_date || today,
      effective_source: effectivePlan.source,
      inherited_from: effectivePlan.inherited_from,
    };

    return Response.json({
      subscription: effectiveSubscription,
      teamMembers,
      projectCount: projects.length,
    });
  } catch (error) {
    console.error('getSubscriptionStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});