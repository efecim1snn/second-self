'use strict';

/**
 * KARAKTER STUDYOSU - projenin ilk ve ana sistemi.
 *
 * Sifirdan bir insan yaratir, kimligi kilitler, vesikalik seti cikarir ve
 * her karede ayni kisiyi ureten prompt'u bagli API'ye gonderir.
 *
 * Rotalari tarihsel olarak server.js icinde duruyor (/api/karakter,
 * /api/referans, /api/brief, /api/sahneler, /api/plan...). Calisan koda
 * dokunup risk almamak icin oldugu yerde birakildi; burada yalnizca
 * studyo kimligi tanimli. Yeni studyolar kendi rotalarini kendi
 * klasorlerinde tasir.
 */
module.exports = {
  id: 'karakter',
  label: 'Karakter Studyosu',
  icon: '🧬',
  tagline: 'Sifirdan bir insan yarat, kimligini kilitle, her karede ayni kisiyi uret.',
  needsProvider: true,
  legacy: true, // rotalari server.js'te
  tabs: [
    { id: 'dosya', label: 'Karakter dosyasi' },
    { id: 'vesikalik', label: 'Vesikalik' },
    { id: 'uretim', label: 'Uretim' },
    { id: 'plan', label: 'Haftalik plan' },
    { id: 'galeri', label: 'Galeri' },
  ],
  routes: {},
};
