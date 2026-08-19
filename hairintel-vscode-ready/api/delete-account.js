import { getSupabaseAdmin } from './_supabase-admin.js';

async function getAuthenticatedUser(req, supabase) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data?.user?.id || !data?.user?.email) return null;
  return data.user;
}

export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    res.setHeader('Allow', 'DELETE, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: 'Account deletion is not configured.' });

  try {
    const user = await getAuthenticatedUser(req, supabase);
    if (!user) return res.status(401).json({ error: 'A verified HairIntel sign-in is required.' });

    const email = String(user.email || '').trim().toLowerCase();

    // Delete HairIntel application records first. The current production schema
    // stores account/profile and subscription entitlement server-side; consultation
    // drafts are browser-local and are cleared by the client after this succeeds.
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('customer_email', email);
    if (subscriptionError) throw new Error(`Could not delete subscription record: ${subscriptionError.message}`);

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .or(`id.eq.${user.id},email.eq.${email}`);
    if (profileError) throw new Error(`Could not delete profile record: ${profileError.message}`);

    const { error: authError } = await supabase.auth.admin.deleteUser(user.id, false);
    if (authError) throw new Error(`Could not delete authentication account: ${authError.message}`);

    return res.status(200).json({ deleted: true });
  } catch (error) {
    console.error('[delete-account]', error);
    return res.status(500).json({ error: error.message || 'Account deletion failed.' });
  }
}
