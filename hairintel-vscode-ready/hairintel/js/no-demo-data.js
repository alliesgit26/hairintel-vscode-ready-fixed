(function () {
  const DEMO_NAMES = new Set([
    "sienna rhodes",
    "madison cross",
    "priya sharma",
    "ava morgan",
    "sophia carter"
  ]);

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function isDemoClient(client) {
    const fullName = `${client?.firstName || ""} ${client?.lastName || ""}`.trim().toLowerCase();
    return DEMO_NAMES.has(fullName);
  }

  function cleanDemoData() {
    const clients = readJson("hi_clients", []);
    const removedIds = new Set();

    if (Array.isArray(clients)) {
      const cleanedClients = clients.filter((client) => {
        const demo = isDemoClient(client);
        if (demo && client.id) removedIds.add(client.id);
        return !demo;
      });

      localStorage.setItem("hi_clients", JSON.stringify(cleanedClients));
    }

    const consults = readJson("hi_consultations", []);
    if (Array.isArray(consults)) {
      const cleanedConsults = consults.filter((consult) => !removedIds.has(consult.clientId));
      localStorage.setItem("hi_consultations", JSON.stringify(cleanedConsults));
    }

    localStorage.setItem("hi_demo_v1", JSON.stringify({
      disabled: true,
      clearedAt: new Date().toISOString()
    }));
  }

  function patchHI() {
    try {
      if (typeof HI === "undefined" || !HI) return false;

      HI.loadDemo = function () {
        cleanDemoData();
        return false;
      };

      if (!HI.__noDemoPatched && typeof HI.getClients === "function") {
        const originalGetClients = HI.getClients.bind(HI);

        HI.getClients = function () {
          cleanDemoData();
          return originalGetClients().filter((client) => !isDemoClient(client));
        };

        HI.__noDemoPatched = true;
      }

      cleanDemoData();
      return true;
    } catch (err) {
      console.warn("[HairIntel] no-demo cleanup failed:", err);
      return false;
    }
  }

  cleanDemoData();

  if (!patchHI()) {
    const timer = setInterval(() => {
      if (patchHI()) clearInterval(timer);
    }, 25);

    setTimeout(() => clearInterval(timer), 3000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    cleanDemoData();
    patchHI();
  });
})();

