// Browser-safe public Supabase config only.
// Production loads this through /api/config from Vercel environment variables.
window.ENV = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: ''
};
