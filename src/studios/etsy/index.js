'use strict';

/**
 * ETSY POD STUDYOSU
 *
 * Ayni mekanik, farkli islev: karakter yerine baskiya hazir tasarim uretir.
 *
 * KURAL (karakter studyosundakiyle ayni ruh): baskasinin tasarimini kopyalamaz.
 * Arastirmadan gelen sey KATEGORI ve ANAHTAR KELIMEDIR; tasarim burada
 * sifirdan kurulur. "Kedili komik tisort satiyor" bilgisi kullanilir,
 * o kisinin cizimi kullanilmaz.
 *
 * Tipografi tasarimlari tamamen YEREL ve BEDAVA uretilir (vektor -> seffaf
 * PNG). Illustrasyon isteyen tasarimlar icin, her zamanki gibi kullanicinin
 * bagladigi gorsel uretim API'si devreye girer.
 */

const store = require('../../store');
const output = require('../../output');
const design = require('./design');
const listing = require('./listing');
const niches = require('./niches');
const pazar = require('./pazar');
const render = require('../../raster');

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

module.exports = {
  id: 'etsy',
  label: 'Etsy POD',
  icon: '🎨',
  tagline: 'Baskiya hazir tasarim + Etsy listeleme metni. Tipografi tarafi tamamen bedava.',
  needsProvider: false,
  tabs: [
    { id: 'tasarim', label: 'Tasarim' },
    { id: 'listeleme', label: 'Listeleme metni' },
    { id: 'pazar', label: 'Pazar arastirmasi' },
    { id: 'arsiv', label: 'Arsiv' },
  ],

  routes: {
    'GET /secenekler': async () => ({
      ...design.options(),
      pngHazir: render.available(),
      pngNotu: render.available()
        ? 'PNG uretimi hazir (sistemdeki tarayici kullaniliyor, ek kurulum yok).'
        : 'Sistemde Chrome/Edge bulunamadi. SVG indirip kendi aracinda PNG\'ye cevirebilirsin.',
    }),

    // Onizleme: SVG dondurur, hizli ve bedava.
    'POST /onizleme': async (body) => {
      const svg = design.toSvg(body.design || {});
      return { svg, size: design.SIZES[(body.design || {}).size] || design.SIZES.tisort };
    },

    // Baskiya hazir seffaf PNG.
    'POST /uret': async (body) => {
      const d = body.design || {};
      const size = design.SIZES[d.size] || design.SIZES.tisort;
      const svg = design.toSvg(d);

      let buffer;
      try {
        buffer = await render.svgToPng(svg, size.w, size.h);
      } catch (err) {
        // PNG uretilemezse tasarimi KAYBETME - SVG'yi geri ver.
        const e = new Error(`${err.message} (Tasarim kaybolmadi, SVG olarak indirebilirsin.)`);
        e.status = 503;
        e.payload = { svg, size };
        throw e;
      }

      const file = store.saveImageBuffer(buffer, 'png');
      const listeleme = body.listing ? listing.build(body.listing) : null;
      const item = {
        id: file.id,
        filename: file.filename,
        url: file.url,
        createdAt: new Date().toISOString(),
        studio: 'etsy',
        category: `POD · ${size.label} · ${size.w}x${size.h}`,
        design: d,
        listing: listeleme,
        isGolden: false,
      };
      store.addGalleryItem(item);

      // Masaustunde bu tasarima ait kendi klasoru.
      let job = null;
      try {
        // Tasarim metni `lines` dizisinde geliyor (STUDIO_FORMS.etsy.fields).
        const ilkSatir = Array.isArray(d.lines) ? d.lines.find(Boolean) : d.lines;
        job = output.createJobFolder({ studio: 'etsy', title: ilkSatir || 'tasarim' });
        if (job) {
          output.writeImage(job, buffer, { index: 1, ext: 'png', label: size.label });
          output.writeText(job, 'bilgi.txt', [
            'SECOND SELF - is ozeti',
            '======================', '',
            `Tarih  : ${new Date().toLocaleString('tr-TR')}`,
            'Studyo : Etsy POD',
            `Olcu   : ${size.w}x${size.h} @300DPI (${size.label})`,
            'Zemin  : seffaf PNG',
          ].join('\n'));
          if (listeleme) {
            output.writeText(job, 'etsy-listeleme.txt', [
              'ETSY LISTELEME METNI',
              '====================', '',
              `BASLIK (${(listeleme.title || '').length}/140)`,
              '-------',
              listeleme.title || '', '',
              `ETIKETLER (${(listeleme.tags || []).length}/13)`,
              '----------',
              (listeleme.tags || []).join(', '), '',
              'ACIKLAMA',
              '--------',
              listeleme.description || '',
            ].join('\n'));
          }
        }
      } catch (err) {
        console.error('[cikti] Etsy klasoru yazilamadi:', err.message);
      }

      return { image: item, size, dpi: 300, transparent: true, export: job ? { name: job.name, path: job.path } : null };
    },

    /* ------------------------------------------------- nis kutuphanesi */

    /**
     * ANAHTAR GEREKTIRMEZ. Nis kutuphanesi ve soz kaliplari araca gomulu -
     * kullanicinin hicbir sey baglamasina gerek yok.
     */
    'GET /nisler': async () => ({
      nisler: niches.list(),
      not: 'Bu liste araca gomulu; anahtar gerektirmez. Canli pazar verisi icin "Pazar arastirmasi" sekmesine bak.',
    }),

    'POST /nis/oneriler': async (body) => {
      const nis = body.nis || '';
      if (!nis) throw badRequest('Once bir nis sec veya yaz.');
      return {
        nis: niches.resolve(nis),
        etiketler: niches.expandTags(nis, body.urunKelimeleri, body.hedef, body.ekstra),
        sozler: niches.suggestPhrases(nis, body.rol, body.yil),
      };
    },

    /* ----------------------------------------------- canli pazar (opsiyonel) */

    /**
     * Anahtar KULLANICININ. Otomasyonun kendi Etsy anahtari yoktur ve
     * olmayacak: public bir depoda paylasilan anahtar ilk gunde calinir ve
     * Etsy tarafindan kapatilir. Herkes kendi anahtarini baglar - gorsel
     * uretim saglayicilarindaki duzenin aynisi.
     */
    'GET /pazar/durum': async () => {
      const cfg = pazar.getConfig();
      return {
        hazir: cfg.hazir,
        anahtar: pazar.maskedKey(),
        siralama: pazar.SORT,
        kurulum: {
          baslik: 'Etsy API anahtarini kendin aliyorsun - ucretsiz',
          neden: 'Bu otomasyonun kendi Etsy anahtari YOKTUR. Public bir depoda paylasilan anahtar herkesin eline gecer ve Etsy tarafindan kapatilir. Bu yuzden herkes kendi anahtarini baglar; gorsel uretim saglayicilarinda da duzen aynidir.',
          adimlar: [
            'Etsy hesabinla giris yap (satici hesabi sart degil, normal hesap yeter).',
            'etsy.com/developers/register adresine git ve "Create a New App" de.',
            'Uygulamaya bir ad ver (ornek: "kendi magaza arastirmam") ve ne yapacagini kisaca yaz.',
            'API kullanim sartlarini kabul et.',
            'Onaydan sonra sana bir "Keystring" verilir - API anahtarin odur.',
            'O anahtari asagidaki kutuya yapistir ve Kaydet de.',
          ],
          notlar: [
            'Anahtar yalnizca bu bilgisayarda data/etsy-api.json icinde durur; hicbir yere gonderilmez.',
            'Yeni uygulamalar once kisisel/test kipinde baslar. Bazi uc noktalar Etsy onayi isteyebilir; anahtar reddedilirse panel bunu acikca soyler.',
            'Etsy hiz siniri uygular. Arka planda surekli tarama YAPILMAZ - yalnizca sen "Arastir" dedigin an istek gider.',
          ],
          kayitUrl: 'https://www.etsy.com/developers/register',
          dokumanUrl: 'https://developers.etsy.com/documentation/',
        },
      };
    },

    'POST /pazar/anahtar': async (body) => {
      pazar.saveConfig({ apiKey: body.apiKey });
      return { hazir: pazar.getConfig().hazir, anahtar: pazar.maskedKey() };
    },

    'POST /pazar/arastir': async (body) => {
      const kelimeler = String(body.keywords || '').trim();
      if (!kelimeler) throw badRequest('Aranacak nis veya anahtar kelime yaz.');
      return pazar.research({
        keywords: kelimeler,
        limit: body.limit,
        sayfa: body.sayfa,
        sortOn: body.sortOn,
        sortOrder: body.sortOrder,
        minPrice: body.minPrice,
        maxPrice: body.maxPrice,
      });
    },

    'POST /listeleme': async (body) => {
      const built = listing.build(body.listing || {});
      if (!built.title) throw badRequest('Once tasarimdaki sozu gir.');
      return built;
    },
  },
};
