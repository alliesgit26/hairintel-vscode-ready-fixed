import fs from 'fs/promises';
import path from 'path';

const SAMPLE_DIR = path.resolve(process.cwd(), 'test_samples');
const OUT_DIR = path.resolve(process.cwd(), 'test_output');

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const STABILITY_KEY = process.env.STABILITY_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_RESPONSES_MODEL || 'gpt-4o-mini';

if (!OPENAI_KEY && !STABILITY_KEY) {
  console.error('Please set at least one of OPENAI_API_KEY or STABILITY_API_KEY in environment to run the A/B test.');
  process.exit(1);
}

async function listSamples() {
  try {
    const files = await fs.readdir(SAMPLE_DIR);
    // Expect pairs like sample1.jpg and sample1-mask.png
    const fronts = files.filter(f => /-mask\./i.test(f) === false);
    return fronts;
  } catch (err) {
    console.error('Failed to read test_samples folder:', err.message);
    process.exit(1);
  }
}

function dataUrlFromBuffer(buf, filename) {
  const ext = path.extname(filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function callStability(frontBuf, maskBuf, prompt, width, height, strength, seed) {
  if (!STABILITY_KEY) throw new Error('STABILITY_API_KEY not set');

  const form = new FormData();
  form.append('image', new Blob([frontBuf], { type: 'image/png' }), 'image.png');
  form.append('mask', new Blob([maskBuf], { type: 'image/png' }), 'mask.png');
  form.append('prompt', prompt);
  form.append('strength', String(strength ?? 0.6));
  form.append('output_format', 'png');
  if (seed) form.append('seed', String(seed));
  if (width) form.append('width', String(width));
  if (height) form.append('height', String(height));

  const res = await fetch('https://api.stability.ai/v2beta/stable-image/edit/inpaint', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STABILITY_KEY}`,
      'Accept': 'application/json'
    },
    body: form
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Stability API error ${res.status}: ${txt}`);
  }

  if (contentType.includes('application/json')) {
    const json = await res.json();
    // try to extract base64
    if (json.image) return Buffer.from(json.image, 'base64');
    if (json.artifacts && Array.isArray(json.artifacts) && json.artifacts[0]?.base64) {
      return Buffer.from(json.artifacts[0].base64, 'base64');
    }
    throw new Error('Stability returned JSON without image data');
  } else {
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }
}

async function callOpenAI(frontDataUrl, backDataUrl, prompt, model) {
  if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY not set');

  const content = [
    { type: 'input_text', text: prompt },
    { type: 'input_image', image_url: frontDataUrl }
  ];

  if (backDataUrl) content.push({ type: 'input_image', image_url: backDataUrl });

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({ model: model, input: [{ role: 'user', content }] , tools: [{ type: 'image_generation' }] })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${txt}`);
  }

  const raw = await res.text();
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { throw new Error('OpenAI returned non-JSON'); }

  const images = (parsed.output || []).filter(i => i.type === 'image_generation_call' && i.result).map(i => i.result);
  if (!images.length) throw new Error('OpenAI returned no image_generation_call results');

  // The result items are base64 pngs per repo's pattern
  const buf = Buffer.from(images[0], 'base64');
  return buf;
}

async function ensureOut() {
  try { await fs.mkdir(OUT_DIR, { recursive: true }); } catch {}
}

async function run() {
  await ensureOut();
  const samples = await listSamples();
  const report = [];

  for (const file of samples) {
    try {
      const frontPath = path.join(SAMPLE_DIR, file);
      const maskPath = path.join(SAMPLE_DIR, file.replace(/(\.[^.]+)$/, '-mask.png'));
      const backPath = path.join(SAMPLE_DIR, file.replace(/(\.[^.]+)$/, '-back$1'));

      const frontBufRaw = await fs.readFile(frontPath);
      // convert to PNG buffer using sharp if needed
      const sharp = await import('sharp');
      const frontPng = await sharp.default(frontBufRaw).png().toBuffer();

      let maskPng;
      try {
        const maskBufRaw = await fs.readFile(maskPath);
        maskPng = await sharp.default(maskBufRaw).png().toBuffer();
      } catch (err) {
        console.warn('No mask found for', file, 'expected at', maskPath);
        throw new Error('Mask required for stability inpainting; add a mask named <filename>-mask.png in test_samples');
      }

      let backDataUrl = null;
      try {
        const backBuf = await fs.readFile(backPath);
        const backPng = await sharp.default(backBuf).png().toBuffer();
        backDataUrl = dataUrlFromBuffer(backPng, backPath);
      } catch {}

      const prompt = `Create one photorealistic hair extension preview of the same real person shown in the photo. Preserve facial identity, skin tone, head shape, pose, and camera angle. Do not stylize. Blend the extension hair naturally.`;

      const entry = { sample: file, results: {} };

      if (STABILITY_KEY) {
        try {
          const outBuf = await callStability(frontPng, maskPng, prompt, 1024, 1024, 0.6, null);
          const outPath = path.join(OUT_DIR, `${path.basename(file, path.extname(file))}-stability.png`);
          await fs.writeFile(outPath, outBuf);
          entry.results.stability = outPath;
          console.log('Wrote Stability result:', outPath);
        } catch (err) {
          console.error('Stability error for', file, err.message);
          entry.results.stability_error = String(err.message);
        }
      }

      if (OPENAI_KEY) {
        try {
          const frontDataUrl = dataUrlFromBuffer(frontPng, file);
          const outBuf = await callOpenAI(frontDataUrl, backDataUrl, prompt, OPENAI_MODEL);
          const outPath = path.join(OUT_DIR, `${path.basename(file, path.extname(file))}-openai.png`);
          await fs.writeFile(outPath, outBuf);
          entry.results.openai = outPath;
          console.log('Wrote OpenAI result:', outPath);
        } catch (err) {
          console.error('OpenAI error for', file, err.message);
          entry.results.openai_error = String(err.message);
        }
      }

      report.push(entry);
    } catch (err) {
      console.error('Failed sample', file, err.message);
      report.push({ sample: file, error: String(err.message) });
    }
  }

  const reportPath = path.join(OUT_DIR, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log('Report written to', reportPath);
}

run().catch(err => { console.error('Fatal test harness error:', err); process.exit(1); });
