'use strict';

/**
 * HAYAT KATMANI
 *
 * Bir AI influencer sadece bir yuz degildir. Nerede dogdu, ailesi ne is yapiyor,
 * ne kazaniyor, evi nasil, kime benziyor, neyden korkuyor - bunlar olmadan
 * karakter bos bir manken olur ve caption'lari birbirine benzer.
 *
 * Bu dosya: hayat sorulari + bolgeye gore sehir havuzu + tutarli otomatik
 * doldurma + Turkce karakter dosyasi (dossier) uretimi.
 *
 * Onemli: bu katman gorsel prompt'una DOGRUDAN girmez. Girdigi yerler:
 * mekan secimi (sehir), kiyafet/aksesuar (gelir duzeyi), caption tonu ve
 * icerik konulari. Yani karakterin nasil gorundugunu degil, NEREDE ve NASIL
 * yasadigini belirler.
 */

/* --------------------------------------------------- bolgeye gore sehirler */

const CITIES = {
  'Akdeniz': [
    { tr: 'Barselona, İspanya', en: 'Barcelona, Spain' },
    { tr: 'Napoli, İtalya', en: 'Naples, Italy' },
    { tr: 'Atina, Yunanistan', en: 'Athens, Greece' },
    { tr: 'Marsilya, Fransa', en: 'Marseille, France' },
    { tr: 'Valensiya, İspanya', en: 'Valencia, Spain' },
    { tr: 'Palermo, İtalya', en: 'Palermo, Italy' },
  ],
  'Kuzey Avrupa': [
    { tr: 'Stockholm, İsveç', en: 'Stockholm, Sweden' },
    { tr: 'Kopenhag, Danimarka', en: 'Copenhagen, Denmark' },
    { tr: 'Oslo, Norveç', en: 'Oslo, Norway' },
    { tr: 'Helsinki, Finlandiya', en: 'Helsinki, Finland' },
    { tr: 'Reykjavik, İzlanda', en: 'Reykjavik, Iceland' },
  ],
  'Bati Avrupa': [
    { tr: 'Paris, Fransa', en: 'Paris, France' },
    { tr: 'Amsterdam, Hollanda', en: 'Amsterdam, Netherlands' },
    { tr: 'Berlin, Almanya', en: 'Berlin, Germany' },
    { tr: 'Londra, İngiltere', en: 'London, England' },
    { tr: 'Lizbon, Portekiz', en: 'Lisbon, Portugal' },
    { tr: 'Dublin, İrlanda', en: 'Dublin, Ireland' },
  ],
  'Dogu Avrupa': [
    { tr: 'Varşova, Polonya', en: 'Warsaw, Poland' },
    { tr: 'Prag, Çekya', en: 'Prague, Czechia' },
    { tr: 'Budapeşte, Macaristan', en: 'Budapest, Hungary' },
    { tr: 'Bükreş, Romanya', en: 'Bucharest, Romania' },
    { tr: 'Kiev, Ukrayna', en: 'Kyiv, Ukraine' },
  ],
  'Balkanlar': [
    { tr: 'Belgrad, Sırbistan', en: 'Belgrade, Serbia' },
    { tr: 'Zagreb, Hırvatistan', en: 'Zagreb, Croatia' },
    { tr: 'Split, Hırvatistan', en: 'Split, Croatia' },
    { tr: 'Saraybosna, Bosna', en: 'Sarajevo, Bosnia' },
    { tr: 'Tiran, Arnavutluk', en: 'Tirana, Albania' },
  ],
  'Anadolu / Turkiye': [
    { tr: 'İstanbul', en: 'Istanbul, Turkey' },
    { tr: 'İzmir', en: 'Izmir, Turkey' },
    { tr: 'Ankara', en: 'Ankara, Turkey' },
    { tr: 'Antalya', en: 'Antalya, Turkey' },
    { tr: 'Bodrum', en: 'Bodrum, Turkey' },
    { tr: 'Eskişehir', en: 'Eskisehir, Turkey' },
  ],
  'Kafkasya': [
    { tr: 'Tiflis, Gürcistan', en: 'Tbilisi, Georgia' },
    { tr: 'Erivan, Ermenistan', en: 'Yerevan, Armenia' },
    { tr: 'Bakü, Azerbaycan', en: 'Baku, Azerbaijan' },
    { tr: 'Batum, Gürcistan', en: 'Batumi, Georgia' },
  ],
  'Orta Dogu': [
    { tr: 'Dubai, BAE', en: 'Dubai, UAE' },
    { tr: 'Beyrut, Lübnan', en: 'Beirut, Lebanon' },
    { tr: 'Amman, Ürdün', en: 'Amman, Jordan' },
    { tr: 'Doha, Katar', en: 'Doha, Qatar' },
    { tr: 'Tel Aviv, İsrail', en: 'Tel Aviv, Israel' },
  ],
  'Kuzey Afrika': [
    { tr: 'Kazablanka, Fas', en: 'Casablanca, Morocco' },
    { tr: 'Marakeş, Fas', en: 'Marrakesh, Morocco' },
    { tr: 'Kahire, Mısır', en: 'Cairo, Egypt' },
    { tr: 'Tunus, Tunus', en: 'Tunis, Tunisia' },
  ],
  'Sahra Alti Afrika': [
    { tr: 'Lagos, Nijerya', en: 'Lagos, Nigeria' },
    { tr: 'Nairobi, Kenya', en: 'Nairobi, Kenya' },
    { tr: 'Cape Town, Güney Afrika', en: 'Cape Town, South Africa' },
    { tr: 'Accra, Gana', en: 'Accra, Ghana' },
    { tr: 'Addis Ababa, Etiyopya', en: 'Addis Ababa, Ethiopia' },
  ],
  'Orta Asya': [
    { tr: 'Almatı, Kazakistan', en: 'Almaty, Kazakhstan' },
    { tr: 'Taşkent, Özbekistan', en: 'Tashkent, Uzbekistan' },
    { tr: 'Bişkek, Kırgızistan', en: 'Bishkek, Kyrgyzstan' },
  ],
  'Guney Asya': [
    { tr: 'Mumbai, Hindistan', en: 'Mumbai, India' },
    { tr: 'Yeni Delhi, Hindistan', en: 'New Delhi, India' },
    { tr: 'Bangalore, Hindistan', en: 'Bangalore, India' },
    { tr: 'Kolombo, Sri Lanka', en: 'Colombo, Sri Lanka' },
  ],
  'Dogu Asya': [
    { tr: 'Tokyo, Japonya', en: 'Tokyo, Japan' },
    { tr: 'Seul, Güney Kore', en: 'Seoul, South Korea' },
    { tr: 'Şangay, Çin', en: 'Shanghai, China' },
    { tr: 'Taipei, Tayvan', en: 'Taipei, Taiwan' },
    { tr: 'Kyoto, Japonya', en: 'Kyoto, Japan' },
  ],
  'Guneydogu Asya': [
    { tr: 'Bangkok, Tayland', en: 'Bangkok, Thailand' },
    { tr: 'Bali, Endonezya', en: 'Bali, Indonesia' },
    { tr: 'Singapur', en: 'Singapore' },
    { tr: 'Ho Chi Minh, Vietnam', en: 'Ho Chi Minh City, Vietnam' },
    { tr: 'Manila, Filipinler', en: 'Manila, Philippines' },
  ],
  'Latin Amerika': [
    { tr: 'Mexico City, Meksika', en: 'Mexico City, Mexico' },
    { tr: 'Buenos Aires, Arjantin', en: 'Buenos Aires, Argentina' },
    { tr: 'Rio de Janeiro, Brezilya', en: 'Rio de Janeiro, Brazil' },
    { tr: 'Bogota, Kolombiya', en: 'Bogota, Colombia' },
    { tr: 'Medellin, Kolombiya', en: 'Medellin, Colombia' },
  ],
  'Kuzey Amerika': [
    { tr: 'New York, ABD', en: 'New York City, USA' },
    { tr: 'Los Angeles, ABD', en: 'Los Angeles, USA' },
    { tr: 'Miami, ABD', en: 'Miami, USA' },
    { tr: 'Toronto, Kanada', en: 'Toronto, Canada' },
    { tr: 'Austin, ABD', en: 'Austin, USA' },
  ],
  'Okyanusya': [
    { tr: 'Sidney, Avustralya', en: 'Sydney, Australia' },
    { tr: 'Melbourne, Avustralya', en: 'Melbourne, Australia' },
    { tr: 'Auckland, Yeni Zelanda', en: 'Auckland, New Zealand' },
    { tr: 'Gold Coast, Avustralya', en: 'Gold Coast, Australia' },
  ],
};

