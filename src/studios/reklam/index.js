'use strict';

/**
 * REKLAM / GRAFIK TASARIM STUDYOSU
 *
 * Sosyal medya reklam, kampanya, duyuru ve etkinlik gorselleri.
 * Tamamen yerel ve bedava calisir - AI gerekmez, cunku bu is tipografi
 * ve dizilim isidir. AI modelleri yaziyi duzgun yazamiyor; vektorle
 * hem keskin cikar hem metin okunakli olur.
 */

const store = require('../../store');
const design = require('./design');
const raster = require('../../raster');

module.exports = {
  id: 'reklam',
  label: 'Reklam / Grafik Tasarim',
  icon: '📣',
  tagline: 'Sosyal medya reklami, kampanya ve duyuru gorselleri. Tamamen bedava, AI gerekmez.',
  needsProvider: false,
  tabs: [
    { id: 'tasarim', label: 'Tasarim' },
    { id: 'arsiv', label: 'Arsiv' },
  ],

  routes: {
    'GET /secenekler': async () => ({
      ...design.options(),
      pngHazir: raster.available(),
    }),

    'POST /onizleme': async (body) => ({
      svg: design.toSvg(body.design || {}),
      size: design.SIZES[(body.design || {}).size] || design.SIZES.ig_post,
    }),

    'POST /uret': async (body) => {
      const d = body.design || {};
      const size = design.SIZES[d.size] || design.SIZES.ig_post;
      const svg = design.toSvg(d);

      let buffer;
      try {
        // Reklam gorselleri OPAK olmali - seffaf PNG sosyal medyada siyah cikar.
        buffer = await raster.svgToPng(svg, size.w, size.h, { background: '#ffffff' });
      } catch (err) {
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
        studio: 'reklam',
        category: `Reklam · ${size.label} · ${size.w}x${size.h}`,
        design: d,
        isGolden: false,
      };
      store.addGalleryItem(item);
      return { image: item, size };
    },
  },
};
