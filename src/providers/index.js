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
 *
 * Dosyada bulunmasi beklenen alanlar:
 *   id, label, dialect, docs, blurb, needs, keyUrl, fields[], generate()
 *   referenceMode: 'none' | 'auto' | 'needs-config'
 *     'needs-config' ise ayrica: referenceReady(config), referenceNotReadyReason,
 *     referenceFixHint
 *   Karsilastirma tablosu icin: cost, costNote, pricingUrl, realism, realismNote,
 *   maxResolution, resolutionNote, setup, setupNote, supportsSeed, supportsNegative
 *   (bunlar yedekli - yazmazsan tabloda "kodda yok" gorunur)
 */

const pollinations = require('./pollinations');
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
  pollinations,
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
    // ESKI ALAN - yalnizca geriye uyum icin duruyor.
    // HICBIR DAVRANIS BUNA BAKMAZ; gercek durum referenceState() ile hesaplanir.
    supportsReference: !!p.supportsReference,
    referenceMode: p.referenceMode || (p.supportsReference ? 'needs-config' : 'none'),
    dialectOverridable: !!p.dialectOverridable,
    // Karsilastirma tablosu alanlari. Hepsi yedekli: yeni bir saglayici dosyasi
    // yazan biri unutursa tabloda bos hucre degil "kodda yok" gorunur.
    needs: p.needs || '-',
    keyUrl: p.keyUrl || null,
    pricingUrl: p.pricingUrl || null,
    cost: p.cost || 'kodda yok',
    costNote: p.costNote || '',
    realism: p.realism || 'kodda yok',
    realismNote: p.realismNote || '',
    maxResolution: p.maxResolution || 'kodda yok',
    resolutionNote: p.resolutionNote || '',
    setup: p.setup || 'kodda yok',
    setupNote: p.setupNote || '',
    supportsSeed: p.supportsSeed !== false,
    supportsNegative: !!p.supportsNegative,
    fields: (p.fields || []).map((f) => ({ ...f })),
  }));
}

/**
 * REFERANS GORSELIN TEK DOGRULUK KAYNAGI.
 *
 * Eskiden tek bir `supportsReference` bayragi vardi ve YALAN SOYLUYORDU:
 * ComfyUI "destekliyorum" diyordu ama referansi ne aliyor ne gonderiyordu;
 * Replicate/fal ise kullanici "referans alani" kutusunu doldurmadiysa hicbir
 * sey gondermiyordu. Istek yine de BASARILI donuyordu, yani kullanici yuz
 * kilidini actigini saniyordu. Sessiz basarisizlik.
 *
 * Artik durum UC DEGERLI ve calisma zamaninda kullanicinin ayarina bakilarak
 * hesaplaniyor. Hem uretim akisi (server.generateScene), hem paneldeki uyari,
 * hem karsilastirma tablosu bu tek fonksiyonu cagirir.
 *
 *   'none'         -> platform referans kabul etmiyor
 *   'needs-config' -> kabul ediyor ama BU AYARLA gonderilmiyor
 *   'ready'        -> gercekten gonderilecek
 */
function referenceState(spec, config = {}) {
  const mode = spec.referenceMode || (spec.supportsReference ? 'needs-config' : 'none');

  if (mode === 'none') {
    return {
      state: 'none',
      reason: 'Bu platform referans gorsel kabul etmiyor - yuz yalnizca metinle ve seed ile tutuluyor.',
      fix: null,
    };
  }

  if (mode === 'auto') {
    return { state: 'ready', reason: null, fix: null };
  }

  // needs-config: saglayici kendi hazirlik testini yapar.
  // Testi TANIMLI DEGILSE hazir SAYILMAZ - yanlis yapilandirma asla
  // "yuz kilidi acik" gibi gorunmemeli.
  const hazir = typeof spec.referenceReady === 'function'
    ? !!spec.referenceReady(config || {})
    : false;

  if (hazir) return { state: 'ready', reason: null, fix: null };

  return {
    state: 'needs-config',
    reason: spec.referenceNotReadyReason || 'Referans gorsel gonderilebilmesi icin ek ayar gerekiyor.',
    fix: spec.referenceFixHint || null,
  };
}

function get(id) {
  return REGISTRY.find((p) => p.id === id) || manual;
}

const helpers = require('./helpers');

module.exports = { list, get, REGISTRY, helpers, referenceState };
