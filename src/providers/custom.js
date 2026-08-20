'use strict';

const { fetchJson, fetchBinary, downloadImage, fromBase64, sleep, dig, fill, fillJsonTemplate } = require('./helpers');

/**
 * OZEL API - evrensel baglanti noktasi.
 *
 * Listede olmayan her platform icin: Higgsfield, Midjourney proxy'leri,
 * Ideogram, Recraft, Runware, kendi sunucun... Ne kullaniyorsan onun
 * dokumanindaki istek/yanit sekli buraya girilir, otomasyon o adrese
 * prompt'u gonderir ve donen gorseli kaydeder.
 */
module.exports = {
  id: 'custom',
  label: 'Ozel API (Higgsfield, Ideogram, Runware, kendi sunucun...)',
  dialect: 'generic',
  dialectOverridable: true,
  docs: null,
  blurb: 'Listede olmayan HER platform icin. Dokumanindaki adres, baslik ve govde sablonunu gir; otomasyon prompt\'u oraya gonderip donen gorseli kaydeder.',
  supportsReference: true,
  // Govde sablonunda {{reference}} yazdiysan referans gonderilir.
  referenceMode: 'needs-config',
  referenceReady: (config) => /\{\{\s*reference\s*\}\}/.test(String((config && config.body) || '')),
  referenceNotReadyReason: 'Govde sablonunda {{reference}} gecmiyor, bu yuzden referans kare gonderilmiyor.',
  referenceFixHint: 'Govde sablonunda platformun referans alanina {{reference}} yaz. Ornek: "image": "{{reference}}"',
  cost: 'degisir',
  costNote: 'Bagladigin platforma bagli.',
  pricingUrl: null,
  realism: 'degisir',
  realismNote: 'Bagladigin platforma bagli.',
  maxResolution: 'degisir',
  resolutionNote: '',
  setup: 'ileri duzey',
  setupNote: 'URL, baslik ve govde sablonu elle yazilir.',
  supportsSeed: true,
  supportsNegative: true,
  needs: 'Platformun uc nokta adresi + anahtari',
  keyUrl: null,
  fields: [
    {
      key: 'url',
      label: 'Istek adresi (URL)',
      type: 'text',
      required: true,
      help: 'Platformun gorsel uretim uc noktasi. Ornek: https://api.ornek.com/v1/generate',
    },
    {
      key: 'method',
      label: 'Metot',
      type: 'select',
      options: ['POST', 'PUT', 'GET'],
      default: 'POST',
    },
    {
      key: 'headers',
      label: 'Basliklar (JSON)',
      type: 'textarea',
      secret: true,
      default: '{\n  "content-type": "application/json",\n  "Authorization": "Bearer BURAYA_ANAHTARIN"\n}',
      help: 'Platformun istedigi kimlik dogrulama basligi. Anahtarin sadece bu bilgisayarda kalir; panelde maskelenerek gosterilir.',
    },
    {
      key: 'body',
      label: 'Govde sablonu (JSON)',
      type: 'textarea',
      default: '{\n  "prompt": "{{prompt}}",\n  "negative_prompt": "{{negative}}",\n  "seed": {{seed}},\n  "width": {{width}},\n  "height": {{height}}\n}',
      help: 'Degiskenler: {{prompt}} {{negative}} {{seed}} {{width}} {{height}} {{aspect}} {{reference}}. Platform hangi alan adlarini istiyorsa onlari kullan.',
    },
    {
      key: 'resultType',
      label: 'Yanit tipi',
      type: 'select',
      options: ['url', 'base64', 'binary', 'async'],
      default: 'url',
      help: 'url = JSON icinde gorsel linki | base64 = JSON icinde base64 | binary = dogrudan gorsel dosyasi | async = once is kimligi doner, sonra sorulur',
    },
    {
      key: 'resultPath',
      label: 'Yanit icindeki yol',
      type: 'text',
      default: 'images[0].url',
      help: 'Ornek: images[0].url  ·  data[0].b64_json  ·  output[0]. binary secildiyse bos birak.',
    },
    {
      key: 'pollUrl',
      label: 'Durum sorgu adresi (sadece async)',
      type: 'text',
      default: '',
      help: 'Ornek: https://api.ornek.com/v1/jobs/{{id}} - {{id}} ilk yanittan alinir.',
    },
    {
      key: 'pollIdPath',
      label: 'Is kimliginin yolu (sadece async)',
      type: 'text',
      default: 'id',
    },
    {
      key: 'pollResultPath',
      label: 'Sonuc gorselinin yolu (sadece async)',
      type: 'text',
      default: 'result.images[0].url',
    },
    {
      key: 'dialect',
      label: 'Prompt dili',
      type: 'select',
      options: ['generic', 'midjourney', 'leonardo', 'sdxl', 'flux', 'dalle', 'higgsfield'],
      default: 'generic',
      help: 'Bagladigin platform hangi tarz prompt seviyorsa onu sec. Bilmiyorsan "generic" birak.',
    },
  ],

  async generate({ config, prompt, negative, seed, width, height, aspectRatio, referenceDataUri }) {
    // Sablon referans istiyor ama gonderilecek kare yoksa SESSIZCE bos string
    // gonderme - istek "basarili" doner ve kullanici yuz kilidinin calistigini
    // sanir. Acikca soyle.
    if (/\{\{\s*reference\s*\}\}/.test(String(config.body || '')) && !referenceDataUri) {
      throw new Error(
        'Govde sablonun {{reference}} istiyor ama gonderilecek referans kare yok. ' +
        'Once "Vesikalik seti" sekmesinden en az "Onden" karesini uret.'
      );
    }
    if (!config.url) throw new Error('Ozel API adresi girilmemis.');

    const vars = {
      prompt,
      negative: negative || '',
      seed: seed == null ? 0 : Number(seed),
      width: Number(width) || 832,
      height: Number(height) || 1216,
      aspect: aspectRatio || '4:5',
      // Sablon {{reference}} istiyorsa ama referans yoksa BOS STRING GONDERME:
      // cogu API bos string'e 400 doner ya da sessizce yok sayar, kullanici da
      // yuz kilidinin calistigini sanir.
      reference: referenceDataUri || '',
    };

    let headers = { 'content-type': 'application/json' };
    if (config.headers) {
      headers = { ...headers, ...fillJsonTemplate(config.headers, vars, 'Basliklar') };
    }

    const method = (config.method || 'POST').toUpperCase();
    let bodyString;
    if (method !== 'GET' && config.body) {
      bodyString = JSON.stringify(fillJsonTemplate(config.body, vars, 'Govde sablonu'));
    }

    const url = fill(config.url, vars);
    const type = config.resultType || 'url';

    if (type === 'binary') {
      const buffer = await fetchBinary(url, { method, headers, body: bodyString });
      return { images: [{ buffer, mime: 'image/png' }], raw: {} };
    }

    const res = await fetchJson(url, { method, headers, body: bodyString });

    if (type === 'async') {
      const id = dig(res, config.pollIdPath || 'id');
      if (!id) throw new Error(`Yanitta is kimligi bulunamadi ("${config.pollIdPath}"): ${JSON.stringify(res).slice(0, 300)}`);
      if (!config.pollUrl) throw new Error('async secildi ama durum sorgu adresi bos.');

      for (let attempt = 0; attempt < 90; attempt++) {
        await sleep(attempt === 0 ? 4000 : 3000);
        const status = await fetchJson(fill(config.pollUrl, { ...vars, id }), { headers });
        const value = dig(status, config.pollResultPath || 'result.images[0].url');
        if (value) return { images: [await toImage(value)], raw: { id } };
        const state = String(dig(status, 'status') || '').toLowerCase();
        if (['failed', 'error', 'canceled', 'cancelled'].includes(state)) {
          throw new Error(`Platform uretimi basarisiz bildirdi: ${JSON.stringify(status).slice(0, 300)}`);
        }
      }
      throw new Error('Ozel API uretimi zaman asimina ugradi.');
    }

    const value = dig(res, config.resultPath);
    const list = Array.isArray(value) ? value : [value];
    const images = [];
    for (const item of list) {
      if (!item) continue;
      images.push(await toImage(item, type));
    }
    if (!images.length) {
      throw new Error(
        `Yanitta gorsel bulunamadi. "Yanit icindeki yol" alanini kontrol et ("${config.resultPath}"). ` +
        `Gelen yanit: ${JSON.stringify(res).slice(0, 400)}`
      );
    }
    return { images, raw: {} };
  },
};

async function toImage(value, type) {
  if (typeof value === 'object' && value) {
    if (value.url) return downloadImage(value.url);
    if (value.b64_json || value.base64) return fromBase64(value.b64_json || value.base64);
    throw new Error(`Gorsel degeri anlasilamadi: ${JSON.stringify(value).slice(0, 200)}`);
  }
  const str = String(value);
  if (type === 'base64' || (!str.startsWith('http') && str.length > 200)) return fromBase64(str);
  return downloadImage(str);
}
