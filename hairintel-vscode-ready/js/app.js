/* ================================================================
   HAIRINTEL AI — App Entry Point
   ================================================================ */

async function handleCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);

  const checkoutStatus = params.get("checkout");
  const planFromUrl = params.get("plan");
  const sessionId = params.get("session_id");

  if (checkoutStatus !== "success" || !sessionId) {
    return false;
  }

  try {
    console.log("[HIApp] Verifying checkout session...");

    const response = await fetch(
      `/api/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}&plan=${encodeURIComponent(planFromUrl || "starter")}`
    );

    const raw = await response.text();

    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(raw.slice(0, 180) || "Stripe verification returned invalid data.");
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || "Could not verify checkout.");
    }

    const plan = data.plan || planFromUrl || "starter";
    const status = data.status || "unknown";

    const allowedStatuses = ["trialing", "active"];

    window.history.replaceState({}, document.title, "/");

    if (!allowedStatuses.includes(status)) {
      if (window.HI && typeof HI.setSub === "function") {
        HI.setSub({
          plan: "none",
          status,
          updatedAt: new Date().toISOString(),
        });
      }

      HIApp.go("subscription", {}, false);

      setTimeout(() => {
        hiToast(`Subscription is ${status}. Please choose a plan to continue.`, "warning", 6000);
      }, 300);

      console.log("[HIApp] Checkout verified but not active:", data);
      return true;
    }

    if (window.HI && typeof HI.setSub === "function") {
      HI.setSub({
        plan,
        status,
        customer_email: data.email || "",
        email: data.email || "",
        stripe_customer_id: data.stripe_customer_id || "",
        stripe_subscription_id: data.stripe_subscription_id || "",
        updatedAt: new Date().toISOString(),
      });
    }

    if (data.email) {
      localStorage.setItem("hairintel_customer_email", data.email);
    }

    HIApp.go("welcome", {}, false);

    setTimeout(() => {
      hiToast(`${hiCapitalize(plan)} trial started successfully.`, "success", 5000);
    }, 300);

    console.log("[HIApp] Checkout verified:", data);

    return true;
  } catch (error) {
    console.error("[HIApp] Checkout return error:", error);

    window.history.replaceState({}, document.title, "/");

    HIApp.go("subscription", {}, false);

    setTimeout(() => {
      hiToast(error.message || "Checkout could not be verified.", "error", 6000);
    }, 300);

    return true;
  }
}

async function startHIApp() {
  console.log("[HIApp] Starting init...");

  try {
    /*
      LIVE MODE:
      Demo data is intentionally disabled.
      Do not load fake stylist, fake clients, or fake subscriptions.
    */

    // HI.loadDemo();
    // console.log("[HIApp] Demo loaded");

    if (typeof HIApp === "undefined") {
      throw new Error("HIApp router is not available. Check utils.js loading order.");
    }

    const handledCheckout = await handleCheckoutReturn();

    if (!handledCheckout) {
      HIApp.go("welcome");
    }

    console.log("[HIApp] Welcome screen rendered");
  } catch (e) {
    console.error("[HIApp] Init failed:", e.message, e.stack);

    const c = document.getElementById("hi-screen-container");

    if (c) {
      c.innerHTML =
        '<div style="padding:40px;color:#ef4444;font-family:sans-serif;font-size:14px;">' +
        "<strong>App Error:</strong><br>" +
        e.message +
        "</div>";
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startHIApp);
} else {
  startHIApp();
}