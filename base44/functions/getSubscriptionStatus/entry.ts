import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });

    if (subs.length === 0) {
      // Auto-create free tier record
      const newSub = await base44.asServiceRole.entities.Subscription.create({
        user_id: user.id,
        user_email: user.email,
        tier: 'free',
        status: 'active',
        daily_refresh_count: 0,
        daily_refresh_date: new Date().toISOString().split('T')[0],
      });
      return Response.json({ subscription: newSub });
    }

    const sub = subs[0];

    // Reset daily refresh count if it's a new day
    const today = new Date().toISOString().split('T')[0];
    if (sub.daily_refresh_date !== today) {
      const updated = await base44.asServiceRole.entities.Subscription.update(sub.id, {
        daily_refresh_count: 0,
        daily_refresh_date: today,
      });
      return Response.json({ subscription: updated });
    }

    // Also return team members
    const teamMembers = await base44.asServiceRole.entities.TeamMember.filter({ owner_user_id: user.id });

    // And project count
    const projects = await base44.asServiceRole.entities.Project.filter({ created_by: user.email });

    return Response.json({ subscription: sub, teamMembers, projectCount: projects.length });
  } catch (error) {
    console.error('getSubscriptionStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});