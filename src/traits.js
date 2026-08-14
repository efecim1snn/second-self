'use strict';

/**
 * AYIRT EDICI OZELLIKLER ve RISK SEVIYELERI
 *
 * Her ozellik gorsel modellerinde ayni kararlilikta uretilmez. Kullanicinin
 * bunu SECMEDEN once bilmesi gerekir - o yuzden risk ve uyari metni
 * ozellikle birlikte duruyor.
 *
 * DOVME ve CIL BILEREK KALDIRILDI (geri ekleme).
 * Gercek uretim testlerinde ikisi de tutarliligi gorunur sekilde bozdu:
 * dovme deseni her karede farkli cikti, cil yogunlugu kaydi ve uzak
 * cekimlerde lekeye dondu. Ustelik model bunlari ISTENMEDEN de ekliyordu -
 * bu yuzden artik NEGATIF listeye yaziliyorlar (bkz. promptcraft.NEGATIVE).
 *
 * risk: 'yuksek' | 'orta' | 'dusuk'
 * en  : prompt'a giren Ingilizce tarif
 * note: panelde gosterilen uyari
 */

const DISTINCTIVE = [
  {
    value: 'Yok',
    en: '',
    risk: 'dusuk',
    note: 'En tutarli secim. Karakteri ayirt eden sey yuz hatlari ve sac olur.',
  },
  {
    value: 'Ben (yuzde)',
    en: 'a small beauty mark just above the lip',
    risk: 'orta',
    note: 'Benin yeri karelerde kayabilir (bazen diger yanaga geceр). Yakin planlarda kontrol et.',
  },
  {
    value: 'Gozluk',
    en: 'thin round metal-framed glasses',
    risk: 'dusuk',
    note: 'Kararli calisir. Cerceve tipini prompt sabit tuttugu icin nadiren degisir.',
  },
  {
    value: 'Piercing (burun)',
    en: 'a tiny nose stud',
    risk: 'orta',
    note: 'Bazen kaybolur, bazen taraf degistirir. Yakin planlarda kontrol gerekir.',
  },
  {
    value: 'Piercing (kulak)',
    en: 'stacked ear piercings',
    risk: 'orta',
    note: 'Kupe sayisi ve dizilimi karelerde degisir. Sac kulagi kapatiyorsa sorun cikmaz.',
  },
  {
    value: 'Belirgin kaslar',
    en: 'strong, well-defined eyebrows',
    risk: 'dusuk',
    note: 'Kararli calisir; kimligi guclendiren guvenli bir secim.',
  },
  {
    value: 'Gamze',
    en: 'dimples that appear when smiling',
    risk: 'dusuk',
    note: 'Sadece gulumseyen karelerde gorunur, riski dusuktur.',
  },
  {
    value: 'Heterokromi (farkli renkte gozler)',
    en: 'heterochromia, the left eye a clearly different colour from the right',
    risk: 'yuksek',
    note: 'Modeller bunu ya tamamen yok sayar ya da yanlis goze uygular. Her kareyi tek tek kontrol etmen gerekir.',
  },
  {
    value: 'Beyaz sac tutami',
    en: 'a single white streak in the front of the hair',
    risk: 'orta',
    note: 'Tutamin kalinligi ve yeri degisir; sac stili degisince tamamen kaybolabilir.',
  },
  {
    value: 'Sabit ince kolye',
    en: 'a signature thin gold chain necklace, always worn',
    risk: 'orta',
    note: 'Kolyenin bicimi karelerde degisir ama boyun hizasinda kaldigi icin goze az batar.',
  },
];

const BY_VALUE = new Map(DISTINCTIVE.map((d) => [d.value, d]));

function get(value) {
  return BY_VALUE.get(value) || null;
}

function options() {
  return DISTINCTIVE.map((d) => d.value);
}

/** Panelde risk rozeti gostermek icin sade liste. */
function meta() {
  return DISTINCTIVE.map(({ value, risk, note }) => ({ value, risk, note }));
}

/** Secilen ozelliklerin Ingilizce tariflerini dondurur. */
function describe(values) {
  return (values || [])
    .map((v) => (get(v) || {}).en)
    .filter(Boolean);
}

/**
 * Bas-omuz kadrajinda gorunebilen ozellikler (vesikalik icin).
 * Su an listedeki her ozellik yuz/bas bolgesinde oldugu icin tamami gecerli;
 * ilerde govde seviyesinde bir ozellik eklenirse NOT_IN_HEADSHOT'a yaz -
 * yoksa model onu kadraja sigdirmaya calisip her karede farkli cizer.
 */
const NOT_IN_HEADSHOT = new Set([]);

function describeFacial(values) {
  return (values || [])
    .filter((v) => !NOT_IN_HEADSHOT.has(v))
    .map((v) => (get(v) || {}).en)
    .filter(Boolean);
}

/** Secilen ozellikler icinde riskli olanlar. */
function risks(values) {
  return (values || [])
    .map((v) => get(v))
    .filter((d) => d && d.risk !== 'dusuk' && d.value !== 'Yok')
    .map(({ value, risk, note }) => ({ value, risk, note }));
}

module.exports = { DISTINCTIVE, get, options, meta, describe, describeFacial, risks };
