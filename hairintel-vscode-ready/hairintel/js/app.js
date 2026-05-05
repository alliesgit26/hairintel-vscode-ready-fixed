/* ================================================================
   HAIRINTEL AI â€” App Entry Point
   ================================================================ */

async function startHIApp() {
  console.log('[HIApp] Starting init...');
  try {
    if (window.HAIRI && typeof window.HAIRI.init === 'function') {
      await window.HAIRI.init();
    }

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const sessionId = params.get('session_id');

    if (checkout === 'success' && sessionId && window.HAIRI?.applyCheckoutSession) {
      try {
        const checkoutStatus = await window.HAIRI.applyCheckoutSession(sessionId);
        console.log('[HIApp] Checkout confirmed:', checkoutStatus);
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => hiToast(`${hiCapitalize(checkoutStatus.plan || 'paid')} plan activated.`, 'success', 3500), 350);
      } catch (err) {
        console.warn('[HIApp] Checkout confirmation failed:', err?.message || err);
        setTimeout(() => hiToast('Payment completed, but subscription sync needs review.', 'warning', 4000), 350);
      }
    }

    if (checkout === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => hiToast('Checkout cancelled.', 'info'), 350);
    }

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

