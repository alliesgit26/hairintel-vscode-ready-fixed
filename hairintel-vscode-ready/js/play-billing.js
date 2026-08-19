(function () {
  const PRODUCT_IDS = {
    starter: 'hairintel_starter_monthly',
    pro: 'hairintel_pro_monthly',
    studio: 'hairintel_studio_monthly'
  };
  const PRODUCT_TO_PLAN = Object.fromEntries(Object.entries(PRODUCT_IDS).map(([plan, id]) => [id, plan]));
  let pluginProxy = null;
  let productPromise = null;
  let observerTimer = null;

  function isNativeAndroid() {
    try {
      return window.Capacitor?.getPlatform?.() === 'android' && window.Capacitor?.isNativePlatform?.() !== false;
    } catch {
      return false;
    }
  }

  function getPlugin() {
    if (!isNativeAndroid()) return null;
    if (pluginProxy) return pluginProxy;
    try {
      pluginProxy = window.Capacitor?.registerPlugin
        ? window.Capacitor.registerPlugin('PlayBilling')
        : window.Capacitor?.Plugins?.PlayBilling;
    } catch {
      pluginProxy = window.Capacitor?.Plugins?.PlayBilling || null;
    }
    return pluginProxy;
  }

  function periodLabel(period) {
    const value = String(period || '').toUpperCase();
    if (value === 'P1M') return ' / month';
    if (value === 'P1Y') return ' / year';
    if (value === 'P1W') return ' / week';
    if (value === 'P3M') return ' / 3 months';
    if (value === 'P6M') return ' / 6 months';
    return value ? ` / ${value}` : '';
  }

  async function getSession() {
    if (!window.HAIRI?.ensureClient) return null;
    const client = await window.HAIRI.ensureClient();
    if (!client?.auth) return null;
    const { data } = await client.auth.getSession();
    return data?.session || null;
  }

  async function getProducts(force = false) {
    const plugin = getPlugin();
    if (!plugin) return [];
    if (!force && productPromise) return productPromise;
    productPromise = plugin.getProducts({ productIds: Object.values(PRODUCT_IDS) })
      .then(result => Array.isArray(result?.products) ? result.products : [])
      .catch(error => {
        console.warn('[HairIntel Play Billing] Product query failed:', error?.message || error);
        return [];
      });
    return productPromise;
  }

  async function paintPlayPricing() {
    if (!isNativeAndroid()) return;
    document.documentElement.classList.add('hi-google-play-billing');

    const products = await getProducts();
    const byId = Object.fromEntries(products.map(product => [product.productId, product]));

    Object.entries(PRODUCT_IDS).forEach(([plan, productId]) => {
      const product = byId[productId];
      const price = product?.available ? product.formattedPrice : 'Set up in Google Play';
      document.querySelectorAll(`[data-price-value="${plan}"]`).forEach(element => {
        if (element.textContent !== price) element.textContent = price;
      });
      const interval = product?.available ? periodLabel(product.billingPeriod) : '';
      document.querySelectorAll(`[data-price-interval="${plan}"]`).forEach(element => {
        if (element.textContent !== interval) element.textContent = interval;
      });
      document.querySelectorAll(`[data-plan="${plan}"], [data-public-plan="${plan}"]`).forEach(button => {
        button.disabled = !product?.available;
        button.title = product?.available
          ? `Subscribe through Google Play${product.hasFreeTrial ? ' — trial offer available when eligible' : ''}`
          : 'Create and activate this subscription in Google Play Console first.';
      });
    });
  }

  function setLocalEntitlement(result, email) {
    const record = {
      plan: result.plan || 'free',
      status: result.status || (result.active ? 'active' : 'inactive'),
      billingProvider: 'google_play',
      googlePlayProductId: result.productId || '',
      currentPeriodEnd: result.currentPeriodEnd || null,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('hairintel_subscription_v1', JSON.stringify(record));
    localStorage.setItem('hi_subscription', JSON.stringify(record));
    if (email) localStorage.setItem('hairintel_customer_email', email);
  }

  async function verifyPurchase(purchase) {
    if (!purchase?.purchaseToken || !purchase?.productId) throw new Error('Google Play did not return a complete purchase token.');
    const session = await getSession();
    if (!session?.access_token || !session?.user?.email) throw new Error('Sign in to HairIntel before restoring or purchasing a plan.');

    const response = await fetch('/api/google-play-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        purchaseToken: purchase.purchaseToken,
        productId: purchase.productId
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Google Play purchase verification failed.');
    if (data.active) setLocalEntitlement(data, session.user.email);
    return data;
  }

  async function purchase(plan) {
    const plugin = getPlugin();
    const productId = PRODUCT_IDS[plan];
    if (!plugin || !productId) throw new Error('Google Play Billing is not available for this plan.');

    const session = await getSession();
    if (!session?.user?.email) {
      sessionStorage.setItem('hairintel_pending_play_plan', plan);
      const signIn = document.querySelector('[data-auth-action="signin"], .pv2-login-top');
      if (signIn) {
        setTimeout(() => signIn.click(), 0);
        return { waitingForSignIn: true };
      }
      throw new Error('Sign in to HairIntel before purchasing a plan.');
    }

    const purchaseResult = await plugin.purchase({ productId });
    if (purchaseResult?.cancelled) return { cancelled: true };
    if (Number(purchaseResult?.purchaseState) !== 1) {
      alert('Google Play is still processing this purchase. HairIntel will unlock after payment is confirmed.');
      return { pending: true };
    }

    const verified = await verifyPurchase(purchaseResult);
    if (!verified.active) {
      throw new Error('Google Play has not marked this subscription active yet.');
    }

    alert(`${String(verified.plan || plan).toUpperCase()} is active through Google Play.`);
    window.location.reload();
    return verified;
  }

  async function restorePurchases() {
    const plugin = getPlugin();
    if (!plugin) throw new Error('Google Play Billing is not available.');
    const session = await getSession();
    if (!session?.user?.email) throw new Error('Sign in to HairIntel before restoring purchases.');

    const result = await plugin.restorePurchases();
    const purchases = Array.isArray(result?.purchases) ? result.purchases : [];
    const owned = purchases.filter(p => Number(p.purchaseState) === 1 && PRODUCT_TO_PLAN[p.productId]);
    if (!owned.length) {
      alert('No active HairIntel subscription was found on this Google Play account.');
      return null;
    }

    let restored = null;
    for (const purchase of owned) {
      const verified = await verifyPurchase(purchase);
      if (verified.active) {
        restored = verified;
        break;
      }
    }
    if (!restored) throw new Error('Google Play purchases were found, but none currently grant HairIntel access.');

    alert(`${String(restored.plan).toUpperCase()} restored from Google Play.`);
    window.location.reload();
    return restored;
  }

  async function manageSubscription() {
    const plugin = getPlugin();
    if (!plugin?.manageSubscriptions) throw new Error('Google Play subscription management is unavailable.');
    const sub = (() => {
      try { return JSON.parse(localStorage.getItem('hairintel_subscription_v1') || 'null'); }
      catch { return null; }
    })();
    await plugin.manageSubscriptions({ productId: sub?.googlePlayProductId || PRODUCT_IDS.pro });
  }

  function signedInLocally() {
    try {
      const profile = JSON.parse(localStorage.getItem('hairintel_profile_v1') || 'null');
      return Boolean(profile?.email);
    } catch {
      return false;
    }
  }

  async function resumePendingPurchase() {
    if (!isNativeAndroid()) return;
    const plan = sessionStorage.getItem('hairintel_pending_play_plan');
    if (!plan) return;
    const session = await getSession().catch(() => null);
    if (!session?.user?.email) return;
    sessionStorage.removeItem('hairintel_pending_play_plan');
    try { await purchase(plan); }
    catch (error) { alert(error?.message || 'Google Play purchase could not start.'); }
  }

  function addRestoreButton() {
    if (!isNativeAndroid()) return;
    const modal = document.getElementById('hi-auth-modal');
    if (!modal || modal.querySelector('#hi-restore-play')) return;
    const actions = modal.querySelector('.hi-auth-actions');
    if (!actions) return;
    const button = document.createElement('button');
    button.className = 'hi-auth-chip';
    button.type = 'button';
    button.id = 'hi-restore-play';
    button.textContent = 'Restore Google Play Purchase';
    actions.prepend(button);
  }

  document.addEventListener('click', function (event) {
    if (!isNativeAndroid()) return;
    const target = event.target.closest('button, a');
    if (!target) return;

    const publicPlan = target.dataset.publicPlan;
    const modalPlan = target.dataset.plan;
    const plan = publicPlan || modalPlan;
    if (plan && PRODUCT_IDS[plan]) {
      event.preventDefault();
      event.stopImmediatePropagation();
      purchase(plan).catch(error => alert(error?.message || 'Google Play purchase could not start.'));
      return;
    }

    if (target.id === 'hi-restore-play') {
      event.preventDefault();
      event.stopImmediatePropagation();
      restorePurchases().catch(error => alert(error?.message || 'Could not restore Google Play purchases.'));
      return;
    }

    const text = String(target.textContent || '').trim().toLowerCase();
    if (target.id === 'hi-manage-billing' || text.includes('manage billing')) {
      const current = (() => {
        try { return JSON.parse(localStorage.getItem('hairintel_subscription_v1') || 'null'); }
        catch { return null; }
      })();
      if (current?.billingProvider === 'google_play') {
        event.preventDefault();
        event.stopImmediatePropagation();
        manageSubscription().catch(error => alert(error?.message || 'Could not open Google Play subscriptions.'));
      }
    }
  }, true);

  document.addEventListener('hairintel:auth-state', function (event) {
    if (event?.detail?.authenticated) setTimeout(resumePendingPurchase, 150);
  });

  document.addEventListener('DOMContentLoaded', function () {
    if (!isNativeAndroid()) return;
    paintPlayPricing();
    resumePendingPurchase();
    const observer = new MutationObserver(() => {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(() => {
        addRestoreButton();
        paintPlayPricing();
      }, 80);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  window.HairIntelPlayBilling = {
    isNativeAndroid,
    getProducts,
    paintPlayPricing,
    purchase,
    restorePurchases,
    manageSubscription
  };
})();
