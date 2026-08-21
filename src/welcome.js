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
  title: 'Hos geldin - once bu arac ne yapiyor',
  body: [
    // DIKKAT: burada "gorseli uretir" YAZMAZ. Onceki surumde oyle yaziyordu ve
    // README'nin en kalin uyarisiyla ("bu otomasyon gorselin kendisini
    // URETMEZ") dogrudan celisiyordu. Ilk ekranda soylenen sey, urunun
    // temel kuraliyla ayni olmali.
    'Second Self sifirdan sanal bir insan yaratir ve kimligini kilitler: yuzu, hayati, sehri, rutini. Sonra ondan is istersin - "kahve reklami yap", "sokakta kombin cekimi" - ve her karede AYNI kisiyi uretecek prompt\'u kurar.',
    'GORSELI KENDISI URETMEZ ve stok gorsel icermez. Gorsel her zaman senin bagladigin API\'den gelir; varsayilan Pollinations ucretsiz ve anahtarsizdir.',
    'Ayrica iki panel daha var ve ikisi de yapay zeka GEREKTIRMEZ: Etsy POD (baskiya hazir tasarim + listeleme metni + listeleme gorseli) ve Reklam/Grafik Tasarim.',
    'Kurulum sirasi ve neyin zorunlu neyin istege bagli oldugu README\'de yaziyor. Su an hicbir sey ayarlamadan devam edebilirsin.',
  ],
  // vidIQ onerisi urun anlatimindan SONRA geliyor. Ilk ekranda ucuncu taraf
  // reklami gormek, urunun ne oldugunu ogrenmeden once yanlis izlenim veriyordu.
  question: 'Ne uretecegini bulmak icin veri lazim - vidIQ kullaniyor musun?',
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
