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

/**
 * YUZ GEOMETRISI ALANLARI
 *
 * Hepsi opsiyonel. Bos birakilan alan prompt'a HIC girmez ve seed'i
 * degistirmez - yani bu alanlar eklenmeden once yaratilmis karakterler
 * birebir ayni sekilde uretmeye devam eder.
 *
 * NOT_SET listenin ILK secenegi olmak zorunda: panel bos <option> uretmiyor,
 * ilk secenek varsayilan secili geliyor ve form onu gonderiyor. Ilk secenek
 * gercek bir deger olsaydi, eski karakterini kaydeden kullanici farkinda
 * olmadan yuz atar ve seed'ini kirardi.
 */
const NOT_SET = 'Belirtmeyecegim';
const FACE_KEYS = [
  'faceShape', 'jawline', 'cheekbones', 'forehead',
  'eyeShape', 'eyeSet', 'browShape',
  'noseBridge', 'noseTip',
  'lipFullness', 'philtrum',
  'ears', 'skinTexture',
];

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
      'Cok acik (porselen)', 'Soluk / soguk ton', 'Acik', 'Kizila calan acik',
      'Acik bugday', 'Bugday', 'Altin bugday', 'Zeytin',
      'Orta esmer', 'Koyu esmer', 'Cok koyu (abanoz)',
    ],
  },
  {
    key: 'eyeColor',
    label: 'Goz rengi',
    type: 'select',
    required: true,
    options: [
      'Kahverengi', 'Koyu kahve / siyaha yakin', 'Acik kahve / bal', 'Ela',
      'Yesil', 'Yesil-ela', 'Mavi', 'Koyu mavi', 'Buz mavisi', 'Gri', 'Gri-yesil', 'Amber',
    ],
  },
  {
    key: 'hairColor',
    label: 'Sac rengi',
    hint: 'Gorsel uretimi icin zorunlu. Sabit kalir.',
    type: 'select',
    required: true,
    options: [
      'Siyah', 'Koyu kahve', 'Kahverengi', 'Kumral', 'Acik kahve',
      'Bal sarisi', 'Sari / blonde', 'Platin', 'Kizil', 'Bakir',
      'Gri / gumus', 'Beyaz', 'Renkli (fantezi)',
    ],
  },
  {
    key: 'hairStyle',
    label: 'Sac tipi ve uzunlugu',
    type: 'select',
    required: true,
    options: [
      'Trasli / cok kisa', 'Kisa duz', 'Kisa dalgali', 'Kisa kivircik',
      'Bob', 'Dalgali bob', 'Omuz hizasi duz', 'Omuz hizasi dalgali', 'Omuz hizasi kivircik',
      'Uzun duz', 'Uzun dalgali', 'Uzun kivircik', 'Afro', 'Sıkı bukleli (coil)',
      'Orgu / braids', 'Dredlok', 'Topuz', 'At kuyrugu',
    ],
  },
  {
    key: 'age',
    label: 'Yas',
    hint: 'En az 18 (yasal sinir). Ust sinir 90 - istedigin yasi yaz. Sabit kalir.',
    type: 'number',
    required: true,
    min: 18,
    max: 90,
    default: 25,
  },
  {
    key: 'bodyType',
    label: 'Vucut tipi',
    type: 'select',
    required: true,
    options: [
      'Ince / zayif', 'Ince ve kaslı', 'Atletik', 'Kaslı', 'Cok kaslı (vucut gelistirme)',
      'Kum saati', 'Armut', 'Elma', 'Duz / dikdortgen', 'Kivrimli',
      'Ortalama', 'Uzun ve ince (manken)', 'Iri / plus size', 'Balikci / iri yapili',
      'Kucuk yapili (orantili kisa boy)', 'Cucelik (akondroplazi)',
    ],
  },
  {
    key: 'measurements',
    label: 'Vucut olculeri',
    hint: 'Boy ve kilo zorunlu, digerleri opsiyonel. Araliklar bilerek genis: 110 cm de yazabilirsin 250 cm de.',
    type: 'measurements',
    required: true,
    fields: [
      { key: 'height_cm', label: 'Boy (cm)', min: 110, max: 250, default: 170, required: true },
      { key: 'weight_kg', label: 'Kilo (kg)', min: 25, max: 250, default: 60, required: true },
      { key: 'bust_cm', label: 'Gogus / gogus kafesi (cm)', min: 50, max: 200, required: false },
      { key: 'waist_cm', label: 'Bel (cm)', min: 40, max: 200, required: false },
      { key: 'hips_cm', label: 'Kalca (cm)', min: 50, max: 220, required: false },
      { key: 'shoe_eu', label: 'Ayakkabi (EU)', min: 30, max: 55, required: false },
    ],
  },
  {
    key: 'appearanceNote',
    label: 'Ek gorunum detayi (opsiyonel)',
    hint: 'Listede olmayan bir sey varsa buraya yaz; prompt\'a aynen eklenir. INGILIZCE yazarsan model daha iyi anlar. Ornek: "wearing a hearing aid", "uses a wheelchair", "long neck tattoo-free elegant posture".',
    type: 'text',
    required: false,
    maxLength: 160,
  },
  {
    key: 'distinctive',
    label: 'Ayirt edici ozellikler',
    hint: 'Karakteri kalabaliktan ayiran detaylar. En fazla 2 sec. Dovme ve cil listeden cikarildi: her karede farkli ciktiklari icin tutarliligi bozuyorlardi, artik aktif olarak engelleniyorlar. Kalan seceneklerin risk rozetlerine bak.',
    type: 'multiselect',
    required: false,
    min: 0,
    max: 2,
    options: traits.options(),
    meta: traits.meta(),
    riskWarning: 'Yuksek riskli bir ozellik sectin. Bu ozellik her uretimde birebir ayni cikmayacak; karakter kartinda ve uretim ekraninda bu uyariyi tekrar goreceksin.',
  },
  {
    key: 'faceShape',
    label: 'Yuz sekli',
    hint: 'Buradan asagisi YUZ GEOMETRISI. Hepsi opsiyonel - bosta birakabilirsin. Ama ucretsiz katmanda (referans gorsel kabul etmeyen platformlarda) yuzu tutan TEK sey metindir; ne kadar doldurursan acilar arasinda o kadar az kayar.',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Oval', 'Yuvarlak', 'Kare', 'Dikdortgen / uzun', 'Kalp', 'Elmas', 'Ucgen', 'Armut'],
  },
  {
    key: 'jawline',
    label: 'Cene hatti',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Keskin ve belirgin', 'Yumusak ve yuvarlak', 'Kare ve genis', 'Sivri / dar', 'Cukur cene', 'Ileri cikik cene', 'Geri cekik cene'],
  },
  {
    key: 'cheekbones',
    label: 'Elmacik kemigi',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Cok belirgin / yuksek', 'Belirgin', 'Orta', 'Duz / az belirgin', 'Dolgun yanaklar', 'Cokuk yanaklar'],
  },
  {
    key: 'forehead',
    label: 'Alin',
    hint: 'Ince detay: genis kadrajli karelerde (tam boy gibi) prompt\'a girmez, yuz zaten birkac piksel olur.',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Genis ve yuksek', 'Genis', 'Orta', 'Dar', 'Alcak', 'Hafif cikik'],
  },
  {
    key: 'eyeShape',
    label: 'Goz sekli',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Badem', 'Yuvarlak / iri', 'Capakli / hooded', 'Monolid', 'Cekik / yukari kalkik', 'Asagi egimli', 'Dar / cizgi', 'Belirgin cift kapak'],
  },
  {
    key: 'eyeSet',
    label: 'Goz araligi ve derinligi',
    hint: 'Ince detay: genis kadrajda prompt\'a girmez.',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Genis aralikli', 'Dar aralikli', 'Ortalama aralikli', 'Derin yerlesik', 'Cikik / one yerlesik'],
  },
  {
    key: 'browShape',
    label: 'Kas sekli',
    hint: 'DIKKAT: "Ayirt edici ozellikler" listesinde "Belirgin kaslar" secildiyse ikisi celisebilir. Birini sec.',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Duz ve kalin', 'Duz ve ince', 'Kemerli ve kalin', 'Kemerli ve ince', 'Yumusak kavisli', 'Keskin acili', 'Dogal / bakimsiz', 'Birlesige yakin'],
  },
  {
    key: 'noseBridge',
    label: 'Burun koprusu',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Duz ve ince', 'Duz ve genis', 'Yuksek / belirgin', 'Alcak / duz', 'Kemerli (Roma)', 'Cukur (kavisli)'],
  },
  {
    key: 'noseTip',
    label: 'Burun ucu',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Sivri', 'Yuvarlak', 'Genis / etli', 'Yukari kalkik', 'Asagi donuk', 'Bolunmus'],
  },
  {
    key: 'lipFullness',
    label: 'Dudak dolgunlugu ve agiz',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Cok dolgun', 'Dolgun', 'Orta', 'Ince', 'Ust dudak ince', 'Alt dudak dolgun', 'Genis agiz', 'Kucuk agiz'],
  },
  {
    key: 'philtrum',
    label: 'Filtrum (burun-dudak olugu)',
    hint: 'Ince detay: genis kadrajda prompt\'a girmez.',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Belirgin ve derin', 'Hafif', 'Uzun', 'Kisa', 'Belirgin kirik yay'],
  },
  {
    key: 'ears',
    label: 'Kulaklar',
    hint: 'Ince detay: genis kadrajda prompt\'a girmez.',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Kucuk ve yatik', 'Orta', 'Buyuk', 'Kepce / disari acik', 'Sivri ust kenar', 'Yapisik memecik', 'Serbest memecik'],
  },
  {
    key: 'skinTexture',
    label: 'Ten dokusu',
    hint: 'Gercekcilik icin en etkili alanlardan biri: "gozenekli" yazmak modeli plastik cilt refleksinden ceker.',
    type: 'select',
    required: false,
    section: 'Yuz',
    options: [NOT_SET, 'Belirgin gozenekli', 'Normal gozenekli', 'Ince dokulu', 'Kuru / mat', 'Yagli / parlak', 'Ifade cizgileri belirgin', 'Gunes gormus'],
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

/**
 * Panelin gostereceği sorular.
 * - Kosullu sorular elenir (ornek: memleket ayniysa memleket kitasi sorulmaz)
 * - Fonksiyon olan secenekler cozulur (kita -> ulke -> sehir zinciri)
 * Panel her cevaptan sonra bunu yeniden ister; boylece zincir hep gunceldir.
 */
function questionsFor(answers = {}) {
  return ALL_QUESTIONS
    .filter((q) => life.visible(q, answers))
    .map((q) => life.resolveOptions(q, answers));
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

  // Kosullu sorular gorunur degilse dogrulanmaz (memleket ayniysa memleket
  // kitasi/ulkesi sorulmuyor - zorunlu saymak yanlis olur).
  for (const q of questionsFor(answers || {})) {
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
  // ESKI 11 ELEMANLI DIZI AYNEN KORUNUR. Yuz alanlari yalnizca EN AZ BIRI
  // doluysa dizinin sonuna tek bir parmak izi olarak eklenir; boylece yuz
  // secmemis mevcut karakterlerin seed'i degismez.
  const legacy = [
    identity.gender, identity.region, identity.ethnicity, identity.skinTone,
    identity.eyeColor, identity.hairColor, identity.hairStyle, identity.age,
    identity.bodyType, identity.distinctive, identity.name,
  ];
  const face = FACE_KEYS
    .map((k) => (identity[k] && identity[k] !== NOT_SET ? `${k}=${identity[k]}` : ''))
    .filter(Boolean)
    .join('|');
  const basis = JSON.stringify(face ? [...legacy, face] : legacy);
  const hash = crypto.createHash('sha256').update(basis).digest();
  // 32-bit pozitif tamsayi (cogu difuzyon modelinin kabul ettigi aralik)
  return hash.readUInt32BE(0) % 2147483647;
}

/** Temiz cevaplardan hayat blogunu ayirir. */
function extractLife(clean) {
  const out = {};
  for (const key of LIFE_KEYS) {
    if (clean[key] !== undefined) out[key] = clean[key];
  }
  // Kademeli secimleri tek etikete cevir: "Barselona, İspanya"
  const places = life.composePlaces(clean);
  out.city = places.city;
  out.hometown = places.hometown;
  return out;
}

module.exports = {
  QUESTIONS,
  FACE_KEYS,
  NOT_SET,
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
