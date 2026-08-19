(function () {
  const DELETE_QUERY = 'delete';
  const DELETE_VALUE = 'account';
  let observerTimer = null;

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
  }

  function currentSubscription() {
    return readJson('hairintel_subscription_v1') || readJson('hi_subscription') || {};
  }

  async function getSession() {
    if (!window.HAIRI?.ensureClient) return null;
    const client = await window.HAIRI.ensureClient();
    if (!client?.auth) return null;
    const { data } = await client.auth.getSession();
    return data?.session || null;
  }

  function isGooglePlaySubscription() {
    const sub = currentSubscription();
    return sub?.billingProvider === 'google_play' || String(sub?.latestEventType || '').startsWith('google_play:');
  }

  function clearHairIntelLocalData() {
    const remove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('hairintel_') || key.startsWith('hi_'))) remove.push(key);
    }
    remove.forEach(key => localStorage.removeItem(key));

    const sessionRemove = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('hairintel_') || key.startsWith('hi_'))) sessionRemove.push(key);
    }
    sessionRemove.forEach(key => sessionStorage.removeItem(key));
  }

  function ensureStyles() {
    if (document.getElementById('hi-delete-account-styles')) return;
    const style = document.createElement('style');
    style.id = 'hi-delete-account-styles';
    style.textContent = `
      .hi-delete-account-btn{border:1px solid rgba(214,99,99,.48)!important;background:rgba(122,28,38,.18)!important;color:#ffd9d9!important}
      .hi-delete-overlay{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px;background:rgba(8,4,6,.82);backdrop-filter:blur(10px)}
      .hi-delete-card{width:min(94vw,600px);max-height:88vh;overflow:auto;border:1px solid rgba(222,172,132,.26);border-radius:24px;padding:30px;background:linear-gradient(150deg,#351b27,#1a0e14);box-shadow:0 34px 100px rgba(0,0,0,.7);color:#fff8ef}
      .hi-delete-card h2{margin:0 0 10px;font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;color:#fff8ef}
      .hi-delete-card p,.hi-delete-card li{color:rgba(255,248,239,.72);line-height:1.6;font-size:13px}
      .hi-delete-warning{margin:18px 0;padding:15px 16px;border:1px solid rgba(244,201,93,.28);border-radius:14px;background:rgba(244,201,93,.07)}
      .hi-delete-confirm{display:grid;gap:8px;margin-top:18px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,248,239,.7)}
      .hi-delete-confirm input{height:46px;border-radius:12px;border:1px solid rgba(216,178,140,.3);background:rgba(255,255,255,.07);color:#fff;padding:0 13px;font-size:15px;text-transform:none;letter-spacing:0}
      .hi-delete-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:20px}
      .hi-delete-actions button{min-height:43px;border-radius:999px;padding:0 17px;font-weight:900;cursor:pointer}
      .hi-delete-cancel,.hi-delete-manage{border:1px solid rgba(216,178,140,.28);background:transparent;color:#fff8ef}
      .hi-delete-final{border:1px solid rgba(255,140,140,.5);background:#8f2f3c;color:white}
      .hi-delete-final:disabled{opacity:.45;cursor:not-allowed}
    `;
    document.head.appendChild(style);
  }

  function closeDeleteDialog() {
    document.getElementById('hi-delete-overlay')?.remove();
    const url = new URL(window.location.href);
    if (url.searchParams.get(DELETE_QUERY) === DELETE_VALUE) {
      url.searchParams.delete(DELETE_QUERY);
      history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  }

  async function manageSubscription() {
    if (isGooglePlaySubscription() && window.HairIntelPlayBilling?.manageSubscription) {
      await window.HairIntelPlayBilling.manageSubscription();
      return;
    }

    const session = await getSession();
    const email = session?.user?.email;
    if (!email) throw new Error('Sign in before opening subscription management.');

    const response = await fetch('/api/create-billing-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, returnUrl: window.location.href })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) throw new Error(data.error || 'Subscription management is unavailable.');
    window.location.href = data.url;
  }

  async function deleteAccount(button) {
    const session = await getSession();
    if (!session?.access_token) throw new Error('Your HairIntel session is no longer valid. Sign in again.');

    button.disabled = true;
    button.textContent = 'Deleting…';

    try {
      const response = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.deleted) throw new Error(data.error || 'Account deletion failed.');

      if (data.googlePlayCancellationRequired && window.HairIntelPlayBilling?.manageSubscription) {
        try { await window.HairIntelPlayBilling.manageSubscription(); }
        catch (error) { console.warn('[HairIntel] Could not open Play subscription center after deletion:', error); }
      }

      clearHairIntelLocalData();
      try {
        const client = await window.HAIRI?.ensureClient?.();
        await client?.auth?.signOut?.();
      } catch {}

      alert('Your HairIntel account and stored account data have been deleted. If you purchased through Google Play, confirm cancellation in Google Play Subscriptions to stop future renewal.');
      window.location.replace('/');
    } finally {
      button.disabled = false;
      button.textContent = 'Permanently Delete Account';
    }
  }

  async function openDeleteDialog() {
    ensureStyles();
    document.getElementById('hi-delete-overlay')?.remove();

    const session = await getSession().catch(() => null);
    if (!session?.user?.email) {
      const signIn = document.querySelector('.pv2-login-top,[data-auth-action="signin"]');
      if (signIn) signIn.click();
      return;
    }

    const googlePlay = isGooglePlaySubscription();
    const overlay = document.createElement('div');
    overlay.id = 'hi-delete-overlay';
    overlay.className = 'hi-delete-overlay';
    overlay.innerHTML = `
      <section class="hi-delete-card" role="dialog" aria-modal="true" aria-labelledby="hi-delete-title">
        <h2 id="hi-delete-title">Delete HairIntel account</h2>
        <p>This permanently deletes the signed-in HairIntel authentication account and the account/subscription records HairIntel stores for it. Consultation data saved only in this browser or app will also be cleared from this device.</p>
        <div class="hi-delete-warning">
          <strong>Subscription billing</strong>
          <p>${googlePlay
            ? 'Your HairIntel subscription was purchased through Google Play. Account deletion and Google Play billing are separate. Use Google Play subscription management to stop renewal; HairIntel will open it for you after deletion as well.'
            : 'If you have a web subscription, HairIntel will attempt to cancel its Stripe subscription before deleting your account. You can also open subscription management first.'}</p>
        </div>
        <p>This action cannot be undone. Type <strong>DELETE</strong> to confirm.</p>
        <label class="hi-delete-confirm">Confirmation
          <input id="hi-delete-confirm-input" autocomplete="off" placeholder="Type DELETE">
        </label>
        <div class="hi-delete-actions">
          <button class="hi-delete-manage" id="hi-delete-manage" type="button">Manage Subscription</button>
          <button class="hi-delete-cancel" id="hi-delete-cancel" type="button">Keep Account</button>
          <button class="hi-delete-final" id="hi-delete-final" type="button" disabled>Permanently Delete Account</button>
        </div>
      </section>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#hi-delete-confirm-input');
    const finalButton = overlay.querySelector('#hi-delete-final');
    input.addEventListener('input', () => { finalButton.disabled = input.value.trim() !== 'DELETE'; });
    overlay.querySelector('#hi-delete-cancel').onclick = closeDeleteDialog;
    overlay.querySelector('#hi-delete-manage').onclick = () => manageSubscription().catch(error => alert(error?.message || 'Could not open subscription management.'));
    finalButton.onclick = () => deleteAccount(finalButton).catch(error => alert(error?.message || 'Account deletion failed.'));
    input.focus();
  }

  function addAccountDeleteButton() {
    const modal = document.getElementById('hi-auth-modal');
    if (!modal || modal.querySelector('#hi-delete-account')) return;
    const actions = modal.querySelector('.hi-auth-actions');
    const signOut = modal.querySelector('#hi-sign-out');
    if (!actions || !signOut) return;

    const button = document.createElement('button');
    button.id = 'hi-delete-account';
    button.type = 'button';
    button.className = 'hi-auth-chip hi-delete-account-btn';
    button.textContent = 'Delete Account';
    button.onclick = () => {
      modal.remove();
      openDeleteDialog();
    };
    actions.insertBefore(button, signOut);
  }

  function requestedFromWeb() {
    return new URLSearchParams(window.location.search).get(DELETE_QUERY) === DELETE_VALUE;
  }

  document.addEventListener('hairintel:auth-state', event => {
    if (event?.detail?.authenticated && requestedFromWeb()) setTimeout(openDeleteDialog, 120);
  });

  document.addEventListener('DOMContentLoaded', () => {
    ensureStyles();
    const observer = new MutationObserver(() => {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(addAccountDeleteButton, 60);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (requestedFromWeb()) {
      setTimeout(async () => {
        const session = await getSession().catch(() => null);
        if (session?.user?.email) openDeleteDialog();
        else document.querySelector('.pv2-login-top,[data-auth-action="signin"]')?.click();
      }, 500);
    }
  });
})();
