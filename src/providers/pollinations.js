'use strict';

const { fetchBinary } = require('./helpers');

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
  blurb: 'Ucretsiz ve API anahtari istemez - kurulumdan hemen sonra calisir. FLUX modeli, seed destegi var. Yogun saatlerde yavaslayabilir; kalite tavani ucretli platformlardan dusuktur.',
  supportsReference: false,
  fields: [
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      options: ['flux', 'turbo'],
      default: 'flux',
      help: 'flux = daha gercekci ve yavas · turbo = daha hizli ve daha stilize. Portre icin flux.',
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
      model: config.model || 'flux',
      nologo: config.nologo === false ? 'false' : 'true',
      enhance: config.enhance ? 'true' : 'false',
      private: 'true',
      safe: 'true',
    });
    if (seed != null) params.set('seed', String(seed));

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;

    let buffer;
    try {
      buffer = await fetchBinary(url, {
        headers: { 'accept': 'image/*', 'user-agent': 'ai-influencer-otomasyon' },
      }, 240000);
    } catch (err) {
      if (/HTTP 5\d\d/.test(err.message)) {
        throw new Error('Pollinations su an mesgul veya hata dondurdu. Birkac saniye sonra tekrar dene. (Ucretsiz servis, yogun saatlerde kuyruga girer.)');
      }
      if (/fetch failed|ENOTFOUND|ETIMEDOUT/i.test(err.message)) {
        throw new Error('Pollinations\'a ulasilamadi. Internet baglantini kontrol et.');
      }
      throw err;
    }

    if (!buffer || buffer.length < 1000) {
      throw new Error('Pollinations gecerli bir gorsel dondurmedi. Tekrar dene veya modeli degistir.');
    }

    // JPEG mi PNG mi oldugunu ilk baytlardan anla.
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
    return {
      images: [{ buffer, mime: isJpeg ? 'image/jpeg' : 'image/png' }],
      raw: { model: config.model || 'flux' },
    };
  },
};
