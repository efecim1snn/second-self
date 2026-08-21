'use strict';

/**
 * FOTOROMAN - HIKAYE MOTORU
 *
 * Tek kare uretmekle hikaye uretmek ayni is degil. Aradaki farki
 * anlamak bu studyonun tamami:
 *
 * SUREKLILIK (bu dosyanin var olma sebebi)
 * -----------------------------------------
 * scenes.suggest() her sahnede KIYAFETI DEGISTIRIR. Bir akis icin dogru
 * (12 gonderide ayni tisort sikici olur), fotoroman icin felaket: bir
 * ogleden sonra gecen hikayede karakter her karede ustunu degistiremez.
 * Ayni sey ortam ve isik icin de gecerli - kare 3 gece, kare 4 gunduzse
 * okuyucu hikayeyi degil hatayi gorur.
 *
 * Burada tersi kural isliyor:
 *   kiyafet  -> TUM hikaye boyunca TEK
 *   ortam    -> perde basina sabit, yalnizca perde sinirinda degisir
 *   isik     -> tek zaman dilimi (tur gerektiriyorsa donuste kirilir)
 *   esya     -> girdigi kareden sonra tasinir
 *
 * PERDE DUZENI
 * -----------------------------------------
 * Bes perde, kare sayisina orantili dagitilir. Her perdenin kendi plan
 * dili var - cizgi roman grameri: genis planla kur, ortaya yaklas,
 * doruk noktasinda yuze gir, sonunda geri cekil.
 *
 * Cikan sahne nesnesi promptcraft.build()'in bekledigi bicimle AYNI -
 * yani prompt motoru bu studyo icin hic degistirilmedi.
 */

const { makeRng, pick, shuffle } = require('../../rng');

/* ------------------------------------------------------------------ plan */

const SHOTS = {
  closeup: 'close-up portrait, head and shoulders',
  bust: 'upper body shot, waist up',
  half: 'half body shot',
  full: 'full body shot',
  wide: 'wide environmental shot, the subject clearly readable in the frame',
};

/**
 * PERDELER
 *
 * shot: o perdede kullanilacak plan sirasi. Perdeye birden fazla kare
 * duserse sirayla ilerler - yani gerilim perdesi once yari plan, sonra
 * yakin plan verir. Bu tesaduf degil, gerilim yaklasarak kurulur.
 */
const PERDELER = [
  {
    key: 'kurulus',
    label: 'Kuruluş',
    aciklama: 'Kim, nerede, her şey yolundayken.',
    pay: 0.2,
    shot: ['wide', 'full', 'half'],
  },
  {
    key: 'kivilcim',
    label: 'Kıvılcım',
    aciklama: 'Düzeni bozan şey oluyor.',
    pay: 0.15,
    shot: ['half', 'bust'],
  },
  {
    key: 'gerilim',
    label: 'Gerilim',
    aciklama: 'Büyüyor, çıkış görünmüyor.',
    pay: 0.25,
    shot: ['bust', 'half', 'closeup'],
  },
  {
    key: 'donus',
    label: 'Dönüş',
    aciklama: 'Doruk nokta - karar anı.',
    pay: 0.2,
    shot: ['closeup', 'bust'],
  },
  {
    key: 'kapanis',
    label: 'Kapanış',
    aciklama: 'Sonrası. Geri çekiliyoruz.',
    pay: 0.2,
    shot: ['half', 'wide'],
  },
];

/* ------------------------------------------------------------------ turler */

/**
 * TURLER
 *
 * Her turun perde perde POZ havuzu var. Poz Ingilizce, cunku dogrudan
 * prompt'a giriyor (bkz. promptcraft). Etiket ve konu Turkce, cunku
 * kullanici onu okuyor.
 *
 * Poz havuzlari bilerek turden ture farkli: gerilim turunun kurulusu
 * ile romantik turun kurulusu ayni kare degildir. Ortak havuz kullanmak
 * kolay olurdu ama butun hikayeler ayni tada gelirdi.
 */
