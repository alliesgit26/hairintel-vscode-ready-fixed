window.ENV = window.ENV || {};
const HAIRI = window.HAIRI || {};
window.HAIRI = HAIRI;

HAIRI.isConfigured = function () {
  return !!(window.supabase && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY);
};

HAIRI.getClient = function () {
  if (!HAIRI.isConfigured()) return null;
  if (!HAIRI._client) {
    HAIRI._client = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);
  }
  return HAIRI._client;
};

HAIRI.signUp = async function ({ email, password, firstName, lastName }) {
  const client = HAIRI.getClient();
  if (!client) throw new Error('Supabase is not configured yet.');
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/` }
  });
  if (error) throw error;
  if (data?.user?.id) {
    await client.from('profiles').upsert({
      id: data.user.id,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      plan: 'free'
    });
  }
  return data;
};

HAIRI.signIn = async function ({ email, password }) {
  const client = HAIRI.getClient();
  if (!client) throw new Error('Supabase is not configured yet.');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

HAIRI.signOut = async function () {
  const client = HAIRI.getClient();
  if (!client) throw new Error('Supabase is not configured yet.');
  const { error } = await client.auth.signOut();
  if (error) throw error;
  HIApp.go('welcome');
};

HAIRI.startCheckout = async function (plan) {
  const client = HAIRI.getClient();
  let customerEmail = null;
  if (client) {
    const { data } = await client.auth.getUser();
    customerEmail = data?.user?.email || null;
  }
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, customerEmail })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Checkout failed');
  window.location.href = data.url;
};
