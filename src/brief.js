'use strict';

/**
 * GOREV / BRIEF MOTORU
 *
 * Karakter yaratildiktan sonra ondan is istenir: "bir mekanda foto cek",
 * "kahve reklami yap", "spor rutinini paylas", "otel isbirligi".
 * Bu dosya, serbest yazilmis Turkce/Ingilizce istegi karakterin hayatina
 * (sehir, gelir, gardirop, evcil hayvan) uygun bir SAHNEYE cevirir.
 *
 * Kimlik asla degismez - degisen sadece poz, kiyafet, mekan, aksesuar.
 *
 * LLM kullanmaz: yerel, anahtarsiz ve tahmin edilebilir olmasi icin
 * anahtar kelime esleme + karakter verisiyle harmanlama yapar.
 * Eslesme bulunmazsa istek oldugu gibi sahneye ek tarif olarak girer.
 *
 * NOT: anahtar kelimeler bilerek ASCII yazildi. Kullanicinin yazdigi metin
 * normalise() ile ascii'ye cevriliyor ("kosu" <- "kosu"), boylece dosya
 * kodlamasindan bagimsiz calisir.
 */

const { cityEn } = require('./life');

/**
 * Her gorev tipi: hangi kelimelerle tetiklenir ve nasil bir sahne kurar.
 * setting/props icinde {city} ve {home} yer tutuculari kullanilabilir.
 * outfit: 'persona' yazarsan karakterin kendi gardirobu kullanilir
 * (yalnizca kiyafetin KONU oldugu gorevlerde mantikli).
 */
