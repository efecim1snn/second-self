'use strict';

/**
 * FOTOROMAN - DIYALOG MOTORU
 *
 * NE ISE YARAR, NE ISE YARAMAZ
 * -----------------------------------------
 * Bu motor hikayeni YAZMAZ. Hicbir sablon, kullanicinin aklindaki
 * hikayeyi bilemez. Yaptigi sey: her kareye dogru TURDE ve dogru
 * AGIRLIKTA bir baslangic replikligi koymak - kullanici uzerine yazsin
 * diye. Paneldeki her balon duzenlenebilir; buradan cikan metin bir
 * teklif, sonuc degil.
 *
 * SESSIZ KARE BIR EKSIKLIK DEGIL
 * -----------------------------------------
 * Cizgi romanin ritmi konusma ile SESSIZLIGIN sirasindan cikar. Her
 * kareye balon koyan bir fotoroman yorucu okunur ve gorseli bogar.
 * Burada sessizlik bir olasilik degil, KURAL: kurulus ve kapanis
 * perdeleri cogunlukla sessiz veya anlatici kutusu kullanir.
 *
 * TEK ISTISNA: donus perdesi. Doruk nokta her zaman konusur - hikayenin
 * bedelini odedigi yer orasi. Kod bunu garanti ediyor (bkz. tipSec).
 *
 * BALON TURLERI
 *   anlatici  koseli kutu    - disaridan anlatim, zaman/yer gecisi
 *   konusma   oval + kuyruk  - karakter yuksek sesle soyluyor
 *   dusunce   bulut + kabarcik - ic ses
 *   null      sessiz kare
 */

const { makeRng, pick, shuffle } = require('../../rng');

/* --------------------------------------------------------------- ritim */

/**
 * Perde basina balon turu agirliklari.
 * Toplamlari 1 olmak zorunda degil - orantili secim yapiliyor.
 *
 * donus'te sessiz YOK: doruk noktasi konusmadan gecilmez.
 */
const RITIM = {
  kurulus: { anlatici: 4, dusunce: 2, konusma: 1, sessiz: 3 },
  kivilcim: { anlatici: 1, dusunce: 4, konusma: 3, sessiz: 2 },
  gerilim: { anlatici: 1, dusunce: 4, konusma: 4, sessiz: 2 },
  donus: { anlatici: 0, dusunce: 3, konusma: 7, sessiz: 0 },
  kapanis: { anlatici: 4, dusunce: 2, konusma: 2, sessiz: 3 },
};

/* ------------------------------------------------------------ anlatici */

/**
 * Anlatici kutulari perdeye gore, ture gore degil: disaridan anlatim
 * turden bagimsiz calisir ("O gun boyle basladi" her turde ise yarar).
 * {sehir} varsa doldurulur, yoksa cumle sehirsiz de dogru okunur.
 */
const ANLATICI = {
  kurulus: [
    'O gün her şey her zamanki gibi başlamıştı.',
    'Sıradan bir gündü. Öyle sanıyordu.',
    'Sabah, hiçbir şeyin değişmeyeceğine söz vermiş gibiydi.',
    'Her şey yerli yerindeydi.',
    'Böyle günler genelde sessiz geçerdi.',
    'Ve o an henüz hiçbir şey olmamıştı.',
  ],
  kivilcim: [
    'Sonra o şey oldu.',
    'İşte tam o anda.',
    'Bir şey değişmişti. Henüz ne olduğunu bilmiyordu.',
    'Bunu beklemiyordu.',
    'Ve gün, olacağı yere döndü.',
    'O saniyeden sonrası başka bir gündü.',
  ],
  gerilim: [
    'Geri dönüşü olmayan yere gelmişti.',
    'Zaman ağırlaşmıştı.',
    'Kaçacak bir yer yoktu.',
    'Ne yapsa yanlış görünüyordu.',
    'İçeride bir şey kopmak üzereydi.',
    'Ve hâlâ bir çıkış arıyordu.',
  ],
  donus: [
    'Sonunda.',
    'Ve karar verdi.',
    'İşte tam burasıydı.',
    'Artık saklanacak bir şey kalmamıştı.',
  ],
  kapanis: [
    'Sonrası mı? Sonrası daha sakindi.',
    'O gün böyle bitti.',
    'Bazı şeyler söylendikten sonra hafifler.',
    'Ve hayat kaldığı yerden devam etti.',
    'Geriye sadece bu kaldı.',
    'Bundan sonrası başka bir hikâye.',
  ],
};

