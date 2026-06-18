export default async function handler(req, res) {
  try {
    const code = String(req.query.code || "");

    if (code !== "casey-refund-lookup-78142") {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const key = process.env.STRIPE_SECRET_KEY || "";

    if (!key) {
      return res.status(500).json({
        ok: false,
        error: "STRIPE_SECRET_KEY is missing in Vercel Production"
      });
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/account", {
      method: "GET",
      headers: {
        Authorization: "Bearer " + key
      }
    });

    const data = await stripeRes.json();

    if (!stripeRes.ok) {
      return res.status(500).json({
        ok: false,
        key_type: key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "UNKNOWN",
        stripe_error: data
      });
    }

    return res.status(200).json({
      ok: true,
      key_type: key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "UNKNOWN",
      stripe_account_used_by_hairintel: {
        id: data.id,
        email: data.email || null,
        country: data.country || null,
        business_name: data.business_profile?.name || null,
        charges_enabled: data.charges_enabled,
        payouts_enabled: data.payouts_enabled,
        details_submitted: data.details_submitted
      }
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      caught_error: true,
      message: err?.message || String(err)
    });
  }
}
