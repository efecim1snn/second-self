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
const design = require('./design');
const listing = require('./listing');
const render = require('./render');

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

module.exports = {
  id: 'etsy',
  label: 'Etsy POD Studyosu',
  icon: '🎨',
  tagline: 'Baskiya hazir tasarim + Etsy listeleme metni. Tipografi tarafi tamamen bedava.',
  needsProvider: false,
  tabs: [
    { id: 'tasarim', label: 'Tasarim' },
    { id: 'listeleme', label: 'Listeleme metni' },
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
      const item = {
        id: file.id,
        filename: file.filename,
        url: file.url,
        createdAt: new Date().toISOString(),
        studio: 'etsy',
        category: `POD · ${size.label} · ${size.w}x${size.h}`,
        design: d,
        listing: body.listing ? listing.build(body.listing) : null,
        isGolden: false,
      };
      store.addGalleryItem(item);
      return { image: item, size, dpi: 300, transparent: true };
    },

    'POST /listeleme': async (body) => {
      const built = listing.build(body.listing || {});
      if (!built.title) throw badRequest('Once tasarimdaki sozu gir.');
      return built;
    },
  },
};
