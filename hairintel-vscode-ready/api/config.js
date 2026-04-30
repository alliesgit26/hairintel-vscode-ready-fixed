import { getSupabaseEnv } from './_supabase-admin.js';

export default async function handler(req, res) {
  const env = getSupabaseEnv();
  return res.status(200).json({
    SUPABASE_URL: env.url || '',
    SUPABASE_ANON_KEY: env.anonKey || ''
  });
}
