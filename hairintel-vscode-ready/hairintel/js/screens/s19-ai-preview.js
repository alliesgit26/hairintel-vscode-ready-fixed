/* ================================================================
   S19 - AI HAIR PREVIEW
   ================================================================ */
function renderS19AIPreview(params = {}) {
  const consultId = params.consultId || HIConsult.get("consultId");
  const consult = consultId ? HI.getConsults().find(c => c.id === consultId) : null;
  const result = consult?.result || HIConsult.get("result");
  const photos = consult?.photos || HIConsult.get("photos") || {};

  if (!result) {
    return `
    <div class="hi-screen" id="screen-ai-preview">
      <div class="hi-header">
        <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
        <div class="hi-text-center">
          <div class="hi-header-title">AI Hair Preview</div>
          <div class="hi-header-sub">Photorealistic extension simulation</div>
        </div>
        <div class="hi-header-action"></div>
      </div>
      <div class="hi-content">
        <div class="hi-card">
          <div class="hi-body">No consultation result was found for this preview.</div>
        </div>
      </div>
    </div>`;
  }

  const previewImages = HIConsult.get("aiPreviews") || [];
  const front = photos["photo-front"];
  const back = photos["photo-back"];
  const aiRemaining = typeof HI.remainingAIPreviews === "function" ? HI.remainingAIPreviews() : null;

  return `
  <div class="hi-screen hi-animate-fade" id="screen-ai-preview">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center">
        <div class="hi-header-title">AI Hair Preview</div>
        <div class="hi-header-sub">Photorealistic extension simulation</div>
      </div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Recommended Setup</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="padding:10px;background:var(--bg-raised);border-radius:10px;border:1px solid var(--border);">
            <div style="font-size:11px;color:var(--text-muted);">Method</div>
            <div style="font-size:13px;font-weight:700;color:var(--text);">${result.plan?.method || "-"}</div>
          </div>
          <div style="padding:10px;background:var(--bg-raised);border-radius:10px;border:1px solid var(--border);">
            <div style="font-size:11px;color:var(--text-muted);">Length</div>
            <div style="font-size:13px;font-weight:700;color:var(--text);">${result.plan?.extensionLength || "-"}</div>
          </div>
          <div style="padding:10px;background:var(--bg-raised);border-radius:10px;border:1px solid var(--border);">
            <div style="font-size:11px;color:var(--text-muted);">Weight</div>
            <div style="font-size:13px;font-weight:700;color:var(--text);">${result.plan?.grams || 0}g</div>
          </div>
          <div style="padding:10px;background:var(--bg-raised);border-radius:10px;border:1px solid var(--border);">
            <div style="font-size:11px;color:var(--text-muted);">Readiness</div>
            <div style="font-size:13px;font-weight:700;color:var(--text);">${(result.readiness || "unknown").toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Source Photos</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${front
            ? `<img src="${front}" alt="Front" style="width:100%;height:180px;object-fit:cover;border-radius:12px;border:1px solid var(--border);" />`
            : `<div class="hi-card-raised" style="padding:24px;">Missing front photo</div>`}
          ${back
            ? `<img src="${back}" alt="Back" style="width:100%;height:180px;object-fit:cover;border-radius:12px;border:1px solid var(--border);" />`
            : `<div class="hi-card-raised" style="padding:24px;">Missing back photo</div>`}
        </div>
      </div>

      <div class="hi-card hi-mb-4">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;">
          <div class="hi-label">Generated Previews</div>
          <button class="hi-btn hi-btn-gold" type="button" id="generate-ai-preview-btn" style="width:auto;padding:10px 16px;">
            Generate Preview
          </button>
        </div>

        <div id="ai-preview-status" style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
          ${aiRemaining !== null ? `${aiRemaining} credit(s) remaining this month.` : ""}
        </div>

        <div id="ai-preview-grid" style="display:grid;grid-template-columns:1fr;gap:12px;">
          ${previewImages.length > 0
            ? previewImages.map((src, idx) => `
              <img src="${src}" alt="AI Preview ${idx + 1}" style="width:100%;height:auto;border-radius:14px;border:1px solid var(--border);" />
            `).join("")
            : `
              <div class="hi-card-raised" style="text-align:center;padding:28px;">
                <div style="font-size:13px;color:var(--text-muted);">No AI previews yet.</div>
              </div>
            `}
        </div>
      </div>
    </div>
  </div>`;
}

function initS19AIPreview(params = {}) {
  const consultId = params.consultId || HIConsult.get("consultId");

  hEl("generate-ai-preview-btn")?.addEventListener("click", async () => {
    const statusEl = hEl("ai-preview-status");
    const gridEl = hEl("ai-preview-grid");

    try {
      const consult = consultId ? HI.getConsults().find(c => c.id === consultId) : null;
      const result = consult?.result || HIConsult.get("result");
      const photos = consult?.photos || HIConsult.get("photos") || {};

      if (!photos["photo-front"] || !photos["photo-back"]) {
        hiToast("Front and back photos are required.", "warning");
        return;
      }

      if (typeof HI.canGenerateAIPreview === "function" && !HI.canGenerateAIPreview()) {
        hiToast("AI preview limit reached for your current plan.", "warning");
        return;
      }

      statusEl.textContent = "Generating photorealistic previews...";
      hiToast("Generating AI preview...", "info", 1400);

      const res = await fetch("/api/generate-hair-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultId,
          photos,
          result
        })
      });

      const raw = await res.text();
      let data = null;

      try {
        data = JSON.parse(raw);
      } catch (e) {
        throw new Error(raw || `Server returned HTTP ${res.status}`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Preview generation failed (${res.status})`);
      }

      HIConsult.set("aiPreviews", data.images || []);

      if (typeof HI.incAIPreviewUsage === "function") {
        HI.incAIPreviewUsage();
      }

      gridEl.innerHTML = (data.images || []).map((src, idx) => `
        <img src="${src}" alt="AI Preview ${idx + 1}" style="width:100%;height:auto;border-radius:14px;border:1px solid var(--border);" />
      `).join("");

      const remaining = typeof HI.remainingAIPreviews === "function"
        ? HI.remainingAIPreviews()
        : null;

      statusEl.textContent =
        `${(data.images || []).length} preview(s) generated.` +
        (remaining !== null ? ` ${remaining} credit(s) remaining this month.` : "");

      hiToast("AI preview ready", "success");
    } catch (err) {
      console.error(err);
      statusEl.textContent = "";
      hiToast(err.message || "Could not generate preview", "error", 2500);
    }
  });
}


