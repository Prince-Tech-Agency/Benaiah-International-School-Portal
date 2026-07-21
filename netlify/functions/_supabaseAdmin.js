const { createClient } = require('@supabase/supabase-js');

// Uses the SERVICE ROLE key — this file only ever runs on the server (Netlify Functions),
// never in the browser bundle. It bypasses Row Level Security, which is required here
// because these functions need to read/write payments across the whole school, and
// need to trust server-computed amounts rather than whatever the client sends.
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Verifies the bearer token sent from the browser and returns the authenticated user.
async function getUserFromAuthHeader(supabaseAdmin, authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user;
}

module.exports = { getSupabaseAdmin, getUserFromAuthHeader };
