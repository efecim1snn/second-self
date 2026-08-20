'use strict';

const { fetchJson, fromBase64 } = require('../providers/helpers');

/**
 * Yerel Stable Diffusion WebUI'nin "Extras" ucu.
 * Ucretsiz, sinirsiz, kendi bilgisayarinda. Gorsel uretimi icin A1111
 * baglamis olman gerekmiyor - sadece buyutme icin de kullanabilirsin.
 */
module.exports = {
  id: 'automatic1111',
  label: 'Yerel Stable Diffusion (A1111 / Forge) - UCRETSIZ',
  blurb: 'Kendi bilgisayarinda calisir, sinirsiz ve bedava. Real-ESRGAN gibi buyutuculeri hazir gelir. Gorsel uretimini baska yerden alsan bile buyutmeyi buraya yaptirabilirsin.',
  needs: 'Bilgisayarinda "--api" ile acik WebUI',
  free: true,
  local: true,
  maxScale: 4,
  fields: [
    {
      key: 'baseUrl',
      label: 'WebUI adresi',
      type: 'text',
      default: 'http://127.0.0.1:7860',
      help: 'webui-user.bat icinde COMMANDLINE_ARGS=--api olmali.',
    },
    {
      key: 'upscaler',
      label: 'Buyutucu',
      type: 'select',
      options: ['R-ESRGAN 4x+', 'R-ESRGAN 4x+ Anime6B', 'ESRGAN_4x', 'SwinIR_4x', 'LDSR', 'Lanczos'],
      default: 'R-ESRGAN 4x+',
      help: 'Portre icin "R-ESRGAN 4x+" en dengelisi.',
    },
    {
      key: 'faceRestore',
      label: 'Yuz duzeltme (GFPGAN)',
      type: 'number',
      default: 0,
      help: '0 = kapali. 0.3-0.5 arasi yuz detayini toparlar ama fazlasi plastik gorunum yapar - 0.5 ustune cikma.',
    },
  ],

  async upscale({ config, buffer, scale = 2 }) {
    const base = (config.baseUrl || 'http://127.0.0.1:7860').replace(/\/$/, '');
    let res;
    try {
      res = await fetchJson(`${base}/sdapi/v1/extra-single-image`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          image: buffer.toString('base64'),
          upscaling_resize: Math.min(Math.max(Number(scale) || 2, 1), 4),
          upscaler_1: config.upscaler || 'R-ESRGAN 4x+',
          gfpgan_visibility: Math.min(Math.max(Number(config.faceRestore) || 0, 0), 1),
          resize_mode: 0,
          upscale_first: false,
        }),
      }, 300000);
    } catch (err) {
      if (/fetch failed|ECONNREFUSED/i.test(err.message)) {
        throw new Error(`WebUI'ye baglanilamadi (${base}). Acik mi ve "--api" bayragiyla mi basladi?`);
      }
      throw err;
    }
    if (!res || !res.image) throw new Error('WebUI buyutulmus gorsel dondurmedi.');
    return fromBase64(res.image, 'image/png');
  },
};
