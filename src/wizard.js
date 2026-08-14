'use strict';

/**
 * Kurulum sihirbazi: karakteri yaratan sorular.
 *
 * Cekirdek 10 soru istenen sirayla duruyor. Aralarina, gorsel uretimi icin
 * teknik olarak ZORUNLU olan 3 alan eklendi (cinsiyet, sac, ayirt edici ozellik):
 * bunlar olmadan her uretimde farkli bir insan cikar - tutarlilik cokerdi.
 */

const crypto = require('crypto');
const traits = require('./traits');
const life = require('./life');

const QUESTIONS = [
  {
    key: 'gender',
    label: 'Cinsiyet / sunum',
    hint: 'Gorsel uretimi icin zorunlu. Karakterin nasil gorunecegini belirler.',
    type: 'select',
    required: true,
    options: ['Kadin', 'Erkek', 'Androjen', 'Non-binary', 'Android / dijital varlik'],
  },
  {
    key: 'region',
    label: 'Hangi bolge?',
    hint: 'Karakterin kokeni ve icerigindeki mekan/kultur atmosferi buradan gelir.',
    type: 'select',
    required: true,
    options: [
      'Akdeniz', 'Kuzey Avrupa', 'Bati Avrupa', 'Dogu Avrupa', 'Balkanlar',
      'Anadolu / Turkiye', 'Kafkasya', 'Orta Dogu', 'Kuzey Afrika',
      'Sahra Alti Afrika', 'Orta Asya', 'Guney Asya', 'Dogu Asya',
      'Guneydogu Asya', 'Latin Amerika', 'Kuzey Amerika', 'Okyanusya',
    ],
  },
  {
    key: 'ethnicity',
    label: 'Hangi irk / etnik koken?',
    hint: 'Yuz hatlarinin tutarli kalmasi icin prompt\'a her seferinde aynen eklenir.',
    type: 'select',
    required: true,
    options: [
      'Akdeniz', 'Kuzey Avrupali', 'Slav', 'Turk', 'Arap', 'Fars', 'Berberi',
      'Batı Afrikali', 'Dogu Afrikali', 'Hint', 'Cinli', 'Japon', 'Koreli',
      'Guneydogu Asyali', 'Latin / Hispanik', 'Yerli Amerikali', 'Polinezyali',
      'Karma / cok etnikli',
    ],
  },
  {
    key: 'skinTone',
    label: 'Ten rengi',
    type: 'select',
    required: true,
    options: [
      'Cok acik (porselen)', 'Acik', 'Acik bugday', 'Bugday', 'Zeytin',
      'Orta esmer', 'Koyu esmer', 'Cok koyu (abanoz)',
    ],
  },
  {
    key: 'eyeColor',
    label: 'Goz rengi',
    type: 'select',
    required: true,
    options: ['Kahverengi', 'Koyu kahve / siyaha yakin', 'Ela', 'Yesil', 'Mavi', 'Gri', 'Amber'],
  },
  {
    key: 'hairColor',
    label: 'Sac rengi',
    hint: 'Gorsel uretimi icin zorunlu. Sabit kalir.',
    type: 'select',
    required: true,
    options: ['Siyah', 'Koyu kahve', 'Kahverengi', 'Acik kahve', 'Sari / blonde', 'Platin', 'Kizil', 'Gri / gumus', 'Renkli (fantezi)'],
  },
  {
    key: 'hairStyle',
    label: 'Sac tipi ve uzunlugu',
    type: 'select',
    required: true,
    options: [
      'Kisa duz', 'Kisa dalgali', 'Kisa kivircik', 'Omuz hizasi duz',
      'Omuz hizasi dalgali', 'Uzun duz', 'Uzun dalgali', 'Uzun kivircik',
      'Afro', 'Orgu / braids', 'Topuz', 'Trasli / cok kisa',
    ],
  },
  {
    key: 'age',
    label: 'Yas',
    hint: 'En az 18. Karakterin yasi tum uretimlerde sabit kalir.',
    type: 'number',
    required: true,
    min: 18,
    max: 75,
    default: 25,
  },
  {
    key: 'bodyType',
    label: 'Vucut tipi',
    type: 'select',
    required: true,
    options: [
      'Ince / zayif', 'Atletik', 'Kaslı', 'Kum saati', 'Armut', 'Elma',
      'Duz / dikdortgen', 'Kivrimli', 'Ortalama', 'Uzun ve ince (manken)', 'Balikci / iri yapili',
    ],
  },
  {
    key: 'measurements',
    label: 'Vucut olculeri',
    hint: 'Boy ve kilo zorunlu. Diger olculer opsiyonel - siluetin tutarli kalmasini saglar.',
    type: 'measurements',
    required: true,
    fields: [
      { key: 'height_cm', label: 'Boy (cm)', min: 140, max: 210, default: 170, required: true },
      { key: 'weight_kg', label: 'Kilo (kg)', min: 40, max: 160, default: 60, required: true },
      { key: 'bust_cm', label: 'Gogus / gogus kafesi (cm)', min: 60, max: 150, required: false },
      { key: 'waist_cm', label: 'Bel (cm)', min: 45, max: 140, required: false },
      { key: 'hips_cm', label: 'Kalca (cm)', min: 60, max: 160, required: false },
      { key: 'shoe_eu', label: 'Ayakkabi (EU)', min: 33, max: 50, required: false },
    ],
  },
  {
    key: 'distinctive',
    label: 'Ayirt edici ozellikler',
    hint: 'Karakteri kalabaliktan ayiran detaylar. En fazla 2 sec. DIKKAT: bazi ozellikler (ozellikle dovme ve yogun cil) her karede farkli cikar ve hata payini ciddi artirir - risk rozetlerine bak.',
    type: 'multiselect',
    required: false,
    min: 0,
    max: 2,
    options: traits.options(),
    meta: traits.meta(),
    riskWarning: 'Yuksek riskli bir ozellik sectin. Bu ozellik her uretimde birebir ayni cikmayacak; karakter kartinda ve uretim ekraninda bu uyariyi tekrar goreceksin.',
  },
  {
    key: 'zodiac',
    label: 'Burc',
    hint: 'Karakterin kisiligini, konusma tonunu ve poz enerjisini belirler.',
    type: 'select',
    required: true,
    options: [
      'Koc', 'Boga', 'Ikizler', 'Yengec', 'Aslan', 'Basak',
      'Terazi', 'Akrep', 'Yay', 'Oglak', 'Kova', 'Balik',
    ],
  },
  {
    key: 'education',
    label: 'Egitim duzeyi',
    hint: 'Nasil konusacagini belirler: kelime dagarcigi, cumle uzunlugu, jargon.',
    type: 'select',
    required: true,
    options: [
      'Ilkogretim', 'Lise', 'Meslek yuksekokulu', 'Universite (lisans)',
      'Yuksek lisans', 'Doktora', 'Otodidakt (kendi kendini yetistirmis)',
    ],
  },
  {
    key: 'interests',
    label: 'Ilgi alanlari',
    hint: 'En az 2, en fazla 5 secin. Kiyafet, mekan, aksesuar ve icerik konulari buradan uretilir.',
    type: 'multiselect',
    required: true,
    min: 2,
    max: 5,
    options: [
      'Fitness', 'Yoga / pilates', 'Saglikli beslenme', 'Moda', 'Guzellik / makyaj',
      'Seyahat', 'Kahve', 'Gastronomi', 'Kitap / edebiyat', 'Muzik', 'Dans',
      'Sanat / tasarim', 'Fotografcilik', 'Teknoloji', 'Yapay zeka', 'Bilim / uzay',
      'Oyun / gaming', 'Otomobil', 'Motosiklet', 'Finans / yatirim', 'Girisimcilik',
      'Doga / kamp', 'Surf / deniz', 'Kayak', 'Evcil hayvan', 'Ic mimari / dekorasyon',
      'Surdurulebilirlik', 'Mental saglik', 'Verimlilik', 'Astroloji',
    ],
  },
];

