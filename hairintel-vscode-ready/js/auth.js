window.ENV = window.ENV || {};
const HAIRI = window.HAIRI || {};
window.HAIRI = HAIRI;

HAIRI._configLoaded = false;
HAIRI._client = null;

const QA_PASSWORD_SHA256 = '11955a4da149a921640a1f22f1cf3b8196e3918fab6b17536863188ced512801';
const QA_IDENTITY_KEY = 'hairintel_qa_identity_v2';
const QA_USERS = {
  'casey.pro@hairintel.preview': {
    id: 'qa-pro-preview-casey',
    email: 'casey.pro@hairintel.preview',
    role: 'authenticated',
    user_metadata: { first_name: 'Casey', last_name: 'QA', qa_preview: true }
  },
  'allie.pro@hairintel.preview': {
    id: 'qa-pro-preview-allie',
    email: 'allie.pro@hairintel.preview',
    role: 'authenticated',
    user_metadata: { first_name: 'Allie', last_name: 'QA', qa_preview: true }
  }
};

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isQaPreviewHost() {
  const host = String(window.location.hostname || '').toLowerCase();
  return host.endsWith('.vercel.app') && host !== 'hairintel-ai.vercel.app' && !host.includes('git-main-');
}

function getQaUser(email) {
  return QA_USERS[normalizeEmail(email)] || null;
}

function getQaIdentity() {
  if (!isQaPreviewHost()) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(QA_IDENTITY_KEY) || 'null');
    return getQaUser(saved?.email);
  } catch {
    return null;
  }
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function qaSubscription() {
  return {
    plan: 'pro',
    status: 'trialing',
    active: true,
    billingProvider: 'qa_preview',
    configured: true,
    qaPreview: true,
    updatedAt: new Date().toISOString()
  };
}

function writeQaState(user) {
  if (!user) return;
  localStorage.setItem(QA_IDENTITY_KEY, JSON.stringify({ email: user.email }));
  localStorage.setItem('hairintel_profile_v1', JSON.stringify({
    email: user.email,
    userId: user.id,
    savedAt: new Date().toISOString(),
    qaPreview: true
  }));
  const sub = qaSubscription();
  localStorage.setItem('hairintel_subscription_v1', JSON.stringify(sub));
  localStorage.setItem('hi_subscription', JSON.stringify(sub));
  localStorage.setItem('hairintel_customer_email', user.email);
  localStorage.setItem('hairintel_qa_pro_preview', '1');
  if (window.HI && typeof window.HI.setSub === 'function') window.HI.setSub(sub);
  document.documentElement.classList.add('hi-qa-pro-preview');
}

function clearQaState() {
  localStorage.removeItem(QA_IDENTITY_KEY);
  localStorage.removeItem('hairintel_profile_v1');
  localStorage.removeItem('hairintel_subscription_v1');
  localStorage.removeItem('hairintel_customer_email');
  localStorage.removeItem('hairintel_qa_pro_preview');
  localStorage.setItem('hi_subscription', JSON.stringify({
    plan: 'free',
    status: 'inactive',
    updatedAt: new Date().toISOString()
  }));
  document.documentElement.classList.remove('hi-qa-pro-preview');
}

const qaFakeClient = {
  auth: {
    getUser: async () => ({ data: { user: getQaIdentity() }, error: null }),
    getSession: async () => {
      const user = getQaIdentity();
      return {
        data: { session: user ? { access_token: 'qa-preview-only', user } : null },
        error: null
      };
    },
    signOut: async () => {
      clearQaState();
      return { error: null };
    },
    onAuthStateChange: (callback) => {
      const user = getQaIdentity();
      queueMicrotask(() => callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? {
        access_token: 'qa-preview-only',
        user
      } : null));
      return { data: { subscription: { unsubscribe() {} } } };
    }
  }
};

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

function getRealClient() {
  if (!HAIRI.isConfigured()) return null;
  if (!HAIRI._client) {
    HAIRI._client = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);
  }
  return HAIRI._client;
}

HAIRI.ensureClient = async function () {
  const qaUser = getQaIdentity();
  if (qaUser) {
    writeQaState(qaUser);
    return qaFakeClient;
  }
  await HAIRI.loadConfig();
  return getRealClient();
};

