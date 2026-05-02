/* ================================================================
   S03 — PHOTOS (file is s02 for bundling but logically screen 3)
   S04 — GOALS (same bundle)
   These are now co-located in s02-client-info.js
   This file holds S05 and S06
   ================================================================ */

/* ================================================================
   S05 — HAIR PROFILE
   ================================================================ */
function renderS05HairProfile() {
  return `
  <div class="hi-screen" id="screen-hair-profile">
    ${hiProgressBar(3, 6)}
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Hair Profile</div><div class="hi-header-sub">Step 4 of 6</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">
      <div class="hi-mb-5">
        <h2 class="hi-heading hi-mb-2">Stylist Assessment</h2>
        <p class="hi-body">Your professional evaluation of the client's current hair state.</p>
      </div>

      <!-- Density -->
      <div class="hi-card hi-mb-3">
        <div class="hi-label hi-mb-3">Current Hair Density</div>
        <div class="hi-options" data-option-group="density" id="density-group">
          <div class="hi-option" data-val="low" style="flex:1;">
            <div style="font-weight:600;font-size:14px;margin-bottom:2px;">Low</div>
            <div style="font-size:11px;color:var(--text-mutedfuntion);">Scalp visible through hair</div>
          </div>
          <div class="hi-option" data-val="medium" style="flex:1;">
            <div style="font-weight:600;font-size:14px;margin-bottom:2px;">Medium</div>
            <div style="font-size:11px;color:var(--text-muted);">Normal coverage</div>
          </div>
          <div class="hi-option" data-val="high" style="flex:1;">
            <div style="font-weight:600;font-size:14px;margin-bottom:2px;">High</div>
            <div style="font-size:11px;color:var(--text-muted);">Dense, full coverage</div>
          </div>
        </div>
      </div>

      <!-- Texture -->
      <div class="hi-card hi-mb-3">
        <div class="hi-label hi-mb-3">Hair Texture</div>
        <div class="hi-options" data-option-group="texture" id="texture-group">
          ${['straight','wavy','curly','coily'].map(t =>
            `<div class="hi-option" data-val="${t}">${hiCapitalize(t)}</div>`
          ).join('')}
        </div>
      </div>

      <!-- Current Length -->
      <div class="hi-card hi-mb-3">
        <div class="hi-label hi-mb-3">Current Hair Length</div>
        <div class="hi-options" data-option-group="length" id="hair-length-group" style="flex-direction:column;gap:6px;">
          ${[
            { val:'pixie',    label:'Pixie',    sub:'Above ear' },
            { val:'chin',     label:'Chin',     sub:'Jaw length' },
            { val:'shoulder', label:'Shoulder', sub:'At or above shoulder' },
            { val:'chest',    label:'Chest',    sub:'Below shoulder' },
            { val:'mid-back', label:'Mid-Back', sub:'Between shoulder and waist' },
            { val:'waist',    label:'Waist',    sub:'At or below waist' }
          ].map(l => `
          <div class="hi-option" data-val="${l.val}" style="display:flex;justify-content:space-between;width:100%;text-align:left;">
            <span style="font-weight:600;">${l.label}</span>
            <span style="font-size:12px;color:var(--text-muted);">${l.sub}</span>
          </div>`).join('')}
        </div>
      </div>

      <!-- Chemical History -->
      <div class="hi-card hi-mb-5">
        <div class="hi-label hi-mb-3">Chemical Processing History</div>
        <div class="hi-options" data-option-group="chem" id="chem-group" style="flex-direction:column;gap:6px;">
          ${[
            { val:'none',              label:'None',              sub:'Virgin hair' },
            { val:'color-treated',     label:'Color Treated',     sub:'Single-process color' },
            { val:'lightened',         label:'Lightened',         sub:'Highlights, balayage, or bleach' },
            { val:'heavily-processed', label:'Heavily Processed', sub:'Multiple bleach, chemical relaxer, etc.' }
          ].map(l => `
          <div class="hi-option" data-val="${l.val}" style="display:flex;justify-content:space-between;width:100%;text-align:left;">
            <span style="font-weight:600;">${l.label}</span>
            <span style="font-size:12px;color:var(--text-muted);">${l.sub}</span>
          </div>`).join('')}
        </div>
      </div>

      <button class="hi-btn hi-btn-gold" id="profile-next-btn">Continue →</button>
    </div>
  </div>`;
}

