'use strict';

/**
 * SAHNE KUTUPHANESI - KABUL KAPILARI
 *
 * Bu dosya bir SOZU teste bagliyor. Kutuphane bir kez temizlendi ama
 * kaynak gunde iki kez guncelleniyor; elle yapilan bir temizlik bir
 * sonraki senkronda sessizce geri sizar. Asagidaki uc kapi her calisan
 * icin ayni: sizarsa test kirmizi olur.
 *
 * Calistir:  node test/kutuphane.test.js
 * Sifir bagimlilik - test cercevesi yok, cikis kodu 0/1.
 */

const path = require('path');
const kutuphane = require(path.join(__dirname, '..', 'src', 'kutuphane'));
const promptcraft = require(path.join(__dirname, '..', 'src', 'promptcraft'));
const paket = require(path.join(__dirname, '..', 'src', 'kutuphane', 'sahneler.json'));

let hata = 0;
const bildir = (ad, gecti, detay) => {
  console.log(`  ${gecti ? 'OK  ' : 'HATA'}  ${ad}${detay ? `  -> ${detay}` : ''}`);
  if (!gecti) hata++;
};

console.log(`\nSAHNE KUTUPHANESI TESTI (${paket.kayitlar.length} kayit)\n`);

/* ─────────────────────────────────────────── 1. KIMLIK KAPISI */
console.log('1. Kimlik kapisi - hicbir alan kisi tarif etmemeli');
{
  const kotu = paket.kayitlar.filter((k) => kutuphane.denetle(k).length > 0);
  bildir('denetle() temiz', kotu.length === 0,
    kotu.length ? `${kotu.length} kayit: #${kotu[0].i} ${kutuphane.denetle(kotu[0]).join(', ')}` : '');
}

/* ──────────────────────────────── 2. NEGATIF CARPISMASI KAPISI */
console.log('\n2. Negatif carpismasi - kutuphane metni NEGATIVE listesini istememeli');
{
  const NEG = (promptcraft.NEGATIVE || []).filter((x) => x.length > 5);
  const carpisan = [];
  for (const k of paket.kayitlar) {
    const metin = kutuphane.ALANLAR.map((a) => k[a]).filter(Boolean).join(' ').toLowerCase();
    const n = NEG.find((x) => metin.includes(x.toLowerCase()));
    if (n) carpisan.push([k.i, n]);
  }
  bildir('carpisma yok', carpisan.length === 0,
    carpisan.length ? `${carpisan.length} kayit, ornek #${carpisan[0][0]} "${carpisan[0][1]}"` : '');
}

/* ───────────────────────────────────────────── 3. GORSEL KAPISI */
console.log('\n3. Gorsel kapisi - paket hicbir gorsel baglantisi tasimamali');
{
  const ham = JSON.stringify(paket);
  bildir('sourceMedia anahtari yok', !ham.includes('sourceMedia'));
  const httpVar = /"[^"]*https?:\/\/[^"]*"/.test(JSON.stringify(paket.kayitlar));
  bildir('kayitlarda http baglantisi yok', !httpVar);
}

/* ──────────────────── 4. KILIT KAPISI - gercek karakterle uctan uca */
console.log('\n4. Kilit kapisi - uretilen prompt kilitli kimligi bozmamali');
{
  let karakter = null;
  try {
    karakter = require(path.join(__dirname, '..', 'data', 'character.json'));
  } catch { /* karakter yoksa bu kapi atlanir */ }

  if (!karakter || !karakter.identity) {
    console.log('  ATLA  karakter yok (data/character.json) - bu kapi calistirilamadi');
  } else {
    const kimlik = promptcraft.identityLine(karakter.identity);
    /* Bagimsiz prob: hasat/denetle listelerinden AYRI tutuluyor.
     * Ayni listeyle hem temizleyip hem olcersek tanim geregi sifir
     * bulur ve hicbir sey ogrenmeyiz. */
    /* Prob YALNIZCA kisiye baglanabilecek ifadeleri arar.
     *
     * Ilk surumde "tall" ve "platinum" da vardi ve 25 yanlis pozitif
     * uretti: "tall grass", "tall hedge wall", "field of tall dry
     * grasses", "thin platinum choker". Hicbiri kisi tarifi degil.
     *
     * Ciplak sifat aramanin mantiksiz oldugunu 1. kapi zaten kanitliyor:
     * alanlarda hicbir kisi ismi/zamiri yok, yani "tall" sifatinin
     * baglanacagi bir insan da yok. Bu yuzden prob yalnizca ICINDE
     * beden/sac/goz ismi GECEN ifadeleri tutuyor. */
    const RAKIP = /\b(blonde|brunette|redhead|auburn hair|blue eyes|green eyes|hazel eyes|brown eyes|freckled face|olive skin|pale skin|tanned skin|curly hair|wavy hair|straight hair|long hair|short hair|petite frame|curvy figure|athletic build|slim build)\b/i;

    const bozan = [];
    for (const k of paket.kayitlar) {
      const sahne = kutuphane.sahneYap(k);
      const p = promptcraft.build(karakter, sahne, 'flux');
      // Kilitli kimlik satiri prompt'ta AYNEN olmali
      if (!p.prompt.includes(kimlik)) { bozan.push([k.i, 'kimlik satiri yok']); continue; }
      // Kutuphanenin kattigi metinde rakip tarif OLMAMALI
      const katki = kutuphane.ALANLAR.map((a) => k[a]).filter(Boolean).join(' ');
      const m = katki.match(RAKIP);
      if (m) bozan.push([k.i, `rakip tarif: ${m[0]}`]);
    }
    bildir(`${paket.kayitlar.length} kayit x gercek karakter`, bozan.length === 0,
      bozan.length ? `${bozan.length} kayit, ornek #${bozan[0][0]} ${bozan[0][1]}` : '');
  }
}

/* ───────────────────────────────────────── 5. ARAMA SAGLIGI */
console.log('\n5. Arama - Turkce sorgu alakali sonuc dondurmeli');
{
  const BEKLENEN = {
    kar: /snow|winter/i, kafe: /cafe|coffee/i, ayna: /mirror/i,
    deniz: /\bsea\b|ocean|coastal/i, mutfak: /kitchen/i, gece: /night/i,
  };
  let yanlis = 0;
  for (const [q, bek] of Object.entries(BEKLENEN)) {
    const r = kutuphane.ara({ sorgu: q, limit: 1 });
    const ilk = r.kayitlar[0];
    const metin = ilk ? kutuphane.ALANLAR.map((a) => ilk[a]).filter(Boolean).join(' ') : '';
    if (!ilk || !bek.test(metin)) yanlis++;
  }
  bildir('ilk sonuclar alakali', yanlis === 0, yanlis ? `${yanlis} sorgu alakasiz` : '');
}

/* ───────────────────────────────────── 6. SAHNE SOZLESMESI */
console.log('\n6. Sahne sozlesmesi - sahneYap() promptcraft ile uyumlu olmali');
{
  const s = kutuphane.sahneYap(paket.kayitlar[0]);
  bildir('extra bos', s.extra === '');
  bildir('category = library', s.category === 'library');
  bildir('style = photo', s.style === 'photo');
  bildir('shot dolu', !!s.shot);
}

console.log(`\n${hata === 0 ? 'TUM KAPILAR GECTI' : `${hata} KAPI KIRMIZI`}\n`);
process.exit(hata === 0 ? 0 : 1);