const IDENTITY_QUESTIONS = [
  {
    key: 'name',
    section: 'Kimlik',
    label: 'Karakterin adi',
    hint: 'Bos birakirsan bolgeye uygun bir isim onerilir.',
    type: 'text',
    required: false,
    maxLength: 40,
  },
  {
    key: 'handle',
    section: 'Kimlik',
    label: 'Kullanici adi (@)',
    hint: 'Bos birakirsan isim ve ilgi alanindan uretilir.',
    type: 'text',
    required: false,
    maxLength: 30,
  },
];

// Gorunus sorularina bolum etiketi ekle (panelde grupli ilerleme cubugu icin).
for (const q of QUESTIONS) {
  if (!q.section) q.section = (q.key === 'zodiac' || q.key === 'education' || q.key === 'interests') ? 'Karakter' : 'Gorunus';
}

/**
 * Sihirbazin tam soru listesi: gorunus -> hayat -> karakter -> kimlik.
 * "Bir insan yaratiyoruz" - o yuzden yuzden sonra hayat da soruluyor.
 */
const ALL_QUESTIONS = [...QUESTIONS, ...life.LIFE_QUESTIONS, ...IDENTITY_QUESTIONS];

const LIFE_KEYS = new Set(life.LIFE_QUESTIONS.map((q) => q.key));

