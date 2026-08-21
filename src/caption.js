'use strict';

/**
 * GONDERI METNI (CAPTION) MOTORU
 *
 * NE URETIR: metin. Gorsel DEGIL.
 * Bu otomasyonun degismez kurali "kendi basina gorsel uretmez" - o kural
 * gorsel icindir ve burada gecerliligini korur. Metin yerel uretilir; harici
 * bir LLM'e, API'ye veya krediye ihtiyac YOKTUR.
 *
 * NEDEN VAR: persona.build() karaktere bir ses rehberi uretiyordu
 * (openers, ctaStyle, emojiStyle, avoid, sentenceLength) ama bu ciktiyi
 * hicbir yer tuketmiyordu. Karakterin sesi vardi, konusmuyordu.
 *
 * DETERMINIZM: ayni karakter + ayni sahne + ayni platform + ayni varyant
 * numarasi -> BIREBIR ayni metin. Tohum karakterin seed'inden turer.
 *
 * ---------------------------------------------------------------------------
 * SLOT TUKETIM SIRASI - DEGISTIRME
 *
 * Asagidaki alti slot, rastgele sayiyi TAM OLARAK bu sirayla tuketir:
 *
 *     1. hook      2a. govde-A   2b. govde-B   3. detay
 *     4. cta       5. emoji      6. hashtag
 *
 * Araya yeni bir slot eklersen ya da sirayi degistirirsen ayni karakter ayni
 * sahnede FARKLI metin uretmeye baslar - yani "ayni girdi ayni cikti" sozu
 * sessizce bozulur. Yeni slot gerekiyorsa SONA ekle.
 * ---------------------------------------------------------------------------
 */

const { makeRng, pick, shuffle } = require('./rng');

/* ------------------------------------------------------------- platformlar */

/**
 * SOSYAL PLATFORMLAR.
 *
 * DIKKAT: promptcraft.js'teki DIALECTS ile karistirma. Orasi GORSEL MODELI
 * dili (midjourney/flux/sdxl...), burasi SOSYAL PLATFORM. Iki ayri kavram.
 */
const PLATFORMS = [
  {
    id: 'instagram',
    label: 'Instagram',
    max: 2200,
    hashtags: 8,
    emoji: 2,
    ctaForm: 'soru',
    lineBreaks: true,
    aspect: 'post',
    note: 'Ilk iki satir akista gorunur - kanca basta olmali.',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    max: 2200,
    visible: 150,
    hashtags: 5,
    emoji: 2,
    ctaForm: 'eylem',
    lineBreaks: false,
    aspect: 'story',
    note: 'Yaklasik 150 karakter gorunur, gerisi "daha fazla" arkasinda.',
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    max: 280,
    hard: true,
    hashtags: 2,
    emoji: 1,
    ctaForm: 'soru',
    lineBreaks: false,
    aspect: 'post',
    note: '280 karakter SERT sinir - metin otomatik kisaltilir.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    max: 3000,
    hashtags: 3,
    emoji: 0,
    ctaForm: 'eylem',
    lineBreaks: true,
    aspect: 'post',
    note: 'Emoji kullanilmaz, ton profesyonel.',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    max: 5000,
    hashtags: 3,
    emoji: 1,
    ctaForm: 'eylem',
    lineBreaks: true,
    aspect: 'wide',
    note: 'Aciklama alani; ilk satir arama sonucunda gorunur.',
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    max: 500,
    hashtags: 5,
    emoji: 1,
    ctaForm: 'eylem',
    lineBreaks: false,
    aspect: 'post',
    note: 'Arama motoru gibi calisir - tarif edici kelimeler ise yarar.',
  },
  {
    id: 'threads',
    label: 'Threads',
    max: 500,
    hashtags: 1,
    emoji: 2,
    ctaForm: 'soru',
    lineBreaks: true,
    aspect: 'post',
    note: 'Sohbet havasi; cok hashtag yadirganir.',
  },
];

const BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]));

/* ------------------------------------------------------------- kalip havuzu */

