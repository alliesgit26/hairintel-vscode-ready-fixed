import Stripe from "stripe";

const PLAN_CONFIG = [
  { slug: "starter", name: "Starter", envKeys: ["STRIPE_PRICE_STARTER"] },
  { slug: "pro", name: "Pro", envKeys: ["STRIPE_PRICE_PRO"] },
  { slug: "studio", name: "Studio", envKeys: ["STRIPE_PRICE_STUDIO", "STRIPE_PRICE_SALON"] },
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: "Stripe pricing is not configured." });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const plans = await Promise.all(PLAN_CONFIG.map(async ({ slug, name, envKeys }) => {
    const priceId = envKeys.map((key) => process.env[key]).find(Boolean);
    if (!priceId) {
      return { slug, name, available: false, reason: "missing_price" };
    }

    try {
      const price = await stripe.prices.retrieve(priceId);
      const intervalCount = price.recurring?.interval_count || 1;
      const baseInterval = price.recurring?.interval || null;
      const interval = baseInterval
        ? `${intervalCount > 1 ? `${intervalCount} ` : ""}${baseInterval}${intervalCount > 1 ? "s" : ""}`
        : null;

      return {
        slug,
        name,
        available: Boolean(price.active && price.type === "recurring" && Number.isFinite(price.unit_amount)),
        unitAmount: price.unit_amount,
        currency: price.currency,
        interval,
      };
    } catch (error) {
      console.error(`[HairIntel] Could not load ${slug} Stripe price:`, error?.message || error);
      return { slug, name, available: false, reason: "price_unavailable" };
    }
  }));

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json({ trialDays: 7, plans });
}
