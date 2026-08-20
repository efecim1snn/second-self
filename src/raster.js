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
 * PNG buffer'ina pHYs parcasi ekler (varsa gunceller).
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

    if (t !== 'pHYs') parcalar.push(png.slice(p, son));

    if (t === 'IHDR' && !eklendi) {
      parcalar.push(parca);
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
    ], { timeout: 120000 }, () => {
      try {
        if (!fs.existsSync(outPath)) {
          return reject(new Error('PNG olusturulamadi. Tarayici bassiz modda calisamamis olabilir.'));
        }
        const buf = fs.readFileSync(outPath);
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

module.exports = { svgToPng, available, findBrowser, setPngDpi, crc32 };
