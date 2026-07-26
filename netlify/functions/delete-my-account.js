const { getSupabaseAdmin, getUserFromAuthHeader } = require('./_supabaseAdmin');

// This does NOT delete the underlying database records — a school needs to keep
// its financial history intact even after a parent leaves. Instead this:
//   1. Bans the login indefinitely (they can never sign back into this account)
//   2. Renames the auth email to a placeholder, freeing up the real email so it
//      can be used again for a brand new account later
//   3. Marks the profile as deleted (so payment records can show "deleted account")
// Their children, payments, and receipts all remain on file, untouched.
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

    const placeholderEmail = `deleted-${caller.id}@deleted.benaiahschool.local`;

    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(caller.id, {
      email: placeholderEmail,
      ban_duration: '876000h', // effectively permanent (100 years)
    });
    if (banError) throw banError;

    await supabaseAdmin.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', caller.id);
    await supabaseAdmin.from('admin_allowlist').delete().eq('email', caller.email);

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('delete-my-account error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Something went wrong.' }) };
  }
};
