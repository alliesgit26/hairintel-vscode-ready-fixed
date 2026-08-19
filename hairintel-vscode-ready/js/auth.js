window.ENV = window.ENV || {};
const HAIRI = window.HAIRI || {};
window.HAIRI = HAIRI;

HAIRI._configLoaded = false;
HAIRI._client = null;

HAIRI.loadConfig = async function () {
  if (HAIRI._configLoaded) return window.ENV;

  const hasInlineConfig = !!(window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY);
  if (!hasInlineConfig) {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const cfg = await res.json();
        window.ENV.SUPABASE_URL = cfg.SUPABASE_URL || window.ENV.SUPABASE_URL || '';
        window.ENV.SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || window.ENV.SUPABASE_ANON_KEY || '';
      }
    } catch (err) {
      console.warn('[HairIntel] Could not load remote config:', err?.message || err);
    }
  }

  HAIRI._configLoaded = true;
  return window.ENV;
};

HAIRI.isConfigured = function () {
  return !!(window.supabase && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY);
};

HAIRI.ensureClient = async function () {
  await HAIRI.loadConfig();
  if (!HAIRI.isConfigured()) return null;
  if (!HAIRI._client) {
    HAIRI._client = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);
  }
  return HAIRI._client;
};

HAIRI.getClient = function () {
  if (!HAIRI.isConfigured()) return null;
  if (!HAIRI._client) {
    HAIRI._client = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);
  }
  return HAIRI._client;
};

HAIRI.init = async function () {
  const client = await HAIRI.ensureClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    if (data?.user?.email) {
      await HAIRI.refreshSubscription(data.user.email);
    }
    return data?.user || null;
  } catch (err) {
    console.warn('[HairIntel] Auth init warning:', err?.message || err);
    return null;
  }
};

HAIRI.signUp = async function ({ email, password, firstName, lastName }) {
  const client = await HAIRI.ensureClient();
  if (!client) throw new Error('Supabase is not configured yet.');
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/` }
  });
  if (error) throw error;
  if (data?.user?.id) {
    await client.from('profiles').upsert({
      id: data.user.id,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      plan: 'free',
      subscription_status: 'inactive',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  }
  return data;
};

HAIRI.signIn = async function ({ email, password }) {
  const client = await HAIRI.ensureClient();
  if (!client) throw new Error('Supabase is not configured yet.');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data?.user?.email) await HAIRI.refreshSubscription(data.user.email);
  return data;
};

HAIRI.signOut = async function () {
  const client = await HAIRI.ensureClient();
  if (!client) throw new Error('Supabase is not configured yet.');
  const { error } = await client.auth.signOut();
  if (error) throw error;
  HI.setSub({ plan: 'free', status: 'inactive', billingProvider: null, updatedAt: new Date().toISOString() });
  HIApp.go('welcome');
};

HAIRI.refreshSubscription = async function (email) {
  if (!email) return null;
  try {
    const res = await fetch(`/api/subscription-status?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not check subscription status.');
    if (data.plan) {
      HI.setSub({
        plan: data.plan || 'free',
        status: data.status || 'inactive',
        billingProvider: data.billingProvider || null,
        latestEventType: data.latestEventType || null,
        stripeCustomerId: data.stripeCustomerId || null,
        stripeSubscriptionId: data.stripeSubscriptionId || null,
        currentPeriodEnd: data.currentPeriodEnd || null,
        updatedAt: new Date().toISOString()
      });
    }
    return data;
  } catch (err) {
    console.warn('[HairIntel] Subscription refresh failed:', err?.message || err);
    return null;
  }
};

HAIRI.applyCheckoutSession = async function (sessionId) {
  if (!sessionId) return null;
  const res = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(sessionId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not confirm checkout.');

  HI.setSub({
    plan: data.plan || 'free',
    status: data.status || (data.active ? 'active' : 'inactive'),
    billingProvider: 'stripe',
    stripeCustomerId: data.stripeCustomerId || null,
    stripeSubscriptionId: data.stripeSubscriptionId || null,
    updatedAt: new Date().toISOString()
  });

  return data;
};

HAIRI.startCheckout = async function (plan) {
  const client = await HAIRI.ensureClient();
  let customerEmail = null;
  let userId = null;

  if (client) {
    try {
      const { data } = await client.auth.getUser();
      customerEmail = data?.user?.email || null;
      userId = data?.user?.id || null;
    } catch {}
  }

  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, customerEmail, userId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Checkout failed');
  window.location.href = data.url;
};

// Preview-only QA login. This branch is never merged into production.
if (document.readyState === 'loading' && String(window.location.hostname || '').endsWith('.vercel.app') && window.location.hostname !== 'hairintel-ai.vercel.app') {
  document.write('<script src="js/qa-auth-preview.js"></scr' + 'ipt>');
}
