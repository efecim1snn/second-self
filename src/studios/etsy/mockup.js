'use strict';

/**
 * LISTELEME GORSELI (MOCKUP)
 *
 * NEDEN VAR: Etsy'de satan sey listeleme FOTOGRAFIDIR. Arac bugune kadar
 * yalnizca baskiya hazir seffaf PNG uretiyordu - o dosya baskiciya gider,
 * alicinin gordugu sey degildir. Mockup olmadan listeleme satmaz.
 *
 * ---------------------------------------------------------------------------
 * STOK GORSEL YOK - HER SEY VEKTOR
 *
 * Degismez kural: bu otomasyon stok gorsel icermez. Hazir tisort fotografi
 * indirip koymuyoruz. Urun VEKTORLE ciziliyor - tipki Etsy tasarimlarinin
 * kendisi gibi. Kumas kivrimi ve gercek fotograf dokusu yok; sade, temiz,
 * "urun katalogu" gorunumu var.
 *
 * DURUSTLUK: bu bir fotograf DEGILDIR ve oyleymis gibi sunulmaz. Panelde ve
 * bilgi.txt'te "vektor mockup" diye gecer. Gercek fotograf isteyen satici
 * urunu basip cekmeli - ya da POD saglayicisinin kendi mockup uretecini
 * kullanmali (Printful/Printify bunu ucretsiz veriyor).
 * ---------------------------------------------------------------------------
 *
 * Cikti: 2000x2000 kare - Etsy listeleme gorselleri icin onerilen olcu.
 */

const design = require('./design');

/** Etsy listeleme gorseli olcusu. */
const BOYUT = 2000;

/**
 * URUN RENKLERI
 * POD'da en cok satan gomlek renkleri. Zemin rengi tasarimin paletini
 * belirliyor: acik urunde koyu baski, koyu urunde acik baski.
 */
const RENKLER = {
  siyah: { label: 'Siyah', kumas: '#1a1a1a', golge: '#000000', isik: '#333333', zemin: '#f2f0ec' },
  beyaz: { label: 'Beyaz', kumas: '#f7f7f5', golge: '#d8d6d0', isik: '#ffffff', zemin: '#eceae4' },
  gri: { label: 'Gri melanj', kumas: '#a8a8a4', golge: '#8a8a86', isik: '#c2c2be', zemin: '#f2f0ec' },
  lacivert: { label: 'Lacivert', kumas: '#20293c', golge: '#141a28', isik: '#333d54', zemin: '#f2f0ec' },
  bej: { label: 'Bej', kumas: '#d9cdb8', golge: '#bfb29b', isik: '#e8dfd0', zemin: '#f4f2ee' },
  yesil: { label: 'Koyu yesil', kumas: '#24382e', golge: '#16241d', isik: '#375044', zemin: '#f2f0ec' },
};

/* ------------------------------------------------------------- cizimler */

/**
 * Tisort silueti.
 * Tek bir yol (path) ile govde + omuz + kol. Bilerek sade: kumas kivrimi
 * cizmeye calismak vektorde "ucuz 3D" gorunumu veriyor.
 */
function tisortYolu(cx, ust, gen, boy) {
  const yariGen = gen / 2;
  // ORANLAR: ilk denemede govde 595x1320 cikti (2.2:1) - gercek tisort
  // bu kadar dar-uzun degil, ~1.2:1 civari. Kol genisligi dusuruldu,
  // boy kisaltildi.
  const omuz = boy * 0.15;
  const kolGen = gen * 0.185;
  const kolBoy = boy * 0.34;
  const yakaGen = gen * 0.20;
  const yakaDerin = boy * 0.085;

  return [
    // sol omuzdan basla
    `M ${cx - yariGen + kolGen} ${ust + omuz * 0.3}`,
    // sol yaka
    `C ${cx - yakaGen * 0.9} ${ust} ${cx - yakaGen * 0.55} ${ust} ${cx - yakaGen / 2} ${ust + yakaDerin * 0.15}`,
    `C ${cx - yakaGen * 0.2} ${ust + yakaDerin} ${cx + yakaGen * 0.2} ${ust + yakaDerin} ${cx + yakaGen / 2} ${ust + yakaDerin * 0.15}`,
    `C ${cx + yakaGen * 0.55} ${ust} ${cx + yakaGen * 0.9} ${ust} ${cx + yariGen - kolGen} ${ust + omuz * 0.3}`,
    // sag kol
    `L ${cx + yariGen} ${ust + omuz + kolBoy * 0.15}`,
    `L ${cx + yariGen - kolGen * 0.42} ${ust + omuz + kolBoy}`,
    `L ${cx + yariGen - kolGen * 0.92} ${ust + omuz + kolBoy * 0.72}`,
    // sag govde
    `L ${cx + yariGen - kolGen} ${ust + boy}`,
    // alt
    `L ${cx - yariGen + kolGen} ${ust + boy}`,
    // sol govde
    `L ${cx - yariGen + kolGen * 0.92} ${ust + omuz + kolBoy * 0.72}`,
    `L ${cx - yariGen + kolGen * 0.42} ${ust + omuz + kolBoy}`,
    `L ${cx - yariGen} ${ust + omuz + kolBoy * 0.15}`,
    'Z',
  ].join(' ');
}