function initS05HairProfile() {
  hiInitOptions(hEl('screen-hair-profile'));
  hEl('profile-next-btn')?.addEventListener('click', () => {
    const density   = hiGetSingle(hEl('density-group'));
    const texture   = hiGetSingle(hEl('texture-group'));
    const length    = hiGetSingle(hEl('hair-length-group'));
    const chemHist  = hiGetSingle(hEl('chem-group'));
    if (!density || !texture || !length || !chemHist) {
      hiToast('Please complete all hair profile fields','warning');
      return;
    }
    HIConsult.set('hairProfile', { density, texture, length, chemHistory: chemHist });
    HIApp.go('concerns');
  });
}

/* ================================================================
   S06 — HAIR HEALTH & CONCERN CHECK
   ================================================================ */
function renderS06Concerns() {
  return `
  <div class="hi-screen" id="screen-concerns">
    ${hiProgressBar(4, 6)}
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Concern Check</div><div class="hi-header-sub">Step 5 of 6</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">
      <div class="hi-mb-5">
        <h2 class="hi-heading hi-mb-2">Health & Concern Assessment</h2>
        <p class="hi-body">This section is critical. Concern inputs directly modify the install recommendation and determine hair readiness.</p>
      </div>

      <!-- Section A: Stylist Observations -->
      <div class="hi-section-divider"><span class="hi-section-divider-text">Stylist Observations</span></div>

      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Observed Concern Areas</div>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.6;">Select all areas of concern you observe during physical assessment.</p>
        <div id="stylist-flags-group" data-option-group="stylist-flags" style="display:flex;flex-wrap:wrap;gap:8px;">
          ${[
            { val:'temple_thinning',       label:'Temple Thinning' },
            { val:'crown_thinning',        label:'Crown Thinning' },
            { val:'traction_alopecia',     label:'Traction Alopecia' },
            { val:'postpartum_hair_loss',  label:'Postpartum Loss' },
            { val:'fragile_perimeter',     label:'Fragile Perimeter' },
            { val:'uneven_density',        label:'Uneven Density' },
            { val:'breakage_zones',        label:'Breakage Zones' },
            { val:'chemical_damage',       label:'Chemical Damage' },
            { val:'short_crown_layers',    label:'Short Crown Layers' },
            { val:'prior_extension_damage',label:'Prior Extension Damage' },
            { val:'scalp_irritation',      label:'Scalp Irritation' },
            { val:'scalp_condition',       label:'Scalp Condition' },
            { val:'none_observed',         label:'None Observed' }
          ].map(f => `<div class="hi-tag" data-val="${f.val}">${f.label}</div>`).join('')}
        </div>

        <div style="margin-top:14px;">
          <label class="hi-field-label">Stylist Notes (optional)</label>
          <textarea class="hi-input" id="stylist-notes" placeholder="Additional observations not listed above..." style="min-height:72px;"></textarea>
        </div>
      </div>

      <!-- Section B: Client Reported -->
      <div class="hi-section-divider"><span class="hi-section-divider-text">Client-Reported Concerns</span></div>

      <!-- Scalp Sensitivity -->
      <div class="hi-card hi-mb-3">
        <div class="hi-label hi-mb-3">Scalp Sensitivity Level</div>
        <div class="hi-options" data-option-group="sensitivity" id="sensitivity-group">
          ${['none','mild','moderate','severe'].map(s =>
            `<div class="hi-option" data-val="${s}">${hiCapitalize(s)}</div>`
          ).join('')}
        </div>
      </div>

      <!-- Prior Extensions -->
      <div class="hi-card hi-mb-3">
        <div class="hi-label hi-mb-3">Has the Client Worn Extensions Before?</div>
        <div class="hi-options" data-option-group="prior-ext" id="prior-ext-group">
          <div class="hi-option" data-val="no" style="flex:1;" onclick="togglePriorIssues(false)">First Time</div>
          <div class="hi-option" data-val="yes" style="flex:1;" onclick="togglePriorIssues(true)">Yes</div>
        </div>
        <div id="prior-issues-section" style="display:none;margin-top:14px;">
          <div class="hi-label hi-mb-2">Issues Experienced</div>
          <div id="prior-issues-group" data-option-group="prior-issues" style="display:flex;flex-wrap:wrap;gap:8px;">
            ${['tension','headaches','breakage','matting','difficult maintenance','none'].map(i =>
              `<div class="hi-tag" data-val="${i}">${hiCapitalize(i)}</div>`
            ).join('')}
          </div>
        </div>
      </div>

      <!-- Sensitivity Location -->
      <div class="hi-card hi-mb-3">
        <div class="hi-label hi-mb-3">Scalp Sensitivity Location</div>
        <div id="sensitivity-loc-group" data-option-group="sensitivity-loc" style="display:flex;flex-wrap:wrap;gap:8px;">
          ${['temples','crown','nape','sides','entire scalp','none'].map(l =>
            `<div class="hi-tag" data-val="${l}">${hiCapitalize(l)}</div>`
          ).join('')}
        </div>
      </div>

      <!-- Shedding -->
      <div class="hi-card hi-mb-5">
        <div class="hi-label hi-mb-3">Shedding Level</div>
        <div class="hi-options" data-option-group="shedding" id="shedding-group">
          <div class="hi-option" data-val="normal">Normal</div>
          <div class="hi-option" data-val="increased">Increased</div>
          <div class="hi-option" data-val="heavy">Heavy Shedding</div>
        </div>
      </div>

      <button class="hi-btn hi-btn-gold" id="concerns-next-btn">
        ${HIcons.brain} &nbsp;Analyze Hair
      </button>
    </div>
  </div>`;
}