const ALL_CITIES = Object.values(CITIES).flat();

function citiesFor(region) {
  return CITIES[region] || ALL_CITIES.slice(0, 6);
}

function cityEn(trName) {
  const hit = ALL_CITIES.find((c) => c.tr === trName);
  return hit ? hit.en : trName;
}

/* ------------------------------------------------------------- sorular */

const LIFE_QUESTIONS = [
  {
    key: 'city',
    section: 'Hayat',
    label: 'Su an nerede yasiyor?',
    hint: 'Bu secim gorsellerdeki mekanlari ve icerigin atmosferini belirler.',
    type: 'dynamic-select',
    source: 'cities',
    required: true,
  },
  {
    key: 'hometown',
    section: 'Hayat',
    label: 'Nerede dogup buyudu?',
    hint: 'Ayni sehir olabilir; farkli olursa karaktere "tasindim" hikayesi kazandirir.',
    type: 'dynamic-select',
    source: 'cities+same',
    required: true,
  },
  {
    key: 'socioeconomic',
    section: 'Hayat',
    label: 'Hangi sosyoekonomik yapidan geliyor?',
    hint: 'Kiyafet kalitesini, mekan secimini ve konusma tonunu etkiler.',
    type: 'select',
    required: true,
    options: [
      'Dar gelirli aile, kendi yolunu acti',
      'Alt-orta sinif, calisarak okudu',
      'Orta sinif, dengeli bir cocukluk',
      'Ust-orta sinif, iyi egitim imkani',
      'Varlikli aile, imkanlar hazir',
      'Gocmen aile, sifirdan kuruldu',
    ],
  },
  {
    key: 'fatherJob',
    section: 'Aile',
    label: 'Babasi ne is yapiyor(du)?',
    type: 'select',
    required: true,
    options: [
      'Ogretmen', 'Esnaf / dukkan sahibi', 'Isci / fabrika', 'Ciftci', 'Muhendis',
      'Doktor', 'Memur', 'Sofor', 'Asci', 'Muzisyen', 'Kucuk isletme sahibi',
      'Emekli', 'Hayatta degil / tanimadi', 'Bilinmiyor / anlatmiyor',
    ],
  },
  {
    key: 'motherJob',
    section: 'Aile',
    label: 'Annesi ne is yapiyor(du)?',
    type: 'select',
    required: true,
    options: [
      'Ev hanimi', 'Ogretmen', 'Hemsire', 'Terzi', 'Esnaf', 'Muhasebeci',
      'Doktor', 'Memur', 'Sanatci', 'Kucuk isletme sahibi', 'Emekli',
      'Hayatta degil / tanimadi', 'Bilinmiyor / anlatmiyor',
    ],
  },
  {
    key: 'siblings',
    section: 'Aile',
    label: 'Kardesi var mi?',
    type: 'select',
    required: true,
    options: [
      'Tek cocuk', 'Bir ablasi var', 'Bir agabeyi var', 'Bir kiz kardesi var',
      'Bir erkek kardesi var', 'Iki kardesi var', 'Kalabalik aile (3+ kardes)',
    ],
  },
  {
    key: 'maritalStatus',
    section: 'Hayat',
    label: 'Iliski durumu?',
    hint: 'Icerikte ne kadar ozel hayat paylasacagini belirler.',
    type: 'select',
    required: true,
    options: [
      'Bekar', 'Iliskisi var (partneri gorunmez)', 'Nisanli', 'Evli',
      'Bosanmis', 'Belirtmiyor (bilincli sir)',
    ],
  },
  {
    key: 'children',
    section: 'Hayat',
    label: 'Cocugu var mi?',
    type: 'select',
    required: true,
    options: ['Yok', 'Bir cocuk', 'Iki cocuk', 'Belirtmiyor'],
  },
  {
    key: 'occupation',
    section: 'Hayat',
    label: 'Asil mesleği ne? (icerik uretmek disinda)',
    hint: 'Icerigin altindaki uzmanlik iddiasi buradan gelir.',
    type: 'select',
    required: true,
    options: [
      'Tam zamanli icerik ureticisi', 'Grafik tasarimci', 'Yazilimci', 'Ogretmen',
      'Antronor / spor egitmeni', 'Diyetisyen', 'Mimar', 'Fotografci', 'Muzisyen',
      'Pazarlamaci', 'Girisimci', 'Ogrenci', 'Hemsire', 'Sef / asci',
      'Moda stilisti', 'Serbest calisan (freelance)', 'Danisman',
    ],
  },
  {
    key: 'income',
    section: 'Hayat',
    label: 'Gelir / yasam standardi?',
    hint: 'Kiyafet, mekan ve aksesuar kalitesini dogrudan belirler.',
    type: 'select',
    required: true,
    options: [
      'Kit kanaat geciniyor', 'Orta halli, dengeli', 'Rahat, kendine yatirim yapiyor',
      'Yuksek gelir, luks erisimi var', 'Cok varlikli',
    ],
  },
  {
    key: 'home',
    section: 'Hayat',
    label: 'Nasil bir evde yasiyor?',
    type: 'select',
    required: true,
    options: [
      'Kucuk studyo daire', 'Ev arkadasiyla paylasimli daire', 'Sehir merkezinde 1+1',
      'Genis loft', 'Aile eviyle birlikte', 'Sahil kasabasinda kucuk ev',
      'Modern luks daire', 'Kirsalda tas ev', 'Karavan / gocebe',
    ],
  },
  {
    key: 'pet',
    section: 'Hayat',
    label: 'Evcil hayvani var mi?',
    hint: 'Icerikte tekrar eden karakter olur, etkilesimi artirir.',
    type: 'select',
    required: true,
    options: [
      'Yok', 'Kedi', 'Iki kedi', 'Kucuk kopek', 'Buyuk kopek',
      'Sokaktan aldigi kedi', 'Kus', 'Balik / akvaryum',
    ],
  },
  {
    key: 'transport',
    section: 'Hayat',
    label: 'Nasil ulasiyor?',
    type: 'select',
    required: true,
    options: [
      'Yuruyor / toplu tasima', 'Bisiklet', 'Scooter / motosiklet', 'Eski bir araba',
      'Yeni bir araba', 'Luks araba', 'Hep taksi / uygulama',
    ],
  },
  {
    key: 'languages',
    section: 'Hayat',
    label: 'Hangi dilleri konusuyor?',
    hint: 'En fazla 3. Icerigin hangi dilde uretilecegini de etkiler.',
    type: 'multiselect',
    required: true,
    min: 1,
    max: 3,
    options: [
      'Turkce', 'Ingilizce', 'Ispanyolca', 'Fransizca', 'Almanca', 'Italyanca',
      'Portekizce', 'Arapca', 'Rusca', 'Japonca', 'Korece', 'Cince', 'Hintce', 'Yunanca',
    ],
  },
  {
    key: 'routine',
    section: 'Karakter',
    label: 'Gunu nasil geciyor?',
    hint: 'Icerik takviminin ritmi bundan cikar.',
    type: 'select',
    required: true,
    options: [
      'Erken kalkar, sabahci', 'Gece kusu, gec yatar', 'Duzensiz, ilhamla calisir',
      'Kati program, dakikasi dakikasina', 'Yari gocebe, surekli yer degistirir',
    ],
  },
  {
    key: 'definingEvent',
    section: 'Karakter',
    label: 'Hayatini degistiren olay neydi?',
    hint: 'Karakterin "neden bu isi yapiyor" cevabi. Hikayenin omurgasi.',
    type: 'select',
    required: true,
    options: [
      'Baska bir ulkeye tasindi', 'Ciddi bir hastalik atlatti', 'Isini birakip sifirdan basladi',
      'Buyuk bir kayip yasadi', 'Uzun bir iliski bitti', 'Beklenmedik bir basari yakaladi',
      'Bir mentor onu degistirdi', 'Tek basina uzun bir yolculuga cikti',
      'Ailesinin isini devraldi', 'Iflas etti ve tekrar ayaga kalkti',
    ],
  },
  {
    key: 'fear',
    section: 'Karakter',
    label: 'En buyuk korkusu?',
    hint: 'Karaktere derinlik veren sey. Caption\'larda arada yuzeye cikar.',
    type: 'select',
    required: true,
    options: [
      'Siradan kalmak', 'Yalniz kalmak', 'Basarisiz olmak', 'Kontrolu kaybetmek',
      'Unutulmak', 'Yanlis anlasilmak', 'Sahte gorunmek', 'Gec kalmak',
    ],
  },
  {
    key: 'dream',
    section: 'Karakter',
    label: 'Hayali ne?',
    type: 'select',
    required: true,
    options: [
      'Kendi markasini kurmak', 'Dunyayi gezmek', 'Bir kitap yazmak',
      'Deniz kenarinda bir ev', 'Ailesini rahat ettirmek', 'Kendi stududyosunu acmak',
      'Bir toplulugu degistirmek', 'Tamamen ozgur calismak',
    ],
  },
  {
    key: 'values',
    section: 'Karakter',
    label: 'Yasam felsefesi / degeri?',
    hint: 'Icerigin ana mesaji bunun etrafinda doner.',
    type: 'select',
    required: true,
    options: [
      'Durustluk her seyden onemli', 'Disiplin ozgurluk getirir', 'Az ama iyi',
      'Once kendine iyi bak', 'Birlikte daha guclu', 'Denemekten korkma',
      'Sabir kazandirir', 'Otantik kal, trend pesinde kosma',
    ],
  },
  {
    key: 'musicTaste',
    section: 'Karakter',
    label: 'Muzik zevki?',
    hint: 'Reels muzigi ve genel estetigi belirler.',
    type: 'select',
    required: true,
    options: [
      'Indie / alternatif', 'Elektronik / house', 'Hip-hop / R&B', 'Pop',
      'Rock', 'Jazz / soul', 'Klasik', 'Yerel / geleneksel', 'Lo-fi / ambient',
    ],
  },
];

