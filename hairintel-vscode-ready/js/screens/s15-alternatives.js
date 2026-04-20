/* ================================================================
   S15 — ALTERNATIVE OPTIONS
   ================================================================ */
function renderS15Alternatives(params = {}) {
  const consultId = params.consultId || HIConsult.get('consultId');
  const consult = consultId ? HI.getConsults().find(c => c.id === consultId) : null;
  const result  = consult?.result || HIConsult.get('result');
  if (!result) return `<div class="hi-screen"><div class="hi-content"><p class="hi-body">No data.</p></div></div>`;

  const { alternatives, plan, estimate } = result;
  const settings = HI.getSettings();

  /* Method card color accents */
  const methodColors = {
    'Tape-Ins':        { bg:'rgba(139,92,246,0.08)', border:'rgba(139,92,246,0.2)', text:'#a78bfa' },
    'Hand-Tied Wefts': { bg:'rgba(198,167,105,0.08)', border:'var(--gold-border)',   text:'var(--gold)' },
    'I-Tips':          { bg:'rgba(34,197,94,0.08)',   border:'rgba(34,197,94,0.2)', text:'var(--success)' },
    'K-Tips':          { bg:'rgba(59,130,246,0.08)',  border:'rgba(59,130,246,0.2)',text:'#60a5fa' },
    'Hybrid':          { bg:'rgba(236,72,153,0.08)',  border:'rgba(236,72,153,0.2)',text:'#f472b6' }
  };

  const calcAltCost = (alt) => {
    const laborHrs = { 'Tape-Ins':2.5, 'Hand-Tied Wefts':5, 'I-Tips':4, 'K-Tips':4, 'Hybrid':4 }[alt.method] || 3;
    const labor = laborHrs * (settings.laborRate || 150);
    const hair  = alt.grams * (settings.hairCostPerGram || 1.2);
    const trim  = settings.blendTrim || 45;
    return labor + hair + trim;
  };

  return `
  <div class="hi-screen hi-animate-fade" id="screen-alternatives">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Alternative Options</div><div class="hi-header-sub">Other Approaches</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">
      <div class="hi-mb-4">
        <h2 class="hi-heading hi-mb-2">Alternative Install Options</h2>
        <p class="hi-body">Based on the hair analysis, here are alternative approaches that may better suit specific lifestyle, budget, or maintenance preferences.</p>
      </div>

      <!-- Primary Recommendation Recap -->
      <div class="hi-card hi-mb-4" style="background:var(--gold-pale);border-color:var(--gold-border);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <span style="color:var(--gold);">${HIcons.check}</span>
          <div class="hi-label" style="color:var(--gold);">Primary Recommendation</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:3px;">${plan.method}</div>
            <div style="font-size:12px;color:var(--text-muted);">${plan.rows} rows · ${plan.grams}g · ${plan.maintenance} maintenance</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:18px;font-weight:700;color:var(--gold);">${hiCurrency(estimate.total)}</div>
            <div style="font-size:11px;color:var(--text-muted);">est. total</div>
          </div>
        </div>
      </div>

      <!-- Alternatives -->
      ${alternatives.length === 0
        ? `<div class="hi-card hi-mb-4" style="text-align:center;padding:30px;">
             <div style="font-size:13px;color:var(--text-muted);">No alternative options available for this hair profile.</div>
           </div>`
        : alternatives.map((alt, i) => {
            const colors = methodColors[alt.method] || methodColors['Tape-Ins'];
            const altCost = calcAltCost(alt);
            return `
            <div class="hi-card hi-mb-4" style="background:${colors.bg};border-color:${colors.border};">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
                <div style="flex:1;">
                  <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${colors.text};margin-bottom:4px;">Option ${i + 1}</div>
                  <div style="font-size:17px;font-weight:700;color:var(--text);margin-bottom:2px;">${alt.title}</div>
                  <div style="font-size:13px;color:${colors.text};font-weight:600;">${alt.method}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;margin-left:10px;">
                  <div style="font-size:18px;font-weight:700;color:var(--text);">${hiCurrency(altCost)}</div>
                  <div style="font-size:11px;color:var(--text-muted);">est. total</div>
                </div>
              </div>

              <p style="font-size:13px;color:var(--text-sub);line-height:1.6;margin-bottom:14px;">${alt.description}</p>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
                ${[
                  { label:'Hair Weight',  val:`${alt.grams}g` },
                  { label:'Maintenance',  val:alt.maintenance }
                ].map(d => `
                <div style="padding:8px 10px;background:var(--bg-raised);border-radius:8px;border:1px solid var(--border);">
                  <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">${d.label}</div>
                  <div style="font-size:13px;font-weight:600;color:var(--text);">${d.val}</div>
                </div>`).join('')}
              </div>

              ${alt.priceNote ? `
              <div style="font-size:12px;color:${colors.text};padding:6px 10px;background:${colors.bg};border-radius:6px;border:1px solid ${colors.border};">
                💡 ${alt.priceNote}
              </div>` : ''}
            </div>`;
          }).join('')
      }

      <!-- Comparison Note -->
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Choosing the Right Method</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${[
            { title:'Lifestyle',      body:'Active clients benefit from tape-ins or nano rings. Hand-tied wefts suit low-maintenance routines.' },
            { title:'Budget',         body:'Tape-ins typically have lower upfront cost. Strand methods cost more but last longer between appointments.' },
            { title:'Hair Health',    body:'Lighter installs using fewer grams protect fragile or recovering hair. Less weight = less strain.' },
            { title:'Time',           body:'Tape-in appointments take 2–3 hours. Hand-tied wefts can require 4–6 hours in the chair.' }
          ].map(tip => `
          <div style="padding:10px 12px;background:var(--bg-raised);border-radius:10px;border:1px solid var(--border-light);">
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:3px;">${tip.title}</div>
            <div style="font-size:12px;color:var(--text-muted);line-height:1.5;">${tip.body}</div>
          </div>`).join('')}
        </div>
      </div>

      <!-- Navigation -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="hi-btn hi-btn-gold" onclick="HIApp.go('export', { consultId: '${consultId}' })">
          ${HIcons.download} &nbsp;Export & Save Consultation
        </button>
        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('summary', { consultId: '${consultId}' })">Back to Summary</button>
      </div>
    </div>
  </div>`;
}

