/* ================================================================
   HAIRINTEL AI - Authenticated App Entry Point
   ================================================================ */

function redirectToHairIntelHome(reason) {
  const query = reason === "subscription" ? "subscription=required" : "auth=required";
  window.location.replace(`../?${query}`);
}

function isHairIntelInternalQaHost() {
  const host = String(window.location.hostname || "").toLowerCase();
  return /^hairintel-ai-git-[a-z0-9-]+-alliesgithub26-6006s-projects\.vercel\.app$/.test(host);
}

function isHairIntelProQaPreview() {
  const params = new URLSearchParams(window.location.search);
  return (
    isHairIntelInternalQaHost() &&
    params.get("qa") === "pro" &&
    localStorage.getItem("hairintel_qa_pro_preview") === "1"
  );
}

async function startHIApp() {
  console.log("[HIApp] Starting protected workspace init...");
  try {
    const qaProPreview = isHairIntelProQaPreview();
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

    /*
      INTERNAL QA MODE
      ----------------
      This can only activate on the Vercel branch-preview hostname, never on
      hairintel-ai.vercel.app. A verified Supabase sign-in is still required.
      It lets the owner exercise the real Pro UI without creating a paid Stripe
      subscription. It is intentionally local to that browser and preview host.
    */
    if (qaProPreview && typeof HI?.setSub === "function") {
      HI.setSub({
        plan: "pro",
        status: "trialing",
        qaPreview: true,
        qaEmail: user.email,
        updatedAt: new Date().toISOString()
      });
    }

    const subscription = typeof HI?.getSub === "function" ? HI.getSub() : null;
    const status = String(subscription?.status || "").toLowerCase();
    const plan = String(subscription?.plan || "").toLowerCase();
    const hasWorkspaceAccess = qaProPreview || (["active", "trialing", "trial"].includes(status) && plan !== "free");

    if (!hasWorkspaceAccess) {
      redirectToHairIntelHome("subscription");
      return;
    }

    const requestedScreen = params.get("screen") || "welcome";
    const safeEntryScreens = new Set(["welcome", "client-info", "clients"]);
    const initialScreen = safeEntryScreens.has(requestedScreen) ? requestedScreen : "welcome";
    HIApp.go(initialScreen);
    console.log(`[HIApp] Protected ${initialScreen} screen rendered`);

    if (qaProPreview) {
      setTimeout(() => hiToast("Internal Pro QA preview is active. No subscription charge was created.", "success", 5000), 450);
    }
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