const TURLER = {
  gundelik: {
    label: 'Gündelik',
    aciklama: 'Küçük bir günün içinde küçük bir dönüşüm.',
    ruh: ['calm', 'thoughtful', 'content', 'warm', 'peaceful'],
    pozlar: {
      kurulus: [
        'waking up and sitting on the edge of the bed, hair messy',
        'making coffee at the counter, still half asleep',
        'looking out of the window holding a warm cup',
        'tying shoelaces by the door, about to leave',
        'walking to work with a bag over one shoulder',
        'waiting at a crossing, looking at nothing in particular',
        'buying something small from a stall, counting change',
      ],
      kivilcim: [
        'stopping mid-step, noticing something off frame',
        'reading a message on the phone with a changed expression',
        'turning around quickly towards a sound',
        'holding an unexpected object and studying it',
        'checking the pockets, then checking them again',
        'looking at a note left where it should not be',
        'lifting the head slowly, listening',
      ],
      gerilim: [
        'sitting down slowly, phone still in hand',
        'pacing with one hand on the back of the neck',
        'leaning on the table with both hands, head down',
        'staring at nothing, jaw tight',
        'sitting on the edge of a step, elbows on knees',
        'rubbing the eyes with the heel of the hand',
        'reading the same line again, not taking it in',
      ],
      donus: [
        'eyes closing for a moment, then opening with resolve',
        'a slow breath out, shoulders dropping',
        'a small honest smile breaking through',
        'looking straight into the lens, decision made',
        'nodding once to nobody, having decided',
        'straightening up, chin lifting',
        'putting the phone away face down',
      ],
      kapanis: [
        'stepping outside into the light, coat on',
        'putting the cup down and standing up',
        'walking away from the camera down the street',
        'sitting back relaxed, finally still',
        'walking with a lighter step, hands free',
        'stopping to look back once, then going on',
        'standing in the open, letting the air hit the face',
      ],
    },
  },

  romantik: {
    label: 'Romantik',
    aciklama: 'Söylenemeyen bir şey, söylenmesi gereken bir an.',
    ruh: ['soft', 'hopeful', 'nervous', 'tender', 'warm'],
    pozlar: {
      kurulus: [
        'waiting at a table for two, checking the time',
        'walking slowly with hands in pockets, looking around',
        'sitting on a bench watching people pass',
        'standing at a window, rehearsing something silently',
        'arriving early and pretending not to have hurried',
        'smoothing the front of the jacket, twice',
        'reading the same message for the third time',
      ],
      kivilcim: [
        'looking up suddenly, expression softening',
        'half standing up, caught between staying and going',
        'holding out a hand, uncertain',
        'laughing unexpectedly, hand covering the mouth',
        'catching sight of someone and going completely still',
        'the smile arriving before the thought',
        'taking one step forward, then stopping',
      ],
      gerilim: [
        'looking down at the hands, unable to speak',
        'turning the head away, eyes glassy',
        'gripping the edge of the table',
        'starting to say something and stopping',
        'holding something too tightly, knuckles pale',
        'speaking to the ground instead of to the person',
        'shaking the head slowly, eyes shut',
      ],
      donus: [
        'looking directly into the lens, eyes wet but steady',
        'lips parted mid-sentence, finally saying it',
        'a trembling smile, tears not falling',
        'reaching forward, closing the distance',
        'raising the eyes at last, holding the look',
        'saying the difficult sentence, mouth open mid word',
        'letting the shoulders fall, defences down',
      ],
      kapanis: [
        'walking side by side, shoulders almost touching',
        'sitting quietly, calm at last',
        'looking back over the shoulder with a small smile',
        'standing in the doorway, light behind',
        'laughing quietly, forehead tipped down',
        'walking backwards a few steps, still looking',
        'exhaling and smiling at the same time',
      ],
    },
  },

  gerilim: {
    label: 'Gerilim',
    aciklama: 'Bir şeyin yanlış olduğunu önce o anlıyor.',
    ruh: ['tense', 'alert', 'uneasy', 'afraid', 'determined'],
    pozlar: {
      kurulus: [
        'walking down an empty corridor, glancing back',
        'unlocking a door, keys in hand',
        'checking the phone with no signal',
        'standing still, listening',
        'checking over the shoulder while walking',
        'stopping to read a sign that should not be there',
        'testing a handle that does not turn',
      ],
      kivilcim: [
        'freezing mid-motion, head turned towards a sound',
        'staring at something off frame, eyes wide',
        'backing away one step, hand raised',
        'crouching down quickly behind cover',
        'head snapping towards a noise off frame',
        'going very still, only the eyes moving',
        'dropping into a crouch without a sound',
      ],
      gerilim: [
        'pressed flat against a wall, breathing hard',
        'holding the breath, hand over the mouth',
        'moving carefully, one hand ahead',
        'looking over the shoulder while walking fast',
        'edging along with the back flat to the wall',
        'covering the mouth to muffle the breathing',
        'gripping something as a weapon, badly',
      ],
      donus: [
        'turning to face it, fear replaced by resolve',
        'eyes locked forward, fists clenched',
        'shouting, veins visible on the neck',
        'staring directly into the lens, unblinking',
        'standing up straight and facing it',
        'jaw set, taking the first step forward',
        'eyes hard, no fear left in them',
      ],
      kapanis: [
        'walking out into daylight, exhausted',
        'sitting on the ground, back against the wall',
        'looking back one last time at the building',
        'standing still as the wind moves the hair',
        'limping out into the open air',
        'sitting down hard, hands shaking',
        'looking at the hands as if they belong to someone else',
      ],
    },
  },

  gizem: {
    label: 'Gizem',
    aciklama: 'Bir ipucu, yanlış bir cevap, geç kalmış bir fark ediş.',
    ruh: ['curious', 'focused', 'suspicious', 'startled', 'knowing'],
    pozlar: {
      kurulus: [
        'examining a document under a desk lamp',
        'photographing something with the phone',
        'walking into a room and scanning it',
        'writing notes while frowning slightly',
        'laying objects out in a careful row',
        'reading with a finger following the line',
        'photographing something small from directly above',
      ],
      kivilcim: [
        'lifting an object up to the light, eyes narrowing',
        'stopping mid-page, finger on a line of text',
        'looking up sharply from the notes',
        'opening a drawer and going still',
        'stopping mid gesture, something not adding up',
        'turning a page back to check it again',
        'holding two things up and looking between them',
      ],
      gerilim: [
        'spreading papers across the table, searching',
        'holding two objects side by side, comparing',
        'rubbing the forehead, papers everywhere',
        'staring at a wall of pinned notes',
        'circling the table, looking at it from every side',
        'crossing something out hard',
        'standing back with the arms folded, thinking',
      ],
      donus: [
        'eyes widening as it clicks into place',
        'a slow realisation spreading across the face',
        'looking straight into the lens, certain now',
        'putting the last piece down, hand still',
        'the moment of understanding, hand going still',
        'exhaling sharply, eyes fixed on one point',
        'turning to the camera with the answer in the face',
      ],
      kapanis: [
        'closing the folder and standing up',
        'walking out, coat over the arm',
        'looking back at the empty desk',
        'standing at the window at dawn',
        'gathering everything into one folder',
        'switching the lamp off',
        'walking out without looking back',
      ],
    },
  },

  komedi: {
    label: 'Komedi',
    aciklama: 'Küçük bir yanlış anlama, büyüyen bir rezalet.',
    ruh: ['playful', 'embarrassed', 'panicked', 'amused', 'relieved'],
    pozlar: {
      kurulus: [
        'confidently walking, clearly pleased with themselves',
        'checking the hair in a reflection',
        'carrying far too many things at once',
        'giving a thumbs up to nobody in particular',
        'striding along absolutely certain of the plan',
        'carrying a tower of things that is already leaning',
        'winking at nobody in particular',
      ],
      kivilcim: [
        'freezing with a horrified expression',
        'looking down at a spilled disaster',
        'eyes darting sideways, caught',
        'holding a broken object with a fake smile',
        'the exact moment it starts to go wrong',
        'catching something an instant too late',
        'looking down at the damage in slow horror',
      ],
      gerilim: [
        'hiding badly behind something too small',
        'gesturing wildly while explaining',
        'sweating and laughing nervously',
        'trying to fix it and making it worse',
        'attempting a repair that is clearly making it worse',
        'talking very fast with both hands',
        'trying to look casual while quietly panicking',
      ],
      donus: [
        'giving up entirely, arms dropping',
        'laughing helplessly, head thrown back',
        'staring deadpan into the lens',
        'covering the face with both hands',
        'accepting defeat with total sincerity',
        'letting out a laugh that cannot be stopped',
        'staring flatly at the camera, completely done',
      ],
      kapanis: [
        'walking away whistling, pretending nothing happened',
        'sitting in the wreckage, oddly content',
        'shrugging at the camera with a grin',
        'giving a small defeated wave',
        'strolling off as if none of it ever happened',
        'sitting in the middle of the mess, at peace',
        'giving a small proud thumbs up anyway',
      ],
    },
  },

  dram: {
    label: 'Dram',
    aciklama: 'Taşıdığı şeyi ilk kez birine gösteriyor.',
    ruh: ['heavy', 'tired', 'raw', 'quiet', 'released'],
    pozlar: {
      kurulus: [
        'sitting alone in a large empty room',
        'standing at the window with the back to the camera',
        'holding an old photograph',
        'sitting on the stairs, elbows on knees',
        'sitting very still with nothing left to do',
        'holding something old and worn at the edges',
        'staying in one place a little too long',
      ],
      kivilcim: [
        'looking up as someone enters',
        'putting the photograph face down',
        'wiping the face quickly with a sleeve',
        'standing up too fast',
        'looking up sharply, caught out',
        'putting something quickly out of sight',
        'straightening the face before turning around',
      ],
      gerilim: [
        'talking with the hands, voice clearly rising',
        'turning away mid-sentence',
        'sitting down heavily, head in hands',
        'gripping the doorframe, not leaving',
        'speaking with the whole body, then stopping dead',
        'turning away in the middle of a sentence',
        'holding on to the frame of something, not letting go',
      ],
      donus: [
        'finally looking up, eyes red',
        'saying it out loud for the first time',
        'shoulders shaking, no sound',
        'looking into the lens, nothing left to hide',
        'saying it out loud for the first time',
        'crying without making any sound',
        'looking straight ahead with nothing hidden',
      ],
      kapanis: [
        'sitting quietly in the same room, lighter',
        'opening the curtains',
        'walking out of the frame slowly',
        'a long exhale, eyes closed',
        'sitting in the same place, lighter now',
        'letting the light in',
        'walking slowly out of the frame',
      ],
    },
  },
};