const TASKS = [
  {
    key: 'kahve',
    label: 'Kahve / kafe',
    words: ['kahve', 'kafe', 'cafe', 'coffee', 'latte', 'espresso', 'barista'],
    scene: {
      shot: 'half body shot',
      pose: 'holding a ceramic cup with both hands, mid-conversation, warm genuine smile',
      outfit: 'an oversized knit cardigan over a simple top',
      setting: 'a specialty coffee bar in {city} with steam on the window',
      props: 'a ceramic coffee cup and a small pastry on the table',
      lighting: 'soft natural window light',
      aspect: 'post',
    },
    ad: {
      shot: 'upper body product shot',
      pose: 'holding a branded takeaway coffee cup up towards the camera at chest height, the cup large and central in the frame, looking at the camera with a relaxed smile',
      outfit: 'a clean plain-coloured top',
      setting: 'a clean minimal cafe counter in {city}',
      props: 'a branded takeaway coffee cup, the label facing the camera',
      lighting: 'bright even commercial lighting',
      aspect: 'post',
      extra: 'clean commercial product photography, the coffee cup is the focal point and is sharply in focus, uncluttered background, generous empty space at the top of the frame for headline text',
    },
  },
  {
    key: 'spor',
    label: 'Spor / antrenman',
    words: ['spor', 'antrenman', 'gym', 'fitness', 'kosu', 'workout', 'egzersiz', 'yoga', 'pilates'],
    scene: {
      shot: 'three-quarter body shot, cropped at mid-thigh',
      pose: 'mid-exercise, focused expression, slight sweat on the skin',
      outfit: 'a fitted sportswear set',
      setting: 'a modern gym with large windows in {city}',
      props: 'a water bottle and a gym towel nearby',
      lighting: 'bright morning daylight through tall windows',
      aspect: 'story',
    },
  },
  {
    key: 'restoran',
    label: 'Restoran / yemek',
    words: ['restoran', 'yemek', 'food', 'restaurant', 'aksam yemegi', 'brunch', 'kahvalti', 'mutfak'],
    scene: {
      shot: 'half body shot',
      pose: 'sitting at the table, reaching towards a plate, laughing softly',
      outfit: 'a smart casual outfit',
      setting: 'a warm bistro in {city} with woven chairs and low lamps',
      props: 'a plated dish and a glass of water on a linen tablecloth',
      lighting: 'warm indoor lamp light',
      aspect: 'post',
    },
    ad: {
      shot: 'upper body shot with the dish in frame',
      pose: 'presenting the plate towards the camera, the dish large and central in the frame, warm inviting expression',
      outfit: 'a clean plain-coloured top',
      setting: 'a clean restaurant table with a neutral background',
      props: 'the plated dish in the foreground',
      lighting: 'soft directional light on the food',
      aspect: 'post',
      extra: 'appetising commercial food photography, the dish is the focal point and is sharply in focus',
    },
  },
  {
    key: 'plaj',
    label: 'Plaj / deniz',
    words: ['plaj', 'deniz', 'beach', 'sahil', 'kumsal', 'yuzme', 'tatil', 'havuz'],
    scene: {
      shot: 'three-quarter body shot, cropped at mid-thigh',
      pose: 'walking along the waterline, hair moving in the wind, looking towards the sea',
      outfit: 'light summer clothes',
      setting: 'a quiet beach near {city} at golden hour',
      props: 'a woven straw bag',
      lighting: 'golden hour sunlight',
      aspect: 'story',
    },
  },
  {
    key: 'sokak',
    label: 'Sokak / sehir',
    words: ['sokak', 'street', 'sehir', 'city', 'gezi', 'yuruyus', 'mekan', 'dis cekim'],
    scene: {
      shot: 'three-quarter body shot, cropped at mid-thigh',
      pose: 'walking mid-stride, looking over the shoulder towards the camera',
      outfit: 'persona',
      setting: 'a characterful old street in {city} with textured walls',
      props: 'a leather shoulder bag',
      lighting: 'late afternoon sunlight with long shadows',
      aspect: 'post',
    },
  },
  {
    key: 'ofis',
    label: 'Is / ofis',
    words: ['ofis', 'work', 'calisma', 'toplanti', 'laptop', 'masa basi', 'ev ofis'],
    scene: {
      shot: 'upper body shot, waist up',
      pose: 'looking up from a laptop mid-thought, one hand resting on the desk',
      outfit: 'a smart casual shirt',
      setting: 'a tidy desk setup by a window in {city}',
      props: 'an open laptop and a notebook',
      lighting: 'soft natural window light',
      aspect: 'post',
    },
  },
  {
    key: 'ev',
    label: 'Ev / gunluk an',
    words: ['evde', 'home', 'gunluk', 'sabah', 'rutin', 'kanepe', 'yatak', 'dinlenme'],
    scene: {
      shot: 'half body shot',
      pose: 'curled up comfortably, holding a mug, relaxed and unposed',
      outfit: 'comfortable loungewear',
      setting: '{home}',
      props: 'a warm mug and a folded blanket',
      lighting: 'soft morning light through a window',
      aspect: 'post',
    },
  },
  {
    key: 'moda',
    label: 'Moda / kombin',
    words: ['moda', 'kombin', 'kiyafet', 'outfit', 'fashion', 'stil', 'giyim', 'alisveris'],
    scene: {
      shot: 'three-quarter body shot, cropped at mid-thigh',
      pose: 'standing confidently against a plain wall, one hand adjusting the jacket',
      outfit: 'persona',
      setting: 'a clean concrete wall in {city}',
      props: '',
      lighting: 'soft even daylight',
      aspect: 'story',
      extra: 'the full outfit is clearly visible head to toe',
    },
  },
  {
    key: 'urun',
    label: 'Urun reklami (genel)',
    words: ['reklam', 'urun', 'product', 'sponsor', 'isbirligi', 'tanitim', 'marka', 'collab'],
    scene: {
      shot: 'upper body product shot',
      pose: 'holding the product up at chest height towards the camera, the product large and central in the frame, looking at the camera with a confident friendly expression',
      outfit: 'a clean plain-coloured top',
      setting: 'a clean uncluttered background with a soft gradient',
      props: 'the product, the label facing the camera',
      lighting: 'bright even commercial lighting',
      aspect: 'post',
      extra: 'clean commercial product photography, the product is the focal point and is sharply in focus, generous empty space at the top of the frame for headline text',
    },
    isAd: true,
  },
  {
    key: 'guzellik',
    label: 'Guzellik / bakim',
    words: ['guzellik', 'makyaj', 'cilt', 'bakim', 'skincare', 'kozmetik'],
    scene: {
      shot: 'close-up portrait, head and shoulders',
      pose: 'applying skincare with fingertips, eyes lowered, calm expression',
      outfit: 'a soft robe',
      setting: 'a bright bathroom with a large mirror',
      props: 'a skincare bottle held near the face',
      lighting: 'soft diffused light with no harsh shadows',
      aspect: 'square',
    },
  },
  {
    key: 'seyahat',
    label: 'Seyahat',
    words: ['seyahat', 'travel', 'ucak', 'havaalani', 'otel', 'valiz', 'gezmek'],
    scene: {
      shot: 'three-quarter body shot, cropped at mid-thigh',
      pose: 'pulling a small suitcase, looking back over the shoulder',
      outfit: 'comfortable travel clothes',
      setting: 'an airport terminal with tall windows and morning light',
      props: 'a small cabin suitcase and a worn leather backpack',
      lighting: 'bright diffused daylight',
      aspect: 'story',
    },
  },
  {
    key: 'gece',
    label: 'Gece / etkinlik',
    words: ['gece', 'parti', 'konser', 'etkinlik', 'night', 'club', 'davet', 'kutlama'],
    scene: {
      shot: 'half body shot',
      pose: 'laughing at something off camera, hand near the face',
      outfit: 'an evening outfit',
      setting: 'a dimly lit venue in {city} with warm neon accents',
      props: '',
      lighting: 'neon accent lighting at night',
      aspect: 'story',
    },
  },
  {
    key: 'evcil',
    label: 'Evcil hayvan',
    words: ['kedi', 'kopek', 'evcil', 'pet', 'hayvan'],
    scene: {
      shot: 'half body shot',
      pose: 'crouching down and looking at the animal with affection',
      outfit: 'comfortable casual clothes',
      setting: '{home}',
      props: 'their pet close beside them',
      lighting: 'soft warm indoor light',
      aspect: 'post',
    },
  },
];

