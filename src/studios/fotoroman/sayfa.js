'use strict';

/**
 * FOTOROMAN - SAYFA VE BALON CIZIMI
 *
 * Bu dosya fotoromanin BEDAVA yarisi. Kare goruntusu bir saglayicidan
 * gelir ve kredi harcar; sayfa duzeni, konusma balonu, anlatici kutusu,
 * sayfa numarasi - hepsi burada vektorle uretiliyor, hicbir sey
 * gerektirmiyor. Goruntu henuz yoksa yerine cerceve konur: kullanici
 * anahtar baglamadan da elinde duzenlenmis bir fotoroman taslagi olur.
 *
 * BALON YERLESIMI TESADUF DEGIL
 * ---------------------------------------------------------------
 * Balonun nereye kondugu plana bagli:
 *   closeup / bust  yuz kadrajin ortasini doldurur -> balon ALTTA
 *   wide / full     ust tarafta bos gokyuzu/tavan olur -> balon USTTE
 * Yanlis tarafa konan balon karakterin yuzunu kapatir; fotoromanda
 * kapanan yuz, kayan yuzden daha az affedilir.
 *
 * SVG ID CARPISMASI
 * ---------------------------------------------------------------
 * Ayni sayfada birden fazla kare var ve her karenin kendi kirpma
 * maskesi/gradyani oluyor. Bu kod tabaninda ayni hata IKI KEZ cikti
 * (etsy design.js id="arc", mockup.js id="kumas"): sabit id kullanan
 * ikinci ogeler BIRINCININ tanimini miras aliyor ve yanlis ciziliyor.
 * Buradaki her id benzersiz bir onek tasiyor (bkz. onekUret).
 */

const { esc, sigdir, widthEm } = require('../../tipografi');

/* --------------------------------------------------------------- olcu */

/**
 * SAYFA BICIMLERI
 * Sosyal olculer piksel; albüm sayfasi A4 300 DPI (2480x3508).
 */
const SIZES = {
  karusel: { label: 'Instagram karusel (4:5)', w: 1080, h: 1350, izgara: false },
  kare: { label: 'Kare (1:1)', w: 1080, h: 1080, izgara: false },
  hikaye: { label: 'Story / TikTok (9:16)', w: 1080, h: 1920, izgara: false },
  album4: { label: 'Albüm sayfasi A4 - 4 kare', w: 2480, h: 3508, izgara: [2, 2] },
  album6: { label: 'Albüm sayfasi A4 - 6 kare', w: 2480, h: 3508, izgara: [2, 3] },
};

/** Sayfa temalari - kagit, cerceve ve balon renkleri birlikte degisir. */
const TEMALAR = {
  klasik: {
    label: 'Klasik', kagit: '#f4f1ea', cerceve: '#141414', cerceveKalinlik: 6,
    balon: '#ffffff', balonKenar: '#141414', metin: '#141414',
    anlaticiZemin: '#141414', anlaticiMetin: '#f4f1ea',
  },
  gece: {
    label: 'Gece', kagit: '#111318', cerceve: '#f2f2f2', cerceveKalinlik: 5,
    balon: '#f7f7f7', balonKenar: '#111318', metin: '#111318',
    anlaticiZemin: '#f2f2f2', anlaticiMetin: '#111318',
  },
  pastel: {
    label: 'Pastel', kagit: '#fdf6f0', cerceve: '#4a3f47', cerceveKalinlik: 5,
    balon: '#ffffff', balonKenar: '#4a3f47', metin: '#3a3238',
    anlaticiZemin: '#e8d6cd', anlaticiMetin: '#3a3238',
  },
  sinema: {
    label: 'Sinema', kagit: '#0c0c0c', cerceve: '#0c0c0c', cerceveKalinlik: 0,
    balon: '#ffffff', balonKenar: '#0c0c0c', metin: '#0c0c0c',
    anlaticiZemin: '#0c0c0c', anlaticiMetin: '#ffffff',
  },
};

/** Balon yazi tipi. glifler tablosundaki anahtarlarla ayni olmali. */
const BALON_FONT = {
  elyazisi: { key: 'elyazisi', family: "'Segoe Script','Comic Sans MS',cursive", weight: 700 },
  kalin: { key: 'kalin', family: "'Arial Black','Segoe UI',Impact,sans-serif", weight: 900 },
  serif: { key: 'serif', family: "Georgia,'Times New Roman',serif", weight: 700 },
  daktilo: { key: 'daktilo', family: "'Courier New',monospace", weight: 700 },
};

