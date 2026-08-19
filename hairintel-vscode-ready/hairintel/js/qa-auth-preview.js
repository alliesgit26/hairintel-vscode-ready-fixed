(function installHairIntelQaPreview() {
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
  const QA_KEY = 'hairintel_qa_preview_identity';
  const ROOT_QA_KEY = 'hairintel_qa_identity_v2';
  const LEGACY_KEY = 'hairintel_qa_preview_password';
  const state = { active: false, user: null };

  function allowedHost() {
    const host = String(window.location.hostname || '').toLowerCase();
    return host === 'hairintel-ai.vercel.app' || host.endsWith('.vercel.app') || host === 'localhost' || host === '127.0.0.1';
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(String(value || ''));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getQaUser(email) {
    return QA_USERS[normalizeEmail(email)] || null;
  }

  function rootQaUser() {
    try {
      const saved = JSON.parse(localStorage.getItem(ROOT_QA_KEY) || 'null');
      return getQaUser(saved?.email);
    } catch {
      return null;
    }
  }

  function writeQaState() {
    const user = state.user;
    if (!user) return;
    const now = new Date().toISOString();
    const profile = { email: user.email, userId: user.id, savedAt: now, qaPreview: true };
    const sub = {
      plan: 'pro',
      status: 'trialing',
      billingProvider: 'qa_preview',
      qaPreview: true,
      updatedAt: now
    };
    localStorage.setItem(ROOT_QA_KEY, JSON.stringify({ email: user.email }));
    localStorage.setItem('hairintel_profile_v1', JSON.stringify(profile));
    localStorage.setItem('hairintel_subscription_v1', JSON.stringify(sub));
    localStorage.setItem('hi_subscription', JSON.stringify(sub));
    localStorage.setItem('hairintel_customer_email', user.email);
    localStorage.setItem('hairintel_qa_pro_preview', '1');
    if (window.HI && typeof window.HI.setSub === 'function') window.HI.setSub(sub);
  }

  function activateTrustedUser(user) {
    if (!allowedHost() || !user) return false;
    state.active = true;
    state.user = user;
    writeQaState();
    document.documentElement.classList.add('hi-qa-pro-preview');
    return true;
  }

  function clearQaState() {
    state.active = false;
    state.user = null;
    sessionStorage.removeItem(QA_KEY);
    sessionStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem(ROOT_QA_KEY);
    localStorage.removeItem('hairintel_profile_v1');
    localStorage.removeItem('hairintel_subscription_v1');
    localStorage.removeItem('hairintel_customer_email');
    localStorage.removeItem('hairintel_qa_pro_preview');
    localStorage.setItem('hi_subscription', JSON.stringify({ plan: 'free', status: 'inactive', updatedAt: new Date().toISOString() }));
  }

  async function activate(email, password) {
    if (!allowedHost()) return false;
    const user = getQaUser(email);
    if (!user) return false;
    const digest = await sha256(password);
    if (digest !== QA_PASSWORD_SHA256) return false;
    sessionStorage.setItem(QA_KEY, JSON.stringify({ email: user.email, password }));
    sessionStorage.removeItem(LEGACY_KEY);
    return activateTrustedUser(user);
  }

  const qaReady = (async () => {
    if (!allowedHost()) return false;

    const trusted = rootQaUser();
    if (trusted) return activateTrustedUser(trusted);

    let identity = null;
    try { identity = JSON.parse(sessionStorage.getItem(QA_KEY) || 'null'); } catch {}

    if (!identity?.email || !identity?.password) {
      const legacyPassword = sessionStorage.getItem(LEGACY_KEY) || '';
      if (legacyPassword) identity = { email: 'casey.pro@hairintel.preview', password: legacyPassword };
    }

    if (!identity?.email || !identity?.password) return false;
    return activate(identity.email, identity.password);
  })();

  window.__HAIRINTEL_QA_READY__ = qaReady;

  function activeUser() {
    return state.user || rootQaUser() || QA_USERS['casey.pro@hairintel.preview'];
  }

  const fakeClient = {
    auth: {
      getUser: async () => ({ data: { user: activeUser() }, error: null }),
      getSession: async () => ({ data: { session: { access_token: 'qa-preview-only', user: activeUser() } }, error: null }),
      signOut: async () => { clearQaState(); return { error: null }; },
      onAuthStateChange: (callback) => {
        queueMicrotask(() => callback('SIGNED_IN', { access_token: 'qa-preview-only', user: activeUser() }));
        return { data: { subscription: { unsubscribe() {} } } };
      }
    }
  };

  const originalEnsureClient = window.HAIRI.ensureClient.bind(window.HAIRI);
  const originalGetClient = window.HAIRI.getClient.bind(window.HAIRI);
  const originalInit = window.HAIRI.init.bind(window.HAIRI);
  const originalSignIn = window.HAIRI.signIn.bind(window.HAIRI);
  const originalRefreshSubscription = window.HAIRI.refreshSubscription.bind(window.HAIRI);
  const originalFetch = window.fetch.bind(window);

  window.HAIRI.ensureClient = async function () {
    await qaReady;
    if (state.active) return fakeClient;
    return originalEnsureClient();
  };

  window.HAIRI.getClient = function () {
    if (state.active) return fakeClient;
    return originalGetClient();
  };

  window.HAIRI.init = async function () {
    await qaReady;
    if (state.active) {
      writeQaState();
      return activeUser();
    }
    return originalInit();
  };

  window.HAIRI.signIn = async function ({ email, password }) {
    const normalized = normalizeEmail(email);
    if (allowedHost() && getQaUser(normalized)) {
      const activated = await activate(normalized, password);
      if (!activated) throw new Error('Invalid login credentials');
      return { user: activeUser(), session: { access_token: 'qa-preview-only', user: activeUser() } };
    }
    return originalSignIn({ email, password });
  };

  window.HAIRI.refreshSubscription = async function (email) {
    await qaReady;
    if (state.active && normalizeEmail(email) === activeUser().email) {
      writeQaState();
      return { plan: 'pro', status: 'trialing', active: true, billingProvider: 'qa_preview', qaPreview: true };
    }
    return originalRefreshSubscription(email);
  };

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.includes('/api/subscription-status')) {
      await qaReady;
      if (state.active) {
        const parsed = new URL(url, window.location.origin);
        if (normalizeEmail(parsed.searchParams.get('email')) === activeUser().email) {
          return new Response(JSON.stringify({
            plan: 'pro',
            status: 'trialing',
            active: true,
            billingProvider: 'qa_preview',
            configured: true,
            qaPreview: true
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      }
    }
    return originalFetch(input, init);
  };
})();