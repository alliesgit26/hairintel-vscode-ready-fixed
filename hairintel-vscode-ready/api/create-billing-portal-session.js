import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: "STRIPE_SECRET_KEY is missing in Vercel.",
      });
    }

    const body = req.body || {};

    let email = String(
      body.email ||
      body.customer_email ||
      body.customerEmail ||
      ""
    )
      .trim()
      .toLowerCase();

    let stripeCustomerId = String(
      body.stripe_customer_id ||
      body.customerId ||
      ""
    ).trim();

    if (!stripeCustomerId) {
      if (!email) {
        return res.status(400).json({
          error: "Customer email is required to open billing portal.",
        });
      }

      const customers = await stripe.customers.list({
        email,
        limit: 1,
      });

      if (!customers.data.length) {
        return res.status(404).json({
          error: "No Stripe customer found for this email.",
        });
      }

      stripeCustomerId = customers.data[0].id;
    }

    const origin =
      req.headers.origin ||
      process.env.APP_URL ||
      "https://hairintel-ai.vercel.app";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/?billing=returned`,
    });

    return res.status(200).json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error("Stripe billing portal error:", error);

    return res.status(500).json({
      error: "Could not open Stripe billing portal.",
      message: error.message,
    });
  }
}