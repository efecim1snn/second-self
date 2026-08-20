'use strict';

/**
 * POD TASARIM URETICI (tipografi tabanli)
 *
 * Etsy POD'da en cok satan kategori tipografidir: bir soz, iyi bir dizilim,
 * temiz bir baski. Bunun icin YAPAY ZEKA GEREKMEZ - vektorle daha temiz ve
 * daha keskin cikar, ustelik bedava ve sinirsiz.
 *
 * Cikti: SVG. Sunucu bunu 4500x5400 @300DPI SEFFAF PNG'ye cevirir
 * (baski alani standardi). AI yalnizca illustrasyon isteyen tasarimlarda
 * devreye girer ve o da her zamanki gibi kullanicinin bagladigi API'den gelir.
 */

const LAYOUTS = {
  yigin: {
    label: 'Yigin (satirlar ust uste)',
    hint: 'En cok satan dizilim. Kisa sozler icin.',
  },
  serit: {
    label: 'Serit vurgulu',
    hint: 'Orta satir ters renkte serit icinde.',
  },
  kemer: {
    label: 'Kemer (ust yay)',
    hint: 'Ilk satir yay seklinde kavisli.',
  },
  cerceve: {
    label: 'Cerceveli',
    hint: 'Ince cizgi cerceve icinde, retro his.',
  },
  minimal: {
    label: 'Minimal tek satir',
    hint: 'Tek guclu kelime, genis harf araligi.',
  },
};

const PALETTES = {
  siyah: { label: 'Siyah (acik urun icin)', ink: '#111111', accent: '#111111', contrast: '#FFFFFF' },
  beyaz: { label: 'Beyaz (koyu urun icin)', ink: '#FFFFFF', accent: '#FFFFFF', contrast: '#111111' },
  retro: { label: 'Retro turuncu', ink: '#2B2118', accent: '#D2691E', contrast: '#FFF6E9' },
  toprak: { label: 'Toprak', ink: '#3A2E26', accent: '#8B6F4E', contrast: '#F3E9DD' },
  okyanus: { label: 'Okyanus', ink: '#12303D', accent: '#2E7D93', contrast: '#EAF4F7' },
  pastel: { label: 'Pastel pembe', ink: '#4A2C3A', accent: '#C77D9B', contrast: '#FBEEF3' },
};

const FONTS = {
  kalin: { label: 'Kalin grotesk', family: "'Arial Black','Segoe UI',Impact,sans-serif", weight: 900, spacing: -2 },
  daktilo: { label: 'Daktilo', family: "'Courier New',monospace", weight: 700, spacing: 2 },
  serif: { label: 'Klasik serif', family: "Georgia,'Times New Roman',serif", weight: 700, spacing: 0 },
  elyazisi: { label: 'El yazisi hissi', family: "'Segoe Script','Comic Sans MS',cursive", weight: 700, spacing: 0 },
};

