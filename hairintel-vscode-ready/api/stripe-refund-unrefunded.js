const ACCESS_CODE = "casey-refund-lookup-78142";
const SINCE_UNIX = Math.floor(new Date("2026-06-01T00:00:00Z").getTime() / 1000);

async function stripeRequest(method, path, params = {}) {
  const key = process.env.STRIPE_SECRET_KEY || "";

  if (!key) {
    return { ok: false, status: 500, data: { error: "STRIPE_SECRET_KEY missing" } };
  }

  let url = "https://api.stripe.com" + path;
  const options = {
    method,
    headers: {
      Authorization: "Bearer " + key
    }
  };

  if (method === "GET") {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += "?" + qs;
  } else if (method !== "DELETE") {
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.body = new URLSearchParams(params).toString();
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

function dt(ts) {
  return ts ? new Date(ts * 1000).toISOString() : null;
}

function money(cents, currency) {
  return (Number(cents || 0) / 100).toFixed(2) + " " + String(currency || "usd").toUpperCase();
}

export default async function handler(req, res) {
  const code = String(req.query.code || "");
  const confirm = String(req.query.confirm || "");

  if (code !== ACCESS_CODE) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const chargesResult = await stripeRequest("GET", "/v1/charges", {
    limit: "100",
    "created[gte]": String(SINCE_UNIX)
  });

  const subsResult = await stripeRequest("GET", "/v1/subscriptions", {
    limit: "100",
    status: "all"
  });

  if (!chargesResult.ok) {
    return res.status(500).json({
      ok: false,
      step: "charge_scan_failed",
      error: chargesResult.data
    });
  }

  if (!subsResult.ok) {
    return res.status(500).json({
      ok: false,
      step: "subscription_scan_failed",
      error: subsResult.data
    });
  }

  const charges = chargesResult.data.data || [];
  const subscriptions = subsResult.data.data || [];

  const unrefundedCharges = charges.filter((ch) => {
    const amount = Number(ch.amount || 0);
    const refunded = Number(ch.amount_refunded || 0);
    return (
      ch.paid === true &&
      ch.status === "succeeded" &&
      amount > 0 &&
      refunded < amount
    );
  });

  const activeSubscriptions = subscriptions.filter((sub) => {
    return ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(String(sub.status || ""));
  });

  const dryRun = {
    ok: true,
    mode: "DRY_RUN_ONLY",
    message: "Nothing changed. Add &confirm=REFUND_NOW to refund listed unrefunded charges and cancel listed subscriptions.",
    since: "2026-06-01T00:00:00Z",
    unrefunded_charges_found: unrefundedCharges.map((ch) => ({
      charge: ch.id,
      payment_intent: ch.payment_intent,
      customer: ch.customer,
      amount: money(ch.amount, ch.currency),
      already_refunded: money(ch.amount_refunded, ch.currency),
      remaining_refundable: money(Number(ch.amount || 0) - Number(ch.amount_refunded || 0), ch.currency),
      billing_email: ch.billing_details && ch.billing_details.email ? ch.billing_details.email : null,
      billing_name: ch.billing_details && ch.billing_details.name ? ch.billing_details.name : null,
      created: dt(ch.created)
    })),
    active_subscriptions_found: activeSubscriptions.map((sub) => ({
      subscription: sub.id,
      customer: sub.customer,
      status: sub.status,
      created: dt(sub.created)
    }))
  };

  if (confirm !== "REFUND_NOW") {
    return res.status(200).json(dryRun);
  }

  const cancel_results = [];

  for (const sub of activeSubscriptions) {
    const result = await stripeRequest("DELETE", "/v1/subscriptions/" + encodeURIComponent(sub.id));
    cancel_results.push({
      subscription: sub.id,
      customer: sub.customer,
      ok: result.ok,
      status: result.status,
      stripe_status: result.data && result.data.status ? result.data.status : null,
      error: result.ok ? null : result.data
    });
  }

  const refund_results = [];

  for (const ch of unrefundedCharges) {
    const remaining = Number(ch.amount || 0) - Number(ch.amount_refunded || 0);

    const result = await stripeRequest("POST", "/v1/refunds", {
      charge: ch.id,
      amount: String(remaining),
      reason: "duplicate",
      "metadata[reason]": "HairIntel duplicate or unwanted test charge refund",
      "metadata[requested_by]": "shewolfxx4@gmail.com"
    });

    refund_results.push({
      charge: ch.id,
      payment_intent: ch.payment_intent,
      customer: ch.customer,
      requested_refund: money(remaining, ch.currency),
      ok: result.ok,
      status: result.status,
      refund_id: result.data && result.data.id ? result.data.id : null,
      refund_status: result.data && result.data.status ? result.data.status : null,
      error: result.ok ? null : result.data
    });
  }

  return res.status(200).json({
    ok: true,
    executed: true,
    cancel_results,
    refund_results
  });
}
