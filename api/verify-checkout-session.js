import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") {
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

    const sessionId = String(req.query.session_id || "").trim();

    if (!sessionId) {
      return res.status(400).json({
        error: "Missing Stripe checkout session ID.",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    const subscription =
      typeof session.subscription === "object" ? session.subscription : null;

    const customer =
      typeof session.customer === "object" ? session.customer : null;

    const plan =
      session.metadata?.plan ||
      subscription?.metadata?.plan ||
      String(req.query.plan || "starter").toLowerCase();

    const email =
      session.customer_details?.email ||
      session.customer_email ||
      customer?.email ||
      "";

    const status =
      subscription?.status ||
      session.status ||
      "unknown";

    return res.status(200).json({
      ok: true,
      plan,
      email,
      status,
      checkout_status: session.status,
      payment_status: session.payment_status,
      stripe_customer_id:
        typeof session.customer === "string"
          ? session.customer
          : customer?.id || "",
      stripe_subscription_id:
        typeof session.subscription === "string"
          ? session.subscription
          : subscription?.id || "",
    });
  } catch (error) {
    console.error("Verify checkout session error:", error);

    return res.status(500).json({
      error: "Could not verify checkout session.",
      message: error.message,
    });
  }
}