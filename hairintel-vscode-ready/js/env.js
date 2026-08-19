window.ENV = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: ''
};

// The public web app keeps Stripe. Inside the native Android Capacitor shell,
// this loader installs the Google Play Billing adapter before the auth gate.
(function loadHairIntelPlayBilling() {
  const src = 'js/play-billing.js';
  if (document.readyState === 'loading') {
    document.write('<script src="' + src + '"><\\/script>');
    return;
  }
  const script = document.createElement('script');
  script.src = src;
  script.async = false;
  document.head.appendChild(script);
})();