/* --------------------------------------------------------------- replik */

/**
 * Tur x perde repliği. konusma = yuksek sesle, dusunce = ic ses.
 *
 * Cumleler KISA tutuldu: konusma balonu kucuk bir alan, uzun cumle ya
 * balonu goruntunun yarisina cikarir ya da okunamayacak kadar kucuk
 * puntoya duser (bkz. tipografi.sigdir).
 */
const REPLIK = {
  gundelik: {
    kurulus: {
      konusma: ['Bugün erken çıkmam lazım.', 'Yine geç kaldım.', 'Kahve, sonra düşünürüz.'],
      dusunce: ['Bugün de aynı gün.', 'Bir şeyi unutuyorum ama ne?', 'Acelem yok. Olmamalı.'],
    },
    kivilcim: {
      konusma: ['Bu da neyin nesi?', 'Dur bir saniye.', 'Bunu ben mi bıraktım?'],
      dusunce: ['Bir dakika.', 'Bu burada olmamalıydı.', 'Yanlış gördüm herhâlde.'],
    },
    gerilim: {
      konusma: ['Bunu düşünmem lazım.', 'Şimdi ne yapacağım ben?', 'Bu kadar basit değil.'],
      dusunce: ['Neden hep aynı yerde takılıyorum?', 'Belki de mesele bu değildi.', 'Kendimi kandırıyorum.'],
    },
    donus: {
      konusma: ['Tamam. Yapıyorum.', 'Bu kadar. Yeter.', 'Bugün başlıyorum.'],
      dusunce: ['Aslında biliyordum.', 'Beklemenin anlamı yok.', 'Şimdi olmazsa hiç olmaz.'],
    },
    kapanis: {
      konusma: ['Fena değilmiş.', 'Yarın devam.', 'Gördün mü, olurmuş.'],
      dusunce: ['Bu kadarmış demek.', 'İyi ki.', 'Hafifledim.'],
    },
  },

  romantik: {
    kurulus: {
      konusma: ['Geldi mi acaba?', 'Erken geldim, olsun.', 'Sakin ol. Sadece konuşacaksın.'],
      dusunce: ['Ya gelmezse?', 'Bunu yüz kere prova ettim.', 'Kalbim neden bu kadar hızlı?'],
    },
    kivilcim: {
      konusma: ['Sen... geldin.', 'Merhaba.', 'Seni burada görmeyi beklemiyordum.'],
      dusunce: ['İşte orada.', 'Bütün cümleler uçtu gitti.', 'Bakma bana böyle.'],
    },
    gerilim: {
      konusma: ['Söylemem gereken bir şey var.', 'Böyle devam edemem.', 'Nereden başlasam bilmiyorum.'],
      dusunce: ['Söyle işte. Söyle.', 'Bir şey dersem her şey değişecek.', 'Susarsam da değişecek.'],
    },
    donus: {
      konusma: ['Seni seviyorum. Uzun zamandır.', 'Bunu bilmeni istedim.', 'Daha fazla saklayamıyorum.'],
      dusunce: ['Söyledim. Sonunda söyledim.', 'Ne olursa olsun.', 'Artık onun elinde.'],
    },
    kapanis: {
      konusma: ['Yürüyelim mi?', 'Bunu daha önce söylemeliydim.', 'İyi ki geldin.'],
      dusunce: ['Böyle olacağını bilmiyordum.', 'Korktuğum şey buydu demek.', 'Değdi.'],
    },
  },

  gerilim: {
    kurulus: {
      konusma: ['Kimse yok mu?', 'Burada olmamam lazım.', 'Sadece bakıp çıkacağım.'],
      dusunce: ['Burası fazla sessiz.', 'Bir terslik var.', 'Çabuk ol.'],
    },
    kivilcim: {
      konusma: ['Kim var orada?', 'Duydun mu sen de?', 'Çık ortaya.'],
      dusunce: ['Bu ses neydi?', 'Yalnız değilim.', 'Kıpırdama.'],
    },
    gerilim: {
      konusma: ['Yaklaşma.', 'Ne istiyorsun?', 'Bırak beni.'],
      dusunce: ['Nefes alma.', 'Kapıya kadar dayan.', 'Beni duyuyor.'],
    },
    donus: {
      konusma: ['Yeter artık!', 'Kaçmayacağım.', 'Gel o zaman.'],
      dusunce: ['Korkmaktan yoruldum.', 'Bu sefer ben varım.', 'Bitiyor. Şimdi.'],
    },
    kapanis: {
      konusma: ['Bitti.', 'Buradan gidelim.', 'Kimse bana inanmayacak.'],
      dusunce: ['Hâlâ titriyorum.', 'Sağ çıktım.', 'Bir daha asla.'],
    },
  },

  gizem: {
    kurulus: {
      konusma: ['Bir şey atlıyorum.', 'Baştan bakalım.', 'Bu tarih doğru değil.'],
      dusunce: ['Burada bir şey var.', 'Sırayla. Acele etme.', 'Biri bunu böyle bırakmış.'],
    },
    kivilcim: {
      konusma: ['Dur. Bu ne?', 'Bu ikisi aynı değil.', 'Kim yazmış bunu?'],
      dusunce: ['İşte bu.', 'Nasıl görmedim?', 'Buradaymış.'],
    },
    gerilim: {
      konusma: ['Bir yerde hata yapıyorum.', 'Hepsi birbirini tutmuyor.', 'Bana yalan söylenmiş.'],
      dusunce: ['Parçalar oturmuyor.', 'Yanlış soruyu soruyorum.', 'Cevap gözümün önünde.'],
    },
    donus: {
      konusma: ['Anladım.', 'Baştan beri yanlış yerde arıyormuşum.', 'O değilmiş.'],
      dusunce: ['Hepsi yerine oturdu.', 'Demek buymuş.', 'Çok geç kalmadım umarım.'],
    },
    kapanis: {
      konusma: ['Dosyayı kapatıyorum.', 'Gerisi beni ilgilendirmiyor.', 'Bu kadarı yeter.'],
      dusunce: ['Bazı cevaplar soruyu aratıyor.', 'Bildiğim iyi mi oldu?', 'Bitti sayılır.'],
    },
  },

  komedi: {
    kurulus: {
      konusma: ['Bu iş bende.', 'Kolay. İzle sadece.', 'Planım kusursuz.'],
      dusunce: ['Bugün benim günüm.', 'Ne olabilir ki?', 'Bunu daha önce yaptım. Sayılır.'],
    },
    kivilcim: {
      konusma: ['Yok yok yok.', 'Ben yapmadım.', 'Bu böyle olmayacaktı.'],
      dusunce: ['Eyvah.', 'Gören oldu mu?', 'Tamam sakin, çözülür.'],
    },
    gerilim: {
      konusma: ['Hallederim, hallederim!', 'Bakma oraya!', 'Aslında çok mantıklı bir açıklaması var.'],
      dusunce: ['Daha kötü olamazdı.', 'Oldu.', 'Neden hep ben?'],
    },
    donus: {
      konusma: ['Tamam. Ben yaptım.', 'Pes ediyorum.', 'Şerefsizim bilerek yapmadım.'],
      dusunce: ['Bitti benim işim.', 'Gülmemem lazım. Gülmemem lazım.', 'Aslında komik.'],
    },
    kapanis: {
      konusma: ['Hiçbir şey olmadı.', 'Ben yokum bu işte.', 'Gördüğünüz gibi kontrol bende.'],
      dusunce: ['Kimse öğrenmeyecek.', 'Bir dahakine daha iyi.', 'Yine de eğlenceliydi.'],
    },
  },

  dram: {
    kurulus: {
      konusma: ['Bugün konuşmak istemiyorum.', 'İyiyim ben.', 'Sonra anlatırım.'],
      dusunce: ['Yine aynı oda.', 'Ne kadar oldu?', 'Kimseye söylemedim.'],
    },
    kivilcim: {
      konusma: ['Sen ne zaman geldin?', 'Görmedim seni.', 'Bir şey yok.'],
      dusunce: ['Görmesin.', 'Şimdi olmaz.', 'Yüzümü toparla.'],
    },
    gerilim: {
      konusma: ['Anlamıyorsun.', 'Ben de denedim!', 'Bana bunu sen soramazsın.'],
      dusunce: ['Bağırmasam patlayacağım.', 'Haklı. En kötüsü bu.', 'Çıkmam lazım buradan.'],
    },
    donus: {
      konusma: ['Bunu ilk defa söylüyorum.', 'Yoruldum artık.', 'Yardım et bana.'],
      dusunce: ['Söyledim işte.', 'Tuttuğum şey bu kadar ağırmış.', 'Ağlamak da varmış.'],
    },
    kapanis: {
      konusma: ['Şimdi daha iyiyim.', 'Teşekkür ederim.', 'Kalabilir miyim biraz?'],
      dusunce: ['Oda aynı oda değil artık.', 'Nefes alabiliyorum.', 'Yarın daha kolay olur.'],
    },
  },
};

