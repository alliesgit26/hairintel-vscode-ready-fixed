(function () {
  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function syncSubscription() {
    const builderSub = readJson("hi_subscription");
    const dashboardSub = readJson("hairintel_subscription_v1");

    const source = dashboardSub || builderSub;

    if (!source) return;

    const plan = String(source.plan || source.tier || "free").toLowerCase();
    const status = String(source.status || "").toLowerCase();

    const validPaidPlan = ["starter", "pro", "studio", "salon", "professional"].includes(plan);
    const validStatus = ["active", "trialing", "paid", "complete"].includes(status);

    if (validPaidPlan && validStatus) {
      localStorage.setItem("hi_subscription", JSON.stringify({
        ...source,
        plan: plan === "salon" ? "studio" : plan,
        status,
        syncedAt: new Date().toISOString(),
        source: source.source || "dashboard_sync"
      }));
    }
  }

  syncSubscription();
  document.addEventListener("DOMContentLoaded", syncSubscription);
})();
