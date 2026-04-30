/* ================================================================
   S17 — SAVED CLIENTS / HISTORY
   ================================================================ */
function renderS17Clients(params = {}) {
  const clients  = HI.getClients();
  const consults = HI.getConsults();
  const query    = params.q || '';

  const filtered = query
    ? clients.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()))
    : clients;

  const consultMap = {};
  consults.forEach(c => {
    if (!consultMap[c.clientId]) consultMap[c.clientId] = [];
    consultMap[c.clientId].push(c);
  });

  const sorted = [...filtered].sort((a, b) => {
    const aLatest = consultMap[a.id]?.[0]?.createdAt || a.createdAt;
    const bLatest = consultMap[b.id]?.[0]?.createdAt || b.createdAt;
    return new Date(bLatest) - new Date(aLatest);
  });

  return `
  <div class="hi-screen hi-animate-fade" id="screen-clients">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.go('welcome')">${HIcons.back} Home</button>
      <div class="hi-text-center">
        <div class="hi-header-title">Clients</div>
        <div class="hi-header-sub">${clients.length} saved</div>
      </div>
      <button class="hi-header-action-btn" onclick="startNewConsult()" style="color:var(--gold);background:var(--gold-pale);border:1px solid var(--gold-border);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;">
        + New
      </button>
    </div>

    <div class="hi-content">

      <div style="position:relative;margin-bottom:16px;">
        <div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <input type="text" id="client-search" class="hi-input" placeholder="Search clients..." value="${query}" style="padding-left:38px;" oninput="filterClients(this.value)" />
      </div>

      ${sorted.length === 0 ? `
      <div style="padding:60px 0;text-align:center;">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--gold-pale);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--gold);">${HIcons.clients}</div>
        <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px;">${query ? 'No results found' : 'No clients yet'}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">${query ? 'Try a different search term' : 'Start a consultation to add your first client'}</div>
        ${!query ? `<button class="hi-btn hi-btn-gold" onclick="startNewConsult()">Start First Consultation</button>` : ''}
      </div>
      ` : sorted.map(c => {
        const cConsults = (consultMap[c.id] || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const latest = cConsults[0];
        const readiness = latest?.result?.readiness;
        const dotColor =
          readiness === 'green' ? 'var(--success)' :
          readiness === 'yellow' ? 'var(--warning)' :
          readiness === 'red' ? 'var(--danger)' :
          'var(--border)';

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
                ${latest ? `<span style="font-size:12px;color:var(--border);">·</span><span style="font-size:12px;color:var(--text-muted);">Last: ${hiDate(latest.createdAt)}</span>` : ''}
              </div>
            </div>
            <span style="color:var(--text-muted);flex-shrink:0;">${HIcons.chevron}</span>
          </div>
        </div>`;
      }).join('')}

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
    const consults = HI.getConsults()
      .filter(c => c.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (consults.length > 0) {
      HIApp.go('readiness', { consultId: consults[0].id });
    } else {
      HIConsult.reset();
      HIApp.go('client-info', { clientId });
    }
  };

  window.startNewConsult = () => {
    const sub = HI.getSub ? HI.getSub() : {};
    const plan = sub.plan || 'none';

    if (plan !== 'starter' && plan !== 'pro' && plan !== 'studio') {
      HIApp.go('subscription');
      return;
    }

    HIConsult.reset();
    HIApp.go('client-info');
  };
}

/* ================================================================
   S18 — SUBSCRIPTION PLANS
   ================================================================ */