/* ------------------------------------------------------------ isik / ortam */

/**
 * ZAMAN DILIMLERI
 *
 * Hikaye boyunca TEK zaman dilimi kullanilir. Turler kendi varsayilanina
 * meyleder ama kullanici degistirebilir. "kirilma" alani: donus perdesinde
 * isigin sertlesip sertlesmeyecegi - gerilim ve dramda dramatik, gundelik
 * ve komedide gereksiz.
 */
const ZAMANLAR = {
  sabah: { label: 'Sabah', isik: 'soft morning window light' },
  gunduz: { label: 'Gündüz', isik: 'overcast diffused daylight' },
  altin: { label: 'Gün batımı', isik: 'golden hour sunlight, long shadows' },
  aksam: { label: 'Akşam', isik: 'warm indoor lamp light' },
  gece: { label: 'Gece', isik: 'low key night light, deep shadows' },
};

const TUR_ZAMAN = {
  gundelik: 'sabah', romantik: 'altin', gerilim: 'gece',
  gizem: 'aksam', komedi: 'gunduz', dram: 'aksam',
};

/** Donus perdesinde isigin sertlesecegi turler. */
const ISIK_KIRILIR = { gerilim: true, dram: true, gizem: true };

/* ------------------------------------------------------------ mekan setleri */