const HOME_EN = {
  'Kucuk studyo daire': 'a small tidy studio apartment',
  'Ev arkadasiyla paylasimli daire': 'a lived-in shared apartment',
  'Sehir merkezinde 1+1': 'a compact modern city apartment',
  'Genis loft': 'a spacious loft with tall windows',
  'Aile eviyle birlikte': 'a warm family home',
  'Sahil kasabasinda kucuk ev': 'a small coastal house with whitewashed walls',
  'Modern luks daire': 'a minimal luxury apartment with floor-to-ceiling windows',
  'Kirsalda tas ev': 'a rustic stone house with wooden beams',
  'Karavan / gocebe': 'a converted camper van interior',
};

function fillPlaceholders(text, character) {
  const lifeBlock = character.life || {};
  return String(text || '')
    .replace(/\{city\}/g, lifeBlock.city ? cityEn(lifeBlock.city) : 'the city')
    .replace(/\{home\}/g, HOME_EN[lifeBlock.home] || 'their home');
}

/** Turkce harfleri ascii'ye indirger; esleme kodlamadan bagimsiz calissin. */
function normalise(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g');
}

/** Istekte reklam/tanitim niyeti var mi? */
function looksLikeAd(text) {
  const t = normalise(text);
  return ['reklam', 'sponsor', 'isbirligi', 'tanitim', 'marka', 'urun', 'collab', 'promo']
    .some((w) => t.includes(w));
}

function matchTask(text) {
  const t = normalise(text);
  const scored = [];
  for (const task of TASKS) {
    let score = 0;
    for (const word of task.words) {
      if (t.includes(normalise(word))) score += word.length;
    }
    if (score > 0) scored.push({ task, score });
  }
  if (!scored.length) return null;

  // "kahve reklami yap" hem kahve hem genel-urun ile eslesir. Genel olan
  // ('urun') yalnizca baska hicbir sey eslesmediginde kazanmali - yoksa
  // ozel sahne kaybolur ve her reklam ayni jenerik kareye doner.
  const specific = scored.filter((s) => s.task.key !== 'urun');
  const pool = specific.length ? specific : scored;
  pool.sort((a, b) => b.score - a.score);
  return pool[0].task;
}

/**
 * Serbest istegi sahneye cevirir.
 * @param {string} text      "kahve reklami yap", "spor salonunda foto"
 * @param {object} character kilitli karakter
 */
