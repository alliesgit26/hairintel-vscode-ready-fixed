import Stripe from 'stripe';
import { normalizePlan, planFromPrice, upsertSubscriptionRecord, isActiveStripeStatus } from './_supabase-admin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

function toIsoFromUnix(value) {
  return value ? new Date(value * 1000).toISOString() : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'STRIPE_SECRET_KEY is missing.' });

  const sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'line_items.data.price']
    });

    const sub = typeof session.subscription === 'object' ? session.subscription : null;
    const priceId = session.line_items?.data?.[0]?.price?.id || null;
    const plan = normalizePlan(session.metadata?.plan || sub?.metadata?.plan || planFromPrice(priceId));
    const status = sub?.status || session.payment_status || session.status || 'inactive';
    const email = session.customer_details?.email || session.customer_email || null;

    const payload = {
      email,
      plan,
      status,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      stripeSubscriptionId: sub?.id || (typeof session.subscription === 'string' ? session.subscription : null),
      priceId,
      currentPeriodEnd: toIsoFromUnix(sub?.current_period_end),
      eventType: 'checkout.session.completed'
    };

    await upsertSubscriptionRecord(payload);

    return res.status(200).json({
      plan: isActiveStripeStatus(status) ? plan : 'free',
      status,
      active: isActiveStripeStatus(status),
      email,
      stripeCustomerId: payload.stripeCustomerId,
      stripeSubscriptionId: payload.stripeSubscriptionId
    });
  } catch (err) {
    console.error('[checkout-status] error:', err);
    return res.status(500).json({ error: err.message || 'Could not confirm checkout.' });
  }
}
