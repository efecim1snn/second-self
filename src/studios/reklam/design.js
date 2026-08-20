'use strict';

/**
 * REKLAM / GRAFIK TASARIM URETICI
 *
 * Ayni mekanik (SVG -> PNG, bedava, yerel), farkli islev: sosyal medya
 * reklam ve duyuru gorselleri.
 *
 * AI GEREKMEZ. Bu tur gorseller tipografi ve dizilim isidir; vektorle
 * hem daha keskin cikar hem metin okunakli olur - AI modelleri yaziyi
 * duzgun yazamiyor. Arka plan gorseli isteyen kullanici, her zamanki gibi
 * kendi bagladigi API'den uretip buraya koyar.
 */

/** Sosyal medya olculeri (piksel). */
const SIZES = {
  ig_post: { label: 'Instagram gonderi (4:5)', w: 1080, h: 1350 },
  ig_kare: { label: 'Instagram kare (1:1)', w: 1080, h: 1080 },
  ig_story: { label: 'Story / Reels kapak (9:16)', w: 1080, h: 1920 },
  x_post: { label: 'X / Twitter (16:9)', w: 1600, h: 900 },
  yt_kapak: { label: 'YouTube kapak (16:9)', w: 1280, h: 720 },
  banner: { label: 'Link/banner (1.91:1)', w: 1200, h: 628 },
};

const THEMES = {
  gece: { label: 'Gece', bg: '#0F1220', ink: '#FFFFFF', dim: '#A9B0C7', accent: '#7C5CFF', on: '#FFFFFF' },
  bordo: { label: 'Bordo & altin', bg: '#F7F1E8', ink: '#7A2233', dim: '#6B5B4B', accent: '#C6A15E', on: '#3A2418' },
  temiz: { label: 'Temiz beyaz', bg: '#FFFFFF', ink: '#141414', dim: '#6B6B6B', accent: '#E5484D', on: '#FFFFFF' },
  okyanus: { label: 'Okyanus', bg: '#0B2B36', ink: '#EAF6F9', dim: '#9BC2CC', accent: '#37B3C9', on: '#04222B' },
  toprak: { label: 'Toprak', bg: '#F1E7DA', ink: '#3B2C1F', dim: '#7A6552', accent: '#B4703B', on: '#FFF6EC' },
  neon: { label: 'Neon', bg: '#101014', ink: '#FFFFFF', dim: '#9A9AA8', accent: '#C6FF3D', on: '#101014' },
};

const LAYOUTS = {
  kampanya: { label: 'Kampanya / indirim', hint: 'Buyuk oran, kisa vaat, net cagri.' },
  urun: { label: 'Urun tanitimi', hint: 'Baslik + aciklama + fiyat + cagri.' },
  duyuru: { label: 'Duyuru', hint: 'Tek guclu mesaj, sade.' },
  etkinlik: { label: 'Etkinlik', hint: 'Tarih, saat, yer one cikar.' },
  alinti: { label: 'Alinti / soz', hint: 'Buyuk tirnak, imza satiri.' },
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Metni kutuya sigacak sekilde satirlara boler. */
function wrap(text, maxChars) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) { lines.push(cur); cur = w; } else { cur = next; }
  }
  if (cur) lines.push(cur);
  return lines;
}

const FONT = "'Segoe UI',system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif";

/**
 * @param {object} d
 *   layout, theme, size
 *   brand      ust kose marka adi
 *   headline   ana baslik
 *   sub        alt metin
 *   badge      kampanya orani / etiket ("%40", "YENI")
 *   cta        cagri butonu metni
 *   footer     alt satir (site, tarih, adres)
 */
