const { getSupabaseAdmin, getUserFromAuthHeader } = require('./_supabaseAdmin');

// Only an existing admin can invite another admin.
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
      return { statusCode: 403, body: JSON.stringify({ error: 'Only admins can invite other admins.' }) };
    }

    const { email } = JSON.parse(event.body || '{}');
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Enter a valid email address.' }) };
    }

    // Add to the allowlist FIRST — the signup trigger checks this table the moment
    // the invited user's auth row is created below, so the order here matters.
    await supabaseAdmin.from('admin_allowlist').upsert({ email: cleanEmail, added_by: caller.id });

    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:5173';

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo: `${siteUrl}/set-password`,
      data: { role: 'admin' },
    });

    if (error) {
      // Most likely cause: this email already has an account (e.g. an existing
      // parent). We can't send a fresh invite to an existing user, so instead
      // just promote their existing profile directly.
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (existing) {
        await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', existing.id);
        return {
          statusCode: 200,
          body: JSON.stringify({ success: true, promotedExisting: true }),
        };
      }
      throw new Error(error.message || 'Could not send the invitation email.');
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, userId: data.user.id }) };
  } catch (err) {
    console.error('invite-admin error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Something went wrong.' }) };
  }
};