/* --------------------------------------------------------------- secim */

/**
 * Agirlikli secim. RITIM tablosundaki paylara gore bir tur dondurur.
 * Toplam sifirsa (olmamali) sessiz doner.
 */
function agirlikliSec(agirliklar, next) {
  const girisler = Object.entries(agirliklar).filter(([, w]) => w > 0);
  const toplam = girisler.reduce((s, [, w]) => s + w, 0);
  if (!toplam) return 'sessiz';
  let esik = next() * toplam;
  for (const [tip, w] of girisler) {
    esik -= w;
    if (esik <= 0) return tip;
  }
  return girisler[girisler.length - 1][0];
}

/**
 * Balon turunu secer ve UST USTE AYNI TURU engeller.
 *
 * Ust uste uc konusma balonu sayfayi tek sesli yapiyor, ust uste uc
 * sessiz kare ise hikayeyi durduruyor. Ikiden fazlasi tekrarlanmiyor.
 */
function tipSec(perdeKey, oncekiler, next) {
  const agirliklar = { ...(RITIM[perdeKey] || RITIM.kurulus) };

  const son = oncekiler.slice(-2);
  if (son.length === 2 && son[0] === son[1] && agirliklar[son[0]] != null) {
    // Ayni tur pes pese iki kez ciktiysa ucuncuye sansi kalmasin.
    const digerToplam = Object.entries(agirliklar)
      .filter(([t]) => t !== son[0]).reduce((s, [, w]) => s + w, 0);
    if (digerToplam > 0) agirliklar[son[0]] = 0;
  }

  return agirlikliSec(agirliklar, next);
}

