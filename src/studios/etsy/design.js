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
  blok: {
    label: 'Blok (satirlar esit genislikte)',
    hint: 'POD tipografisinin klasigi: her satir ayni genisligi doldurur. Olculmus harf genisligi olmadan kurulamaz.',
  },
  kontur: {
    label: 'Kontur (ici bos)',
    hint: 'Yalnizca dis cizgi. Koyu urunde ince ve pahali durur.',
  },
  rozet: {
    label: 'Rozet (dairesel)',
    hint: 'Ust yay + alt yay + ortada satir. Kulup/est. tarzi tasarimlar icin.',
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

/**
 * DIKKAT: `spacing` (letter-spacing) KALDIRILDI.
 * SVG'de letter-spacing kullanici birimidir, em degil. 4500px tuvalde
 * punto ~1600 iken +-2 birim em'in %0.12'si eder - yani dort fontta da
 * fiilen SIFIRDI, sadece olcumu bozuyordu. Gercek harf araligi istenirse
 * em'e bagli olarak yeniden eklenmeli ve glifler.js olcumune katilmali.
 */
const FONTS = {
  kalin: { label: 'Kalin grotesk', family: "'Arial Black','Segoe UI',Impact,sans-serif", weight: 900 },
  daktilo: { label: 'Daktilo', family: "'Courier New',monospace", weight: 700 },
  serif: { label: 'Klasik serif', family: "Georgia,'Times New Roman',serif", weight: 700 },
  elyazisi: { label: 'El yazisi hissi', family: "'Segoe Script','Comic Sans MS',cursive", weight: 700 },
};

/**
 * POD BASKI ALANI OLCULERI
 *
 * Hepsi 300 DPI'da INC olcusunden turetildi ve etikette inc karsiligi yaziyor -
 * boylece kendi saglayicinin urun sayfasindaki baski alaniyla karsilastirabilirsin.
 *
 * ONEMLI: gercek baski alani SAGLAYICIYA ve URUNE gore degisir. Printful ve
 * Printify kendi urun sayfalarinda kesin olcuyu veriyor; buradakiler yaygin
 * standartlardir, kesin dogru degil. Uretmeden once dogrula.
 *
 * DPI notu (saglayici dokumanlarindan): kagit urunler, kupa, telefon kilifi ve
 * sticker 300 DPI ister; DTG (dogrudan kumasa baski) 150 DPI'da da kabul eder;
 * battaniye/tayt gibi buyuk formatlar 120-150 DPI ile calisir.
 */
const SIZES = {
  tisort: { label: 'Tisort / hoodie on (15x18")', w: 4500, h: 5400 },
  gogus: { label: 'Sol gogus (4x4")', w: 1200, h: 1200 },
  hoodieArka: { label: 'Hoodie arka (12x16")', w: 3600, h: 4800 },
  kare: { label: 'Kare - canta, yastik (15x15")', w: 4500, h: 4500 },
  kupa: { label: 'Kupa sargisi (8.25x3.85")', w: 2475, h: 1155 },
  sticker: { label: 'Sticker (3x3")', w: 900, h: 900 },
  telefon: { label: 'Telefon kilifi (3x6")', w: 900, h: 1800 },
  poster: { label: 'Poster 12x18"', w: 3600, h: 5400 },
  posterBuyuk: { label: 'Poster 18x24"', w: 5400, h: 7200 },
};

/** Toplu uretimde varsayilan olarak uretilen dort urun. */
const TOPLU_VARSAYILAN = ['tisort', 'kare', 'kupa', 'poster'];

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const glifler = require('./glifler');
const { VARSAYILAN } = glifler;

/**
 * METNIN GENISLIGI - TAHMIN DEGIL, OLCUM
 *
 * Eskiden burada tek bir sabit vardi: `longest * 0.58`. Yani "bir harf
 * puntonun %58'i kadar yer kaplar" varsayiliyordu. Olculdu, hicbir yazi
 * tipinde dogru degil:
 *   daktilo 0.600 sabit · kalin 0.389-1.000 (M=0.944)
 *   serif   0.446-1.127 (M=1.023) · elyazisi 0.311-1.013
 *
 * 0.58 en dar gercek durumdan bile dusuktu; program her seferinde
 * gerekenden BUYUK punto secip harfleri baski alaninin disina tasiriyordu.
 * "MOM" kalin/tisortte iki yandan 702'ser piksel kesiliyordu.
 *
 * @returns {number} em cinsinden toplam ilerleme genisligi
 */
function widthEm(text, fontKey) {
  // Sistemde olculmus tablo varsa O kullanilir; yoksa gomulu yedek.
  const hepsi = glifler.tablo();
  const tablo = hepsi[fontKey] || hepsi.kalin || {};
  const yedek = VARSAYILAN[fontKey] || 0.75;
  let toplam = 0;
  for (const ch of String(text || '')) {
    toplam += (tablo[ch] != null ? tablo[ch] : yedek);
  }
  return toplam || 0.1;
}

/**
 * Tasarimi SVG olarak kurar.
 * @param {object} d { lines[], layout, palette, font, size, uppercase }
 */
/**
 * Ayni sayfada birden fazla tasarim gosterildiginde SVG id'leri carpisir:
 * her yay `id="arc"` kullaniyordu ve `href="#arc"` belgedeki ILK yaya
 * baglaniyordu - yani ikinci tasarimin metni birincinin yayini takip
 * ediyordu. Panelde bugun tek tasarim gosterildigi icin gorunmuyordu;
 * varyant seridi eklenince aninda bozulurdu.
 *
 * Id tasarimdan DETERMINISTIK turetiliyor: ayni girdi ayni SVG'yi verir.
 */
function idFor(d, size) {
  const kaynak = JSON.stringify([d.lines, d.layout, d.font, d.palette, d.size, size.w, size.h]);
  let h = 2166136261;
  for (let i = 0; i < kaynak.length; i++) {
    h ^= kaynak.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function toSvg(d) {
  const size = SIZES[d.size] || SIZES.tisort;
  const pal = PALETTES[d.palette] || PALETTES.siyah;
  const fontKey = FONTS[d.font] ? d.font : 'kalin';
  const font = FONTS[fontKey];
  const layout = LAYOUTS[d.layout] ? d.layout : 'yigin';

  const lines = (d.lines || []).map((l) => String(l || '').trim()).filter(Boolean).slice(0, 5);
  if (!lines.length) lines.push('YOUR TEXT');
  const text = d.uppercase === false ? lines : lines.map((l) => l.toLocaleUpperCase('en-US'));

  /* ------------------------------------------------------- guvenli alan
   * Marj artik YATAY ve DIKEY ayri hesaplaniyor. Eskiden ikisi de
   * genisligin %8'iydi: kupada (2475x1155) dikey marj %17'ye ciktigi icin
   * baski alaninin yarisi bos kaliyor, posterde ise %5.3'e dusup kenara
   * fazla yaklasiyordu. Ayni sabit hem cok kucuk hem cok buyuk uretiyordu.
   */
  const padX = Math.round(size.w * 0.08);
  const padY = Math.round(size.h * 0.08);

  /* GLIF TASMASI PAYI
   * widthEm ILERLEME genisligini (advance width) toplar - yatayda dogru olcu
   * budur. Ama harflerin gorsel siniri (bbox) bundan biraz tasar: serifin
   * kuyruklari, el yazisinin kavisleri yan bosluklarin disina cikar; dikeyde
   * de cikinti ve alt uzanti satir yuksekliginden buyuk olabilir.
   * Olculdu: bu tasma en kotu durumda kutunun ~%6'si. Kullanilabilir alani
   * o kadar kisiyoruz - boylece yazi guvenli marjin ICINDE kaliyor.
   */
  const TASMA_PAYI = 0.92;
  const boxW = (size.w - padX * 2) * TASMA_PAYI;
  const boxH = (size.h - padY * 2) * TASMA_PAYI;

  const lineGap = 1.12;
  const unit = boxH / (text.length * lineGap);
  // Kutuya sigan en buyuk punto: en genis SATIR belirler (harf sayisi degil).
  // Harf araligi metni genisletir; punto secilirken hesaba katilmali.
  const arayaEk = (t) => (layout === 'minimal' ? Math.max(String(t).length - 1, 0) * 0.18 : 0);
  const enGenisEm = Math.max(...text.map((t) => widthEm(t, fontKey) + arayaEk(t)));
  // SERIT dizilimi metnin iki yanina 0.25em dolgu koyuyor; punto secilirken
  // bu hesaba katilmazsa bant guvenli alani asiyor, bant kirpilinca da metin
  // bandin disinda kaliyordu.
  const dolguEm = layout === 'serit' ? 0.5 : 0;
  const byWidth = boxW / (enGenisEm + dolguEm);
  const fontSize = Math.min(unit, byWidth);

  const cx = size.w / 2;
  const totalH = text.length * fontSize * lineGap;
  const startY = (size.h - totalH) / 2 + fontSize * 0.82;

  /* HARF ARALIGI (B2)
   * Eskiden `letter-spacing="-2"` gibi KULLANICI BIRIMI yaziliyordu; 4500px
   * tuvalde punto ~1600 iken 2 birim em'in binde biri eder - dort yazi
   * tipinde de fiilen sifirdi. Ustelik "minimal" dizilimin ipucu "genis harf
   * araligi" vaat ediyordu ama kod harf araligina hic dokunmuyordu.
   * Artik aralik EM'e bagli ve genislik hesabina da katiliyor.
   */
  const araliktEm = layout === 'minimal' ? 0.18 : (font.trackingEm || 0);
  const arayaz = araliktEm ? ` letter-spacing="${(araliktEm * fontSize).toFixed(1)}"` : '';
  const common = `font-family="${font.family}" font-weight="${font.weight}" text-anchor="middle"${arayaz}`;
  const parts = [];

  if (layout === 'cerceve') {
    // Cerceve guvenli alanin DISINDA, kenarla marj arasinda duruyor.
    // Eskiden marjin %55'ine oturuyordu, yani kodun kendi guvenli alaninin
    // yarisini yiyordu; kesimde bir kenar otekinden kalin cikiyordu.
    const m = Math.round(Math.min(padX, padY) * 0.45);
    const sw = Math.max(6, Math.round(size.w * 0.006));
    parts.push(`<rect x="${m}" y="${m}" width="${size.w - m * 2}" height="${size.h - m * 2}" fill="none" stroke="${pal.accent}" stroke-width="${sw}"/>`);
    parts.push(`<rect x="${m + sw * 3}" y="${m + sw * 3}" width="${size.w - (m + sw * 3) * 2}" height="${size.h - (m + sw * 3) * 2}" fill="none" stroke="${pal.accent}" stroke-width="${Math.round(sw / 2)}"/>`);
  }

  if (layout === 'kemer' && text.length > 1) {
    /* ------------------------------------------------------------- KEMER
     * Eskiden yay yarim cemberdi (r = boxW * 0.62) ve tepe noktasi hicbir
     * yerde tuvalle karsilastirilmiyordu: olculdu, yay metninin tepesi
     * tuvalin 291 piksel YUKARISINDA kaliyor ve PNG'de tamamen kesiliyordu.
     *
     * Artik yay KIRISINDEN kuruluyor: kiris = guvenli genislik, sisme
     * (sagitta) kontrollu. r = (c^2/4 + h^2) / 2h. Boylece hem sig ve
     * dogal duruyor hem tepe noktasi hesaplanabiliyor.
     */
    const ilkEm = widthEm(text[0], fontKey);
    const kalanSayi = text.length - 1;

    /* Kupa gibi GENIS VE ALCAK tuvallerde (2475x1155) sabit bir sisme
     * dikey butceyi tek basina yiyordu ve yay tuvalin disina tasiyordu.
     * Cozum: sisme, punto ve kalan satirlar birlikte guvenli alana sigana
     * kadar kucult. Olculmus genisliklerle calistigi icin dongu birkac
     * adimda kapaniyor ve tarayici hic calismiyor.
     */
    let c = boxW;
    let h = Math.min(boxW * 0.12, boxH * 0.22);
    let r = (c * c / 4 + h * h) / (2 * h);
    let yayUzunlugu = 2 * r * Math.asin(Math.min(c / (2 * r), 1));
    let arcFont = Math.min(fontSize * 0.72, yayUzunlugu / ilkEm);
    // Olculdu: yay uzerindeki buyuk harflerin bbox tepesi, punto x 1.0 payla bile
    // guvenli marji 27-37px deliyordu; 1.18 ile tam iceri giriyor.
    let arcBaseY = padY + h + arcFont * 1.18;

    for (let adim = 0; adim < 24; adim++) {
      // Yayin altinda kalan satirlara ve alt marja yer kaliyor mu?
      const gereken = arcBaseY + kalanSayi * Math.min(fontSize, arcFont) * lineGap;
      if (gereken <= size.h - padY) break;
      h *= 0.88;
      c *= 0.96;
      r = (c * c / 4 + h * h) / (2 * h);
      yayUzunlugu = 2 * r * Math.asin(Math.min(c / (2 * r), 1));
      arcFont = Math.min(arcFont * 0.88, yayUzunlugu / ilkEm);
      arcBaseY = padY + h + arcFont * 1.18;
    }

    const yayId = `arc-${idFor(d, size)}`;
    parts.push(`<defs><path id="${yayId}" d="M ${(cx - c / 2).toFixed(1)} ${arcBaseY.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx + c / 2).toFixed(1)} ${arcBaseY.toFixed(1)}" fill="none"/></defs>`);
    parts.push(`<text ${common} font-size="${arcFont.toFixed(1)}" fill="${pal.accent}"><textPath href="#${yayId}" startOffset="50%">${esc(text[0])}</textPath></text>`);

    // Kalan satirlar yayin ALTINDAN baslar ve alt marja tasmaz.
    const kalan = text.slice(1);
    const bosluk = size.h - padY - arcBaseY;
    const kalanEm = Math.max(...kalan.map((t) => widthEm(t, fontKey)), 0.1);
    const satirBoyu = Math.min(
      fontSize,
      bosluk / (kalan.length * lineGap),
      boxW / kalanEm,
    );
    kalan.forEach((line, i) => {
      const y = arcBaseY + satirBoyu * lineGap * (i + 1);
      parts.push(`<text x="${cx}" y="${y.toFixed(1)}" ${common} font-size="${satirBoyu.toFixed(1)}" fill="${pal.ink}">${esc(line)}</text>`);
    });
  } else if (layout === 'rozet') {
    /* ROZET - ust yay + ortadaki satir(lar) + alt yay.
     * Alt yay TERS yonde cizilir (sweep 0) ki harfler dogru dursun.
     */
    const yc = size.h / 2;
    /* Cember uzerindeki metin yaricapin DISINA dogru uzuyor (harfler yolun
     * uzerinde durup yukari cikiyor). Olculdu: tam yaricapla metin guvenli
     * marji 200px deliyordu. Yaricap, uzerine binecek yazi kadar kucultuluyor.
     */
    const rr = Math.min(boxW, boxH) / 2 * 0.84;
    const ustEm = widthEm(text[0], fontKey);
    const altEm = text.length > 2 ? widthEm(text[text.length - 1], fontKey) : 0;

    // Yay uzunlugu ~ cemberin ucte biri; punto ona sigmali.
    const yayPay = (Math.PI * rr) * 0.55;
    const cemberFont = Math.min(fontSize * 0.5, yayPay / Math.max(ustEm, 0.1));

    const id = idFor(d, size);
    parts.push(`<defs>`
      + `<path id="ust-${id}" d="M ${(cx - rr).toFixed(1)} ${yc.toFixed(1)} A ${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 1 ${(cx + rr).toFixed(1)} ${yc.toFixed(1)}" fill="none"/>`
      + `<path id="alt-${id}" d="M ${(cx - rr).toFixed(1)} ${yc.toFixed(1)} A ${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 0 ${(cx + rr).toFixed(1)} ${yc.toFixed(1)}" fill="none"/>`
      + `</defs>`);

    // Ince halka - rozet hissini veren sey.
    const halka = Math.max(4, fontSize * 0.045);
    parts.push(`<circle cx="${cx}" cy="${yc.toFixed(1)}" r="${(rr * 0.995).toFixed(1)}" fill="none" stroke="${pal.accent}" stroke-width="${halka.toFixed(1)}"/>`);

    parts.push(`<text ${common} font-size="${cemberFont.toFixed(1)}" fill="${pal.accent}"><textPath href="#ust-${id}" startOffset="50%">${esc(text[0])}</textPath></text>`);
    if (altEm) {
      const altFont = Math.min(cemberFont, yayPay / Math.max(altEm, 0.1));
      parts.push(`<text ${common} font-size="${altFont.toFixed(1)}" fill="${pal.accent}"><textPath href="#alt-${id}" startOffset="50%">${esc(text[text.length - 1])}</textPath></text>`);
    }

    // Ortadaki satirlar
    const orta = text.slice(1, altEm ? -1 : undefined);
    if (orta.length) {
      const ortaEm = Math.max(...orta.map((t) => widthEm(t, fontKey)));
      const ortaFont = Math.min(fontSize, (rr * 1.2) / ortaEm, (rr * 0.9) / (orta.length * lineGap));
      const ortaH = orta.length * ortaFont * lineGap;
      const ortaY = yc - ortaH / 2 + ortaFont * 0.82;
      orta.forEach((line, i) => {
        parts.push(`<text x="${cx}" y="${(ortaY + ortaFont * lineGap * i).toFixed(1)}" ${common} font-size="${ortaFont.toFixed(1)}" fill="${pal.ink}">${esc(line)}</text>`);
      });
    }
  } else if (layout === 'blok') {
    /* BLOK - her satir AYNI genisligi doldurur.
     * POD tipografisinin en tanidik kalibi. Bunu kurabilmemizin tek sebebi
     * artik her satirin gercek genisligini biliyor olmamiz: satir basina
     * ayri punto seciliyor ki hepsi boxW'ye otursun.
     */
    // Blok, satirlari kutunun TAMAMINA yaydigi icin glif tasmasina en duyarli
    // dizilim: olculdu, genel payin ustune %4 daha gerekiyor (serif 'SOURDOUGH'
    // gibi genis kuyruklu kelimelerde bbox ilerleme genisligini asiyor).
    const blokPay = 0.96;
    // TEK HARFLIK SATIR TUZAGI: "I" gibi dar bir satiri kutu genisligine
    // yaymak devasa bir punto uretiyor ve harf dikeyde tasiyor. Satir basina
    // punto, esit paylasimin 1.6 katiyla siniriliyor - blok gorunumu korunur
    // ama tek harf sayfayi yutmaz.
    const esitPay = boxH / (text.length * lineGap);
    const puntolar = text.map((line) => {
      const em = widthEm(line, fontKey);
      return Math.min((boxW * blokPay) / Math.max(em, 0.1), esitPay * 1.6);
    });
    // Toplam yukseklik guvenli alani asarsa hepsini ayni oranda kucult.
    const toplam = puntolar.reduce((a, p) => a + p * lineGap, 0);
    const olcek = toplam > boxH ? boxH / toplam : 1;

    let y = (size.h - toplam * olcek) / 2;
    text.forEach((line, i) => {
      const p = puntolar[i] * olcek;
      y += p * 0.82;
      const fill = i % 2 === 1 ? pal.accent : pal.ink;
      parts.push(`<text x="${cx}" y="${y.toFixed(1)}" ${common} font-size="${p.toFixed(1)}" fill="${fill}">${esc(line)}</text>`);
      y += p * (lineGap - 0.82);
    });
  } else if (layout === 'kontur') {
    /* KONTUR - yalnizca dis cizgi, ici bos.
     * Koyu urunlerde ince durur ve MUREKKEP AZ HARCAR (bazi POD
     * saglayicilarinda dolgu alani fiyati etkiliyor).
     */
    const kalinlik = Math.max(3, fontSize * 0.035);
    text.forEach((line, i) => {
      const y = startY + fontSize * lineGap * i;
      parts.push(`<text x="${cx}" y="${y.toFixed(1)}" ${common} font-size="${fontSize.toFixed(1)}"`
        + ` fill="none" stroke="${i === text.length - 1 ? pal.accent : pal.ink}"`
        + ` stroke-width="${kalinlik.toFixed(1)}" stroke-linejoin="round">${esc(line)}</text>`);
    });
  } else {
    text.forEach((line, i) => {
      const y = startY + fontSize * lineGap * i;
      const isMid = layout === 'serit' && i === Math.floor(text.length / 2);
      if (isMid) {
        /* ------------------------------------------------------- SERIT
         * Eskiden bant genisligi `line.length * fontSize * 0.72` idi -
         * yine karakter SAYISINA dayali tahmin. Olculdu: serif'te bant
         * metnin cok altinda kalip metin iki yandan 785'er piksel tasiyor,
         * elyazisinda ise bant metnin 2.5 KATI genisligine cikiyordu.
         * Artik bant, metnin OLCULEN genisligine gore kuruluyor.
         */
        const metinGen = widthEm(line, fontKey) * fontSize;
        const bw = Math.min(metinGen + fontSize * 0.5, boxW);
        const bh = fontSize * 1.28;
        parts.push(`<rect x="${(cx - bw / 2).toFixed(1)}" y="${(y - fontSize * 0.92).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${(bh * 0.12).toFixed(1)}" fill="${pal.accent}"/>`);
        parts.push(`<text x="${cx}" y="${y.toFixed(1)}" ${common} font-size="${fontSize.toFixed(1)}" fill="${pal.contrast}">${esc(line)}</text>`);
      } else {
        const fill = (layout === 'minimal' || i === text.length - 1) ? pal.accent : pal.ink;
        parts.push(`<text x="${cx}" y="${y.toFixed(1)}" ${common} font-size="${fontSize.toFixed(1)}" fill="${fill}">${esc(line)}</text>`);
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

module.exports = { toSvg, options, widthEm, SIZES, TOPLU_VARSAYILAN, PALETTES, LAYOUTS, FONTS };
