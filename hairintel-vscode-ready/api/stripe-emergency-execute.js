const ACCESS_CODE = "casey-refund-lookup-78142";

const PAYMENT_INTENTS_TO_REFUND = [
  "pi_3Th0OZEDdROYpcBB1JI1AqCT",
  "pi_3Th0LJEDdROYpcBB1IBZG25m",
  "pi_3TgzEMEDdROYpcBB1ZjDxPHI",
  "pi_3TgzCCEDdROYpcBB143qGdn6",
  "pi_3TgenoEDdROYpcBB0ONHuUib",
  "pi_3TgTt7EDdROYpcBB1UPrtuqr"
];

const SUBSCRIPTIONS_TO_CANCEL = [
  "sub_1TeSB4EDdROYpcBBUNXLwIrc",
  "sub_1TeS6qEDdROYpcBBRtmmBxYa",
  "sub_1TeS30EDdROYpcBBMT5xvEzP",
  "sub_1TeQvcEDdROYpcBB4u1VNVLT",
  "sub_1TeQtUEDdROYpcBB45uNY3jZ",
  "sub_1Te6VOEDdROYpcBBgiIXBzrg",
  "sub_1TdvZUEDdROYpcBBnjsQI8Yj"
];

async function stripeRequest(method, path, params = {}) {
  const key = process.env.STRIPE_SECRET_KEY || "";

  if (!key) {
    return {
      ok: false,
      status: 500,
      error: "STRIPE_SECRET_KEY missing"
    };
  }

  const options = {
    method,
    headers: {
      Authorization: "Bearer " + key
    }
  };

  if (method !== "GET" && method !== "DELETE") {
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.body = new URLSearchParams(params).toString();
  }

  const response = await fetch("https://api.stripe.com" + path, options);
  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

export default async function handler(req, res) {
  const code = String(req.query.code || "");
  const confirm = String(req.query.confirm || "");

  if (code !== ACCESS_CODE) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized"
    });
  }

  if (confirm !== "REFUND_NOW") {
    return res.status(200).json({
      ok: true,
      mode: "DRY_RUN_ONLY",
      message: "Nothing was changed. Add &confirm=REFUND_NOW to cancel subscriptions and refund payments.",
      will_cancel_subscriptions: SUBSCRIPTIONS_TO_CANCEL,
      will_refund_payment_intents: PAYMENT_INTENTS_TO_REFUND,
      expected_refund_total: "274.00 USD"
    });
  }

  const cancel_results = [];

  for (const subId of SUBSCRIPTIONS_TO_CANCEL) {
    const result = await stripeRequest("DELETE", "/v1/subscriptions/" + encodeURIComponent(subId));
    cancel_results.push({
      subscription: subId,
      ok: result.ok,
      status: result.status,
      stripe_status: result.data && result.data.status ? result.data.status : null,
      error: result.ok ? null : result.data
    });
  }

  const refund_results = [];

  for (const pi of PAYMENT_INTENTS_TO_REFUND) {
    const result = await stripeRequest("POST", "/v1/refunds", {
      payment_intent: pi,
      reason: "duplicate",
      "metadata[reason]": "Casey duplicate HairIntel test charge refund",
      "metadata[requested_by]": "shewolfxx4@gmail.com"
    });

    refund_results.push({
      payment_intent: pi,
      ok: result.ok,
      status: result.status,
      refund_id: result.data && result.data.id ? result.data.id : null,
      refund_status: result.data && result.data.status ? result.data.status : null,
      amount: result.data && result.data.amount ? (result.data.amount / 100).toFixed(2) + " " + String(result.data.currency || "usd").toUpperCase() : null,
      error: result.ok ? null : result.data
    });
  }

  return res.status(200).json({
    ok: true,
    executed: true,
    stripe_account: "acct_1TQxLLEDdROYpcBB",
    cancel_results,
    refund_results
  });
}