/* ---------------------------------------------------------------- kur */

/**
 * Hikayenin karelerine balon ekler.
 *
 * @param {object} character
 * @param {object} hikaye   hikaye.kur() ciktisi
 * @param {object} ayar     { tohum }
 * @returns {object}        ayni hikaye nesnesi, karelerinde `balon` alani ile
 *
 * Hikaye nesnesini BOZMAZ - kopyasini dondurur, cunku panel onizlemede
 * ayni hikaye icin farkli diyalog denemek isteyebiliyor.
 */
function kur(character, hikaye, ayar = {}) {
  const turKey = REPLIK[hikaye.tur] ? hikaye.tur : 'gundelik';
  const sehir = (character && character.life && character.life.cityName) || '';

  const rng = makeRng([
    (character && character.characterId) || 'anon',
    turKey, hikaye.kareler.length, ayar.tohum || 0, 'diyalog',
  ]);

  // Her tur/perde/tip icin karistirilmis kuyruk - ayni replik tekrarlanmasin.
  const kuyruklar = {};
  function replikAl(perdeKey, tip) {
    const anahtar = `${perdeKey}|${tip}`;
    if (!kuyruklar[anahtar] || !kuyruklar[anahtar].length) {
      const havuz = tip === 'anlatici'
        ? (ANLATICI[perdeKey] || ANLATICI.kurulus)
        : ((REPLIK[turKey][perdeKey] || {})[tip] || []);
      if (!havuz.length) return '';
      kuyruklar[anahtar] = shuffle(havuz, rng);
    }
    return kuyruklar[anahtar].shift();
  }

  const gecmis = [];
  const kareler = hikaye.kareler.map((kare) => {
    const tip = tipSec(kare.perde, gecmis, rng);
    gecmis.push(tip);

    if (tip === 'sessiz') return { ...kare, balon: null };

    let metin = replikAl(kare.perde, tip);
    if (!metin) return { ...kare, balon: null };
    metin = metin.replace(/\{sehir\}/g, sehir);

    return { ...kare, balon: { tip, metin } };
  });

  return { ...hikaye, kareler };
}

/** Panelin balon turu secicisi icin. */
function tipler() {
  return [
    { key: 'konusma', label: 'Konusma balonu' },
    { key: 'dusunce', label: 'Dusunce balonu' },
    { key: 'anlatici', label: 'Anlatici kutusu' },
    { key: 'sessiz', label: 'Sessiz kare' },
  ];
}

module.exports = { kur, tipler, RITIM, ANLATICI, REPLIK };
