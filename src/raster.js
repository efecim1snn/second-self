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
        resolve(buf);
      } catch (err) {
        reject(err);
      } finally {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
      }
    });
  });
}

module.exports = { svgToPng, available, findBrowser };
