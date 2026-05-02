import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use(express.static(__dirname));

// API routes
app.post('/api/generate-hair-preview', async (req, res) => {
  const send = (status, payload) => {
    res.status(status);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(payload));
  };

  if (!process.env.STABILITY_API_KEY) {
    console.error('[generate-hair-preview] STABILITY_API_KEY is missing');
    return send(500, { error: "STABILITY_API_KEY is missing on the server." });
  }

  try {
    const body = req.body || {};
    const photos = body.photos || {};
    const result = body.result || {};
    const plan = result.plan || {};

    const front = photos["photo-front"];
    const back = photos["photo-back"];

    if (!front) {
      return send(400, { error: "Front photo is required." });
    }

    const prompt = `Modify only the hair in this photo. ${plan.method ? `Apply ${plan.method} hair extensions` : 'Add hair extensions'}. ${plan.extensionLength ? `Make the hair ${plan.extensionLength} longer` : ''}. Keep the person's face, skin tone, and body completely unchanged. Only the hair should be different - make it longer, fuller, and more voluminous with realistic extensions blended naturally. The person's face and everything else must stay exactly the same.`;

    // Convert base64 image to PNG buffer for Stability API (requires PNG/WebP, not JPEG)
    const base64Data = front.split(',')[1] || front;
    const jpegBuffer = Buffer.from(base64Data, 'base64');
    
    // Convert JPEG to PNG using sharp
    const pngBuffer = await sharp(jpegBuffer).png().toBuffer();

    const form = new FormData();
    form.append('image', new Blob([pngBuffer], { type: 'image/png' }), 'image.png');
    form.append('prompt', prompt);
    form.append('strength', '0.65');
    form.append('output_format', 'png');

    console.log('[generate-hair-preview] Calling Stability AI Image-to-Image API...');

    const stRes = await fetch('https://api.stability.ai/v2beta/stable-image/edit/inpaint', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
        'Accept': 'application/json'
      },
      body: form
    });

    console.log('[generate-hair-preview] Stability response status:', stRes.status);

    if (!stRes.ok) {
      const errorText = await stRes.text();
      console.error('[generate-hair-preview] Stability error:', errorText);
      return send(stRes.status, {
        error: `Stability AI error: ${errorText}`
      });
    }

    // Try to parse as JSON first (API might return JSON with base64 image)
    const contentType = stRes.headers.get('content-type');
    let images = [];
    
    if (contentType && contentType.includes('application/json')) {
      const jsonResponse = await stRes.json();
      if (jsonResponse.image) {
        images = [`data:image/jpeg;base64,${jsonResponse.image}`];
      }
    } else {
      // If binary, convert to base64
      const arrayBuffer = await stRes.arrayBuffer();
      const imageBase64 = Buffer.from(arrayBuffer).toString('base64');
      images = [`data:image/jpeg;base64,${imageBase64}`];
    }

    if (!images.length) {
      return send(502, { error: "No image returned from Stability AI" });
    }

    return send(200, { images });
  } catch (err) {
    console.error("[generate-hair-preview] fatal:", err);
    return send(500, {
      error: err?.message || "A server error has occurred"
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`STABILITY_API_KEY loaded: ${!!process.env.STABILITY_API_KEY}`);
});
