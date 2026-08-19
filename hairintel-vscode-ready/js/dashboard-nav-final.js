(function () {
  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function closeModals() {
    document.querySelectorAll('.modal.show').forEach((modal) => {
      modal.classList.remove('show');
      modal.style.display = 'none';
    });
  }

  function toast(message) {
    let box = document.getElementById('hi-dashboard-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'hi-dashboard-toast';
      box.style.cssText = [
        'position:fixed', 'right:24px', 'bottom:24px', 'z-index:99999',
        'background:#17110d', 'color:#f7efe9',
        'border:1px solid rgba(244,201,93,.35)',
        'box-shadow:0 20px 60px rgba(0,0,0,.45)',
        'border-radius:16px', 'padding:14px 18px',
        'font:700 13px Inter,Arial,sans-serif', 'max-width:360px'
      ].join(';');
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.style.display = 'block';
    clearTimeout(box.__timer);
    box.__timer = setTimeout(() => { box.style.display = 'none'; }, 2800);
  }

  function latestConsultation() {
    const consults = readJson('hi_consultations', []);
    if (!Array.isArray(consults) || !consults.length) return null;
    return [...consults].sort((a, b) => {
      const ad = new Date(a.updatedAt || a.analyzedAt || a.createdAt || a.savedAt || 0).getTime();
      const bd = new Date(b.updatedAt || b.analyzedAt || b.createdAt || b.savedAt || 0).getTime();
      return bd - ad;
    })[0];
  }

  function getResultData() {
    const consult = latestConsultation() || {};
    const result = consult.result || consult.analysis || {};
    const plan = result.plan || consult.plan || {};
    const capacity = result.capacity || consult.capacity || {};
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    return { consult, result, plan, capacity, warnings };
  }

  function ensureInlinePanel() {
    let panel = document.getElementById('hi-dashboard-inline-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'hi-dashboard-inline-panel';
      panel.className = 'panel dynamic-panel show';
      panel.style.cssText = [
        'display:block', 'margin:0 0 22px', 'padding:24px', 'border-radius:16px',
        'border:1px solid rgba(206,183,171,.18)',
        'background:linear-gradient(145deg, rgba(30,25,22,.88), rgba(12,9,7,.80))',
        'box-shadow:0 18px 50px rgba(0,0,0,.30)'
      ].join(';');
      const content = document.querySelector('#plumDashboard .pv2-content, #plumDashboard .content, .content');
      if (content) content.prepend(panel);
      else document.body.prepend(panel);
    }
    return panel;
  }

  function showInlinePanel(title, body, details) {
    closeModals();
    const panel = ensureInlinePanel();
    panel.innerHTML = `
      <p class="eyebrow" style="margin-bottom:10px;">${title}</p>
      <h3 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:500;color:var(--cream,#f7efe9);">${title}</h3>
      <p style="margin:0;color:var(--muted,rgba(247,239,233,.68));line-height:1.6;font-size:14px;max-width:780px;">${body}</p>
      ${details ? `<div style="margin-top:16px;color:var(--cream,#f7efe9);font-size:13px;line-height:1.6;">${details}</div>` : ''}
    `;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideInlinePanel() {
    document.getElementById('hi-dashboard-inline-panel')?.remove();
  }

  function goTo(relativeUrl) {
    window.location.href = relativeUrl;
  }

  function openBuilder(screen) {
    if (screen === 'clients') return goTo('hairintel/index.html?screen=clients');
    if (screen === 'ai') return goTo('hairintel/index.html?screen=client-info&flow=ai');
    return goTo('hairintel/index.html?screen=client-info&from=dashboard&start=1');
  }

  function scrollToId(id) {
    const target = document.getElementById(id);
    if (!target || target.hidden) return false;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function setActiveTab(button) {
    document.querySelectorAll('.tabs button').forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
  }

  function activatePanel(button) {
    setActiveTab(button);
    const panel = String(button.dataset.panel || 'overview').toLowerCase();
    const data = getResultData();
    const plan = data.plan;
    const capacity = data.capacity;
    const warnings = data.warnings;

    if (panel === 'overview') {
      closeModals();
      hideInlinePanel();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (panel === 'analysis') {
      showInlinePanel(
        'Analysis',
        'The latest saved consultation is summarized here with hair integrity, density, scalp condition, placement risk, and load-safety information.',
        `<strong>Integrity Score:</strong> ${data.result.integrityScore || data.result.readinessScore || capacity.score || 'Pending'} / 100<br>
         <strong>Readiness:</strong> ${data.result.readiness || 'Pending'}<br>
         <strong>Load Status:</strong> ${capacity.status || 'Pending'}`
      );
      return;
    }

    if (panel === 'recommendations') {
      showInlinePanel(
        'Recommendations',
        'Recommendations are based on the latest saved consultation and should be reviewed by the stylist before service.',
        `<strong>Method:</strong> ${plan.method || 'Pending'}<br>
         <strong>Planned Load:</strong> ${plan.grams ? plan.grams + 'g' : 'Pending'}<br>
         <strong>Recommended Max:</strong> ${(capacity.safeMax || capacity.recommendedMax) ? (capacity.safeMax || capacity.recommendedMax) + 'g' : 'Pending'}<br>
         <strong>Safety Note:</strong> ${warnings[0] || capacity.status || 'Review placement and client tolerance before install.'}`
      );
      return;
    }

    if (panel === 'history') {
      const consults = readJson('hi_consultations', []);
      showInlinePanel(
        'History',
        'Your saved consultations appear here as they are completed.',
        `<strong>Saved Consultations:</strong> ${Array.isArray(consults) ? consults.length : 0}`
      );
    }
  }

  async function shareDashboard() {
    const shareData = {
      title: 'HairIntel Consultation Dashboard',
      text: 'HairIntel consultation dashboard',
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      toast('Dashboard link copied.');
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      toast('Could not share this dashboard.');
    }
  }

  function reviewPlan() {
    if (scrollToId('install-plan')) return;
    if (scrollToId('install')) return;
    showInlinePanel('Install Plan', 'Complete or open a consultation to build the client install plan.', '');
  }

  function handleHashLink(link, event) {
    const href = String(link.getAttribute('href') || '');
    if (!href.startsWith('#')) return false;
    const id = href.slice(1);
    if (!id) return false;

    if (id === 'consultations' || id === 'consultationWorkspace') {
      event.preventDefault();
      openBuilder();
      return true;
    }

    const target = document.getElementById(id);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }
    return false;
  }

  document.addEventListener('click', function (event) {
    const target = event.target.closest('button, a');
    if (!target) return;

    if (target.tagName === 'A' && handleHashLink(target, event)) return;

    const action = String(target.dataset.action || '').toLowerCase();
    const panel = String(target.dataset.panel || '').toLowerCase();
    const text = String(target.textContent || '').trim().toLowerCase();

    if (panel) {
      event.preventDefault();
      activatePanel(target);
      return;
    }

    if (!action) return;

    if (action === 'dashboard') {
      event.preventDefault();
      hideInlinePanel();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (action === 'consultations') {
      // Preserve specific client/AI destinations on real links.
      if (target.tagName === 'A') {
        const href = String(target.getAttribute('href') || '');
        if (href && !href.startsWith('#')) return;
      }
      event.preventDefault();
      openBuilder(text.includes('client') ? 'clients' : (text.includes('ai') ? 'ai' : undefined));
      return;
    }

    if (action === 'clients') {
      event.preventDefault();
      openBuilder('clients');
      return;
    }

    if (action === 'education') {
      event.preventDefault();
      showInlinePanel(
        'Education',
        'HairIntel education covers load limits, blending, extension-method selection, maintenance guidance, placement strategy, and hair-safety considerations.',
        ''
      );
      return;
    }

    if (action === 'review' || action === 'fullplan') {
      event.preventDefault();
      reviewPlan();
      return;
    }

    if (action === 'share') {
      event.preventDefault();
      shareDashboard();
      return;
    }

    if (action === 'export') {
      event.preventDefault();
      window.print();
      return;
    }

    if (action === 'book') {
      event.preventDefault();
      openBuilder();
      return;
    }

    if (action === 'closemodal') {
      event.preventDefault();
      closeModals();
      return;
    }
  }, false);
})();