/** Panelin gostereceği sorular: bolgeye bagli secenekler cozulmus halde. */
function questionsFor(answers = {}) {
  const cities = life.citiesFor(answers.region).map((c) => c.tr);
  return ALL_QUESTIONS.map((q) => {
    if (q.type !== 'dynamic-select') return q;
    const options = q.source === 'cities+same'
      ? ['Ayni sehir', ...cities]
      : cities;
    return { ...q, type: 'select-or-text', options };
  });
}

function sections() {
  const seen = [];
  for (const q of ALL_QUESTIONS) {
    if (!seen.includes(q.section)) seen.push(q.section);
  }
  return seen;
}

const NAME_POOL = {
  'Akdeniz': ['Elara', 'Nyla', 'Selin', 'Mira', 'Theo', 'Luca', 'Adrian', 'Kaya'],
  'Kuzey Avrupa': ['Freya', 'Sigrid', 'Astrid', 'Iris', 'Magnus', 'Erik', 'Soren', 'Kai'],
  'Bati Avrupa': ['Amelie', 'Clara', 'Noa', 'Elise', 'Julien', 'Milo', 'Lucas', 'Elliot'],
  'Dogu Avrupa': ['Milena', 'Lena', 'Zora', 'Iva', 'Dmitri', 'Anton', 'Nikola', 'Sasha'],
  'Balkanlar': ['Lara', 'Ana', 'Tara', 'Maya', 'Luka', 'Marko', 'Nikola', 'Stefan'],
  'Anadolu / Turkiye': ['Deniz', 'Ada', 'Ela', 'Nehir', 'Aras', 'Kerem', 'Toprak', 'Alp'],
  'Kafkasya': ['Nino', 'Salome', 'Anahit', 'Lika', 'Giorgi', 'Levan', 'Aram', 'Davit'],
  'Orta Dogu': ['Lila', 'Yara', 'Zeyn', 'Noor', 'Rami', 'Karim', 'Adel', 'Sami'],
  'Kuzey Afrika': ['Amina', 'Nadia', 'Sanaa', 'Layla', 'Youssef', 'Idris', 'Omar', 'Tarek'],
  'Sahra Alti Afrika': ['Ayana', 'Zuri', 'Nia', 'Amara', 'Kwame', 'Jabari', 'Sekou', 'Tendai'],
  'Orta Asya': ['Aisha', 'Dilnaz', 'Gulnara', 'Aruzhan', 'Timur', 'Aibek', 'Ruslan', 'Bek'],
  'Guney Asya': ['Aria', 'Meera', 'Kiara', 'Anaya', 'Arjun', 'Dev', 'Rohan', 'Vir'],
  'Dogu Asya': ['Rin', 'Yuna', 'Mei', 'Hana', 'Kenji', 'Haru', 'Jin', 'Tao'],
  'Guneydogu Asya': ['Maya', 'Sari', 'Anh', 'Lia', 'Bayu', 'Rizal', 'Minh', 'Tarek'],
  'Latin Amerika': ['Valentina', 'Camila', 'Luna', 'Sofia', 'Mateo', 'Diego', 'Nico', 'Emilio'],
  'Kuzey Amerika': ['Ava', 'Riley', 'Harper', 'Sage', 'Mason', 'Jordan', 'Cole', 'Blake'],
  'Okyanusya': ['Moana', 'Kiri', 'Talia', 'Aroha', 'Tane', 'Koa', 'Manu', 'Ari'],
};

const FEMININE = new Set(['Kadin']);

function suggestName(answers) {
  const pool = NAME_POOL[answers.region] || NAME_POOL['Kuzey Amerika'];
  const half = Math.floor(pool.length / 2);
  const slice = FEMININE.has(answers.gender) ? pool.slice(0, half) : pool.slice(half);
  const source = slice.length ? slice : pool;
  const idx = crypto.randomInt(0, source.length);
  return source[idx];
}

function slugify(str) {
  const map = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u' };
  return String(str)
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => map[ch] || ch)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
}