function toSvg(d = {}) {
  const size = SIZES[d.size] || SIZES.ig_post;
  const t = THEMES[d.theme] || THEMES.gece;
  const layout = LAYOUTS[d.layout] ? d.layout : 'kampanya';
  const W = size.w, H = size.h;
  const pad = Math.round(Math.min(W, H) * 0.085);
  const boxW = W - pad * 2;

  // Yatay formatlarda dikeye gore daha kucuk tipografi gerekiyor.
  const base = Math.min(W, H);
  const p = [];
  p.push(`<rect width="${W}" height="${H}" fill="${t.bg}"/>`);
  // Kose vurgusu
  p.push(`<rect x="0" y="0" width="${Math.round(W * 0.018)}" height="${H}" fill="${t.accent}"/>`);

  let y = pad + base * 0.05;
  const T = (txt, opts) => {
    const o = opts || {};
    p.push(`<text x="${o.x != null ? o.x : pad + base * 0.03}" y="${o.y}" font-family="${FONT}" font-size="${o.size}" font-weight="${o.weight || 700}" fill="${o.fill || t.ink}" letter-spacing="${o.ls || 0}" ${o.anchor ? `text-anchor="${o.anchor}"` : ''}>${esc(txt)}</text>`);
  };

  if (d.brand) {
    T(String(d.brand).toLocaleUpperCase('tr-TR'), { y, size: base * 0.032, weight: 700, fill: t.dim, ls: base * 0.006 });
    y += base * 0.06;
  }

  if (layout === 'kampanya' && d.badge) {
    const s = base * 0.26;
    T(d.badge, { y: y + s * 0.78, size: s, weight: 900, fill: t.accent, ls: -s * 0.03 });
    y += s * 0.95;
  }

  if (layout === 'alinti') {
    T('“', { y: y + base * 0.14, size: base * 0.26, weight: 900, fill: t.accent });
    y += base * 0.1;
  }

  if (d.headline) {
    const hs = layout === 'kampanya' ? base * 0.085 : (layout === 'alinti' ? base * 0.075 : base * 0.095);
    const perLine = Math.max(8, Math.floor(boxW / (hs * 0.5)));
    for (const line of wrap(d.headline, perLine).slice(0, 4)) {
      y += hs * 1.06;
      T(line, { y, size: hs, weight: 800, ls: -hs * 0.02 });
    }
    y += base * 0.03;
  }

  if (d.sub) {
    const ss = base * 0.042;
    const perLine = Math.max(14, Math.floor(boxW / (ss * 0.5)));
    for (const line of wrap(d.sub, perLine).slice(0, 4)) {
      y += ss * 1.35;
      T(line, { y, size: ss, weight: 400, fill: t.dim });
    }
  }

  if (layout === 'etkinlik' && d.footer) {
    y += base * 0.09;
    const es2 = base * 0.05;
    p.push(`<rect x="${pad + base * 0.03}" y="${y - es2}" width="${base * 0.012}" height="${es2 * 1.5}" fill="${t.accent}"/>`);
    T(d.footer, { x: pad + base * 0.075, y: y + es2 * 0.2, size: es2, weight: 700 });
  }

  // Cagri butonu - en altta sabit
  if (d.cta) {
    const bh = base * 0.115;
    const bw = Math.min(boxW, String(d.cta).length * bh * 0.52 + bh * 1.1);
    const by = H - pad - bh - (d.footer && layout !== 'etkinlik' ? base * 0.075 : 0);
    p.push(`<rect x="${pad + base * 0.03}" y="${by}" width="${bw}" height="${bh}" rx="${bh / 2}" fill="${t.accent}"/>`);
    p.push(`<text x="${pad + base * 0.03 + bw / 2}" y="${by + bh * 0.66}" font-family="${FONT}" font-size="${bh * 0.38}" font-weight="800" fill="${t.on}" text-anchor="middle">${esc(d.cta)}</text>`);
  }

  if (d.footer && layout !== 'etkinlik') {
    T(d.footer, { y: H - pad + base * 0.005, size: base * 0.032, weight: 600, fill: t.dim });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${p.join('')}</svg>`;
}

function options() {
  return {
    layouts: Object.entries(LAYOUTS).map(([key, v]) => ({ key, ...v })),
    themes: Object.entries(THEMES).map(([key, v]) => ({ key, label: v.label })),
    sizes: Object.entries(SIZES).map(([key, v]) => ({ key, ...v })),
  };
}

module.exports = { toSvg, options, SIZES, THEMES, LAYOUTS };
