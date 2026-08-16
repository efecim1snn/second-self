'use strict';

const { fetchJson, downloadImage, fromBase64 } = require('./helpers');

module.exports = {
  id: 'fal',
  label: 'fal.ai',
  dialect: 'flux',
  dialectOverridable: true,
  docs: 'https://docs.fal.ai/model-apis/quickstart',
  blurb: 'Hizli ve senkron calisir. FLUX ailesi icin en pratik secenek.',
  supportsReference: true,
  needs: 'API anahtari (model yolu hazir geliyor)',
  keyUrl: 'https://fal.ai/dashboard/keys',
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      help: 'fal.ai/dashboard/keys - "key_id:key_secret" formatindaki tam anahtari yapistir.',
    },
    {
      key: 'model',
      label: 'Model yolu',
      type: 'text',
      default: 'fal-ai/flux/dev',
      help: 'Ornek: fal-ai/flux/dev, fal-ai/flux-pro/v1.1, fal-ai/fast-sdxl',
    },
    {
      key: 'referenceField',
      label: 'Referans gorsel alani',
      type: 'text',
      default: '',
      help: 'Modelin girdi adi (ornek: image_url). Bos ise referans gonderilmez.',
    },
  ],

  async generate({ config, prompt, negative, seed, width, height, count = 1, referenceDataUri, engine }) {
    if (!config.apiKey) throw new Error('fal.ai API Key girilmemis.');
    const model = (config.model || 'fal-ai/flux/dev').replace(/^\/|\/$/g, '');

    const input = {
      prompt,
      num_images: Math.min(Math.max(count, 1), 4),
      enable_safety_checker: true,
    };
    if (seed != null) input.seed = Number(seed);
    if (negative) input.negative_prompt = negative;

    // Gercekcilik seviyesinin motor ayarlari (bkz. promptcraft.REALISM.engine).
    if (engine) {
      if (engine.guidance != null) {
        input.guidance_scale = engine.guidance;
      }
      if (engine.steps != null) {
        input.num_inference_steps = engine.steps;
      }
    }
    if (width && height) input.image_size = { width: Number(width), height: Number(height) };
    if (config.referenceField && referenceDataUri) input[config.referenceField] = referenceDataUri;

    const res = await fetchJson(`https://fal.run/${model}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Key ${config.apiKey}`,
      },
      body: JSON.stringify(input),
    });

    const list = (res && (res.images || res.image || res.output)) || [];
    const arr = Array.isArray(list) ? list : [list];
    const images = [];
    for (const item of arr) {
      if (!item) continue;
      if (typeof item === 'string') images.push(await downloadImage(item));
      else if (item.url) images.push(await downloadImage(item.url));
      else if (item.b64_json || item.base64) images.push(fromBase64(item.b64_json || item.base64));
    }
    if (!images.length) {
      throw new Error(`fal.ai gorsel dondurmedi: ${JSON.stringify(res).slice(0, 400)}`);
    }
    return { images, raw: { model } };
  },
};