function initS06Concerns() {
  // single-select groups
  hiInitOptions(hEl('sensitivity-group'), false);
  hiInitOptions(hEl('prior-ext-group'), false);
  hiInitOptions(hEl('shedding-group'), false);

  // multi-select groups
  hiInitOptions(hEl('stylist-flags-group'), true);
  hiInitOptions(hEl('prior-issues-group'), true);
  hiInitOptions(hEl('sensitivity-loc-group'), true);

  window.togglePriorIssues = (show) => {
    const sec = hEl('prior-issues-section');
    if (sec) sec.style.display = show ? 'block' : 'none';
  };

  hEl('concerns-next-btn')?.addEventListener('click', () => {
    const sensitivity = hiGetSingle(hEl('sensitivity-group')) || 'none';
    const shedding    = hiGetSingle(hEl('shedding-group')) || 'normal';
    const priorExt    = hiGetSingle(hEl('prior-ext-group')) || 'no';
    const priorIssues = hiGetSelected(hEl('prior-issues-group'));
    const sensitLoc   = hiGetSelected(hEl('sensitivity-loc-group'));
    const stylistFlags = hiGetSelected(hEl('stylist-flags-group'));

    HIConsult.set('stylistFlags', stylistFlags.filter(f => f !== 'none_observed'));
    HIConsult.set('stylistNotes', hEl('stylist-notes')?.value.trim() || '');
    HIConsult.set('clientFlags', {
      scalp_sensitivity: sensitivity,
      prior_extensions: priorExt,
      prior_extension_issues: priorIssues,
      sensitivity_location: sensitLoc,
      shedding
    });

    HIApp.go('analysis');
  });
}