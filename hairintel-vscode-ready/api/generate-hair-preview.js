import { getSupabaseAdmin, normalizePlan } from './_supabase-admin.js';

export default async function handler(req, res) {
  const send = (status, payload) => {
    res.status(status);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(payload));
  };

  if (req.method !== "POST") {
    return send(405, { error: "Method not allowed. Use POST." });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("[generate-hair-preview] OPENAI_API_KEY is missing");
    return send(503, {
      error: "AI preview is temporarily unavailable. Please try again later."
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body || {});

    const photos = body.photos || {};
    const result = body.result || {};
    const plan = result.plan || {};
    const sub = body.subscription || {};

    const allowedPlans = ["pro", "studio"];
    const allowedStatuses = ["active", "trialing"];
    const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
    const normalizeCustomerId = (value) => String(value || "").trim();

    // Server-side subscription verification via Supabase is the billing authority.
    let effectiveSub = null;
    try {
      const supabase = getSupabaseAdmin();
      const email = normalizeEmail(body.email || body.customerEmail || body.customer_email || sub.email || sub.customer_email);
      const stripeCustomerId = normalizeCustomerId(
        body.stripeCustomerId ||
        body.stripe_customer_id ||
        sub.stripeCustomerId ||
        sub.stripe_customer_id
      );

      if (supabase && (email || stripeCustomerId)) {
        const query = supabase
          .from('subscriptions')
          .select('plan,status,stripe_customer_id,customer_email')
          .order('updated_at', { ascending: false })
          .limit(1);

        const q = email ? query.eq('customer_email', email) : query.eq('stripe_customer_id', stripeCustomerId);
        const { data, error } = await q.maybeSingle();
        if (error) throw error;
        if (data) {
          effectiveSub = {
            plan: normalizePlan(data.plan),
            status: String(data.status || '').toLowerCase(),
            stripeCustomerId: data.stripe_customer_id || null,
            email: data.customer_email || null
          };
        }
      }
    } catch (err) {
      console.warn('[generate-hair-preview] supabase lookup failed:', err?.message || err);
    }

    const activePlan = normalizePlan(effectiveSub?.plan || "free");
    const activeStatus = String(effectiveSub?.status || "inactive").toLowerCase();
    const hasPreviewAccess = allowedPlans.includes(activePlan) && allowedStatuses.includes(activeStatus);

    // Test bypass (development only). Production billing authority remains Supabase/Stripe.
    const bypass = String(process.env.ALLOW_AI_PREVIEW_TEST_BYPASS || "").toLowerCase() === 'true';

    if (!hasPreviewAccess && !bypass) {
      return send(403, { error: "AI previews require an active Pro or Studio subscription." });
    }

    const front = photos["photo-front"];
    const back = photos["photo-back"];
    const left = photos["photo-left"];
    const right = photos["photo-right"];
    const inspo = photos["photo-inspo"];

    if (!front || !back) {
      return send(400, { error: "Front and back photos are required." });
    }

    const prompt = [
      "Create one photorealistic hair extension preview of the same real person shown in the uploaded photos.",
      "Preserve facial identity, skin tone, head shape, pose, and camera angle.",
      "Do not cartoonize or stylize.",
      "Keep the result realistic, salon-quality, and believable.",
      `Recommended method: ${plan.method || "extensions"}.`,
      `Recommended length: ${plan.extensionLength || "natural added length"}.`,
      `Recommended weight/fullness: ${plan.grams || 0} grams.`,
      `Readiness: ${result.readiness || "unknown"}.`,
      "Blend the extension hair naturally with the client's real hair.",
      "Use the final reference image only as inspiration for hair color, density, and finish if provided."
    ].join(" ");

    const content = [
      { type: "input_text", text: prompt },
      { type: "input_image", image_url: front },
      { type: "input_image", image_url: back }
    ];

    if (left) content.push({ type: "input_image", image_url: left });
    if (right) content.push({ type: "input_image", image_url: right });
    if (inspo) content.push({ type: "input_image", image_url: inspo });

    const responseModel = process.env.OPENAI_RESPONSES_MODEL || "gpt-5";

    const oaRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: responseModel,
        input: [
          {
            role: "user",
            content
          }
        ],
        tools: [
          {
            type: "image_generation"
          }
        ]
      })
    });

    const raw = await oaRes.text();

    if (!oaRes.ok) {
      let apiError = raw;
      try {
        const parsedError = JSON.parse(raw);
        apiError = parsedError?.error?.message || raw;
      } catch {}

      const accessMessage = /insufficient_quota|exceeded your current quota|billing details|check your plan/i.test(apiError)
        ? "AI preview is temporarily unavailable. Please try again later."
        : /organization must be verified|model.*not.*access|does not have access|unsupported model/i.test(apiError)
          ? "AI preview is temporarily unavailable. Please try again later."
          : `OpenAI API error: ${apiError}`;

      if (accessMessage === "AI preview is temporarily unavailable. Please try again later.") {
        console.error("[generate-hair-preview] OpenAI service configuration error:", {
          model: responseModel,
          status: oaRes.status,
          message: apiError
        });
      }

      return send(oaRes.status, {
        error: accessMessage
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return send(500, {
        error: `OpenAI returned non-JSON: ${raw}`
      });
    }

    const images = (parsed.output || [])
      .filter(item => item.type === "image_generation_call" && item.result)
      .map(item => `data:image/png;base64,${item.result}`);

    if (!images.length) {
      return send(502, {
        error: "OpenAI returned no preview image."
      });
    }

    return send(200, { images });
  } catch (err) {
    console.error("[generate-hair-preview] fatal:", err);
    return send(500, {
      error: err?.message || "A server error has occurred"
    });
  }
}
