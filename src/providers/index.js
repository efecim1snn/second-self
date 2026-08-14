'use strict';

/**
 * SAGLAYICI KAYIT DEFTERI
 *
 * Bu otomasyon TEK BASINA GORSEL URETMEZ.
 * Kullanan kisi hangi gorsel uretim platformunu kullaniyorsa onun API'sini
 * buraya baglar; otomasyon da o platformun diline gore en iyi prompt'u kurup
 * gonderir.
 *
 * Yeni bir platform eklemek icin: bu klasore bir dosya koy, asagidaki
 * REGISTRY listesine ekle. Baska hicbir yeri degistirmen gerekmez.
 */

const manual = require('./manual');
const leonardo = require('./leonardo');
const openai = require('./openai');
const stability = require('./stability');
const replicate = require('./replicate');
const fal = require('./fal');
const automatic1111 = require('./automatic1111');
const comfyui = require('./comfyui');
const custom = require('./custom');

const REGISTRY = [
  manual,
  leonardo,
  openai,
  stability,
  replicate,
  fal,
  automatic1111,
  comfyui,
  custom,
];

function list() {
  return REGISTRY.map((p) => ({
    id: p.id,
    label: p.label,
    dialect: p.dialect,
    docs: p.docs,
    blurb: p.blurb,
    local: !!p.local,
    generates: p.id !== 'manual',
    supportsReference: !!p.supportsReference,
    dialectOverridable: !!p.dialectOverridable,
    fields: (p.fields || []).map((f) => ({ ...f })),
  }));
}

function get(id) {
  return REGISTRY.find((p) => p.id === id) || manual;
}

const helpers = require('./helpers');

module.exports = { list, get, REGISTRY, helpers };
