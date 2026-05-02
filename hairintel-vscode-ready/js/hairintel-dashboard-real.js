(function () {
  function createIcon(text) {
    return '<span style="width:18px;display:inline-grid;place-items:center;opacity:.82">' + text + '</span>';
  }

  function buildShell() {
    if (document.body.classList.contains('hi-dashboard-active')) return;

    var app = document.getElementById('app') || document.getElementById('root');
    if (!app) return;

    document.body.classList.add('hi-dashboard-active');

    var shell = document.createElement('div');
    shell.className = 'hi-dashboard-shell';

    var sidebar = document.createElement('aside');
    sidebar.className = 'hi-dashboard-sidebar';
    sidebar.innerHTML = `
      <div>
        <div class="hi-dashboard-logo">HairIntel</div>
        <div class="hi-dashboard-tagline">Intelligent Hair Consultation</div>
      </div>

      <nav class="hi-dashboard-nav">
        <button type="button">${createIcon('▦')} Dashboard</button>
        <button type="button" class="active">${createIcon('☰')} Consultations</button>
        <button type="button">${createIcon('♙')} Clients</button>
        <button type="button">${createIcon('□')} Templates</button>
        <button type="button">${createIcon('⌂')} Education</button>
        <button type="button">${createIcon('?')} Support</button>
      </nav>

      <div class="hi-dashboard-bottom">
        <div class="hi-dashboard-user">
          <div class="hi-dashboard-avatar">HI</div>
          <div>
            <strong>Master Consultant</strong>
            <span>HairIntel Pro</span>
          </div>
        </div>

        <div class="hi-dashboard-upgrade">
          <strong>Unlock Pro Tools</strong>
          <p>Advanced mapping, load modeling, saved reports, and client-ready exports.</p>
          <button type="button">Upgrade Now</button>
        </div>

        <div class="hi-dashboard-logout">↳ Log Out</div>
      </div>
    `;

    var main = document.createElement('main');
    main.className = 'hi-dashboard-main';

    var topbar = document.createElement('div');
    topbar.className = 'hi-dashboard-topbar';
    topbar.innerHTML = `
      <div class="hi-dashboard-back">‹ Back to Consultations</div>
      <div class="hi-dashboard-tabs">
        <button type="button" class="active">Overview</button>
        <button type="button">Analysis</button>
        <button type="button">Recommendations</button>
        <button type="button">History</button>
      </div>
      <div class="hi-dashboard-actions">
        <button type="button" class="hi-dashboard-export">⇩ Export Report</button>
        <button type="button" class="hi-dashboard-more">•••</button>
      </div>
    `;

    var appWrap = document.createElement('div');
    appWrap.className = 'hi-dashboard-app-wrap';

    var parent = app.parentNode;
    parent.insertBefore(shell, app);

    appWrap.appendChild(app);
    main.appendChild(topbar);
    main.appendChild(appWrap);
    shell.appendChild(sidebar);
    shell.appendChild(main);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildShell);
  } else {
    buildShell();
  }
})();
