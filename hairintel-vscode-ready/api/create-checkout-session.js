import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_MAP = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  studio: process.env.STRIPE_PRICE_SALON,
  salon: process.env.STRIPE_PRICE_SALON,
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
        error: "Stripe secret key is missing.",
      });
    }

    const body = req.body || {};

    const requestedPlan = String(body.plan || body.tier || "")
      .trim()
      .toLowerCase();

    const plan = requestedPlan === "salon" ? "studio" : requestedPlan;

    if (!["starter", "pro", "studio"].includes(plan)) {
      return res.status(400).json({
        error: "Invalid plan",
        received: requestedPlan,
      });
    }

    const priceId = PRICE_MAP[plan];

    if (!priceId) {
      return res.status(500).json({
        error: `Missing Stripe price ID for ${plan}.`,
      });
    }

    const origin =
      req.headers.origin ||
      process.env.APP_URL ||
      "https://hairintel-ai.vercel.app";

    const email = String(
      body.email ||
      body.customer_email ||
      body.customerEmail ||
      ""
    )
      .trim()
      .toLowerCase();

    const sessionConfig = {
      mode: "subscription",
      payment_method_types: ["card"],

      /*
        Checkout now requires payment to start the subscription.
        Stripe may still ask for a card depending on your Stripe Checkout settings,
        the subscription will not include a free trial.
      */
      payment_method_collection: "always",

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      allow_promotion_codes: true,

      success_url: `${origin}/?checkout=success&plan=${encodeURIComponent(
        plan
      )}&session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${origin}/?checkout=cancelled`,

      metadata: {
        plan,
        app: "hairintel-ai",
      },

      subscription_data: {
        metadata: {
          plan,
          app: "hairintel-ai",
        },
      },
    };

    if (email) {
      sessionConfig.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.status(200).json({
      id: session.id,
      url: session.url,
      plan,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    return res.status(500).json({
      error: "Stripe checkout failed.",
      message: error.message,
    });
  }
}



