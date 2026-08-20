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
  // Replicate ile ayni durum: referans alani bos ise sessizce gonderilmiyor.
  // Ustelik varsayilan model (fal-ai/flux/dev) saf text-to-image, referans
  // girdisi hic yok - varsayilan kurulumda yuz kilidi CALISMAZ.
  referenceMode: 'needs-config',
  referenceReady: (config) => !!String((config && config.referenceField) || '').trim(),
  referenceNotReadyReason: 'Modelin referans girdisinin adi girilmemis, bu yuzden referans kare GONDERILMIYOR - yuz her karede kayar.',
  referenceFixHint: 'Ayarlar > fal.ai > "Referans gorsel alani" kutusuna modelin girdi adini yaz (cogunlukla image_url). Varsayilan fal-ai/flux/dev referans KABUL ETMEZ; redux veya ip-adapter destekleyen bir model yolu sec.',
  cost: 'kredili',
  costNote: 'Istek basina faturalanir.',
  pricingUrl: 'https://fal.ai/pricing',
  realism: 'yuksek',
  realismNote: 'FLUX ailesi icin hizli ve senkron calisir.',
  maxResolution: 'modele gore degisir',
  resolutionNote: 'Serbest olcu kabul eder.',
  setup: 'anahtar + model yolu',
  setupNote: 'Yuz kilidi icin referans destekleyen bir model + alan adi gerekir.',
  supportsSeed: true,
  supportsNegative: true,
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

  /**
   * Model yolundan referans alani ONERISI. fal'in sema ucu guvenilir
   * olmadigi icin burada kesif yok, yalnizca oneri var.
   */
  referenceGuess(model = '') {
    const m = String(model).toLowerCase();
    if (/redux/.test(m)) return { key: 'image_url', why: 'FLUX Redux referansi image_url ile alir.', confidence: 'yuksek' };
    if (/ip[-_]?adapter|instant/.test(m)) return { key: 'image_url', why: 'IP-Adapter / InstantID modelleri image_url bekler.', confidence: 'yuksek' };
    if (/image[-_]?to[-_]?image|img2img|kontext/.test(m)) return { key: 'image_url', why: 'Gorsel-den-gorsel uclari image_url kullanir.', confidence: 'yuksek' };
    if (/flux\/(dev|schnell)|flux-pro/.test(m)) {
      return {
        key: null,
        why: 'Bu model saf text-to-image - referans girdisi YOK. Yuz kilidi icin redux veya ip-adapter destekleyen bir model yolu sec.',
        confidence: 'uyari',
      };
    }
    return { key: 'image_url', why: 'fal.ai\'de en yaygin ad. Model sayfasindaki API ornegiyle dogrula.', confidence: 'dusuk' };
  },

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
