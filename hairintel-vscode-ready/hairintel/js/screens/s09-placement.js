/* ================================================================
   S09 - PLACEMENT MAP
   ================================================================ */
function renderS09Placement(params = {}) {
  const consultId = params.consultId || HIConsult.get('consultId');
  const consult = consultId ? HI.getConsults().find(c => c.id === consultId) : null;
  const result  = consult?.result || HIConsult.get('result');
  if (!result) return `<div class="hi-screen"><div class="hi-content"><p class="hi-body">No data.</p></div></div>`;

  const { placementMap, readiness } = result;
  const rowLabels = { 'nape':'Nape Row', 'mid-occipital':'Mid Row', 'occipital':'Occipital Row', 'crown-blend':'Crown Blend' };
  const rowPositions = { 'nape':'88%', 'mid-occipital':'70%', 'occipital':'52%', 'crown-blend':'35%' };

  return `
  <div class="hi-screen hi-animate-fade" id="screen-placement">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Placement Map</div><div class="hi-header-sub">Zone Analysis</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">
      <div class="hi-mb-4">
        <h2 class="hi-heading hi-mb-2">Extension Placement Map</h2>
        <p class="hi-body">Color-coded zones indicate safe placement, caution areas, and restricted zones based on hair analysis.</p>
      </div>

      <!-- Head SVG Map -->
      <div class="hi-placement-map-wrap hi-mb-4">
        <div class="hi-placement-head">

          <!-- SVG Head Silhouette (back of head view) -->
          <svg class="hi-head-svg" viewBox="0 0 200 280" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Head shape -->
            <ellipse cx="100" cy="120" rx="72" ry="90" fill="#2C2C2C" stroke="var(--border)" stroke-width="1.5"/>
            <!-- Neck -->
            <rect x="80" y="200" width="40" height="40" rx="6" fill="#2C2C2C" stroke="var(--border)" stroke-width="1.5"/>
            <!-- Hair texture lines -->
            <path d="M40 120 Q100 100 160 120" stroke="var(--border-light)" stroke-width="0.8" opacity="0.5"/>
            <path d="M35 140 Q100 118 165 140" stroke="var(--border-light)" stroke-width="0.8" opacity="0.5"/>
            <path d="M38 160 Q100 140 162 160" stroke="var(--border-light)" stroke-width="0.8" opacity="0.5"/>
            <!-- Temple zones -->
            <ellipse cx="38" cy="130" rx="16" ry="22"
              fill="${placementMap.avoidTemples ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.1)'}"
              stroke="${placementMap.avoidTemples ? '#ef4444' : '#22c55e'}"
              stroke-width="1.5" stroke-dasharray="${placementMap.avoidTemples ? '4,2' : '0'}"/>
            <ellipse cx="162" cy="130" rx="16" ry="22"
              fill="${placementMap.avoidTemples ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.1)'}"
              stroke="${placementMap.avoidTemples ? '#ef4444' : '#22c55e'}"
              stroke-width="1.5" stroke-dasharray="${placementMap.avoidTemples ? '4,2' : '0'}"/>
          </svg>

          <!-- Row overlays -->
          ${placementMap.rows.map(row => {
            const top = rowPositions[row.row] || '60%';
            const color = row.status === 'avoid' ? '#ef4444' : row.status === 'caution' ? '#f59e0b' : '#22c55e';
            const dash  = row.status === 'avoid' ? '8,4' : row.status === 'caution' ? '6,3' : '0';
            const bgOpacity = row.status === 'avoid' ? '0.2' : row.status === 'caution' ? '0.15' : '0.12';
            return `
            <div class="hi-placement-row" style="top:${top};border-color:${color};border-style:${row.status === 'place' ? 'solid' : 'dashed'};background:${color}${row.status === 'place' ? '20' : '15'};">
              <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></div>
              <span style="font-size:11px;font-weight:600;color:${color};">${rowLabels[row.row] || row.row}</span>
              <span style="margin-left:auto;font-size:10px;color:${color};text-transform:uppercase;letter-spacing:0.05em;">${row.status}</span>
            </div>`;
          }).join('')}

        </div>
      </div>

      <!-- Legend -->
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Zone Legend</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:16px;height:4px;border-radius:2px;background:#22c55e;flex-shrink:0;"></div>
            <span style="font-size:13px;color:var(--text-sub);">Safe Placement - Standard installation, full tension allowed</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:16px;height:4px;border-radius:2px;background:#f59e0b;flex-shrink:0;"></div>
            <span style="font-size:13px;color:var(--text-sub);">Caution Zone - Reduced density, monitor closely</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:16px;height:4px;border-radius:2px;background:#ef4444;flex-shrink:0;"></div>
            <span style="font-size:13px;color:var(--text-sub);">Avoid Zone - No placement; risk of damage or traction</span>
          </div>
        </div>
      </div>

      <!-- Zone Details -->
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Placement Notes</div>
        ${placementMap.avoidTemples ? `
        <div class="hi-banner hi-banner-warn hi-mb-2">
          <span class="hi-banner-icon">${HIcons.warning}</span>
          <div style="font-size:13px;color:var(--text-sub);line-height:1.5;"><strong style="color:var(--warning);">Temple zones restricted.</strong> Avoid placement near hairline temples to prevent traction and further thinning.</div>
        </div>` : ''}
        ${placementMap.avoidNape ? `
        <div class="hi-banner hi-banner-warn hi-mb-2">
          <span class="hi-banner-icon">${HIcons.warning}</span>
          <div style="font-size:13px;color:var(--text-sub);line-height:1.5;"><strong style="color:var(--warning);">Nape row restricted.</strong> Client-reported nape sensitivity requires removal of the lowest row.</div>
        </div>` : ''}
        ${placementMap.cautionCrown ? `
        <div class="hi-banner hi-banner-warn hi-mb-2">
          <span class="hi-banner-icon">${HIcons.warning}</span>
          <div style="font-size:13px;color:var(--text-sub);line-height:1.5;"><strong style="color:var(--warning);">Crown area - caution.</strong> Reduce weft density in upper rows to protect crown thinning zones.</div>
        </div>` : ''}
        ${!placementMap.avoidTemples && !placementMap.avoidNape && !placementMap.cautionCrown ? `
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="color:var(--success);">${HIcons.check}</span>
          <span style="font-size:13px;color:var(--text-sub);">No restricted zones identified. Standard placement approved across all rows.</span>
        </div>` : ''}
      </div>

      <!-- Navigation -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="hi-btn hi-btn-gold" onclick="HIApp.go('install-plan', { consultId: '${consultId}' })">
          View Install Plan ->
        </button>
        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('readiness', { consultId: '${consultId}' })">Back to Readiness</button>
      </div>

    </div>
  </div>`;
}

