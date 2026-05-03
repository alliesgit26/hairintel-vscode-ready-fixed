(function () {
  const STORAGE_KEY = "hairintel_button_hotfix_v1";

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalizeText(text) {
    return (text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function isScalpSensitivityButton(text) {
    const t = normalizeText(text);
    return (
      t === "none" ||
      t === "low" ||
      t === "mild" ||
      t === "moderate" ||
      t === "high" ||
      t === "severe" ||
      t.includes("sensitive") ||
      t.includes("sensitivity") ||
      t.includes("irritated") ||
      t.includes("tender") ||
      t.includes("pain") ||
      t.includes("burning")
    );
  }

  function isConcernButton(text) {
    const t = normalizeText(text);
    return (
      t.includes("breakage") ||
      t.includes("thinning") ||
      t.includes("thin edges") ||
      t.includes("edges") ||
      t.includes("bald") ||
      t.includes("alopecia") ||
      t.includes("traction") ||
      t.includes("shedding") ||
      t.includes("dry") ||
      t.includes("itch") ||
      t.includes("flake") ||
      t.includes("psoriasis") ||
      t.includes("dermatitis") ||
      t.includes("damage") ||
      t.includes("chemical") ||
      t.includes("heat") ||
      t.includes("tender") ||
      t.includes("crown") ||
      t.includes("nape") ||
      t.includes("temple") ||
      t.includes("hairline") ||
      t.includes("perimeter")
    );
  }

  function findSectionLabel(el) {
    let node = el;
    for (let i = 0; i < 8 && node; i++) {
      const text = normalizeText(node.innerText || "");
      if (text.includes("scalp sensitivity")) return "scalp_sensitivity";
      if (text.includes("areas of concern")) return "areas_of_concern";
      if (text.includes("area of concern")) return "areas_of_concern";
      if (text.includes("concern areas")) return "areas_of_concern";
      node = node.parentElement;
    }
    return null;
  }

  function markButton(btn, selected) {
    btn.classList.toggle("hi-hotfix-selected", selected);
    btn.setAttribute("aria-pressed", selected ? "true" : "false");

    if (selected) {
      btn.style.background = "linear-gradient(135deg, #F7DE86, #B8862E)";
      btn.style.color = "#120B06";
      btn.style.borderColor = "rgba(247,222,134,.75)";
      btn.style.fontWeight = "900";
      btn.style.boxShadow = "0 10px 24px rgba(244,201,93,.18)";
    } else {
      btn.style.background = "";
      btn.style.color = "";
      btn.style.borderColor = "";
      btn.style.fontWeight = "";
      btn.style.boxShadow = "";
    }
  }

  function getButtons() {
    return Array.from(document.querySelectorAll("button, [role='button'], .chip, .pill, .option, .choice"));
  }

  function syncVisuals() {
    const state = loadState();

    getButtons().forEach((btn) => {
      const text = normalizeText(btn.textContent || "");
      const section = findSectionLabel(btn);

      if (!section) return;

      if (section === "scalp_sensitivity") {
        markButton(btn, state.scalp_sensitivity === text);
      }

      if (section === "areas_of_concern") {
        const concerns = state.areas_of_concern || [];
        markButton(btn, concerns.includes(text));
      }
    });
  }

  function dispatchConsultUpdate() {
    window.dispatchEvent(new CustomEvent("hairintel:hotfix:update", { detail: loadState() }));

    try {
      const state = loadState();

      const draftKeys = [
        "hairintel_consultation",
        "hairintel_current_consultation",
        "hi_current_consult",
        "hi_consult_draft",
        "hi_consults_v1"
      ];

      draftKeys.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;

        try {
          const parsed = JSON.parse(raw);

          if (parsed && typeof parsed === "object") {
            parsed.clientFlags = parsed.clientFlags || {};
            parsed.clientFlags.scalp_sensitivity = state.scalp_sensitivity || parsed.clientFlags.scalp_sensitivity;
            parsed.clientFlags.areas_of_concern = state.areas_of_concern || parsed.clientFlags.areas_of_concern;

            parsed.hairProfile = parsed.hairProfile || {};
            parsed.hairProfile.scalp_sensitivity = state.scalp_sensitivity || parsed.hairProfile.scalp_sensitivity;
            parsed.hairProfile.areas_of_concern = state.areas_of_concern || parsed.hairProfile.areas_of_concern;

            localStorage.setItem(key, JSON.stringify(parsed));
          }
        } catch {}
      });
    } catch {}
  }

  function handleClick(e) {
    const btn = e.target.closest("button, [role='button'], .chip, .pill, .option, .choice");
    if (!btn) return;

    const section = findSectionLabel(btn);
    if (!section) return;

    const text = normalizeText(btn.textContent || "");
    if (!text) return;

    const state = loadState();

    if (section === "scalp_sensitivity" && isScalpSensitivityButton(text)) {
      e.preventDefault();
      e.stopPropagation();

      state.scalp_sensitivity = text;
      saveState(state);
      syncVisuals();
      dispatchConsultUpdate();
      return;
    }

    if (section === "areas_of_concern" && isConcernButton(text)) {
      e.preventDefault();
      e.stopPropagation();

      const current = new Set(state.areas_of_concern || []);

      if (current.has(text)) {
        current.delete(text);
      } else {
        current.add(text);
      }

      state.areas_of_concern = Array.from(current);
      saveState(state);
      syncVisuals();
      dispatchConsultUpdate();
      return;
    }
  }

  function addHelperNote() {
    if (document.getElementById("hi-hotfix-style")) return;

    const style = document.createElement("style");
    style.id = "hi-hotfix-style";
    style.textContent = `
      .hi-hotfix-selected {
        background: linear-gradient(135deg, #F7DE86, #B8862E) !important;
        color: #120B06 !important;
        border-color: rgba(247,222,134,.75) !important;
        font-weight: 900 !important;
        box-shadow: 0 10px 24px rgba(244,201,93,.18) !important;
      }
    `;

    document.head.appendChild(style);
  }

  function init() {
    addHelperNote();
    syncVisuals();
  }

  document.addEventListener("click", handleClick, true);
  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);

  const observer = new MutationObserver(() => {
    setTimeout(syncVisuals, 50);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
