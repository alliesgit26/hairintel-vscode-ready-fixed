/* ================================================================
   S13 — CONSULTATION SUMMARY
   ================================================================ */
function renderS13Summary(params = {}) {
  const consultId = params.consultId || HIConsult.get('consultId');
  const consult = consultId ? HI.getConsults().find(c => c.id === consultId) : null;
  const result  = consult?.result || HIConsult.get('result');
  if (!result) return `<div class="hi-screen"><div class="hi-content"><p class="hi-body">No data.</p></div></div>`;

  const client = consult?.clientId ? HI.getClients().find(c => c.id === consult.clientId) : null;
  const clientName = client ? `${client.firstName} ${client.lastName}` : (consult?.clientInfo?.firstName || 'Client');
  const { readiness, plan, summaries, integrityScore, modifications, warnings } = result;
  const scoreColor = readiness === 'green' ? 'var(--success)' : readiness === 'yellow' ? 'var(--warning)' : 'var(--danger)';

  return `
  <div class="hi-screen hi-animate-fade" id="screen-summary">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Consultation Summary</div><div class="hi-header-sub">${clientName}</div></div>
      <button style="background:none;border:none;padding:6px;color:var(--gold);font-size:12px;font-weight:600;cursor:pointer;" onclick="HIApp.go('export', { consultId: '${consultId}' })">${HIcons.share}</button>
    </div>

    <div class="hi-content">

      <!-- Version Toggle -->
      <div class="hi-tab-bar hi-mb-5" id="summary-tabs">
        <button class="hi-tab active" data-tab="client-summary" onclick="switchSummaryTab('client-summary')">Client Version</button>
        <button class="hi-tab" data-tab="stylist-summary" onclick="switchSummaryTab('stylist-summary')">Stylist Version</button>
      </div>

      <!-- Client Summary Panel -->
      <div id="panel-client-summary">
        <!-- Header Card -->
        <div class="hi-card hi-mb-4" style="background:linear-gradient(135deg,var(--gold-pale),var(--bg-card));border-color:var(--gold-border);">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
            <div class="hi-avatar" style="width:48px;height:48px;font-size:18px;">${hiInitials(client?.firstName || consult?.clientInfo?.firstName || '', client?.lastName || '')}</div>
            <div>
              <div style="font-size:17px;font-weight:700;color:var(--text);">${clientName}</div>
              <div style="font-size:12px;color:var(--text-muted);">${hiDate(consult?.createdAt)}</div>
            </div>
            <span class="hi-readiness-badge ${readiness === 'green' ? 'badge-green' : readiness === 'yellow' ? 'badge-yellow' : 'badge-red'}" style="margin-left:auto;">
              ${readiness.toUpperCase()}
            </span>
          </div>
          <p style="font-size:14px;line-height:1.7;color:var(--text-sub);">${summaries.clientSummary}</p>
        </div>

        <!-- Key Details (client-friendly) -->
        ${readiness !== 'red' ? `
        <div class="hi-card hi-mb-4">
          <div class="hi-label hi-mb-3">Your Install Plan</div>
          <div style="display:flex;flex-direction:column;gap:0;">
            ${[
              { label:'Method',         val: plan.method },
              { label:'Extension Length',val: plan.extensionLength },
              { label:'Hair Weight',    val: `${plan.grams}g` },
              { label:'Appointment',    val: plan.appointmentDuration },
              { label:'Maintenance',    val: `Every ${plan.maintenance}` }
            ].map((r, i, arr) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;${i < arr.length-1 ? 'border-bottom:1px solid var(--border-light);' : ''}">
              <span style="font-size:13px;color:var(--text-muted);">${r.label}</span>
              <span style="font-size:13px;font-weight:600;color:var(--text);">${r.val}</span>
            </div>`).join('')}
          </div>
        </div>

        <!-- Client Cost Estimate -->
        <div class="hi-card hi-mb-4" style="background:var(--gold-pale);border-color:var(--gold-border);">
          <div class="hi-label hi-mb-3" style="color:var(--gold);">Service Estimate</div>
          <div style="font-size:28px;font-weight:700;color:var(--text);margin-bottom:4px;">${hiCurrency(result.estimate.total)}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Estimated investment</div>
          <button class="hi-btn hi-btn-outline" style="font-size:13px;" onclick="HIApp.go('estimate', { consultId: '${consultId}' })">View Full Breakdown →</button>
        </div>
        ` : ''}

        <!-- Disclaimer for client version -->
        <div class="hi-disclaimer hi-mb-4">
          This consultation summary was prepared using HairIntel AI. Final service decisions and pricing will be confirmed by your stylist during your appointment.
        </div>
      </div>

      <!-- Stylist Summary Panel (hidden by default) -->
      <div id="panel-stylist-summary" style="display:none;">

        <!-- Technical Header -->
        <div class="hi-card hi-mb-4">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:700;color:var(--text);">Technical Assessment</div>
              <div style="font-size:12px;color:var(--text-muted);">${hiDate(consult?.createdAt)} · HairIntel AI</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:22px;font-weight:700;color:${scoreColor};">${integrityScore}/100</div>
              <div style="font-size:11px;color:var(--text-muted);">Integrity Score</div>
            </div>
          </div>
          <p style="font-size:13px;line-height:1.7;color:var(--text-sub);padding-top:12px;border-top:1px solid var(--border);">${summaries.stylistSummary}</p>
        </div>

        <!-- Hair Data -->
        <div class="hi-card hi-mb-4">
          <div class="hi-label hi-mb-3">Hair Assessment Data</div>
          <div style="display:flex;flex-direction:column;gap:0;">
            ${[
              { label:'Density',      val: hiCapitalize(consult?.hairProfile?.density || '—') },
              { label:'Texture',      val: hiCapitalize(consult?.hairProfile?.texture || '—') },
              { label:'Current Length',val: hiCapitalize(consult?.hairProfile?.length || '—') },
              { label:'Chem History', val: hiCapitalize((consult?.hairProfile?.chemHistory || '—').replace(/-/g,' ')) },
              { label:'Scalp Sensitivity',val: hiCapitalize(consult?.clientFlags?.scalp_sensitivity || 'None') },
              { label:'Shedding',     val: hiCapitalize(consult?.clientFlags?.shedding || 'Normal') }
            ].map((r,i,arr) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;${i < arr.length-1 ? 'border-bottom:1px solid var(--border-light);' : ''}">
              <span style="font-size:13px;color:var(--text-muted);">${r.label}</span>
              <span style="font-size:13px;font-weight:600;color:var(--text);">${r.val}</span>
            </div>`).join('')}
          </div>
        </div>

        <!-- Flags -->
        ${consult?.stylistFlags?.length > 0 ? `
        <div class="hi-card hi-mb-4">
          <div class="hi-label hi-mb-3">Observed Flags</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${consult.stylistFlags.map(f => `
            <span style="font-size:12px;padding:4px 10px;border-radius:20px;background:rgba(234,179,8,0.1);border:1px solid var(--gold-border);color:var(--gold);">${f.replace(/_/g,' ')}</span>`).join('')}
          </div>
        </div>` : ''}

        <!-- Modifications -->
        ${modifications?.length > 0 ? `
        <div class="hi-card hi-mb-4">
          <div class="hi-label hi-mb-3">Plan Modifications</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${modifications.map(m => `
            <span style="font-size:12px;padding:4px 10px;border-radius:20px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:var(--danger);">${m.replace(/_/g,' ')}</span>`).join('')}
          </div>
        </div>` : ''}

        <!-- Stylist Notes -->
        ${consult?.stylistNotes ? `
        <div class="hi-card hi-mb-4">
          <div class="hi-label hi-mb-3">Stylist Notes</div>
          <p style="font-size:13px;color:var(--text-sub);line-height:1.6;">${consult.stylistNotes}</p>
        </div>` : ''}

      </div>

      <!-- Full Workflow Navigation -->
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Full Consultation Report</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${[
            { label:'Hair Readiness Score',  screen:'readiness',  icon:'◉' },
            { label:'Placement Map',          screen:'placement',  icon:'⊟' },
            { label: readiness === 'red' ? 'Recovery / No-Install Plan' : 'Install Plan', screen:'install-plan', icon:'!' },
            { label:'Load Safety Score',      screen:'load-safety',icon:'◷' },
            { label: readiness === 'red' ? 'No-Install Outcome' : 'Projected Outcome', screen:'outcome', icon:'!' },
            { label:'Service Estimate',       screen:'estimate',   icon:'$' },
            { label:'Alternative Options',    screen:'alternatives',icon:'⊙' }
          ].map(r => `
          <div class="hi-card-raised" style="cursor:pointer;" onclick="HIApp.go('${r.screen}', { consultId: '${consultId}' })">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:16px;color:var(--gold);width:20px;text-align:center;">${r.icon}</span>
              <span style="font-size:13px;font-weight:500;color:var(--text);flex:1;">${r.label}</span>
              <span style="color:var(--text-muted);">${HIcons.chevron}</span>
            </div>
          </div>`).join('')}
        </div>
      </div>

      <!-- Actions -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="hi-btn hi-btn-gold" onclick="HIApp.go('export', { consultId: '${consultId}' })">
          ${HIcons.download} &nbsp;Export Consultation
        </button>
        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('welcome')">Back to Dashboard</button>
      </div>

    </div>
  </div>`;
}

function initS13Summary(params = {}) {
  window.switchSummaryTab = (tab) => {
    hQsa('#summary-tabs .hi-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    hEl('panel-client-summary').style.display = tab === 'client-summary' ? '' : 'none';
    hEl('panel-stylist-summary').style.display = tab === 'stylist-summary' ? '' : 'none';
  };
}

/* ================================================================
   S14 — SERVICE ESTIMATE
   ================================================================ */
function renderS14Estimate(params = {}) {
  const consultId = params.consultId || HIConsult.get('consultId');
  const consult = consultId ? HI.getConsults().find(c => c.id === consultId) : null;
  const result  = consult?.result || HIConsult.get('result');
  if (!result) return `<div class="hi-screen"><div class="hi-content"><p class="hi-body">No data.</p></div></div>`;

  const { estimate, plan } = result;
  const client = consult?.clientId ? HI.getClients().find(c => c.id === consult.clientId) : null;
  const clientName = client ? `${client.firstName} ${client.lastName}` : (consult?.clientInfo?.firstName || 'Client');
  const stylist = HI.getStylist() || {};
  const settings = HI.getSettings();

  return `
  <div class="hi-screen hi-animate-fade" id="screen-estimate">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Service Estimate</div><div class="hi-header-sub">${clientName}</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">

      ${estimate.total === 0 ? `
      <div class="hi-card hi-mb-4" style="border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.05);">
        <p class="hi-body">${estimate.note || 'No service recommended at this time.'}</p>
      </div>` : `

      <!-- Estimate Header Card -->
      <div class="hi-card hi-mb-4" style="background:linear-gradient(135deg,var(--gold-pale) 0%,var(--bg-card) 100%);border-color:var(--gold-border);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;">
          <div>
            <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${stylist.salon || 'Extension Studio'}</div>
            <div style="font-size:15px;font-weight:700;color:var(--text);">Service Estimate</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:var(--text-muted);">Date</div>
            <div style="font-size:13px;font-weight:600;color:var(--text);">${hiDate(new Date().toISOString())}</div>
          </div>
        </div>
        <div style="padding-top:14px;border-top:1px solid var(--gold-border);">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Client</div>
          <div style="font-size:15px;font-weight:700;color:var(--text);">${clientName}</div>
        </div>
      </div>

      <!-- Line Items -->
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Service Breakdown</div>
        <div style="display:flex;flex-direction:column;gap:0;">
          ${estimate.breakdown.map((item, i, arr) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;${i < arr.length-1 ? 'border-bottom:1px solid var(--border-light);' : ''}">
            <div>
              <div style="font-size:14px;font-weight:500;color:var(--text);margin-bottom:2px;">${item.label}</div>
              ${item.note ? `<div style="font-size:12px;color:var(--text-muted);">${item.note}</div>` : ''}
            </div>
            <div style="font-size:15px;font-weight:700;color:var(--text);">${hiCurrency(item.value)}</div>
          </div>`).join('')}
        </div>

        <!-- Add-ons Row -->
        <div id="addons-section">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-top:1px solid var(--border);">
            <div style="font-size:14px;font-weight:500;color:var(--text-muted);">Add-ons</div>
            <button id="add-addon-btn" style="font-size:12px;font-weight:600;color:var(--gold);background:none;border:none;cursor:pointer;">+ Add</button>
          </div>
          <div id="addon-list" style="display:flex;flex-direction:column;gap:6px;"></div>
        </div>

        <!-- Totals -->
        <div style="padding-top:14px;border-top:2px solid var(--border);margin-top:4px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13px;color:var(--text-muted);">Subtotal</span>
            <span id="subtotal-val" style="font-size:14px;font-weight:600;color:var(--text);">${hiCurrency(estimate.total)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <span style="font-size:13px;color:var(--text-muted);">Tax</span>
            <div style="flex:1;display:flex;align-items:center;gap:6px;justify-content:flex-end;">
              <input type="number" id="tax-rate-input" value="8.5" min="0" max="20" step="0.5" style="width:54px;text-align:center;font-size:13px;" class="hi-input" />
              <span style="font-size:13px;color:var(--text-muted);">%</span>
              <span id="tax-amount" style="font-size:13px;font-weight:600;color:var(--text);">${hiCurrency(estimate.total * 0.085)}</span>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--border);">
            <span style="font-size:16px;font-weight:700;color:var(--text);">Total</span>
            <span id="grand-total-val" style="font-size:22px;font-weight:700;color:var(--gold);">${hiCurrency(estimate.total * 1.085)}</span>
          </div>
        </div>
      </div>

      <!-- Rate Info -->
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Rate Settings</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label class="hi-field-label">Labor Rate/Hour</label>
            <input type="number" id="rate-input" class="hi-input" value="${settings.laborRate || 150}" min="50" step="5" />
          </div>
          <div>
            <label class="hi-field-label">Hair Cost/Gram</label>
            <input type="number" id="gram-cost-input" class="hi-input" value="${settings.hairCostPerGram || 1.20}" min="0.5" step="0.1" />
          </div>
        </div>
        <button class="hi-btn hi-btn-outline" style="margin-top:12px;font-size:13px;" id="recalc-btn">Recalculate</button>
      </div>
      `}

      <!-- Disclaimer -->
      <div class="hi-disclaimer hi-mb-4">
        This estimate is generated based on your default rate settings and the HairIntel AI install plan. Final pricing must be confirmed directly with the client.
      </div>

      <!-- Navigation -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="hi-btn hi-btn-gold" onclick="HIApp.go('alternatives', { consultId: '${consultId}' })">
          View Alternative Options →
        </button>
        <button class="hi-btn hi-btn-outline" onclick="HIApp.go('export', { consultId: '${consultId}' })">
          ${HIcons.download} &nbsp;Export & Save
        </button>
        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('summary', { consultId: '${consultId}' })">Back to Summary</button>
      </div>
    </div>
  </div>`;
}

function initS14Estimate(params = {}) {
  const consultId = params.consultId || HIConsult.get('consultId');
  const consult = consultId ? HI.getConsults().find(c => c.id === consultId) : null;
  const result  = consult?.result || HIConsult.get('result');
  if (!result || result.estimate?.total === 0) return;

  let addons = [];

  /* Recalculate totals */
  function recalc() {
    const laborRate  = parseFloat(hEl('rate-input')?.value) || 150;
    const gramRate   = parseFloat(hEl('gram-cost-input')?.value) || 1.2;
    const taxRate    = parseFloat(hEl('tax-rate-input')?.value) || 8.5;
    const plan = result.plan;
    const laborHrs   = { 'Tape-Ins':2.5,'Hand-Tied Wefts':5,'I-Tips':4,'K-Tips':4,'Hybrid':4 }[plan.method] || 3;
    const laborCost  = laborHrs * laborRate;
    const hairCost   = plan.grams * gramRate;
    const blendTrim  = HI.getSettings().blendTrim || 45;
    const addonTotal = addons.reduce((s,a) => s + (a.price || 0), 0);
    const subtotal   = laborCost + hairCost + blendTrim + addonTotal;
    const taxAmt     = subtotal * (taxRate / 100);
    const grand      = subtotal + taxAmt;

    if (hEl('subtotal-val'))  hEl('subtotal-val').textContent  = hiCurrency(subtotal);
    if (hEl('tax-amount'))    hEl('tax-amount').textContent    = hiCurrency(taxAmt);
    if (hEl('grand-total-val')) hEl('grand-total-val').textContent = hiCurrency(grand);
  }

  hEl('recalc-btn')?.addEventListener('click', () => { recalc(); hiToast('Estimate updated','success'); });
  hEl('tax-rate-input')?.addEventListener('input', recalc);

  /* Add-on flow */
  hEl('add-addon-btn')?.addEventListener('click', () => {
    const name  = prompt('Add-on service name:');
    if (!name) return;
    const price = parseFloat(prompt('Add-on price ($):') || '0');
    addons.push({ name, price });
    const list = hEl('addon-list');
    if (list) {
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--text-sub);padding:4px 0;';
      div.innerHTML = `<span>${name}</span><span>${hiCurrency(price)}</span>`;
      list.appendChild(div);
    }
    recalc();
    hiToast(`${name} added`,'success');
  });
}