/**
 * MEKAN SETLERI - NEDEN persona.settings KULLANILMIYOR
 *
 * Ilk surum mekani karakterin persona.settings listesinden seciyordu ve
 * ciktilar tutarsizdi. Gercek bir ornek:
 *
 *     tur: romantik, zaman: gun batimi
 *     mekan 1: "darkroom with red light"
 *     mekan 2: "desert road"
 *     isik   : "golden hour sunlight"
 *
 * Karanlik odada gun batimi isigi olmaz, ve karakter karanlik odadan cikip
 * col yoluna yuruyemez. Liste hatali degil - YANLIS ISE KOSULMUS: o liste
 * bir akista 12 gonderinin birbirine benzememesi icin uretiliyor, yani
 * ozellikle DAGINIK. Anlatinin istedigi tam tersi.
 *
 * Buradaki setler uc sozu tutuyor:
 *   1. ana ve yan mekan BIRBIRINE KOMSU (kafenin ici / kafenin onu),
 *      yani karakter aralarinda yuruyebilir,
 *   2. zaman dilimiyle uyumlu (karanlik otoparkta sabah isigi teklif edilmez),
 *   3. ture uygun (gerilim mutfakta degil, otoparkta kurulur).
 *
 * {sehir} karakterin gercek sehriyle doldurulur; sehir bilinmiyorsa
 * ifade sehirsiz de dogru okunacak sekilde yazildi.
 */