/** POD baski alani olculeri (piksel, 300 DPI). */
const SIZES = {
  tisort: { label: 'Tisort / hoodie', w: 4500, h: 5400 },
  kare: { label: 'Kare (canta, yastik)', w: 4500, h: 4500 },
  kupa: { label: 'Kupa sargisi', w: 2475, h: 1155 },
  poster: { label: 'Poster 2:3', w: 3600, h: 5400 },
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Tasarimi SVG olarak kurar.
 * @param {object} d { lines[], layout, palette, font, size, uppercase }
 */
function toSvg(d) {
  const size = SIZES[d.size] || SIZES.tisort;
  const pal = PALETTES[d.palette] || PALETTES.siyah;
  const font = FONTS[d.font] || FONTS.kalin;
  const layout = LAYOUTS[d.layout] ? d.layout : 'yigin';

  const lines = (d.lines || []).map((l) => String(l || '').trim()).filter(Boolean).slice(0, 5);
  if (!lines.length) lines.push('YOUR TEXT');
  const text = d.uppercase === false ? lines : lines.map((l) => l.toLocaleUpperCase('en-US'));

  // Baski alaninin ic marji - kenara dayanan tasarim baskida kesiliyor.
  const pad = Math.round(size.w * 0.08);
  const boxW = size.w - pad * 2;
  const boxH = size.h - pad * 2;

  // Satir yuksekligi: satir sayisina gore kutuya sigdir.
  const lineGap = 1.12;
  const unit = boxH / (text.length * lineGap);
  // En uzun satiri kutuya sigdiran font boyutu (kabaca 0.58 en/boy orani)
  const longest = Math.max(...text.map((t) => t.length), 1);
  const byWidth = boxW / (longest * 0.58);
  const fontSize = Math.min(unit, byWidth);

  const cx = size.w / 2;
  const totalH = text.length * fontSize * lineGap;
  const startY = (size.h - totalH) / 2 + fontSize * 0.82;

  const common = `font-family="${font.family}" font-weight="${font.weight}" letter-spacing="${font.spacing}" text-anchor="middle"`;
  const parts = [];

  if (layout === 'cerceve') {
    const m = Math.round(pad * 0.55);
    const sw = Math.max(6, Math.round(size.w * 0.006));
    parts.push(`<rect x="${m}" y="${m}" width="${size.w - m * 2}" height="${size.h - m * 2}" fill="none" stroke="${pal.accent}" stroke-width="${sw}"/>`);
    parts.push(`<rect x="${m + sw * 3}" y="${m + sw * 3}" width="${size.w - (m + sw * 3) * 2}" height="${size.h - (m + sw * 3) * 2}" fill="none" stroke="${pal.accent}" stroke-width="${Math.round(sw / 2)}"/>`);
  }

  if (layout === 'kemer' && text.length > 1) {
    const r = boxW * 0.62;
    const arcY = startY + fontSize * 0.2;
    parts.push(`<defs><path id="arc" d="M ${cx - r} ${arcY} A ${r} ${r} 0 0 1 ${cx + r} ${arcY}" fill="none"/></defs>`);
    parts.push(`<text ${common} font-size="${fontSize * 0.72}" fill="${pal.accent}"><textPath href="#arc" startOffset="50%">${esc(text[0])}</textPath></text>`);
    text.slice(1).forEach((line, i) => {
      const y = startY + fontSize * lineGap * (i + 1.15);
      parts.push(`<text x="${cx}" y="${y}" ${common} font-size="${fontSize}" fill="${pal.ink}">${esc(line)}</text>`);
    });
  } else {
    text.forEach((line, i) => {
      const y = startY + fontSize * lineGap * i;
      const isMid = layout === 'serit' && i === Math.floor(text.length / 2);
      if (isMid) {
        // Kalin grotesk buyuk harfler ~0.72em genisliginde; 0.6 ile hesaplayinca
        // serit metni kapsamiyor ve son harf disarida kaliyordu.
        const bw = line.length * fontSize * 0.72 + fontSize * 0.5;
        const bh = fontSize * 1.28;
        parts.push(`<rect x="${cx - bw / 2}" y="${y - fontSize * 0.92}" width="${bw}" height="${bh}" rx="${bh * 0.12}" fill="${pal.accent}"/>`);
        parts.push(`<text x="${cx}" y="${y}" ${common} font-size="${fontSize}" fill="${pal.contrast}">${esc(line)}</text>`);
      } else {
        const fill = (layout === 'minimal' || i === text.length - 1) ? pal.accent : pal.ink;
        parts.push(`<text x="${cx}" y="${y}" ${common} font-size="${fontSize}" fill="${fill}">${esc(line)}</text>`);
      }
    });
  }

  // ARKA PLAN YOK - POD icin seffaf sart.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}">${parts.join('')}</svg>`;
}

function options() {
  return {
    layouts: Object.entries(LAYOUTS).map(([key, v]) => ({ key, ...v })),
    palettes: Object.entries(PALETTES).map(([key, v]) => ({ key, label: v.label })),
    fonts: Object.entries(FONTS).map(([key, v]) => ({ key, label: v.label })),
    sizes: Object.entries(SIZES).map(([key, v]) => ({ key, ...v })),
  };
}

module.exports = { toSvg, options, SIZES, PALETTES, LAYOUTS, FONTS };
