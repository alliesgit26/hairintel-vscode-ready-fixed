/* ================================================================
   S01 — WELCOME / DASHBOARD
   ================================================================ */
function renderS01Welcome() {
  const stylist = HI.getStylist() || {};
  const clients = HI.getClients();
  const consults = HI.getConsults();
  const recent = [...consults].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  const sub = HI.getSub ? HI.getSub() : {};
  const currentPlan = sub.plan || 'none';
  const isPaidPlan = currentPlan === 'starter' || currentPlan === 'pro' || currentPlan === 'studio';
  const name = stylist.name ? stylist.name.split(' ')[0] : null;

  return `
  <div class="hi-screen hi-animate-fade" id="screen-welcome">

    <div style="padding:48px var(--pad) 32px; background:linear-gradient(180deg,#1A1508 0%,var(--bg) 100%);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
        <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#C6A769,#A8894E);display:flex;align-items:center;justify-content:center;">
          ${HIcons.brain}
        </div>
        <div>
          <div style="font-size:20px;font-weight:700;color:var(--text);letter-spacing:-0.02em;">HairIntel <span style="color:var(--gold);">AI</span></div>
          <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase;">Consultation System</div>
        </div>
        <div style="margin-left:auto;">
          <button onclick="HIApp.go('clients')" style="width:36px;height:36px;border-radius:50%;background:var(--bg-card);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-sub);">
            ${HIcons.clients}
          </button>
        </div>
      </div>

      ${name ? `
      <div style="margin-bottom:6px;">
        <span style="font-size:13px;color:var(--text-muted);">Welcome back,</span>
      </div>
      <h1 class="hi-heading hi-mb-4">${name}</h1>
      ` : `
      <h1 class="hi-heading hi-mb-2">AI Consultation<br>System for Extension<br><span style="color:var(--gold);">Stylists</span></h1>
      <p class="hi-body hi-mb-4" style="color:var(--text-muted);">Precision hair analysis. Intelligent install planning. Presented with confidence.</p>
      `}

      <button class="hi-btn hi-btn-gold" id="start-consult-btn" style="margin-bottom:12px;">
        ${HIcons.sparkle} &nbsp;Start New Consultation
      </button>

      <button class="hi-btn hi-btn-ghost" onclick="HIApp.go('clients')">
        ${HIcons.clients} &nbsp;Saved Clients
      </button>

      ${isPaidPlan ? `
      <div style="text-align:center;margin-top:12px;">
        <span class="hi-label" style="color:var(--success);">${HIcons.check} ${hiCapitalize(currentPlan)} Plan Active</span>

        <div style="margin-top:10px;">
          <button onclick="HIApp.go('subscription')" style="font-size:12px;color:var(--gold);font-weight:700;background:rgba(198,167,105,0.12);border:1px solid var(--gold-border);border-radius:999px;padding:8px 16px;cursor:pointer;">
            Manage Plan
          </button>
        </div>
      </div>
      ` : `
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;">
        <div style="font-size:12px;color:var(--text-muted);">Choose a plan to unlock consultations</div>
        <button onclick="HIApp.go('subscription')" style="font-size:12px;color:var(--gold);font-weight:600;background:none;border:none;cursor:pointer;">Upgrade →</button>
      </div>
      `}
    </div>

    <div style="padding:0 var(--pad) 40px;">

      ${clients.length > 0 ? `
      <div class="hi-stat-grid hi-mb-5">
        <div class="hi-stat-card">
          <div class="hi-stat-val">${clients.length}</div>
          <div class="hi-stat-lbl">Clients</div>
        </div>
        <div class="hi-stat-card">
          <div class="hi-stat-val">${consults.length}</div>
          <div class="hi-stat-lbl">Consultations</div>
        </div>
      </div>
      ` : ''}

      ${recent.length > 0 ? `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <span class="hi-label">Recent Consultations</span>
        <button onclick="HIApp.go('clients')" style="font-size:12px;color:var(--gold);font-weight:500;background:none;border:none;cursor:pointer;">View All</button>
      </div>

      ${recent.map(c => {
        const client = HI.getClients().find(cl => cl.id === c.clientId) || {};
        const r = c.result;
        const rColor = r?.readiness === 'green' ? 'var(--success)' : r?.readiness === 'yellow' ? 'var(--warning)' : 'var(--danger)';
        const rDot = r ? `<span style="width:8px;height:8px;border-radius:50%;background:${rColor};display:inline-block;flex-shrink:0;"></span>` : '';

        return `
        <div class="hi-consult-card" onclick="HIApp.go('readiness', { consultId: '${c.id}' })">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="hi-avatar">${hiInitials(client.firstName, client.lastName)}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:2px;">${client.firstName || 'Unknown'} ${client.lastName || ''}</div>
              <div style="font-size:12px;color:var(--text-muted);">${hiDate(c.createdAt)}</div>
            </div>
            ${rDot}
            <span style="color:var(--text-muted);">${HIcons.chevron}</span>
          </div>
        </div>`;
      }).join('')}
      ` : `
      <div style="padding:40px 0;text-align:center;">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--gold-pale);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--gold);">${HIcons.brain}</div>
        <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px;">No consultations yet</div>
        <div style="font-size:13px;color:var(--text-muted);line-height:1.6;max-width:240px;margin:0 auto;">Choose a plan to start your first AI-powered hair extension consultation.</div>
      </div>
      `}

      <div class="hi-gold-line"></div>

      ${!isPaidPlan ? `
      <div class="hi-card-gold" style="cursor:pointer;" onclick="HIApp.go('subscription')">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="color:var(--gold);">${HIcons.star}</div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:3px;">Start with Starter</div>
            <div style="font-size:12px;color:var(--text-muted);">Plans begin at $29/month with a 7-day trial when available</div>
          </div>
          <span style="color:var(--gold);">${HIcons.chevron}</span>
        </div>
      </div>
      ` : ''}

      <div class="hi-disclaimer">
        HairIntel AI provides consultation support and planning guidance for licensed or professional stylists. Final service decisions should always rely on professional in-person judgment.
      </div>

      <div style="margin-top:14px;text-align:center;font-size:13px;">
        <a href="/privacy.html" style="color:#9b6b4f;text-decoration:none;">Privacy Policy</a>
        <span style="margin:0 8px;color:#9ca3af;">|</span>
        <a href="/terms.html" style="color:#9b6b4f;text-decoration:none;">Terms & Billing</a>
      </div>
    </div>
  </div>`;
}

function initS01Welcome() {
  hEl('start-consult-btn')?.addEventListener('click', () => {
    const sub = HI.getSub ? HI.getSub() : {};
    const plan = sub.plan || 'none';
    const isPaidPlan = plan === 'starter' || plan === 'pro' || plan === 'studio';

    if (!isPaidPlan) {
      HIApp.go('subscription');
      return;
    }

    HIConsult.reset();
    HIApp.go('client-info');
  });
}