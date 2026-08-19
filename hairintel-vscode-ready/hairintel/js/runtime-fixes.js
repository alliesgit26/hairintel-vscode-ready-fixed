(function HairIntelRuntimeFixes() {
  const QA_BRANCH = 'qa-pro-dashboard';
  const QA_SUFFIX = '@hairintel.preview';

  function readJson(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function isQaHost() {
    const host = String(window.location.hostname || '').toLowerCase();
    return host.endsWith('.vercel.app') && host !== 'hairintel-ai.vercel.app' && !host.includes('git-main-');
  }

  function currentEmail() {
    return String(
      localStorage.getItem('hairintel_customer_email') ||
      readJson('hairintel_profile_v1', {})?.email ||
      ''
    ).trim().toLowerCase();
  }

  function isQaUser() {
    return isQaHost() && currentEmail().endsWith(QA_SUFFIX);
  }

  function forceQaPro() {
    if (!isQaUser()) return false;
    const now = new Date().toISOString();
    const sub = {
      plan: 'pro',
      status: 'trialing',
      billingProvider: 'qa_preview',
      qaPreview: true,
      source: QA_BRANCH,
      updatedAt: now
    };
    writeJson('hairintel_subscription_v1', sub);
    writeJson('hi_subscription', sub);
    try {
      if (window.HI && typeof window.HI.setSub === 'function') window.HI.setSub(sub);
    } catch {}
    return true;
  }

  function installResponsiveFixes() {
    if (document.getElementById('hairintel-runtime-mobile-fix')) return;
    const style = document.createElement('style');
    style.id = 'hairintel-runtime-mobile-fix';
    style.textContent = `
      html,body{max-width:100%;}
      #hi-app{box-sizing:border-box;}
      @media(max-width:820px){
        html,body{width:100%!important;min-height:100%!important;overflow-x:hidden!important;}
        body{height:auto!important;min-height:100dvh!important;overflow-y:auto!important;}
        #hi-app{
          width:100%!important;max-width:100%!important;height:auto!important;min-height:100dvh!important;
          margin:0!important;padding:0!important;display:block!important;
        }
        #hi-frame{
          width:100%!important;max-width:100%!important;height:100dvh!important;min-height:100dvh!important;
          margin:0!important;border-radius:0!important;border-left:0!important;border-right:0!important;
          box-shadow:none!important;
        }
        #hi-screen-container{width:100%!important;max-width:100%!important;}
        .hi-screen{width:100%!important;max-width:100%!important;left:0!important;right:0!important;}
        .hi-header{padding-left:14px!important;padding-right:14px!important;}
        .hi-content{width:100%!important;max-width:100%!important;margin:0 auto!important;padding-left:14px!important;padding-right:14px!important;}
        .hi-field-row{grid-template-columns:1fr!important;}
        #screen-ai-preview .hi-content{padding-bottom:40px!important;}
        #screen-ai-preview .hi-card{width:100%!important;max-width:100%!important;}
      }
      @media(min-width:821px){
        #hi-frame{margin-left:auto!important;margin-right:auto!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function persistGeneratedPreview(images, consultId) {
    if (!Array.isArray(images) || !images.length) return;
    const image = images[0];
    const now = new Date().toISOString();
    const currentId = consultId || (window.HIConsult && typeof window.HIConsult.get === 'function' ? window.HIConsult.get('consultId') : null);

    writeJson('hairintel_latest_ai_preview', {
      image,
      images,
      consultId: currentId || null,
      generatedAt: now
    });

    try {
      if (window.HIConsult && typeof window.HIConsult.set === 'function') {
        window.HIConsult.set('aiPreviews', images);
        window.HIConsult.set('aiPreview', image);
      }
    } catch {}

    const consults = readJson('hi_consultations', []);
    if (!Array.isArray(consults) || !consults.length) return;

    let index = currentId ? consults.findIndex(c => c && c.id === currentId) : -1;
    if (index < 0) {
      index = consults.reduce((best, c, i, arr) => {
        if (!c) return best;
        if (best < 0) return i;
        const a = new Date(arr[best]?.updatedAt || arr[best]?.analyzedAt || arr[best]?.createdAt || 0).getTime();
        const b = new Date(c.updatedAt || c.analyzedAt || c.createdAt || 0).getTime();
        return b > a ? i : best;
      }, -1);
    }

    if (index >= 0) {
      consults[index] = {
        ...consults[index],
        aiPreviews: images,
        aiPreview: image,
        aiPreviewGeneratedAt: now,
        updatedAt: now
      };
      writeJson('hi_consultations', consults);
    }
  }

  function installPreviewPersistence() {
    if (window.__HAIRINTEL_PREVIEW_FETCH_WRAPPED__) return;
    window.__HAIRINTEL_PREVIEW_FETCH_WRAPPED__ = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const isPreviewRequest = url.includes('/api/generate-hair-preview');

      if (isPreviewRequest) forceQaPro();

      const response = await originalFetch(input, init);

      if (isPreviewRequest && response.ok) {
        try {
          const clone = response.clone();
          const data = await clone.json();
          let consultId = null;
          try {
            const body = typeof init?.body === 'string' ? JSON.parse(init.body) : (init?.body || {});
            consultId = body?.consultId || null;
          } catch {}
          persistGeneratedPreview(data?.images || [], consultId);
        } catch (err) {
          console.warn('[HairIntel] Could not persist generated preview:', err?.message || err);
        }
      }

      return response;
    };
  }

  function installQaSubscriptionGuard() {
    if (!isQaHost()) return;

    forceQaPro();
    document.addEventListener('click', (event) => {
      const target = event.target.closest('#generate-ai-preview-btn, [data-feature="ai"], button, a');
      if (!target) return;
      const text = String(target.textContent || '').toLowerCase();
      if (target.id === 'generate-ai-preview-btn' || text.includes('ai preview') || text.includes('generate preview')) {
        forceQaPro();
      }
    }, true);

    window.addEventListener('pageshow', forceQaPro);
    document.addEventListener('DOMContentLoaded', forceQaPro);
  }

  installResponsiveFixes();
  installQaSubscriptionGuard();
  installPreviewPersistence();

  window.HairIntelRuntimeFixes = {
    forceQaPro,
    persistGeneratedPreview,
    isQaUser
  };
})();
