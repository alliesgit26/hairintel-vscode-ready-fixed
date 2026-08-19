import Stripe from 'stripe';
import { getSupabaseAdmin } from './_supabase-admin.js';

async function getAuthenticatedUser(req, supabase) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data?.user?.id || !data?.user?.email) return null;
  return data.user;
}

async function cancelStripeIfPresent(subscription) {
  const subscriptionId = subscription?.stripe_subscription_id;
  if (!subscriptionId || !process.env.STRIPE_SECRET_KEY) return { cancelled: false, provider: null };

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return { cancelled: true, provider: 'stripe' };
  } catch (error) {
    if (String(error?.code || '') === 'resource_missing') {
      return { cancelled: false, provider: 'stripe', alreadyMissing: true };
    }
    throw new Error(`Could not cancel Stripe subscription: ${error.message}`);
  }
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

    const { data: subscription, error: readSubscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id,latest_event_type,status')
      .eq('customer_email', email)
      .maybeSingle();
    if (readSubscriptionError) {
      throw new Error(`Could not read subscription record: ${readSubscriptionError.message}`);
    }

    const billingCancellation = await cancelStripeIfPresent(subscription);

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('customer_email', email);
    if (subscriptionError) throw new Error(`Could not delete subscription record: ${subscriptionError.message}`);

    // Delete by both immutable auth user ID and verified email without constructing
    // a PostgREST filter string from user-controlled text.
    const { error: profileByIdError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);
    if (profileByIdError) throw new Error(`Could not delete profile record: ${profileByIdError.message}`);

    const { error: profileByEmailError } = await supabase
      .from('profiles')
      .delete()
      .eq('email', email);
    if (profileByEmailError) throw new Error(`Could not delete profile record: ${profileByEmailError.message}`);

    const { error: authError } = await supabase.auth.admin.deleteUser(user.id, false);
    if (authError) throw new Error(`Could not delete authentication account: ${authError.message}`);

    return res.status(200).json({
      deleted: true,
      billingCancellation,
      googlePlayCancellationRequired: String(subscription?.latest_event_type || '').startsWith('google_play:')
    });
  } catch (error) {
    console.error('[delete-account]', error);
    return res.status(500).json({ error: error.message || 'Account deletion failed.' });
  }
}
