import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const config = {
  api: { bodyParser: false }
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method not allowed');
  }

  const sig = req.headers['stripe-signature'];
  const rawBody = await readRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;
    if (email) {
      await supabase.from('profiles').update({ plan: 'pro' }).eq('email', email);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    if (subscription.customer) {
      const customer = await stripe.customers.retrieve(subscription.customer);
      if (!customer.deleted && customer.email) {
        await supabase.from('profiles').update({ plan: 'free' }).eq('email', customer.email);
      }
    }
  }

  return res.status(200).json({ received: true });
}
