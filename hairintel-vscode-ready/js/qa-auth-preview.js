(function installHairIntelQaPreview() {
  const QA_EMAIL = 'casey.pro@hairintel.preview';
  const QA_PASSWORD_SHA256 = 'd716abbfa6f42388407a6e48e1e1ebaedfa3ecd5a25d2b906476f96901498ecf';
  const QA_USER = {
    id: 'qa-pro-preview-user',
    email: QA_EMAIL,
    role: 'authenticated',
    user_metadata: { first_name: 'Casey', last_name: 'QA', qa_preview: true }
  };
  const QA_KEY = 'hairintel_qa_preview_password';
  const state = { active: false };

  function allowedHost() {
    const host = String(window.location.hostname || '').toLowerCase();
    return host.endsWith('.vercel.app') && host !== 'hairintel-ai.vercel.app' && !host.includes('git-main-');
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(String(value || ''));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function writeQaState() {
    const now = new Date().toISOString();
    const profile = { email: QA_EMAIL, userId: QA_USER.id, savedAt: now, qaPreview: true };
    const sub = {
      plan: 'pro',
      status: 'trialing',
      billingProvider: 'qa_preview',
      qaPreview: true,
      updatedAt: now
    };
    localStorage.setItem('hairintel_profile_v1', JSON.stringify(profile));
    localStorage.setItem('hairintel_subscription_v1', JSON.stringify(sub));
    localStorage.setItem('hi_subscription', JSON.stringify(sub));
    localStorage.setItem('hairintel_customer_email', QA_EMAIL);
    if (window.HI && typeof window.HI.setSub === 'function') window.HI.setSub(sub);
  }

  function clearQaState() {
    state.active = false;
    sessionStorage.removeItem(QA_KEY);
    localStorage.removeItem('hairintel_profile_v1');
    localStorage.removeItem('hairintel_subscription_v1');
    localStorage.removeItem('hairintel_customer_email');
    localStorage.setItem('hi_subscription', JSON.stringify({ plan: 'free', status: 'inactive', updatedAt: new Date().toISOString() }));
  }

  async function activateWithPassword(password) {
    if (!allowedHost()) return false;
    const digest = await sha256(password);
    if (digest !== QA_PASSWORD_SHA256) return false;
    state.active = true;
    sessionStorage.setItem(QA_KEY, password);
    writeQaState();
    document.documentElement.classList.add('hi-qa-pro-preview');
    return true;
  }

  const qaReady = (async () => {
    if (!allowedHost()) return false;
    const storedPassword = sessionStorage.getItem(QA_KEY) || '';
    if (!storedPassword) return false;
    return activateWithPassword(storedPassword);
  })();

  window.__HAIRINTEL_QA_READY__ = qaReady;

  const fakeClient = {
    auth: {
      getUser: async () => ({ data: { user: QA_USER }, error: null }),
      getSession: async () => ({ data: { session: { access_token: 'qa-preview-only', user: QA_USER } }, error: null }),
      signOut: async () => { clearQaState(); return { error: null }; },
      onAuthStateChange: (callback) => {
        queueMicrotask(() => callback('SIGNED_IN', { access_token: 'qa-preview-only', user: QA_USER }));
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
      return QA_USER;
    }
    return originalInit();
  };

  window.HAIRI.signIn = async function ({ email, password }) {
    if (allowedHost() && String(email || '').trim().toLowerCase() === QA_EMAIL) {
      const activated = await activateWithPassword(password);
      if (!activated) throw new Error('Incorrect HairIntel QA password.');
      return { user: QA_USER, session: { access_token: 'qa-preview-only', user: QA_USER } };
    }
    return originalSignIn({ email, password });
  };

  window.HAIRI.refreshSubscription = async function (email) {
    await qaReady;
    if (state.active && String(email || '').toLowerCase() === QA_EMAIL) {
      writeQaState();
      return {
        plan: 'pro',
        status: 'trialing',
        active: true,
        billingProvider: 'qa_preview',
        qaPreview: true
      };
    }
    return originalRefreshSubscription(email);
  };

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.includes('/api/subscription-status')) {
      await qaReady;
      if (state.active) {
        const parsed = new URL(url, window.location.origin);
        if (String(parsed.searchParams.get('email') || '').toLowerCase() === QA_EMAIL) {
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
