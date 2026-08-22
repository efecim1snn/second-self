'use strict';

/**
 * SAHNE KUTUPHANESI
 *
 * NE OLDUGU
 * ---------------------------------------------------------------
 * YouMind OpenLab'in acik lisansli (MIT) prompt kutuphanesinden
 * TURETILMIS sahne tarifleri. Her kayit yedi alandan olusuyor:
 *   shot / pose / outfit / setting / props / lighting / mood
 * Yani promptcraft'in zaten bekledigi sahne nesnesiyle AYNI bicim.
 *
 * NE OLMADIGI - VE NEDEN
 * ---------------------------------------------------------------
 * Bu bir "hazir prompt listesi" DEGIL. Ham prompt metni urune hic
 * girmiyor: ne bu dosyaya, ne panele, ne scene.extra'ya.
 *
 * Sebep olculdu. Kaynaktaki promptlar KENDI insanlarini tarif ediyor
 * ("young East Asian woman with long wavy dark brown hair"). Ham
 * gonderilseydi kullanicinin kilitli karakteri her karede baska birine
 * donerdi - yani urunun tek vaadi kirilirdi.
 *
 * Ilk cozum denemesi de yetmedi: promptlarin bir kisminda
 * {argument name="subject"} yuvasi var ve oraya kimlik enjekte edilebiliyor.
 * Ama yuvasi olan 1.212 promptun %61'inde yuvanin DISINDA da kimlik tarifi
 * kaliyor. Gercek ornek, enjeksiyondan sonraki cikti:
 *
 *     "...24-year-old Japanese woman, SHOULDER-LENGTH STRAIGHT hair..."
 *     "...Her VERY LONG, WAVY hair is worn loose..."
 *
 * Iki rakip tarif; model gec geceni tercih ediyor. Temiz enjeksiyon
 * yalnizca 473 promptta mumkundu (%3).
 *
 * Bu yuzden kaynaktan kisi DEGIL sahne cikarildi. Kimlik her zaman ve
 * yalnizca promptcraft.physicalCore()'dan geliyor; kutuphanenin kimlik
 * alani YOK, dolayisiyla kilit yapisal olarak kirilamaz.
 *
 * ELEME
 * ---------------------------------------------------------------
 * 14.753 benzersiz kayittan 678'i kaldi. Elenenler: gercek kisi
 * gondermesi, yas sinyali, cinsellik, telifli karakter, cok kisili
 * kadraj, grid/kolaj, metin/logo talebi, yapisal hasat vermeyen duz
 * yazi, ve promptcraft'in NEGATIVE listesiyle celisen kayitlar.
 *
 * LISANS: MIT. Bkz. THIRD_PARTY_LICENSES.md ve LICENSE.upstream.
 * Kaynak gorseller (sourceMedia) ALINMADI - onlar ucuncu kisilerin
 * uretimleri ve MIT metni onlari kapsamiyor.
 */

const paket = require('./sahneler.json');

const ALANLAR = ['shot', 'pose', 'outfit', 'setting', 'props', 'lighting', 'mood'];

/**
 * Turkce arama icin kucuk bir esleme.
 *
 * Kayitlar Ingilizce (prompt'a oyle girecekler), kullanici Turkce ariyor.
 * Tam bir sozluk kurmak yerine yalnizca ETIKET adlari ve en sik gecen
 * mekan/isik kelimeleri esleniyor - cipler zaten kapali kume oldugu icin
 * asil gezinme oradan yapiliyor, bu yalnizca serbest arama icin yardimci.
 */
const TR_EN = {
  kar: 'snow', kis: 'winter', yaz: 'summer', yagmur: 'rain', gece: 'night',
  gunduz: 'day', sabah: 'morning', aksam: 'evening', deniz: 'sea', plaj: 'beach',
  orman: 'forest', park: 'park', bahce: 'garden', sokak: 'street', sehir: 'city',
  ev: 'home', oda: 'room', mutfak: 'kitchen', yatak: 'bed', banyo: 'bathroom',
  kafe: 'cafe', kahve: 'coffee', restoran: 'restaurant', bar: 'bar',
  stüdyo: 'studio', studyo: 'studio', araba: 'car', tren: 'train', yol: 'road',
  magaza: 'store', pazar: 'market', balkon: 'balcony', cati: 'rooftop',
  ayna: 'mirror', pencere: 'window', isik: 'light', gunes: 'sun', golge: 'shadow',
  neon: 'neon', dogal: 'natural', yumusak: 'soft', sert: 'hard', sicak: 'warm',
  soguk: 'cool', spor: 'gym', kitap: 'book', cicek: 'flower', kopek: 'dog',
  kedi: 'cat', muzik: 'music', dans: 'dance', yemek: 'food',
};

function normalize(s) {
  return String(s || '').toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .trim();
}

/** Kaydin aranabilir metni. */
function metinOf(kayit) {
  return ALANLAR.map((a) => kayit[a]).filter(Boolean).join(' ').toLowerCase();
}

/**
 * Kutuphanede arar.
 * @param {object} secenek { sorgu, etiket, limit, atla }
 */
