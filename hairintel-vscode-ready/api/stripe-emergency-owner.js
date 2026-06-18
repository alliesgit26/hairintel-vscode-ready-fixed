const ACCESS_CODE = "casey-refund-lookup-78142";

function money(amount, currency) {
  if (amount === null || amount === undefined) return null;
  return {
    cents: amount,
    display: (amount / 100).toFixed(2) + " " + String(currency || "usd").toUpperCase()
  };
}

function date(ts) {
  return ts ? new Date(ts * 1000).toISOString() : null;
}

async function stripe(path, params = {}) {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is missing from Vercel Production.");
  }

  const qs = new URLSearchParams(params).toString();
  const url = "https://api.stripe.com" + path + (qs ? "?" + qs : "");

  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + key
    }
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(JSON.stringify(data.error || data, null, 2));
  }

  return data;
}

module.exports = async function handler(req, res) {
  try {
    const code = String(req.query.code || "");
    const email = String(req.query.email || "shewolfxx4@gmail.com").trim().toLowerCase();

    if (code !== ACCESS_CODE) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized"
      });
    }

    const account = await stripe("/v1/account");

    const customersResult = await stripe("/v1/customers", {
      email,
      limit: "20"
    });

    const customers = customersResult.data || [];

    const customerDetails = [];

    for (const customer of customers) {
      const [paymentIntents, subscriptions, invoices] = await Promise.all([
        stripe("/v1/payment_intents", {
          customer: customer.id,
          limit: "50"
        }),
        stripe("/v1/subscriptions", {
          customer: customer.id,
          limit: "50"
        }),
        stripe("/v1/invoices", {
          customer: customer.id,
          limit: "50"
        })
      ]);

      customerDetails.push({
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          created: date(customer.created)
        },
        payment_intents: paymentIntents.data.map((p) => ({
          id: p.id,
          amount: money(p.amount_received || p.amount, p.currency),
          status: p.status,
          customer: p.customer,
          receipt_email: p.receipt_email,
          description: p.description,
          invoice: p.invoice,
          latest_charge: p.latest_charge,
          created: date(p.created)
        })),
        subscriptions: subscriptions.data.map((s) => ({
          id: s.id,
          customer: s.customer,
          status: s.status,
          cancel_at_period_end: s.cancel_at_period_end,
          current_period_end: date(s.current_period_end),
          created: date(s.created),
          price_ids: (s.items?.data || []).map((item) => item.price?.id).filter(Boolean)
        })),
        invoices: invoices.data.map((i) => ({
          id: i.id,
          number: i.number,
          status: i.status,
          subscription: i.subscription,
          payment_intent: i.payment_intent,
          amount_paid: money(i.amount_paid, i.currency),
          amount_due: money(i.amount_due, i.currency),
          created: date(i.created)
        }))
      });
    }

    const recentPayments = await stripe("/v1/payment_intents", {
      limit: "20"
    });

    const recentSubscriptions = await stripe("/v1/subscriptions", {
      limit: "20"
    });

    return res.status(200).json({
      ok: true,
      searched_email: email,
      stripe_account_used_by_hairintel: {
        id: account.id,
        email: account.email,
        country: account.country,
        business_name: account.business_profile?.name || null,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      },
      matching_customers_count: customers.length,
      matching_customer_details: customerDetails,
      recent_payments: recentPayments.data.map((p) => ({
        id: p.id,
        amount: money(p.amount_received || p.amount, p.currency),
        status: p.status,
        customer: p.customer,
        receipt_email: p.receipt_email,
        description: p.description,
        invoice: p.invoice,
        latest_charge: p.latest_charge,
        created: date(p.created)
      })),
      recent_subscriptions: recentSubscriptions.data.map((s) => ({
        id: s.id,
        customer: s.customer,
        status: s.status,
        cancel_at_period_end: s.cancel_at_period_end,
        created: date(s.created)
      }))
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};
