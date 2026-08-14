'use strict';

/**
 * "Henuz API baglamadim" durumu.
 *
 * Bu otomasyon kendi basina gorsel URETMEZ. Hicbir stok gorsel de kullanmaz.
 * Bir uretim API'si baglanmadigi surece yapabilecegi tek sey, kusursuz
 * prompt'u hazirlayip eline vermektir. Gorsel istiyorsan bir platform bagla.
 */

module.exports = {
  id: 'manual',
  label: 'API YOK - sadece prompt ver',
  dialect: 'generic',
  docs: null,
  local: true,
  supportsReference: false,
  blurb: 'Hicbir uretim yapilmaz. Otomasyon prompt\'u hazirlar, sen kendi aracina yapistirirsin. Gorsel istiyorsan asagidakilerden birini bagla.',
  fields: [],

  async generate() {
    const err = new Error(
      'Bagli bir gorsel uretim API\'si yok. Bu otomasyon kendi basina gorsel uretmez ve stok gorsel kullanmaz. ' +
      'Ayarlar > Gorsel Uretim Saglayicisi bolumunden kullandigin platformu (Leonardo, OpenAI, Stability, Replicate, fal, ' +
      'yerel Stable Diffusion veya Ozel API) bagla; sonra tekrar dene.'
    );
    err.code = 'NO_PROVIDER';
    throw err;
  },
};
