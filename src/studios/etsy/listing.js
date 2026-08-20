'use strict';

/**
 * ETSY LISTELEME METNI
 *
 * Etsy SEO'su baslik + 13 etiket + aciklamada yasiyor. Cogu satici burada
 * kaybediyor. Sifir API, tamamen sablon - ama satisi dogrudan etkiliyor.
 *
 * Etsy sinirlari (dogrulanmasi kolay, degisirse tek yerden guncellenir):
 *   baslik  : 140 karakter
 *   etiket  : 13 adet, her biri en fazla 20 karakter
 */
const LIMITS = { title: 140, tagCount: 13, tagLength: 20 };

const PRODUCT_WORDS = {
  tisort: ['shirt', 'tshirt', 'tee', 'graphic tee'],
  kare: ['tote bag', 'pillow', 'canvas'],
  kupa: ['mug', 'coffee mug', 'cup'],
  poster: ['poster', 'wall art', 'print'],
};

const OCCASIONS = [
  'birthday gift', 'christmas gift', 'gift for her', 'gift for him',
  'mothers day', 'fathers day', 'funny gift', 'gift idea',
];

function clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function trimTo(s, n) {
  const t = clean(s);
  return t.length <= n ? t : t.slice(0, n).replace(/[\s,-]+$/, '');
}

/**
 * @param {object} input
 *   phrase   tasarimdaki ana soz
 *   niche    kategori/tema ("cat lover", "camping", "nurse")
 *   size     urun tipi anahtari
 *   audience hedef ("for women", "for dad")
 *   keywords kullanicinin arastirmadan getirdigi anahtar kelimeler (dizi)
 */
function build(input = {}) {
  const phrase = clean(input.phrase) || 'Custom Design';
  const niche = clean(input.niche);
  const audience = clean(input.audience);
  const product = (PRODUCT_WORDS[input.size] || PRODUCT_WORDS.tisort);
  const extra = (input.keywords || []).map(clean).filter(Boolean);

  // BASLIK: onemli kelime basta - Etsy aramasi ilk kelimelere agirlik veriyor.
  const titleBits = [
    phrase,
    niche ? `${niche} ${product[0]}` : product[0],
    audience,
    'Gift',
  ].filter(Boolean);
  const title = trimTo(titleBits.join(', '), LIMITS.title);

  // ETIKETLER: 13 adet, her biri 20 karakter. Tekrar eden yok.
  const pool = [
    niche && `${niche} ${product[1] || product[0]}`,
    niche && `${niche} gift`,
    niche,
    ...extra,
    ...product,
    audience && `${product[0]} ${audience}`,
    ...OCCASIONS,
    'trending now',
    'unique design',
  ].filter(Boolean);

  const seen = new Set();
  const tags = [];
  for (const raw of pool) {
    const tag = trimTo(String(raw).toLowerCase(), LIMITS.tagLength);
    if (!tag || tag.length < 3 || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length === LIMITS.tagCount) break;
  }

  const description = [
    `${phrase}`,
    '',
    niche ? `Designed for ${niche} lovers${audience ? ` ${audience}` : ''}.` : 'An original design.',
    '',
    'WHAT YOU GET',
    '- High resolution print-ready file (300 DPI)',
    '- Transparent background PNG',
    '- Ready for direct-to-garment and print-on-demand',
    '',
    'NOTE',
    'Colours may vary slightly between screens and printed products.',
    'This is an original design created by us.',
  ].join('\n');

  return {
    title,
    titleLength: title.length,
    tags,
    tagCount: tags.length,
    description,
    limits: LIMITS,
    warnings: [
      tags.length < LIMITS.tagCount
        ? `Yalnizca ${tags.length}/13 etiket uretildi - arastirmadan birkac anahtar kelime daha ekle.`
        : null,
      title.length < 60 ? 'Baslik kisa; Etsy uzun ve tanimlayici basliklari odullendiriyor.' : null,
    ].filter(Boolean),
  };
}

module.exports = { build, LIMITS };
