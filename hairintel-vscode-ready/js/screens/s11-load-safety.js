/* ================================================================
   S11 — HAIR LOAD SAFETY SCORE
   ================================================================ */
function renderS11LoadSafety(params = {}) {
  const consultId = params.consultId || HIConsult.get('consultId');
  const consult = consultId ? HI.getConsults().find(c => c.id === consultId) : null;
  const result  = consult?.result || HIConsult.get('result');
  if (!result) return `<div class="hi-screen"><div class="hi-content"><p class="hi-body">No data.</p></div></div>`;

  const { capacity, plan, readiness } = result;
  const isSafe = capacity.status === 'SAFE';
  const isBorderline = capacity.status === 'BORDERLINE';
  const statusColor = isSafe ? 'var(--success)' : isBorderline ? 'var(--warning)' : 'var(--danger)';
  const statusBg    = isSafe ? 'rgba(34,197,94,0.08)' : isBorderline ? 'rgba(234,179,8,0.08)' : 'rgba(239,68,68,0.08)';

  /* Build bar segments: 0–safeMin(yellow), safeMin–safeMax(green), safeMax+(red) */
  const maxBar = Math.max(capacity.safeMax * 1.5, plan.grams * 1.2);
  const safeMinPct  = (capacity.safeMin / maxBar * 100).toFixed(1);
  const safeMaxPct  = (capacity.safeMax / maxBar * 100).toFixed(1);
  const recPct      = ((plan.grams) / maxBar * 100).toFixed(1);

  return `
  <div class="hi-screen hi-animate-fade" id="screen-load-safety">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Load Safety</div><div class="hi-header-sub">Hair Capacity Analysis</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">
      <div class="hi-mb-4">
        <h2 class="hi-heading hi-mb-2">Hair Load Safety Score</h2>
        <p class="hi-body">This score represents your client's hair capacity to safely support extension weight without risk of damage or excessive strain.</p>
      </div>

      <!-- Score Card -->
      <div class="hi-card hi-mb-4" style="background:${statusBg};border-color:${statusColor}30;text-align:center;padding:28px 20px;">
        ${hiScoreRing(capacity.score, statusColor, 140)}
        <div style="margin-top:14px;">
          <span class="hi-readiness-badge" style="background:${statusBg};border-color:${statusColor};color:${statusColor};">
            ${capacity.status}
          </span>
        </div>
        <p style="font-size:13px;color:var(--text-muted);margin-top:10px;line-height:1.5;">
          ${isSafe
            ? 'Recommended load is within safe capacity range.'
            : isBorderline
              ? 'Recommended load is close to the safe maximum. Consider reducing grams or increasing placement caution.'
              : 'Recommended load may exceed safe capacity. Consider reducing grams.'}
        </p>
      </div>

      <!-- Load Range Visual -->
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Safe Load Range</div>
        <div style="position:relative;margin-bottom:8px;">
          <!-- Background bar -->
          <div style="height:10px;border-radius:5px;background:var(--border);overflow:hidden;position:relative;">
            <!-- Yellow zone: 0 to safeMin -->
            <div style="position:absolute;left:0;top:0;height:100%;width:${safeMinPct}%;background:rgba(234,179,8,0.5);"></div>
            <!-- Green zone: safeMin to safeMax -->
            <div style="position:absolute;left:${safeMinPct}%;top:0;height:100%;width:${(safeMaxPct-safeMinPct).toFixed(1)}%;background:rgba(34,197,94,0.6);"></div>
            <!-- Red zone: safeMax+ -->
            <div style="position:absolute;left:${safeMaxPct}%;top:0;height:100%;right:0;background:rgba(239,68,68,0.4);"></div>
            <!-- Recommended dot -->
            <div id="load-dot" style="position:absolute;top:-4px;left:${recPct}%;width:18px;height:18px;border-radius:50%;background:var(--gold);border:2px solid var(--bg);transform:translateX(-50%);transition:left 1s ease;"></div>
          </div>
          <!-- Labels below -->
          <div style="display:flex;justify-content:space-between;margin-top:6px;">
            <span style="font-size:11px;color:var(--text-muted);">0g</span>
            <span style="font-size:11px;color:var(--success);">${capacity.safeMin}g–${capacity.safeMax}g safe</span>
            <span style="font-size:11px;color:var(--text-muted);">${Math.round(maxBar)}g</span>
          </div>
        </div>

        <!-- Stats Row -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;">
          ${[
            { label:'Min Safe',     val:`${capacity.safeMin}g`,    color:'var(--warning)' },
            { label:'Recommended',  val:`${capacity.recommended}g`,color:'var(--gold)' },
            { label:'Max Safe',     val:`${capacity.safeMax}g`,    color:'var(--success)' }
          ].map(s => `
          <div style="text-align:center;padding:10px 6px;background:var(--bg-raised);border-radius:10px;border:1px solid var(--border);">
            <div style="font-size:16px;font-weight:700;color:${s.color};">${s.val}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${s.label}</div>
          </div>`).join('')}
        </div>
      </div>

      <!-- Safety Factors -->
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Safety Assessment Factors</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${[
            { factor:'Hair Density',        note: consult?.hairProfile?.density ? hiCapitalize(consult.hairProfile.density) + ' density' : 'Assessed' },
            { factor:'Structural Integrity', note: result.integrityScore + '/100' },
            { factor:'Extension Weight',     note: plan.grams + 'g recommended load' },
            { factor:'Row Distribution',     note: plan.rows + ' row' + (plan.rows !== 1 ? 's' : '') + ' distributed' }
          ].map(f => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light);">
            <span style="font-size:13px;color:var(--text-muted);">${f.factor}</span>
            <span style="font-size:13px;font-weight:600;color:var(--text);">${f.note}</span>
          </div>`).join('')}
        </div>
      </div>

      <!-- Note -->
      <div class="hi-disclaimer hi-mb-4" style="margin-bottom:16px;">
        Hair load safety calculations are based on observed density, integrity score, and standard extension weight ranges. Physical assessment by a licensed stylist is always required before installation.
      </div>

      <!-- Navigation -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="hi-btn hi-btn-gold" onclick="HIApp.go('outcome', { consultId: '${consultId}' })">
          View Projected Outcome →
        </button>
        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('install-plan', { consultId: '${consultId}' })">Back to Install Plan</button>
      </div>
    </div>
  </div>`;
}

function initS11LoadSafety() {
  /* Animate the indicator dot */
  setTimeout(() => {
    const dot = hEl('load-dot');
    if (dot) {
      const orig = dot.style.left;
      dot.style.left = '0%';
      setTimeout(() => { dot.style.left = orig; }, 50);
    }
  }, 100);
}

/* ================================================================
   S12 — PROJECTED OUTCOME
   ================================================================ */
function renderS12Outcome(params = {}) {
  const consultId = params.consultId || HIConsult.get('consultId');
  const consult = consultId ? HI.getConsults().find(c => c.id === consultId) : null;
  const result  = consult?.result || HIConsult.get('result');
  if (!result) return `<div class="hi-screen"><div class="hi-content"><p class="hi-body">No data.</p></div></div>`;

  const { plan, readiness } = result;
  const hp = consult?.hairProfile || {};
  const goals = consult?.goals || {};

  const currentLengthMap = {
    'pixie':'~2–3"', 'chin':'~10–11"', 'shoulder':'~14–16"',
    'chest':'~18–20"', 'mid-back':'~22–24"', 'waist':'~26–28"'
  };
  const densityLabelMap = { low:'Sparse', medium:'Normal', high:'Full' };
  const addInches = goals.desiredLength === 'maintain' ? 0
    : parseInt(goals.desiredLength?.replace('+','') || '0');
  const extLen = plan.extensionLength !== 'N/A' ? plan.extensionLength : 'N/A';

  const projectedFullness = {
    low:    { subtle:'Moderate', noticeable:'Full',    dramatic:'Very Full'  },
    medium: { subtle:'Full',     noticeable:'Very Full',dramatic:'Ultra Full' },
    high:   { subtle:'Full',     noticeable:'Ultra Full',dramatic:'Max Full'  }
  };
  const fullnessLabel = projectedFullness[hp.density || 'medium']?.[goals.transformLevel || 'noticeable'] || 'Full';

  const isRed = readiness === 'red';

  return `
  <div class="hi-screen hi-animate-fade" id="screen-outcome">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Projected Outcome</div><div class="hi-header-sub">Expected Results</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">
      <div class="hi-mb-4">
        <h2 class="hi-heading hi-mb-2">Expected Transformation</h2>
        <p class="hi-body">Based on the install plan and client's hair profile, here is the projected transformation outcome.</p>
      </div>

      ${isRed ? `
      <div class="hi-card hi-mb-4" style="border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.05);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <span style="color:var(--danger);">${HIcons.warning}</span>
          <span class="hi-label" style="color:var(--danger);">Installation Not Recommended</span>
        </div>
        <p class="hi-body" style="font-size:13px;">An outcome projection is not available because the consultation resulted in a RED readiness status. No install should proceed at this time.</p>
      </div>
      ` : `

      <!-- Panels Grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">

        <!-- Current State -->
        <div class="hi-card" style="padding:16px;">
          <div class="hi-label hi-mb-3" style="font-size:10px;">CURRENT HAIR</div>
          <div class="hi-outcome-visual" style="background:linear-gradient(180deg,#2a2a2a,#1a1a1a);">
            <svg viewBox="0 0 80 100" style="width:100%;height:100%;opacity:0.6;">
              <ellipse cx="40" cy="35" rx="22" ry="28" fill="var(--text-muted)"/>
              <path d="M18 60 Q40 55 62 60 L65 100 H15Z" fill="var(--text-muted)" opacity="0.7"/>
              ${hp.density === 'low'
                ? `<path d="M22 55 Q40 48 58 55" stroke="var(--border)" stroke-width="1" fill="none"/>
                   <path d="M20 68 Q40 60 60 68" stroke="var(--border)" stroke-width="1" fill="none"/>`
                : `<path d="M20 55 Q40 47 60 55" stroke="var(--border)" stroke-width="1.5" fill="none"/>
                   <path d="M18 65 Q40 56 62 65" stroke="var(--border)" stroke-width="1.5" fill="none"/>
                   <path d="M20 75 Q40 66 60 75" stroke="var(--border)" stroke-width="1.5" fill="none"/>`
              }
            </svg>
          </div>
          <div style="margin-top:10px;">
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px;">${hp.length ? hiCapitalize(hp.length) : 'Current'} Length</div>
            <div style="font-size:11px;color:var(--text-muted);">${currentLengthMap[hp.length] || ''} · ${densityLabelMap[hp.density] || ''} density</div>
          </div>
        </div>

        <!-- Projected State -->
        <div class="hi-card" style="padding:16px;border-color:var(--gold-border);background:var(--gold-pale);">
          <div class="hi-label hi-mb-3" style="font-size:10px;color:var(--gold);">PROJECTED RESULT</div>
          <div class="hi-outcome-visual" style="background:linear-gradient(180deg,#1A1508,#121212);border-color:var(--gold-border);">
            <svg viewBox="0 0 80 100" style="width:100%;height:100%;">
              <ellipse cx="40" cy="30" rx="22" ry="26" fill="var(--text-muted)" opacity="0.9"/>
              <path d="M16 55 Q40 50 64 55 L70 100 H10Z" fill="var(--text-muted)" opacity="0.85"/>
              <!-- Extension rows -->
              <path d="M14 60 Q40 54 66 60" stroke="${'var(--gold)'}" stroke-width="2" fill="none" opacity="0.8"/>
              <path d="M12 72 Q40 65 68 72" stroke="${'var(--gold)'}" stroke-width="1.5" fill="none" opacity="0.6"/>
              ${plan.rows >= 3 ? `<path d="M14 84 Q40 77 66 84" stroke="var(--gold)" stroke-width="1.5" fill="none" opacity="0.4"/>` : ''}
              <!-- Length indicator -->
              <line x1="70" y1="55" x2="70" y2="95" stroke="var(--gold)" stroke-width="1" stroke-dasharray="2,2" opacity="0.5"/>
              <text x="72" y="60" fill="var(--gold)" font-size="6" opacity="0.7">${extLen}</text>
            </svg>
          </div>
          <div style="margin-top:10px;">
            <div style="font-size:13px;font-weight:600;color:var(--gold);margin-bottom:4px;">${fullnessLabel} Volume</div>
            <div style="font-size:11px;color:var(--text-muted);">${addInches > 0 ? `+${addInches}" added · ` : ''}${extLen} extensions</div>
          </div>
        </div>
      </div>

      <!-- Outcome Details -->
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Outcome Projection Details</div>
        <div style="display:flex;flex-direction:column;gap:0;">
          ${[
            { label:'Projected Fullness',      val: fullnessLabel },
            { label:'Added Length',             val: addInches > 0 ? `+${addInches} inches` : 'Length maintained' },
            { label:'Extension Method',         val: plan.method },
            { label:'Extension Length',         val: extLen },
            { label:'First Maintenance',        val: plan.maintenance ? `In ${plan.maintenance}` : 'Per plan' },
            { label:'Blend Quality',            val: hp.density === 'high' ? 'Excellent' : hp.density === 'medium' ? 'Very Good' : 'Good with care' }
          ].map((r, i, arr) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;${i < arr.length-1 ? 'border-bottom:1px solid var(--border-light);' : ''}">
            <span style="font-size:13px;color:var(--text-muted);">${r.label}</span>
            <span style="font-size:13px;font-weight:600;color:var(--text);">${r.val}</span>
          </div>`).join('')}
        </div>
      </div>
      `}

      <!-- Navigation -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="hi-btn hi-btn-gold" onclick="HIApp.go('summary', { consultId: '${consultId}' })">
          View Consultation Summary →
        </button>
        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('load-safety', { consultId: '${consultId}' })">Back to Load Safety</button>
      </div>
    </div>
  </div>`;
}

function initS12Outcome() {}
