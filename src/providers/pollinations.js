'use strict';

const { fetchBinary, sleep } = require('./helpers');

/**
 * POLLINATIONS.AI - ucretsiz, API anahtari GEREKTIRMEYEN saglayici.
 *
 * Otomasyonun kutudan cikar cikmaz calismasi icin varsayilan olarak bunu
 * seciyoruz: yeni baslayan hicbir sey ayarlamadan ilk gorselini alabilsin.
 * Yine de gorseli ureten BU YAZILIM DEGIL, disaridaki bu ucretsiz servistir.
 *
 * Sinirlar: kuyruk olabilir, yogun saatlerde yavaslar, kalite tavani ucretli
 * platformlardan dusuktur. Ciddi ise binince kendi API'ni baglaman beklenir.
 */
module.exports = {
  id: 'pollinations',
  label: 'Pollinations.ai (UCRETSIZ - anahtar gerekmez)',
  dialect: 'flux',
  docs: 'https://github.com/pollinations/pollinations/blob/master/APIDOCS.md',
  blurb: 'Ucretsiz ve API anahtari istemez - kurulumdan hemen sonra calisir. AMA: su an yalnizca "sana" modelini sunuyor. SANA hiz icin damitilmis bir model; cilt gozenegi, ince tuy ve gercek deri dokusu uretemez. Kompozisyon/mekan/poz denemek icin iyidir, FOTOGRAF GERCEKCILIGI icin yetersizdir. Ultra gercekci sonuc istiyorsan Replicate, fal.ai veya yerel Stable Diffusion bagla.',
  supportsReference: false,
  // --- referans gorsel (tek dogruluk kaynagi: providers/index.js referenceState) ---
  referenceMode: 'none',
  // --- karsilastirma tablosu alanlari ---
  cost: 'bedava',
  costNote: 'Anahtar istemez, kredi saymaz, sinir yok.',
  pricingUrl: null,
  realism: 'dusuk',
  realismNote: 'Su an yalnizca damitilmis "sana" modelini sunuyor; cilt gozenegi ve deri dokusu uretemez. Bu prompt ile duzelmez, modelin sinirdir.',
  maxResolution: '686x858',
  resolutionNote: 'Istenen olcuyu YOK SAYIYOR - 3072 istesen de 686x858 donuyor. Instagram 1080 istedigi icin buyutme sart.',
  setup: 'yok',
  setupNote: 'Kutudan cikar cikmaz calisir.',
  supportsSeed: true,
  supportsNegative: false,
  needs: 'Hicbir sey - ucretsiz, anahtar istemez',
  keyUrl: null,
  fields: [
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      default: 'sana',
      help: 'Pollinations su an tek model sunuyor: "sana". Guncel listeyi https://image.pollinations.ai/models adresinden gorebilirsin; yeni bir model eklerlerse adini buraya yaz.',
    },
    {
      key: 'nologo',
      label: 'Logoyu kaldir',
      type: 'boolean',
      default: true,
    },
    {
      key: 'enhance',
      label: 'Prompt zenginlestirme (kapali onerilir)',
      type: 'boolean',
      default: false,
      help: 'Acikken servis prompt\'u kendisi yeniden yazar - bu, kilitli kimligi bozar ve karakter tutarliligini dusurur. KAPALI birak.',
    },
  ],

  async generate({ config, prompt, seed, width, height }) {
    const params = new URLSearchParams({
      width: String(Math.round(Number(width) || 864)),
      height: String(Math.round(Number(height) || 1080)),
      model: config.model || 'sana',
      nologo: config.nologo === false ? 'false' : 'true',
      enhance: config.enhance ? 'true' : 'false',
      private: 'true',
      safe: 'true',
    });
    if (seed != null) params.set('seed', String(seed));

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;

    // Ucretsiz servis duzensiz 500 donuyor (yuk / hiz siniri). Uzunluk veya
    // prompt ile ilgisi yok - ayni istek birkac saniye sonra basariyla
    // donebiliyor. O yuzden artan bekleme ile birkac kez deneniyor.
    let buffer;
    let lastError;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) await sleep(attempt * 6000);
      try {
        buffer = await fetchBinary(url, {
          headers: { 'accept': 'image/*', 'user-agent': 'ai-influencer-otomasyon' },
        }, 240000);
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (/fetch failed|ENOTFOUND|ETIMEDOUT/i.test(err.message)) {
          throw new Error('Pollinations\'a ulasilamadi. Internet baglantini kontrol et.');
        }
        if (!/HTTP 5\d\d|HTTP 429/.test(err.message)) throw err;
      }
    }

    if (lastError) {
      throw new Error(
        'Pollinations 5 denemede de yanit vermedi. Ucretsiz servis yogun oldugunda ' +
        'boyle olur - birkac dakika sonra tekrar dene, ya da Ayarlar\'dan kendi ' +
        'API\'ni bagla (kesintisiz ve daha kaliteli olur).'
      );
    }

    if (!buffer || buffer.length < 1000) {
      throw new Error('Pollinations gecerli bir gorsel dondurmedi. Tekrar dene veya modeli degistir.');
    }

    // JPEG mi PNG mi oldugunu ilk baytlardan anla.
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
    return {
      images: [{ buffer, mime: isJpeg ? 'image/jpeg' : 'image/png' }],
      raw: { model: config.model || 'sana' },
    };
  },
};
