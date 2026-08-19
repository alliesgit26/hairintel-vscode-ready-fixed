(function () {
  const PRODUCT_IDS = {
    starter: 'hairintel_starter_monthly',
    pro: 'hairintel_pro_monthly',
    studio: 'hairintel_studio_monthly'
  };
  let timer = null;

  function isNativeAndroid() {
    try {
      return window.Capacitor?.getPlatform?.() === 'android' && window.Capacitor?.isNativePlatform?.() !== false;
    } catch {
      return false;
    }
  }

  function mergeLocalEntitlement(data) {
    const plan = String(data?.plan || 'free').toLowerCase();
    const provider = data?.billingProvider || null;
    const patch = {
      plan,
      status: data?.status || 'inactive',
      billingProvider: provider,
      latestEventType: data?.latestEventType || null,
      currentPeriodEnd: data?.currentPeriodEnd || null,
      updatedAt: new Date().toISOString()
    };

    if (provider === 'google_play' && PRODUCT_IDS[plan]) {
      patch.googlePlayProductId = PRODUCT_IDS[plan];
    }
    if (provider === 'stripe') {
      patch.stripeCustomerId = data?.stripeCustomerId || null;
      patch.stripeSubscriptionId = data?.stripeSubscriptionId || null;
    }

    ['hairintel_subscription_v1', 'hi_subscription'].forEach(key => {
      let existing = {};
      try { existing = JSON.parse(localStorage.getItem(key) || '{}') || {}; }
      catch {}
      localStorage.setItem(key, JSON.stringify({ ...existing, ...patch }));
    });
  }

  async function syncEntitlement() {
    if (!isNativeAndroid() || !window.HAIRI?.ensureClient) return;
    try {
      const client = await window.HAIRI.ensureClient();
      const { data: sessionData } = await client.auth.getSession();
      const email = sessionData?.session?.user?.email;
      if (!email) return;

      const response = await fetch('/api/subscription-status?email=' + encodeURIComponent(email));
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) return;
      mergeLocalEntitlement(data);
    } catch (error) {
      console.warn('[HairIntel Play Billing] Entitlement sync warning:', error?.message || error);
    }
  }

  function queueSync(delay = 250) {
    clearTimeout(timer);
    timer = setTimeout(syncEntitlement, delay);
  }

  document.addEventListener('hairintel:auth-state', event => {
    if (event?.detail?.authenticated) {
      queueSync(250);
      setTimeout(syncEntitlement, 1100);
    }
  });

  document.addEventListener('DOMContentLoaded', () => queueSync(650));
  window.addEventListener('load', () => queueSync(500));
  window.addEventListener('focus', () => queueSync(300));

  window.HairIntelPlayEntitlementSync = { sync: syncEntitlement };
})();
