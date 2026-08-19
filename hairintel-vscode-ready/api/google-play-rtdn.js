import crypto from 'node:crypto';
import { getSupabaseAdmin, normalizePlan, upsertSubscriptionRecord } from './_supabase-admin.js';

const PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.hairintel.ai';
const PRODUCT_TO_PLAN = Object.freeze({
  hairintel_starter_monthly: 'starter',
  hairintel_pro_monthly: 'pro',
  hairintel_studio_monthly: 'studio'
});

let cachedGoogleToken = null;
let cachedGoogleTokenExpiresAt = 0;

function base64url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function readServiceAccount() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || '';
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.client_email && parsed.private_key) {
        return { clientEmail: parsed.client_email, privateKey: parsed.private_key };
      }
    } catch (error) {
      console.error('[google-play-rtdn] Invalid service account JSON:', error.message);
    }
  }

  const clientEmail = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL || '';
  const privateKey = String(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (clientEmail && privateKey) return { clientEmail, privateKey };
  return null;
}

async function getGoogleAccessToken() {
  if (cachedGoogleToken && Date.now() < cachedGoogleTokenExpiresAt - 60_000) return cachedGoogleToken;

  const account = readServiceAccount();
  if (!account) throw new Error('Google Play service account is not configured.');

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: account.clientEmail,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claims}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), account.privateKey);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Could not authenticate with Google Play Developer API.');
  }

  cachedGoogleToken = data.access_token;
  cachedGoogleTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedGoogleToken;
}

async function fetchSubscription(accessToken, purchaseToken) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Google Play verification failed (${response.status}).`);
  return data;
}

async function acknowledgeSubscription(accessToken, productId, purchaseToken) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: '{}'
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Google Play acknowledgement failed (${response.status}).`);
  }
}

function maxExpiry(lineItems) {
  let best = null;
  for (const line of lineItems || []) {
    const value = line?.expiryTime ? new Date(line.expiryTime) : null;
    if (value && !Number.isNaN(value.getTime()) && (!best || value > best)) best = value;
  }
  return best;
}

function accountHash(id) {
  return crypto.createHash('sha256').update(String(id)).digest('base64url');
}

async function findEmailForAccountHash(supabase, hash) {
  if (!hash) return null;
  const pageSize = 1000;

  for (let from = 0; from < 100000; from += pageSize) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not map Play account to HairIntel profile: ${error.message}`);

    for (const profile of data || []) {
      if (profile?.id && profile?.email && accountHash(profile.id) === hash) {
        return String(profile.email).trim().toLowerCase();
      }
    }
    if (!data || data.length < pageSize) break;
  }
  return null;
}

function decodeNotification(req) {
  const encoded = req.body?.message?.data;
  if (!encoded) return null;
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expectedToken = process.env.GOOGLE_PLAY_RTDN_TOKEN || '';
  const suppliedToken = String(req.query?.token || '');
  if (!expectedToken) return res.status(503).json({ error: 'RTDN endpoint is not configured.' });
  if (!suppliedToken || suppliedToken.length !== expectedToken.length || !crypto.timingSafeEqual(Buffer.from(suppliedToken), Buffer.from(expectedToken))) {
    return res.status(403).json({ error: 'Invalid RTDN token.' });
  }

  const notification = decodeNotification(req);
  if (!notification) return res.status(400).json({ error: 'Invalid Pub/Sub notification.' });
  if (notification.packageName !== PACKAGE_NAME) return res.status(400).json({ error: 'Unexpected package name.' });
  if (notification.testNotification) return res.status(204).end();

  const subNotice = notification.subscriptionNotification;
  const purchaseToken = String(subNotice?.purchaseToken || '');
  if (!purchaseToken) return res.status(204).end();

  try {
    const accessToken = await getGoogleAccessToken();
    const subscription = await fetchSubscription(accessToken, purchaseToken);
    const lineItems = Array.isArray(subscription.lineItems) ? subscription.lineItems : [];
    const purchasedLine = lineItems.find(line => PRODUCT_TO_PLAN[line?.productId]);
    if (!purchasedLine) return res.status(204).end();

    const accountId = subscription?.externalAccountIdentifiers?.obfuscatedExternalAccountId || '';
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin is not configured.');

    const email = await findEmailForAccountHash(supabase, accountId);
    if (!email) {
      console.warn('[google-play-rtdn] No HairIntel profile matched the obfuscated Play account ID.');
      return res.status(204).end();
    }

    const productId = purchasedLine.productId;
    const plan = normalizePlan(PRODUCT_TO_PLAN[productId]);
    const googleState = String(subscription.subscriptionState || 'SUBSCRIPTION_STATE_UNSPECIFIED');
    const expiry = maxExpiry(lineItems.filter(line => PRODUCT_TO_PLAN[line?.productId]));
    const futureExpiry = Boolean(expiry && expiry.getTime() > Date.now());
    const entitled =
      googleState === 'SUBSCRIPTION_STATE_ACTIVE' ||
      googleState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' ||
      (googleState === 'SUBSCRIPTION_STATE_CANCELED' && futureExpiry);

    const status = entitled ? 'active' : googleState
      .replace(/^SUBSCRIPTION_STATE_/, '')
      .toLowerCase();

    await upsertSubscriptionRecord({
      email,
      plan,
      status,
      currentPeriodEnd: expiry ? expiry.toISOString() : null,
      eventType: `google_play:rtdn:${Number(subNotice.notificationType || 0)}:${googleState}`
    });

    if (entitled && subscription.acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') {
      try {
        await acknowledgeSubscription(accessToken, productId, purchaseToken);
      } catch (error) {
        console.error('[google-play-rtdn] acknowledgement failed:', error.message);
      }
    }

    return res.status(204).end();
  } catch (error) {
    console.error('[google-play-rtdn]', error);
    return res.status(500).json({ error: error.message || 'RTDN processing failed.' });
  }
}
