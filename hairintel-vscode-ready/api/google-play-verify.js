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
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key
        };
      }
    } catch (error) {
      console.error('[google-play] Invalid GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:', error.message);
    }
  }

  const clientEmail = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL || '';
  const privateKey = String(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (clientEmail && privateKey) return { clientEmail, privateKey };
  return null;
}

async function getGoogleAccessToken() {
  if (cachedGoogleToken && Date.now() < cachedGoogleTokenExpiresAt - 60_000) {
    return cachedGoogleToken;
  }

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

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Could not authenticate with Google Play Developer API.');
  }

  cachedGoogleToken = data.access_token;
  cachedGoogleTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedGoogleToken;
}

async function getAuthenticatedUser(req) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase admin is not configured.');

  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data?.user?.email) return null;
  return data.user;
}

async function fetchSubscription(accessToken, purchaseToken) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Google Play verification failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function acknowledgeSubscription(accessToken, productId, purchaseToken) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'A verified HairIntel sign-in is required.' });

    const purchaseToken = String(req.body?.purchaseToken || '').trim();
    const requestedProductId = String(req.body?.productId || '').trim();
    if (!purchaseToken) return res.status(400).json({ error: 'Missing Google Play purchase token.' });
    if (requestedProductId && !PRODUCT_TO_PLAN[requestedProductId]) {
      return res.status(400).json({ error: 'Unknown HairIntel Google Play product.' });
    }

    const accessToken = await getGoogleAccessToken();
    const subscription = await fetchSubscription(accessToken, purchaseToken);
    const lineItems = Array.isArray(subscription.lineItems) ? subscription.lineItems : [];
    const purchasedLine = lineItems.find(line => PRODUCT_TO_PLAN[line?.productId]);
    if (!purchasedLine) {
      return res.status(403).json({ error: 'This purchase does not belong to a HairIntel subscription product.' });
    }

    if (requestedProductId && purchasedLine.productId !== requestedProductId) {
      return res.status(403).json({ error: 'Google Play returned a different subscription product than requested.' });
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

    const status = entitled ? 'active' : 'inactive';

    await upsertSubscriptionRecord({
      email: user.email,
      plan,
      status,
      currentPeriodEnd: expiry ? expiry.toISOString() : null,
      eventType: `google_play:${googleState}`
    });

    let acknowledged = subscription.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED';
    let acknowledgementWarning = null;
    if (entitled && !acknowledged) {
      try {
        await acknowledgeSubscription(accessToken, productId, purchaseToken);
        acknowledged = true;
      } catch (error) {
        acknowledgementWarning = error.message;
        console.error('[google-play] acknowledgement failed:', error.message);
      }
    }

    return res.status(200).json({
      active: entitled,
      plan: entitled ? plan : 'free',
      status,
      productId,
      googleState,
      currentPeriodEnd: expiry ? expiry.toISOString() : null,
      acknowledged,
      acknowledgementWarning
    });
  } catch (error) {
    console.error('[google-play-verify]', error);
    const status = Number(error.status) || 500;
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: error.message || 'Google Play verification failed.'
    });
  }
}
