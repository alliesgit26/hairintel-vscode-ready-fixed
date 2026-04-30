import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "Supabase environment variables are missing on the server.",
      });
    }

    const body = req.body || {};
    const email = String(
      body.email ||
      body.customer_email ||
      body.customerEmail ||
      ""
    )
      .trim()
      .toLowerCase();

    const directCustomerId = body.stripe_customer_id || body.customerId;

    let stripeCustomerId = directCustomerId || null;

    if (!stripeCustomerId) {
      if (!email) {
        return res.status(400).json({
          error: "Customer email is required to open billing portal.",
        });
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id, status, plan, customer_email")
        .eq("customer_email", email)
        .in("status", ["active", "trialing", "past_due"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Supabase subscription lookup error:", error);
        return res.status(500).json({
          error: "Could not check subscription status.",
          message: error.message,
        });
      }

      if (!data || !data.stripe_customer_id) {
        return res.status(404).json({
          error: "No active Stripe customer found for this email.",
        });
      }

      stripeCustomerId = data.stripe_customer_id;
    }

    const origin =
      req.headers.origin ||
      process.env.APP_URL ||
      "https://hairintel-ai.vercel.app";

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/?billing=returned`,
    });

    return res.status(200).json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe billing portal error:", error);

    return res.status(500).json({
      error: "Could not open billing portal.",
      message: error.message,
    });
  }
}