function ara({ sorgu = '', etiket = '', limit = 24, atla = 0 } = {}) {
  let liste = paket.kayitlar;

  if (etiket) liste = liste.filter((k) => (k.e || []).includes(etiket));

  const q = normalize(sorgu);
  if (q) {
    /* KELIME SINIRIYLA ARA, ALT DIZEYLE DEGIL.
     *
     * Ilk surum `metin.includes(terim)` kullaniyordu ve sonuclar yanlisti:
     *   "deniz" -> TR_EN 'sea' -> "leather SEAT" eslesiyordu (oyuncu koltugu)
     *   "kar"   -> "dARK", "mARKet" icinde geciyordu
     * Turkce kisa kelimeler Ingilizce metinde surekli alt dize olarak
     * bulunuyor. Kelime siniri bunu kapatiyor. */
    const parcalar = q.split(/\s+/).filter(Boolean);
    const terimler = parcalar.flatMap((p) => (TR_EN[p] ? [p, TR_EN[p]] : [p]));
    /* Sondaki sinir da SART. Yalnizca basa \b koymak yetmedi:
     *   "deniz" -> 'sea' -> "SEAted on the floor" eslesiyordu.
     * Tam kelime + yaygin cekim eki (s/es/ing/ed) kabul ediliyor;
     * boylece "night" hem "night" hem "nights" bulur ama "sea"
     * "seated"i bulmaz. */
    const desenler = terimler.map((t) => new RegExp(
      `\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es|ing|ed)?\\b`, 'i'
    ));
    liste = liste.filter((k) => {
      const m = metinOf(k);
      return desenler.some((re) => re.test(m));
    });
  }

  return {
    toplam: liste.length,
    kayitlar: liste.slice(atla, atla + limit),
  };
}

/**
 * Kutuphane kaydini promptcraft'in bekledigi sahne nesnesine cevirir.
 *
 * `extra` HER ZAMAN bos - kutuphaneden serbest metin gecirilmiyor.
 * `category: 'library'` panelin ve testin bu sahneyi taniyabilmesi icin.
 */
function sahneYap(kayit, { aspect = 'post' } = {}) {
  if (!kayit) return null;
  return {
    id: `lib_${kayit.i}`,
    category: 'library',
    categoryLabel: 'Sahne kutuphanesi',
    shot: kayit.shot || 'half body shot',
    pose: kayit.pose || '',
    outfit: kayit.outfit || '',
    setting: kayit.setting || '',
    props: kayit.props || '',
    lighting: kayit.lighting || '',
    mood: kayit.mood || '',
    aspect,
    style: 'photo',
    extra: '',
  };
}

/** id ile tek kayit. */
function bul(i) {
  return paket.kayitlar.find((k) => k.i === Number(i)) || null;
}

/**
 * KABUL KAPISI - test bunu kullaniyor.
 * Bir kaydin urune girmeye uygun olup olmadigini bagimsizca dogrular.
 * Hasat betiginden AYRI liste kullaniyor: ayni listeyle hem temizleyip
 * hem denetlersek tanim geregi sifir hata olceriz.
 */
const KIMLIK_PROBU = /\b(hair|hairstyle|blonde|brunette|redhead|eyes?|eyed|skin|complexion|freckles?|asian|caucasian|african|latina|hispanic|european|slim|slender|curvy|petite|muscular|\d{2}[- ]year[- ]old|woman|man|girl|boy|person|face|facial|lips|makeup|beard|tattoo|her|his|she|he)\b/i;
const YASAK_PROBU = /\b(celebrit|cosplay|lookalike|resembling|bikini|lingerie|nude|topless|corset|latex|child|toddler|schoolgirl|teenage|disney|marvel|pokemon|ghibli|barbie)\w*/i;

function denetle(kayit) {
  const sorunlar = [];
  const metin = ALANLAR.map((a) => kayit[a]).filter(Boolean).join(' ');

  if (KIMLIK_PROBU.test(metin)) sorunlar.push(`kimlik izi: ${metin.match(KIMLIK_PROBU)[0]}`);
  if (YASAK_PROBU.test(metin)) sorunlar.push(`yasak icerik: ${metin.match(YASAK_PROBU)[0]}`);
  if (/https?:\/\//.test(metin)) sorunlar.push('baglanti iceriyor');
  if (/[{}[\]]/.test(metin)) sorunlar.push('sablon kalintisi');
  for (const a of ALANLAR) {
    if (kayit[a] && kayit[a].length > 160) sorunlar.push(`${a} 160 karakteri asiyor`);
  }
  const dolu = ALANLAR.filter((a) => kayit[a]).length;
  if (dolu < 3) sorunlar.push(`yalnizca ${dolu} alan dolu`);

  return sorunlar;
}

function etiketler() {
  return paket.etiketler;
}

function bilgi() {
  return { ...paket.kaynak, kayit: paket.kayitlar.length };
}

module.exports = { ara, bul, sahneYap, denetle, etiketler, bilgi, ALANLAR, TR_EN };