function toScene(text, character) {
  const request = String(text || '').trim();
  const task = matchTask(request);
  const personaBlock = character.persona || {};
  const wantsAd = looksLikeAd(request);

  if (!task) {
    // Eslesme yok: istegi oldugu gibi ek tarif olarak gecir (tek sinyal o),
    // geri kalani karakterin kendi havuzundan doldur.
    return {
      id: 'brief_free',
      category: 'brief',
      categoryLabel: 'Ozel istek',
      matched: null,
      shot: 'half body shot',
      pose: 'naturally engaged with what they are doing, unposed',
      outfit: (personaBlock.wardrobe || [])[0] || 'a simple neutral outfit',
      setting: (personaBlock.settings || [])[0] || fillPlaceholders('a street in {city}', character),
      props: '',
      lighting: 'soft natural light',
      mood: (personaBlock.moodsEn || ['relaxed'])[0],
      aspect: 'post',
      style: 'photo',
      extra: request,
      request,
    };
  }

  const base = (wantsAd && task.ad) ? task.ad : task.scene;

  return {
    id: `brief_${task.key}`,
    category: 'brief',
    categoryLabel: wantsAd && task.ad ? `${task.label} · reklam` : task.label,
    matched: task.key,
    shot: base.shot,
    pose: base.pose,
    // Gorev kendi kiyafetini tasir: spor salonuna blazer giydirmeyelim.
    // Sadece kiyafetin KONU oldugu gorevlerde karakterin gardirobu kullanilir.
    outfit: base.outfit === 'persona'
      ? ((personaBlock.wardrobe || [])[0] || 'a simple neutral outfit')
      : (base.outfit || 'a simple neutral outfit'),
    setting: fillPlaceholders(base.setting, character),
    props: fillPlaceholders(base.props, character),
    lighting: base.lighting,
    mood: (personaBlock.moodsEn || ['relaxed'])[0],
    aspect: base.aspect || 'post',
    style: 'photo',
    // Turkce istek metni prompt'a HAM girmez - model anlamaz, sadece gurultu
    // yapar. Sahne zaten istegin karsiligi.
    extra: base.extra || '',
    request,
  };
}

/* -------------------------------------------------------- haftalik plan */

const DAYS = ['Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi', 'Pazar'];

/**
 * Karakterin gercek bir insan gibi haftasi.
 * Rutin + meslek + ilgi alanlari + evcil hayvan karisimindan uretilir.
 */
function weeklyPlan(character) {
  const lifeBlock = character.life || {};
  const personaBlock = character.persona || {};
  const interests = personaBlock.interests || [];

  const morningPerson = lifeBlock.routine === 'Erken kalkar, sabahci';
  const nightOwl = lifeBlock.routine === 'Gece kusu, gec yatar';
  const nomad = lifeBlock.routine === 'Yari gocebe, surekli yer degistirir';

  const slots = [
    morningPerson ? 'spor' : 'ev',
    'ofis',
    interests.some((i) => /Fitness|Yoga|Saglikli/.test(i)) ? 'spor' : 'kahve',
    'moda',
    nightOwl ? 'gece' : 'restoran',
    nomad ? 'seyahat' : (lifeBlock.pet !== 'Yok' ? 'evcil' : 'sokak'),
    'ev',
  ];

  const notes = [
    morningPerson ? 'Sabah rutini - gunun en yuksek etkilesim saati' : 'Gune yavas baslangic',
    'Is gunu - uzmanlik gosteren icerik',
    'Enerji yenileme',
    'Kombin / stil - kaydedilme orani yuksek',
    nightOwl ? 'Gece disari - kisisel taraf' : 'Aksam yemegi - samimi taraf',
    'Hafta sonu - en cok paylasilan gun',
    'Haftalik ozet / dinlenme',
  ];

  return DAYS.map((day, i) => {
    const task = TASKS.find((t) => t.key === slots[i]);
    const scene = toScene(task ? task.words[0] : 'gunluk', character);
    return {
      day,
      slot: slots[i],
      label: task ? task.label : 'Gunluk yasam',
      note: notes[i],
      scene,
    };
  });
}

function taskList() {
  return TASKS.map((t) => ({ key: t.key, label: t.label, hasAd: !!t.ad || !!t.isAd }));
}

module.exports = { toScene, weeklyPlan, taskList, TASKS };
