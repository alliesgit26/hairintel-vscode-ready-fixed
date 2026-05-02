import Stripe from 'stripe';
import { normalizePlan, planFromPrice, upsertSubscriptionRecord } from './_supabase-admin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function toIsoFromUnix(value) {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function getCustomerEmail(customerId) {
  if (!customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer?.email || null;
  } catch (err) {
    console.warn('[stripe-webhook] Could not retrieve customer email:', err.message);
    return null;
  }
}

async function getSubscription(subscriptionId) {
  if (!subscriptionId) return null;
  try {
    return await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price']
    });
  } catch (err) {
    console.warn('[stripe-webhook] Could not retrieve subscription:', err.message);
    return null;
  }
}

function getSubscriptionIdFromInvoice(invoice) {
  return invoice?.subscription || invoice?.parent?.subscription_details?.subscription || null;
}

async function handleCheckoutSessionCompleted(session, eventType) {
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['subscription', 'line_items.data.price']
  });

  const sub = typeof fullSession.subscription === 'object' ? fullSession.subscription : null;
  const priceId = fullSession.line_items?.data?.[0]?.price?.id || null;
  const plan = normalizePlan(fullSession.metadata?.plan || sub?.metadata?.plan || planFromPrice(priceId));
  const email = fullSession.customer_details?.email || fullSession.customer_email || fullSession.metadata?.customerEmail || null;

  return upsertSubscriptionRecord({
    email,
    plan,
    status: sub?.status || fullSession.payment_status || fullSession.status || 'active',
    stripeCustomerId: typeof fullSession.customer === 'string' ? fullSession.customer : fullSession.customer?.id,
    stripeSubscriptionId: sub?.id || (typeof fullSession.subscription === 'string' ? fullSession.subscription : null),
    priceId,
    currentPeriodEnd: toIsoFromUnix(sub?.current_period_end),
    eventType
  });
}

async function handleSubscription(subscription, eventType) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const email = subscription.metadata?.customerEmail || await getCustomerEmail(customerId);
  const priceId = subscription.items?.data?.[0]?.price?.id || null;
  const plan = normalizePlan(subscription.metadata?.plan || planFromPrice(priceId));

  return upsertSubscriptionRecord({
    email,
    plan,
    status: subscription.status || 'inactive',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    priceId,
    currentPeriodEnd: toIsoFromUnix(subscription.current_period_end),
    eventType
  });
}

async function handleInvoice(invoice, eventType, forcedStatus = null) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  const subscription = await getSubscription(subscriptionId);
  const email = invoice.customer_email || subscription?.metadata?.customerEmail || await getCustomerEmail(customerId);
  const priceId = subscription?.items?.data?.[0]?.price?.id || invoice.lines?.data?.[0]?.price?.id || null;
  const plan = normalizePlan(subscription?.metadata?.plan || planFromPrice(priceId));

  return upsertSubscriptionRecord({
    email,
    plan,
    status: forcedStatus || subscription?.status || invoice.status || 'active',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription?.id || subscriptionId,
    priceId,
    currentPeriodEnd: toIsoFromUnix(subscription?.current_period_end),
    eventType
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing STRIPE_SECRET_KEY');
      return res.status(500).json({ error: 'STRIPE_SECRET_KEY is missing.' });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('Missing STRIPE_WEBHOOK_SECRET');
      return res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET is missing.' });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing Stripe signature header.' });

    const rawBody = await readRawBody(req);
    const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);

    console.log('Stripe webhook received:', event.type);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object, event.type);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await handleSubscription(event.data.object, event.type);
          break;

        case 'invoice.paid':
        case 'invoice.payment_succeeded':
          await handleInvoice(event.data.object, event.type, 'active');
          break;

        case 'invoice.payment_failed':
          await handleInvoice(event.data.object, event.type, 'past_due');
          break;

        default:
          console.log('Unhandled Stripe event:', event.type);
      }
    } catch (syncError) {
      // Do not break Stripe delivery because a Supabase table is missing or a sync write failed.
      console.warn('[stripe-webhook] Subscription sync warning:', syncError.message);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return res.status(500).json({ error: 'Webhook handler failed.', message: error.message });
  }
}
