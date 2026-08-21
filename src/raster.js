'use strict';

/**
 * ORTAK RASTERIZE MOTORU: SVG/HTML -> PNG
 *
 * Etsy POD studyosu ve Reklam studyosu ikisi de bunu kullanir.
 *
 * Bagimlilik eklemeden rasterize etmek icin sistemde ZATEN KURULU olan
 * Chrome/Edge'i bassiz modda kullaniyoruz. Kurulum, indirme, npm paketi yok.
 *
 * --default-background-color=00000000 : POD icin SEFFAF arka plan sart,
 * yoksa baskida beyaz kutu cikar.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

let cached;
function findBrowser() {
  if (cached !== undefined) return cached;
  cached = CANDIDATES.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || null;
  return cached;
}

function available() {
  return !!findBrowser();
}

/**
 * SVG -> PDF (VEKTOR, YAZI TIPI GOMULU)
 *
 * SVG'nin POD'daki buyuk sorunu: dosya yazi tipinin yalnizca ADINI tasir.
 * Baskicida o font yoksa metin baska bir fontla cizilir ve tasarim bozulur.
 * PNG bunu cozer ama vektor olmaktan cikar.
 *
 * PDF ikisini birden verir: Chrome kendi PDF ciktisina kullanilan yazi
 * tipini GOMER, metin vektor kalir, her yerde ayni gorunur. Bircok matbaa
 * zaten PDF istiyor.
 *
 * Olculer inc cinsinden verilir cunku PDF'in birimi nokta (1/72 inc);
 * 300 DPI'lik piksel olcusunu 300'e bolerek inc buluyoruz.
 */
function svgToPdf(svg, width, height, options = {}) {
  return new Promise((resolve, reject) => {
    const browser = findBrowser();
    if (!browser) {
      return reject(new Error('PDF uretmek icin sistemde Chrome veya Edge bulunamadi.'));
    }
    const dpi = Number(options.dpi) || 300;
    const incW = width / dpi;
    const incH = height / dpi;

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'podpdf-'));
    const htmlPath = path.join(dir, 'd.html');
    const outPath = path.join(dir, 'd.pdf');

    // @page ile sayfa tam tasarim olcusunde; kenar boslugu yok.
    fs.writeFileSync(htmlPath,
      `<!doctype html><meta charset="utf-8">
       <style>
         @page { size: ${incW}in ${incH}in; margin: 0; }
         html,body { margin:0; padding:0; }
         svg { display:block; width:${incW}in; height:${incH}in; }
       </style>${svg}`, 'utf8');

    execFile(browser, [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      `--print-to-pdf=${outPath}`,
      `file:///${htmlPath.split(String.fromCharCode(92)).join('/')}`,
    ], { timeout: 120000 }, (err) => {
      try {
        if (!fs.existsSync(outPath)) {
          return reject(new Error('PDF olusturulamadi. Tarayici bassiz modda calisamamis olabilir.'));
        }
        const buf = fs.readFileSync(outPath);
        // Yarim PDF de basariyla karistirilmasin: %PDF- ile baslar, %%EOF ile biter.
        if (buf.length < 200 || buf.slice(0, 5).toString('latin1') !== '%PDF-') {
          return reject(new Error('Uretilen PDF bozuk (gecerli bir PDF basligi yok). Tekrar dene.'));
        }
        if (buf.lastIndexOf(Buffer.from('%%EOF', 'latin1')) < 0) {
          return reject(new Error(
            'Uretilen PDF YARIM - dosya sonu isareti (%%EOF) yok'
            + (err ? ` (${err.message})` : '') + '. Tekrar dene.'
          ));
        }
        resolve(buf);
      } catch (err) {
        reject(err);
      } finally {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
      }
    });
  });
}

/* --------------------------------------------------------- glif olcumu */

/**
 * YAZI GENISLIGINI TAHMIN ETME - OLC
 *
 * Sorun: design.js metnin ne kadar yer kaplayacagini tek bir sabitle
 * tahmin ediyordu (`karakterSayisi * 0.58`). Hicbir yazi tipinde bu dogru
 * degil - olculdu: Courier New 0.60 (sabit), Arial Black 0.64-0.94,
 * Georgia 0.66-1.02, Segoe Script 0.31-1.00. Yani 0.58 en dar gercek
 * durumdan bile dusuk; program her seferinde gerekenden BUYUK punto
 * seciyor ve harfler baski dosyasinin disinda kaliyordu.
 *
 * Cozum: bassiz Chrome'a her yazi tipinin her harfinin gercek genisligini
 * BIR KEZ olcturuyoruz, sonuc data/glif-tablo.json'a yaziliyor. Sonrasi
 * saf toplama - onizlemede tarayici hic calismaz, yazarken yavaslama olmaz.
 *
 * Cikti: { ' ': 0.31, 'A': 0.72, ... } em cinsinden ilerleme genisligi.
 */

