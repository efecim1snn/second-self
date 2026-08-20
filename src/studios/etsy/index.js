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
        job = output.createJobFolder({ studio: 'etsy', title: d.line1 || d.word || 'tasarim' });
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

    'POST /listeleme': async (body) => {
      const built = listing.build(body.listing || {});
      if (!built.title) throw badRequest('Once tasarimdaki sozu gir.');
      return built;
    },
  },
};
