'use strict';

const { fetchBinary } = require('./helpers');

module.exports = {
  id: 'stability',
  label: 'Stability AI (Stable Image)',
  dialect: 'sdxl',
  docs: 'https://platform.stability.ai/docs/api-reference',
  blurb: 'Seed ve negatif prompt destekler; tutarlilik icin iyi bir denge.',
  supportsReference: false,
  needs: 'Sadece API anahtari',
  keyUrl: 'https://platform.stability.ai/account/keys',
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      help: 'platform.stability.ai > API Keys.',
    },
    {
      key: 'endpoint',
      label: 'Uc nokta',
      type: 'select',
      options: [
        'https://api.stability.ai/v2beta/stable-image/generate/core',
        'https://api.stability.ai/v2beta/stable-image/generate/ultra',
        'https://api.stability.ai/v2beta/stable-image/generate/sd3',
      ],
      default: 'https://api.stability.ai/v2beta/stable-image/generate/core',
    },
  ],

  async generate({ config, prompt, negative, seed, aspectRatio }) {
    if (!config.apiKey) throw new Error('Stability API Key girilmemis.');

    const form = new FormData();
    form.append('prompt', prompt);
    form.append('output_format', 'png');
    form.append('aspect_ratio', aspectRatio || '4:5');
    if (negative) form.append('negative_prompt', negative);
    if (seed != null) form.append('seed', String(seed));

    const buffer = await fetchBinary(
      config.endpoint || 'https://api.stability.ai/v2beta/stable-image/generate/core',
      {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${config.apiKey}`,
          'accept': 'image/*',
        },
        body: form,
      }
    );

    return { images: [{ buffer, mime: 'image/png' }], raw: {} };
  },
};
