import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLAN_PRICE_MAP = {
  starter: process.env.STRIPE_PRICE_STARTER,
  basic: process.env.STRIPE_PRICE_STARTER,

  pro: process.env.STRIPE_PRICE_PRO,
  professional: process.env.STRIPE_PRICE_PRO,

  studio: process.env.STRIPE_PRICE_SALON,
  salon: process.env.STRIPE_PRICE_SALON,
  team: process.env.STRIPE_PRICE_SALON,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: "STRIPE_SECRET_KEY is missing on the server.",
      });
    }

    if (!process.env.STRIPE_PRICE_STARTER) {
      return res.status(500).json({
        error: "STRIPE_PRICE_STARTER is missing on the server.",
      });
    }

    if (!process.env.STRIPE_PRICE_PRO) {
      return res.status(500).json({
        error: "STRIPE_PRICE_PRO is missing on the server.",
      });
    }

    if (!process.env.STRIPE_PRICE_SALON) {
      return res.status(500).json({
        error: "STRIPE_PRICE_SALON is missing on the server.",
      });
    }

    const body = req.body || {};
    const receivedPlan = body.plan || body.tier || body.package || body.subscriptionPlan;

    const normalizedPlan = String(receivedPlan || "")
      .trim()
      .toLowerCase();

    const selectedPrice = PLAN_PRICE_MAP[normalizedPlan];

    if (!selectedPrice) {
      return res.status(400).json({
        error: "Invalid plan",
        receivedPlan,
        normalizedPlan,
        acceptedPlans: Object.keys(PLAN_PRICE_MAP),
      });
    }

    const origin =
      req.headers.origin ||
      process.env.APP_URL ||
      "https://hairintel-ai.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: selectedPrice,
          quantity: 1,
        },
      ],
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_email: body.email || undefined,
      metadata: {
        plan: normalizedPlan,
        receivedPlan: receivedPlan || "",
      },
      subscription_data: {
        metadata: {
          plan: normalizedPlan,
          receivedPlan: receivedPlan || "",
        },
      },
    });

    return res.status(200).json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    return res.status(500).json({
      error: "Stripe checkout failed.",
      message: error.message,
    });
  }
}