(function () {
  function readJson(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function getEmail() {
    return (
      localStorage.getItem("hairintel_customer_email") ||
      readJson("hairintel_profile_v1", {})?.email ||
      readJson("hi_stylist", {})?.email ||
      readJson("hi_clients", [])?.[0]?.email ||
      ""
    ).trim().toLowerCase();
  }

  function getSubscription() {
    return (
      readJson("hairintel_subscription_v1", null) ||
      readJson("hi_subscription", null) ||
      { plan: "free", status: "inactive" }
    );
  }

  function isSubscribed() {
    const sub = getSubscription();
    const plan = String(sub.plan || "free").toLowerCase();
    const status = String(sub.status || "").toLowerCase();

    return (
      plan !== "free" &&
      ["active", "trialing", "paid", "complete"].includes(status)
    );
  }

  function toast(message) {
    let box = document.getElementById("hi-dashboard-toast");

    if (!box) {
      box = document.createElement("div");
      box.id = "hi-dashboard-toast";
      box.style.cssText = [
        "position:fixed",
        "right:24px",
        "bottom:24px",
        "z-index:99999",
        "background:#17110d",
        "color:#f7efe9",
        "border:1px solid rgba(244,201,93,.35)",
        "box-shadow:0 20px 60px rgba(0,0,0,.45)",
        "border-radius:16px",
        "padding:14px 18px",
        "font:700 13px Inter,Arial,sans-serif",
        "max-width:360px"
      ].join(";");
      document.body.appendChild(box);
    }

    box.textContent = message;
    box.style.display = "block";

    clearTimeout(box.__timer);
    box.__timer = setTimeout(() => {
      box.style.display = "none";
    }, 3200);
  }

  function closeDashboardModal() {
    document.querySelectorAll(".modal.show").forEach((modal) => {
      modal.classList.remove("show");
      modal.style.display = "none";
    });
  }

  function ensureInlinePanel() {
    let panel = document.getElementById("hi-dashboard-inline-panel");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "hi-dashboard-inline-panel";
      panel.className = "panel dynamic-panel show";
      panel.style.cssText = [
        "display:block",
        "margin:0 0 22px",
        "padding:24px",
        "border-radius:16px",
        "border:1px solid rgba(206,183,171,.18)",
        "background:linear-gradient(145deg, rgba(30,25,22,.88), rgba(12,9,7,.80))",
        "box-shadow:0 18px 50px rgba(0,0,0,.30)"
      ].join(";");

      const content = document.querySelector(".content");
      if (content) {
        content.prepend(panel);
      } else {
        document.body.prepend(panel);
      }
    }

    return panel;
  }

  function showProToolsPanel() {
    closeDashboardModal();

    const panel = ensureInlinePanel();
    const sub = getSubscription();
    const plan = String(sub.plan || "free").toUpperCase();
    const status = String(sub.status || "inactive").toUpperCase();

    panel.innerHTML = `
      <p class="eyebrow" style="margin-bottom:10px;">Pro Tools</p>
      <h3 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:500;color:var(--cream);">Professional Tool Suite</h3>
      <p style="margin:0 0 18px;color:var(--muted);line-height:1.6;font-size:14px;max-width:820px;">
        These tools support advanced extension planning, saved client records, load safety review, placement guidance, AI preview access, and client-ready exports.
      </p>

      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px;">
        <div class="panel" style="padding:16px;">
          <strong style="color:var(--gold);display:block;margin-bottom:6px;">Placement Mapping</strong>
          <span style="color:var(--muted);font-size:12px;line-height:1.45;">Review top, side, and back placement guidance from the saved consultation.</span>
        </div>
        <div class="panel" style="padding:16px;">
          <strong style="color:var(--gold);display:block;margin-bottom:6px;">Load Safety</strong>
          <span style="color:var(--muted);font-size:12px;line-height:1.45;">Compare planned grams against recommended safe load and scalp risk.</span>
        </div>
        <div class="panel" style="padding:16px;">
          <strong style="color:var(--gold);display:block;margin-bottom:6px;">AI Preview</strong>
          <span style="color:var(--muted);font-size:12px;line-height:1.45;">Generate photorealistic extension previews when plan credits are available.</span>
        </div>
        <div class="panel" style="padding:16px;">
          <strong style="color:var(--gold);display:block;margin-bottom:6px;">Client Reports</strong>
          <span style="color:var(--muted);font-size:12px;line-height:1.45;">Save dashboard views and export client-facing consultation summaries.</span>
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px;">
        <button class="gold-btn" data-action="consultations">Open Consultation Builder</button>
        <button class="outline-btn" data-action="billing">Manage Billing</button>
      </div>

      <p style="margin:16px 0 0;color:var(--muted);font-size:12px;">
        Current account: ${plan} / ${status}
      </p>
    `;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openCheckout(plan = "pro") {
    const email = getEmail();

    let userId = null;
    try {
      if (window.HAIRI && window.HAIRI.getClient) {
        const client = window.HAIRI.getClient();
        if (client) {
          const { data } = await client.auth.getUser();
          userId = data?.user?.id || null;
        }
      }
    } catch (err) {}

    if (!email) {
      toast('Please sign in before starting a subscription.');
      if (window.HI && window.HI.openModal) window.HI.openModal && window.HI.openModal('signin');
      return;
    }

    toast("Opening Stripe checkout...");

    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, email, userId })
    });

    const data = await res.json();

    if (!res.ok || !data.url) {
      throw new Error(data.error || data.message || "Could not open checkout.");
    }

    window.location.href = data.url;
  }

  async function openBillingPortal() {
    const email = getEmail();
    const sub = getSubscription();

    toast("Opening billing portal...");

    const res = await fetch("/api/create-billing-portal-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        stripe_customer_id: sub.stripeCustomerId || sub.stripe_customer_id || sub.customerId || sub.customer_id || ""
      })
    });

    const data = await res.json();

    if (!res.ok || !data.url) {
      throw new Error(data.error || data.message || "No active Stripe customer/subscription was found for this account. Manage Billing cannot start a new checkout.");
    }

    window.location.href = data.url;
  }

  function saveDashboard() {
    const existing = readJson("hairintel_dashboard_state", {});
    const consults = readJson("hi_consultations", []);

    localStorage.setItem("hairintel_dashboard_state", JSON.stringify({
      ...existing,
      savedAt: new Date().toISOString(),
      source: "dashboard_save_button",
      consultationCount: Array.isArray(consults) ? consults.length : 0,
      url: window.location.href
    }));

    closeDashboardModal();
    toast("Dashboard saved.");
  }

  document.addEventListener("click", async function (event) {
    const target = event.target.closest("button, a");
    if (!target) return;

    const action = String(target.dataset.action || "").toLowerCase();
    const text = String(target.textContent || "").trim().toLowerCase();

    const isProToolsButton =
      action === "pro-tools" ||
      text.includes("open pro tools");

    const isBillingButton =
      action === "billing" ||
      text === "subscribed" ||
      text.includes("manage billing") ||
      text.includes("billing portal") ||
      text.includes("subscription settings");

    const isSubscribeButton =
      action === "subscribe" ||
      text.includes("start subscription");

    const isSaveButton =
      action === "save" ||
      text.includes("save dashboard");

    if (!isProToolsButton && !isBillingButton && !isSubscribeButton && !isSaveButton) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      if (isSaveButton) {
        saveDashboard();
        return;
      }

      if (isProToolsButton) {
        showProToolsPanel();
        return;
      }

      closeDashboardModal();

      if (isBillingButton) {
        await openBillingPortal();
        return;
      }

      if (isSubscribeButton) {
        await openCheckout("pro");
      }
    } catch (err) {
      console.error("[HairIntel dashboard action failed]", err);
      toast(err.message || "Action failed. Check Stripe setup.");
    }
  }, true);

})();

