'use strict';

/**
 * STUDYO KATMANI
 *
 * Tek urun, icinde farkli sistemler. Mekanik ayni, islev farkli.
 *
 * ORTAK (cekirdek, her studyo kullanir):
 *   src/providers/   gorsel uretim - kullanici baglar
 *   src/upscalers/   buyutme       - kullanici baglar
 *   src/promptcraft  prompt motoru
 *   src/store        JSON kaliciligi
 *   server.js        guvenlik kapisi, statik sunum, rota tablosu
 *   public/          panel iskeleti (sekmeler, form alanlari, modal, toast)
 *
 * STUDYOYA OZEL:
 *   sorular, veri modeli, sekmeler, cikti bicimi
 *
 * Yeni studyo eklemek: src/studios/<ad>/index.js yaz, asagidaki listeye ekle.
 * Baska hicbir yeri degistirmen gerekmez.
 */

const karakter = require('./karakter');
const etsy = require('./etsy');
const reklam = require('./reklam');

const REGISTRY = [karakter, etsy, reklam];

function list() {
  return REGISTRY.map((s) => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    tagline: s.tagline,
    needsProvider: !!s.needsProvider,
    tabs: s.tabs,
  }));
}

function get(id) {
  return REGISTRY.find((s) => s.id === id) || REGISTRY[0];
}

/** Studyolarin kendi API rotalarini tek tabloda toplar: "POST /api/menu/kaydet" */
function routes() {
  const out = {};
  for (const studio of REGISTRY) {
    for (const [key, handler] of Object.entries(studio.routes || {})) {
      const [method, path] = key.split(' ');
      out[`${method} /api/${studio.id}${path}`] = handler;
    }
  }
  return out;
}

module.exports = { REGISTRY, list, get, routes };