const OLCULECEK = (() => {
  const harfler = [];
  for (let c = 32; c <= 126; c++) harfler.push(String.fromCharCode(c));
  // Turkce ve yaygin aksanli harfler - kullanici bunlari da yazabiliyor.
  for (const ek of 'ÇĞİIÖŞÜçğıöşüÄÖÜäöüßÁÉÍÓÚáéíóúÑñÂÊÎÔÛâêîôû') {
    if (!harfler.includes(ek)) harfler.push(ek);
  }
  return harfler;
})();

function measureGlyphs(fontFamily, weight = 400, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const browser = findBrowser();
    if (!browser) return reject(new Error('Olcum icin Chrome/Edge bulunamadi.'));

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glif-'));
    const htmlPath = path.join(dir, 'm.html');

    // Canvas measureText gercek ilerleme genisligini (advance width) verir -
    // getBBox'un aksine harfler arasi bosluk da dahildir, bizim istedigimiz bu.
    const html = `<!doctype html><meta charset="utf-8"><body><pre id="o"></pre><script>
      var HARFLER = ${JSON.stringify(OLCULECEK)};
      var BOY = 100;
      var c = document.createElement('canvas').getContext('2d');
      c.font = ${JSON.stringify('%WEIGHT% ' + 'BOYpx ' + '%FAMILY%')}
        .replace('BOY', BOY);
      var out = {};
      for (var i = 0; i < HARFLER.length; i++) {
        out[HARFLER[i]] = Math.round(c.measureText(HARFLER[i]).width / BOY * 10000) / 10000;
      }
      document.getElementById('o').textContent = 'GLIF_JSON:' + JSON.stringify(out) + ':GLIF_SON';
    <\/script></body>`
      .replace('%WEIGHT%', String(weight))
      .replace('%FAMILY%', fontFamily);

    fs.writeFileSync(htmlPath, html, 'utf8');

    execFile(browser, [
      '--headless=new',
      '--disable-gpu',
      '--dump-dom',
      '--virtual-time-budget=3000',
      `file:///${htmlPath.split(String.fromCharCode(92)).join('/')}`,
    ], { timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 }, (err, stdout) => {
      try {
        const metin = String(stdout || '');
        const bas = metin.indexOf('GLIF_JSON:');
        const son = metin.indexOf(':GLIF_SON');
        if (bas === -1 || son === -1) {
          return reject(new Error('Olcum ciktisi okunamadi (tarayici DOM dokumedi).'));
        }
        const ham = metin.slice(bas + 'GLIF_JSON:'.length, son);
        // DOM dokumu HTML kacislari icerebilir
        const temiz = ham
          .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
        resolve(JSON.parse(temiz));
      } catch (e) {
        reject(new Error(`Glif olcumu basarisiz: ${e.message}`));
      } finally {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
      }
    });
  });
}

/* ------------------------------------------------------------- PNG DPI */

/**
 * PNG'YE COZUNURLUK (DPI) BILGISI YAZ
 *
 * Sorun: Chrome'un urettigi PNG'de pHYs parcasi YOK. Yani dosya 4500x5400
 * piksel ama "bu 300 DPI'dir" bilgisi hicbir yerde yazmiyor. Panel ve README
 * "300 DPI" diyor, dosya demiyordu.
 *
 * Neden onemli: Photoshop, bazi POD dogrulayicilari ve Amazon Merch gibi
 * sistemler bu parcayi okur. Yoksa dosyayi 72 DPI varsayarlar - ayni piksel
 * sayisi "62 inc genisliginde 72 DPI baski" gibi gorunur ve dosya ya reddedilir
 * ya da yanlis olcekte basilir.
 *
 * Sifir bagimlilikla cozum: PNG parca yapisi basit.
 *   [4 bayt uzunluk][4 bayt tip][veri][4 bayt CRC32]
 * pHYs verisi: [4 bayt X piksel/metre][4 bayt Y][1 bayt birim (1 = metre)]
 *
 * zlib.crc32 yalnizca yeni Node surumlerinde var; engines ">=18" sozunu
 * bozmamak icin CRC32 tablosu burada kuruluyor.
 */

let CRC_TABLO = null;
function crcTablo() {
  if (CRC_TABLO) return CRC_TABLO;
  CRC_TABLO = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC_TABLO[n] = c;
  }
  return CRC_TABLO;
}

function crc32(buf) {
  const t = crcTablo();
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

const PNG_IMZA = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

/**
 * sRGB parcasi: "bu dosyanin renkleri sRGB'dir" der.
 * POD baskisi sRGB bekliyor; renk yonetimi acik bir hatta profil yoksa
 * renkler kayabiliyor. 13 bayt, altyapi zaten kurulu.
 * rendering intent 0 = perceptual (fotograf/grafik icin standart).
 */
function srgbParca() {
  const tip = Buffer.from('sRGB', 'latin1');
  const veri = Buffer.from([0]);
  const uzunluk = Buffer.alloc(4); uzunluk.writeUInt32BE(veri.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tip, veri])), 0);
  return Buffer.concat([uzunluk, tip, veri, crc]);
}

