(function () {
  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null && value !== "") {
      el.textContent = value;
    }
  }

  function latestConsultation() {
    const consults = readJson("hi_consultations", []);
    if (!Array.isArray(consults) || !consults.length) return null;

    return [...consults].sort((a, b) => {
      const ad = new Date(a.updatedAt || a.analyzedAt || a.createdAt || a.savedAt || 0).getTime();
      const bd = new Date(b.updatedAt || b.analyzedAt || b.createdAt || b.savedAt || 0).getTime();
      return bd - ad;
    })[0];
  }

  function findClient(consult) {
    const clients = readJson("hi_clients", []);

    if (consult?.clientInfo) return consult.clientInfo;

    if (Array.isArray(clients) && consult?.clientId) {
      const match = clients.find(c => c.id === consult.clientId);
      if (match) return match;
    }

    return Array.isArray(clients) && clients.length ? clients[clients.length - 1] : null;
  }

  function setClientCard(client, consult) {
    const name = [client?.firstName, client?.lastName].filter(Boolean).join(" ").trim();

    const clientCard = document.querySelector(".client-card");
    if (!clientCard) return;

    const h3 = clientCard.querySelector("h3");
    const p = clientCard.querySelector("p");

    if (h3) h3.textContent = name || "Client Selected";
    if (p) p.textContent = "Consultation data loaded from saved HairIntel builder session.";

    const profile = consult?.hairProfile || {};
    const goals = consult?.goals || {};
    const flags = consult?.clientFlags || {};

    const rows = clientCard.querySelectorAll(".client-data div");
    rows.forEach(row => {
      const label = (row.childNodes[0]?.textContent || row.textContent || "").toLowerCase();
      const strong = row.querySelector("strong");
      if (!strong) return;

      if (label.includes("hair type")) strong.textContent = profile.texture || profile.type || "Pending";
      if (label.includes("average density")) strong.textContent = profile.density || "Pending";
      if (label.includes("scalp condition")) strong.textContent = flags.scalp_sensitivity || "Pending";
      if (label.includes("donor strength")) strong.textContent = profile.integrity || profile.chemHistory || "Pending";
      if (label.includes("primary goal")) strong.textContent = goals.primaryGoal || "Pending";
    });
  }

  function hydrateDashboard() {
    const consult = latestConsultation();

    if (!consult) {
      return;
    }

    const result = consult.result || consult.analysis || consult.recommendation || {};
    const client = findClient(consult);

    const plan = result.plan || consult.plan || {};
    const capacity = result.capacity || consult.capacity || {};
    const summaries = result.summaries || {};
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];

    setClientCard(client, consult);

    const score =
      result.integrityScore ??
      result.readinessScore ??
      capacity.score ??
      null;

    setText("readinessScore", score !== null ? String(score) : "--");

    const readiness = String(result.readiness || "pending").toUpperCase();
    setText("candidateStatus", readiness === "PENDING" ? "Consultation Loaded" : `${readiness} Readiness`);

    setText(
      "candidateSummary",
      summaries.clientSummary ||
      warnings[0] ||
      "Saved consultation loaded. Review the builder report for full analysis."
    );

    setText("methodText", plan.method || "Pending");
    setText("strandText", plan.grams ? `${plan.grams}g` : plan.wefts ? `${plan.wefts} attachment points` : "Pending");
    setText("timeText", plan.appointmentDuration || plan.duration || "Pending");
    setText("maintenanceText", plan.maintenance || "Pending");

    setText("frontCount", plan.grams ? "Guided by density map" : "Pending");
    setText("midCount", plan.grams ? "Primary load zone" : "Pending");
    setText("crownCount", result.placementMap?.cautionCrown ? "Caution" : "Pending");
    setText("sideCount", result.placementMap?.avoidTemples ? "Avoid / reduce tension" : "Pending");
    setText("totalStrands", plan.grams ? `${plan.grams}g total load` : "Pending");

    const note = document.getElementById("placementNote");
    if (note) {
      note.textContent =
        plan.rationale ||
        warnings[0] ||
        "Placement guidance loaded from latest saved consultation.";
    }

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
})();
