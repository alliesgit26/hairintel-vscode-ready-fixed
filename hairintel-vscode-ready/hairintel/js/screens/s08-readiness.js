/* ================================================================
   S08 - HAIR READINESS SCORE
   ================================================================ */
function renderS08Readiness(params = {}) {
  const consultId = params.consultId || HIConsult.get('consultId');
  let consult = null;
  if (consultId) {
    consult = HI.getConsults().find(c => c.id === consultId);
  }
  const result = consult?.result || HIConsult.get('result');
  if (!result) {
    return `<div class="hi-screen"><div class="hi-content" style="padding-top:60px;text-align:center;"><p class="hi-body">No analysis data found.</p><button class="hi-btn hi-btn-gold" onclick="HIApp.go('welcome')">Start Over</button></div></div>`;
  }

  const client = consult?.clientId ? HI.getClients().find(c => c.id === consult.clientId) : null;
  const clientName = client ? `${client.firstName} ${client.lastName}` : (consult?.clientInfo?.firstName || 'Client');

  const { readiness, integrityScore, warnings, plan } = result;
  const isGreen  = readiness === 'green';
  const isYellow = readiness === 'yellow';
  const isRed    = readiness === 'red';

  const scoreColor = isGreen ? 'var(--success)' : isYellow ? 'var(--warning)' : 'var(--danger)';
  const badgeClass = isGreen ? 'badge-green' : isYellow ? 'badge-yellow' : 'badge-red';
  const badgeLabel = isGreen ? 'CLEARED FOR INSTALL' : isYellow ? 'MODIFIED INSTALL' : 'NOT RECOMMENDED';
  const badgeIcon  = isGreen
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>`
    : isYellow
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

  const redRecovery = isRed ? `
  <div class="hi-card hi-mb-4" style="border-color:var(--danger);border-opacity:0.3;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <span style="color:var(--danger);">${HIcons.warning}</span>
      <div class="hi-label" style="color:var(--danger);">Recovery Plan Required</div>
    </div>
    <p class="hi-body hi-mb-3">Before extensions can be safely installed, the following steps are recommended:</p>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${[
        'Begin a weekly strengthening treatment protocol (e.g., Olaplex, K18, bond repair)',
        'Avoid additional chemical processing for a minimum of 6-8 weeks',
        'Trim compromised ends to remove structural damage',
        'Address any scalp condition with a dermatology referral if present',
        'Increase dietary protein and supplement with biotin if appropriate',
        'Schedule a re-assessment in 6-12 weeks'
      ].map((s,i) => `
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <div style="width:20px;height:20px;border-radius:50%;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
          <span style="font-size:10px;font-weight:700;color:var(--danger);">${i+1}</span>
        </div>
        <span style="font-size:13px;color:var(--text-sub);line-height:1.5;">${s}</span>
      </div>`).join('')}
    </div>
  </div>` : '';

  return `
  <div class="hi-screen hi-animate-fade" id="screen-readiness">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.go('welcome')">${HIcons.back} Home</button>
      <div class="hi-text-center"><div class="hi-header-title">Hair Readiness</div><div class="hi-header-sub">Analysis Result</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">

      <!-- Score Hero -->
      <div class="hi-readiness-hero" style="border-color:${scoreColor};">
        <div style="text-align:center;margin-bottom:20px;">
          ${hiScoreRing(integrityScore, scoreColor, 130)}
          <div style="margin-top:10px;">
            <span class="hi-readiness-badge ${badgeClass}">${badgeIcon} ${badgeLabel}</span>
          </div>
        </div>
        <div style="text-align:center;">
          <div class="hi-label" style="margin-bottom:4px;">${clientName}</div>
          <div style="font-size:13px;color:var(--text-muted);">Hair Integrity Score</div>
        </div>
      </div>

      <!-- Interpretation -->
      <div class="hi-card hi-mb-4" style="background:${isGreen ? 'rgba(34,197,94,0.06)' : isYellow ? 'rgba(234,179,8,0.06)' : 'rgba(239,68,68,0.06)'};border-color:${scoreColor}30;">
        <p class="hi-body" style="font-size:14px;line-height:1.7;">
          ${isGreen
            ? `Hair density and structural integrity fully support a standard extension install. Proceed with the recommended plan for optimal results.`
            : isYellow
            ? `Hair supports extensions with a modified approach. Certain zones and tension levels require adjustment. Follow the install modifications in the plan to protect hair health.`
            : `Hair integrity is too compromised for a safe install at this time. Proceeding risks breakage, traction damage, or further hair loss. Review the recovery plan below.`
          }
        </p>
      </div>

      <!-- Warnings / Flags -->
      ${warnings.length > 0 ? `
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">
          <span style="color:var(--warning);">${HIcons.warning}</span>&nbsp; Analysis Flags
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${warnings.map(w => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:8px;background:rgba(234,179,8,0.06);border-radius:8px;border:1px solid rgba(234,179,8,0.15);">
            <span style="color:var(--warning);flex-shrink:0;margin-top:1px;">${HIcons.warning}</span>
            <span style="font-size:13px;color:var(--text-sub);line-height:1.5;">${w}</span>
          </div>`).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Recovery Plan (RED only) -->
      ${redRecovery}

      <!-- Method Preview (non-RED) -->
      ${!isRed ? `
      <div class="hi-card hi-mb-4" style="border-color:var(--gold-border);">
        <div class="hi-label hi-mb-3" style="color:var(--gold);">Recommended Method</div>
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:44px;height:44px;border-radius:12px;background:var(--gold-pale);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;color:var(--gold);">
            ${HIcons.scissors}
          </div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:2px;">${plan.method}</div>
            <div style="font-size:12px;color:var(--text-muted);">${plan.rows} row${plan.rows !== 1 ? 's' : ''} - ${plan.grams}g - ${plan.extensionLength} - ${plan.complexity}</div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Navigation -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${!isRed ? `
        <button class="hi-btn hi-btn-gold" onclick="HIApp.go('placement', { consultId: '${consultId}' })">
          ${HIcons.map} &nbsp;View Placement Map
        </button>
        <button class="hi-btn hi-btn-outline" onclick="HIApp.go('install-plan', { consultId: '${consultId}' })">
          View Full Install Plan
        </button>
        ` : `
        <button class="hi-btn hi-btn-gold" onclick="HIApp.go('summary', { consultId: '${consultId}' })">
          View Consultation Summary
        </button>
        `}
        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('welcome')">Back to Dashboard</button>
      </div>

      <!-- Disclaimer -->
      <div class="hi-disclaimer">
        This readiness score is a decision-support tool for licensed professionals. Final service decisions must be based on in-person professional judgment. HairIntel AI does not replace professional expertise.
      </div>

    </div>
  </div>`;
}

function initS08Readiness(params = {}) {
  /* Score ring animation */
  setTimeout(() => {
    const circles = document.querySelectorAll('#screen-readiness .hi-score-ring svg circle:last-child');
    circles.forEach(c => { c.style.transition = 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)'; });
  }, 100);
}

