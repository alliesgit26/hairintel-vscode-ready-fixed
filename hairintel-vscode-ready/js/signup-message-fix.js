(function installHairIntelSignupMessageFix(){
  const oldAlert = window.alert.bind(window);
  window.alert = function(message){
    const text = String(message ?? '');
    if (text === 'Account created. Check your email to confirm it, then sign in.') {
      return oldAlert('If this is a new HairIntel email, check your inbox for the confirmation link. If you already created an account with this email, use Sign In or Forgot password instead.');
    }
    return oldAlert(message);
  };
})();