/** Kupa: govde + kulp. */
function kupaParcalari(cx, cy, gen, boy) {
  const x = cx - gen / 2;
  const y = cy - boy / 2;
  return {
    govde: `M ${x} ${y} L ${x + gen} ${y} L ${x + gen * 0.94} ${y + boy} L ${x + gen * 0.06} ${y + boy} Z`,
    kulp: `M ${x + gen} ${y + boy * 0.24} `
      + `C ${x + gen * 1.42} ${y + boy * 0.2} ${x + gen * 1.42} ${y + boy * 0.72} ${x + gen * 0.97} ${y + boy * 0.68}`,
    agiz: { cx, cy: y, rx: gen / 2, ry: gen * 0.075 },
  };
}

/* ------------------------------------------------------------- kontrast */

/**
 * KONTRAST KILIDI
 *
 * Ilk surumde varsayilan kombinasyon siyah baskiyi siyah tisortun uzerine
 * koyuyordu: WCAG bagil parlaklik orani 1.08 - yani tasarim fiilen GORUNMUYOR.
 * Satici hicbir sey degistirmeden "uret" derse Etsy'ye bos bir siyah tisort
 * yukluyor ve nedenini anlamiyor, cunku tasarim onizlemesi dogru gorunuyordu.
 *
 * Artik urun rengiyle baski rengi karsilastiriliyor; kontrast dusukse baski
 * paleti otomatik ters cevriliyor ve BU DURUM BILDIRILIYOR (sessizce
 * duzeltmek de yanlis olurdu - kullanici neyi degistirdigimizi bilmeli).
 */

/** WCAG bagil parlaklik (0 = siyah, 1 = beyaz). */
function parlaklik(hex) {
  const m = String(hex).replace('#', '');
  const tam = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(tam, 16);
  const kanal = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * kanal[0] + 0.7152 * kanal[1] + 0.0722 * kanal[2];
}

/** WCAG kontrast orani (1 = ayni renk, 21 = siyah/beyaz). */
function kontrast(a, b) {
  const l1 = parlaklik(a);
  const l2 = parlaklik(b);
  const [ust, alt] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (ust + 0.05) / (alt + 0.05);
}

/** Bu urun rengi icin uygun baski paleti. */
const KOYU_URUN_PALETI = 'beyaz';
const ACIK_URUN_PALETI = 'siyah';
const ESIK = 3.0;   // altinda tasarim urunun uzerinde okunmuyor

/**
 * Tasarimin baski rengi bu urun renginin uzerinde okunuyor mu?
 * Okunmuyorsa duzeltilmis paleti ve sebebini dondurur.
 */
function paletKontrol(d, renkAnahtar) {
  const renk = RENKLER[renkAnahtar] || RENKLER.siyah;
  const pal = design.PALETTES[d.palette] || design.PALETTES.siyah;
  const oran = kontrast(pal.ink, renk.kumas);

  if (oran >= ESIK) {
    return { uygun: true, oran: Math.round(oran * 100) / 100, palette: d.palette, mesaj: null };
  }

  const yeni = parlaklik(renk.kumas) < 0.35 ? KOYU_URUN_PALETI : ACIK_URUN_PALETI;
  const yeniOran = kontrast((design.PALETTES[yeni] || {}).ink, renk.kumas);
  return {
    uygun: false,
    oran: Math.round(oran * 100) / 100,
    palette: yeni,
    mesaj: `${renk.label} urunde "${pal.label}" baski okunmuyor (kontrast ${oran.toFixed(2)}:1). `
      + `Baski rengi "${(design.PALETTES[yeni] || {}).label}" olarak degistirildi (${yeniOran.toFixed(2)}:1).`,
  };
}

