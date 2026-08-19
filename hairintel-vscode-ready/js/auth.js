window.ENV = window.ENV || {};
const HAIRI = window.HAIRI || {};
window.HAIRI = HAIRI;

HAIRI._configLoaded = false;
HAIRI._client = null;
HAIRI._clientMode = null;

const HAIRI_SESSION_KEY = 'hairintel_supabase_session_v1';
const QA_IDENTITY_KEY = 'hairintel_qa_identity_v2';
const QA_PASSWORD_SHA256 = '11955a4da149a921640a1f22f1cf3b8196e3918fab6b17536863188ced512801';
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

function isHairIntelHost() {
  const host = String(window.location.hostname || '').toLowerCase();
  return host === 'hairintel-ai.vercel.app' || host.endsWith('.vercel.app') || host === 'localhost' || host === '127.0.0.1';
}

function getQaUser(email) {
  return QA_USERS[normalizeEmail(email)] || null;
}

function getQaIdentity() {
  if (!isHairIntelHost()) return null;
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

function hairiReadSession() {
  try {
    const raw = localStorage.getItem(HAIRI_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hairiSaveSession(session) {
  if (!session?.access_token) return null;
  const normalized = {
    ...session,
    expires_at: Number(session.expires_at || (Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600)))
  };
  localStorage.setItem(HAIRI_SESSION_KEY, JSON.stringify(normalized));
  return normalized;
}

function hairiClearSession() {
  localStorage.removeItem(HAIRI_SESSION_KEY);
}

function hairiSetSubscription(sub) {
  const normalized = {
    plan: sub?.plan || 'free',
    status: sub?.status || 'inactive',
    billingProvider: sub?.billingProvider || null,
    latestEventType: sub?.latestEventType || null,
    stripeCustomerId: sub?.stripeCustomerId || null,
    stripeSubscriptionId: sub?.stripeSubscriptionId || null,
    currentPeriodEnd: sub?.currentPeriodEnd || null,
    qaPreview: Boolean(sub?.qaPreview),
    updatedAt: sub?.updatedAt || new Date().toISOString()
  };

  try {
    localStorage.setItem('hairintel_subscription_v1', JSON.stringify(normalized));
    localStorage.setItem('hi_subscription', JSON.stringify(normalized));
  } catch {}

  if (window.HI && typeof window.HI.setSub === 'function') {
    try { window.HI.setSub(normalized); } catch {}
  }

  return normalized;
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
  localStorage.setItem('hairintel_customer_email', user.email);
  localStorage.setItem('hairintel_qa_pro_preview', '1');
  hairiSetSubscription(qaSubscription());
  document.documentElement.classList.add('hi-qa-pro-preview');
}

function clearQaState() {
  localStorage.removeItem(QA_IDENTITY_KEY);
  localStorage.removeItem('hairintel_profile_v1');
  localStorage.removeItem('hairintel_subscription_v1');
  localStorage.removeItem('hairintel_customer_email');
  localStorage.removeItem('hairintel_qa_pro_preview');
  document.documentElement.classList.remove('hi-qa-pro-preview');
  hairiSetSubscription({ plan: 'free', status: 'inactive', billingProvider: null, qaPreview: false });
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
    onAuthStateChange(callback) {
      let cancelled = false;
      Promise.resolve().then(() => {
        if (cancelled) return;
        const user = getQaIdentity();
        callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { access_token: 'qa-preview-only', user } : null);
      });
      return { data: { subscription: { unsubscribe() { cancelled = true; } } } };
    }
  }
};

function hairiErrorMessage(data, fallback) {
  return data?.msg || data?.message || data?.error_description || data?.error || fallback;
}

HAIRI.loadConfig = async function () {
  if (HAIRI._configLoaded && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY) return window.ENV;

  const hasInlineConfig = !!(window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY);
  if (!hasInlineConfig) {
    try {
      const res = await fetch('/api/config', { cache: 'no-store', headers: { Accept: 'application/json' } });
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
  return !!(window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY);
};

function hairiAuthUrl(path) {
  return `${String(window.ENV.SUPABASE_URL || '').replace(/\/$/, '')}${path}`;
}

async function hairiJsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function hairiRefreshFallbackSession() {
  const current = hairiReadSession();
  if (!current?.refresh_token) return null;

  const { response, data } = await hairiJsonFetch(hairiAuthUrl('/auth/v1/token?grant_type=refresh_token'), {
    method: 'POST',
    headers: {
      apikey: window.ENV.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: current.refresh_token })
  });

  if (!response.ok || !data?.access_token) {
    hairiClearSession();
    return null;
  }

  return hairiSaveSession(data);
}

async function hairiGetFreshFallbackSession() {
  const current = hairiReadSession();
  if (!current?.access_token) return null;
  const expiresAt = Number(current.expires_at || 0);
  if (!expiresAt || expiresAt > Math.floor(Date.now() / 1000) + 30) return current;
  return hairiRefreshFallbackSession();
}

function hairiCreateFallbackClient() {
  return {
    __hairintelFallback: true,
    auth: {
      async signInWithPassword({ email, password }) {
        try {
          const { response, data } = await hairiJsonFetch(hairiAuthUrl('/auth/v1/token?grant_type=password'), {
            method: 'POST',
            headers: {
              apikey: window.ENV.SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
          });

          if (!response.ok || !data?.access_token) {
            return { data: { user: null, session: null }, error: new Error(hairiErrorMessage(data, 'Sign-in failed.')) };
          }

          const session = hairiSaveSession(data);
          return { data: { user: data.user || session?.user || null, session }, error: null };
        } catch (error) {
          return { data: { user: null, session: null }, error };
        }
      },

      async signUp({ email, password, options = {} }) {
        try {
          const redirect = options.emailRedirectTo ? `?redirect_to=${encodeURIComponent(options.emailRedirectTo)}` : '';
          const { response, data } = await hairiJsonFetch(hairiAuthUrl(`/auth/v1/signup${redirect}`), {
            method: 'POST',
            headers: {
              apikey: window.ENV.SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, data: options.data || {} })
          });

          if (!response.ok) {
            return { data: { user: null, session: null }, error: new Error(hairiErrorMessage(data, 'Account creation failed.')) };
          }

          const session = data?.access_token ? hairiSaveSession(data) : null;
          return { data: { user: data.user || data || null, session }, error: null };
        } catch (error) {
          return { data: { user: null, session: null }, error };
        }
      },

      async getSession() {
        try {
          const session = await hairiGetFreshFallbackSession();
          return { data: { session }, error: null };
        } catch (error) {
          return { data: { session: null }, error };
        }
      },

      async getUser() {
        try {
          const session = await hairiGetFreshFallbackSession();
          if (!session?.access_token) return { data: { user: null }, error: null };

          const { response, data } = await hairiJsonFetch(hairiAuthUrl('/auth/v1/user'), {
            headers: {
              apikey: window.ENV.SUPABASE_ANON_KEY,
              Authorization: `Bearer ${session.access_token}`
            }
          });

          if (!response.ok) {
            if (response.status === 401) hairiClearSession();
            return { data: { user: null }, error: new Error(hairiErrorMessage(data, 'Could not verify session.')) };
          }

          const updated = { ...session, user: data };
          hairiSaveSession(updated);
          return { data: { user: data }, error: null };
        } catch (error) {
          return { data: { user: null }, error };
        }
      },

      async signOut() {
        const session = await hairiGetFreshFallbackSession().catch(() => null);
        try {
          if (session?.access_token) {
            await fetch(hairiAuthUrl('/auth/v1/logout'), {
              method: 'POST',
              headers: {
                apikey: window.ENV.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.access_token}`
              }
            });
          }
        } catch {}
        hairiClearSession();
        return { error: null };
      },

      onAuthStateChange(callback) {
        let cancelled = false;
        Promise.resolve().then(async () => {
          if (cancelled) return;
          const session = await hairiGetFreshFallbackSession().catch(() => null);
          callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        });
        return { data: { subscription: { unsubscribe() { cancelled = true; } } } };
      }
    },

    from(table) {
      return {
        async upsert(payload, options = {}) {
          try {
            const session = await hairiGetFreshFallbackSession();
            if (!session?.access_token) return { data: null, error: new Error('Sign in is required.') };

            const conflict = options.onConflict ? `?on_conflict=${encodeURIComponent(options.onConflict)}` : '';
            const { response, data } = await hairiJsonFetch(hairiAuthUrl(`/rest/v1/${encodeURIComponent(table)}${conflict}`), {
              method: 'POST',
              headers: {
                apikey: window.ENV.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates,return=representation'
              },
              body: JSON.stringify(payload)
            });

            if (!response.ok) return { data: null, error: new Error(hairiErrorMessage(data, 'Could not save profile.')) };
            return { data, error: null };
          } catch (error) {
            return { data: null, error };
          }
        }
      };
    }
  };
}

HAIRI.ensureClient = async function () {
  const qaUser = getQaIdentity();
  if (qaUser) {
    writeQaState(qaUser);
    return qaFakeClient;
  }

  await HAIRI.loadConfig();
  if (!HAIRI.isConfigured()) return null;

  const sdkAvailable = !!(window.supabase && typeof window.supabase.createClient === 'function');
  const desiredMode = sdkAvailable ? 'sdk' : 'fallback';

  if (!HAIRI._client || HAIRI._clientMode !== desiredMode) {
    HAIRI._client = sdkAvailable
      ? window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY)
      : hairiCreateFallbackClient();
    HAIRI._clientMode = desiredMode;
    if (!sdkAvailable) console.warn('[HairIntel] Supabase browser SDK unavailable; using built-in auth fallback.');
  }

  return HAIRI._client;
};

HAIRI.getClient = function () {
  const qaUser = getQaIdentity();
  if (qaUser) return qaFakeClient;

  if (!HAIRI.isConfigured()) return HAIRI._client;
  if (HAIRI._client) return HAIRI._client;

  if (window.supabase && typeof window.supabase.createClient === 'function') {
    HAIRI._client = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);
    HAIRI._clientMode = 'sdk';
  } else {
    HAIRI._client = hairiCreateFallbackClient();
    HAIRI._clientMode = 'fallback';
  }
  return HAIRI._client;
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
    const { data, error } = await client.auth.getUser();
    if (error && !data?.user) return null;
    if (data?.user?.email) await HAIRI.refreshSubscription(data.user.email);
    return data?.user || null;
  } catch (err) {
    console.warn('[HairIntel] Auth init warning:', err?.message || err);
    return null;
  }
};

HAIRI.signUp = async function ({ email, password, firstName, lastName }) {
  const normalized = normalizeEmail(email);
  if (getQaUser(normalized)) throw new Error('This is an internal HairIntel tester account. Use Sign In.');

  const client = await HAIRI.ensureClient();
  if (!client || client === qaFakeClient) throw new Error('HairIntel could not load its account configuration. Refresh and try again.');

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: { first_name: firstName || null, last_name: lastName || null }
    }
  });
  if (error) throw error;

  if (data?.user?.id && data?.session?.access_token) {
    const result = await client.from('profiles').upsert({
      id: data.user.id,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      plan: 'free',
      subscription_status: 'inactive',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (result?.error) console.warn('[HairIntel] Profile save warning:', result.error.message);
  }

  return data;
};

HAIRI.signIn = async function ({ email, password }) {
  const normalized = normalizeEmail(email);
  const qaUser = isHairIntelHost() ? getQaUser(normalized) : null;

  if (qaUser) {
    const digest = await sha256(password);
    if (digest !== QA_PASSWORD_SHA256) throw new Error('Invalid login credentials');
    hairiClearSession();
    writeQaState(qaUser);
    return {
      user: qaUser,
      session: { access_token: 'qa-preview-only', user: qaUser }
    };
  }

  const client = await HAIRI.ensureClient();
  if (!client || client === qaFakeClient) throw new Error('HairIntel could not load its account configuration. Refresh and try again.');

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data?.user?.email) await HAIRI.refreshSubscription(data.user.email);
  return data;
};

HAIRI.signOut = async function () {
  if (getQaIdentity()) {
    clearQaState();
    hairiClearSession();
    if (window.HIApp && typeof window.HIApp.go === 'function') window.HIApp.go('welcome');
    return;
  }

  const client = await HAIRI.ensureClient();
  if (client?.auth) {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }
  hairiClearSession();
  hairiSetSubscription({ plan: 'free', status: 'inactive', billingProvider: null, qaPreview: false });
  if (window.HIApp && typeof window.HIApp.go === 'function') window.HIApp.go('welcome');
};

HAIRI.refreshSubscription = async function (email) {
  const qaUser = getQaIdentity();
  if (qaUser && normalizeEmail(email) === qaUser.email) {
    writeQaState(qaUser);
    return qaSubscription();
  }

  if (!email) return null;
  try {
    const res = await fetch(`/api/subscription-status?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not check subscription status.');
    if (data.plan) {
      hairiSetSubscription({
        plan: data.plan || 'free',
        status: data.status || 'inactive',
        billingProvider: data.billingProvider || null,
        latestEventType: data.latestEventType || null,
        stripeCustomerId: data.stripeCustomerId || null,
        stripeSubscriptionId: data.stripeSubscriptionId || null,
        currentPeriodEnd: data.currentPeriodEnd || null,
        qaPreview: false
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

  hairiSetSubscription({
    plan: data.plan || 'free',
    status: data.status || (data.active ? 'active' : 'inactive'),
    billingProvider: 'stripe',
    stripeCustomerId: data.stripeCustomerId || null,
    stripeSubscriptionId: data.stripeSubscriptionId || null,
    qaPreview: false
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

function installHairIntelShellFixes() {
  if (!document.getElementById('hairintel-shell-state-fix')) {
    const style = document.createElement('style');
    style.id = 'hairintel-shell-state-fix';
    style.textContent = `
      html.hi-authenticated .plum-v2 .pv2-guest-actions{display:none!important}
      html.hi-authenticated .plum-v2 .pv2-member-actions{display:flex!important}
      html.hi-guest .plum-v2 .pv2-member-actions{display:none!important}
      @media(max-width:720px){
        #hi-auth-modal .hi-auth-actions{display:grid!important;grid-template-columns:1fr!important;width:100%!important;gap:10px!important}
        #hi-auth-modal .hi-auth-actions button{width:100%!important;max-width:none!important;margin:0!important}
        #hi-auth-modal #hi-save-profile{display:block!important;order:-1!important}
      }
    `;
    document.head.appendChild(style);
  }

  const patch = () => {
    document.querySelectorAll('form').forEach((form) => { form.noValidate = true; });
    document.querySelectorAll('input[type="email"], #hi-email').forEach((input) => {
      input.type = 'text';
      input.inputMode = 'email';
      input.removeAttribute('pattern');
      input.setAttribute('autocomplete', 'username');

      const updateQaUi = () => {
        const create = document.getElementById('hi-create-account');
        if (create) create.style.display = getQaUser(input.value) ? 'none' : '';
      };
      if (!input.__hairintelQaBound) {
        input.__hairintelQaBound = true;
        input.addEventListener('input', updateQaUi);
      }
      updateQaUi();
    });
  };

  patch();
  if (!window.__HAIRINTEL_FORM_OBSERVER__) {
    window.__HAIRINTEL_FORM_OBSERVER__ = new MutationObserver(patch);
    window.__HAIRINTEL_FORM_OBSERVER__.observe(document.documentElement, { childList: true, subtree: true });
  }
}

function loadHairIntelBrandPolish() {
  installHairIntelShellFixes();
  if (document.querySelector('script[data-hairintel-brand-polish]')) return;
  const script = document.createElement('script');
  script.src = 'js/brand-polish.js?v=20260819-live';
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
