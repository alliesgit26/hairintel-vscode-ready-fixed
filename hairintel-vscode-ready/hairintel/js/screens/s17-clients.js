/* ================================================================
   S17 - SAVED CLIENTS / HISTORY
   ================================================================ */
function renderS17Clients(params = {}) {
  const clients  = HI.getClients();
  const consults = HI.getConsults();
  const query    = params.q || '';

  const filtered = query
    ? clients.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()))
    : clients;

  /* Group consults by client */
  const consultMap = {};
  consults.forEach(c => {
    if (!consultMap[c.clientId]) consultMap[c.clientId] = [];
    consultMap[c.clientId].push(c);
  });

  /* Sort clients by most recent consult */
  const sorted = [...filtered].sort((a, b) => {
    const aLatest = consultMap[a.id]?.[0]?.createdAt || a.createdAt;
    const bLatest = consultMap[b.id]?.[0]?.createdAt || b.createdAt;
    return new Date(bLatest) - new Date(aLatest);
  });

  return `
  <div class="hi-screen hi-animate-fade" id="screen-clients">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.go('welcome')">${HIcons.back} Home</button>
      <div class="hi-text-center"><div class="hi-header-title">Clients</div><div class="hi-header-sub">${clients.length} saved</div></div>
      <button class="hi-header-action-btn" onclick="startNewConsult()" style="color:var(--gold);background:var(--gold-pale);border:1px solid var(--gold-border);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;">
        + New
      </button>
    </div>

    <div class="hi-content">

      <!-- Search -->
      <div style="position:relative;margin-bottom:16px;">
        <div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <input type="text" id="client-search" class="hi-input" placeholder="Search clients..." value="${query}" style="padding-left:38px;" oninput="filterClients(this.value)" />
      </div>

      <!-- Client List -->
      ${sorted.length === 0 ? `
      <div style="padding:60px 0;text-align:center;">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--gold-pale);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--gold);">${HIcons.clients}</div>
        <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px;">${query ? 'No results found' : 'No clients yet'}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">${query ? 'Try a different search term' : 'Start a consultation to add your first client'}</div>
        ${!query ? `<button class="hi-btn hi-btn-gold" onclick="startNewConsult()">Start First Consultation</button>` : ''}
      </div>
      ` : sorted.map(c => {
        const cConsults = (consultMap[c.id] || []).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
        const latest = cConsults[0];
        const readiness = latest?.result?.readiness;
        const dotColor = readiness === 'green' ? 'var(--success)' : readiness === 'yellow' ? 'var(--warning)' : readiness === 'red' ? 'var(--danger)' : 'var(--border)';

        return `
        <div class="hi-client-card" onclick="openClient('${c.id}')">
          <div style="display:flex;align-items:center;gap:14px;">
            <div class="hi-avatar" style="width:46px;height:46px;font-size:16px;flex-shrink:0;">${hiInitials(c.firstName, c.lastName)}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                <span style="font-size:15px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.firstName} ${c.lastName}</span>
                ${readiness ? `<span style="width:7px;height:7px;border-radius:50%;background:${dotColor};flex-shrink:0;"></span>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:12px;color:var(--text-muted);">${cConsults.length} consult${cConsults.length !== 1 ? 's' : ''}</span>
                ${latest ? `<span style="font-size:12px;color:var(--border);">-</span><span style="font-size:12px;color:var(--text-muted);">Last: ${hiDate(latest.createdAt)}</span>` : ''}
              </div>
            </div>
            <span style="color:var(--text-muted);flex-shrink:0;">${HIcons.chevron}</span>
          </div>
        </div>`;
      }).join('')}

      <!-- New Client CTA -->
      ${sorted.length > 0 ? `
      <div style="margin-top:20px;text-align:center;">
        <button class="hi-btn hi-btn-outline" onclick="startNewConsult()" style="width:auto;padding:10px 24px;">
          ${HIcons.plus} &nbsp;Start New Consultation
        </button>
      </div>` : ''}
    </div>
  </div>`;
}

function initS17Clients() {
  window.filterClients = (q) => {
    HIApp.go('clients', { q }, false);
  };

  window.openClient = (clientId) => {
    const consults = HI.getConsults().filter(c => c.clientId === clientId)
                      .sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    if (consults.length > 0) {
      HIApp.go('readiness', { consultId: consults[0].id });
    } else {
      HIConsult.reset();
      HIApp.go('client-info', { clientId });
    }
  };

  window.startNewConsult = () => {
    if (!HI.canStartConsult()) { HIApp.go('subscription'); return; }
    HIConsult.reset();
    HIApp.go('client-info');
  };
}

/* ================================================================
   S18 - SUBSCRIPTION PLANS
   ================================================================ */
function renderS18Subscription() {
  const sub = HI.getSub();
  const current = String(sub.plan || '').toLowerCase() === 'salon' ? 'studio' : String(sub.plan || '').toLowerCase();

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      desc: 'Essential planning for an independent extension stylist.',
      color: 'var(--gold)',
      features: [
        { label:'Private stylist dashboard', included: true },
        { label:'Client consultation workflow', included: true },
        { label:'Hair readiness score', included: true },
        { label:'Placement and load planning', included: true },
        { label:'Saved client records', included: true },
        { label:'AI hair previews', included: false }
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      desc: 'Advanced client planning and AI visualization.',
      color: 'var(--gold)',
      badge: 'Most Popular',
      features: [
        { label:'Everything in Starter', included: true },
        { label:'Client photo uploads', included: true },
        { label:'10 AI hair previews per month', included: true },
        { label:'Professional client reports', included: true },
        { label:'Placement map and load score', included: true },
        { label:'Saved consultation history', included: true }
      ]
    },
    {
      id: 'studio',
      name: 'Studio',
      desc: 'Higher-capacity AI planning for a growing studio.',
      color: 'var(--success)',
      features: [
        { label:'Everything in Pro', included: true },
        { label:'50 AI hair previews per month', included: true },
        { label:'Studio-scale client planning', included: true },
        { label:'Professional client reports', included: true },
        { label:'Saved consultation history', included: true },
        { label:'Stripe billing portal access', included: true }
      ]
    }
  ];

  return `
  <div class="hi-screen hi-animate-fade" id="screen-subscription">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center"><div class="hi-header-title">Subscription</div><div class="hi-header-sub">Choose Your Plan</div></div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">
      <div style="text-align:center;margin-bottom:28px;">
        <h2 class="hi-heading hi-mb-2">Your HairIntel Plan</h2>
        <p class="hi-body">Compare the three live Stripe tiers and manage your subscription securely.</p>
      </div>

      <div class="hi-banner" style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:12px;display:flex;gap:12px;align-items:center;padding:14px;margin-bottom:20px;">
        <span style="color:var(--success);">${HIcons.check}</span>
        <div style="font-size:13px;color:var(--text-sub);">You're on the <strong style="color:var(--success);">${hiCapitalize(current || 'paid')}</strong> plan. Your private stylist workspace is active.</div>
      </div>

      <!-- Plan Cards -->
      ${plans.map(plan => `
      <div class="hi-card hi-mb-4" style="position:relative;${plan.id === 'pro' ? 'border-color:var(--gold-border);' : ''}${current === plan.id ? 'border-color:var(--success);' : ''}">
        ${plan.badge ? `<div style="position:absolute;top:-1px;right:14px;background:var(--gold);color:var(--bg);font-size:10px;font-weight:700;padding:4px 10px;border-radius:0 0 8px 8px;letter-spacing:0.06em;">${plan.badge}</div>` : ''}
        ${current === plan.id ? `<div style="position:absolute;top:-1px;left:14px;background:var(--success);color:var(--bg);font-size:10px;font-weight:700;padding:4px 10px;border-radius:0 0 8px 8px;letter-spacing:0.06em;">CURRENT PLAN</div>` : ''}

        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;">
          <div>
            <div style="font-size:18px;font-weight:700;color:${plan.color};margin-bottom:3px;">${plan.name}</div>
            <div style="font-size:12px;color:var(--text-muted);">${plan.desc}</div>
          </div>
          <div style="text-align:right;">
            <span style="font-size:26px;font-weight:800;color:var(--text);" data-inner-price="${plan.id}">Loading…</span>
            <span style="font-size:12px;color:var(--text-muted);" data-inner-interval="${plan.id}"></span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;">
          ${plan.features.map(f => `
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="color:${f.included ? 'var(--success)' : 'var(--border)'};flex-shrink:0;">
              ${f.included
                ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>`
                : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
              }
            </span>
            <span style="font-size:13px;color:${f.included ? 'var(--text-sub)' : 'var(--text-muted)'};">${f.label}</span>
          </div>`).join('')}
        </div>

        ${current === plan.id
          ? `<button class="hi-btn" style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:var(--success);font-size:13px;" disabled>Current Plan</button>`
          : `<button class="hi-btn ${plan.id === 'pro' ? 'hi-btn-gold' : 'hi-btn-outline'}" id="btn-${plan.id}" onclick="selectPlan('${plan.id}')">
               Manage or switch plan
             </button>`
        }
      </div>`).join('')}

      <!-- Trial terms -->
      <div style="text-align:center;padding:16px 0;">
        <div style="display:inline-flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          New subscriptions include a 7-day trial. Cancel before renewal to avoid the first charge.
        </div>
      </div>

      <!-- FAQ -->
      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Frequently Asked</div>
        ${[
          { q:'Can I switch plans?', a:'Use the secure Stripe billing portal to manage or change an existing subscription.' },
          { q:'Is client data stored in the cloud?', a:'Current consultation records and uploaded photo previews are stored locally in this browser. Use a trusted stylist device.' },
          { q:'Which plans include AI previews?', a:'Pro includes up to 10 AI previews per month; Studio includes up to 50. Starter does not include AI previews.' }
        ].map(faq => `
        <div class="hi-faq-item" style="padding:12px 0;border-bottom:1px solid var(--border-light);">
          <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px;">${faq.q}</div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.6;">${faq.a}</div>
        </div>`).join('')}
      </div>

    </div>
  </div>`;
}

