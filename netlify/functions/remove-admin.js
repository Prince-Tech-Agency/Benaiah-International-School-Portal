const { getSupabaseAdmin, getUserFromAuthHeader } = require('./_supabaseAdmin');

// Only an existing admin can remove another admin's access.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const caller = await getUserFromAuthHeader(supabaseAdmin, event.headers.authorization);
    if (!caller) {
      return { statusCode: 401, body: JSON.stringify({ error: 'You must be logged in.' }) };
    }

    const { data: callerProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', caller.id).single();
    if (callerProfile?.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Only admins can remove admin access.' }) };
    }

    const { email } = JSON.parse(event.body || '{}');
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing email.' }) };
    }

    // 1. Take them off the allowlist so any future re-signup with this email
    //    starts out as a normal parent, not an admin.
    await supabaseAdmin.from('admin_allowlist').delete().eq('email', cleanEmail);

    // 2. If they already have an account, demote it right now — this is the
    //    part that actually revokes their current access immediately.
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);

    if (existing) {
      if (existing.id === caller.id) {
        return { statusCode: 400, body: JSON.stringify({ error: "You can't remove your own admin access." }) };
      }
      await supabaseAdmin.from('profiles').update({ role: 'parent' }).eq('id', existing.id);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, demoted: !!existing }) };
  } catch (err) {
    console.error('remove-admin error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Something went wrong.' }) };
  }
};
