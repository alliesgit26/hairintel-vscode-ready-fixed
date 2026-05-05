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

  async function openCheckout(plan = "pro") {
    const email = getEmail();

    toast("Opening Stripe checkout...");

    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, email })
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
        stripe_customer_id: sub.stripe_customer_id || sub.customerId || sub.customer_id || ""
      })
    });

    const data = await res.json();

    if (!res.ok || !data.url) {
      await openCheckout("pro");
      return;
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

    const isBillingButton =
      action === "upgrade" ||
      action === "billing" ||
      text.includes("manage tools") ||
      text.includes("subscribed") ||
      text.includes("start subscription");

    const isSaveButton =
      action === "save" ||
      text.includes("save dashboard");

    if (!isBillingButton && !isSaveButton) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      if (isSaveButton) {
        saveDashboard();
        return;
      }

      closeDashboardModal();

      if (isSubscribed()) {
        await openBillingPortal();
      } else {
        await openCheckout("pro");
      }
    } catch (err) {
      console.error("[HairIntel dashboard action failed]", err);
      toast(err.message || "Action failed. Check Stripe setup.");
    }
  }, true);
})();
