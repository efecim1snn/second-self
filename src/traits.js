'use strict';

/**
 * AYIRT EDICI OZELLIKLER ve RISK SEVIYELERI
 *
 * Her ozellik gorsel modellerinde ayni kararlilikta uretilmez. Bazilari
 * (dovme, yogun cil) her karede degisir ve tutarliligi gorunur sekilde bozar.
 * Kullanicinin bunu SECMEDEN once bilmesi gerekir - o yuzden risk ve uyari
 * metni ozellikle birlikte duruyor.
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
    value: 'Ciller (hafif)',
    en: 'a light dusting of freckles across the nose and cheeks',
    risk: 'orta',
    note: 'Cil dagilimi her karede biraz degisir. Hafif cil, yogun cile gore cok daha kararli durur.',
  },
  {
    value: 'Ciller (yogun)',
    en: 'dense freckles covering the nose, cheeks and forehead',
    risk: 'yuksek',
    note: 'Yogun cil hatayi ciddi artirir: yogunluk ve desen her karede degisir, uzak cekimlerde leke gibi gorunur. Yakin plan agirlikli calisacaksan tercih et.',
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
    value: 'Dovme (bilek)',
    en: 'a small fine-line tattoo on the inner wrist',
    risk: 'yuksek',
    note: 'DOVME EN COK HATA URETEN OZELLIKTIR. Yapay zeka ayni deseni iki kez uretemez - her karede farkli cikar ve izleyen bunu hemen fark eder. Kullanacaksan kucuk ve basit tut.',
  },
  {
    value: 'Dovme (kol)',
    en: 'a fine-line tattoo on the forearm',
    risk: 'yuksek',
    note: 'DOVME EN COK HATA URETEN OZELLIKTIR. Desen her karede degisir. Kolun gorundugu her karede farkli bir dovme cikacagini bil; cogu karede kiyafetle kapatmak en pratik cozum.',
  },
  {
    value: 'Dovme (boyun)',
    en: 'a small tattoo on the side of the neck',
    risk: 'yuksek',
    note: 'DOVME EN COK HATA URETEN OZELLIKTIR. Boyun dovmesi neredeyse her karede gorunur oldugu icin tutarsizlik en cok burada goze batar. Onerilmez.',
  },
  {
    value: 'Dovme (sirt)',
    en: 'a tattoo across the upper back',
    risk: 'yuksek',
    note: 'DOVME EN COK HATA URETEN OZELLIKTIR. Sirt dovmesi sadece bazi karelerde gorundugu icin boyun/koldan daha az risklidir ama yine de her seferinde farkli cikar.',
  },
  {
    value: 'Dovme (parmak)',
    en: 'tiny minimalist tattoos on two fingers',
    risk: 'yuksek',
    note: 'Cift risk: hem dovme degisir hem eller zaten yapay zekanin en zayif oldugu yerdir. Kacinmani oneririm.',
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
 * Yalnizca bas-omuz kadrajinda GORUNEBILEN ozellikler.
 * Vesikalikta bilek/kol/sirt dovmesi gorunmez; prompt'ta birakilirsa model
 * onu omuza/boyna uydurmaya calisir ve her karede farkli bir dovme cizer.
 */
const NOT_IN_HEADSHOT = new Set([
  'Dovme (bilek)', 'Dovme (kol)', 'Dovme (sirt)', 'Dovme (parmak)',
]);

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

function hasTattoo(values) {
  return (values || []).some((v) => v.startsWith('Dovme'));
}

function hasFreckles(values) {
  return (values || []).some((v) => v.startsWith('Ciller'));
}

module.exports = { DISTINCTIVE, get, options, meta, describe, describeFacial, risks, hasTattoo, hasFreckles };
