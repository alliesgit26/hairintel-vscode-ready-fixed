module.exports = async function handler(req, res) {
  try {
    const code = String(req.query.code || "");
    const email = String(req.query.email || "shewolfxx4@gmail.com").trim().toLowerCase();

    if (code !== "casey-refund-lookup-78142") {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const key = process.env.STRIPE_SECRET_KEY;

    if (!key) {
      return res.status(500).json({
        ok: false,
        error: "STRIPE_SECRET_KEY is missing in Vercel Production."
      });
    }

    async function stripe(path, params) {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const response = await fetch("https://api.stripe.com" + path + qs, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + key
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          stripe_error: true,
          status: response.status,
          data
        };
      }

      return data;
    }

    function dt(ts) {
      return ts ? new Date(ts * 1000).toISOString() : null;
    }

    function money(amount, currency) {
      if (amount === null || amount === undefined) return null;
      return (amount / 100).toFixed(2) + " " + String(currency || "usd").toUpperCase();
    }

    const account = await stripe("/v1/account");

    if (account.stripe_error) {
      return res.status(500).json({
        ok: false,
        step: "stripe_account_lookup_failed",
        error: account
      });
    }

    const customers = await stripe("/v1/customers", {
      email,
      limit: "20"
    });

    const checkoutSessions = await stripe("/v1/checkout/sessions", {
      limit: "30"
    });

    const paymentIntents = await stripe("/v1/payment_intents", {
      limit: "30"
    });

    const subscriptions = await stripe("/v1/subscriptions", {
      limit: "30"
    });

    const invoices = await stripe("/v1/invoices", {
      limit: "30"
    });

    return res.status(200).json({
      ok: true,
      searched_email: email,
      key_type: key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "UNKNOWN",
      stripe_account_used_by_hairintel: {
        id: account.id,
        email: account.email || null,
        country: account.country || null,
        business_name: account.business_profile && account.business_profile.name ? account.business_profile.name : null,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      },
      customers: customers.stripe_error ? customers : (customers.data || []).map(c => ({
        id: c.id,
        email: c.email,
        name: c.name,
        created: dt(c.created)
      })),
      checkout_sessions: checkoutSessions.stripe_error ? checkoutSessions : (checkoutSessions.data || []).map(s => ({
        id: s.id,
        mode: s.mode,
        status: s.status,
        payment_status: s.payment_status,
        customer: s.customer,
        customer_email: s.customer_email,
        amount_total: money(s.amount_total, s.currency),
        subscription: s.subscription,
        payment_intent: s.payment_intent,
        created: dt(s.created)
      })),
      payment_intents: paymentIntents.stripe_error ? paymentIntents : (paymentIntents.data || []).map(p => ({
        id: p.id,
        amount: money(p.amount_received || p.amount, p.currency),
        status: p.status,
        customer: p.customer,
        receipt_email: p.receipt_email,
        invoice: p.invoice,
        latest_charge: p.latest_charge,
        created: dt(p.created)
      })),
      subscriptions: subscriptions.stripe_error ? subscriptions : (subscriptions.data || []).map(s => ({
        id: s.id,
        customer: s.customer,
        status: s.status,
        cancel_at_period_end: s.cancel_at_period_end,
        current_period_end: dt(s.current_period_end),
        created: dt(s.created)
      })),
      invoices: invoices.stripe_error ? invoices : (invoices.data || []).map(i => ({
        id: i.id,
        number: i.number,
        status: i.status,
        customer: i.customer,
        subscription: i.subscription,
        payment_intent: i.payment_intent,
        amount_paid: money(i.amount_paid, i.currency),
        created: dt(i.created)
      }))
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      caught_error: true,
      message: err && err.message ? err.message : String(err),
      stack: err && err.stack ? err.stack : null
    });
  }
};
