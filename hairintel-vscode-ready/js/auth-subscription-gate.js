(function () {
  const PROFILE_KEY = "hairintel_profile_v1";
  const SUB_KEY = "hairintel_subscription_v1";
  const CONSULT_URL = "hairintel/index.html";

  function getProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); }
    catch { return null; }
  }

  function setProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  function getSub() {
    try { return JSON.parse(localStorage.getItem(SUB_KEY) || "null"); }
    catch { return null; }
  }

  function setSub(sub) {
    localStorage.setItem(SUB_KEY, JSON.stringify(sub));
  }

  function isSubscribed() {
    const sub = getSub();
    if (!sub) return false;
    return ["active", "trialing", "trial"].includes(String(sub.status || "").toLowerCase());
  }

  function ensureStyles() {
    if (document.getElementById("hi-auth-gate-styles")) return;

    const style = document.createElement("style");
    style.id = "hi-auth-gate-styles";
    style.textContent = `
      .topbar {
        grid-template-columns: 240px minmax(320px, 1fr) minmax(520px, auto) !important;
      }

      .actions {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        flex-wrap: nowrap !important;
        min-width: 520px !important;
        overflow: visible !important;
      }

      .hi-auth-controls {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: nowrap;
        flex: 0 0 auto;
      }

      .hi-auth-chip,
      .hi-auth-primary {
        border-radius: 999px;
        padding: 10px 15px;
        font-weight: 900;
        cursor: pointer;
        font-size: 13px;
        white-space: nowrap;
        min-height: 42px;
      }

      .actions .export {
        flex: 0 0 auto !important;
        padding: 10px 16px !important;
        font-size: 13px !important;
        max-width: 180px !important;
        min-height: 42px !important;
      }

      .actions .menu {
        flex: 0 0 44px !important;
        width: 44px !important;
        min-height: 42px !important;
        padding: 10px 0 !important;
      }

      @media (max-width: 1240px) {
        .topbar {
          grid-template-columns: 1fr !important;
        }

        .actions {
          min-width: 0 !important;
          justify-content: flex-start !important;
          flex-wrap: wrap !important;
        }

        .hi-auth-controls {
          flex-wrap: wrap;
        }
      }

      .hi-auth-chip {
        border: 1px solid rgba(206,183,171,.32);
        background: rgba(18,11,6,.42);
        color: #F7EFE9;
      }

      .hi-auth-primary {
        border: 1px solid rgba(244,201,93,.66);
        background: linear-gradient(135deg, #F7DE86, #B8862E);
        color: #120B06;
      }

      .hi-auth-banner {
        grid-column: 1 / -1;
        border: 1px solid rgba(244,201,93,.32);
        background: linear-gradient(135deg, rgba(244,201,93,.09), rgba(18,11,6,.72));
        color: rgba(247,239,233,.82);
        border-radius: 16px;
        padding: 16px 18px;
        margin-bottom: 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .hi-auth-banner strong {
        color: #F4C95D;
      }

      .hi-auth-banner p {
        margin: 4px 0 0;
        color: rgba(247,239,233,.68);
        font-size: 13px;
      }

      .hi-auth-modal {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: none;
        place-items: center;
      }

      .hi-auth-modal.show {
        display: grid;
      }

      .hi-auth-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,.74);
        backdrop-filter: blur(8px);
      }

      .hi-auth-card {
        position: relative;
        width: min(94vw, 560px);
        border-radius: 26px;
        padding: 30px;
        background: linear-gradient(145deg, rgba(30,25,22,.98), rgba(18,11,6,.98));
        border: 1px solid rgba(206,183,171,.28);
        box-shadow: 0 40px 110px rgba(0,0,0,.70);
        color: #F7EFE9;
      }

      .hi-auth-card h2 {
        margin: 0 0 10px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 34px;
      }

      .hi-auth-card p {
        margin: 0 0 18px;
        color: rgba(247,239,233,.70);
        line-height: 1.55;
      }

      .hi-auth-form {
        display: grid;
        gap: 12px;
      }

      .hi-auth-form label {
        display: grid;
        gap: 7px;
        color: rgba(247,239,233,.72);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 900;
      }

      .hi-auth-form input,
      .hi-auth-form select {
        height: 46px;
        border-radius: 14px;
        border: 1px solid rgba(206,183,171,.24);
        background: rgba(255,255,255,.07);
        color: #F7EFE9;
        padding: 0 14px;
        outline: none;
      }

      .hi-auth-form input:focus,
      .hi-auth-form select:focus {
        border-color: rgba(244,201,93,.72);
        box-shadow: 0 0 0 4px rgba(244,201,93,.12);
      }

      .hi-plan-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 14px;
      }

      .hi-plan {
        border: 1px solid rgba(206,183,171,.22);
        background: rgba(255,255,255,.045);
        border-radius: 18px;
        padding: 16px;
      }

      .hi-plan h3 {
        margin: 0 0 6px;
        color: #F4C95D;
      }

      .hi-plan p {
        margin: 0 0 12px;
        font-size: 13px;
      }

      .hi-auth-actions {
        margin-top: 18px;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        flex-wrap: wrap;
      }

      .hi-auth-close {
        position: absolute;
        top: 14px;
        right: 18px;
        border: 0;
        background: transparent;
        color: #CEB7AB;
        font-size: 30px;
        cursor: pointer;
      }

      @media (max-width: 720px) {
        .hi-plan-grid {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function openModal(type) {
    ensureStyles();

    let existing = document.getElementById("hi-auth-modal");
    if (existing) existing.remove();

    const profile = getProfile();
    const sub = getSub();

    const modal = document.createElement("div");
    modal.id = "hi-auth-modal";
    modal.className = "hi-auth-modal show";

    if (type === "signin") {
      modal.innerHTML = `
        <div class="hi-auth-backdrop"></div>
        <div class="hi-auth-card">
          <button class="hi-auth-close" type="button">×</button>
          <h2>Sign in to HairIntel</h2>
          <p>Create your stylist profile before using the consultation builder.</p>

          <div class="hi-auth-form">
            <label>Full Name
              <input id="hi-name" value="${profile?.name || ""}" placeholder="Your name">
            </label>
            <label>Email
              <input id="hi-email" value="${profile?.email || ""}" placeholder="you@example.com">
            </label>
            <label>Role
              <select id="hi-role">
                <option value="Stylist">Stylist</option>
                <option value="Salon Owner">Salon Owner</option>
                <option value="Assistant">Assistant</option>
              </select>
            </label>
          </div>

          <div class="hi-auth-actions">
            <button class="hi-auth-chip" type="button" id="hi-cancel">Cancel</button>
            <button class="hi-auth-primary" type="button" id="hi-save-profile">Save Profile</button>
          </div>
        </div>
      `;
    } else {
      const name = profile?.name || "Not signed in";
      const email = profile?.email || "Sign in first";
      const status = sub?.status || "No active subscription";

      modal.innerHTML = `
        <div class="hi-auth-backdrop"></div>
        <div class="hi-auth-card">
          <button class="hi-auth-close" type="button">×</button>
          <h2>Start Subscription</h2>
          <p>Signed in as: <strong>${name}</strong><br>Email: ${email}<br>Status: <strong>${status}</strong></p>

          <div class="hi-plan-grid">
            <div class="hi-plan">
              <h3>Starter</h3>
              <p>7-day trial. Basic consultation reports and dashboard access.</p>
              <button class="hi-auth-primary" type="button" data-plan="starter">Start Starter Trial</button>
            </div>

            <div class="hi-plan">
              <h3>Pro</h3>
              <p>Advanced consultation workflow, saved reports, and pro tools.</p>
              <button class="hi-auth-primary" type="button" data-plan="pro">Start Pro Trial</button>
            </div>
          </div>

          <div class="hi-auth-actions">
            <button class="hi-auth-chip" type="button" id="hi-manage-billing">Manage Billing</button>
            <button class="hi-auth-chip" type="button" id="hi-cancel">Close</button>
          </div>
        </div>
      `;
    }

    document.body.appendChild(modal);

    modal.querySelector(".hi-auth-close").onclick = closeModal;
    modal.querySelector(".hi-auth-backdrop").onclick = closeModal;
    modal.querySelector("#hi-cancel") && (modal.querySelector("#hi-cancel").onclick = closeModal);

    const saveBtn = modal.querySelector("#hi-save-profile");
    if (saveBtn) {
      saveBtn.onclick = function () {
        const name = document.getElementById("hi-name").value.trim();
        const email = document.getElementById("hi-email").value.trim();
        const role = document.getElementById("hi-role").value;

        if (!name || !email || !email.includes("@")) {
          alert("Enter a valid name and email.");
          return;
        }

        setProfile({ name, email, role, savedAt: new Date().toISOString() });
        closeModal();
        renderControls();
        openModal("subscription");
      };
    }

    modal.querySelectorAll("[data-plan]").forEach((btn) => {
      btn.onclick = function () {
        startCheckout(btn.dataset.plan);
      };
    });

    const manage = modal.querySelector("#hi-manage-billing");
    if (manage) manage.onclick = manageBilling;
  }

  function closeModal() {
    const modal = document.getElementById("hi-auth-modal");
    if (modal) modal.remove();
  }

  async function startCheckout(plan) {
    const profile = getProfile();

    if (!profile || !profile.email) {
      openModal("signin");
      return;
    }

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          email: profile.email,
          name: profile.name,
          successUrl: window.location.href + "?checkout=success",
          cancelUrl: window.location.href + "?checkout=cancel"
        })
      });

      const data = await res.json().catch(() => ({}));

      const url = data.url || data.checkoutUrl || data.sessionUrl;

      if (url) {
        window.location.href = url;
        return;
      }

      alert("Stripe checkout did not return a URL. Check your Stripe API route/environment variables.");
    } catch (err) {
      alert("Could not start checkout. Check Stripe API route and Vercel environment variables.");
      console.error(err);
    }
  }

  async function manageBilling() {
    const profile = getProfile();

    if (!profile || !profile.email) {
      openModal("signin");
      return;
    }

    try {
      const res = await fetch("/api/create-billing-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile.email,
          returnUrl: window.location.href
        })
      });

      const data = await res.json().catch(() => ({}));
      const url = data.url || data.portalUrl;

      if (url) {
        window.location.href = url;
        return;
      }

      alert("Billing portal did not return a URL. Check Stripe billing portal settings.");
    } catch (err) {
      alert("Could not open billing portal. Check Stripe API route and Vercel environment variables.");
      console.error(err);
    }
  }

  async function checkSubscription() {
    const profile = getProfile();
    if (!profile?.email) return;

    try {
      const res = await fetch("/api/subscription-status?email=" + encodeURIComponent(profile.email));
      const data = await res.json().catch(() => null);

      if (data && (data.status || data.subscriptionStatus)) {
        setSub({
          status: data.status || data.subscriptionStatus,
          plan: data.plan || data.priceId || "",
          checkedAt: new Date().toISOString()
        });
      }
    } catch {
      // Do not break homepage if subscription-status route is not ready.
    }
  }

  function gateConsultation(e) {
    const target = e.target.closest("[data-action], button, a");
    if (!target) return;

    const text = (target.textContent || "").toLowerCase();
    const action = target.dataset.action || "";

    const wantsBuilder =
      action === "consultations" ||
      action === "book" ||
      text.includes("start consultation") ||
      text.includes("back to consultations");

    if (!wantsBuilder) return;

    const profile = getProfile();

    if (!profile) {
      e.preventDefault();
      e.stopPropagation();
      openModal("signin");
      return;
    }

    if (!isSubscribed()) {
      e.preventDefault();
      e.stopPropagation();
      openModal("subscription");
      return;
    }

    window.location.href = CONSULT_URL;
  }

  function renderControls() {
    ensureStyles();

    let actions = document.querySelector(".actions");
    if (!actions) return;

    let old = document.getElementById("hi-auth-controls");
    if (old) old.remove();

    const profile = getProfile();
    const sub = getSub();

    const wrap = document.createElement("div");
    wrap.id = "hi-auth-controls";
    wrap.className = "hi-auth-controls";

    wrap.innerHTML = `
      <button class="hi-auth-chip" type="button" id="hi-signin-btn">Sign In</button>
      <button class="hi-auth-primary" type="button" id="hi-sub-btn">Start Subscription</button>
    `;

    actions.prepend(wrap);

    document.getElementById("hi-signin-btn").onclick = () => openModal("signin");
    document.getElementById("hi-sub-btn").onclick = () => openModal("subscription");

    renderBanner(profile, sub);
  }

  function renderBanner(profile, sub) {
    const content = document.querySelector(".content");
    if (!content) return;

    let old = document.getElementById("hi-auth-banner");
    if (old) old.remove();

    if (profile && isSubscribed()) return;

    const banner = document.createElement("div");
    banner.id = "hi-auth-banner";
    banner.className = "hi-auth-banner";

    if (!profile) {
      banner.innerHTML = `
        <div>
          <strong>Sign in required</strong>
          <p>Create a stylist profile before starting consultations or subscriptions.</p>
        </div>
        <button class="hi-auth-primary" type="button" id="hi-banner-signin">Sign In</button>
      `;
    } else {
      banner.innerHTML = `
        <div>
          <strong>Subscription required</strong>
          <p>Signed in as ${profile.name}. Start a trial or subscription to access the consultation builder.</p>
        </div>
        <button class="hi-auth-primary" type="button" id="hi-banner-subscribe">Start Subscription</button>
      `;
    }

    content.prepend(banner);

    const sign = document.getElementById("hi-banner-signin");
    if (sign) sign.onclick = () => openModal("signin");

    const subBtn = document.getElementById("hi-banner-subscribe");
    if (subBtn) subBtn.onclick = () => openModal("subscription");
  }

  function handleCheckoutReturn() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("checkout") === "success") {
      history.replaceState({}, "", window.location.pathname);
    }
  }

  document.addEventListener("click", gateConsultation, true);

  document.addEventListener("DOMContentLoaded", async function () {
    handleCheckoutReturn();
    await checkSubscription();
    renderControls();
  });

  window.addEventListener("load", async function () {
    await checkSubscription();
    renderControls();
  });
})();

