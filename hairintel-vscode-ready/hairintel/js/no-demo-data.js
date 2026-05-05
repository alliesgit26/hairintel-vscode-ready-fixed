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

  function cleanDemoData() {
    const clients = readJson("hi_clients", []);
    const removedIds = new Set();

    if (Array.isArray(clients)) {
      const cleanedClients = clients.filter((client) => {
        const fullName = `${client.firstName || ""} ${client.lastName || ""}`.trim().toLowerCase();
        const isDemo = DEMO_NAMES.has(fullName);
        if (isDemo && client.id) removedIds.add(client.id);
        return !isDemo;
      });

      if (cleanedClients.length !== clients.length) {
        localStorage.setItem("hi_clients", JSON.stringify(cleanedClients));
      }
    }

    const consults = readJson("hi_consultations", []);
    if (Array.isArray(consults) && removedIds.size) {
      const cleanedConsults = consults.filter((consult) => !removedIds.has(consult.clientId));
      localStorage.setItem("hi_consultations", JSON.stringify(cleanedConsults));
    }

    localStorage.removeItem("hi_demo_v1");
  }

  cleanDemoData();

  Object.defineProperty(window, "HIRemoveDemoData", {
    value: cleanDemoData,
    configurable: true
  });

  const patchHI = setInterval(() => {
    if (window.HI) {
      window.HI.loadDemo = function () {
        cleanDemoData();
        return false;
      };

      const originalGetClients = window.HI.getClients?.bind(window.HI);
      if (originalGetClients && !window.HI.__noDemoPatched) {
        window.HI.getClients = function () {
          cleanDemoData();
          return originalGetClients().filter((client) => {
            const fullName = `${client.firstName || ""} ${client.lastName || ""}`.trim().toLowerCase();
            return !DEMO_NAMES.has(fullName);
          });
        };
        window.HI.__noDemoPatched = true;
      }

      cleanDemoData();
      clearInterval(patchHI);
    }
  }, 25);

  document.addEventListener("DOMContentLoaded", cleanDemoData);
})();
