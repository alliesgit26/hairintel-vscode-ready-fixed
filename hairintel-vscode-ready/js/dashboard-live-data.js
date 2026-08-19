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
    return String(value).replace(/[–—]/g, "-").trim();
  }

  function cap(value) {
    return clean(value).replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
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
      const at = new Date(a.updatedAt || a.analyzedAt || a.createdAt || a.savedAt || 0).getTime();
      const bt = new Date(b.updatedAt || b.analyzedAt || b.createdAt || b.savedAt || 0).getTime();
      return bt - at;
    })[0];
  }

  function findClient(consult) {
    const clients = readJson("hi_clients", []);
    if (consult?.clientInfo) return consult.clientInfo;
    if (Array.isArray(clients) && consult?.clientId) {
      const match = clients.find(c => c.id === consult.clientId);
      if (match) return match;
    }
    return Array.isArray(clients) && clients.length ? clients[clients.length - 1] : {};
  }

  function findAiPreview(consult) {
    if (consult?.aiPreview) return consult.aiPreview;
    if (Array.isArray(consult?.aiPreviews) && consult.aiPreviews[0]) return consult.aiPreviews[0];
    const cached = readJson("hairintel_latest_ai_preview", null);
    if (!cached?.image) return null;
    const id = consult?.id || consult?.consultId || null;
    return (!cached.consultId || !id || cached.consultId === id) ? cached.image : null;
  }

  function ensurePlacementStyles() {
    if (document.getElementById("hairintel-ai-placement-styles")) return;
    const style = document.createElement("style");
    style.id = "hairintel-ai-placement-styles";
    style.textContent = `
      .head-frame.hi-ai-placement-frame{
        position:relative!important;overflow:hidden!important;background:#21161b!important;
        border:1px solid rgba(200,155,89,.24)!important;border-radius:14px!important;
        aspect-ratio:4/5!important;min-height:340px!important;
        box-shadow:0 20px 42px rgba(55,31,41,.12)!important
      }
      .head-frame.hi-ai-placement-frame>img{
        display:block!important;width:100%!important;height:100%!important;
        object-fit:cover!important;object-position:center top!important
      }
      .hi-placement-overlay{
        position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden;
        background:linear-gradient(180deg,rgba(21,12,17,.02),rgba(21,12,17,.06))
      }
      .hi-placement-overlay svg{display:block;width:100%;height:100%}
      .hi-placement-line{
        fill:none;stroke:#e9bd72;stroke-width:1.7;stroke-linecap:round;
        stroke-dasharray:2.2 5;filter:drop-shadow(0 1px 3px rgba(28,13,19,.72))
      }
      .hi-placement-line.caution{stroke:#d59183;stroke-dasharray:6 4}
      .hi-placement-line.avoid{stroke:#f1d1c2;stroke-dasharray:1 7;opacity:.8}
      .hi-placement-dot{
        fill:#efc579;stroke:rgba(54,28,39,.82);stroke-width:.65;
        filter:drop-shadow(0 1px 2px rgba(0,0,0,.7))
      }
      .hi-placement-dot.caution{fill:#d99686}
      .hi-placement-badge{
        position:absolute;z-index:4;top:12px;left:12px;padding:7px 10px;border-radius:999px;
        background:rgba(38,20,30,.78);color:#fff7eb;border:1px solid rgba(235,196,126,.45);
        backdrop-filter:blur(10px);font:700 9px/1 Inter,sans-serif;text-transform:uppercase;
        letter-spacing:.11em;box-shadow:0 8px 24px rgba(0,0,0,.2)
      }
      .hi-placement-badge:before{content:"✦ ";color:#edc67e}
      .hi-placement-overlay[data-view="side"]{transform:translateX(4%) scale(.97)}
      .hi-placement-overlay[data-view="back"]{transform:scaleX(.96)}
      .client-card .client-avatar.hi-client-ai-avatar{overflow:hidden!important;background:#21161b!important}
      .client-card .client-avatar.hi-client-ai-avatar img{
        width:100%!important;height:100%!important;object-fit:cover!important;object-position:center top!important
      }
      @media(max-width:870px){
        .head-frame.hi-ai-placement-frame{
          min-height:390px!important;width:100%!important;max-width:100%!important;margin:0 auto!important
        }
      }
      @media(max-width:560px){
        .head-frame.hi-ai-placement-frame{min-height:360px!important}
        .hi-placement-badge{top:9px;left:9px;font-size:8px;padding:6px 8px}
      }
    `;
    document.head.appendChild(style);
  }

  function placementSvg(map = {}) {
    const cautionCrown = Boolean(map.cautionCrown);
    const avoidTemples = Boolean(map.avoidTemples);
    const avoidNape = Boolean(map.avoidNape);
    const rowClass = cautionCrown ? "hi-placement-line caution" : "hi-placement-line";
    const templeClass = avoidTemples ? "hi-placement-line avoid" : "hi-placement-line caution";
    const napeClass = avoidNape ? "hi-placement-line avoid" : "hi-placement-line";
    const crownDot = cautionCrown ? "hi-placement-dot caution" : "hi-placement-dot";
    const napeDot = avoidNape ? "hi-placement-dot caution" : "hi-placement-dot";

    return `
      <svg viewBox="0 0 100 125" preserveAspectRatio="none" aria-hidden="true">
        <path class="${rowClass}" d="M23 31 C36 23,64 23,77 31"/>
        <path class="hi-placement-line" d="M18 41 C34 33,66 33,82 41"/>
        <path class="hi-placement-line" d="M16 52 C34 44,66 44,84 52"/>
        <path class="hi-placement-line" d="M17 63 C35 56,65 56,83 63"/>
        <path class="${napeClass}" d="M22 75 C37 69,63 69,78 75"/>
        <path class="${templeClass}" d="M23 31 C16 42,15 58,21 70"/>
        <path class="${templeClass}" d="M77 31 C84 42,85 58,79 70"/>
        <circle class="${crownDot}" cx="31" cy="28" r="1.35"/>
        <circle class="${crownDot}" cx="42" cy="25.2" r="1.35"/>
        <circle class="${crownDot}" cx="54" cy="25.2" r="1.35"/>
        <circle class="${crownDot}" cx="68" cy="28" r="1.35"/>
        <circle class="hi-placement-dot" cx="25" cy="38.2" r="1.35"/>
        <circle class="hi-placement-dot" cx="37" cy="34.8" r="1.35"/>
        <circle class="hi-placement-dot" cx="50" cy="34" r="1.35"/>
        <circle class="hi-placement-dot" cx="63" cy="34.8" r="1.35"/>
        <circle class="hi-placement-dot" cx="75" cy="38.2" r="1.35"/>
        <circle class="hi-placement-dot" cx="21" cy="49.7" r="1.35"/>
        <circle class="hi-placement-dot" cx="34" cy="45.5" r="1.35"/>
        <circle class="hi-placement-dot" cx="50" cy="44" r="1.35"/>
        <circle class="hi-placement-dot" cx="66" cy="45.5" r="1.35"/>
        <circle class="hi-placement-dot" cx="79" cy="49.7" r="1.35"/>
        <circle class="hi-placement-dot" cx="22" cy="61.2" r="1.35"/>
        <circle class="hi-placement-dot" cx="36" cy="56.8" r="1.35"/>
        <circle class="hi-placement-dot" cx="50" cy="55.8" r="1.35"/>
        <circle class="hi-placement-dot" cx="64" cy="56.8" r="1.35"/>
        <circle class="hi-placement-dot" cx="78" cy="61.2" r="1.35"/>
        <circle class="${napeDot}" cx="28" cy="72.5" r="1.35"/>
        <circle class="${napeDot}" cx="42" cy="69.8" r="1.35"/>
        <circle class="${napeDot}" cx="58" cy="69.8" r="1.35"/>
        <circle class="${napeDot}" cx="72" cy="72.5" r="1.35"/>
      </svg>`;
  }

  function applyAiPlacementPreview(consult, result, view = "top") {
    const frame = document.querySelector("#legacy-placement .head-frame, .panel.placement .head-frame");
    if (!frame) return;

    const img = frame.querySelector("img");
    const preview = findAiPreview(consult);
    const map = result?.placementMap || {};

    frame.querySelector(".hi-placement-overlay")?.remove();
    frame.querySelector(".hi-placement-badge")?.remove();
    frame.classList.toggle("hi-ai-placement-frame", Boolean(preview));

    if (!preview || !img) return;

    img.src = preview;
    img.alt = "AI-generated client hair preview with extension placement guidance";

    const badge = document.createElement("div");
    badge.className = "hi-placement-badge";
    badge.textContent = "AI Preview · Placement Overlay";
    frame.appendChild(badge);

    const overlay = document.createElement("div");
    overlay.className = "hi-placement-overlay";
    overlay.dataset.view = view;
    overlay.innerHTML = placementSvg(map);
    frame.appendChild(overlay);

    const clientAvatar = document.querySelector(".client-card .client-avatar");
    const clientImg = clientAvatar?.querySelector("img");
    if (clientAvatar && clientImg) {
      clientAvatar.classList.add("hi-client-ai-avatar");
      clientImg.src = preview;
      clientImg.alt = "Latest AI hair preview";
    }
  }

  function setRecentConsultationLink(consult, client) {
    const card = document.getElementById("recent-consultation");
    if (!card || !consult) return;
    const link = card.querySelector(".pv2-card-link");
    if (link) {
      link.textContent = "View consultation →";
      link.setAttribute("href", "#consultations");
      link.dataset.action = "view-consultation";
      if (consult.id) link.dataset.consultId = consult.id;
    }

    const name = [client?.firstName, client?.lastName].filter(Boolean).join(" ").trim();
    const title = document.getElementById("pv2RecentTitle");
    if (title && name) title.textContent = cap(name);
  }

  function setClientCard(client, consult) {
    const card = document.querySelector(".client-card");
    if (!card) return;

    const name = [client.firstName, client.lastName].filter(Boolean).join(" ").trim() || "Client Selected";
    const title = card.querySelector(".panel-title");
    if (title) title.textContent = "Client Summary";

    const clientName = document.getElementById("clientName");
    if (clientName) clientName.textContent = cap(name);

    const clientSub = document.getElementById("clientSub");
    if (clientSub) clientSub.textContent = "Consultation data loaded from saved HairIntel builder session.";

    const profile = consult.hairProfile || {};
    const goals = consult.goals || {};
    const flags = consult.clientFlags || {};
    setText("hairType", profile.texture || profile.type);
    setText("density", profile.density);
    setText("scalp", flags.scalp_sensitivity || flags.scalpHealth || flags.scalp_condition);
    setText("donor", profile.integrity || profile.chemHistory || profile.condition);
    setText("goal", goals.primaryGoal);
  }

  function setLoadSafety(result, plan, capacity) {
    const grams = Number(plan.grams || 0);
    const safeMax = Number(capacity.safeMax || capacity.recommendedMax || 0);
    const statusRaw = clean(capacity.status || "Pending");
    const status = statusRaw === "OVERLOAD RISK" ? "Overload Risk" : statusRaw;
    const tension = result.readiness === "red" ? "High" : result.readiness === "yellow" ? "Moderate" : "Low";

    setText("totalLoad", grams ? grams + "g" : "Pending");
    setText("maxLoad", safeMax ? safeMax + "g" : "Pending");
    setText("tension", tension);
    setText("weightStrand", plan.method ? "Method based" : "Pending");
    setText("loadArea", grams ? "Distributed" : "Pending");
    setText("safetyMargin", status);
    setText("loadStatus", status === "Overload Risk" ? "Risk" : status);
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

    applyAiPlacementPreview(latestState.consult, result, view);

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

  function updateScorePanelLanguage(capacity) {
    const hasOverloadRisk = clean(capacity?.status || "").toUpperCase().includes("OVERLOAD");
    const scorePanel = document.getElementById("scorePanel");
    const title = scorePanel?.querySelector(".panel-title");
    if (title) title.textContent = hasOverloadRisk ? "HAIR INTEGRITY SCORE" : "READINESS SCORE";
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
    ensurePlacementStyles();
    setRecentConsultationLink(consult, client);
    setClientCard(client, consult);

    const score = result.integrityScore ?? result.readinessScore ?? capacity.score ?? "--";
    setText("readinessScore", score);

    const readiness = clean(result.readiness || "loaded").toUpperCase();
    const hasOverloadRisk = updateScorePanelLanguage(capacity);

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
        : summaries.clientSummary || warnings[0] || "Saved consultation loaded. Review the builder report for full analysis."
    );

    setText("methodText", plan.method);
    setText("strandText", plan.grams ? plan.grams + "g" : plan.wefts ? plan.wefts + " attachment points" : "Pending");
    setText("timeText", plan.appointmentDuration || plan.duration);
    setText("maintenanceText", plan.maintenance);

    setPlacement("top");
    setLoadSafety(result, plan, capacity);
    wirePlacementTabs();

    document.querySelectorAll("#checkList div").forEach(item => {
      item.textContent = item.textContent.replace("required", "loaded").replace("Required", "Loaded");
    });

    localStorage.setItem("hairintel_dashboard_state", JSON.stringify({
      syncedAt: new Date().toISOString(),
      client,
      consultId: consult.id || consult.consultId || null,
      clientId: consult.clientId || null,
      result,
      aiPreview: findAiPreview(consult) || null
    }));
  }

  document.addEventListener("DOMContentLoaded", hydrateDashboard);
  window.addEventListener("pageshow", hydrateDashboard);
  window.addEventListener("storage", event => {
    if (["hi_consultations", "hairintel_latest_ai_preview"].includes(event.key)) hydrateDashboard();
  });
  setTimeout(hydrateDashboard, 250);
  setTimeout(hydrateDashboard, 1000);
  setTimeout(hydrateDashboard, 1800);
})();
