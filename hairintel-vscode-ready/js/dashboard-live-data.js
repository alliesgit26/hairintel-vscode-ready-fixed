(function () {
  let latestState = null;

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

    const grams = Number(plan.grams || 0);
    const safeMax = Number(capacity.safeMax || capacity.recommendedMax || 0);
    const totalLoad = grams ? grams + "g" : "Pending";
    const maxLoad = safeMax ? safeMax + "g" : "Pending";

    let status = clean(capacity.status || "Pending");
    if (status === "OVERLOAD RISK") status = "Overload Risk";

    const tension =
      result.readiness === "red" ? "High" :
      result.readiness === "yellow" ? "Moderate" :
      "Low";

    const perStrand = plan.method ? "Method based" : "Pending";
    const perArea = grams ? "Distributed" : "Pending";

    loadStats.querySelectorAll("div").forEach(row => {
      const txt = row.textContent.toLowerCase();
      const strong = row.querySelector("strong");
      if (!strong) return;

      if (txt.includes("total load")) strong.textContent = totalLoad;
      if (txt.includes("recommended")) strong.textContent = maxLoad;
      if (txt.includes("scalp tension")) strong.textContent = tension;
      if (txt.includes("weight per")) strong.textContent = perStrand;
      if (txt.includes("load per area")) strong.textContent = perArea;
      if (txt.includes("safety margin")) strong.textContent = status;
    });

    const ring = document.querySelector(".small-ring span");
    if (ring) {
      ring.textContent = status === "Overload Risk" ? "Risk" : status;
      ring.title = status;
    }
  }

  function setPlacement(view) {
    if (!latestState) return;

    const result = latestState.result || {};
    const plan = latestState.plan || {};
    const map = result.placementMap || {};
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    const grams = Number(plan.grams || 0);
    const total = grams ? grams + "g total load" : "Pending";

    const note = document.getElementById("placementNote");

    if (view === "side") {
      setText("frontCount", grams ? "Face frame only" : "Pending");
      setText("midCount", grams ? "Reduced side load" : "Pending");
      setText("crownCount", grams ? "No crown overlap" : "Pending");
      setText("sideCount", map.avoidTemples ? "Avoid tension" : "Controlled tension");
      setText("totalStrands", total);
      if (note) note.textContent = "Side placement should reduce temple tension and protect the front hairline.";
      return;
    }

    if (view === "back") {
      setText("frontCount", "N/A");
      setText("midCount", grams ? "Back rows balanced" : "Pending");
      setText("crownCount", grams ? "Crown blend protected" : "Pending");
      setText("sideCount", grams ? "Perimeter softened" : "Pending");
      setText("totalStrands", total);
      if (note) note.textContent = "Back placement should preserve movement and prevent heavy perimeter loading.";
      return;
    }

    setText("frontCount", grams ? "Light face frame" : "Pending");
    setText("midCount", grams ? "Primary support zone" : "Pending");
    setText("crownCount", map.cautionCrown ? "Caution" : grams ? "Blend controlled" : "Pending");
    setText("sideCount", map.avoidTemples ? "Reduce tension" : grams ? "Controlled tension" : "Pending");
    setText("totalStrands", total);

    if (note) {
      note.textContent = clean(
        plan.rationale ||
        warnings[0] ||
        "Placement guidance loaded from the saved consultation result."
      );
    }
  }

  function wirePlacementTabs() {
    document.querySelectorAll("[data-placement]").forEach(btn => {
      if (btn.__hiPlacementWired) return;
      btn.__hiPlacementWired = true;

      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-placement") || "top";
        setTimeout(() => setPlacement(view), 0);
        setTimeout(() => setPlacement(view), 80);
      });
    });
  }

  function updateScorePanelLanguage(result, capacity) {
  const capacityStatus = clean(capacity?.status || "").toUpperCase();
  const hasOverloadRisk = capacityStatus.includes("OVERLOAD");

  const scorePanel = document.getElementById("scorePanel");
  if (scorePanel) {
    const title = scorePanel.querySelector(".panel-title");
    if (title) {
      title.textContent = hasOverloadRisk ? "HAIR INTEGRITY SCORE" : "READINESS SCORE";
    }
  }

  const denom = document.querySelector(".score-ring small");
  if (denom) {
    denom.textContent = "/100";
  }

  return hasOverloadRisk;
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

    latestState = { consult, result, plan, capacity, client };

    setClientCard(client, consult);

    const score = result.integrityScore ?? result.readinessScore ?? capacity.score ?? "--";
    setText("readinessScore", score);

    const readiness = clean(result.readiness || "loaded").toUpperCase();
const capacityStatus = clean(capacity.status || "").toUpperCase();
const hasOverloadRisk = capacityStatus.includes("OVERLOAD");

setText(
  "candidateStatus",
  hasOverloadRisk
    ? "Load Review Required"
    : readiness === "LOADED"
      ? "Consultation Loaded"
      : readiness + " Readiness"
);

    setText(
  "candidateSummary",
  hasOverloadRisk
    ? "The recommended plan exceeds the calculated safe load. Reduce grams, adjust placement, or review the plan before service."
    : summaries.clientSummary ||
      warnings[0] ||
      "Saved consultation loaded. Review the builder report for full analysis."
);

    setText("methodText", plan.method);
    setText("strandText", plan.grams ? plan.grams + "g" : plan.wefts ? plan.wefts + " attachment points" : "Pending");
    setText("timeText", plan.appointmentDuration || plan.duration);
    setText("maintenanceText", plan.maintenance);

    setPlacement("top");
    setLoadSafety(result, plan, capacity);
    wirePlacementTabs();

    document.querySelectorAll("#checkList div").forEach((item) => {
  item.textContent = item.textContent
    .replace("required", "loaded")
    .replace("Required", "Loaded");
});

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


