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
  // Referans GERCEKTEN gonderilir, ama yalnizca "Referans gorsel alani"
  // doldurulmussa. Bos birakilirsa istek referanssiz gider ve BASARILI doner -
  // kullanici yuz kilidini actigini sanir. Bu yuzden 'needs-config'.
  referenceMode: 'needs-config',
  referenceReady: (config) => !!String((config && config.referenceField) || '').trim(),
  referenceNotReadyReason: 'Modelin referans girdisinin adi girilmemis, bu yuzden referans kare GONDERILMIYOR - yuz her karede kayar.',
  referenceFixHint: 'Ayarlar > Replicate > "Referans gorsel alani" kutusuna modelin girdi adini yaz (ornek: image, redux_image, ip_adapter_image). Model sayfasindaki API sekmesinde yazar.',
  cost: 'kredili',
  costNote: 'Saniye basina faturalanir, model secimine gore degisir.',
  pricingUrl: 'https://replicate.com/pricing',
  realism: 'yuksek',
  realismNote: 'FLUX ve SDXL ailesinin tamami calisir; fotogerceklik icin listedeki en guclu bulut secenegi.',
  maxResolution: 'modele gore degisir',
  resolutionNote: 'Serbest olcu kabul eder (16\'nin kati).',
  setup: 'anahtar + model adi',
  setupNote: 'Yuz kilidi icin ayrica referans alan adi gerekir.',
  supportsSeed: true,
  supportsNegative: true,
  needs: 'API anahtari (model adi hazir geliyor)',
  keyUrl: 'https://replicate.com/account/api-tokens',
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

  /**
   * Modelin GERCEK girdi semasindan referans gorsel alani adaylarini bulur.
   * Tahmin degil: Replicate'in kendi OpenAPI semasi okunur.
   */
  async discoverReferenceFields({ config }) {
    if (!config.apiKey) throw new Error('Replicate API Token girilmemis.');
    const model = (config.model || 'black-forest-labs/flux-dev').trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(model)) {
      throw new Error('Model "owner/name" formatinda olmali.');
    }

    const info = await fetchJson(`https://api.replicate.com/v1/models/${model}`, {
      headers: { 'authorization': `Bearer ${config.apiKey}` },
    }, 30000);

    const props = (((info || {}).latest_version || {}).openapi_schema || {})
      .components?.schemas?.Input?.properties || {};

    const aday = [];
    for (const [ad, tanim] of Object.entries(props)) {
      if (!tanim || typeof tanim !== 'object') continue;
      // Referans gorsel girdileri Replicate'te her zaman string + format:uri.
      if (tanim.type === 'string' && tanim.format === 'uri') {
        aday.push({ key: ad, title: tanim.title || ad, description: tanim.description || '' });
      }
    }
    return aday;
  },

  /**
   * Model adindan referans alani ONERISI. Yalnizca oneri - hicbir zaman
   * kendiliginden uygulanmaz, kullanici "Kutuya yaz" derse input'a yazilir.
   */
  referenceGuess(model = '') {
    const m = String(model).toLowerCase();
    const tablo = [
      { test: /redux/, key: 'redux_image', why: 'FLUX Redux modelleri referansi redux_image ile alir.' },
      { test: /ip[-_]?adapter/, key: 'ip_adapter_image', why: 'IP-Adapter modelleri ip_adapter_image bekler.' },
      { test: /instant[-_]?id/, key: 'image', why: 'InstantID yuz karesini image ile alir.' },
      { test: /photomaker/, key: 'input_image', why: 'PhotoMaker input_image bekler.' },
      { test: /flux.*(kontext|fill|depth|canny)/, key: 'input_image', why: 'FLUX kontrol modelleri input_image bekler.' },
      { test: /sdxl|stable-diffusion/, key: 'image', why: 'SDXL img2img girdisi image adini kullanir.' },
    ];
    for (const satir of tablo) {
      if (satir.test.test(m)) return { key: satir.key, why: satir.why, confidence: 'yuksek' };
    }
    if (/flux-(dev|schnell|pro)/.test(m)) {
      return {
        key: null,
        why: 'Bu model saf text-to-image gorunuyor - referans girdisi olmayabilir. Redux veya IP-Adapter destekleyen bir modele gecmen gerekebilir.',
        confidence: 'uyari',
      };
    }
    return { key: 'image', why: 'En yaygin ad. "Modelin alanlarini bul" ile kesinlestirebilirsin.', confidence: 'dusuk' };
  },

  async generate({ config, prompt, negative, seed, width, height, count = 1, referenceDataUri, engine }) {
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

    // Gercekcilik seviyesinin motor ayarlari. FLUX ailesi guidance,
    // SDXL ailesi guidance_scale bekliyor - ikisini de gonderiyoruz,
    // model tanimadigi alani yok sayar.
    if (engine) {
      if (engine.guidance != null) {
        input.guidance = engine.guidance;
        input.guidance_scale = engine.guidance;
      }
      if (engine.steps != null) {
        input.num_inference_steps = engine.steps;
      }
    }
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
