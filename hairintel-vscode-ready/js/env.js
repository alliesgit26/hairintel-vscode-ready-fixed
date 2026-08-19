window.ENV = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: ''
};

// Billing, pricing-display, account-lifecycle, and recovery adapters load before
// the auth/subscription gate. Native-only adapters remain inert in web browsers.
(function loadHairIntelPlatformAdapters() {
  const sources = [
    'js/play-billing.js',
    'js/play-entitlement-sync.js',
    'js/pricing-display-fallback.js',
    'js/account-deletion.js',
    'js/password-recovery.js'
  ];
  if (document.readyState === 'loading') {
    sources.forEach(src => document.write('<script src="' + src + '"><\\/script>'));
    return;
  }
  sources.forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  });
})();