function initS15Alternatives() {}

/* ================================================================
   S16 — EXPORT & SAVE
   ================================================================ */
function renderS16Export(params = {}) {
  const consultId = params.consultId || HIConsult.get('consultId');
  const consult = consultId ? HI.getConsults().find(c => c.id === consultId) : null;
  const result  = consult?.result || HIConsult.get('result');
  if (!result) return `<div class="hi-screen"><div class="hi-content"><p class="hi-body">No data.</p></div></div>`;

  const client = consult?.clientId ? HI.getClients().find(c => c.id === consult.clientId) : null;
  const clientName = client ? `${client.firstName} ${client.lastName}` : (consult?.clientInfo?.firstName || 'Client');
  const stylist = HI.getStylist() || {};
  const sub = HI.getSub();
  const isPro = sub.plan !== 'free';
  const aiLimit = HI.getAIPreviewLimit();
  const aiRemaining = HI.remainingAIPreviews();
  const canAI = HI.canGenerateAIPreview();
  const readiness = result.readiness;
  const scoreColor = readiness === 'green' ? '#22c55e' : readiness === 'yellow' ? '#eab308' : '#ef4444';

  return `
  <div class="hi-screen hi-animate-fade" id="screen-export">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Export & Save</div><div class="hi-header-sub">Share Consultation</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">

      <!-- Consultation Preview Card -->
      <div id="export-preview-card" class="hi-export-card">
        <!-- Branding Header -->
        <div class="hi-export-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#C6A769,#A8894E);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${HIcons.brain}
            </div>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--text);">HairIntel <span style="color:var(--gold);">AI</span></div>
              <div style="font-size:10px;color:var(--text-muted);">${stylist.salon || 'Extension Studio'}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;font-weight:600;color:var(--text);">${hiDate(consult?.createdAt)}</div>
            <div style="font-size:11px;color:var(--text-muted);">Consultation Report</div>
          </div>
        </div>

        <!-- Client Block -->
        <div class="hi-export-section">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Client</div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="hi-avatar" style="width:40px;height:40px;">${hiInitials(client?.firstName || consult?.clientInfo?.firstName || '', client?.lastName || '')}</div>
            <div>
              <div style="font-size:16px;font-weight:700;color:var(--text);">${clientName}</div>
              ${client?.phone ? `<div style="font-size:12px;color:var(--text-muted);">${client.phone}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Readiness Block -->
        <div class="hi-export-section" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="padding:12px;background:var(--bg-raised);border-radius:10px;border:1px solid var(--border);">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Readiness</div>
            <div style="font-size:15px;font-weight:700;color:${scoreColor};">${readiness.toUpperCase()}</div>
          </div>
          <div style="padding:12px;background:var(--bg-raised);border-radius:10px;border:1px solid var(--border);">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Integrity</div>
            <div style="font-size:15px;font-weight:700;color:var(--text);">${result.integrityScore}/100</div>
          </div>
        </div>

        <!-- Install Plan Block -->
        ${result.readiness !== 'red' ? `
        <div class="hi-export-section">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Install Plan</div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${[
              ['Method',      result.plan.method],
              ['Rows',        `${result.plan.rows} rows`],
              ['Weight',      `${result.plan.grams}g`],
              ['Length',      result.plan.extensionLength],
              ['Maintenance', result.plan.maintenance]
            ].map(([k,v]) => `
            <div style="display:flex;justify-content:space-between;font-size:12px;">
              <span style="color:var(--text-muted);">${k}</span>
              <span style="font-weight:600;color:var(--text);">${v}</span>
            </div>`).join('')}
          </div>
        </div>

        <!-- Estimate Block -->
        <div class="hi-export-section" style="background:var(--gold-pale);border-color:var(--gold-border);border-radius:10px;padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Estimated Service Total</div>
              <div style="font-size:22px;font-weight:700;color:var(--gold);">${hiCurrency(result.estimate.total)}</div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);text-align:right;">Excl. tax<br>Est. only</div>
          </div>
        </div>
        ` : ''}

        <!-- Disclaimer -->
        <div class="hi-export-section" style="border-top:1px solid var(--border);padding-top:12px;margin-top:0;">
          <p style="font-size:10px;color:var(--text-muted);line-height:1.5;text-align:center;">
            Generated by HairIntel AI · ${stylist.name || 'Licensed Stylist'} · ${hiDate(new Date().toISOString())}
            ${!isPro ? '<br><strong>Free Plan — Watermark Applied</strong>' : ''}
          </p>
        </div>

        <!-- Free plan watermark -->
        ${!isPro ? `<div class="hi-export-watermark">HairIntel AI · Free</div>` : ''}
      </div>

      <!-- Safety Disclaimer -->
      <div class="hi-disclaimer hi-mb-4">
        <strong style="color:var(--warning);">Safety Disclaimer:</strong> HairIntel AI is a decision-support tool designed for use by licensed or professional hairstylists. All recommendations are based on data inputs and rule-based analysis. They do not replace professional in-person judgment. The stylist bears sole responsibility for all service decisions. HairIntel AI, its creators, and affiliates assume no liability for outcomes related to extension installations.
      </div>

      <!-- Action Buttons -->
      <div style="display:flex;flex-direction:column;gap:10px;">

        ${isPro ? `
        <button class="hi-btn hi-btn-gold" id="export-pdf-btn">
          ${HIcons.download} &nbsp;Export PDF Report
        </button>
        <button class="hi-btn hi-btn-outline" id="export-share-btn">
          ${HIcons.share} &nbsp;Share with Client
        </button>
        ` : `
        <div class="hi-card" style="border-color:var(--gold-border);background:var(--gold-pale);">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <span style="color:var(--gold);">${HIcons.lock}</span>
            <div class="hi-label" style="color:var(--gold);">Pro Feature</div>
          </div>
          <p style="font-size:13px;color:var(--text-sub);margin-bottom:12px;">PDF export and client sharing requires a Pro or Studio subscription.</p>
          <button class="hi-btn hi-btn-gold" onclick="HIApp.go('subscription')">Upgrade to Pro</button>
        </div>`}
        <button class="hi-btn hi-btn-gold" onclick="HIApp.go('ai-preview', { consultId: '${consultId}' })">
          ${HIcons.sparkle} &nbsp;Generate AI Hair Preview
        </button>
        <button class="hi-btn hi-btn-outline" id="save-consult-btn">
        ${aiLimit === 0 ? `
  <div class="hi-card" style="border-color:var(--gold-border);background:var(--gold-pale);">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="color:var(--gold);">${HIcons.sparkle}</span>
      <div class="hi-label" style="color:var(--gold);">AI Preview Locked</div>
    </div>
    <p style="font-size:13px;color:var(--text-sub);margin-bottom:12px;">
      AI hair preview is available on Pro and Studio plans.
    </p>
    <button class="hi-btn hi-btn-gold" onclick="HIApp.go('subscription')">Upgrade for AI Preview</button>
  </div>
` : `
  <div class="hi-card" style="border-color:var(--gold-border);background:var(--bg-card);">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
      <div class="hi-label" style="color:var(--gold);">AI Preview</div>
      <span class="badge badge-gold">${aiRemaining} remaining</span>
    </div>
    <p style="font-size:13px;color:var(--text-sub);margin-bottom:12px;">
      Each generation uses 1 monthly AI preview credit.
    </p>
    <button
      class="hi-btn hi-btn-gold"
      ${!canAI ? 'disabled style="opacity:.6;cursor:not-allowed;"' : ''}
      onclick="HIApp.go('ai-preview', { consultId: '${consultId}' })">
      Generate AI Hair Preview
    </button>
  </div>
`}
          ${HIcons.check} &nbsp;Save to Client Profile
        </button>

        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('clients')">
          ${HIcons.clients} &nbsp;View All Clients
        </button>

        <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('welcome')">
          Return to Dashboard
        </button>
      </div>

    </div>
  </div>`;
}

function initS16Export(params = {}) {
  const consultId = params.consultId || HIConsult.get('consultId');
  const sub = HI.getSub();
  const isPro = sub.plan !== 'free';

  hEl('save-consult-btn')?.addEventListener('click', () => {
    hiToast('Consultation saved to client profile','success');
    setTimeout(() => HIApp.go('clients'), 1200);
  });

  if (isPro) {
    hEl('export-pdf-btn')?.addEventListener('click', () => {
      /* Simulated PDF export */
      hiToast('Generating PDF...','info');
      setTimeout(() => {
        hiToast('PDF ready — tap to open (simulated)','success');
      }, 1800);
    });

    hEl('export-share-btn')?.addEventListener('click', () => {
      const consultRef = consultId ? `ConsultID: ${consultId}` : 'HairIntel AI Consultation';
      if (navigator.share) {
        navigator.share({
          title: 'HairIntel AI Consultation',
          text: `Your HairIntel AI consultation summary is ready. ${consultRef}`,
          url: window.location.href
        }).catch(() => hiToast('Share cancelled','info'));
      } else {
        navigator.clipboard?.writeText(`HairIntel AI Consultation Report\n${consultRef}\nDate: ${new Date().toLocaleDateString()}`);
        hiToast('Consultation details copied to clipboard','success');
      }
    });
  }
}
