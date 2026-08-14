/* ================================================================
   HAIRINTEL AI - Authenticated App Entry Point
   ================================================================ */

function redirectToHairIntelHome(reason) {
  const query = reason === "subscription" ? "subscription=required" : "auth=required";
  window.location.replace(`../?${query}`);
}

async function startHIApp() {
  console.log("[HIApp] Starting protected workspace init...");
  try {
    const user = window.HAIRI && typeof window.HAIRI.init === "function"
      ? await window.HAIRI.init()
      : null;

    if (!user?.email) {
      redirectToHairIntelHome("auth");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");

    if (checkout === "success" && sessionId && window.HAIRI?.applyCheckoutSession) {
      try {
        const checkoutStatus = await window.HAIRI.applyCheckoutSession(sessionId);
        console.log("[HIApp] Checkout confirmed:", checkoutStatus);
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => hiToast(`${hiCapitalize(checkoutStatus.plan || "paid")} plan activated.`, "success", 3500), 350);
      } catch (error) {
        console.warn("[HIApp] Checkout confirmation failed:", error?.message || error);
        setTimeout(() => hiToast("Payment completed, but subscription sync needs review.", "warning", 4000), 350);
      }
    }

    if (checkout === "cancelled") {
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => hiToast("Checkout cancelled.", "info"), 350);
    }

    const subscription = typeof HI?.getSub === "function" ? HI.getSub() : null;
    const status = String(subscription?.status || "").toLowerCase();
    const plan = String(subscription?.plan || "").toLowerCase();
    const hasWorkspaceAccess = ["active", "trialing", "trial"].includes(status) && plan !== "free";

    if (!hasWorkspaceAccess) {
      redirectToHairIntelHome("subscription");
      return;
    }

    const requestedScreen = params.get("screen") || "welcome";
    const safeEntryScreens = new Set(["welcome", "client-info", "clients"]);
    const initialScreen = safeEntryScreens.has(requestedScreen) ? requestedScreen : "welcome";
    HIApp.go(initialScreen);
    console.log(`[HIApp] Protected ${initialScreen} screen rendered`);
  } catch (error) {
    console.error("[HIApp] Protected init failed:", error?.message || error, error?.stack);
    redirectToHairIntelHome("auth");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startHIApp);
} else {
  startHIApp();
}
