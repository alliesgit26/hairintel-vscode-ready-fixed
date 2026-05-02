(function () {
  function icon(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  function createSidebar() {
    if (document.querySelector('.hi-exec-sidebar')) return;

    var sidebar = document.createElement('aside');
    sidebar.className = 'hi-exec-sidebar';
    sidebar.innerHTML = `
      <div class="hi-exec-brand">
        <div class="hi-exec-brand-title">HairIntel</div>
        <div class="hi-exec-brand-subtitle">Intelligent Hair Consultation</div>
      </div>

      <nav class="hi-exec-nav" aria-label="HairIntel dashboard navigation">
        <div class="hi-exec-nav-item">${icon('<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect>')}<span>Dashboard</span></div>
        <div class="hi-exec-nav-item is-active">${icon('<path d="M4 6h16"></path><path d="M4 12h10"></path><path d="M4 18h16"></path>')}<span>Consultations</span></div>
        <div class="hi-exec-nav-item">${icon('<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle>')}<span>Clients</span></div>
        <div class="hi-exec-nav-item">${icon('<path d="M4 4h16v16H4z"></path><path d="M8 8h8"></path><path d="M8 12h8"></path><path d="M8 16h5"></path>')}<span>Templates</span></div>
        <div class="hi-exec-nav-item">${icon('<path d="M12 3 2 8l10 5 10-5-10-5z"></path><path d="M4 10v6c2 2 5 3 8 3s6-1 8-3v-6"></path>')}<span>Education</span></div>
        <div class="hi-exec-nav-item">${icon('<circle cx="12" cy="12" r="9"></circle><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2.5-2.5 2-2.5 5"></path><path d="M12 17h.01"></path>')}<span>Support</span></div>
      </nav>

      <div class="hi-exec-sidebar-bottom">
        <div class="hi-exec-user-card">
          <div class="hi-exec-avatar">HI</div>
          <div>
            <div class="hi-exec-user-name">Master Consultant</div>
            <div class="hi-exec-user-role">HairIntel Pro</div>
          </div>
        </div>

        <div class="hi-exec-upgrade-card">
          <div class="hi-exec-upgrade-title">Unlock Pro Tools</div>
          <div class="hi-exec-upgrade-text">Advanced mapping, load modeling, saved reports, and client-ready exports.</div>
          <button class="hi-exec-upgrade-btn" type="button">Upgrade Now</button>
        </div>

        <div class="hi-exec-logout">↳ Log Out</div>
      </div>
    `;

    document.body.appendChild(sidebar);
  }

  function createTopbar() {
    if (document.querySelector('.hi-exec-topbar')) return;

    var topbar = document.createElement('div');
    topbar.className = 'hi-exec-topbar';
    topbar.innerHTML = `
      <div class="hi-exec-back">‹ Back to Consultations</div>

      <div class="hi-exec-tabs">
        <div class="hi-exec-tab is-active">Overview</div>
        <div class="hi-exec-tab">Analysis</div>
        <div class="hi-exec-tab">Recommendations</div>
        <div class="hi-exec-tab">History</div>
      </div>

      <div class="hi-exec-actions">
        <button class="hi-exec-export" type="button">⇩ Export Report</button>
        <button class="hi-exec-more" type="button">•••</button>
      </div>
    `;

    document.body.appendChild(topbar);
  }

  function init() {
    document.body.classList.add('hi-exec-shell-active');
    createSidebar();
    createTopbar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