const MEKAN_SETLERI = [
  {
    key: 'kafe', label: 'Kafe',
    turler: ['gundelik', 'romantik', 'dram', 'gizem', 'komedi'],
    zamanlar: ['sabah', 'gunduz', 'altin', 'aksam'],
    ana: 'inside a small neighbourhood cafe{sehirde}',
    yan: 'the pavement right outside the same cafe{sehirde}',
    anaIc: true, yanIc: false,
  },
  {
    key: 'ev', label: 'Ev',
    turler: ['gundelik', 'dram', 'romantik', 'komedi'],
    zamanlar: ['sabah', 'gunduz', 'altin', 'aksam', 'gece'],
    ana: 'a small apartment living room with a large window',
    yan: 'the narrow balcony of the same apartment',
    anaIc: true, yanIc: false,
  },
  {
    key: 'sokak', label: 'Sokak',
    turler: ['gundelik', 'romantik', 'komedi', 'dram'],
    zamanlar: ['sabah', 'gunduz', 'altin', 'aksam'],
    ana: 'a quiet residential street{sehirde}',
    yan: 'a small park at the end of that street{sehirde}',
    anaIc: false, yanIc: false,
  },
  {
    key: 'ofis', label: 'Ofis',
    turler: ['dram', 'gizem', 'gerilim', 'komedi'],
    zamanlar: ['gunduz', 'aksam', 'gece'],
    ana: 'an open plan office after working hours, most lights off',
    yan: 'the corridor outside that office, lift doors at the end',
    anaIc: true, yanIc: true,
  },
  {
    key: 'istasyon', label: 'Istasyon',
    turler: ['romantik', 'dram', 'gizem', 'gerilim'],
    zamanlar: ['sabah', 'gunduz', 'altin', 'aksam', 'gece'],
    ana: 'a train platform{sehirde}, tracks running out of frame',
    yan: 'the main hall of the same station, departure board overhead',
    anaIc: false, yanIc: true,
  },
  {
    key: 'sahil', label: 'Sahil',
    turler: ['romantik', 'gundelik', 'dram'],
    zamanlar: ['sabah', 'altin', 'aksam'],
    ana: 'a seafront promenade, water on one side',
    yan: 'the concrete steps leading down to the water',
    anaIc: false, yanIc: false,
  },
  {
    key: 'otopark', label: 'Otopark',
    turler: ['gerilim', 'gizem'],
    zamanlar: ['aksam', 'gece'],
    ana: 'an underground car park, pillars and strip lights',
    yan: 'the concrete stairwell leading up out of the car park',
    anaIc: true, yanIc: true,
  },
  {
    key: 'koridor', label: 'Boş koridor',
    turler: ['gerilim', 'gizem'],
    zamanlar: ['aksam', 'gece'],
    ana: 'a long empty corridor with doors on both sides',
    yan: 'a single doorway at the end of that corridor, light behind it',
    anaIc: true, yanIc: true,
  },
  {
    key: 'kutuphane', label: 'Kütüphane',
    turler: ['gizem', 'romantik', 'dram'],
    zamanlar: ['gunduz', 'aksam'],
    ana: 'a library reading room, long tables and lamps',
    yan: 'the narrow aisle between tall bookshelves',
    anaIc: true, yanIc: true,
  },
  {
    key: 'pazar', label: 'Pazar',
    turler: ['komedi', 'gundelik'],
    zamanlar: ['sabah', 'gunduz'],
    ana: 'a busy street market{sehirde}, stalls on both sides',
    yan: 'a quiet side alley just off the market{sehirde}',
    anaIc: false, yanIc: false,
  },
  {
    key: 'cati', label: 'Çatı',
    turler: ['romantik', 'dram', 'gerilim'],
    zamanlar: ['altin', 'aksam', 'gece'],
    ana: 'a flat rooftop above the city{sehirde}, low railing at the edge',
    yan: 'the stairwell door that opens onto that rooftop',
    anaIc: false, yanIc: true,
  },
  {
    key: 'atolye', label: 'Atölye',
    turler: ['gundelik', 'dram', 'komedi'],
    zamanlar: ['gunduz', 'aksam'],
    ana: 'a cluttered workshop, tools and unfinished work on the bench',
    yan: 'the yard just outside the workshop door',
    anaIc: true, yanIc: false,
  },
];

