'use strict';

/**
 * TIPOGRAFI - ORTAK KATMAN
 *
 * Metnin kac piksel yer kapladigini bilmeden vektor tasarim yapilamaz.
 * Bu dosyadan once olcum yalnizca Etsy studyosunun icinde duruyordu
 * (studios/etsy/design.js), yani ikinci bir studyo ayni ise girdiginde
 * ya kodu kopyalayacakti ya da cekirdek bir studyoyu require edecekti -
 * ikisi de yanlis.
 *
 * Buradaki uc is:
 *   esc()      SVG'ye giren her metin kacisli olmali
 *   widthEm()  metnin genisligi (font boyutunun kati olarak)
 *   sar()      verilen genisige sigacak sekilde satirlara bol
 *
 * sar() fotoroman icin yazildi: konusma balonunun ne kadar buyuyecegi
 * metnin kac satira bolunduguyle belirleniyor, yani once bolup sonra
 * balonu ona gore cizmek gerekiyor.
 */

const glifler = require('./glifler');

/** SVG'ye giren metin kacisi. Escape edilmemis tek bir & belgeyi bozar. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Metnin genisligi - font boyutunun KATI olarak (em).
 * Gercek piksel = widthEm(metin, font) * fontBoyutu
 *
 * Sistemde olculmus tablo varsa o kullanilir; yoksa gomulu yedek.
 */
function widthEm(text, fontKey) {
  const hepsi = glifler.tablo();
  const tablo = hepsi[fontKey] || hepsi.kalin || {};
  const yedek = glifler.VARSAYILAN[fontKey] || 0.75;
  let toplam = 0;
  for (const ch of String(text || '')) {
    toplam += (tablo[ch] != null ? tablo[ch] : yedek);
  }
  return toplam || 0.1;
}

/**
 * Metni verilen genisige (em cinsinden) sigacak satirlara boler.
 *
 * @param {string} text     bolunecek metin
 * @param {string} fontKey  glif tablosu anahtari
 * @param {number} maxEm    bir satirin en fazla kac em olabilecegi
 * @param {number} maxSatir ust sinir; asilirsa son satir ... ile kisaltilir
 * @returns {string[]}
 *
 * KELIME BOLMEZ - tek bir kelime bile satira sigmiyorsa onu oldugu gibi
 * birakir. Bunun sebebi: Turkce'de kelime ortasindan bolmek tire kurallari
 * gerektiriyor ("gel-mi-yor" degil "gel-mi-yor"), yanlis bolunmus kelime
 * tasan metinden daha kotu gorunuyor. Cok uzun tek kelime nadir; balon
 * biraz genisler, okunakli kalir.
 */
function sar(text, fontKey, maxEm, maxSatir = 99) {
  const kelimeler = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!kelimeler.length) return [];

  const satirlar = [];
  let simdiki = '';

  for (const kelime of kelimeler) {
    const deneme = simdiki ? `${simdiki} ${kelime}` : kelime;
    if (widthEm(deneme, fontKey) <= maxEm || !simdiki) {
      simdiki = deneme;
    } else {
      satirlar.push(simdiki);
      simdiki = kelime;
    }
  }
  if (simdiki) satirlar.push(simdiki);

  if (satirlar.length <= maxSatir) return satirlar;

  // Sinir asildi: kes ve son satiri uc noktayla bitir.
  const kesik = satirlar.slice(0, maxSatir);
  let son = kesik[maxSatir - 1];
  while (son && widthEm(`${son}...`, fontKey) > maxEm && son.includes(' ')) {
    son = son.slice(0, son.lastIndexOf(' '));
  }
  kesik[maxSatir - 1] = `${son}...`;
  return kesik;
}

/**
 * Bir metin blogunun kaplayacagi kutu.
 * Balonun ne kadar buyuyecegini hesaplarken kullaniliyor.
 */
function blokOlcu(satirlar, fontKey, fontPx, satirAraligi = 1.25) {
  let enGenis = 0;
  for (const s of satirlar) enGenis = Math.max(enGenis, widthEm(s, fontKey));
  return {
    w: enGenis * fontPx,
    h: satirlar.length * fontPx * satirAraligi,
    satirYuksekligi: fontPx * satirAraligi,
  };
}

/**
 * Metni bir kutuya sigdiran font boyutunu bulur.
 *
 * Sabit font boyutuyla calisan bir sistemde uzun metin ya tasar ya kesilir.
 * Burada tersini yapiyoruz: kutu sabit, yazi kuculuyor. Alt sinira
 * (minPx) inildiginde daha fazla kucultmek yerine satir sayisi
 * kisitlanip metin kirpiliyor - okunamayacak kadar kucuk yazi,
 * kirpilmis metinden daha kotu.
 */
function sigdir(text, fontKey, kutuW, kutuH, { maxPx = 48, minPx = 14, satirAraligi = 1.25 } = {}) {
  for (let px = maxPx; px >= minPx; px -= 1) {
    const maxEm = kutuW / px;
    const satirlar = sar(text, fontKey, maxEm);
    const yukseklik = satirlar.length * px * satirAraligi;
    if (yukseklik <= kutuH) return { fontPx: px, satirlar };
  }
  // Alt sinirdayiz: kutuya kac satir siginiyorsa o kadarini al.
  const maxSatir = Math.max(1, Math.floor(kutuH / (minPx * satirAraligi)));
  return { fontPx: minPx, satirlar: sar(text, fontKey, kutuW / minPx, maxSatir) };
}

module.exports = { esc, widthEm, sar, blokOlcu, sigdir };
