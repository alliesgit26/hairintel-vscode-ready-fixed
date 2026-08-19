import { getSupabaseAdmin, normalizePlan, isActiveStripeStatus } from './_supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Missing email' });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(200).json({ plan: 'free', status: 'inactive', active: false, configured: false, billingProvider: null });
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan,status,stripe_customer_id,stripe_subscription_id,current_period_end,latest_event_type,updated_at')
    .eq('customer_email', email)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[subscription-status] Supabase error:', error.message);
    return res.status(200).json({ plan: 'free', status: 'inactive', active: false, configured: true, billingProvider: null, warning: error.message });
  }

  const plan = normalizePlan(data?.plan || 'free');
  const status = data?.status || 'inactive';
  const active = isActiveStripeStatus(status);
  const latestEventType = String(data?.latest_event_type || '');
  const billingProvider = latestEventType.startsWith('google_play:')
    ? 'google_play'
    : (data?.stripe_subscription_id || data?.stripe_customer_id ? 'stripe' : null);

  return res.status(200).json({
    plan: active ? plan : 'free',
    status,
    active,
    billingProvider,
    latestEventType: latestEventType || null,
    stripeCustomerId: data?.stripe_customer_id || null,
    stripeSubscriptionId: data?.stripe_subscription_id || null,
    currentPeriodEnd: data?.current_period_end || null,
    configured: true
  });
}
