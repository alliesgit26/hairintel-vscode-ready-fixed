/* ================================================================
   S03 — CLIENT PHOTOS (standalone render/init — called from s02)
   ================================================================ */
/* ================================================================
   S03 — CLIENT PHOTOS (gallery + camera)
   ================================================================ */
function renderS03Photos() {
  const photos = HIConsult.get('photos') || {};
  const slots = [
    { id:'photo-front', label:'Front View',  sub:'Required',     required:true,  camera:'user' },
    { id:'photo-back',  label:'Back of Head',sub:'Required',     required:true,  camera:'environment' },
    { id:'photo-left',  label:'Left Side',   sub:'Recommended',  required:false, camera:'user' },
    { id:'photo-right', label:'Right Side',  sub:'Recommended',  required:false, camera:'user' },
    { id:'photo-inspo', label:'Inspiration', sub:'Optional',     required:false, camera:'user' }
  ];

  return `
  <div class="hi-screen" id="screen-photos">
    ${hiProgressBar(1, 6)}
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center">
        <div class="hi-header-title">Client Photos</div>
        <div class="hi-header-sub">Step 2 of 6</div>
      </div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">
      <div class="hi-mb-4">
        <h2 class="hi-heading hi-mb-2">Client Photos</h2>
        <p class="hi-body">Upload real client angles from their gallery or take photos now. These images will also power the AI extension preview.</p>
      </div>

      <div class="hi-banner hi-banner-info hi-mb-4">
        <span class="hi-banner-icon">${HIcons.info}</span>
        <div>
          <div style="font-weight:600;color:var(--gold);margin-bottom:4px;font-size:12px;">Best Results</div>
          <ul style="font-size:12px;color:var(--text-muted);line-height:1.8;">
            <li>· Natural light</li>
            <li>· Hair down and brushed</li>
            <li>· Neutral background if possible</li>
            <li>· Front + back are strongly recommended for AI previews</li>
          </ul>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:18px;">
        ${slots.map((p) => {
          const hasPhoto = !!photos[p.id];
          return `
          <div class="hi-card" id="${p.id}-wrap">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
              <div>
                <div style="font-size:14px;font-weight:700;color:var(--text);">${p.label}</div>
                <div style="font-size:12px;color:${p.required ? 'var(--warning)' : 'var(--text-muted)'};">${p.sub}</div>
              </div>
              ${hasPhoto ? `<span class="badge badge-green">Uploaded</span>` : ''}
            </div>

            <div id="${p.id}-card" class="hi-photo-upload" style="min-height:180px;${hasPhoto ? 'padding:0;overflow:hidden;' : ''}">
              ${hasPhoto ? `
                <div style="position:relative;width:100%;height:180px;">
                  <img class="hi-photo-preview" src="${photos[p.id]}" alt="${p.label}" style="width:100%;height:100%;object-fit:cover;" />
                  <div class="hi-photo-preview-overlay">
                    <span style="color:white;font-size:12px;font-weight:600;">Replace Photo</span>
                  </div>
                </div>
              ` : `
                <span class="hi-photo-upload-icon">${HIcons.camera}</span>
                <div class="hi-photo-upload-label">${p.label}</div>
                <div class="hi-photo-upload-sub">${p.sub}</div>
              `}
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
              <button class="hi-btn hi-btn-outline" type="button" onclick="triggerGalleryUpload('${p.id}')">
                Choose From Gallery
              </button>
              <button class="hi-btn hi-btn-gold" type="button" onclick="triggerCameraUpload('${p.id}')">
                Take Photo
              </button>
            </div>

            <input
              type="file"
              id="${p.id}-gallery"
              accept="image/*"
              style="display:none;"
              onchange="handlePhotoUpload('${p.id}', this)"
            />

            <input
              type="file"
              id="${p.id}-camera"
              accept="image/*"
              capture="${p.camera}"
              style="display:none;"
              onchange="handlePhotoUpload('${p.id}', this)"
            />
          </div>`;
        }).join('')}
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="hi-btn hi-btn-gold" id="photos-next-btn">Continue →</button>
        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('goals')">Skip Optional Photos</button>
      </div>
    </div>
  </div>`;
}

