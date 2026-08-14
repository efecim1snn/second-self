'use strict';

const { fetchJson, downloadImage, sleep } = require('./helpers');

module.exports = {
  id: 'replicate',
  label: 'Replicate (FLUX, SDXL, her model)',
  dialect: 'flux',
  dialectOverridable: true,
  docs: 'https://replicate.com/docs/reference/http',
  blurb: 'Replicate uzerindeki her modeli calistirabilir. Referans gorseli data URI olarak gonderebildigi icin yuz kilidi burada calisir.',
  supportsReference: true,
  fields: [
    {
      key: 'apiKey',
      label: 'API Token',
      type: 'password',
      required: true,
      help: 'replicate.com/account/api-tokens',
    },
    {
      key: 'model',
      label: 'Model (owner/name)',
      type: 'text',
      default: 'black-forest-labs/flux-dev',
      help: 'Ornek: black-forest-labs/flux-dev, stability-ai/sdxl. Model sayfasindaki "owner/name" kismi.',
    },
    {
      key: 'referenceField',
      label: 'Referans gorsel alani',
      type: 'text',
      default: '',
      help: 'Modelin girdi adi (ornek: image, redux_image, ip_adapter_image). Bos birakirsan referans gonderilmez.',
    },
  ],

  async generate({ config, prompt, negative, seed, width, height, count = 1, referenceDataUri }) {
    if (!config.apiKey) throw new Error('Replicate API Token girilmemis.');
    const model = (config.model || 'black-forest-labs/flux-dev').trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(model)) {
      throw new Error('Model "owner/name" formatinda olmali. Ornek: black-forest-labs/flux-dev');
    }

    const input = {
      prompt,
      num_outputs: Math.min(Math.max(count, 1), 4),
      output_format: 'png',
    };
    if (seed != null) input.seed = Number(seed);
    if (negative) input.negative_prompt = negative;
    if (width && height) {
      input.width = Number(width);
      input.height = Number(height);
      input.aspect_ratio = 'custom';
    }
    if (config.referenceField && referenceDataUri) {
      input[config.referenceField] = referenceDataUri;
    }

    const headers = {
      'content-type': 'application/json',
      'authorization': `Bearer ${config.apiKey}`,
      'prefer': 'wait',
    };

    let prediction = await fetchJson(
      `https://api.replicate.com/v1/models/${model}/predictions`,
      { method: 'POST', headers, body: JSON.stringify({ input }) }
    );

    // "prefer: wait" genelde tamamlanmis dondurur; olmazsa sor.
    for (let attempt = 0; attempt < 60 && prediction && !['succeeded', 'failed', 'canceled'].includes(prediction.status); attempt++) {
      await sleep(3000);
      prediction = await fetchJson(prediction.urls.get, { headers });
    }

    if (!prediction || prediction.status !== 'succeeded') {
      throw new Error(`Replicate uretimi tamamlanmadi: ${prediction && (prediction.error || prediction.status)}`);
    }

    const output = prediction.output;
    const urls = Array.isArray(output) ? output : [output];
    const images = [];
    for (const url of urls.filter((u) => typeof u === 'string')) {
      images.push(await downloadImage(url));
    }
    if (!images.length) {
      throw new Error(`Replicate gorsel dondurmedi: ${JSON.stringify(output).slice(0, 300)}`);
    }
    return { images, raw: { id: prediction.id, model } };
  },
};