/*
 * OLCUM: onceki surumde 100 gonderide YALNIZCA 7 farkli govde cumlesi
 * cikiyordu, en siki olani 19 kez birebir tekrar ediyordu ve 5 kapanis vardi.
 * Daha kotusu: havuz bu kadar kucukken IKI FARKLI KARAKTER ayni cumleleri
 * paylasiyordu - yani araci kullanan iki ayri kisinin hesaplari metinden
 * birbirine baglanabilirdi.
 *
 * Cozum sayiyi buyutmek degil, CARPMAK: govde artik iki parcadan kuruluyor
 * (acilis + kapanis clause), yani 18 x 16 = 288 govde bilesimi. Kanca 20,
 * kapanis ailesi 14+14. Toplam bilesim ~80.000 mertebesinde.
 *
 * NOT: bu degisiklik deterministik ciktiyi BILEREK degistirir - ayni karakter
 * artik oncekinden farkli metin uretir. Tekrar sorunu kalitenin onunde
 * oldugu icin kabul edildi.
 */

/** Kanca kaliplari. {konu} sahneden, {sehir} karakterden gelir. */
const HOOKS = [
  'Bugun {konu}.',
  '{konu} derken aslinda ne demek istiyorum:',
  'Su an {sehir}, ve {konu}.',
  'Kimse sormadi ama {konu} hakkinda bir seyler soyleyecegim.',
  '{konu} - uzun zamandir denemek istiyordum.',
  'Bunu bir sure once ogrendim: {konu}.',
  '{sehir} sabahlari ve {konu}. Ikisi de ayni sey aslinda.',
  'Sonunda {konu}.',
  '{konu} ile ilgili kucuk bir itiraf.',
  'Uzun zamandir aklimda olan sey: {konu}.',
  'Bir sey fark ettim - {konu}.',
  '{konu}. Bu kadar basit.',
  'Herkes {ilgi} konusuyor, ben {konu} diyorum.',
  'Gunun ozeti: {konu}.',
  '{sehir} bugun {konu} icin dogru yerdi.',
  'Once soyleyeyim: {konu}.',
  'Bu kare {konu} icin cekildi ama baska bir sey anlatiyor.',
  'Uc kelimeyle: {konu}.',
  '{ozellik} olmanin bir bedeli var, bugunku bu: {konu}.',
  'Kayit icin: {konu}.',
];

/**
 * GOVDE IKI PARCA.
 * Ilk parca durumu kurar, ikincisi baglar. Ayri havuzlar carpim veriyor.
 */
const BODY_A = [
  '{ozellik} biri olarak bu tarz seyleri fazla dert ediyorum',
  'Aslinda plan bu degildi',
  'Uzerine dusundukce basitlestigini fark ediyorum',
  '{ilgi} ile ugrasanlar bilir',
  'Birkac denemeden sonra oturdu',
  'Bu kareyi cekerken tek dusundugum seydi',
  'Kucuk bir degisiklik yaptim',
  'Bir sure once tam tersini savunuyordum',
  'Kimseye soylemedim ama iki kez bastan basladim',
  'Sabah baktigimda begenmemistim',
  'Uzun surdu, itiraf ediyorum',
  'Once fazla geldi',
  'Denemesi bedavaydi',
  'Bu isin kolayi yokmus',
  'Sabirla ilgili bir sey ogrendim',
  '{ilgi} bana hep bunu hatirlatiyor',
  'Elimde olsa yine ayni seyi yapardim',
  'Bu sefer acele etmedim',
];

const BODY_B = [
  'ama sonuc iyi cikinca degiyor.',
  've iyi ki oyle olmus.',
  '- sonunda hepsi ayni yere cikiyor.',
  'sonra her sey yerine oturdu.',
  've bir daha geri donmedim.',
  'gerisi kendiliginden geldi.',
  'sonucu goren anlar.',
  'bu yuzden bugun buradayim.',
  've galiba dogru karardi.',
  'sonrasi tamamen alisma meselesi.',
  '- basitlestikce iyilesiyor.',
  've bunu tekrar yapacagim.',
  'bir sonrakinde daha hizli olacak.',
  'simdi daha iyi anliyorum.',
  've hala ogreniyorum.',
  '- acele etmemek ise yaradi.',
];

/** Detay kaliplari - sahnenin somut ogelerini metne tasir. */
const DETAILS = [
  'Detay: {detay}.',
  'Kucuk not: {detay}.',
  '{detay} - fark eden olur mu bilmiyorum.',
  'Bu arada: {detay}.',
  'Gozden kacan sey: {detay}.',
  'Ayrica {detay}.',
  'Not dusuyorum: {detay}.',
  '{detay} kismini ozellikle sevdim.',
];