/** Mockup icin deterministik id - ayni girdi ayni SVG. */
function idFor(d, urun, renk) {
  const kaynak = JSON.stringify([d.lines, d.layout, d.font, d.palette, d.size, urun, renk]);
  let h = 2166136261;
  for (let i = 0; i < kaynak.length; i++) {
    h ^= kaynak.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/* ------------------------------------------------------------- mockuplar */

/**
 * Bir tasarimi urunun uzerine yerlestirilmis olarak cizer.
 *
 * @param {object} d       tasarim (design.toSvg'ye giden nesne)
 * @param {object} options { urun: 'tisort'|'kupa'|'poster'|'canta', renk }
 */
function toSvg(d, options = {}) {
  const urun = ['tisort', 'kupa', 'poster', 'canta'].includes(options.urun) ? options.urun : 'tisort';
  const renk = RENKLER[options.renk] || RENKLER.siyah;
  const B = BOYUT;
  const p = [];

  // KONTRAST: baski urunun uzerinde okunmuyorsa palet duzeltilir.
  const kont = paletKontrol(d, options.renk);
  const tasarim = kont.uygun ? d : { ...d, palette: kont.palette };

  /* ID CAKISMASI
   * Ayni sayfada birden fazla mockup gosterilince (varyant seridi, dort
   * urun yan yana) hepsi `id="kumas"` paylasiyordu ve `url(#kumas)`
   * belgedeki ILK tanima baglaniyordu - dort urun de birincinin rengini
   * aliyordu. Beyaz kupa siyah cikiyordu. design.js'te ayni sinif hatayi
   * yay id'sinde gormustuk; burada da id tasarimdan turetiliyor.
   */
  const kimlik = idFor(d, urun, options.renk);
  const zeminId = `zm-${kimlik}`;
  const kumasId = `km-${kimlik}`;

  p.push(`<defs>
    <linearGradient id="${zeminId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${renk.zemin}"/>
      <stop offset="100%" stop-color="${golgele(renk.zemin, -6)}"/>
    </linearGradient>
    <linearGradient id="${kumasId}" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="${renk.isik}"/>
      <stop offset="45%" stop-color="${renk.kumas}"/>
      <stop offset="100%" stop-color="${renk.golge}"/>
    </linearGradient>
  </defs>`);
  p.push(`<rect width="${B}" height="${B}" fill="url(#${zeminId})"/>`);

  // Tasarimin SVG'si ic ice yerlestiriliyor: SVG bunu destekliyor, nested
  // <svg> kendi viewBox'iyla verilen kutuya olceklenir.
  const tasarimSvg = design.toSvg(tasarim);
  const govdesi = tasarimSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const olcu = design.SIZES[tasarim.size] || design.SIZES.tisort;
  const ic = (x, y, w, h) => `<svg x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}"`
    + ` viewBox="0 0 ${olcu.w} ${olcu.h}" preserveAspectRatio="xMidYMid meet">${govdesi}</svg>`;

  if (urun === 'tisort') {
    const gen = B * 0.68;
    const boy = B * 0.52;
    const ust = B * 0.21;
    p.push(`<path d="${tisortYolu(B / 2, ust, gen, boy)}" fill="url(#${kumasId})"/>`);
    // Yaka bandi - siluetin tanindik olmasini saglayan tek detay.
    p.push(`<path d="M ${B / 2 - gen * 0.11} ${ust + boy * 0.02} C ${B / 2 - gen * 0.05} ${ust + boy * 0.085} ${B / 2 + gen * 0.05} ${ust + boy * 0.085} ${B / 2 + gen * 0.11} ${ust + boy * 0.02}"
      fill="none" stroke="${renk.golge}" stroke-width="${B * 0.006}" opacity="0.6"/>`);
    // Baski alani: gogus ortasi, gercek POD yerlesimine yakin oran.
    const bw = gen * 0.40;
    const bh = bw * (olcu.h / olcu.w);
    p.push(ic(B / 2 - bw / 2, ust + boy * 0.26, bw, Math.min(bh, boy * 0.60)));
  } else if (urun === 'kupa') {
    const gen = B * 0.46;
    const boy = B * 0.42;
    const k = kupaParcalari(B / 2 - gen * 0.08, B / 2, gen, boy);
    p.push(`<path d="${k.kulp}" fill="none" stroke="${golgele(renk.kumas, renk.kumas === RENKLER.beyaz.kumas ? -12 : 8)}" stroke-width="${B * 0.035}" stroke-linecap="round"/>`);
    p.push(`<path d="${k.govde}" fill="url(#${kumasId})"/>`);
    p.push(`<ellipse cx="${k.agiz.cx}" cy="${k.agiz.cy}" rx="${k.agiz.rx}" ry="${k.agiz.ry}" fill="${golgele(renk.kumas, -18)}"/>`);
    const bw = gen * 0.74;
    const bh = bw * (olcu.h / olcu.w);
    p.push(ic(k.agiz.cx - bw / 2, B / 2 - bh / 2, bw, bh));
  } else if (urun === 'poster') {
    const gen = B * 0.5;
    const boy = gen * (olcu.h / olcu.w);
    const x = B / 2 - gen / 2;
    const y = B / 2 - boy / 2;
    // Cerceve + kagit. Golge posteri duvardan ayiriyor.
    p.push(`<rect x="${(x - B * 0.018).toFixed(0)}" y="${(y - B * 0.018).toFixed(0)}"
      width="${(gen + B * 0.036).toFixed(0)}" height="${(boy + B * 0.036).toFixed(0)}"
      fill="${renk.kumas}"/>`);
    p.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${gen.toFixed(0)}" height="${boy.toFixed(0)}" fill="#ffffff"/>`);
    p.push(ic(x + gen * 0.06, y + boy * 0.06, gen * 0.88, boy * 0.88));
  } else if (urun === 'canta') {
    const gen = B * 0.5;
    const boy = B * 0.54;
    const x = B / 2 - gen / 2;
    const y = B * 0.28;
    // Sap
    p.push(`<path d="M ${x + gen * 0.22} ${y} C ${x + gen * 0.26} ${y - B * 0.13} ${x + gen * 0.74} ${y - B * 0.13} ${x + gen * 0.78} ${y}"
      fill="none" stroke="${renk.kumas}" stroke-width="${B * 0.018}"/>`);
    p.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${gen.toFixed(0)}" height="${boy.toFixed(0)}" rx="${(B * 0.008).toFixed(0)}" fill="url(#${kumasId})"/>`);
    const bw = gen * 0.66;
    const bh = bw * (olcu.h / olcu.w);
    p.push(ic(B / 2 - bw / 2, y + boy * 0.16, bw, Math.min(bh, boy * 0.66)));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">${p.join('')}</svg>`;
}

/** Rengi koyulastirir/acar (yuzde). Hex bekler. */
function golgele(hex, yuzde) {
  const m = String(hex).replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
  const kanal = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const y = Math.round(v + (255 * yuzde) / 100);
    return Math.max(0, Math.min(255, y));
  });
  return `#${kanal.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * toSvg ile ayni ciktiyi verir ama YAPILAN DUZELTMEYI de dondurur.
 * Panel/rota bunu kullanip kullaniciya soyluyor.
 */
function build(d, options = {}) {
  const kont = paletKontrol(d, options.renk);
  return { svg: toSvg(d, options), kontrast: kont };
}

function urunler() {
  return [
    { key: 'tisort', label: 'Tisort' },
    { key: 'canta', label: 'Canta (tote)' },
    { key: 'kupa', label: 'Kupa' },
    { key: 'poster', label: 'Poster (cerceveli)' },
  ];
}

function renkler() {
  return Object.entries(RENKLER).map(([key, v]) => ({ key, label: v.label, kumas: v.kumas }));
}

module.exports = { toSvg, build, kontrast, paletKontrol, urunler, renkler, RENKLER, BOYUT, ESIK };
