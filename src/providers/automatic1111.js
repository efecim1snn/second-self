'use strict';

const { fetchJson, fromBase64 } = require('./helpers');

/**
 * Yerel Stable Diffusion (AUTOMATIC1111 / Forge / reForge).
 * --api bayragiyla baslatilmis olmali. Tamamen ucretsiz ve sinirsiz.
 */
module.exports = {
  id: 'automatic1111',
  label: 'Yerel Stable Diffusion (AUTOMATIC1111 / Forge)',
  dialect: 'sdxl',
  local: true,
  docs: 'https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API',
  blurb: 'Kendi bilgisayarinda calisir: sifir maliyet, sinirsiz uretim. Referans gorsel varsa img2img ile yuz kilidi uygulanir.',
  supportsReference: true,
  // Listedeki TEK "dogustan hazir" referans destegi: server referans karesini
  // gonderdiginde img2img ucuna gecip init_images'e koyuyor, ek ayar gerekmiyor.
  referenceMode: 'auto',
  cost: 'yerel',
  costNote: 'Kendi bilgisayarinda calisir - sifir maliyet, sinirsiz uretim.',
  pricingUrl: null,
  realism: 'yuksek',
  realismNote: 'Kullandigin modele bagli; fotogercek checkpoint ile bulut seceneklerini yakalar.',
  maxResolution: 'donaniminla sinirli',
  resolutionNote: 'VRAM ne kadarsa o kadar.',
  setup: 'kurulum gerekir',
  setupNote: 'WebUI --api bayragiyla acik olmali.',
  supportsSeed: true,
  supportsNegative: true,
  needs: 'Bilgisayarinda acik WebUI (--api bayragiyla)',
  keyUrl: null,
  fields: [
    {
      key: 'baseUrl',
      label: 'WebUI adresi',
      type: 'text',
      default: 'http://127.0.0.1:7860',
      help: 'WebUI\'yi "--api" bayragiyla baslat: webui-user.bat icinde COMMANDLINE_ARGS=--api',
    },
    { key: 'steps', label: 'Adim sayisi', type: 'number', default: 30 },
    { key: 'cfg', label: 'CFG', type: 'number', default: 5 },
    { key: 'sampler', label: 'Sampler', type: 'text', default: 'DPM++ 2M Karras' },
    {
      key: 'denoising',
      label: 'img2img denoising (referans varken)',
      type: 'number',
      default: 0.6,
      help: '0.4 = referansa cok sadik, 0.75 = daha ozgur. Yuz tutarliligi icin 0.5-0.65 arasi iyi calisir.',
    },
  ],

  async generate({ config, prompt, negative, seed, width, height, count = 1, referenceBase64, engine }) {
    const base = (config.baseUrl || 'http://127.0.0.1:7860').replace(/\/$/, '');

    // Gercekcilik seviyesinin ayarlari kullanicinin elle girdigi degerleri
    // ezmez; kullanici bos biraktiysa seviyeden gelen deger kullanilir.
    const payload = {
      prompt,
      negative_prompt: negative || '',
      seed: seed == null ? -1 : Number(seed),
      steps: Number(config.steps) || (engine && engine.steps) || 30,
      cfg_scale: Number(config.cfg) || (engine && engine.cfg) || 5,
      sampler_name: config.sampler || 'DPM++ 2M Karras',
      width: Number(width) || 832,
      height: Number(height) || 1216,
      batch_size: Math.min(Math.max(count, 1), 4),
      restore_faces: false,
    };

    let endpoint = `${base}/sdapi/v1/txt2img`;
    if (referenceBase64) {
      endpoint = `${base}/sdapi/v1/img2img`;
      payload.init_images = [referenceBase64];
      payload.denoising_strength = Number(config.denoising) || 0.6;
    }

    let res;
    try {
      res = await fetchJson(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (/fetch failed|ECONNREFUSED/i.test(err.message)) {
        throw new Error(`WebUI'ye baglanilamadi (${base}). WebUI acik mi ve "--api" bayragiyla mi basladi?`);
      }
      throw err;
    }

    const list = (res && res.images) || [];
    if (!list.length) throw new Error('WebUI gorsel dondurmedi.');
    return {
      images: list.map((b64) => fromBase64(b64, 'image/png')),
      raw: { endpoint },
    };
  },
};
