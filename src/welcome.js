'use strict';

/**
 * KARSILAMA EKRANI
 *
 * Otomasyon ilk kez acildiginda bir kez gosterilir, sonra bir daha cikmaz.
 * Amaci: karakteri yaratmadan once "ne ureteceksin" sorusuna veri
 * bulabilecegi bir yer gostermek.
 *
 * ONEMLI: bu ekran otomasyonu ENGELLEMEZ. "Simdilik gec" tek tikla gecilir,
 * hicbir ozellik kilitli degildir, hicbir yere kayit gerekmez. Bagli link
 * bir referans (affiliate) linkidir ve bu acikca yazilidir - gizlenmis
 * affiliate linki hem kullaniciya hem projeye zarar verir.
 */

const VIDIQ_URL = 'https://www.vidiq.com/efecim';

const WELCOME = {
  id: 'vidiq',
  title: 'Baslamadan once: ne uretecegini nereden bileceksin?',
  body: [
    'Second Self karakteri yaratir ve gorseli uretir. Ama "hangi icerik tutar" sorusunun cevabi bu araçta yok - o veriyle gelir.',
    'Bunun icin vidIQ kullaniyoruz: nisinde normalin kat kat ustunde etkilesim almis Instagram Reels ve TikTok videolarini bulup kancasini sokmeye yariyor. Yani sahneyi tahminle degil, patlamis orneklere bakarak seciyorsun.',
  ],
  question: 'vidIQ kullaniyor musun?',
  options: [
    { key: 'var', label: 'Evet, kullaniyorum' },
    { key: 'yok', label: 'Hayir, bakayim' },
    { key: 'gec', label: 'Simdilik gec' },
  ],
  // "yok" secilirse gosterilen
  offer: {
    text: 'Ucretsiz surumu de var. Ucretli surumu genelde ilk ay 1 $ kampanyasiyla deneniyor; guncel kampanyayi linkte gorursun.',
    url: VIDIQ_URL,
    linkLabel: 'vidiq.com/efecim',
    disclosure: 'Bu bir referans (affiliate) linkidir - buradan kayit olursan bu projeye katkisi olur. Otomasyonun hicbir ozelligi buna bagli degil; "Simdilik gec" dersen her sey aynen calisir.',
  },
  usedFor: [
    'Nisindeki patlamis Reels/TikTok videolarini bulmak',
    'Hangi kancanin tuttugunu gormek',
    'Rakip hesaplarin hangi icerikte buyudugunu olcmek',
    'Kendi hesabinin verisini takip etmek',
  ],
};

module.exports = { WELCOME, VIDIQ_URL };
