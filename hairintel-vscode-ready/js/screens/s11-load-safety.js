/* ================================================================
   S11 — LOAD SAFETY
   S12 — PROJECTED OUTCOME
   ================================================================ */

function renderS11LoadSafety(params = {}) {
  const consultId = params.consultId || HIConsult.get('consultId');
  const consult = consultId ? HI.getConsults().find(c => c.id === consultId) : null;
  const result = consult?.result || HIConsult.get('result');

  if (!result) {
    return `<div class="hi-screen"><div class="hi-content"><p class="hi-body">No data.</p></div></div>`;
  }

  const capacity = result.capacity || {};
  const plan = result.plan || {};
  const readiness = result.readiness || 'yellow';

  const status = capacity.status || 'UNKNOWN';
  const isSafe = status === 'SAFE';
  const isBorderline = status === 'BORDERLINE';
  const isOverload = status === 'OVERLOAD RISK';

  const statusColor = isSafe
    ? 'var(--success)'
    : isBorderline
      ? 'var(--warning)'
      : 'var(--danger)';

  const statusBg = isSafe
    ? 'rgba(34,197,94,0.08)'
    : isBorderline
      ? 'rgba(234,179,8,0.08)'
      : 'rgba(239,68,68,0.08)';

  const safeMin = Number(capacity.safeMin || 0);
  const safeMax = Number(capacity.safeMax || 0);
  const recommended = Number(capacity.recommended ?? plan.grams ?? 0);
  const requested = Number(capacity.requested ?? plan.originalGrams ?? recommended);
  const hasLoadOverride = !!plan.safetyOverride || !!capacity.safetyOverride || isOverload;

  const maxBar = Math.max(safeMax * 1.5, requested * 1.2, recommended * 1.2, 100);
  const safeMinPct = ((safeMin / maxBar) * 100).toFixed(1);
  const safeMaxPct = ((safeMax / maxBar) * 100).toFixed(1);
  const recPct = ((recommended / maxBar) * 100).toFixed(1);
  const requestedPct = ((requested / maxBar) * 100).toFixed(1);

  const safetyMessage = isSafe
    ? 'Recommended load is within safe capacity range.'
    : isBorderline
      ? 'Recommended load is close to the safe maximum. Consider reducing grams or increasing placement caution.'
      : hasLoadOverride
        ? `Original requested load of ${requested}g exceeded safe capacity and was capped to ${recommended}g.`
        : 'Recommended load may exceed safe capacity. Consider reducing grams.';

  return `
  <div class="hi-screen hi-animate-fade" id="screen-load-safety">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center">
        <div class="hi-header-title">Load Safety</div>
        <div class="hi-header-sub">Hair Capacity Analysis</div>
      </div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">
      <div class="hi-mb-4">
        <h2 class="hi-heading hi-mb-2">Hair Load Safety Score</h2>
        <p class="hi-body">This score represents your client's hair capacity to safely support extension weight without risk of damage or excessive strain.</p>
      </div>

      <div class="hi-card hi-mb-4" style="background:${statusBg};border-color:${statusColor}30;text-align:center;padding:28px 20px;">
        ${hiScoreRing(Number(capacity.score || 0), statusColor, 140)}
        <div style="margin-top:14px;">
          <span class="hi-readiness-badge" style="background:${statusBg};border-color:${statusColor};color:${statusColor};">
            ${status}
          </span>
        </div>
        <p style="font-size:13px;color:var(--text-muted);margin-top:10px;line-height:1.5;">
          ${safetyMessage}
        </p>
      </div>

      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Safe Load Range</div>

        <div style="position:relative;margin-bottom:8px;">
          <div style="height:10px;border-radius:5px;background:var(--border);overflow:hidden;position:relative;">
            <div style="position:absolute;left:0;top:0;height:100%;width:${safeMinPct}%;background:rgba(234,179,8,0.5);"></div>
            <div style="position:absolute;left:${safeMinPct}%;top:0;height:100%;width:${Math.max(0, safeMaxPct - safeMinPct).toFixed(1)}%;background:rgba(34,197,94,0.6);"></div>
            <div style="position:absolute;left:${safeMaxPct}%;top:0;height:100%;right:0;background:rgba(239,68,68,0.4);"></div>

            ${hasLoadOverride && requested > recommended ? `
            <div title="Original unsafe load" style="position:absolute;top:-3px;left:${requestedPct}%;width:16px;height:16px;border-radius:50%;background:var(--danger);border:2px solid var(--bg);transform:translateX(-50%);opacity:0.75;"></div>
            ` : ''}

            <div id="load-dot" title="Final recommended load" style="position:absolute;top:-4px;left:${recPct}%;width:18px;height:18px;border-radius:50%;background:var(--gold);border:2px solid var(--bg);transform:translateX(-50%);transition:left 1s ease;"></div>
          </div>

          <div style="display:flex;justify-content:space-between;margin-top:6px;">
            <span style="font-size:11px;color:var(--text-muted);">0g</span>
            <span style="font-size:11px;color:var(--success);">${safeMin}g-${safeMax}g safe</span>
            <span style="font-size:11px;color:var(--text-muted);">${Math.round(maxBar)}g</span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;">
          ${[
            { label:'Min Safe', val:`${safeMin}g`, color:'var(--warning)' },
            { label:'Final Recommended', val:`${recommended}g`, color:'var(--gold)' },
            { label:'Max Safe', val:`${safeMax}g`, color:'var(--success)' }
          ].map(s => `
          <div style="text-align:center;padding:10px 6px;background:var(--bg-raised);border-radius:10px;border:1px solid var(--border);">
            <div style="font-size:16px;font-weight:700;color:${s.color};">${s.val}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${s.label}</div>
          </div>`).join('')}
        </div>

        ${hasLoadOverride && requested > recommended ? `
        <div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.18);">
          <div style="font-size:12px;color:var(--danger);font-weight:700;margin-bottom:3px;">Unsafe load adjusted</div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.5;">
            Original plan requested ${requested}g, but calculated safe capacity is ${safeMax}g. HairIntel capped the final recommendation to ${recommended}g.
          </div>
        </div>
        ` : ''}
      </div>

      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Safety Assessment Factors</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${[
            { factor:'Hair Density', note: (consult?.hairProfile?.density === 'high' ? 'High density' : consult?.hairProfile?.density === 'medium' ? 'Medium density' : 'Low density') },
            { factor:'Structural Integrity', note: `${result.integrity || result.score || capacity.score || 0}/100` },
            { factor:'Final Extension Weight', note: `${recommended}g recommended load` },
            ...(hasLoadOverride && requested > recommended ? [{ factor:'Original Unsafe Load', note:`${requested}g not recommended` }] : []),
            { factor:'Row Distribution', note: (plan.rows || 0) + ' row' + ((plan.rows || 0) !== 1 ? 's' : '') + ' distributed' }
          ].map(f => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light);">
            <span style="font-size:13px;color:var(--text-muted);">${f.factor}</span>
            <span style="font-size:13px;font-weight:600;color:var(--text);text-align:right;">${f.note}</span>
          </div>`).join('')}
        </div>
      </div>

      <div class="hi-disclaimer hi-mb-4" style="margin-bottom:16px;">
        Hair load safety calculations are based on observed density, integrity score, and standard extension weight ranges. Physical assessment by a licensed stylist is always required before installation.
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="hi-btn hi-btn-gold" onclick="HIApp.go('outcome', { consultId: '${consultId}' })">
          View Projected Outcome
        </button>
        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('install-plan', { consultId: '${consultId}' })">Back to Install Plan</button>
      </div>
    </div>
  </div>`;
}

function initS11LoadSafety() {
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
  const result = consult?.result || HIConsult.get('result');

  if (!result) {
    return `<div class="hi-screen"><div class="hi-content"><p class="hi-body">No data.</p></div></div>`;
  }

  const plan = result.plan || {};
  const capacity = result.capacity || {};
  const readiness = result.readiness || 'yellow';
  const hp = consult?.hairProfile || {};
  const goals = consult?.goals || {};

  const hasLoadOverride = !!plan.safetyOverride || !!capacity.safetyOverride || capacity.status === 'OVERLOAD RISK';

  const currentLengthMap = {
    pixie: '~2-4"',
    chin: '~10-11"',
    shoulder: '~12-14"',
    collarbone: '~14-16"',
    midback: '~18-22"',
    long: '22"+'
  };

  const densityLabelMap = {
    low: 'Sparse',
    medium: 'Normal',
    high: 'Full'
  };

  const addInches = goals.desiredLength === 'maintain'
    ? 0
    : goals.desiredLength === 'plus4'
      ? 4
      : goals.desiredLength === 'plus6'
        ? 6
        : goals.desiredLength === 'plus8'
          ? 8
          : goals.desiredLength === 'plus10'
            ? 10
            : 0;

  const extLen = plan.extensionLength && plan.extensionLength !== 'N/A'
    ? plan.extensionLength
    : 'N/A';

  const projectedFullness = {
    low:    { subtle:'Moderate', noticeable:'Full', dramatic:'Very Full' },
    medium: { subtle:'Full', noticeable:'Very Full', dramatic:'Ultra Full' },
    high:   { subtle:'Full', noticeable:'Ultra Full', dramatic:'Max Full' }
  };

  const fullnessLabel = hasLoadOverride
    ? (plan.outcomeOverride?.fullness || 'Staged / Conservative')
    : projectedFullness[hp.density || 'medium']?.[goals.transformLevel || 'noticeable'] || 'Full';

  const blendQuality = hasLoadOverride
    ? (plan.outcomeOverride?.blendQuality || 'High-risk blend - advanced cutting required')
    : hp.density === 'high'
      ? 'Excellent'
      : hp.density === 'medium'
        ? 'Very Good'
        : 'Good with care';

  const addedLengthLabel = hasLoadOverride
    ? (plan.outcomeOverride?.addedLength || 'Staged goal; not guaranteed in one appointment')
    : `${addInches > 0 ? '+' + addInches + ' inches' : 'Maintain length'}`;

  const isRed = readiness === 'red';

  return `
  <div class="hi-screen hi-animate-fade" id="screen-outcome">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center">
        <div class="hi-header-title">Projected Outcome</div>
        <div class="hi-header-sub">Expected Results</div>
      </div>
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
      ` : ''}

      ${hasLoadOverride ? `
      <div class="hi-card hi-mb-4" style="border-color:rgba(239,68,68,0.25);background:rgba(239,68,68,0.05);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="color:var(--danger);">${HIcons.warning}</span>
          <span class="hi-label" style="color:var(--danger);">Conservative Projection Required</span>
        </div>
        <p class="hi-body" style="font-size:13px;">
          This outcome should be treated as staged and conservative because the original requested load exceeded calculated safe capacity.
        </p>
      </div>
      ` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
        <div class="hi-card" style="padding:16px;">
          <div class="hi-label hi-mb-3" style="font-size:10px;">Current Hair</div>
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
            <div style="font-size:11px;color:var(--text-muted);">${currentLengthMap[hp.length] || ''} - ${densityLabelMap[hp.density] || ''} density</div>
          </div>
        </div>

        <div class="hi-card" style="padding:16px;border-color:${hasLoadOverride ? 'rgba(239,68,68,0.25)' : 'var(--gold-border)'};background:${hasLoadOverride ? 'rgba(239,68,68,0.04)' : 'var(--gold-pale)'};">
          <div class="hi-label hi-mb-3" style="font-size:10px;color:${hasLoadOverride ? 'var(--danger)' : 'var(--gold)'};">Projected Result</div>
          <div class="hi-outcome-visual" style="background:linear-gradient(180deg,#1A1508,#121212);border-color:${hasLoadOverride ? 'rgba(239,68,68,0.25)' : 'var(--gold-border)'};">
            <svg viewBox="0 0 80 100" style="width:100%;height:100%;">
              <ellipse cx="40" cy="30" rx="22" ry="26" fill="var(--text-muted)" opacity="0.9"/>
              <path d="M16 55 Q40 50 64 55 L70 100 H10Z" fill="var(--text-muted)" opacity="0.85"/>
              <path d="M14 60 Q40 54 66 60" stroke="${hasLoadOverride ? 'var(--danger)' : 'var(--gold)'}" stroke-width="2" fill="none" opacity="0.8"/>
              <path d="M12 72 Q40 65 68 72" stroke="${hasLoadOverride ? 'var(--danger)' : 'var(--gold)'}" stroke-width="1.5" fill="none" opacity="0.6"/>
              ${!hasLoadOverride && plan.rows >= 3 ? `<path d="M14 84 Q40 77 66 84" stroke="var(--gold)" stroke-width="1.5" fill="none" opacity="0.4"/>` : ''}
              <line x1="70" y1="55" x2="70" y2="95" stroke="${hasLoadOverride ? 'var(--danger)' : 'var(--gold)'}" stroke-width="1" stroke-dasharray="2,2" opacity="0.5"/>
              <text x="72" y="60" fill="${hasLoadOverride ? 'var(--danger)' : 'var(--gold)'}" font-size="5.5" opacity="0.8">${extLen}</text>
            </svg>
          </div>
          <div style="margin-top:10px;">
            <div style="font-size:13px;font-weight:600;color:${hasLoadOverride ? 'var(--danger)' : 'var(--gold)'};margin-bottom:4px;">${fullnessLabel} Volume</div>
            <div style="font-size:11px;color:var(--text-muted);">${addedLengthLabel} - ${extLen} extensions</div>
          </div>
        </div>
      </div>

      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Outcome Projection Details</div>
        <div style="display:flex;flex-direction:column;gap:0;">
          ${[
            { label:'Projected Fullness', val: fullnessLabel },
            { label:'Added Length', val: addedLengthLabel },
            { label:'Extension Method', val: plan.method || 'N/A' },
            { label:'Extension Length', val: extLen },
            { label:'Final Recommended Load', val: `${capacity.recommended ?? plan.grams ?? 0}g` },
            ...(hasLoadOverride && plan.originalGrams ? [{ label:'Original Unsafe Load', val:`${plan.originalGrams}g not recommended` }] : []),
            { label:'First Maintenance', val: plan.maintenance || 'In 6-8 weeks' },
            { label:'Blend Quality', val: blendQuality }
          ].map((r, i, arr) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;${i < arr.length - 1 ? 'border-bottom:1px solid var(--border-light);' : ''}">
            <span style="font-size:13px;color:var(--text-muted);">${r.label}</span>
            <span style="font-size:13px;font-weight:600;color:var(--text);text-align:right;max-width:58%;">${r.val}</span>
          </div>`).join('')}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="hi-btn hi-btn-gold" onclick="HIApp.go('summary', { consultId: '${consultId}' })">
          View Consultation Summary
        </button>
        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('load-safety', { consultId: '${consultId}' })">Back to Load Safety</button>
      </div>
    </div>
  </div>`;
}

function initS12Outcome() {
  // No initialization required.
}