(function () {
  function closeModals() {
    document.querySelectorAll(".modal.show").forEach((modal) => {
      modal.classList.remove("show");
      modal.style.display = "none";
    });
  }

  function showInfoModal(title, body) {
    closeModals();

    let modal = document.getElementById("hi-nav-info-modal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "hi-nav-info-modal";
      modal.className = "modal";
      modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-card">
          <h2 id="hi-nav-info-title"></h2>
          <p id="hi-nav-info-body"></p>
          <div class="modal-actions">
            <button class="outline-btn" id="hi-nav-info-close">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector(".modal-backdrop").addEventListener("click", closeModals);
      modal.querySelector("#hi-nav-info-close").addEventListener("click", closeModals);
    }

    modal.querySelector("#hi-nav-info-title").textContent = title;
    modal.querySelector("#hi-nav-info-body").textContent = body;
    modal.classList.add("show");
    modal.style.display = "grid";
  }

  function openBuilder() {
    window.location.href = "/hairintel/index.html?from=dashboard&start=1";
  }

  function activateTab(button) {
    document.querySelectorAll(".tabs button").forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    const panel = String(button.dataset.panel || "overview").toLowerCase();

    if (panel === "overview") {
      closeModals();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (panel === "analysis") {
      showInfoModal(
        "Analysis",
        "Analysis is loaded from the saved consultation: hair integrity, scalp condition, density, load safety, and installation risk."
      );
      return;
    }

    if (panel === "recommendations") {
      showInfoModal(
        "Recommendations",
        "Recommendations should reflect the saved consultation plan, including method, grams, placement caution, and safety review."
      );
      return;
    }

    if (panel === "history") {
      showInfoModal(
        "History",
        "History will show saved consultations once the app is connected to permanent client records. Current data is saved locally in this browser."
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

    if (panel) {
      event.preventDefault();
      event.stopImmediatePropagation();
      activateTab(button);
    }
  }, true);
})();
