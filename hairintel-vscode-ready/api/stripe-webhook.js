import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY");
      return res.status(500).json({ error: "STRIPE_SECRET_KEY is missing." });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return res.status(500).json({ error: "STRIPE_WEBHOOK_SECRET is missing." });
    }

    const signature = req.headers["stripe-signature"];

    if (!signature) {
      console.error("Missing Stripe signature header");
      return res.status(400).json({ error: "Missing Stripe signature header." });
    }

    const rawBody = await readRawBody(req);

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log("Stripe webhook received:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        console.log("Checkout completed:", {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
          email: session.customer_details?.email,
        });

        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object;

        console.log("Subscription created:", {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
        });

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;

        console.log("Subscription updated:", {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
        });

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        console.log("Subscription deleted:", {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
        });

        break;
      }

      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;

        console.log("Invoice paid:", {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription,
          amountPaid: invoice.amount_paid,
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;

        console.log("Invoice payment failed:", {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription,
        });

        break;
      }

      default:
        console.log("Unhandled Stripe event:", event.type);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error.message);

    return res.status(500).json({
      error: "Webhook handler failed.",
      message: error.message,
    });
  }
}