/* --------------------------------------------------- otomatik doldurma */

/**
 * Cevaplanmamis hayat sorularini, verilmis cevaplarla TUTARLI sekilde doldurur.
 * Rastgele degil: gelir duzeyi eve, ev ulasima, bolge sehre baglanir.
 */
function autoFill(answers, rng = deterministicRng(answers)) {
  const out = { ...answers };
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const q = (key) => LIFE_QUESTIONS.find((x) => x.key === key);

  if (!out.city) out.city = pick(citiesFor(answers.region)).tr;
  if (!out.hometown) out.hometown = rng() < 0.55 ? out.city : pick(citiesFor(answers.region)).tr;
  if (!out.socioeconomic) out.socioeconomic = pick(q('socioeconomic').options);

  if (!out.income) {
    // Sosyoekonomik koken gelirle uyumlu olsun.
    const map = {
      'Dar gelirli aile, kendi yolunu acti': ['Kit kanaat geciniyor', 'Orta halli, dengeli'],
      'Alt-orta sinif, calisarak okudu': ['Orta halli, dengeli', 'Rahat, kendine yatirim yapiyor'],
      'Orta sinif, dengeli bir cocukluk': ['Orta halli, dengeli', 'Rahat, kendine yatirim yapiyor'],
      'Ust-orta sinif, iyi egitim imkani': ['Rahat, kendine yatirim yapiyor', 'Yuksek gelir, luks erisimi var'],
      'Varlikli aile, imkanlar hazir': ['Yuksek gelir, luks erisimi var', 'Cok varlikli'],
      'Gocmen aile, sifirdan kuruldu': ['Kit kanaat geciniyor', 'Orta halli, dengeli', 'Rahat, kendine yatirim yapiyor'],
    };
    out.income = pick(map[out.socioeconomic] || q('income').options);
  }

  if (!out.home) {
    const map = {
      'Kit kanaat geciniyor': ['Kucuk studyo daire', 'Ev arkadasiyla paylasimli daire', 'Aile eviyle birlikte'],
      'Orta halli, dengeli': ['Sehir merkezinde 1+1', 'Kucuk studyo daire', 'Sahil kasabasinda kucuk ev'],
      'Rahat, kendine yatirim yapiyor': ['Sehir merkezinde 1+1', 'Genis loft', 'Sahil kasabasinda kucuk ev'],
      'Yuksek gelir, luks erisimi var': ['Modern luks daire', 'Genis loft'],
      'Cok varlikli': ['Modern luks daire', 'Genis loft', 'Kirsalda tas ev'],
    };
    out.home = pick(map[out.income] || q('home').options);
  }

  if (!out.transport) {
    const map = {
      'Kit kanaat geciniyor': ['Yuruyor / toplu tasima', 'Bisiklet'],
      'Orta halli, dengeli': ['Yuruyor / toplu tasima', 'Bisiklet', 'Scooter / motosiklet', 'Eski bir araba'],
      'Rahat, kendine yatirim yapiyor': ['Scooter / motosiklet', 'Eski bir araba', 'Yeni bir araba'],
      'Yuksek gelir, luks erisimi var': ['Yeni bir araba', 'Hep taksi / uygulama'],
      'Cok varlikli': ['Luks araba', 'Hep taksi / uygulama'],
    };
    out.transport = pick(map[out.income] || q('transport').options);
  }

  if (!out.languages || !out.languages.length) {
    const local = localLanguage(out.city);
    const set = new Set(['Ingilizce']);
    if (local) set.add(local);
    out.languages = [...set].slice(0, 3);
  }

  for (const question of LIFE_QUESTIONS) {
    if (out[question.key] != null && out[question.key] !== '' &&
        !(Array.isArray(out[question.key]) && !out[question.key].length)) continue;
    if (question.type === 'multiselect') {
      out[question.key] = [pick(question.options)];
    } else if (question.options) {
      out[question.key] = pick(question.options);
    }
  }

  return out;
}