/** CTA aileleri. persona.voiceGuide.ctaStyle bunlardan birini seciyor. */
const CTAS = {
  soru: [
    'Sen olsan ne yapardin?',
    'Sizde nasil?',
    'Bunu deneyen var mi?',
    'Hangisi daha iyi sizce?',
    'Yorumlarda bekliyorum.',
    'Katiliyor musun?',
    'Sizce bir sonraki ne olsun?',
    'Bunu daha once denediniz mi?',
    'Hangi tarafta durursunuz?',
    'Ben mi abartiyorum?',
    'Sizin yonteminiz ne?',
    'Merak ettim: siz nasil yapiyorsunuz?',
    'Fikri olan yazsin.',
    'Soyleyin, yanlis mi dusunuyorum?',
  ],
  eylem: [
    'Kaydet, lazim olur.',
    'Devami icin takipte kal.',
    'Profildeki baglantida detaylar var.',
    'Denersen bana yaz.',
    'Paylas, birinin isine yarar.',
    'Etiketle, gorsun.',
    'Kaydet, sonra donersin.',
    'Yorumlara birak, cevap veriyorum.',
    'Bir sonrakini kacirma.',
    'Begendiysen kaydetmeyi unutma.',
    'Denemek isteyen yazsin.',
    'Aklinda kalsin diye kaydet.',
    'Birine gonder, konusun.',
    'Takip et, seri devam ediyor.',
  ],
};

const AI_NOTE = 'Bu hesap yapay zeka ile uretilen bir karakterdir.';

/* ------------------------------------------------------------- yardimcilar */

