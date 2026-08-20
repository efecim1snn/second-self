'use strict';

/** Buyutme kapali. Uretilen kare oldugu gibi kalir. */
module.exports = {
  id: 'none',
  label: 'Kapali - buyutme yapma',
  blurb: 'Uretilen kare oldugu gibi kaydedilir. Ucretsiz saglayici ~686x858 donduruyor; Instagram 1080 istiyor, yani yuklerken yumusayacak.',
  needs: '-',
  free: true,
  local: true,
  maxScale: 1,
  fields: [],
  async upscale({ buffer }) {
    return { buffer, skipped: true };
  },
};