/**
 * IC MEKAN ISTEYEN POZ IPUCLARI
 *
 * Olculdu: pozlarin %18'i bir nesne adi geciriyor ama cogu masum -
 * kafede "kapida ayakkabi baglamak" dogru, koridorda "kapiyi acmak"
 * dogru. Gercek catisma dar bir sinif: IC MEKAN GEREKTIREN poz DIS
 * mekana dustugunde. Catida pencere yoktur, tren peronunda perde yoktur.
 *
 * Bu bir sezgisel filtre, dilbilgisi cozumlemesi degil - listedeki
 * kelimeyi iceren poz dis mekanda kullanilmiyor. Yanlis pozitif zarari
 * kucuk (o poz o hikayede kullanilmaz, havuzda baskalari var);
 * yanlis negatif zarari buyuk (izleyici hatayi GORUR).
 */
const IC_MEKAN_IPUCLARI = [
  'bed', 'window', 'curtain', 'counter', 'sofa', 'drawer', 'desk lamp', 'kitchen',
];

/** Dis mekan icin ic mekan pozlarini eler. Havuz bosalirsa dokunmaz. */
function pozSuz(havuz, icMi) {
  if (icMi) return havuz;
  const kalan = havuz.filter(
    (poz) => !IC_MEKAN_IPUCLARI.some((ip) => poz.toLowerCase().includes(ip))
  );
  // Tamami elendiyse suzmemek, bos havuzdan poz secmeye calismaktan iyidir.
  return kalan.length ? kalan : havuz;
}

/** {sehirde} yer tutucusunu doldurur. Sehir yoksa ifade sehirsiz de dogrudur. */
function sehirDoldur(metin, sehir) {
  return String(metin || '').replace(/\{sehirde\}/g, sehir ? ` in ${sehir}` : '');
}

/**
 * Ture ve zamana uyan mekan setlerini verir.
 * Hicbiri uymazsa tur filtresi gevsetilir - zaman uyumu daha onemli,
 * cunku isik/mekan celiskisi izleyicinin GORDUGU hata; tur uyumsuzlugu
 * yalnizca daha az uygun bir secim.
 */
function uygunMekanlar(turKey, zamanKey) {
  const tam = MEKAN_SETLERI.filter(
    (m) => m.turler.includes(turKey) && m.zamanlar.includes(zamanKey)
  );
  if (tam.length) return tam;
  const zamanUyan = MEKAN_SETLERI.filter((m) => m.zamanlar.includes(zamanKey));
  return zamanUyan.length ? zamanUyan : MEKAN_SETLERI;
}

/* ------------------------------------------------------------- dagitim */

/**
 * EN AZ KARE = PERDE SAYISI.
 * Bes perdenin her biri en az bir kare almali; dort kareyle bes perde
 * anlatilamaz. Panel de 5'in altini teklif etmiyor - istenirse sessizce
 * yuvarlamak yerine sinir acikca burada duruyor.
 */
const EN_AZ_KARE = PERDELER.length;

/**
 * Kare sayisini bes perdeye PAYLARI ORANINDA dagitir.
 *
 * Ilk surum "en buyuk kalan yontemi" diye yazilmisti ama aslinda perdeler
 * arasinda SIRAYLA donuyordu: 20 karede bes perde de 4'er kare aliyordu,
 * yani gerilimin 0.25'lik payi ile kivilcimin 0.15'lik payi ayni sonucu
 * veriyordu - paylar hicbir ise yaramiyordu. Asagisi gercek en buyuk
 * kalan yontemi: once taban, sonra kesri buyuk olandan baslayarak artik.
 */
