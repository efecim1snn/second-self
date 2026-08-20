'use strict';

const { fetchJson, downloadImage, sleep } = require('../providers/helpers');

/**
 * Replicate uzerinde buyutme modeli. Ucretli ama cok ucuz -
 * buyutme modelleri uretim modellerinden kat kat daha az tuketir.
 */
module.exports = {
  id: 'replicate',
  label: 'Replicate (Real-ESRGAN vb.) - ucretli, cok ucuz',
  blurb: 'Bilgisayarinda GPU yoksa en pratik yol. Buyutme modelleri uretimden cok daha ucuzdur.',
  needs: 'API anahtari (model adi hazir geliyor)',
  free: false,
  local: false,
  maxScale: 4,
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
      default: 'nightmareai/real-esrgan',
      help: 'Model sayfasindaki "owner/name" kismi.',
    },
    {
      key: 'imageField',
      label: 'Gorsel girdi alani',
      type: 'text',
      default: 'image',
      help: 'Cogu buyutme modelinde "image".',
    },
    {
      key: 'scaleField',
      label: 'Olcek girdi alani',
      type: 'text',
      default: 'scale',
      help: 'Model bunu kullanmiyorsa bos birak.',
    },
  ],

  async upscale({ config, buffer, scale = 2 }) {
    if (!config.apiKey) throw new Error('Replicate API Token girilmemis.');
    const model = (config.model || 'nightmareai/real-esrgan').trim();

    const input = {};
    input[config.imageField || 'image'] = `data:image/png;base64,${buffer.toString('base64')}`;
    if (config.scaleField) input[config.scaleField] = Math.min(Math.max(Number(scale) || 2, 1), 4);

    const headers = {
      'content-type': 'application/json',
      'authorization': `Bearer ${config.apiKey}`,
      'prefer': 'wait',
    };

    let pred = await fetchJson(
      `https://api.replicate.com/v1/models/${model}/predictions`,
      { method: 'POST', headers, body: JSON.stringify({ input }) },
      300000
    );

    for (let i = 0; i < 90 && pred && !['succeeded', 'failed', 'canceled'].includes(pred.status); i++) {
      await sleep(3000);
      pred = await fetchJson(pred.urls.get, { headers });
    }
    if (!pred || pred.status !== 'succeeded') {
      throw new Error(`Buyutme tamamlanmadi: ${pred && (pred.error || pred.status)}`);
    }
    const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (typeof out !== 'string') throw new Error('Buyutme sonucu okunamadi.');
    return downloadImage(out);
  },
};
