(function () {
  const PROFILE_KEY = "hairintel_profile_v1";
  const SUB_KEY = "hairintel_subscription_v1";
  const CONSULT_URL = "hairintel/index.html";
  let pendingPlan = null;
  let openPlansAfterAuth = false;
  let verifiedProfile = null;
  let authResolved = false;

  function getProfile() {
    return authResolved && verifiedProfile?.email ? verifiedProfile : null;
  }

  function setProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  function setVerifiedProfile(profile) {
    const validProfile = profile?.email ? profile : null;
    verifiedProfile = validProfile;
    authResolved = true;
    document.documentElement.classList.toggle("hi-session-verified", Boolean(validProfile));

    if (validProfile) setProfile(validProfile);
    else {
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(SUB_KEY);
    }

    return validProfile;
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

  function applyShellState(profile = getProfile()) {
    const html = document.documentElement;
    const authenticated = Boolean(
      authResolved &&
      verifiedProfile?.email &&
      profile?.email === verifiedProfile.email &&
      html.classList.contains("hi-session-verified")
    );
    html.classList.toggle("hi-authenticated", authenticated);
    html.classList.toggle("hi-guest", !authenticated);
    html.classList.remove("hi-auth-pending");

    document.querySelectorAll("[data-private-shell]").forEach((element) => {
      element.hidden = !authenticated;
      element.setAttribute("aria-hidden", String(!authenticated));
    });

    if (!authenticated) {
      document.getElementById("plumDashboard")?.classList.remove("pv2-mobile-open", "pv2-collapsed");
    }

    if (authenticated) window.HairIntelDashboardData?.();
    document.dispatchEvent(new CustomEvent("hairintel:auth-state", { detail: { authenticated } }));
  }

  async function syncAuthSession() {
    verifiedProfile = null;
    authResolved = false;
    document.documentElement.classList.remove("hi-session-verified");
    applyShellState(null);

    if (!window.HAIRI || typeof window.HAIRI.ensureClient !== "function") {
      setVerifiedProfile(null);
      return null;
    }

    try {
      const client = await window.HAIRI.ensureClient();
      if (!client?.auth) {
        setVerifiedProfile(null);
        return null;
      }
      const { data } = await client.auth.getUser();
      const user = data?.user;
      if (!user?.email) {
        setVerifiedProfile(null);
        return null;
      }
      const profile = { email: user.email, userId: user.id || null, savedAt: new Date().toISOString() };
      return setVerifiedProfile(profile);
    } catch (error) {
      console.warn("[HairIntel] Could not validate the signed-in session:", error?.message || error);
      setVerifiedProfile(null);
      return null;
    }
  }

  function formatPrice(plan) {
    if (!plan?.available || !Number.isFinite(Number(plan.unitAmount))) return null;
    const amount = Number(plan.unitAmount) / 100;
    const currency = String(plan.currency || "usd").toUpperCase();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  async function loadPricing() {
    try {
      const response = await fetch("/api/pricing", { headers: { Accept: "application/json" } });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data?.plans)) throw new Error(data?.error || "Pricing unavailable");
      data.plans.forEach((plan) => {
        const slug = String(plan.slug || "").toLowerCase();
        const display = formatPrice(plan);
        document.querySelectorAll(`[data-price-value="${slug}"]`).forEach((element) => {
          element.textContent = display || "Not configured";
        });
        document.querySelectorAll(`[data-price-interval="${slug}"]`).forEach((element) => {
          element.textContent = display && plan.interval ? ` / ${plan.interval}` : "";
        });
        document.querySelectorAll(`[data-plan="${slug}"], [data-public-plan="${slug}"]`).forEach((button) => {
          button.disabled = !display;
          if (!display) button.title = `${plan.name || slug} checkout is not configured yet.`;
        });
      });
    } catch (error) {
      console.warn("[HairIntel] Live pricing could not be loaded:", error?.message || error);
      document.querySelectorAll("[data-price-value]").forEach((element) => { element.textContent = "Unavailable"; });
      document.querySelectorAll("[data-plan], [data-public-plan]").forEach((button) => {
        button.disabled = true;
        button.title = "Checkout pricing is temporarily unavailable.";
      });
    }
  }

  function ensureStyles() {
    if (document.getElementById("hi-auth-gate-styles")) return;

    const style = document.createElement("style");
    style.id = "hi-auth-gate-styles";
    style.textContent = `
      .topbar {
        grid-template-columns: 170px minmax(520px, 1fr) max-content !important;
        gap: 24px !important;
      }

      .topbar .back {
        min-width: 0 !important;
        white-space: nowrap !important;
      }

      .topbar .tabs {
        justify-content: flex-start !important;
        gap: clamp(20px, 2.2vw, 42px) !important;
      }

      .actions {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        flex-wrap: nowrap !important;
        min-width: 0 !important;
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
        border: 1px solid rgba(216,178,140,.32);
        background: rgba(42,23,18,.42);
        color: #FFF8EC;
      }

      .hi-auth-primary {
        border: 1px solid rgba(184,115,51,.66);
        background: linear-gradient(135deg, #FFF8EC, #8B4F2F);
        color: #2A1712;
      }

      .hi-auth-banner {
        grid-column: 1 / -1;
        border: 1px solid rgba(184,115,51,.32);
        background: linear-gradient(135deg, rgba(184,115,51,.09), rgba(42,23,18,.72));
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
        color: #B87333;
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
        background: linear-gradient(145deg, rgba(74,36,29,.98), rgba(42,23,18,.98));
        border: 1px solid rgba(216,178,140,.28);
        box-shadow: 0 40px 110px rgba(0,0,0,.70);
        color: #FFF8EC;
      }

      .hi-auth-card.hi-auth-card-plans {
        width: min(96vw, 900px);
      }

      .hi-auth-card h2 {
        margin: 0 0 10px;
        font-family: 'Cormorant Garamond', Georgia, serif;
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
        border: 1px solid rgba(216,178,140,.24);
        background: rgba(255,255,255,.07);
        color: #FFF8EC;
        padding: 0 14px;
        outline: none;
      }

      .hi-auth-form input:focus,
      .hi-auth-form select:focus {
        border-color: rgba(184,115,51,.72);
        box-shadow: 0 0 0 4px rgba(184,115,51,.12);
      }

      .hi-plan-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-top: 14px;
      }

      .hi-plan {
        border: 1px solid rgba(216,178,140,.22);
        background: rgba(255,255,255,.045);
        border-radius: 18px;
        padding: 16px;
      }

      .hi-plan h3 {
        margin: 0 0 6px;
        color: #B87333;
      }

      .hi-plan p {
        margin: 0 0 12px;
        font-size: 13px;
      }

      .hi-plan-price {
        min-height: 36px;
        margin: 12px 0;
        color: #FFF8EC;
        font: 600 28px/1 'Cormorant Garamond', Georgia, serif;
      }

      .hi-plan-price small {
        color: rgba(247,239,233,.58);
        font: 600 11px/1 Inter, sans-serif;
      }

      .hi-plan-trial-terms {
        margin: 18px 0 0 !important;
        color: rgba(247,239,233,.58) !important;
        font-size: 11px !important;
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
        color: #D9A49A;
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
          <p>Use your HairIntel account to continue.</p>

          <div class="hi-auth-form">
            <label>Email
              <input id="hi-email" value="${profile?.email || ""}" placeholder="you@example.com">
            </label>
            <label>Password
              <input id="hi-password" type="password" placeholder="At least 6 characters">
            </label>
          </div>

          <div class="hi-auth-actions">
            <button class="hi-auth-chip" type="button" id="hi-cancel">Cancel</button>
            <button class="hi-auth-chip" type="button" id="hi-create-account">Create Account</button>
            <button class="hi-auth-primary" type="button" id="hi-save-profile">Sign In</button>
          </div>
        </div>
      `;
    } else if (type === "account") {
      const email = profile?.email || "Signed in";
      const status = sub?.status || "No active subscription";

      modal.innerHTML = `
        <div class="hi-auth-backdrop"></div>
        <div class="hi-auth-card">
          <button class="hi-auth-close" type="button">×</button>
          <h2>HairIntel account</h2>
          <p>Email: ${email}<br>Subscription: <strong>${status}</strong></p>

          <div class="hi-auth-actions">
            ${isSubscribed()
              ? '<button class="hi-auth-chip" type="button" id="hi-manage-billing">Manage Billing</button>'
              : '<button class="hi-auth-primary" type="button" id="hi-open-subscription">View Plans</button>'}
            <button class="hi-auth-chip" type="button" id="hi-sign-out">Sign Out</button>
            <button class="hi-auth-chip" type="button" id="hi-cancel">Close</button>
          </div>
        </div>
      `;
    } else {
      const email = profile?.email || "Sign in first";
      const status = sub?.status || "No active subscription";

      modal.innerHTML = `
        <div class="hi-auth-backdrop"></div>
        <div class="hi-auth-card hi-auth-card-plans">
          <button class="hi-auth-close" type="button">×</button>
          <h2>Choose your HairIntel plan</h2>
          <p>Your stylist account is connected.<br>Email: ${email}<br>Status: <strong>${status}</strong></p>

          <div class="hi-plan-grid">
            <div class="hi-plan">
              <h3>Starter</h3>
              <div class="hi-plan-price"><span data-price-value="starter">Loading…</span><small data-price-interval="starter"></small></div>
              <p>Private dashboard, client records, consultations, readiness, and placement planning.</p>
              <button class="hi-auth-primary" type="button" data-plan="starter">Start Starter Trial</button>
            </div>

            <div class="hi-plan">
              <h3>Pro</h3>
              <div class="hi-plan-price"><span data-price-value="pro">Loading…</span><small data-price-interval="pro"></small></div>
              <p>Advanced reports plus client-photo uploads and AI hair preview access.</p>
              <button class="hi-auth-primary" type="button" data-plan="pro">Start Pro Trial</button>
            </div>

            <div class="hi-plan">
              <h3>Studio</h3>
              <div class="hi-plan-price"><span data-price-value="studio">Loading…</span><small data-price-interval="studio"></small></div>
              <p>Studio-scale planning with HairIntel’s highest AI preview allowance.</p>
              <button class="hi-auth-primary" type="button" data-plan="studio">Start Studio Trial</button>
            </div>
          </div>

          <p class="hi-plan-trial-terms">A payment method is required. No charge today; your selected plan renews after seven days unless canceled before the trial ends. Payments are non-refundable once processed.</p>

          <div class="hi-auth-actions">
            <button class="hi-auth-chip" type="button" id="hi-manage-billing">Manage Billing</button>
            <button class="hi-auth-chip" type="button" id="hi-cancel">Close</button>
          </div>
        </div>
      `;
    }

    document.body.appendChild(modal);
    if (type === "subscription") loadPricing();

    modal.querySelector(".hi-auth-close").onclick = closeModal;
    modal.querySelector(".hi-auth-backdrop").onclick = closeModal;
    modal.querySelector("#hi-cancel") && (modal.querySelector("#hi-cancel").onclick = closeModal);

    const getCredentials = () => ({
      email: document.getElementById("hi-email")?.value.trim() || "",
      password: document.getElementById("hi-password")?.value || ""
    });

    const finishAuth = (authData) => {
      const user = authData?.user;
      if (!authData?.session || !user?.email) {
        throw new Error("HairIntel could not verify the signed-in session.");
      }
      const email = user.email;
      setVerifiedProfile({ email, userId: user?.id || null, savedAt: new Date().toISOString() });
      closeModal();
      renderControls();
      if (pendingPlan) {
        const selectedPlan = pendingPlan;
        pendingPlan = null;
        setTimeout(() => startCheckout(selectedPlan), 0);
      } else if (openPlansAfterAuth) {
        openPlansAfterAuth = false;
        setTimeout(() => openModal("subscription"), 0);
      }
    };

    const signInBtn = modal.querySelector("#hi-save-profile");
    if (signInBtn) signInBtn.onclick = async function () {
      const { email, password } = getCredentials();
      if (!email || !email.includes("@") || password.length < 6) {
        alert("Enter a valid email and password.");
        return;
      }
      signInBtn.disabled = true;
      try {
        const result = await window.HAIRI.signIn({ email, password });
        finishAuth(result);
      } catch (err) {
        alert(err?.message || "Sign-in failed.");
      } finally {
        signInBtn.disabled = false;
      }
    };

    const createBtn = modal.querySelector("#hi-create-account");
    if (createBtn) createBtn.onclick = async function () {
      const { email, password } = getCredentials();
      if (!email || !email.includes("@") || password.length < 6) {
        alert("Enter a valid email and a password with at least 6 characters.");
        return;
      }
      createBtn.disabled = true;
      try {
        const result = await window.HAIRI.signUp({ email, password });
        if (result?.session) finishAuth(result);
        else alert("Account created. Check your email to confirm it, then sign in.");
      } catch (err) {
        alert(err?.message || "Account creation failed.");
      } finally {
        createBtn.disabled = false;
      }
    };

    modal.querySelectorAll("[data-plan]").forEach((btn) => {
      btn.onclick = function () {
        startCheckout(btn.dataset.plan);
      };
    });

    const manage = modal.querySelector("#hi-manage-billing");
    if (manage) manage.onclick = manageBilling;

    const openSubscription = modal.querySelector("#hi-open-subscription");
    if (openSubscription) openSubscription.onclick = () => openModal("subscription");

    const signOutButton = modal.querySelector("#hi-sign-out");
    if (signOutButton) signOutButton.onclick = signOut;
  }

  function closeModal() {
    const modal = document.getElementById("hi-auth-modal");
    if (modal) modal.remove();
  }

  async function signOut() {
    try {
      if (window.HAIRI && typeof window.HAIRI.ensureClient === "function") {
        const client = await window.HAIRI.ensureClient();
        if (client?.auth) {
          await client.auth.signOut();
        }
      }
    } catch {
      // Local dashboard profile cleanup should still complete.
    }

    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(SUB_KEY);
    localStorage.removeItem("hairintel_customer_email");
    localStorage.setItem("hi_subscription", JSON.stringify({
      plan: "free",
      status: "inactive",
      updatedAt: new Date().toISOString()
    }));
    setVerifiedProfile(null);

    closeModal();
    renderControls();
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
          name: "HairIntel User",
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
          stripeCustomerId: data.stripeCustomerId || null,
          stripeSubscriptionId: data.stripeSubscriptionId || null,
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
    const authAction = target.dataset.authAction || "";
    const publicPlan = target.dataset.publicPlan || "";

    if (publicPlan) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!getProfile()) {
        pendingPlan = publicPlan;
        openModal("signin");
      } else {
        startCheckout(publicPlan);
      }
      return;
    }

    if (authAction) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (authAction === "subscribe") {
        if (getProfile()) openModal("subscription");
        else {
          openPlansAfterAuth = true;
          openModal("signin");
        }
      } else {
        openModal(getProfile() ? "account" : "signin");
      }
      return;
    }

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

    const href = target.getAttribute("href") || "";
    window.location.href = href.startsWith("hairintel/") ? href : CONSULT_URL;
  }

  function renderPv2AuthControls(profile) {
    document.querySelectorAll(".pv2-login-top").forEach((button) => {
      button.textContent = profile ? "Account" : "Sign in / Create account";
      button.dataset.authAction = profile ? "account" : "signin";
      button.setAttribute("aria-label", profile ? "Open your HairIntel account" : "Sign in or create your HairIntel account");
    });

    document.querySelectorAll(".pv2-account-cta").forEach((button) => {
      button.dataset.authAction = profile ? "account" : "signin";
      button.setAttribute("aria-label", profile ? "Open your HairIntel account" : "Sign in or create your HairIntel account");
      const title = button.querySelector("b");
      const detail = button.querySelector("small");
      if (title) title.textContent = profile ? "Account" : "Sign in / Create account";
      if (detail) detail.textContent = profile?.email || "Open your stylist workspace";
    });
  }

  function renderControls() {
    ensureStyles();

    const profile = getProfile();
    applyShellState(profile);
    renderPv2AuthControls(profile);

    const actions = document.querySelector(".actions");
    if (!actions) return;

    const old = document.getElementById("hi-auth-controls");
    if (old) old.remove();

    const wrap = document.createElement("div");
    wrap.id = "hi-auth-controls";
    wrap.className = "hi-auth-controls";

    if (profile) {
      wrap.innerHTML = `
        <button class="hi-auth-chip" type="button" id="hi-auth-button">Sign Out</button>
      `;
    } else {
      wrap.innerHTML = `
        <button class="hi-auth-primary" type="button" id="hi-auth-button">Sign In</button>
      `;
    }

    actions.prepend(wrap);

    const authButton = document.getElementById("hi-auth-button");
    if (authButton) {
      authButton.onclick = profile ? signOut : () => openModal("signin");
    }

    renderBanner(profile, getSub());
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
        <span class="hi-auth-chip" aria-hidden="true">Sign in from the top bar to continue</span>
      `;
    } else {
      banner.innerHTML = `
        <div>
          <strong>Subscription required</strong>
          <p>Your HairIntel account is signed in. Start a trial or subscription to access the consultation builder.</p>
        </div>
        <span class="hi-auth-chip" aria-hidden="true">Use the top-bar account button to continue</span>
      `;
    }

    content.prepend(banner);

    // The banner is informational; the single top-bar account button owns the flow.
  }

  async function handleCheckoutReturn() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("checkout") !== "success") return;

    const sessionId = params.get("session_id");

    if (sessionId) {
      try {
        const res = await fetch("/api/checkout-status?session_id=" + encodeURIComponent(sessionId));
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setSub({
            status: data.status || (data.active ? "active" : "inactive"),
            plan: data.plan || "free",
            stripeCustomerId: data.stripeCustomerId || null,
            stripeSubscriptionId: data.stripeSubscriptionId || null,
            checkedAt: new Date().toISOString()
          });

          if (data.email) {
            localStorage.setItem("hairintel_customer_email", data.email);
          }
        }
      } catch {
        // The webhook and subscription-status route still provide the source of truth.
      }
    }

    history.replaceState({}, "", window.location.pathname);
  }

  function handleAccessReturn() {
    const params = new URLSearchParams(window.location.search);
    const authRequired = params.get("auth") === "required";
    const subscriptionRequired = params.get("subscription") === "required";
    if (!authRequired && !subscriptionRequired) return;
    history.replaceState({}, "", window.location.pathname);
    if (subscriptionRequired && getProfile()) openModal("subscription");
    else openModal("signin");
  }

  document.addEventListener("click", gateConsultation, true);

  document.addEventListener("DOMContentLoaded", async function () {
    await handleCheckoutReturn();
    await syncAuthSession();
    await checkSubscription();
    renderControls();
    loadPricing();
    handleAccessReturn();
  });

  window.addEventListener("load", async function () {
    await checkSubscription();
    renderControls();
  });
})();
