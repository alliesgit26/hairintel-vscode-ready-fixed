/* ================================================================
   HAIRINTEL AI — Utilities, Icons, Router
   ================================================================ */

/* ---- Toast ---- */
function hiToast(msg, type = 'info', ms = 3000) {
  const c = document.getElementById('hi-toast-container');
  if (!c) return;
  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };
  const t = document.createElement('div');
  t.className = `hi-toast ${type}`;
  t.innerHTML = `<span style="flex-shrink:0;">${icons[type]||icons.info}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('hiding'); setTimeout(() => t.remove(), 240); }, ms);
}

/* ---- DOM ---- */
const hEl  = id  => document.getElementById(id);
const hQs  = (s,c=document) => c.querySelector(s);
const hQsa = (s,c=document) => [...c.querySelectorAll(s)];

/* ---- Format ---- */
function hiCurrency(n) { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0); }
function hiDate(str)   { if (!str) return '—'; try { return new Date(str).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); } catch { return str; } }
function hiInitials(f='',l='') { return ((f[0]||'')+(l[0]||'')).toUpperCase(); }
function hiCapitalize(s) { return s ? s.charAt(0).toUpperCase()+s.slice(1) : ''; }

/* ---- Option Toggle Init ---- */
function hiInitOptions(container, multi = false) {
  hQsa('.hi-option, .hi-tag', container || document).forEach(opt => {
    opt.addEventListener('click', function() {
      if (!multi) {
        const grp = this.closest('[data-option-group]');
        if (grp) hQsa('.hi-option.selected, .hi-tag.selected', grp).forEach(o => o.classList.remove('selected'));
      }
      this.classList.toggle('selected');
    });
  });
}

/* ---- Get Selected Values ---- */
function hiGetSelected(groupEl) {
  return hQsa('.hi-option.selected, .hi-tag.selected', groupEl).map(o => o.dataset.val || o.textContent.trim());
}
function hiGetSingle(groupEl) {
  return hQsa('.hi-option.selected, .hi-tag.selected', groupEl).map(o => o.dataset.val)[0] || '';
}

/* ---- SVG Icons ---- */
const HIcons = {
  back:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg>`,
  plus:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  check:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  chevron:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>`,
  camera:   `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  brain:    `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9.5 2A2.5 2.5 0 007 4.5v.5A2.5 2.5 0 004.5 7.5a2.5 2.5 0 001.5 4.77V14a2 2 0 002 2h1.5M14.5 2A2.5 2.5 0 0117 4.5v.5a2.5 2.5 0 012.5 2.5 2.5 2.5 0 01-1.5 4.77V14a2 2 0 01-2 2h-1.5M9 14.5V20M15 14.5V20M9 20h6"/></svg>`,
  user:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  scissors: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
  download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  share:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  warning:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  star:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  lock:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  map:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  sparkle:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2l2.09 6.26L20 9l-4.67 3.63L17 18.5l-5-3.09L7 18.5l1.67-5.87L4 9l5.91-.74L12 2z"/></svg>`,
  eye:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  trash:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  clients:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`
};

/* ---- Step Progress Bar HTML ---- */
function hiProgressBar(current, total) {
  return `<div class="hi-progress-bar">
    ${Array.from({length: total}, (_,i) => `
      <div class="hi-step-seg ${i < current ? 'done' : i === current ? 'active' : ''}"></div>
    `).join('')}
  </div>`;
}

/* ---- Score Ring SVG ---- */
function hiScoreRing(score, color, size = 120) {
  const r = 48; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return `
  <div class="hi-score-ring" style="width:${size}px;height:${size}px;">
    <svg width="${size}" height="${size}" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--border-light)" stroke-width="8"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${dash} ${circ}" stroke-linecap="round"/>
    </svg>
    <div class="hi-score-ring-label">
      <span class="hi-score-num" style="color:${color};">${score}</span>
      <span class="hi-score-denom">/100</span>
    </div>
  </div>`;
}

/* ================================================================
   ROUTER
   ================================================================ */
const HIApp = {
  current: null,
  stack: [],
  params: {},

  SCREENS: {
    'welcome':      { render: p => renderS01Welcome(p),      init: p => initS01Welcome(p)      },
    'client-info':  { render: p => renderS02ClientInfo(p),   init: p => initS02ClientInfo(p)   },
    'photos':       { render: p => renderS03Photos(p),        init: p => initS03Photos(p)       },
    'goals':        { render: p => renderS04Goals(p),         init: p => initS04Goals(p)        },
    'hair-profile': { render: p => renderS05HairProfile(p),  init: p => initS05HairProfile(p)  },
    'concerns':     { render: p => renderS06Concerns(p),     init: p => initS06Concerns(p)     },
    'analysis':     { render: p => renderS07Analysis(p),     init: p => initS07Analysis(p)     },
    'readiness':    { render: p => renderS08Readiness(p),    init: p => initS08Readiness(p)    },
    'placement':    { render: p => renderS09Placement(p),    init: p => initS09Placement(p)    },
    'install-plan': { render: p => renderS10InstallPlan(p),  init: p => initS10InstallPlan(p)  },
    'load-safety':  { render: p => renderS11LoadSafety(p),   init: p => initS11LoadSafety(p)   },
    'outcome':      { render: p => renderS12Outcome(p),      init: p => initS12Outcome(p)      },
    'summary':      { render: p => renderS13Summary(p),      init: p => initS13Summary(p)      },
    'estimate':     { render: p => renderS14Estimate(p),     init: p => initS14Estimate(p)     },
    'alternatives': { render: p => renderS15Alternatives(p), init: p => initS15Alternatives(p) },
    'export':       { render: p => renderS16Export(p),       init: p => initS16Export(p)       },
    'clients':      { render: p => renderS17Clients(p),      init: p => initS17Clients(p)      },
    'subscription': { render: p => renderS18Subscription(p), init: p => initS18Subscription(p) }
  },

  go(name, params = {}, push = true) {
    const def = this.SCREENS[name];
    if (!def) { console.warn('[HIApp] Unknown screen:', name); return; }
    if (push && this.current && this.current !== name) {
      this.stack.push({ screen: this.current, params: this.params });
      if (this.stack.length > 30) this.stack.shift();
    }
    this.current = name;
    this.params = params;
    const container = hEl('hi-screen-container');
    if (!container) return;
    try { container.innerHTML = def.render(params); } catch(e) { console.error('[HIApp] Render error', name, e); container.innerHTML = `<div class="hi-screen" style="padding:40px;color:var(--danger);">Render error: ${e.message}</div>`; }
    const screen = container.querySelector('.hi-screen');
    if (screen) screen.scrollTop = 0;
    try { if (def.init) def.init(params); } catch(e) { console.error('[HIApp] Init error', name, e); }
  },

  back() {
    if (this.stack.length) {
      const prev = this.stack.pop();
      this.go(prev.screen, prev.params, false);
    } else {
      this.go('welcome', {}, false);
    }
  },

  init() {
    HI.loadDemo();
    this.go('welcome');
  }
};
