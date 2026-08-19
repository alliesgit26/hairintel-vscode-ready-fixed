window.ENV = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: ''
};

// Billing and account-lifecycle adapters must be present before the auth gate.
// The billing adapter is inert in normal web browsers and activates only in
// the native Android Capacitor shell.
(function loadHairIntelPlatformAdapters() {
  const sources = ['js/play-billing.js', 'js/account-deletion.js'];
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
