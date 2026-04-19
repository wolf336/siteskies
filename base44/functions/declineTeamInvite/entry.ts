import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invite_id } = await req.json();
    if (!invite_id) return Response.json({ error: 'invite_id required' }, { status: 400 });

    const invites = await base44.asServiceRole.entities.TeamMember.filter({ id: invite_id });
    const invite = invites[0];
    if (!invite) return Response.json({ error: 'Invite not found' }, { status: 404 });
    if (invite.member_email !== user.email) {
      return Response.json({ error: 'This invite is not for you' }, { status: 403 });
    }
    if (invite.status !== 'pending') {
      return Response.json({ error: `Invite is already in status: ${invite.status}` }, { status: 400 });
    }

    // Delete the record entirely — declined invites don't need to stick around
    await base44.asServiceRole.entities.TeamMember.delete(invite.id);

    return Response.json({ success: true });
  } catch (err) {
    console.error('declineTeamInvite error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});