/** Turkce karakterleri sadelestirip hashtag'e uygun slug uretir. */
function slugify(text) {
  return String(text || '')
    .toLocaleLowerCase('tr')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

/**
 * Metni kelime ortasindan KESMEDEN sinira sigdirir.
 * Once son cumleyi atar, olmazsa son kelimeleri atar.
 */
function fitToLimit(text, limit) {
  if (text.length <= limit) return text;

  // 1) Cumle cumle geri sar
  const cumleler = text.split(/(?<=[.!?])\s+/);
  while (cumleler.length > 1) {
    cumleler.pop();
    const aday = cumleler.join(' ');
    if (aday.length <= limit) return aday;
  }

  // 2) Tek cumle bile uzunsa kelime kelime kirp - asla kelime ortasindan degil
  const kelimeler = cumleler[0].split(/\s+/);
  while (kelimeler.length > 1) {
    kelimeler.pop();
    const aday = `${kelimeler.join(' ')}...`;
    if (aday.length <= limit) return aday;
  }
  return kelimeler[0].slice(0, Math.max(1, limit));
}

/** Ses rehberindeki "kacinilacaklar" listesine takilan kalibi eler. */
function guard(text, avoid) {
  if (!Array.isArray(avoid) || !avoid.length) return true;
  const alt = String(text).toLocaleLowerCase('tr');
  return !avoid.some((a) => {
    const kelime = slugify(a);
    return kelime.length > 4 && alt.includes(String(a).toLocaleLowerCase('tr'));
  });
}

/** Sahneden okunabilir bir "konu" cikarir. */
function konuOf(scene, persona) {
  if (scene.request) return String(scene.request).trim().replace(/[.!?]+$/, '');
  if (scene.categoryLabel) return String(scene.categoryLabel).toLocaleLowerCase('tr');
  if (scene.category) return String(scene.category).toLocaleLowerCase('tr');
  const ilgi = (persona.interests || [])[0];
  return ilgi ? String(ilgi).toLocaleLowerCase('tr') : 'yeni bir kare';
}

/** Sahnenin somut ogelerinden Turkce bir detay cumlesi. */
function detayOf(scene) {
  const parcalar = [];
  if (scene.outfitTr) parcalar.push(scene.outfitTr);
  if (scene.settingTr) parcalar.push(scene.settingTr);
  if (scene.moodTr) parcalar.push(scene.moodTr);
  if (parcalar.length) return parcalar[0];
  // Ingilizce sahne alanlari metne HAM girmemeli - Turkce karsiligi yoksa
  // detay slotu bos gecer.
  return '';
}

/* --------------------------------------------------------------- ana motor */

/**
 * Tek bir varyant uretir.
 * Rastgele sayiyi dosya basindaki SLOT TUKETIM SIRASINA gore tuketir.
 */
function buildOne(character, scene, platform, variantIndex, opts) {
  const persona = character.persona || {};
  // Eski veya elle duzenlenmis character.json'larda voiceGuide eksik olabilir.
  // Varsayilansiz okursak rota 500 doner.
  const vg = persona.voiceGuide || {};
  const avoid = Array.isArray(vg.avoid) ? vg.avoid : [];
  const identity = character.identity || {};
  const life = character.life || {};

  const next = makeRng([
    character.seed,
    scene.id || scene.matched || 'free',
    // scene.request DAHIL: brief.js serbest istekte hep ayni id'yi donduruyor;
    // katilmazsa "kahve reklami" ile "kitap onerisi" ayni iskeleti alirdi.
    scene.request || '',
    platform.id,
    variantIndex,
  ]);

  const sehir = life.city || (life.places && life.places.city) || '';
  const ilgiler = persona.interests || [];
  const ozellikler = persona.traits || [];
  const konu = konuOf(scene, persona);
  const detay = detayOf(scene);

  // Kalip bir degiskenle basliyorsa ({ozellik} gibi) cumle kucuk harfle
  // basliyordu. Ilk harfi Turkce kurallarina gore buyut.
  const basHarf = (s) => (s ? s.charAt(0).toLocaleUpperCase('tr') + s.slice(1) : s);

  const doldur = (kalip) => String(kalip || '')
    .replace(/\{konu\}/g, konu)
    .replace(/\{sehir\}/g, sehir || konu)
    .replace(/\{ilgi\}/g, (ilgiler[0] || konu).toLocaleLowerCase('tr'))
    .replace(/\{ozellik\}/g, ozellikler[0] || 'meraklı')
    .replace(/\{detay\}/g, detay);

  /* --- 1. hook ------------------------------------------------------- */
  // Karakterin KENDI acilislari (persona.voiceGuide.openers) havuza katilir -
  // bugune kadar hicbir yerde kullanilmiyorlardi.
  const acilislar = Array.isArray(vg.openers) ? vg.openers.map((o) => String(o).replace(/^"|"$/g, '')) : [];
  const hookHavuzu = [...HOOKS.filter((h) => guard(doldur(h), avoid)), ...acilislar];
  let hook = basHarf(doldur(pick(hookHavuzu, next) || HOOKS[0]));

  /* --- 2. govde (IKI PARCA - carpim icin) ------------------------------ */
  const aHavuz = BODY_A.filter((b) => guard(doldur(b), avoid));
  const bHavuz = BODY_B.filter((b) => guard(doldur(b), avoid));
  const aParca = doldur(pick(aHavuz.length ? aHavuz : BODY_A, next));
  const bParca = doldur(pick(bHavuz.length ? bHavuz : BODY_B, next));
  // Ikinci parca tire veya baglacla basliyorsa bosluk, degilse virgul.
  const ayirici = /^[-–—]/.test(bParca) ? ' ' : (/^(ama|ve|sonra|gerisi|simdi|bu|bir)/i.test(bParca) ? ', ' : ' ');
  let govde = basHarf(`${aParca}${ayirici}${bParca}`);

  /* --- 3. detay ------------------------------------------------------ */
  let detayCumle = '';
  if (detay) {
    detayCumle = doldur(pick(DETAILS, next));
  } else {
    next(); // slot sirasi bozulmasin diye sayi yine de tuketilir
  }

  /* --- 4. cta -------------------------------------------------------- */
  // ctaStyle metninden aile secilir: "soru" gecen bir rehber soru ailesini secer.
  const ctaAile = /soru/i.test(String(vg.ctaStyle || ''))
    ? 'soru'
    : (platform.ctaForm || 'soru');
  const cta = pick(CTAS[ctaAile] || CTAS.soru, next);

  /* --- 5. emoji ------------------------------------------------------ */
  const emojiKaynak = String(persona.emojiStyle || '').match(/\p{Extended_Pictographic}/gu) || [];
  const emojiler = platform.emoji > 0 && emojiKaynak.length
    ? shuffle(emojiKaynak, next).slice(0, platform.emoji).join('')
    : (next(), '');

  /* --- 6. hashtag ---------------------------------------------------- */
  // Sabit liste YOK: etiketler karakterin nisinden, sehrinden ve sahneden turer.
  const etiketAdaylari = [
    ...ilgiler,
    sehir,
    life.country || '',
    scene.categoryLabel || scene.category || '',
    ...(persona.contentPillars || []).slice(0, 3),
  ].map(slugify).filter((s) => s.length > 2);

  const benzersiz = [...new Set(etiketAdaylari)];
  const secilen = shuffle(benzersiz, next).slice(0, Math.max(0, platform.hashtags - 1));
  const etiketler = [...new Set([...secilen, 'yapayzeka'])]
    .slice(0, platform.hashtags)
    .map((s) => `#${s}`)
    .join(' ');

  /* --- birlestir ----------------------------------------------------- */
  const ayrac = platform.lineBreaks ? '\n\n' : ' ';
  const aiSatiri = opts.aiLabel ? AI_NOTE : '';

  const parcalar = [
    [hook, emojiler].filter(Boolean).join(' '),
    govde,
    detayCumle,
    cta,
    aiSatiri,
    etiketler,
  ].filter(Boolean);

  let metin = parcalar.join(ayrac);

  // Sert sinirli platformlarda dusurme SIRASI: detay -> AI satiri -> govde.
  if (metin.length > platform.max) {
    let kalanParcalar = [
      [hook, emojiler].filter(Boolean).join(' '),
      govde,
      cta,
      aiSatiri,
      etiketler,
    ].filter(Boolean);
    metin = kalanParcalar.join(ayrac);

    if (metin.length > platform.max) {
      kalanParcalar = [
        [hook, emojiler].filter(Boolean).join(' '),
        govde,
        cta,
        etiketler,
      ].filter(Boolean);
      metin = kalanParcalar.join(ayrac);
    }

    if (metin.length > platform.max) {
      // Etiketleri koru (arama icin degerli), govdeyi kirp.
      const kuyruk = [cta, etiketler].filter(Boolean).join(ayrac);
      const bosluk = platform.max - kuyruk.length - ayrac.length;
      const bas = fitToLimit([[hook, emojiler].filter(Boolean).join(' '), govde].join(ayrac), Math.max(20, bosluk));
      metin = [bas, kuyruk].join(ayrac);
    }

    if (metin.length > platform.max) {
      metin = fitToLimit(metin, platform.max);
    }
  }

  return {
    platform: platform.id,
    platformLabel: platform.label,
    text: metin,
    chars: metin.length,
    max: platform.max,
    hashtags: etiketler ? etiketler.split(' ') : [],
    aiLabel: !!opts.aiLabel,
    truncated: !!(platform.hard && parcalar.join(ayrac).length > platform.max),
  };
}

/**
 * @param {object} character  data/character.json
 * @param {object} scene      uretimde kullanilan sahne (gorselle ayni olmali)
 * @param {object} options    { platform, variants, aiLabel }
 */
function build(character, scene = {}, options = {}) {
  const platform = BY_ID.get(options.platform) || PLATFORMS[0];
  const variants = Math.min(Math.max(Number(options.variants) || 3, 1), 5);
  // AI etiketi VARSAYILAN ACIK. Kapatilabilir ama aiNote her zaman doner -
  // kullanici kapatirken neyi kapattigini gormeli.
  const aiLabel = options.aiLabel !== false;

  const list = [];
  for (let i = 0; i < variants; i++) {
    list.push(buildOne(character, scene, platform, i, { aiLabel }));
  }

  return {
    platform: platform.id,
    platformLabel: platform.label,
    platformNote: platform.note,
    aspect: platform.aspect,
    variants: list,
    aiNote: 'Platformda yapay zeka etiketi kullanmak hem kurallara hem de bu projenin durusuna uygundur. Etiketi kapatirsan biyografide veya platformun kendi "AI uretimi" anahtarinda belirtmen gerekir.',
  };
}

function platforms() {
  return PLATFORMS.map(({ id, label, max, hashtags, note, aspect }) => ({
    id, label, max, hashtags, note, aspect,
  }));
}

module.exports = { build, platforms, PLATFORMS, fitToLimit, slugify };
