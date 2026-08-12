export default async function handler(req, res) {
  const send = (status, payload) => {
    res.status(status);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(payload));
  };

  if (req.method !== "POST") {
    return send(405, { error: "Method not allowed. Use POST." });
  }

  if (!process.env.STABILITY_API_KEY) {
    console.error("[generate-hair-preview-stability] STABILITY_API_KEY is missing");
    return send(503, { error: "AI preview is temporarily unavailable. Please try again later." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const photos = body.photos || {};
    const front = photos["photo-front"] || body.front || null;
    const mask = photos["photo-front-mask"] || body.mask || null;
    const plan = body.result?.plan || {};

    if (!front) {
      return send(400, { error: "Front photo is required." });
    }

    if (!mask) {
      return send(400, { error: "A hair mask is required for inpainting. Provide photos['photo-front-mask'] or mask in the body." });
    }

    // Helper to convert data-url or raw base64 string into PNG buffer
    const base64FromDataUrl = (dataUrl) => {
      if (!dataUrl) return null;
      const parts = String(dataUrl).split(',');
      return parts.length > 1 ? parts[1] : parts[0];
    };

    const frontBase64 = base64FromDataUrl(front);
    const maskBase64 = base64FromDataUrl(mask);

    const frontBuffer = Buffer.from(frontBase64, 'base64');
    const maskBuffer = Buffer.from(maskBase64, 'base64');

    // Ensure PNG format (Stability inpaint expects PNG/WebP for masks or transparent masks)
    const sharp = await import('sharp');
    const frontPng = await sharp.default(frontBuffer).png().toBuffer();
    const maskPng = await sharp.default(maskBuffer).png().toBuffer();

    const prompt = [
      "Modify only the hair in this photo.",
      `Recommended method: ${plan.method || 'extensions'}.`,
      `Recommended length: ${plan.extensionLength || 'natural added length'}.`,
      "Preserve facial identity, skin tone, head shape, pose, and camera angle.",
      "Do not cartoonize or stylize. Keep the result realistic, salon-quality, and believable.",
      "Blend the extension hair naturally with the client's real hair.",
      "Avoid changing background, face, eyes, or clothing."
    ].join(' ');

    // Build form data. Node 18+ provides global FormData and Blob; keep parity with other server files.
    const form = new FormData();
    form.append('image', new Blob([frontPng], { type: 'image/png' }), 'image.png');
    form.append('mask', new Blob([maskPng], { type: 'image/png' }), 'mask.png');
    form.append('prompt', prompt);
    // strength governs how far from the original the edit may go. 0.6 is a good start for hair edits.
    form.append('strength', String(body.strength ?? 0.6));
    form.append('output_format', 'png');
    if (body.seed) form.append('seed', String(body.seed));

    // Optional size parameter (e.g., 1024) if supported by the engine
    if (body.width) form.append('width', String(body.width));
    if (body.height) form.append('height', String(body.height));

    console.log('[generate-hair-preview-stability] Calling Stability inpaint API...');

    const stRes = await fetch('https://api.stability.ai/v2beta/stable-image/edit/inpaint', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
        'Accept': 'application/json'
      },
      body: form
    });

    console.log('[generate-hair-preview-stability] Stability response status:', stRes.status);

    if (!stRes.ok) {
      const errorText = await stRes.text();
      console.error('[generate-hair-preview-stability] Stability error:', errorText);
      return send(stRes.status, { error: `Stability AI error: ${errorText}` });
    }

    const contentType = stRes.headers.get('content-type') || '';
    let images = [];

    if (contentType.includes('application/json')) {
      const json = await stRes.json();
      // Common patterns: { image: 'base64...' } or { artifacts: [{base64: '...'}] }
      if (json.image) images.push(`data:image/png;base64,${json.image}`);
      if (json.artifacts && Array.isArray(json.artifacts)) {
        for (const a of json.artifacts) {
          if (a.base64) images.push(`data:image/png;base64,${a.base64}`);
          else if (a.buffer) images.push(`data:image/png;base64,${a.buffer}`);
        }
      }
    } else {
      // Binary response -> convert to base64
      const arrayBuffer = await stRes.arrayBuffer();
      const imageBase64 = Buffer.from(arrayBuffer).toString('base64');
      images.push(`data:image/png;base64,${imageBase64}`);
    }

    if (!images.length) {
      return send(502, { error: 'No image returned from Stability AI' });
    }

    // Optionally, return metadata for reproducibility
    const metadata = {
      provider: 'stability',
      strength: body.strength ?? 0.6,
      seed: body.seed || null,
      prompt_snippet: prompt.slice(0, 240)
    };

    return send(200, { images, metadata });
  } catch (err) {
    console.error('[generate-hair-preview-stability] fatal:', err);
    return send(500, { error: err?.message || 'A server error has occurred' });
  }
}
