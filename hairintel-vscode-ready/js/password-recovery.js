(function installHairIntelPasswordRecovery() {
  const RECOVERY_STYLE_ID = 'hi-password-recovery-styles';
  const RECOVERY_MODAL_ID = 'hi-password-recovery-modal';

  async function loadConfig() {
    window.ENV = window.ENV || {};
    if (window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY) return window.ENV;
    const response = await fetch('/api/config', { cache: 'no-store', headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.SUPABASE_URL || !data.SUPABASE_ANON_KEY) {
      throw new Error('HairIntel could not load its account configuration.');
    }
    window.ENV.SUPABASE_URL = data.SUPABASE_URL;
    window.ENV.SUPABASE_ANON_KEY = data.SUPABASE_ANON_KEY;
    return window.ENV;
  }

  function authUrl(path) {
    return `${String(window.ENV.SUPABASE_URL || '').replace(/\/$/, '')}${path}`;
  }

  function recoveryReturnUrl() {
    return 'https://hairintel-ai.vercel.app/';
  }

  function addStyles() {
    if (document.getElementById(RECOVERY_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = RECOVERY_STYLE_ID;
    style.textContent = `
      .hi-forgot-password {
        margin-top: 4px;
        border: 0;
        background: transparent;
        color: #d8b47a;
        padding: 4px 0;
        text-align: left;
        font: 700 12px/1.3 Inter, Arial, sans-serif;
        cursor: pointer;
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .hi-recovery-modal {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(10, 5, 9, .82);
        backdrop-filter: blur(10px);
      }
      .hi-recovery-card {
        width: min(94vw, 520px);
        border-radius: 24px;
        padding: 28px;
        border: 1px solid rgba(216, 178, 140, .28);
        background: linear-gradient(145deg, #4a241d, #2a1712);
        color: #fff8ec;
        box-shadow: 0 36px 100px rgba(0, 0, 0, .62);
        font-family: Inter, Arial, sans-serif;
      }
      .hi-recovery-card h2 {
        margin: 0 0 8px;
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-size: 34px;
      }
      .hi-recovery-card p {
        margin: 0 0 18px;
        color: rgba(255, 248, 236, .72);
        line-height: 1.55;
      }
      .hi-recovery-card label {
        display: grid;
        gap: 7px;
        margin-top: 12px;
        color: rgba(255, 248, 236, .72);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .hi-recovery-card input {
        height: 48px;
        border-radius: 13px;
        border: 1px solid rgba(216, 178, 140, .28);
        background: rgba(255,255,255,.07);
        color: #fff8ec;
        padding: 0 14px;
        font-size: 16px;
        outline: none;
      }
      .hi-recovery-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
        flex-wrap: wrap;
      }
      .hi-recovery-actions button {
        min-height: 44px;
        border-radius: 999px;
        padding: 0 16px;
        font-weight: 800;
        cursor: pointer;
      }
      .hi-recovery-cancel {
        border: 1px solid rgba(216,178,140,.28);
        background: transparent;
        color: #fff8ec;
      }
      .hi-recovery-save {
        border: 1px solid rgba(184,115,51,.66);
        background: linear-gradient(135deg, #fff8ec, #8b4f2f);
        color: #2a1712;
      }
      .hi-recovery-status {
        min-height: 18px;
        margin-top: 12px;
        color: #e9c98f;
        font-size: 12px;
        line-height: 1.4;
      }
    `;
    document.head.appendChild(style);
  }

  async function sendResetEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) throw new Error('Enter the email address for your HairIntel account first.');
    await loadConfig();

    const redirectTo = encodeURIComponent(recoveryReturnUrl());
    const response = await fetch(authUrl(`/auth/v1/recover?redirect_to=${redirectTo}`), {
      method: 'POST',
      headers: {
        apikey: window.ENV.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: normalized })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || 'Could not send the password-reset email.');
    return true;
  }

  function parseRecoveryHash() {
    const raw = String(window.location.hash || '').replace(/^#/, '');
    if (!raw) return null;
    const params = new URLSearchParams(raw);
    const type = params.get('type');
    const accessToken = params.get('access_token');
    if (type !== 'recovery' || !accessToken) return null;
    return { accessToken, refreshToken: params.get('refresh_token') || null };
  }

  function openRecoveryModal(accessToken) {
    addStyles();
    document.getElementById(RECOVERY_MODAL_ID)?.remove();

    const modal = document.createElement('div');
    modal.id = RECOVERY_MODAL_ID;
    modal.className = 'hi-recovery-modal';
    modal.innerHTML = `
      <div class="hi-recovery-card" role="dialog" aria-modal="true" aria-labelledby="hi-recovery-title">
        <h2 id="hi-recovery-title">Choose a new password</h2>
        <p>Create a new password for your HairIntel account. Use at least 8 characters.</p>
        <label>New password<input id="hi-recovery-password" type="password" autocomplete="new-password" minlength="8"></label>
        <label>Confirm password<input id="hi-recovery-confirm" type="password" autocomplete="new-password" minlength="8"></label>
        <div class="hi-recovery-status" id="hi-recovery-status"></div>
        <div class="hi-recovery-actions">
          <button class="hi-recovery-cancel" type="button" id="hi-recovery-cancel">Cancel</button>
          <button class="hi-recovery-save" type="button" id="hi-recovery-save">Save New Password</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const status = modal.querySelector('#hi-recovery-status');
    modal.querySelector('#hi-recovery-cancel').onclick = () => {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      modal.remove();
    };
    modal.querySelector('#hi-recovery-save').onclick = async function () {
      const password = String(modal.querySelector('#hi-recovery-password').value || '');
      const confirm = String(modal.querySelector('#hi-recovery-confirm').value || '');
      if (password.length < 8) {
        status.textContent = 'Use at least 8 characters.';
        return;
      }
      if (password !== confirm) {
        status.textContent = 'The two passwords do not match.';
        return;
      }

      this.disabled = true;
      status.textContent = 'Updating your password…';
      try {
        await loadConfig();
        const response = await fetch(authUrl('/auth/v1/user'), {
          method: 'PUT',
          headers: {
            apikey: window.ENV.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || 'Could not update the password.');

        history.replaceState(null, '', window.location.pathname + window.location.search);
        status.textContent = 'Password updated. You can sign in now.';
        setTimeout(() => {
          modal.remove();
          document.querySelector('[data-auth-action="signin"]')?.click();
        }, 900);
      } catch (error) {
        status.textContent = error?.message || 'Could not update the password.';
        this.disabled = false;
      }
    };
  }

  function enhanceSignInModal() {
    const modal = document.getElementById('hi-auth-modal');
    if (!modal || !modal.querySelector('#hi-password') || modal.querySelector('.hi-forgot-password')) return;
    addStyles();

    const passwordInput = modal.querySelector('#hi-password');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hi-forgot-password';
    button.textContent = 'Forgot password?';
    passwordInput.closest('label')?.insertAdjacentElement('afterend', button);

    button.onclick = async function () {
      const email = String(modal.querySelector('#hi-email')?.value || '').trim();
      this.disabled = true;
      const original = this.textContent;
      this.textContent = 'Sending reset email…';
      try {
        await sendResetEmail(email);
        alert('Password reset email sent. Open the email from Supabase/HairIntel and tap the reset link.');
        this.textContent = 'Reset email sent';
      } catch (error) {
        alert(error?.message || 'Could not send the password-reset email.');
        this.textContent = original;
        this.disabled = false;
      }
    };
  }

  const observer = new MutationObserver(enhanceSignInModal);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', enhanceSignInModal);
  enhanceSignInModal();

  const recovery = parseRecoveryHash();
  if (recovery) {
    const show = () => openRecoveryModal(recovery.accessToken);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true });
    else show();
  }
})();
