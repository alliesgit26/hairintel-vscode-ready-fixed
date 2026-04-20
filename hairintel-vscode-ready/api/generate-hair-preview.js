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
    return send(500, { error: "OPENAI_API_KEY is missing on the server." });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body || {});

    const photos = body.photos || {};
    const result = body.result || {};
    const plan = result.plan || {};

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

    const oaRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1",
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
      return send(oaRes.status, {
        error: `OpenAI API error: ${raw}`
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