function perdeDagit(kareSayisi) {
  const n = Math.max(EN_AZ_KARE, kareSayisi);

  // Her perde bir kareyi pesinen alir; paylar KALAN uzerinden isler.
  const artik = n - EN_AZ_KARE;
  const kotalar = PERDELER.map((p, i) => {
    const kota = p.pay * artik;
    const tam = Math.floor(kota);
    return { perde: p, i, tam, kesir: kota - tam };
  });

  let dagitilan = kotalar.reduce((s, k) => s + k.tam, 0);
  // Esitlikte tanim sirasi kazanir - deterministik kalmasi icin.
  const sirali = [...kotalar].sort((a, b) => (b.kesir - a.kesir) || (a.i - b.i));
  let j = 0;
  while (dagitilan < artik) {
    sirali[j % sirali.length].tam++;
    dagitilan++;
    j++;
  }

  const dagilim = [];
  for (const k of kotalar) {
    for (let x = 0; x <= k.tam; x++) dagilim.push(k.perde); // +1 = taban kare
  }
  return dagilim;
}

/* ---------------------------------------------------------------- kurgu */

/**
 * Hikayeyi kurar.
 *
 * @param {object} character  kimlik + persona
 * @param {object} ayar { tur, kareSayisi, zaman, konu, mekanSayisi, tohum }
 * @returns {{ baslik, tur, zaman, kiyafet, mekanlar, kareler[] }}
 *
 * DETERMINISTIK: ayni karakter + ayni ayar = ayni hikaye. Tohum
 * degistirilerek "baska bir hikaye ver" yapilir.
 */
