'use strict';

const { fetchJson, downloadImage, sleep } = require('./helpers');

const BASE = 'https://cloud.leonardo.ai/api/rest/v1';

module.exports = {
  id: 'leonardo',
  label: 'Leonardo.ai',
  dialect: 'leonardo',
  docs: 'https://docs.leonardo.ai/reference/creategeneration',
  blurb: 'Ucretsiz gunluk kredi verir. Karakter tutarliligi icin Image Guidance destegi vardir.',
  supportsReference: false,
  referenceMode: 'none',
  cost: 'kredili',
  costNote: 'Gunluk ucretsiz kredi veriyor, sonrasi abonelik.',
  pricingUrl: 'https://leonardo.ai/pricing/',
  realism: 'orta',
  realismNote: 'Kendi modelleri stilize egilimli; Alchemy acikken daha temiz cikiyor.',
  maxResolution: 'modele gore degisir',
  resolutionNote: '',
  setup: 'anahtar',
  setupNote: 'Yalnizca API anahtari yapistirilir.',
  supportsSeed: true,
  supportsNegative: true,
  needs: 'Sadece API anahtari',
  keyUrl: 'https://app.leonardo.ai/api-access',
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      help: 'app.leonardo.ai > Settings > API Access > Create Key. Anahtar sadece bu bilgisayarda data/providers.json icinde tutulur.',
    },
    {
      key: 'modelId',
      label: 'Model ID',
      type: 'text',
      default: '6b645e3a-d64f-4341-a6d8-7a3690fbf042',
      help: 'Varsayilan: Leonardo Phoenix. Leonardo model kimliklerini degistirirse buradan guncelle (Models sayfasinda her modelin ID\'si yazar).',
    },
    {
      key: 'alchemy',
      label: 'Alchemy (yuksek kalite)',
      type: 'boolean',
      default: false,
      help: 'Acikken kalite artar, kredi tuketimi de artar.',
    },
  ],

  async generate({ config, prompt, negative, seed, width, height, count = 1 }) {
    if (!config.apiKey) throw new Error('Leonardo API Key girilmemis.');

    const headers = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'authorization': `Bearer ${config.apiKey}`,
    };

    const body = {
      prompt,
      modelId: config.modelId || '6b645e3a-d64f-4341-a6d8-7a3690fbf042',
      width: roundTo8(width || 832),
      height: roundTo8(height || 1216),
      num_images: Math.min(Math.max(count, 1), 4),
      alchemy: !!config.alchemy,
    };
    if (negative) body.negative_prompt = negative;
    if (seed != null) body.seed = Number(seed);

    const created = await fetchJson(`${BASE}/generations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const generationId = created
      && created.sdGenerationJob
      && created.sdGenerationJob.generationId;
    if (!generationId) {
      throw new Error(`Leonardo beklenmeyen yanit verdi: ${JSON.stringify(created).slice(0, 400)}`);
    }

    // Uretim asenkron: bitene kadar sor.
    for (let attempt = 0; attempt < 60; attempt++) {
      await sleep(attempt === 0 ? 4000 : 3000);
      const res = await fetchJson(`${BASE}/generations/${generationId}`, { headers });
      const gen = res && res.generations_by_pk;
      if (!gen) continue;
      if (gen.status === 'FAILED') throw new Error('Leonardo uretimi basarisiz oldu (FAILED).');
      if (gen.status === 'COMPLETE' && Array.isArray(gen.generated_images) && gen.generated_images.length) {
        const images = [];
        for (const img of gen.generated_images) {
          images.push(await downloadImage(img.url));
        }
        return { images, raw: { generationId, status: gen.status } };
      }
    }

    throw new Error('Leonardo uretimi zaman asimina ugradi (3 dakika).');
  },
};

function roundTo8(n) {
  return Math.max(512, Math.round(Number(n) / 8) * 8);
}