function localLanguage(cityTr) {
  const map = {
    'İspanya': 'Ispanyolca', 'İtalya': 'Italyanca', 'Yunanistan': 'Yunanca',
    'Fransa': 'Fransizca', 'Almanya': 'Almanca', 'Portekiz': 'Portekizce',
    'Brezilya': 'Portekizce', 'Japonya': 'Japonca', 'Güney Kore': 'Korece',
    'Çin': 'Cince', 'Hindistan': 'Hintce', 'Rusya': 'Rusca',
    'Meksika': 'Ispanyolca', 'Arjantin': 'Ispanyolca', 'Kolombiya': 'Ispanyolca',
  };
  if (!cityTr) return null;
  if (!cityTr.includes(',')) return cityTr.match(/İstanbul|İzmir|Ankara|Antalya|Bodrum|Eskişehir/) ? 'Turkce' : null;
  const country = cityTr.split(',').pop().trim();
  return map[country] || null;
}

/** Cevaplardan turetilen, her calistirmada AYNI sonucu veren rastgelelik. */
function deterministicRng(answers) {
  const seedText = JSON.stringify([
    answers.gender, answers.region, answers.ethnicity, answers.age, answers.zodiac, answers.name,
  ]);
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return function next() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/* ------------------------------------------------------ karakter dosyasi */

/**
 * Turkce, okunabilir karakter dosyasi. Panelde gosterilir; caption yazarken
 * ve icerik planlarken tek referans noktasi budur.
 */
function dossier(identity, life, personaBlock) {
  const name = identity.name;
  const city = life.city;
  const born = life.hometown === life.city ? `${city}'da dogdu ve buyudu` : `${life.hometown} dogumlu, simdi ${city}'da yasiyor`;

  const family = [
    `Babasi ${life.fatherJob.toLowerCase()}`,
    `annesi ${life.motherJob.toLowerCase()}`,
    life.siblings === 'Tek cocuk' ? 'tek cocuk olarak buyudu' : life.siblings.toLowerCase(),
  ].join(', ');

  const paragraphs = [
    `${name}, ${identity.age} yasinda. ${born}. ${life.socioeconomic}.`,
    `${family}. ${life.maritalStatus}${life.children !== 'Yok' && life.children !== 'Belirtmiyor' ? `, ${life.children.toLowerCase()}` : ''}.`,
    `Mesleği: ${life.occupation.toLowerCase()}. ${life.income}. ${life.home} yasiyor, ${life.transport.toLowerCase()}. ${life.pet === 'Yok' ? 'Evcil hayvani yok' : `Evinde ${life.pet.toLowerCase()} var`}.`,
    `${life.languages.join(', ')} konusuyor. ${life.routine}.`,
    `Hayatinin donum noktasi: ${life.definingEvent.toLowerCase()}. O gunden beri ${personaBlock.interests[0] ? personaBlock.interests[0].toLowerCase() : 'kendi yolu'} uzerine calisiyor.`,
    `En buyuk korkusu ${life.fear.toLowerCase()}; hayali ${life.dream.toLowerCase()}. Yasam felsefesi: "${life.values}".`,
    `Muzik zevki ${life.musicTaste.toLowerCase()} - Reels muziklerini ve genel estetigini bu belirler.`,
  ];

  return paragraphs.join('\n\n');
}

/**
 * Sehir ve gelir duzeyine gore mekan/kiyafet havuzunu zenginlestirir.
 * Boylece uretilen gorseller karakterin gercekten yasadigi yere benzer.
 */
function enrich(personaBlock, life) {
  const city = cityEn(life.city);
  const citySettings = [
    `a sunlit street in ${city}`,
    `a small neighbourhood cafe in ${city}`,
    `a rooftop overlooking ${city} at golden hour`,
  ];

  const HOME_SETTINGS = {
    'Kucuk studyo daire': 'a small tidy studio apartment with soft daylight',
    'Ev arkadasiyla paylasimli daire': 'a lived-in shared apartment living room',
    'Sehir merkezinde 1+1': 'a compact modern city apartment',
    'Genis loft': 'a spacious loft with tall windows and exposed brick',
    'Aile eviyle birlikte': 'a warm family home kitchen',
    'Sahil kasabasinda kucuk ev': 'a small coastal house with whitewashed walls',
    'Modern luks daire': 'a minimal luxury apartment with floor-to-ceiling windows',
    'Kirsalda tas ev': 'a rustic stone house with wooden beams',
    'Karavan / gocebe': 'a converted camper van interior',
  };

  const INCOME_WARDROBE = {
    'Kit kanaat geciniyor': ['a well-worn vintage jacket', 'simple cotton basics'],
    'Orta halli, dengeli': ['everyday high-street basics', 'a simple denim jacket'],
    'Rahat, kendine yatirim yapiyor': ['a well-cut neutral blazer', 'quality knitwear'],
    'Yuksek gelir, luks erisimi var': ['a tailored designer coat', 'silk and fine wool layers'],
    'Cok varlikli': ['an understated luxury outfit', 'couture tailoring'],
  };

  const PET_PROPS = {
    'Kedi': 'a cat resting nearby', 'Iki kedi': 'two cats nearby',
    'Kucuk kopek': 'a small dog on a lead', 'Buyuk kopek': 'a large dog beside them',
    'Sokaktan aldigi kedi': 'a rescued street cat', 'Kus': 'a small bird cage in frame',
    'Balik / akvaryum': 'an aquarium glowing in the background',
  };

  const settings = [...citySettings];
  if (HOME_SETTINGS[life.home]) settings.push(HOME_SETTINGS[life.home]);
  settings.push(...(personaBlock.settings || []));

  const wardrobe = [...(INCOME_WARDROBE[life.income] || []), ...(personaBlock.wardrobe || [])];
  const props = [...(personaBlock.props || [])];
  if (PET_PROPS[life.pet]) props.push(PET_PROPS[life.pet]);

  return {
    ...personaBlock,
    settings: [...new Set(settings)],
    wardrobe: [...new Set(wardrobe)],
    props: [...new Set(props)],
    cityEn: city,
  };
}

module.exports = {
  LIFE_QUESTIONS,
  CITIES,
  citiesFor,
  cityEn,
  autoFill,
  dossier,
  enrich,
};
