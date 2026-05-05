(function () {
  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function closeModals() {
    document.querySelectorAll(".modal.show").forEach((modal) => {
      modal.classList.remove("show");
      modal.style.display = "none";
    });
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

  function getResultData() {
    const consult = latestConsultation() || {};
    const result = consult.result || consult.analysis || {};
    const plan = result.plan || consult.plan || {};
    const capacity = result.capacity || consult.capacity || {};
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];

    return { consult, result, plan, capacity, warnings };
  }

  function ensureInlinePanel() {
    let panel = document.getElementById("hi-dashboard-inline-panel");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "hi-dashboard-inline-panel";
      panel.className = "panel dynamic-panel show";
      panel.style.cssText = [
        "display:block",
        "margin:0 0 22px",
        "padding:24px",
        "border-radius:16px",
        "border:1px solid rgba(206,183,171,.18)",
        "background:linear-gradient(145deg, rgba(30,25,22,.88), rgba(12,9,7,.80))",
        "box-shadow:0 18px 50px rgba(0,0,0,.30)"
      ].join(";");

      const content = document.querySelector(".content");
      if (content) {
        content.prepend(panel);
      } else {
        document.body.prepend(panel);
      }
    }

    return panel;
  }

  function showInlinePanel(title, body, details) {
    closeModals();

    const panel = ensureInlinePanel();
    panel.innerHTML = `
      <p class="eyebrow" style="margin-bottom:10px;">${title}</p>
      <h3 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:500;color:var(--cream);">${title}</h3>
      <p style="margin:0;color:var(--muted);line-height:1.6;font-size:14px;max-width:780px;">${body}</p>
      ${details ? `<div style="margin-top:16px;color:var(--cream);font-size:13px;line-height:1.6;">${details}</div>` : ""}
    `;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function hideInlinePanel() {
    const panel = document.getElementById("hi-dashboard-inline-panel");
    if (panel) panel.remove();
  }

  function openBuilder() {
    window.location.href = "/hairintel/index.html?from=dashboard&start=1";
  }

  function setActiveTab(button) {
    document.querySelectorAll(".tabs button").forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
  }

  function activatePanel(button) {
    setActiveTab(button);

    const panel = String(button.dataset.panel || "overview").toLowerCase();
    const data = getResultData();
    const plan = data.plan;
    const capacity = data.capacity;
    const warnings = data.warnings;

    if (panel === "overview") {
      closeModals();
      hideInlinePanel();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (panel === "analysis") {
      showInlinePanel(
        "Analysis",
        "The saved consultation has been loaded into the dashboard. This view summarizes hair integrity, density, scalp condition, placement risk, and load safety.",
        `
          <strong>Integrity Score:</strong> ${data.result.integrityScore || data.result.readinessScore || capacity.score || "Pending"} / 100<br>
          <strong>Readiness:</strong> ${data.result.readiness || "Pending"}<br>
          <strong>Load Status:</strong> ${capacity.status || "Pending"}
        `
      );
      return;
    }

    if (panel === "recommendations") {
      showInlinePanel(
        "Recommendations",
        "Recommendations are based on the latest saved consultation and should be reviewed by the stylist before service.",
        `
          <strong>Method:</strong> ${plan.method || "Pending"}<br>
          <strong>Planned Load:</strong> ${plan.grams ? plan.grams + "g" : "Pending"}<br>
          <strong>Recommended Max:</strong> ${capacity.safeMax || capacity.recommendedMax ? (capacity.safeMax || capacity.recommendedMax) + "g" : "Pending"}<br>
          <strong>Safety Note:</strong> ${warnings[0] || capacity.status || "Review placement and client tolerance before install."}
        `
      );
      return;
    }

    if (panel === "history") {
      const consults = readJson("hi_consultations", []);
      showInlinePanel(
        "History",
        "Saved consultations are currently stored in this browser. A production database can be added later for account-level history.",
        `
          <strong>Saved Consultations:</strong> ${Array.isArray(consults) ? consults.length : 0}<br>
          <strong>Storage:</strong> Local browser storage
        `
      );
    }
  }

  document.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) return;

    const text = String(button.textContent || "").trim().toLowerCase();
    const action = String(button.dataset.action || "").toLowerCase();
    const panel = String(button.dataset.panel || "").toLowerCase();

    if (
      action === "consultations" ||
      text.includes("start consultation") ||
      text.includes("new consultation")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeModals();
      openBuilder();
      return;
    }

    if (action === "education" || text === "education") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeModals();
      showInlinePanel(
        "Education",
        "Education can include safe load limits, blending rules, scalp contraindications, maintenance guidance, and extension method comparisons.",
        ""
      );
      return;
    }

    if (panel) {
      event.preventDefault();
      event.stopImmediatePropagation();
      activatePanel(button);
    }
  }, true);
})();
