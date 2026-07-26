const { getSupabaseAdmin, getUserFromAuthHeader } = require('./_supabaseAdmin');

// Returns everyone who currently has the admin role, with their email attached
// (profiles doesn't store email itself — only auth.users does, so we cross-reference).
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
      return { statusCode: 403, body: JSON.stringify({ error: 'Only admins can view this list.' }) };
    }

    const { data: adminProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, created_at')
      .eq('role', 'admin');
    if (profilesError) throw profilesError;

    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const usersById = new Map((usersPage?.users || []).map((u) => [u.id, u]));

    const admins = (adminProfiles || []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      created_at: p.created_at,
      email: usersById.get(p.id)?.email || '(email unavailable)',
      isYou: p.id === caller.id,
    }));

    return { statusCode: 200, body: JSON.stringify({ admins }) };
  } catch (err) {
    console.error('list-admins error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Something went wrong.' }) };
  }
};
