(function () {
  const DEMO_NAMES = new Set([
    "sienna rhodes",
    "madison cross",
    "priya sharma",
    "ava morgan",
    "sophia carter"
  ]);

  function safeParse(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function removeDemoData() {
    try {
      const clients = safeParse("hi_clients", []);
      const demoIds = new Set();

      const cleanedClients = Array.isArray(clients)
        ? clients.filter((client) => {
            const fullName = `${client.firstName || ""} ${client.lastName || ""}`.trim().toLowerCase();
            const isDemo = DEMO_NAMES.has(fullName);
            if (isDemo && client.id) demoIds.add(client.id);
            return !isDemo;
          })
        : [];

      if (Array.isArray(clients) && cleanedClients.length !== clients.length) {
        localStorage.setItem("hi_clients", JSON.stringify(cleanedClients));
      }

      const consults = safeParse("hi_consultations", []);
      if (Array.isArray(consults) && demoIds.size) {
        const cleanedConsults = consults.filter((consult) => !demoIds.has(consult.clientId));
        localStorage.setItem("hi_consultations", JSON.stringify(cleanedConsults));
      }

      localStorage.removeItem("hi_demo_v1");
    } catch (err) {
      console.warn("[HairIntel] Demo cleanup skipped:", err);
    }
  }

  removeDemoData();

  if (window.HI) {
    window.HI.loadDemo = function () {
      removeDemoData();
      return false;
    };
  }

  window.HIRemoveDemoData = removeDemoData;

  window.addEventListener("storage", removeDemoData);
  document.addEventListener("DOMContentLoaded", removeDemoData);
})();
