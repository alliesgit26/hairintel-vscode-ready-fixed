/* ================================================================
   HAIRINTEL AI - Authenticated App Entry Point
   ================================================================ */

function redirectToHairIntelHome(reason) {
  const query = reason === "subscription" ? "subscription=required" : "auth=required";
  window.location.replace(`../?${query}`);
}

function isHairIntelInternalQaHost() {
  const host = String(window.location.hostname || "").toLowerCase();
  return host.endsWith(".vercel.app") && host !== "hairintel-ai.vercel.app" && !host.includes("git-main-");
}

function isHairIntelProQaPreview() {
  if (!isHairIntelInternalQaHost()) return false;
  const params = new URLSearchParams(window.location.search);
  let profile = null;
  try { profile = JSON.parse(localStorage.getItem("hairintel_profile_v1") || "null"); } catch {}
  const email = String(
    localStorage.getItem("hairintel_customer_email") || profile?.email || ""
  ).trim().toLowerCase();
  return (
    params.get("qa") === "pro" ||
    localStorage.getItem("hairintel_qa_pro_preview") === "1" ||
    email.endsWith("@hairintel.preview")
  );
}

function restoreSavedConsultation(consultId) {
  if (!consultId || typeof HI === "undefined" || !HI || typeof HI.getConsults !== "function") return null;
  const saved = HI.getConsults().find((row) => row && row.id === consultId);
  if (!saved) return null;

  try {
    HIConsult.reset();
    Object.entries(saved).forEach(([key, value]) => HIConsult.set(key, value));
    HIConsult.set("consultId", saved.id);
    if (saved.aiPreviews) HIConsult.set("aiPreviews", saved.aiPreviews);
    if (saved.aiPreview) HIConsult.set("aiPreview", saved.aiPreview);
  } catch (error) {
    console.warn("[HIApp] Could not restore saved consultation state:", error?.message || error);
  }
  return saved;
}

async function startHIApp() {
  console.log("[HIApp] Starting protected workspace init...");
  try {
    const qaProPreview = isHairIntelProQaPreview();

    if (qaProPreview && window.HairIntelRuntimeFixes?.forceQaPro) {
      window.HairIntelRuntimeFixes.forceQaPro();
    }

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

    if (qaProPreview && typeof HI?.setSub === "function") {
      const qaSub = {
        plan: "pro",
        status: "trialing",
        billingProvider: "qa_preview",
        qaPreview: true,
        qaEmail: user.email,
        updatedAt: new Date().toISOString()
      };
      HI.setSub(qaSub);
      localStorage.setItem("hairintel_subscription_v1", JSON.stringify(qaSub));
      localStorage.setItem("hi_subscription", JSON.stringify(qaSub));
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
    const consultId = params.get("consultId") || params.get("consult_id") || "";
    const restoredConsult = consultId ? restoreSavedConsultation(consultId) : null;

    const safeEntryScreens = new Set([
      "welcome", "client-info", "clients", "summary", "readiness", "placement",
      "install-plan", "load-safety", "outcome", "estimate", "alternatives", "export", "ai-preview"
    ]);
    const initialScreen = safeEntryScreens.has(requestedScreen) ? requestedScreen : (restoredConsult ? "summary" : "welcome");
    const screenParams = restoredConsult ? { consultId: restoredConsult.id } : {};

    HIApp.go(initialScreen, screenParams, false);
    console.log(`[HIApp] Protected ${initialScreen} screen rendered`);

    if (qaProPreview) {
      setTimeout(() => hiToast("Internal Pro QA preview is active. No subscription charge was created.", "success", 4200), 450);
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
