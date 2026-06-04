(function () {
  function readJson(key, fallback = null) {
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

  function toast(message) {
    let box = document.getElementById("hi-dashboard-toast");

    if (!box) {
      box = document.createElement("div");
      box.id = "hi-dashboard-toast";
      box.style.cssText = [
        "position:fixed",
        "right:24px",
        "bottom:24px",
        "z-index:99999",
        "background:#17110d",
        "color:#f7efe9",
        "border:1px solid rgba(244,201,93,.35)",
        "box-shadow:0 20px 60px rgba(0,0,0,.45)",
        "border-radius:16px",
        "padding:14px 18px",
        "font:700 13px Inter,Arial,sans-serif",
        "max-width:360px"
      ].join(";");
      document.body.appendChild(box);
    }

    box.textContent = message;
    box.style.display = "block";
    clearTimeout(box.__timer);
    box.__timer = setTimeout(() => {
      box.style.display = "none";
    }, 3000);
  }

  function saveDashboard() {
    const state = readJson("hairintel_dashboard_state", {});
    const consults = readJson("hi_consultations", []);

    localStorage.setItem("hairintel_dashboard_state", JSON.stringify({
      ...state,
      savedAt: new Date().toISOString(),
      source: "dashboard_menu",
      consultationCount: Array.isArray(consults) ? consults.length : 0,
      url: window.location.href
    }));

    toast("Dashboard saved.");
  }

  async function openBilling() {
    const email =
      localStorage.getItem("hairintel_customer_email") ||
      readJson("hairintel_profile_v1", {})?.email ||
      readJson("hi_stylist", {})?.email ||
      "";

    toast("Opening billing portal...");

    const sub =
      readJson("hairintel_subscription_v1", {}) ||
      readJson("hi_subscription", {});

    const res = await fetch("/api/create-billing-portal-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        stripe_customer_id: sub.stripeCustomerId || sub.stripe_customer_id || sub.customerId || sub.customer_id || ""
      })
    });

    const data = await res.json();

    if (!res.ok || !data.url) {
      toast(data.error || data.message || "Could not open billing portal.");
      return;
    }

    window.location.href = data.url;
  }

  function showMenu() {
    closeModals();

    let modal = document.getElementById("hi-dashboard-real-menu");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "hi-dashboard-real-menu";
      modal.className = "modal";
      modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-card">
          <h2>Dashboard Menu</h2>
          <p>Choose a dashboard action.</p>

          <div style="display:grid;gap:10px;margin-top:22px;">
            <button class="gold-btn" id="hi-menu-start">Start Consultation</button>
            <button class="outline-btn" id="hi-menu-save">Save Dashboard</button>
            <button class="outline-btn" id="hi-menu-export">Export PDF</button>
            <button class="outline-btn" id="hi-menu-tools">Open Pro Tools</button>
            <button class="outline-btn" id="hi-menu-billing">Manage Billing</button>
          </div>

          <div class="modal-actions">
            <button class="outline-btn" id="hi-menu-close">Close</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector(".modal-backdrop").addEventListener("click", closeModals);
      modal.querySelector("#hi-menu-close").addEventListener("click", closeModals);

      modal.querySelector("#hi-menu-start").addEventListener("click", function () {
        window.location.href = "/hairintel/index.html?from=dashboard-menu&start=1";
      });

      modal.querySelector("#hi-menu-save").addEventListener("click", function () {
        saveDashboard();
        closeModals();
      });

      modal.querySelector("#hi-menu-export").addEventListener("click", function () {
        closeModals();
        setTimeout(() => window.print(), 150);
      });

      modal.querySelector("#hi-menu-tools").addEventListener("click", function () {
        closeModals();
        const btn = document.querySelector('[data-action="pro-tools"]');
        if (btn) btn.click();
        else toast("Pro Tools panel is not available.");
      });

      modal.querySelector("#hi-menu-billing").addEventListener("click", async function () {
        closeModals();
        await openBilling();
      });
    }

    modal.classList.add("show");
    modal.style.display = "grid";
  }

  document.addEventListener("click", function (event) {
    const btn = event.target.closest("button");
    if (!btn) return;

    const action = String(btn.dataset.action || "").toLowerCase();
    const text = String(btn.textContent || "").trim().toLowerCase();

    if (action === "menu" || text === "..." || text.includes("dashboard menu")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showMenu();
    }
  }, true);
})();
