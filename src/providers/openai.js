'use strict';

const { fetchJson, fromBase64, downloadImage } = require('./helpers');

module.exports = {
  id: 'openai',
  label: 'OpenAI (gpt-image / DALL-E 3)',
  dialect: 'dalle',
  docs: 'https://platform.openai.com/docs/api-reference/images/create',
  blurb: 'Kurulumu en kolay secenek. Ama seed desteklemez; ayni yuzu birebir tekrarlamakta en zayif olan budur.',
  supportsReference: false,
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      help: 'platform.openai.com > API keys. Anahtar sadece bu bilgisayarda tutulur.',
    },
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      options: ['gpt-image-1', 'dall-e-3'],
      default: 'gpt-image-1',
    },
    {
      key: 'quality',
      label: 'Kalite',
      type: 'select',
      options: ['auto', 'low', 'medium', 'high'],
      default: 'high',
      help: 'dall-e-3 icin "standard"/"hd" karsiligi otomatik esitlenir.',
    },
    {
      key: 'baseUrl',
      label: 'API adresi',
      type: 'text',
      default: 'https://api.openai.com/v1',
      help: 'Uyumlu bir proxy kullaniyorsan burayi degistir.',
    },
  ],

  async generate({ config, prompt, size, count = 1 }) {
    if (!config.apiKey) throw new Error('OpenAI API Key girilmemis.');

    const base = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = config.model || 'gpt-image-1';

    const body = {
      model,
      prompt,
      n: Math.min(Math.max(count, 1), model === 'dall-e-3' ? 1 : 4),
      size: size || '1024x1536',
    };

    if (model === 'dall-e-3') {
      body.size = normaliseDalleSize(body.size);
      body.quality = config.quality === 'low' || config.quality === 'medium' ? 'standard' : 'hd';
      body.response_format = 'b64_json';
    } else if (config.quality && config.quality !== 'auto') {
      body.quality = config.quality;
    }

    const res = await fetchJson(`${base}/images/generations`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = (res && res.data) || [];
    if (!data.length) throw new Error(`OpenAI gorsel dondurmedi: ${JSON.stringify(res).slice(0, 400)}`);

    const images = [];
    for (const item of data) {
      if (item.b64_json) images.push(fromBase64(item.b64_json, 'image/png'));
      else if (item.url) images.push(await downloadImage(item.url));
    }
    return { images, raw: { model } };
  },
};

function normaliseDalleSize(size) {
  const allowed = ['1024x1024', '1792x1024', '1024x1792'];
  if (allowed.includes(size)) return size;
  const [w, h] = String(size).split('x').map(Number);
  if (!w || !h) return '1024x1792';
  if (w > h) return '1792x1024';
  if (h > w) return '1024x1792';
  return '1024x1024';
}
