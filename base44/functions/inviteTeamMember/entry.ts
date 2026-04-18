import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIER_LIMITS = {
  free: 1,
  small_team: 2,
  large_team: 6,
  enterprise: 999,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { email } = await req.json();
    if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

    // Get subscription
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    const tier = subs[0]?.tier || 'free';
    const memberLimit = TIER_LIMITS[tier];

    // Count existing members (owner counts as 1)
    const existingMembers = await base44.asServiceRole.entities.TeamMember.filter({ owner_user_id: user.id });
    if (existingMembers.length + 1 >= memberLimit) {
      return Response.json({ error: `Your ${tier.replace('_', ' ')} plan allows ${memberLimit} member(s) total. Upgrade to add more.` }, { status: 403 });
    }

    // Check if already invited
    const alreadyInvited = existingMembers.find(m => m.member_email === email);
    if (alreadyInvited) return Response.json({ error: 'This member has already been invited.' }, { status: 400 });

    // Create team member record
    const member = await base44.asServiceRole.entities.TeamMember.create({
      owner_user_id: user.id,
      member_email: email,
      status: 'pending',
    });

    // Send invite email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: `You've been invited to join ${user.full_name}'s SiteSkies team`,
      body: `Hi,\n\n${user.full_name} has invited you to join their SiteSkies team.\n\nSiteSkies helps construction teams monitor weather conditions for their projects.\n\nAccept the invitation by signing up at your app URL.\n\nBest,\nThe SiteSkies Team`,
    });

    return Response.json({ success: true, member });
  } catch (error) {
    console.error('inviteTeamMember error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});