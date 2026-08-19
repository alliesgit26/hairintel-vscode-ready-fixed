window.ENV = window.ENV || {};
const HAIRI = window.HAIRI || {};
window.HAIRI = HAIRI;

HAIRI._configLoaded = false;
HAIRI._client = null;
HAIRI._clientMode = null;

const HAIRI_SESSION_KEY = 'hairintel_supabase_session_v1';

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
  const client = await HAIRI.ensureClient();
  if (!client) throw new Error('HairIntel could not load its account configuration. Refresh and try again.');

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
  const client = await HAIRI.ensureClient();
  if (!client) throw new Error('HairIntel could not load its account configuration. Refresh and try again.');

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data?.user?.email) await HAIRI.refreshSubscription(data.user.email);
  return data;
};

HAIRI.signOut = async function () {
  const client = await HAIRI.ensureClient();
  if (client?.auth) {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }
  hairiClearSession();
  hairiSetSubscription({ plan: 'free', status: 'inactive', billingProvider: null });
  if (window.HIApp && typeof window.HIApp.go === 'function') window.HIApp.go('welcome');
};

HAIRI.refreshSubscription = async function (email) {
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
        currentPeriodEnd: data.currentPeriodEnd || null
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
    stripeSubscriptionId: data.stripeSubscriptionId || null
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