function initS09Placement() {}

/* ================================================================
   S10 - INSTALL PLAN GENERATOR
   ================================================================ */
function renderS10InstallPlan(params = {}) {
  const consultId = params.consultId || HIConsult.get('consultId');
  const consult = consultId ? HI.getConsults().find(c => c.id === consultId) : null;
  const result  = consult?.result || HIConsult.get('result');
  if (!result) return `<div class="hi-screen"><div class="hi-content"><p class="hi-body">No data.</p></div></div>`;

  const { plan, readiness, modifications } = result;
  const client = consult?.clientId ? HI.getClients().find(c => c.id === consult.clientId) : null;
  const clientName = client ? `${client.firstName} ${client.lastName}` : (consult?.clientInfo?.firstName || 'Client');

  const isRed = readiness === 'red';

  const methodIcons = {
    'Hand-Tied Wefts': '*',
    'Tape-Ins': 'â-¬',
    'I-Tips': 'âŠ™',
    'K-Tips': 'âŠ¡',
    'Hybrid': 'â-ˆ',
    'Not recommended': 'âœ•'
  };

  const detailRows = [
    { label: 'Method',              val: plan.method,              icon: 'âŠ¹' },
    { label: 'Rows',                val: `${plan.rows} row${plan.rows !== 1 ? 's' : ''}`, icon: 'â‰¡' },
    { label: 'Hair Weight',         val: `${plan.grams}g`,         icon: 'âŠœ' },
    { label: 'Extension Length',    val: plan.extensionLength,      icon: 'â†•' },
    { label: plan.method === 'Tape-Ins' ? 'Tape Pieces' : plan.method.includes('Tips') ? 'Strand Count' : 'Weft Count',
                                    val: plan.wefts.toString(),     icon: 'âŠž' },
    { label: 'Complexity',          val: plan.complexity,           icon: 'â-‡' },
    { label: 'Maintenance Interval',val: plan.maintenance,          icon: 'â†º' },
    { label: 'Estimated Duration',  val: plan.appointmentDuration,  icon: 'â--' }
  ];

  return `
  <div class="hi-screen hi-animate-fade" id="screen-install-plan">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Install Plan</div><div class="hi-header-sub">${clientName}</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">

      <!-- Status Banner -->
      <div class="hi-readiness-method-banner hi-mb-4" style="background:${isRed ? 'rgba(239,68,68,0.08)' : 'var(--gold-pale)'};border-color:${isRed ? 'rgba(239,68,68,0.3)' : 'var(--gold-border)'};">
        <div style="font-size:30px;color:${isRed ? 'var(--danger)' : 'var(--gold)'};margin-bottom:8px;">${methodIcons[plan.method] || 'âŠ¹'}</div>
        <div style="font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px;">${plan.method}</div>
        ${isRed
          ? `<div style="font-size:13px;color:var(--danger);">Not recommended at this time</div>`
          : `<div style="font-size:13px;color:var(--text-muted);">${plan.complexity} complexity install</div>`
        }
      </div>

      ${isRed ? `
      <div class="hi-card hi-mb-4" style="border-color:rgba(239,68,68,0.3);">
        <p class="hi-body" style="color:var(--danger);font-size:13px;line-height:1.6;">${plan.rationale}</p>
        <div style="margin-top:12px;">
          <button class="hi-btn hi-btn-gold" onclick="HIApp.go('summary', { consultId: '${consultId}' })">View Full Consultation -></button>
        </div>
      </div>` : `

      <!-- Plan Details Grid -->
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Install Specifications</div>
        <div style="display:flex;flex-direction:column;gap:0;">
          ${detailRows.map((r, i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;${i < detailRows.length-1 ? 'border-bottom:1px solid var(--border);' : ''}">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:14px;color:var(--gold);width:18px;text-align:center;">${r.icon}</span>
              <span style="font-size:13px;color:var(--text-muted);">${r.label}</span>
            </div>
            <span style="font-size:13px;font-weight:600;color:var(--text);">${r.val}</span>
          </div>`).join('')}
        </div>
      </div>

      <!-- Modifications Applied -->
      ${modifications.length > 0 ? `
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Plan Modifications Applied</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${modifications.map(m => `
          <span style="font-size:12px;padding:4px 10px;border-radius:20px;background:rgba(234,179,8,0.1);border:1px solid var(--gold-border);color:var(--gold);">
            ${m.replace(/_/g,' ')}
          </span>`).join('')}
        </div>
      </div>` : ''}

      <!-- Gram Reference Guide -->
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Hair Weight Reference</div>
        ${[
          { range:'60-80g',   desc:'Light install - subtle enhancement' },
          { range:'90-120g',  desc:'Standard install - noticeable result' },
          { range:'130-160g', desc:'Full install - dramatic transformation' },
          { range:'160g+',    desc:'Heavy install - maximum volume/length' }
        ].map(g => {
          const inRange = plan.grams >= parseInt(g.range) && plan.grams <= parseInt(g.range.split('-')[1]);
          const isThis = (plan.grams >= parseInt(g.range) && plan.grams <= (parseInt(g.range.split('-')[1]) || 999));
          return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:8px;margin-bottom:4px;background:${plan.grams >= parseInt(g.range) ? 'var(--gold-pale)' : 'transparent'};border:1px solid ${plan.grams >= parseInt(g.range) ? 'var(--gold-border)' : 'transparent'};">
            <span style="font-size:13px;font-weight:${plan.grams >= parseInt(g.range) ? '600' : '400'};color:${plan.grams >= parseInt(g.range) ? 'var(--gold)' : 'var(--text-muted)'};">${g.range}</span>
            <span style="font-size:12px;color:var(--text-muted);">${g.desc}</span>
          </div>`;
        }).join('')}
      </div>
      `}

      <!-- Navigation -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="hi-btn hi-btn-gold" onclick="HIApp.go('load-safety', { consultId: '${consultId}' })">
          View Hair Load Safety ->
        </button>
        <button class="hi-btn hi-btn-outline" onclick="HIApp.go('placement', { consultId: '${consultId}' })">
          View Placement Map
        </button>
        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('summary', { consultId: '${consultId}' })">Jump to Summary</button>
      </div>
    </div>
  </div>`;
}

function initS10InstallPlan() {}