/* --------------------------------------------------------------- yardim */

/**
 * Benzersiz id oneki. Girdiden DETERMINISTIK turetiliyor: ayni sayfa
 * her zaman ayni SVG'yi verir (onizleme ile ciktinin ayni olmasi icin).
 */
function onekUret(kaynak) {
  const metin = JSON.stringify(kaynak);
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'fr' + (h >>> 0).toString(36);
}

/**
 * DUSUNCE BALONU ICIN BULUT YOLU
 *
 * Bulut, cevresi yumrulu bir elips. Her yumru iki nokta arasinda disa
 * dogru bir yay.
 *
 * NEDEN UST USTE ELIPS DEGIL: ayri ayri <ellipse> cizmek kolay olurdu
 * ama kenar cizgisi her elipsin TAMAMINI dolasir, yani bulutun ICINDE
 * cizgiler gorunur. Tek bir <path> ile cevre bir kez ciziliyor.
 */
function bulutYolu(cx, cy, rx, ry, yumru = 11) {
  const noktalar = [];
  for (let i = 0; i < yumru; i++) {
    const a = (i / yumru) * Math.PI * 2;
    noktalar.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  let yol = `M ${noktalar[0][0].toFixed(1)} ${noktalar[0][1].toFixed(1)}`;
  for (let i = 0; i < yumru; i++) {
    const [x1, y1] = noktalar[i];
    const [x2, y2] = noktalar[(i + 1) % yumru];
    // Yay yaricapi kirisin yarisindan biraz buyuk olmali, yoksa yay cizilemez.
    const kiris = Math.hypot(x2 - x1, y2 - y1);
    const r = (kiris / 2) * 1.35;
    yol += ` A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return yol + ' Z';
}

/**
 * KONUSMA BALONU: ELIPS VE KUYRUK TEK PARCA
 *
 * Ilk surum kuyrugu ayri bir ucgen olarak cizip elipsi ustune koyuyordu.
 * Sonuc goruntude acikca yanlisti: elipsin yayi ucgenin TABANINDAN
 * geciyor ve balonun uzerinde bir DIKIS gorunuyordu - balon tek bir sey
 * gibi degil, ust uste yapistirilmis iki sekil gibi duruyordu.
 *
 * Dogrusu tek kapali yol: kuyrugun taban noktalarindan biri disinda
 * elipsin TAMAMINI dolas, sonra ucun tepesine cik ve kapat. Boylece
 * cevre bir kez ciziliyor, ic cizgi kalmiyor.
 *
 * Yay yonu notu: ekran koordinatinda y asagi baktigi icin aci buyudukce
 * saat yonunde ilerliyoruz; bu yuzden sweep=1. Kuyruk acisi disindaki
 * yay her zaman yarim turdan buyuk, o yuzden large-arc=1.
 */
function balonYolu(cx, cy, rx, ry, hedefX, hedefY) {
  const aci = Math.atan2(hedefY - cy, hedefX - cx);
  const yanAci = 0.3; // kuyrugun taban genisligi (radyan)

  const nokta = (t) => [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry];
  const [x1, y1] = nokta(aci + yanAci);
  const [x2, y2] = nokta(aci - yanAci);

  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} `
    + `A ${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 1 ${x2.toFixed(1)} ${y2.toFixed(1)} `
    + `L ${hedefX.toFixed(1)} ${hedefY.toFixed(1)} Z`;
}

/* --------------------------------------------------------------- balon */

/**
 * Bir kareye balon cizer.
 *
 * @param kare    hikaye karesi (balon alani dolu olmali)
 * @param kutu    { x, y, w, h } karenin sayfadaki yeri
 * @param tema
 * @param font
 * @param onek    id oneki
 * @returns {string} SVG parcasi
 */
function balonCiz(kare, kutu, tema, font, onek) {
  const b = kare.balon;
  if (!b || !b.metin) return '';

  /* YERLESIM: yakin planda yuz ortada -> balon altta.
   * Genis planda ust taraf bos -> balon ustte. */
  const altta = kare.shotKey === 'closeup' || kare.shotKey === 'bust';

  if (b.tip === 'anlatici') {
    /* Anlatici kutusu sayfa genisligini kullanir, kosesiz durur.
     * Konumu plandan bagimsiz: klasik fotoromanda anlatim USTTE. */
    const pad = kutu.w * 0.035;
    const kutuW = kutu.w - pad * 2;
    const { fontPx, satirlar } = sigdir(
      b.metin, font.key, kutuW * 0.92, kutu.h * 0.22,
      { maxPx: Math.round(kutu.w / 22), minPx: Math.round(kutu.w / 46) }
    );
    if (!satirlar.length) return '';
    const satirY = fontPx * 1.3;
    const kutuH = satirlar.length * satirY + fontPx * 0.9;
    const y = altta ? (kutu.y + kutu.h - pad - kutuH) : (kutu.y + pad);

    const metinler = satirlar.map((s, i) => (
      `<text x="${(kutu.x + kutu.w / 2).toFixed(1)}" `
      + `y="${(y + fontPx * 1.05 + i * satirY).toFixed(1)}" `
      + `text-anchor="middle" font-family="${font.family}" font-weight="${font.weight}" `
      + `font-size="${fontPx}" fill="${tema.anlaticiMetin}">${esc(s)}</text>`
    )).join('');

    return `<rect x="${(kutu.x + pad).toFixed(1)}" y="${y.toFixed(1)}" `
      + `width="${kutuW.toFixed(1)}" height="${kutuH.toFixed(1)}" `
      + `fill="${tema.anlaticiZemin}" opacity="0.94"/>${metinler}`;
  }

  /* Konusma ve dusunce: metni once sar, sonra balonu metne gore buyut.
   *
   * SARMA GENISLIGI NEDEN BU KADAR DAR (%32)
   * Elips metni saran verimsiz bir sekildir: kosede bol bos yer birakir,
   * yani genis sarilmis iki satirlik metin panelin %80'ini kaplayan basik
   * bir balon uretiyordu (olculdu). Metni DAR sarmak satir sayisini
   * artirir ama balonu yuvarlatir ve kucultur - ayni metin %49'a iner.
   * Punto da buna gore: cizgi roman harflendirmesi panel genisliginin
   * ~%3'u kadardir, W/30 tam oraya denk geliyor. */
  const { fontPx, satirlar } = sigdir(
    b.metin, font.key, kutu.w * 0.32, kutu.h * 0.3,
    { maxPx: Math.round(kutu.w / 30), minPx: Math.round(kutu.w / 52) }
  );
  if (!satirlar.length) return '';

  const satirY = fontPx * 1.28;
  let metinW = 0;
  for (const s of satirlar) metinW = Math.max(metinW, widthEm(s, font.key) * fontPx);
  const metinH = satirlar.length * satirY;

  // Elips, kosegen dolgu payiyla metni cevreler (elipse sigmasi icin ~1.35).
  const rx = Math.max(metinW * 0.72 + fontPx * 0.9, kutu.w * 0.13);
  const ry = Math.max(metinH * 0.78 + fontPx * 0.8, fontPx * 1.5);

  const kenarPay = kutu.w * 0.05;
  const cx = kutu.x + kutu.w / 2;
  const cy = altta
    ? kutu.y + kutu.h - kenarPay - ry
    : kutu.y + kenarPay + ry;

  // Kuyruk karakteri gosterir: alttaki balon yukari, ustteki asagi bakar.
  // Kuyruk uzunlugu panel yuksekliginin %6'si - %10'da fazla sivri duruyordu.
  const hedefY = altta ? cy - ry - kutu.h * 0.06 : cy + ry + kutu.h * 0.06;
  const hedefX = cx + kutu.w * 0.06;

  const metinler = satirlar.map((s, i) => (
    `<text x="${cx.toFixed(1)}" `
    + `y="${(cy - metinH / 2 + fontPx * 0.95 + i * satirY).toFixed(1)}" `
    + `text-anchor="middle" font-family="${font.family}" font-weight="${font.weight}" `
    + `font-size="${fontPx}" fill="${tema.metin}">${esc(s)}</text>`
  )).join('');

  const cizgi = Math.max(2, Math.round(kutu.w / 260));

  if (b.tip === 'dusunce') {
    // Bulut + hedefe dogru kuculen kabarciklar.
    const kabarciklar = [0.55, 0.34, 0.2].map((oran, i) => {
      const t = (i + 1) / 4;
      const x = cx + (hedefX - cx) * t;
      const y = (altta ? cy - ry : cy + ry) + (hedefY - (altta ? cy - ry : cy + ry)) * t;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(ry * oran * 0.32).toFixed(1)}" `
        + `fill="${tema.balon}" stroke="${tema.balonKenar}" stroke-width="${cizgi}"/>`;
    }).join('');

    return `<path d="${bulutYolu(cx, cy, rx * 1.06, ry * 1.12)}" fill="${tema.balon}" `
      + `stroke="${tema.balonKenar}" stroke-width="${cizgi}" stroke-linejoin="round"/>`
      + kabarciklar + metinler;
  }

  // Konusma: elips + kuyruk TEK yol - dikis olusmaz (bkz. balonYolu).
  return `<path d="${balonYolu(cx, cy, rx, ry, hedefX, hedefY)}" fill="${tema.balon}" `
    + `stroke="${tema.balonKenar}" stroke-width="${cizgi}" stroke-linejoin="round"/>`
    + metinler;
}

/* ---------------------------------------------------------------- kare */

/**
 * Tek bir kareyi (cerceve + goruntu veya yer tutucu + balon) cizer.
 *
 * @param gorselCoz  (kare) => href  goruntuyu nasil baglayacagimiz.
 *   Panel onizlemede '/gorseller/x.png', raster'da 'data:image/png;base64,...'
 *   donmeli - cunku raster SVG'yi gecici bir klasordeki HTML'e yaziyor ve
 *   oradan koke gore yol cozulmez.
 */
function kareCiz(kare, kutu, tema, font, onek, gorselCoz) {
  const id = `${onek}k${kare.panelNo}`;
  const href = typeof gorselCoz === 'function' ? gorselCoz(kare) : null;

  let icerik;
  if (href) {
    icerik = `<image href="${esc(href)}" x="${kutu.x}" y="${kutu.y}" `
      + `width="${kutu.w}" height="${kutu.h}" preserveAspectRatio="xMidYMid slice" `
      + `clip-path="url(#${id}c)"/>`;
  } else {
    /* YER TUTUCU - urunun bedava yarisinin gorunur yuzu.
     * Bos gri bir kutu birakmak yerine karenin NE OLDUGUNU yaziyoruz:
     * perde, plan ve poz. Boylece anahtari olmayan kullanicinin elinde
     * okunabilir bir cekim listesi kaliyor. */
    const yaziRenk = tema.metin;
    const satirlar = [
      `${kare.panelNo}. kare - ${kare.perdeLabel}`,
      kare.shotKey,
      kare.pose,
    ];
    const px = Math.round(kutu.w / 26);

    /* Yer tutucu yazisi BALONUN KARSI TARAFINA konuyor.
     * Ortaya sabitlendiginde alttaki balonla cakisiyordu ve ustte kocaman
     * bos bir alan kaliyordu. Balon alttaysa yazi ust ucte, ustteyse
     * alt ucte duruyor - ikisi de kadraji dengeliyor. */
    const balonAltta = !!(kare.balon && kare.balon.tip !== 'anlatici'
      && (kare.shotKey === 'closeup' || kare.shotKey === 'bust'));
    const merkezY = balonAltta ? kutu.y + kutu.h * 0.3 : kutu.y + kutu.h * 0.66;

    const metin = satirlar.map((s, i) => {
      const sigan = s.length > 46 ? `${s.slice(0, 44)}...` : s;
      return `<text x="${(kutu.x + kutu.w / 2).toFixed(1)}" `
        + `y="${(merkezY - px + i * px * 1.5).toFixed(1)}" text-anchor="middle" `
        + `font-family="'Courier New',monospace" font-size="${i === 0 ? px : px * 0.8}" `
        + `fill="${yaziRenk}" opacity="${i === 0 ? 0.8 : 0.5}">${esc(sigan)}</text>`;
    }).join('');

    icerik = `<rect x="${kutu.x}" y="${kutu.y}" width="${kutu.w}" height="${kutu.h}" `
      + `fill="${tema.kagit}"/>`
      + `<rect x="${kutu.x}" y="${kutu.y}" width="${kutu.w}" height="${kutu.h}" `
      + `fill="none" stroke="${tema.metin}" stroke-width="2" stroke-dasharray="14 10" opacity="0.35"/>`
      + metin;
  }

  const cerceve = tema.cerceveKalinlik > 0
    ? `<rect x="${kutu.x}" y="${kutu.y}" width="${kutu.w}" height="${kutu.h}" fill="none" `
      + `stroke="${tema.cerceve}" stroke-width="${tema.cerceveKalinlik}"/>`
    : '';

  return `<clipPath id="${id}c"><rect x="${kutu.x}" y="${kutu.y}" `
    + `width="${kutu.w}" height="${kutu.h}"/></clipPath>`
    + icerik + cerceve
    + balonCiz(kare, kutu, tema, font, onek);
}

/* --------------------------------------------------------------- sayfa */

/**
 * Hikayeyi sayfalara boler ve her sayfayi SVG olarak dondurur.
 *
 * @param hikaye  diyalog.kur() ciktisi
 * @param ayar    { size, tema, font, gorselCoz }
 * @returns {{ w, h, sayfalar: string[] }}
 */
function sayfalar(hikaye, ayar = {}) {
  const size = SIZES[ayar.size] || SIZES.karusel;
  const tema = TEMALAR[ayar.tema] || TEMALAR.klasik;
  const font = BALON_FONT[ayar.font] || BALON_FONT.elyazisi;
  const gorselCoz = ayar.gorselCoz;

  const kareler = hikaye.kareler || [];
  const sayfaBasi = size.izgara ? size.izgara[0] * size.izgara[1] : 1;
  const cikti = [];

  for (let i = 0; i < kareler.length; i += sayfaBasi) {
    const dilim = kareler.slice(i, i + sayfaBasi);
    const onek = onekUret([hikaye.baslik, i, ayar.size, ayar.tema, ayar.font]);

    const kenar = size.izgara ? size.w * 0.05 : 0;
    const bosluk = size.izgara ? size.w * 0.025 : 0;
    const sut = size.izgara ? size.izgara[0] : 1;
    const sat = size.izgara ? size.izgara[1] : 1;

    // Albumde altta sayfa numarasi icin yer birakiliyor.
    const altPay = size.izgara ? size.h * 0.035 : 0;
    const alanW = size.w - kenar * 2;
    const alanH = size.h - kenar * 2 - altPay;
    const kareW = (alanW - bosluk * (sut - 1)) / sut;
    const kareH = (alanH - bosluk * (sat - 1)) / sat;

    const parcalar = dilim.map((kare, j) => {
      const kutu = size.izgara
        ? {
          x: kenar + (j % sut) * (kareW + bosluk),
          y: kenar + Math.floor(j / sut) * (kareH + bosluk),
          w: kareW, h: kareH,
        }
        : { x: 0, y: 0, w: size.w, h: size.h };
      return kareCiz(kare, kutu, tema, font, onek, gorselCoz);
    }).join('');

    const sayfaNo = size.izgara
      ? `<text x="${(size.w / 2).toFixed(0)}" y="${(size.h - kenar * 0.45).toFixed(0)}" `
        + `text-anchor="middle" font-family="Georgia,serif" font-size="${Math.round(size.w / 62)}" `
        + `fill="${tema.cerceve}" opacity="0.55">${Math.floor(i / sayfaBasi) + 1}</text>`
      : '';

    cikti.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" `
      + `viewBox="0 0 ${size.w} ${size.h}">`
      + `<rect width="${size.w}" height="${size.h}" fill="${tema.kagit}"/>`
      + parcalar + sayfaNo
      + '</svg>'
    );
  }

  return { w: size.w, h: size.h, sayfalar: cikti };
}

function options() {
  return {
    sizes: Object.entries(SIZES).map(([key, v]) => ({
      key, label: v.label, w: v.w, h: v.h, kareSayisi: v.izgara ? v.izgara[0] * v.izgara[1] : 1,
    })),
    temalar: Object.entries(TEMALAR).map(([key, v]) => ({ key, label: v.label })),
    fontlar: Object.entries(BALON_FONT).map(([key]) => ({ key, label: key })),
  };
}

module.exports = { sayfalar, options, SIZES, TEMALAR, BALON_FONT, bulutYolu };