function kur(character, ayar = {}) {
  const p = (character && character.persona) || {};
  const turKey = TURLER[ayar.tur] ? ayar.tur : 'gundelik';
  const tur = TURLER[turKey];
  const kareSayisi = Math.max(EN_AZ_KARE, Math.min(24, Number(ayar.kareSayisi) || 8));

  const rng = makeRng([
    (character && character.id) || 'anon',
    turKey, kareSayisi, ayar.zaman || '', ayar.konu || '', ayar.tohum || 0,
  ]);

  const zamanKey = ZAMANLAR[ayar.zaman] ? ayar.zaman : (TUR_ZAMAN[turKey] || 'gunduz');
  const zaman = ZAMANLAR[zamanKey];

  /* SUREKLILIK 1: TEK KIYAFET.
   * Hikaye boyunca degismez. Gardirop bossa prompt'a kiyafet yazilmaz -
   * uydurmak, yanlis yazmaktan iyidir demek degil; bos birakmak modelin
   * kendi secmesine izin verir ve en azindan tutarsizlik yaratmaz. */
  const gardirop = Array.isArray(p.wardrobe) ? p.wardrobe : [];
  const kiyafet = gardirop.length ? pick(gardirop, rng) : '';

  /* SUREKLILIK 2: KOMSU MEKANLAR.
   * Ana mekan hikayenin gectigi yer; yan mekan onun hemen yani (kafenin
   * ici / kafenin onu). Donus ve kapanis perdesi yan mekana geciyor -
   * mekan degisimi hikayede bir seyin degistigini soyler.
   * Tek mekan isteyen kullanici icin yan mekan hic uretilmez. */
  const sehir = (character && character.life && character.life.cityName) || '';
  const setler = uygunMekanlar(turKey, zamanKey);
  const mekanSeti = pick(setler, rng);
  const cift = Math.max(1, Math.min(2, Number(ayar.mekanSayisi) || 2));
  const mekanlar = [sehirDoldur(mekanSeti.ana, sehir)];
  if (cift === 2) mekanlar.push(sehirDoldur(mekanSeti.yan, sehir));

  /* SUREKLILIK 3: ESYA TASINIR. */
  const esyalar = Array.isArray(p.props) ? p.props : [];
  const anaEsya = esyalar.length ? pick(esyalar, rng) : '';

  const dagilim = perdeDagit(kareSayisi);
  const kareler = [];
  const perdeSayaci = {};

  /* POZ TEKRARINI KIR.
   * Ilk surum her kare icin havuzdan bagimsiz secim yapiyordu ve ayni
   * perdeye iki kare dustugunde AYNI POZ pes pese cikabiliyordu -
   * olculdu, 8 karelik bir hikayede iki cift ardisik tekrar vardi.
   * Fotoromanda iki ozdes kare yan yana "hikaye" degil "kopyala-yapistir"
   * okunur. Cozum: perde basina karistirilmis bir kuyruk; havuz tukenirse
   * yeniden karistirilir. */
  const kuyruklar = {};
  let sonPoz = null;
  function pozAl(perdeKey, havuz, icMi) {
    const anahtar = `${perdeKey}|${icMi ? 'ic' : 'dis'}`;
    if (!kuyruklar[anahtar] || !kuyruklar[anahtar].length) {
      const yeni = shuffle(pozSuz(havuz, icMi), rng);
      /* KUYRUK EKLEME NOKTASINDAKI TEKRAR.
       * Kuyruk tek basina yetmiyordu: bir perdeye havuzdan (4 poz) fazla
       * kare duserse kuyruk tukenip yeniden karisiyor ve yeni kuyrugun
       * BASI, biten kuyrugun SONUYLA ayni cikabiliyordu. Olculdu: 4920
       * karede 51 ardisik tekrar, hepsi bu ek yerinde. Bas ayniysa
       * arkaya atiliyor. */
      if (yeni.length > 1 && yeni[0] === sonPoz) yeni.push(yeni.shift());
      kuyruklar[anahtar] = yeni;
    }
    sonPoz = kuyruklar[anahtar].shift();
    return sonPoz;
  }

  dagilim.forEach((perde, idx) => {
    perdeSayaci[perde.key] = (perdeSayaci[perde.key] || 0) + 1;
    const perdeIci = perdeSayaci[perde.key] - 1;

    // Plan sirasi: perde icinde ilerledikce yaklasiyoruz.
    const shotKey = perde.shot[Math.min(perdeIci, perde.shot.length - 1)];

    // Mekan perde sinirinda degisir: son iki perde ikinci mekana gecer.
    const mekanIndex = (perde.key === 'donus' || perde.key === 'kapanis')
      ? Math.min(1, mekanlar.length - 1)
      : 0;

    // Isik: tek zaman dilimi. Donuste kirilma yalnizca bazi turlerde.
    const kirilma = ISIK_KIRILIR[turKey] && perde.key === 'donus';
    const isik = kirilma
      ? `${zaman.isik}, harsher contrast, dramatic shadow`
      : zaman.isik;

    const havuz = tur.pozlar[perde.key] || tur.pozlar.kurulus;
    // Poz havuzu mekanin ic mi dis mi olduguna gore suzuluyor.
    const icMi = mekanIndex === 0 ? mekanSeti.anaIc : mekanSeti.yanIc;

    kareler.push({
      // --- promptcraft'in bekledigi alanlar (bicim AYNI) ---
      id: `fr_${perde.key}_${idx}`,
      category: 'story',
      categoryLabel: perde.label,
      shot: SHOTS[shotKey],
      pose: pozAl(perde.key, havuz, icMi),
      outfit: kiyafet,
      setting: mekanlar[mekanIndex] || '',
      // Yakin planda esya cerceveden cikar - zorla sokmak kompozisyonu bozar.
      props: (shotKey === 'closeup' || !anaEsya) ? '' : anaEsya,
      lighting: isik,
      mood: pick(tur.ruh, rng),
      aspect: ayar.aspect || 'post',
      style: 'photo',

      // --- fotoromana ozel ---
      panelNo: idx + 1,
      icMekan: !!icMi,
      perde: perde.key,
      perdeLabel: perde.label,
      shotKey,
    });
  });

  return {
    baslik: ayar.konu ? String(ayar.konu).trim().slice(0, 90) : `${tur.label} - ${kareSayisi} kare`,
    tur: turKey,
    turLabel: tur.label,
    zaman: zamanKey,
    zamanLabel: zaman.label,
    kiyafet,
    mekanlar,
    esya: anaEsya,
    kareler,
  };
}

function options() {
  return {
    turler: Object.entries(TURLER).map(([key, v]) => ({
      key, label: v.label, aciklama: v.aciklama,
    })),
    zamanlar: Object.entries(ZAMANLAR).map(([key, v]) => ({ key, label: v.label })),
    perdeler: PERDELER.map((p) => ({ key: p.key, label: p.label, aciklama: p.aciklama })),
    kareSecenekleri: [5, 6, 8, 10, 12, 16, 20, 24],
  };
}

module.exports = { kur, options, perdeDagit, TURLER, ZAMANLAR, PERDELER, SHOTS };