function suggestHandle(name, interests) {
  const tag = (interests && interests[0]) || '';
  const tagMap = {
    'Fitness': 'fit', 'Yoga / pilates': 'flow', 'Saglikli beslenme': 'wellness',
    'Moda': 'style', 'Guzellik / makyaj': 'glow', 'Seyahat': 'travels',
    'Kahve': 'brews', 'Gastronomi': 'eats', 'Kitap / edebiyat': 'reads',
    'Muzik': 'sound', 'Dans': 'moves', 'Sanat / tasarim': 'studio',
    'Fotografcilik': 'frames', 'Teknoloji': 'tech', 'Yapay zeka': 'ai',
    'Bilim / uzay': 'cosmos', 'Oyun / gaming': 'plays', 'Otomobil': 'drives',
    'Finans / yatirim': 'capital', 'Girisimcilik': 'builds', 'Doga / kamp': 'wild',
    'Surf / deniz': 'surf', 'Evcil hayvan': 'paws', 'Surdurulebilirlik': 'eco',
    'Mental saglik': 'mind', 'Verimlilik': 'focus', 'Astroloji': 'stars',
  };
  const suffix = tagMap[tag] || 'daily';
  return `${slugify(name)}.${suffix}`;
}

/* -------------------------------------------------------------- dogrulama */

function validate(answers) {
  const errors = [];
  const clean = {};

  for (const q of ALL_QUESTIONS) {
    const raw = answers ? answers[q.key] : undefined;

    // Sehir gibi hem listeden secilebilen hem elle yazilabilen alanlar.
    if (q.type === 'dynamic-select' || q.type === 'select-or-text') {
      const text = typeof raw === 'string' ? raw.trim() : '';
      if (!text && q.required) errors.push(`${q.label} zorunlu.`);
      clean[q.key] = text.slice(0, 60);
      continue;
    }

    if (q.type === 'measurements') {
      const value = raw && typeof raw === 'object' ? raw : {};
      const out = {};
      for (const f of q.fields) {
        const num = value[f.key] === '' || value[f.key] == null ? null : Number(value[f.key]);
        if (num == null || Number.isNaN(num)) {
          if (f.required) errors.push(`${f.label} zorunlu.`);
          continue;
        }
        if (num < f.min || num > f.max) {
          errors.push(`${f.label} ${f.min}-${f.max} araliginda olmali.`);
          continue;
        }
        out[f.key] = num;
      }
      clean[q.key] = out;
      continue;
    }

    if (q.type === 'multiselect') {
      let value = Array.isArray(raw) ? raw.filter((v) => q.options.includes(v)) : [];
      value = [...new Set(value)];
      // "Yok" secildiyse digerlerini elemek gerekir - celiskili olur.
      if (value.includes('Yok')) value = [];
      if (value.length < q.min) errors.push(`${q.label}: en az ${q.min} secim gerekli.`);
      if (value.length > q.max) errors.push(`${q.label}: en fazla ${q.max} secilebilir.`);
      clean[q.key] = value.slice(0, q.max);
      continue;
    }

    if (q.type === 'number') {
      const num = Number(raw);
      if (Number.isNaN(num)) {
        errors.push(`${q.label} sayi olmali.`);
        continue;
      }
      if (num < q.min) {
        // Yas siniri: 18 alti karakter uretilmez.
        errors.push(`${q.label} en az ${q.min} olmali.`);
        continue;
      }
      if (num > q.max) {
        errors.push(`${q.label} en fazla ${q.max} olabilir.`);
        continue;
      }
      clean[q.key] = Math.round(num);
      continue;
    }

    if (q.type === 'select') {
      if (!q.options.includes(raw)) {
        if (q.required) errors.push(`${q.label} secilmeli.`);
        continue;
      }
      clean[q.key] = raw;
      continue;
    }

    // text
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (!text && q.required) errors.push(`${q.label} zorunlu.`);
    clean[q.key] = text.slice(0, q.maxLength || 100);
  }

  return { ok: errors.length === 0, errors, clean };
}

/**
 * Kimlik blogundan deterministik seed uretir.
 * Ayni kimlik -> ayni seed -> ayni yuz (seed destekleyen modellerde).
 */
function deriveSeed(identity) {
  const basis = JSON.stringify([
    identity.gender, identity.region, identity.ethnicity, identity.skinTone,
    identity.eyeColor, identity.hairColor, identity.hairStyle, identity.age,
    identity.bodyType, identity.distinctive, identity.name,
  ]);
  const hash = crypto.createHash('sha256').update(basis).digest();
  // 32-bit pozitif tamsayi (cogu difuzyon modelinin kabul ettigi aralik)
  return hash.readUInt32BE(0) % 2147483647;
}

/** Temiz cevaplardan hayat blogunu ayirir. */
function extractLife(clean) {
  const out = {};
  for (const key of LIFE_KEYS) out[key] = clean[key];
  if (out.hometown === 'Ayni sehir') out.hometown = out.city;
  return out;
}

module.exports = {
  QUESTIONS,
  ALL_QUESTIONS,
  IDENTITY_QUESTIONS,
  LIFE_KEYS,
  questionsFor,
  sections,
  validate,
  suggestName,
  suggestHandle,
  deriveSeed,
  slugify,
  extractLife,
};