/**
 * PNG buffer'ina pHYs (cozunurluk) ve sRGB (renk uzayi) parcalarini ekler.
 * @param {Buffer} png
 * @param {number} dpi
 * @returns {Buffer} yeni buffer - girdiyi degistirmez
 */
function setPngDpi(png, dpi = 300) {
  if (!Buffer.isBuffer(png) || png.length < 8 || !png.slice(0, 8).equals(PNG_IMZA)) {
    return png; // PNG degilse dokunma
  }

  // Metre basina piksel. 1 inc = 0.0254 m.
  const ppm = Math.round(Number(dpi) / 0.0254);

  const veri = Buffer.alloc(9);
  veri.writeUInt32BE(ppm, 0);
  veri.writeUInt32BE(ppm, 4);
  veri.writeUInt8(1, 8); // birim: metre

  const tip = Buffer.from('pHYs', 'latin1');
  const parca = Buffer.concat([
    (() => { const b = Buffer.alloc(4); b.writeUInt32BE(veri.length, 0); return b; })(),
    tip,
    veri,
    (() => { const b = Buffer.alloc(4); b.writeUInt32BE(crc32(Buffer.concat([tip, veri])), 0); return b; })(),
  ]);

  // Parcalari gez: varsa eski pHYs'i at, pHYs'i IHDR'den hemen sonra koy.
  const parcalar = [];
  let p = 8;
  let eklendi = false;

  while (p + 8 <= png.length) {
    const uzunluk = png.readUInt32BE(p);
    const t = png.slice(p + 4, p + 8).toString('latin1');
    const son = p + 12 + uzunluk;
    if (son > png.length) break; // bozuk dosya - oldugu gibi birak

    if (t !== 'pHYs' && t !== 'sRGB') parcalar.push(png.slice(p, son));

    if (t === 'IHDR' && !eklendi) {
      parcalar.push(parca);
      parcalar.push(srgbParca());
      eklendi = true;
    }
    p = son;
    if (t === 'IEND') break;
  }

  if (!eklendi) return png; // IHDR bulunamadi - dokunma
  return Buffer.concat([PNG_IMZA, ...parcalar]);
}

/** SVG/HTML metnini PNG buffer'ina cevirir. options.background verilmezse SEFFAF. */
function svgToPng(svg, width, height, options = {}) {
  return new Promise((resolve, reject) => {
    const browser = findBrowser();
    if (!browser) {
      return reject(new Error(
        'PNG uretmek icin sistemde Chrome veya Edge bulunamadi. Tarayici kuruluysa ' +
        'yolu bulunamamis olabilir; SVG dosyasini indirip kendi aracinda PNG\'ye cevirebilirsin.'
      ));
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'podpng-'));
    const htmlPath = path.join(dir, 'd.html');
    const outPath = path.join(dir, 'd.png');
    // Kenar boslugu ve kaydirma cubugu olmadan tam kadraj
    const bg = options.background || 'transparent';
    fs.writeFileSync(htmlPath,
      `<!doctype html><meta charset="utf-8">
       <style>html,body{margin:0;padding:0;background:${bg};overflow:hidden}
       svg{display:block}</style>${svg}`, 'utf8');

    execFile(browser, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--default-background-color=${options.background ? 'ffffffff' : '00000000'}`,
      `--screenshot=${outPath}`,
      `--window-size=${width},${height}`,
      `file:///${htmlPath.split(String.fromCharCode(92)).join('/')}`,
    ], { timeout: 120000 }, (err) => {
      try {
        if (!fs.existsSync(outPath)) {
          return reject(new Error('PNG olusturulamadi. Tarayici bassiz modda calisamamis olabilir.'));
        }
        const buf = fs.readFileSync(outPath);

        /* YARIM DOSYAYI YAKALA
         * Chrome zaman asimina ugrar veya olduruleyse yarim bir PNG kalabiliyor
         * ve bu dosya "basarili" sayilip baskiya hazir diye kaydediliyordu -
         * hatayi ancak matbaa veya musteri fark ediyordu.
         * PNG her zaman 8 baytlik imzayla baslar ve IEND parcasiyla biter.
         */
        const IMZA = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        const bitis = Buffer.from('IEND', 'latin1');
        if (buf.length < 100 || !buf.slice(0, 8).equals(IMZA)) {
          return reject(new Error('Uretilen PNG bozuk (gecerli bir PNG basligi yok). Tekrar dene.'));
        }
        if (buf.lastIndexOf(bitis) < 0) {
          return reject(new Error(
            'Uretilen PNG YARIM - dosya sonu parcasi (IEND) yok. Tarayici islemi tamamlayamadi'
            + (err ? ` (${err.message})` : '') + '. Tekrar dene; surerse tasarimi sadelestir.'
          ));
        }

        // Baskiya giden dosya kendi cozunurlugunu soylesin - Chrome bunu yazmiyor.
        resolve(options.dpi === 0 ? buf : setPngDpi(buf, options.dpi || 300));
      } catch (err) {
        reject(err);
      } finally {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
      }
    });
  });
}

module.exports = { svgToPng, svgToPdf, available, findBrowser, setPngDpi, crc32, measureGlyphs };
