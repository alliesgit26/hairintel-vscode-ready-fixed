const https = require("https");

function stripeGet(path, key) {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.stripe.com",
      path,
      method: "GET",
      headers: {
        Authorization: "Bearer " + key
      }
    };

    const req = https.request(options, (resp) => {
      let body = "";

      resp.on("data", (chunk) => {
        body += chunk;
      });

      resp.on("end", () => {
        let parsed = null;

        try {
          parsed = JSON.parse(body);
        } catch (err) {
          parsed = { raw: body };
        }

        resolve({
          statusCode: resp.statusCode,
          ok: resp.statusCode >= 200 && resp.statusCode < 300,
          data: parsed
        });
      });
    });

    req.on("error", (err) => {
      resolve({
        statusCode: 500,
        ok: false,
        data: { error: err.message }
      });
    });

    req.end();
  });
}

module.exports = async function handler(req, res) {
  try {
    const code = String(req.query.code || "");

    if (code !== "casey-refund-lookup-78142") {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized"
      });
    }

    const key = process.env.STRIPE_SECRET_KEY || "";

    if (!key) {
      return res.status(500).json({
        ok: false,
        error: "STRIPE_SECRET_KEY missing"
      });
    }

    const account = await stripeGet("/v1/account", key);

    if (!account.ok) {
      return res.status(500).json({
        ok: false,
        step: "account_lookup_failed",
        key_type: key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "UNKNOWN",
        stripe_response: account
      });
    }

    const acct = account.data;

    return res.status(200).json({
      ok: true,
      key_type: key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "UNKNOWN",
      stripe_account_used_by_hairintel: {
        id: acct.id,
        email: acct.email || null,
        country: acct.country || null,
        business_name: acct.business_profile && acct.business_profile.name ? acct.business_profile.name : null,
        charges_enabled: acct.charges_enabled,
        payouts_enabled: acct.payouts_enabled,
        details_submitted: acct.details_submitted
      }
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      caught: true,
      message: err && err.message ? err.message : String(err)
    });
  }
};
