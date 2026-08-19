(function () {
  const FALLBACK = {
    starter: '$29',
    pro: '$49',
    studio: '$79'
  };
  let timer = null;

  function isNativeAndroid() {
    try {
      return window.Capacitor?.getPlatform?.() === 'android' && window.Capacitor?.isNativePlatform?.() !== false;
    } catch {
      return false;
    }
  }

  function paintWebFallbacks() {
    if (isNativeAndroid()) return;

    Object.entries(FALLBACK).forEach(([plan, price]) => {
      document.querySelectorAll(`[data-price-value="${plan}"]`).forEach(element => {
        const current = String(element.textContent || '').trim().toLowerCase();
        if (!current || current === 'loading…' || current === 'loading...' || current === 'not configured' || current === 'unavailable') {
          element.textContent = price;
        }
      });

      document.querySelectorAll(`[data-price-interval="${plan}"]`).forEach(element => {
        const priceNode = document.querySelector(`[data-price-value="${plan}"]`);
        if (priceNode?.textContent?.trim() === price && !String(element.textContent || '').trim()) {
          element.textContent = ' / month';
        }
      });
    });
  }

  function queuePaint() {
    clearTimeout(timer);
    timer = setTimeout(paintWebFallbacks, 60);
  }

  document.addEventListener('DOMContentLoaded', () => {
    paintWebFallbacks();
    const observer = new MutationObserver(queuePaint);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });

  window.HairIntelPricingFallback = { paint: paintWebFallbacks };
})();
