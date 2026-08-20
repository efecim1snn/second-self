'use strict';

const { fetchJson, fetchBinary, downloadImage, fromBase64, dig, fill, fillJsonTemplate } = require('../providers/helpers');

/**
 * OZEL BUYUTME API'si - listede olmayan her servis icin.
 * Upscayl sunucusu, kendi Real-ESRGAN kurulumun, baska bir bulut servisi...
 */
module.exports = {
  id: 'custom',
  label: 'Ozel buyutme API\'si',
  blurb: 'Listede olmayan her servis icin. Dokumanindaki adres, baslik ve govde sablonunu gir.',
  needs: 'Uc nokta adresi + anahtari',
  free: false,
  local: false,
  maxScale: 4,
  fields: [
    { key: 'url', label: 'Istek adresi (URL)', type: 'text', required: true },
    {
      key: 'headers', label: 'Basliklar (JSON)', type: 'textarea', secret: true,
      default: '{\n  "content-type": "application/json",\n  "Authorization": "Bearer BURAYA_ANAHTARIN"\n}',
    },
    {
      key: 'body', label: 'Govde sablonu (JSON)', type: 'textarea',
      default: '{\n  "image": "{{imageDataUri}}",\n  "scale": {{scale}}\n}',
      help: 'Degiskenler: {{imageDataUri}} {{imageBase64}} {{scale}}',
    },
    {
      key: 'resultType', label: 'Yanit tipi', type: 'select',
      options: ['url', 'base64', 'binary'], default: 'url',
    },
    { key: 'resultPath', label: 'Yanit icindeki yol', type: 'text', default: 'output' },
  ],

  async upscale({ config, buffer, scale = 2 }) {
    if (!config.url) throw new Error('Ozel buyutme API adresi girilmemis.');
    const b64 = buffer.toString('base64');
    const vars = {
      imageBase64: b64,
      imageDataUri: `data:image/png;base64,${b64}`,
      scale: Math.min(Math.max(Number(scale) || 2, 1), 4),
    };

    let headers = { 'content-type': 'application/json' };
    if (config.headers) headers = { ...headers, ...fillJsonTemplate(config.headers, vars, 'Basliklar') };
    const body = config.body ? JSON.stringify(fillJsonTemplate(config.body, vars, 'Govde sablonu')) : undefined;
    const url = fill(config.url, vars);

    if ((config.resultType || 'url') === 'binary') {
      const out = await fetchBinary(url, { method: 'POST', headers, body }, 300000);
      return { buffer: out, mime: 'image/png' };
    }

    const res = await fetchJson(url, { method: 'POST', headers, body }, 300000);
    const value = dig(res, config.resultPath || 'output');
    const item = Array.isArray(value) ? value[0] : value;
    if (!item) {
      throw new Error(`Yanitta gorsel bulunamadi ("${config.resultPath}"): ${JSON.stringify(res).slice(0, 300)}`);
    }
    if (typeof item === 'object') {
      if (item.url) return downloadImage(item.url);
      if (item.b64_json || item.base64) return fromBase64(item.b64_json || item.base64);
    }
    const str = String(item);
    if (config.resultType === 'base64' || (!str.startsWith('http') && str.length > 200)) return fromBase64(str);
    return downloadImage(str);
  },
};