function initS18Subscription() {
  const formatPrice = (plan) => {
    if (!plan?.available || !Number.isFinite(Number(plan.unitAmount))) return null;
    const amount = Number(plan.unitAmount) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(plan.currency || 'usd').toUpperCase(),
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  fetch('/api/pricing')
    .then(response => response.json().then(data => ({ response, data })))
    .then(({ response, data }) => {
      if (!response.ok || !Array.isArray(data?.plans)) throw new Error(data?.error || 'Pricing unavailable');
      data.plans.forEach(plan => {
        const display = formatPrice(plan);
        const price = document.querySelector(`[data-inner-price="${plan.slug}"]`);
        const interval = document.querySelector(`[data-inner-interval="${plan.slug}"]`);
        if (price) price.textContent = display || 'Not configured';
        if (interval) interval.textContent = display && plan.interval ? ` / ${plan.interval}` : '';
      });
    })
    .catch(error => {
      console.warn('[HairIntel] Live pricing unavailable:', error?.message || error);
      document.querySelectorAll('[data-inner-price]').forEach(element => { element.textContent = 'Unavailable'; });
    });

  window.selectPlan = async () => {
    try {
      const client = await window.HAIRI?.ensureClient?.();
      const { data } = client?.auth ? await client.auth.getUser() : { data: null };
      const email = data?.user?.email;
      if (!email) throw new Error('Sign in again to manage billing.');
      const response = await fetch('/api/create-billing-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnUrl: window.location.href })
      });
      const result = await response.json();
      if (!response.ok || !result?.url) throw new Error(result?.error || 'Billing portal unavailable.');
      window.location.href = result.url;
    } catch (error) {
      console.error('[HairIntel] Billing portal error:', error);
      hiToast(error.message || 'Billing portal could not be opened.', 'error');
    }
  };
}
