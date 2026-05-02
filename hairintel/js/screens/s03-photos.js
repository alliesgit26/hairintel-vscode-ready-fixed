/* ================================================================
   S03 — CLIENT PHOTOS (standalone render/init — called from s02)
   ================================================================ */
function renderS03Photos() {
  return `
  <div class="hi-screen" id="screen-photos">
    ${hiProgressBar(1, 6)}
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Client Photos</div><div class="hi-header-sub">Step 2 of 6</div></div>
      <div class="hi-header-action"></div>
    </div>
    <div class="hi-content">
      <div class="hi-mb-4">
        <h2 class="hi-heading hi-mb-2">Upload Client Photos</h2>
        <p class="hi-body">Clear reference photos improve placement mapping and analysis accuracy.</p>
      </div>
      <div class="hi-banner hi-banner-info hi-mb-4">
        <span class="hi-banner-icon">${HIcons.info}</span>
        <div>
          <div style="font-weight:600;color:var(--gold);margin-bottom:4px;font-size:12px;">Photo Guidelines</div>
          <ul style="font-size:12px;color:var(--text-muted);line-height:1.8;">
            <li>· Natural lighting — no flash</li>
            <li>· Hair down and fully brushed</li>
            <li>· Shoot at shoulder height</li>
            <li>· Avoid filters or editing</li>
          </ul>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        ${[
          { id:'photo-back',  label:'Back of Head', sub:'Required',    required:true },
          { id:'photo-left',  label:'Left Side',    sub:'Recommended', required:false },
          { id:'photo-right', label:'Right Side',   sub:'Recommended', required:false },
          { id:'photo-inspo', label:'Inspiration',  sub:'Optional',    required:false }
        ].map(p => `
        <div class="hi-photo-upload" id="${p.id}-card" onclick="triggerPhotoUpload('${p.id}')">
          <input type="file" id="${p.id}-input" accept="image/*" style="display:none;" onchange="handlePhotoUpload('${p.id}', this)" />
          <span class="hi-photo-upload-icon">${HIcons.camera}</span>
          <div class="hi-photo-upload-label">${p.label}</div>
          <div class="hi-photo-upload-sub">${p.sub}</div>
        </div>`).join('')}
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="hi-btn hi-btn-gold" id="photos-next-btn">Continue →</button>
        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('goals')">Skip Photos</button>
      </div>
    </div>
  </div>`;
}

function initS03Photos() {
  window.triggerPhotoUpload = (id) => { hEl(`${id}-input`)?.click(); };
  window.handlePhotoUpload  = (id, input) => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const card = hEl(`${id}-card`);
      if (!card) return;
      card.classList.add('has-photo');
      card.innerHTML = `
        <img class="hi-photo-preview" src="${e.target.result}" alt="photo" />
        <div class="hi-photo-preview-overlay"><span style="color:white;font-size:12px;font-weight:600;">Tap to Replace</span></div>
        <input type="file" id="${id}-input" accept="image/*" style="display:none;" onchange="handlePhotoUpload('${id}', this)" />`;
      card.onclick = () => hEl(`${id}-input`)?.click();
      const photos = HIConsult.get('photos') || {};
      photos[id] = e.target.result;
      HIConsult.set('photos', photos);
    };
    reader.readAsDataURL(file);
  };
  hEl('photos-next-btn')?.addEventListener('click', () => HIApp.go('goals'));
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
        <p class="hi-body">Goal selection directly shapes the install recommendation and outcome projection.</p>
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
        <div class="hi-label hi-mb-3">Desired Length Increase</div>
        <div class="hi-options" data-option-group="length" id="length-group">
          ${[
            {val:'maintain',label:'Maintain'},
            {val:'+2',      label:'+2"'},
            {val:'+4',      label:'+4"'},
            {val:'+6',      label:'+6"'},
            {val:'+8',      label:'+8"+'}
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
