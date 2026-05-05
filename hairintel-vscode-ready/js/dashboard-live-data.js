(function () {
  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function clean(value) {
    if (value === undefined || value === null || value === "") return "Pending";
    return String(value)
      .replace(/\u2013|\u2014/g, "-")
      .replace(/\u2192|\u2197|\u2904/g, "->")
      .replace(/\u21E9/g, "")
      .trim();
  }

  function cap(value) {
    return clean(value)
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = clean(value);
  }

  function latestConsultation() {
    const consults = readJson("hi_consultations", []);
    if (!Array.isArray(consults) || !consults.length) return null;

    const withResult = consults.filter(c => c && (c.result || c.analysis || c.plan || c.capacity));
    const pool = withResult.length ? withResult : consults;

    return [...pool].sort((a, b) => {
      const ad = new Date(a.updatedAt || a.analyzedAt || a.createdAt || a.savedAt || 0).getTime();
      const bd = new Date(b.updatedAt || b.analyzedAt || b.createdAt || b.savedAt || 0).getTime();
      return bd - ad;
    })[0];
  }

  function findClient(consult) {
    const clients = readJson("hi_clients", []);
    if (consult && consult.clientInfo) return consult.clientInfo;

    if (Array.isArray(clients) && consult && consult.clientId) {
      const match = clients.find(c => c.id === consult.clientId);
      if (match) return match;
    }

    return Array.isArray(clients) && clients.length ? clients[clients.length - 1] : {};
  }

  function setClientCard(client, consult) {
    const card = document.querySelector(".client-card");
    if (!card) return;

    const name = [client.firstName, client.lastName].filter(Boolean).join(" ").trim() || "Client Selected";

    const title = card.querySelector(".panel-title");
    if (title) title.textContent = "Client Summary";

    card.querySelectorAll("h3").forEach(h => {
      h.textContent = cap(name);
    });

    const p = card.querySelector("p");
    if (p) p.textContent = "Consultation data loaded from saved HairIntel builder session.";

    const profile = consult.hairProfile || {};
    const goals = consult.goals || {};
    const flags = consult.clientFlags || {};

    card.querySelectorAll(".client-data div").forEach(row => {
      const txt = row.textContent.toLowerCase();
      const strong = row.querySelector("strong");
      if (!strong) return;

      if (txt.includes("hair type")) strong.textContent = clean(profile.texture || profile.type);
      if (txt.includes("average density")) strong.textContent = clean(profile.density);
      if (txt.includes("scalp condition")) strong.textContent = clean(flags.scalp_sensitivity || flags.scalpHealth || flags.scalp_condition);
      if (txt.includes("donor strength")) strong.textContent = clean(profile.integrity || profile.chemHistory || profile.condition);
      if (txt.includes("primary goal")) strong.textContent = clean(goals.primaryGoal);
    });
  }

  function setLoadSafety(result, plan, capacity) {
    const loadStats = document.querySelector(".load-stats");
    if (!loadStats) return;

    const totalLoad = plan.grams ? `${plan.grams}g` : "Pending";
    const maxLoad = capacity.safeMax ? `${capacity.safeMax}g` : capacity.recommendedMax ? `${capacity.recommendedMax}g` : "Pending";
    const tension = result.readiness === "red" ? "High risk" : result.readiness === "yellow" ? "Moderate" : "Low / controlled";
    const perStrand = plan.method ? "Method dependent" : "Pending";
    const perArea = plan.grams ? "Distributed by placement map" : "Pending";
    const margin = capacity.status || (capacity.score ? `${capacity.score}/100` : "Pending");

    loadStats.querySelectorAll("div").forEach(row => {
      const txt = row.textContent.toLowerCase();
      const strong = row.querySelector("strong");
      if (!strong) return;

      if (txt.includes("total load")) strong.textContent = clean(totalLoad);
      if (txt.includes("recommended")) strong.textContent = clean(maxLoad);
      if (txt.includes("scalp tension")) strong.textContent = clean(tension);
      if (txt.includes("weight per")) strong.textContent = clean(perStrand);
      if (txt.includes("load per area")) strong.textContent = clean(perArea);
      if (txt.includes("safety margin")) strong.textContent = clean(margin);
    });

    const ring = document.querySelector(".small-ring span");
    if (ring) ring.textContent = clean(capacity.status || "Safe");
  }

  function setPlacement(result, plan, capacity) {
    const grams = Number(plan.grams || 0);
    const map = result.placementMap || {};
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];

    setText("frontCount", grams ? "Light face frame" : "Pending");
    setText("midCount", grams ? "Primary support zone" : "Pending");
    setText("crownCount", map.cautionCrown ? "Caution" : grams ? "Blend controlled" : "Pending");
    setText("sideCount", map.avoidTemples ? "Reduce tension" : grams ? "Controlled tension" : "Pending");
    setText("totalStrands", grams ? `${grams}g total load` : "Pending");

    const note = document.getElementById("placementNote");
    if (note) {
      note.textContent = clean(
        plan.rationale ||
        warnings[0] ||
        "Placement guidance loaded from the saved consultation result."
      );
    }
  }

  function hydrateDashboard() {
    const consult = latestConsultation();
    if (!consult) return;

    const result = consult.result || consult.analysis || {};
    const plan = result.plan || consult.plan || {};
    const capacity = result.capacity || consult.capacity || {};
    const summaries = result.summaries || {};
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    const client = findClient(consult);

    setClientCard(client, consult);

    const score = result.integrityScore ?? result.readinessScore ?? capacity.score ?? "--";
    setText("readinessScore", score);

    const readiness = clean(result.readiness || "loaded").toUpperCase();
    setText("candidateStatus", readiness === "LOADED" ? "Consultation Loaded" : `${readiness} Readiness`);

    setText(
      "candidateSummary",
      summaries.clientSummary ||
      warnings[0] ||
      "Saved consultation loaded. Review the builder report for full analysis."
    );

    setText("methodText", plan.method);
    setText("strandText", plan.grams ? `${plan.grams}g` : plan.wefts ? `${plan.wefts} attachment points` : "Pending");
    setText("timeText", plan.appointmentDuration || plan.duration);
    setText("maintenanceText", plan.maintenance);

    setPlacement(result, plan, capacity);
    setLoadSafety(result, plan, capacity);

    localStorage.setItem("hairintel_dashboard_state", JSON.stringify({
      syncedAt: new Date().toISOString(),
      client,
      consultId: consult.id || consult.consultId || null,
      clientId: consult.clientId || null,
      result
    }));
  }

  document.addEventListener("DOMContentLoaded", hydrateDashboard);
  setTimeout(hydrateDashboard, 250);
  setTimeout(hydrateDashboard, 1000);
  setTimeout(hydrateDashboard, 1800);
})();
