window.ENV = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: ''
};

// Billing, pricing-display, account-lifecycle, recovery, and signup-message
// adapters load before the auth/subscription gate. Native-only adapters remain
// inert in web browsers.
(function loadHairIntelPlatformAdapters() {
  const sources = [
    'js/play-billing.js',
    'js/play-entitlement-sync.js',
    'js/pricing-display-fallback.js',
    'js/account-deletion.js',
    'js/password-recovery.js',
    'js/signup-message-fix.js'
  ];

  if (document.readyState === 'loading') {
    // During initial HTML parsing, document.write keeps these adapters
    // synchronous and ordered. Split the closing tag so this loader cannot
    // accidentally emit a literal <\/script> into the page.
    sources.forEach((src) => {
      document.write('<script src="' + src + '"></' + 'script>');
    });
    return;
  }

  sources.forEach((src) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  });
})();
