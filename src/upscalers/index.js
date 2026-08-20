'use strict';

/**
 * BUYUTME (UPSCALE) KATMANI
 *
 * Saglayici deseninin ikizi: bu yazilim kendi basina buyutme YAPMAZ,
 * kullanicinin bagladigi araca gonderir.
 *
 * NEDEN GEREKLI
 * Difuzyon modelleri ~1 MP'de egitiliyor. Zorla daha buyuk isteyince anatomi
 * bozuluyor (ikinci kafa, ucuncu kol). Herkesin yaptigi sey ayni: once ~1 MP
 * uret, sonra buyut. Ustelik ucretsiz saglayici (Pollinations) istenen olcuyu
 * tamamen yok sayip ~686x858 donduruyor - bu Instagram'in istedigi 1080
 * pikselin ALTINDA, yuklerken yumusuyor. Yani buyutme "4K hevesi" degil,
 * temel kalite ihtiyaci.
 *
 * DURUST SINIR: 4K "uretmek" diye bir sey yok; 4K = uretim + buyutme.
 * Instagram akista zaten 1080'e dusuruyor - 4K yalnizca baski veya
 * agresif kirpma icin anlamli.
 */

const none = require('./none');
const automatic1111 = require('./automatic1111');
const replicate = require('./replicate');
const custom = require('./custom');

const REGISTRY = [none, automatic1111, replicate, custom];

function list() {
  return REGISTRY.map((u) => ({
    id: u.id,
    label: u.label,
    blurb: u.blurb,
    needs: u.needs,
    free: !!u.free,
    local: !!u.local,
    maxScale: u.maxScale,
    fields: (u.fields || []).map((f) => ({ ...f })),
  }));
}

function get(id) {
  return REGISTRY.find((u) => u.id === id) || none;
}

module.exports = { list, get, REGISTRY };
