'use strict';

/**
 * DETERMINISTIK SECICI
 *
 * Ayni girdi -> ayni cikti, her zaman. "Ayni karakter ayni sahnede ayni metni
 * uretir" sozunu tutan sey bu; Math.random() ile bu soz tutulamaz.
 *
 * Algoritma life.js:deterministicRng ile BIREBIR AYNI (FNV-1a karma + LCG).
 * Ucuncu bir kopya cikarmamak icin buraya alindi; life.js su an bilerek
 * degistirilmiyor cunku autoFill ciktisi mevcut karakterlerde ayni kalmali.
 * Ayri bir temizlik adiminda life.js de buna baglanabilir.
 */

/**
 * @param {Array} parts  tohumu olusturan degerler
 * @returns {() => number}  [0,1) araliginda sayi ureten fonksiyon
 */
function makeRng(parts) {
  const seedText = JSON.stringify(parts);
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return function next() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Listeden deterministik secim. Bos listede undefined doner. */
function pick(list, next) {
  if (!Array.isArray(list) || !list.length) return undefined;
  return list[Math.floor(next() * list.length) % list.length];
}

/** Listeyi deterministik karistirir (Fisher-Yates). Kaynagi bozmaz. */
function shuffle(list, next) {
  const out = [...(list || [])];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

module.exports = { makeRng, pick, shuffle };