function renderS18Subscription() {
  const sub = HI.getSub ? HI.getSub() : {};
  const current = sub.plan || 'none';
  const isPaidPlan = current === 'starter' || current === 'pro' || current === 'studio';

  const aiLimit = typeof HI.getAIPreviewLimit === 'function' ? HI.getAIPreviewLimit() : 0;
  const aiRemaining = typeof HI.remainingAIPreviews === 'function' ? HI.remainingAIPreviews() : 0;

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$29',
      period: '/month',
      desc: 'For individual stylists getting started with HairIntel AI.',
      color: 'var(--gold)',
      badge: 'Start Here',
      features: [
        { label: 'Unlimited consultations', included: true },
        { label: '5 AI previews / month', included: true },
        { label: 'Hair Readiness Score', included: true },
        { label: 'Basic install plan', included: true },
        { label: 'Saved client history', included: true },
        { label: 'Placement map', included: true },
        { label: 'PDF export', included: false },
        { label: 'Team accounts', included: false }
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$49',
      period: '/month',
      desc: 'For professional stylists who want full planning and exports.',
      color: 'var(--gold)',
      badge: 'Most Popular',
      features: [
        { label: 'Everything in Starter', included: true },
        { label: '10 AI previews / month', included: true },
        { label: 'Full PDF export', included: true },
        { label: 'Client version sharing', included: true },
        { label: 'Full saved client history', included: true },
        { label: 'Placement map & load score', included: true },
        { label: 'No watermark', included: true },
        { label: 'Team accounts', included: false }
      ]
    },
    {
      id: 'studio',
      name: 'Studio',
      price: '$79',
      period: '/month',
      desc: 'For salons and multi-stylist teams.',
      color: 'var(--success)',
      features: [
        { label: 'Everything in Pro', included: true },
        { label: '50 AI previews / month', included: true },
        { label: 'Up to 5 stylist accounts', included: true },
        { label: 'Shared client database', included: true },
        { label: 'Branded PDF exports', included: true },
        { label: 'Salon management tools', included: true },
        { label: 'Priority support', included: true },
        { label: 'Analytics dashboard', included: true }
      ]
    }
  ];

  return `
  <div class="hi-screen hi-animate-fade" id="screen-subscription">
    <div class="hi-header">
      <button class="hi-back-btn" onclick="HIApp.back()">${HIcons.back} Back</button>
      <div class="hi-text-center">
        <div class="hi-header-title">Subscription</div>
        <div class="hi-header-sub">Choose Your Plan</div>
      </div>
      <div class="hi-header-action"></div>
    </div>

    <div class="hi-content">
      <div style="text-align:center;margin-bottom:28px;">
        <h2 class="hi-heading hi-mb-2">Choose HairIntel AI</h2>
        <p class="hi-body">Start your 7-day trial. Unlock consultations, AI previews, client planning, and advanced extension recommendations.</p>
      </div>

      ${isPaidPlan ? `
      <div class="hi-banner" style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:12px;display:flex;gap:12px;align-items:center;padding:14px;margin-bottom:20px;">
        <span style="color:var(--success);">${HIcons.check}</span>
        <div style="font-size:13px;color:var(--text-sub);flex:1;">
          You're on the <strong style="color:var(--success);">${hiCapitalize(current)}</strong> plan.
          ${aiLimit > 0 ? ` <strong>${aiRemaining}</strong> AI preview credit(s) remaining this month.` : ''}
        </div>
        <button onclick="manageBilling()" style="font-size:12px;color:var(--success);font-weight:700;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.25);border-radius:8px;padding:7px 10px;cursor:pointer;">
          Manage Billing
        </button>
      </div>
      ` : `
      <div class="hi-banner hi-banner-warn hi-mb-4">
        <span class="hi-banner-icon">${HIcons.info}</span>
        <div style="font-size:13px;color:var(--text-sub);">
          Choose a paid plan to unlock HairIntel AI consultations and client planning tools.
        </div>
      </div>
      `}

      ${plans.map(plan => `
      <div class="hi-card hi-mb-4" style="position:relative;${plan.id === 'pro' ? 'border-color:var(--gold-border);' : ''}${current === plan.id ? 'border-color:var(--success);' : ''}">
        ${plan.badge ? `<div style="position:absolute;top:-1px;right:14px;background:${plan.id === 'starter' ? 'var(--gold)' : 'var(--gold)'};color:var(--bg);font-size:10px;font-weight:700;padding:4px 10px;border-radius:0 0 8px 8px;letter-spacing:0.06em;">${plan.badge}</div>` : ''}
        ${current === plan.id ? `<div style="position:absolute;top:-1px;left:14px;background:var(--success);color:var(--bg);font-size:10px;font-weight:700;padding:4px 10px;border-radius:0 0 8px 8px;letter-spacing:0.06em;">CURRENT PLAN</div>` : ''}

        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;">
          <div>
            <div style="font-size:18px;font-weight:700;color:${plan.color};margin-bottom:3px;">${plan.name}</div>
            <div style="font-size:12px;color:var(--text-muted);">${plan.desc}</div>
          </div>
          <div style="text-align:right;">
            <span style="font-size:26px;font-weight:800;color:var(--text);">${plan.price}</span>
            <span style="font-size:12px;color:var(--text-muted);">${plan.period}</span>
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
          ? `<button class="hi-btn" style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:var(--success);font-size:13px;margin-bottom:8px;" disabled>Current Plan</button>
             <button class="hi-btn hi-btn-outline" style="font-size:13px;" onclick="manageBilling()">Manage Billing / Cancel</button>`
          : `<button class="hi-btn ${plan.id === 'pro' ? 'hi-btn-gold' : 'hi-btn-outline'}" id="btn-${plan.id}" onclick="selectPlan('${plan.id}')">
               ${plan.id === 'starter' ? 'Start Starter Trial' : plan.id === 'studio' ? 'Start Studio Trial' : 'Start Pro Trial'}
             </button>`
        }
      </div>`).join('')}

      <div style="text-align:center;padding:16px 0;">
        <div style="display:inline-flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted);margin-bottom:8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          7-day free trial · Cancel any time
        </div>

        <div style="font-size:11px;color:var(--text-muted);line-height:1.5;max-width:320px;margin:0 auto;">
          By subscribing, you agree to HairIntel AI’s
          <a href="/privacy.html" style="color:var(--gold);text-decoration:none;">Privacy Policy</a>
          and
          <a href="/terms.html" style="color:var(--gold);text-decoration:none;">Terms & Billing</a>.
        </div>

        ${isPaidPlan ? `
        <div style="margin-top:12px;">
          <button class="hi-btn hi-btn-ghost" style="font-size:12px;padding:8px 14px;width:auto;" onclick="manageBilling()">
            Manage Billing / Cancel Subscription
          </button>
        </div>
        ` : ''}
      </div>

      <div class="hi-card hi-mb-4">
        <div class="hi-label hi-mb-3">Frequently Asked</div>
        ${[
          { q: 'Is there a free plan?', a: 'HairIntel AI is a paid subscription platform. New users may start with a 7-day trial when available through Stripe checkout.' },
          { q: 'Can I switch plans?', a: 'Yes. Use Manage Billing to update, cancel, or manage your subscription through Stripe.' },
          { q: 'How do AI previews work?', a: 'Each AI preview generation uses 1 monthly preview credit according to your active plan.' },
          { q: 'Is client data stored in the cloud?', a: 'Client records remain local in this version; subscription status is synced through Stripe and Supabase when configured.' },
          { q: 'How do I cancel?', a: 'Open Manage Billing to cancel your subscription securely through Stripe.' }
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
  window.selectPlan = async (plan) => {
    if (plan === 'starter' || plan === 'pro' || plan === 'studio') {
      try {
        if (window.HAIRI && typeof window.HAIRI.startCheckout === 'function') {
          await window.HAIRI.startCheckout(plan);
          return;
        }

        throw new Error('Checkout system is not available.');
      } catch (err) {
        console.error('[HairIntel] Checkout error:', err);
        hiToast(err.message || 'Checkout could not be started.', 'error');
        return;
      }
    }

    hiToast('Please choose Starter, Pro, or Studio.', 'error');
  };

  window.manageBilling = async () => {
    try {
      const sub = HI.getSub ? HI.getSub() : {};
      const stylist = HI.getStylist ? HI.getStylist() : {};

      let email =
        sub.customer_email ||
        sub.email ||
        stylist.email ||
        localStorage.getItem('hairintel_customer_email') ||
        '';

      email = String(email || '').trim().toLowerCase();

      if (!email) {
        email = prompt('Enter the email used for your HairIntel subscription:');
        email = String(email || '').trim().toLowerCase();
      }

      if (!email) {
        hiToast('Subscription email is required to open billing.', 'error');
        return;
      }

      localStorage.setItem('hairintel_customer_email', email);

      hiToast('Opening secure Stripe billing portal...', 'info');

      const response = await fetch('/api/create-billing-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Could not open billing portal.');
      }

      if (!data.url) {
        throw new Error('Stripe billing portal did not return a URL.');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('[HairIntel] Billing portal error:', err);
      hiToast(err.message || 'Could not open billing portal.', 'error');
    }
  };
}