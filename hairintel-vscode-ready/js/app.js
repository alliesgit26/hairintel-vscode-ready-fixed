/* ================================================================
   HAIRINTEL AI — App Entry Point
   ================================================================ */

function startHIApp() {
  console.log('[HIApp] Starting init...');
  try {
    HI.loadDemo();
    console.log('[HIApp] Demo loaded');
    HIApp.go('welcome');
    console.log('[HIApp] Welcome screen rendered');
  } catch(e) {
    console.error('[HIApp] Init failed:', e.message, e.stack);
    const c = document.getElementById('hi-screen-container');
    if (c) c.innerHTML = '<div style="padding:40px;color:#ef4444;font-family:sans-serif;font-size:14px;"><strong>App Error:</strong><br>' + e.message + '</div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startHIApp);
} else {
  startHIApp();
}