function initS03Photos() {
  window.triggerGalleryUpload = (id) => {
    hEl(`${id}-gallery`)?.click();
  };

  window.triggerCameraUpload = (id) => {
    hEl(`${id}-camera`)?.click();
  };

  window.handlePhotoUpload = (id, input) => {
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      hiToast('Please choose an image file.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const photos = HIConsult.get('photos') || {};
      photos[id] = e.target.result;
      HIConsult.set('photos', photos);
      HIApp.go('photos', {}, false);
      hiToast('Photo added', 'success', 1400);
    };
    reader.readAsDataURL(file);
  };

  hEl('photos-next-btn')?.addEventListener('click', () => {
    const photos = HIConsult.get('photos') || {};
    if (!photos['photo-front'] || !photos['photo-back']) {
      hiToast('Front and back photos are required for the best AI preview.', 'warning');
      return;
    }
    HIApp.go('goals');
  });
}

/* ================================================================
   S04 — CLIENT GOALS (standalone)
   ================================================================ */
function renderS04Goals() {
  return `
  <div class="hi-screen" id="screen-goals">
    ${hiProgressBar(2, 6)}
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Client Goals</div><div class="hi-header-sub">Step 3 of 6</div></div>
      <div class="hi-header-action"></div>
    </div>
    <div class="hi-content">
      <div class="hi-mb-5">
        <h2 class="hi-heading hi-mb-2">Client Objectives</h2>
        <p class="hi-body">Goal selection shapes the install recommendation. Length increase means inches added to the current hair, not the final extension length.</p>
      </div>
      <div class="hi-card hi-mb-3">
        <div class="hi-label hi-mb-3">Primary Goal</div>
        <div class="hi-options" data-option-group="goal" id="goal-group">
          ${[
            {val:'add-volume',    label:'Add Volume'},
            {val:'add-length',    label:'Add Length'},
            {val:'volume-length', label:'Volume + Length'},
            {val:'color-blend',   label:'Color Blending'},
            {val:'correction',    label:'Extension Correction'}
          ].map(o=>`<div class="hi-option" data-val="${o.val}">${o.label}</div>`).join('')}
        </div>
      </div>
      <div class="hi-card hi-mb-3">
        <div class="hi-label hi-mb-3">Desired Transformation Level</div>
        <div class="hi-options" data-option-group="transform" id="transform-group" style="flex-direction:column;gap:8px;">
          ${[
            {val:'subtle',    label:'Subtle',    sub:'Natural enhancement — barely there'},
            {val:'noticeable',label:'Noticeable',sub:'Clear, visible difference'},
            {val:'dramatic',  label:'Dramatic',  sub:'Full transformation — maximum impact'}
          ].map(o=>`
          <div class="hi-option" data-val="${o.val}" style="width:100%;display:flex;justify-content:space-between;text-align:left;">
            <span style="font-weight:600;">${o.label}</span>
            <span style="font-size:12px;color:var(--text-muted);">${o.sub}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="hi-card hi-mb-5">
        <div class="hi-label hi-mb-3">Desired Length Increase (Inches Added)</div>
        <div class="hi-options" data-option-group="length" id="length-group">
          ${[
            {val:'maintain',label:'Maintain'},
            {val:'+2',      label:'+2"'},
            {val:'+4',      label:'+4"'},
            {val:'+6',      label:'+6"'},
            {val:'+8',      label:'+8"'}
          ].map(o=>`<div class="hi-option" data-val="${o.val}">${o.label}</div>`).join('')}
        </div>
      </div>
      <button class="hi-btn hi-btn-gold" id="goals-next-btn">Continue →</button>
    </div>
  </div>`;
}

function initS04Goals() {
  hiInitOptions(hEl('screen-goals'));
  hEl('goals-next-btn')?.addEventListener('click', () => {
    const goal      = hiGetSingle(hEl('goal-group'));
    const transform = hiGetSingle(hEl('transform-group'));
    const length    = hiGetSingle(hEl('length-group'));
    if (!goal || !transform || !length) { hiToast('Please complete all goal selections','warning'); return; }
    HIConsult.set('goals', { primaryGoal: goal, transformLevel: transform, desiredLength: length });
    HIApp.go('hair-profile');
  });
}
