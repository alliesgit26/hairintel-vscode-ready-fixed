import { createClient } from '@supabase/supabase-js';

export function getSupabaseEnv() {
  return {
    url:
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      '',
    serviceKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      '',
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      ''
  };
}

export function getSupabaseAdmin() {
  const env = getSupabaseEnv();
  if (!env.url || !env.serviceKey) return null;
  return createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function normalizePlan(plan) {
  const p = String(plan || '').trim().toLowerCase();
  if (['starter', 'basic'].includes(p)) return 'starter';
  if (['pro', 'professional'].includes(p)) return 'pro';
  if (['studio', 'salon', 'team'].includes(p)) return 'studio';
  return p || 'free';
}

export function isActiveStripeStatus(status) {
  return ['active', 'trialing', 'paid', 'complete'].includes(String(status || '').toLowerCase());
}

export function planFromPrice(priceId) {
  if (!priceId) return 'free';
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_SALON || priceId === process.env.STRIPE_PRICE_STUDIO) return 'studio';
  return 'free';
}

export async function upsertSubscriptionRecord(payload = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[supabase] Admin client not configured. Skipping subscription upsert.');
    return { skipped: true, reason: 'missing_supabase_env' };
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const plan = normalizePlan(payload.plan);
  const status = payload.status || 'inactive';
  const now = new Date().toISOString();

  if (!email && !payload.stripeCustomerId) {
    return { skipped: true, reason: 'missing_email_and_customer' };
  }

  const profilePatch = {
    email: email || null,
    plan,
    subscription_status: status,
    stripe_customer_id: payload.stripeCustomerId || null,
    stripe_subscription_id: payload.stripeSubscriptionId || null,
    current_period_end: payload.currentPeriodEnd || null,
    updated_at: now
  };

  const subscriptionPatch = {
    customer_email: email || null,
    plan,
    status,
    stripe_customer_id: payload.stripeCustomerId || null,
    stripe_subscription_id: payload.stripeSubscriptionId || null,
    stripe_price_id: payload.priceId || null,
    current_period_end: payload.currentPeriodEnd || null,
    latest_event_type: payload.eventType || null,
    updated_at: now
  };

  const results = [];

  if (email) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePatch, { onConflict: 'email' });
    if (profileError) {
      console.warn('[supabase] profiles upsert failed:', profileError.message);
      results.push({ table: 'profiles', ok: false, message: profileError.message });
    } else {
      results.push({ table: 'profiles', ok: true });
    }

    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert(subscriptionPatch, { onConflict: 'customer_email' });
    if (subError) {
      console.warn('[supabase] subscriptions upsert failed:', subError.message);
      results.push({ table: 'subscriptions', ok: false, message: subError.message });
    } else {
      results.push({ table: 'subscriptions', ok: true });
    }
  }

  return { skipped: false, results };
}