HAIRI.getClient = function () {
  const qaUser = getQaIdentity();
  if (qaUser) return qaFakeClient;
  return getRealClient();
};

HAIRI.init = async function () {
  const qaUser = getQaIdentity();
  if (qaUser) {
    writeQaState(qaUser);
    return qaUser;
  }

  const client = await HAIRI.ensureClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    if (data?.user?.email) await HAIRI.refreshSubscription(data.user.email);
    return data?.user || null;
  } catch (err) {
    console.warn('[HairIntel] Auth init warning:', err?.message || err);
    return null;
  }
};

HAIRI.signUp = async function ({ email, password, firstName, lastName }) {
  const client = await HAIRI.ensureClient();
  if (!client || client === qaFakeClient) throw new Error('Use Sign In for HairIntel QA preview accounts.');
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
  const normalized = normalizeEmail(email);
  const qaUser = isQaPreviewHost() ? getQaUser(normalized) : null;

  if (qaUser) {
    const digest = await sha256(password);
    if (digest !== QA_PASSWORD_SHA256) throw new Error('Invalid login credentials');
    writeQaState(qaUser);
    return {
      user: qaUser,
      session: { access_token: 'qa-preview-only', user: qaUser }
    };
  }

  const client = await HAIRI.ensureClient();
  if (!client || client === qaFakeClient) throw new Error('Invalid login credentials');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data?.user?.email) await HAIRI.refreshSubscription(data.user.email);
  return data;
};

HAIRI.signOut = async function () {
  if (getQaIdentity()) {
    clearQaState();
    return;
  }
  const client = await HAIRI.ensureClient();
  if (!client) throw new Error('Supabase is not configured yet.');
  const { error } = await client.auth.signOut();
  if (error) throw error;
  if (window.HI && typeof window.HI.setSub === 'function') {
    window.HI.setSub({ plan: 'free', status: 'inactive', billingProvider: null, updatedAt: new Date().toISOString() });
  }
  if (window.HIApp && typeof window.HIApp.go === 'function') window.HIApp.go('welcome');
};

HAIRI.refreshSubscription = async function (email) {
  const normalized = normalizeEmail(email);
  const qaUser = getQaIdentity();
  if (qaUser && normalized === qaUser.email) {
    writeQaState(qaUser);
    return qaSubscription();
  }

  if (!email) return null;
  try {
    const res = await fetch(`/api/subscription-status?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not check subscription status.');
    if (data.plan && window.HI && typeof window.HI.setSub === 'function') {
      window.HI.setSub({
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
  if (window.HI && typeof window.HI.setSub === 'function') {
    window.HI.setSub({
      plan: data.plan || 'free',
      status: data.status || (data.active ? 'active' : 'inactive'),
      billingProvider: 'stripe',
      stripeCustomerId: data.stripeCustomerId || null,
      stripeSubscriptionId: data.stripeSubscriptionId || null,
      updatedAt: new Date().toISOString()
    });
  }
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

function installQaShellStateFix() {
  if (document.getElementById('hairintel-qa-shell-state-fix')) return;
  const style = document.createElement('style');
  style.id = 'hairintel-qa-shell-state-fix';
  style.textContent = `
    html.hi-authenticated .plum-v2 .pv2-guest-actions{display:none!important}
    html.hi-authenticated .plum-v2 .pv2-member-actions{display:flex!important}
    html.hi-guest .plum-v2 .pv2-member-actions{display:none!important}
  `;
  document.head.appendChild(style);
}

function loadHairIntelBrandPolish() {
  installQaShellStateFix();
  if (document.querySelector('script[data-hairintel-brand-polish]')) return;
  const script = document.createElement('script');
  script.src = 'js/brand-polish.js?v=20260819-brand2';
  script.dataset.hairintelBrandPolish = '1';
  document.head.appendChild(script);
}

const existingQa = getQaIdentity();
if (existingQa) writeQaState(existingQa);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadHairIntelBrandPolish);
} else {
  loadHairIntelBrandPolish();
}