/* ================================================================
   INTERNAL PRO QA LAUNCHER
   Visible only on the Vercel branch-preview hostname and only after a
   verified sign-in. Production subscription enforcement is untouched.
   ================================================================ */
(function () {
  const QA_FLAG = "hairintel_qa_pro_preview";

  function isInternalQaHost() {
    const host = String(window.location.hostname || "").toLowerCase();
    return /^hairintel-ai-git-[a-z0-9-]+-alliesgithub26-6006s-projects\.vercel\.app$/.test(host);
  }

  function readJson(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function getSignedInEmail() {
    return String(
      localStorage.getItem("hairintel_customer_email") ||
      readJson("hairintel_profile_v1", {})?.email ||
      ""
    ).trim().toLowerCase();
  }

  function ensureStyles() {
    if (document.getElementById("hi-pro-qa-styles")) return;
    const style = document.createElement("style");
    style.id = "hi-pro-qa-styles";
    style.textContent = `
      #hi-pro-qa-control{
        position:fixed;right:22px;bottom:22px;z-index:99990;display:flex;align-items:center;gap:12px;
        padding:10px 12px 10px 16px;border:1px solid rgba(174,121,71,.34);border-radius:999px;
        background:rgba(255,250,245,.96);box-shadow:0 18px 52px rgba(61,34,45,.18);backdrop-filter:blur(18px);
        color:#432432;font:700 11px/1.25 Inter,Arial,sans-serif;letter-spacing:.03em
      }
      #hi-pro-qa-control strong{display:block;color:#9b6a43;font-size:9px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:2px}
      #hi-pro-qa-control button{
        border:1px solid rgba(151,99,57,.44);border-radius:999px;padding:10px 14px;cursor:pointer;
        background:linear-gradient(135deg,#3a1c2e,#6d3b54);color:#fff9f0;font-weight:800;font-size:11px;
        box-shadow:0 9px 24px rgba(67,36,50,.16)
      }
      #hi-pro-qa-control button:hover{transform:translateY(-1px)}
      @media(max-width:640px){
        #hi-pro-qa-control{left:12px;right:12px;bottom:12px;justify-content:space-between;padding-left:14px}
        #hi-pro-qa-control button{padding:9px 12px}
      }
    `;
    document.head.appendChild(style);
  }

  function removeControl() {
    document.getElementById("hi-pro-qa-control")?.remove();
  }

  function launchProQa() {
    const email = getSignedInEmail();
    if (!email) return;

    const qaSub = {
      plan: "pro",
      status: "trialing",
      qaPreview: true,
      qaEmail: email,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(QA_FLAG, "1");
    localStorage.setItem("hairintel_customer_email", email);
    localStorage.setItem("hairintel_subscription_v1", JSON.stringify(qaSub));
    localStorage.setItem("hi_subscription", JSON.stringify(qaSub));
    window.location.href = "hairintel/index.html?qa=pro&screen=welcome";
  }

  function renderControl() {
    removeControl();
    if (!isInternalQaHost()) return;
    if (!document.documentElement.classList.contains("hi-authenticated")) return;
    if (!getSignedInEmail()) return;

    ensureStyles();
    const control = document.createElement("div");
    control.id = "hi-pro-qa-control";
    control.innerHTML = `
      <span><strong>Internal QA</strong>Signed-in Pro workspace preview</span>
      <button type="button" id="hi-pro-qa-launch">Open Pro QA</button>
    `;
    document.body.appendChild(control);
    document.getElementById("hi-pro-qa-launch")?.addEventListener("click", launchProQa);
  }

  document.addEventListener("DOMContentLoaded", renderControl);
  document.addEventListener("hairintel:auth-state", renderControl);
  window.addEventListener("pageshow", renderControl);
})();
