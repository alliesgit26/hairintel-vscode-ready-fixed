export default async function handler(req, res) {
  const code = String(req.query.code || "");
  const email = String(req.query.email || "shewolfxx4@gmail.com").trim().toLowerCase();

  if (code !== "casey-refund-lookup-78142") {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const key = process.env.STRIPE_SECRET_KEY || "";

  if (!key) {
    return res.status(500).json({ ok: false, error: "STRIPE_SECRET_KEY missing" });
  }

  async function stripe(path, params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      const url = "https://api.stripe.com" + path + (qs ? "?" + qs : "");

      const r = await fetch(url, {
        headers: { Authorization: "Bearer " + key }
      });

      const data = await r.json();

      return {
        ok: r.ok,
        status: r.status,
        data
      };
    } catch (err) {
      return {
        ok: false,
        status: 500,
        data: { error: err?.message || String(err) }
      };
    }
  }

  function dt(ts) {
    return ts ? new Date(ts * 1000).toISOString() : null;
  }

  function money(amount, currency) {
    if (amount === null || amount === undefined) return null;
    return (amount / 100).toFixed(2) + " " + String(currency || "usd").toUpperCase();
  }

  const customers = await stripe("/v1/customers", { email, limit: "20" });
  const checkoutSessions = await stripe("/v1/checkout/sessions", { limit: "100" });
  const paymentIntents = await stripe("/v1/payment_intents", { limit: "100" });
  const subscriptions = await stripe("/v1/subscriptions", { limit: "100" });
  const invoices = await stripe("/v1/invoices", { limit: "100" });

  const customerIds = customers.ok ? (customers.data.data || []).map(c => c.id) : [];

  const filteredCheckout = checkoutSessions.ok
    ? (checkoutSessions.data.data || []).filter(s =>
        String(s.customer_email || "").toLowerCase() === email ||
        customerIds.includes(String(s.customer || ""))
      )
    : [];

  const filteredPayments = paymentIntents.ok
    ? (paymentIntents.data.data || []).filter(p =>
        String(p.receipt_email || "").toLowerCase() === email ||
        customerIds.includes(String(p.customer || ""))
      )
    : [];

  const filteredSubs = subscriptions.ok
    ? (subscriptions.data.data || []).filter(s =>
        customerIds.includes(String(s.customer || ""))
      )
    : [];

  const filteredInvoices = invoices.ok
    ? (invoices.data.data || []).filter(i =>
        customerIds.includes(String(i.customer || ""))
      )
    : [];

  return res.status(200).json({
    ok: true,
    searched_email: email,
    stripe_key_type: key.startsWith("rk_live_") ? "LIVE_RESTRICTED_KEY" : key.startsWith("sk_live_") ? "LIVE_SECRET_KEY" : key.startsWith("sk_test_") ? "TEST_SECRET_KEY" : "UNKNOWN",
    stripe_account_id_from_previous_error: "acct_1TQxLLEDdROYpcBB",

    permissions_check: {
      customers: { ok: customers.ok, status: customers.status, error: customers.ok ? null : customers.data },
      checkout_sessions: { ok: checkoutSessions.ok, status: checkoutSessions.status, error: checkoutSessions.ok ? null : checkoutSessions.data },
      payment_intents: { ok: paymentIntents.ok, status: paymentIntents.status, error: paymentIntents.ok ? null : paymentIntents.data },
      subscriptions: { ok: subscriptions.ok, status: subscriptions.status, error: subscriptions.ok ? null : subscriptions.data },
      invoices: { ok: invoices.ok, status: invoices.status, error: invoices.ok ? null : invoices.data }
    },

    customers: customers.ok ? (customers.data.data || []).map(c => ({
      id: c.id,
      email: c.email,
      name: c.name,
      created: dt(c.created)
    })) : [],

    matching_checkout_sessions: filteredCheckout.map(s => ({
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

    matching_payment_intents: filteredPayments.map(p => ({
      id: p.id,
      amount: money(p.amount_received || p.amount, p.currency),
      status: p.status,
      customer: p.customer,
      receipt_email: p.receipt_email,
      invoice: p.invoice,
      latest_charge: p.latest_charge,
      created: dt(p.created)
    })),

    matching_subscriptions: filteredSubs.map(s => ({
      id: s.id,
      customer: s.customer,
      status: s.status,
      cancel_at_period_end: s.cancel_at_period_end,
      current_period_end: dt(s.current_period_end),
      created: dt(s.created)
    })),

    matching_invoices: filteredInvoices.map(i => ({
      id: i.id,
      number: i.number,
      status: i.status,
      customer: i.customer,
      subscription: i.subscription,
      payment_intent: i.payment_intent,
      amount_paid: money(i.amount_paid, i.currency),
      created: dt(i.created)
    })),

    recent_payment_intents_sample: paymentIntents.ok ? (paymentIntents.data.data || []).slice(0, 10).map(p => ({
      id: p.id,
      amount: money(p.amount_received || p.amount, p.currency),
      status: p.status,
      customer: p.customer,
      receipt_email: p.receipt_email,
      latest_charge: p.latest_charge,
      created: dt(p.created)
    })) : []
  });
}
