import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIER_LIMITS = {
  free: 1,
  small_team: 2,
  large_team: 6,
  enterprise: 999,
};

function generateToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { email } = await req.json();
    if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === user.email.toLowerCase()) {
      return Response.json({ error: "You can't invite yourself." }, { status: 400 });
    }

    // Check owner's plan
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    const tier = subs[0]?.tier || 'free';
    const memberLimit = TIER_LIMITS[tier];

    // Count existing members (owner counts as 1). Exclude 'removed' status.
    const existingMembers = await base44.asServiceRole.entities.TeamMember.filter({ owner_user_id: user.id });
    const activeOrPending = existingMembers.filter(m => m.status !== 'removed');

    // Fixed off-by-one: owner (1) + existing active/pending + 1 new must be <= limit
    if (activeOrPending.length + 1 + 1 > memberLimit) {
      return Response.json({
        error: `Your ${tier.replace('_', ' ')} plan allows ${memberLimit} total seat(s). Upgrade to add more.`,
      }, { status: 403 });
    }

    // Already invited by this owner?
    const duplicateByOwner = activeOrPending.find(m => m.member_email.toLowerCase() === normalizedEmail);
    if (duplicateByOwner) {
      return Response.json({ error: 'This email has already been invited.' }, { status: 400 });
    }

    // Already invited or active on ANOTHER owner's plan?
    const otherMemberships = await base44.asServiceRole.entities.TeamMember.filter({ member_email: normalizedEmail });
    const conflictingMembership = otherMemberships.find(m =>
      m.owner_user_id !== user.id && (m.status === 'pending' || m.status === 'active' || m.status === 'awaiting_own_sub_end')
    );
    if (conflictingMembership) {
      return Response.json({
        error: 'This person is already on another team. They would need to leave that team before joining yours.',
      }, { status: 400 });
    }

    // Create invite
    const inviteToken = generateToken();
    const member = await base44.asServiceRole.entities.TeamMember.create({
      owner_user_id: user.id,
      owner_email: user.email,
      owner_name: user.full_name || user.email,
      member_email: normalizedEmail,
      status: 'pending',
      invite_token: inviteToken,
    });

    // Send invite email. If it fails, the record still exists — invitee can accept via Settings banner.
    const ownerDisplayName = user.full_name || user.email;
    const appOrigin = req.headers.get('origin') || 'https://siteskies.app';

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: normalizedEmail,
        subject: `${ownerDisplayName} invited you to SiteSkies`,
        body:
`Hi,

${ownerDisplayName} has invited you to join their SiteSkies plan.

SiteSkies is a weather tracking tool for project managers who need to make go/no-go decisions on outdoor work based on forecasts.

When you accept, you'll get your own SiteSkies account with your own projects and dashboard. ${ownerDisplayName} pays for both accounts — there's nothing for you to pay.

To accept:
1. Go to ${appOrigin} and sign in with this email address (${normalizedEmail})
2. You'll see a banner at the top of your Settings page — click Accept

If you already have a paid SiteSkies subscription of your own, accepting this invite will schedule your existing subscription to cancel at the end of your current billing period. You'll keep your paid features without interruption, and ${ownerDisplayName} will be billed going forward.

If you don't want to accept, you can safely ignore this email or click Decline from your Settings page.

— The SiteSkies team`,
      });
    } catch (emailErr) {
      console.warn('Invite email failed to send (member record still created):', emailErr);
    }

    return Response.json({ success: true, member_id: member.id });
  } catch (err) {
    console.error('inviteTeamMember error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});