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

/* ------------------------------------------- KITA -> ULKE -> SEHIR agaci */

/**
 * Sehir secimi kademeli: once kita, sonra ulke, sonra sehir.
 * Sehirler ya duz metin ('Madrid' -> TR ve EN ayni) ya da ['TR', 'EN'] cifti.
 * Ingilizce karsilik prompt'a girer ("a sunlit street in Barcelona, Spain").
 */
const GEO = {
  'Avrupa': {
    'Turkiye': [['İstanbul', 'Istanbul'], ['İzmir', 'Izmir'], 'Ankara', 'Antalya', 'Bodrum', ['Eskişehir', 'Eskisehir']],
    'İspanya': [['Barselona', 'Barcelona'], 'Madrid', ['Valensiya', 'Valencia'], ['Sevilla', 'Seville'], ['Malaga', 'Malaga']],
    'İtalya': [['Roma', 'Rome'], ['Milano', 'Milan'], ['Napoli', 'Naples'], ['Floransa', 'Florence'], ['Venedik', 'Venice']],
    'Fransa': ['Paris', ['Marsilya', 'Marseille'], 'Lyon', 'Nice', 'Bordeaux'],
    'Portekiz': [['Lizbon', 'Lisbon'], 'Porto', 'Faro'],
    'Yunanistan': [['Atina', 'Athens'], ['Selanik', 'Thessaloniki'], ['Santorini', 'Santorini'], ['Girit', 'Crete']],
    'Almanya': ['Berlin', ['Münih', 'Munich'], 'Hamburg', ['Köln', 'Cologne']],
    'Hollanda': ['Amsterdam', 'Rotterdam', ['Lahey', 'The Hague']],
    'İngiltere': [['Londra', 'London'], 'Manchester', ['Edinburg', 'Edinburgh'], 'Brighton'],
    'İrlanda': ['Dublin', 'Galway'],
    'İsveç': ['Stockholm', ['Göteborg', 'Gothenburg'], 'Malmö'],
    'Norveç': ['Oslo', 'Bergen', ['Tromsø', 'Tromso']],
    'Danimarka': [['Kopenhag', 'Copenhagen'], 'Aarhus'],
    'İsviçre': [['Zürih', 'Zurich'], ['Cenevre', 'Geneva'], 'Luzern'],
    'Avusturya': [['Viyana', 'Vienna'], 'Salzburg'],
    'Polonya': [['Varşova', 'Warsaw'], ['Krakov', 'Krakow'], ['Gdansk', 'Gdansk']],
    'Çekya': [['Prag', 'Prague'], 'Brno'],
    'Macaristan': [['Budapeşte', 'Budapest']],
    'Hırvatistan': ['Zagreb', 'Split', 'Dubrovnik'],
    'Sırbistan': [['Belgrad', 'Belgrade'], ['Novi Sad', 'Novi Sad']],
    'Romanya': [['Bükreş', 'Bucharest'], ['Kluj', 'Cluj']],
    'Ukrayna': [['Kiev', 'Kyiv'], ['Lviv', 'Lviv'], 'Odesa'],
  },
  'Asya': {
    'Japonya': ['Tokyo', ['Osaka', 'Osaka'], 'Kyoto', 'Sapporo'],
    'Güney Kore': [['Seul', 'Seoul'], 'Busan', 'Jeju'],
    'Çin': [['Şangay', 'Shanghai'], ['Pekin', 'Beijing'], ['Şenzen', 'Shenzhen'], ['Hong Kong', 'Hong Kong']],
    'Tayvan': ['Taipei', 'Kaohsiung'],
    'Tayland': ['Bangkok', ['Chiang Mai', 'Chiang Mai'], 'Phuket'],
    'Endonezya': ['Bali', ['Cakarta', 'Jakarta'], 'Yogyakarta'],
    'Vietnam': [['Ho Chi Minh', 'Ho Chi Minh City'], ['Hanoi', 'Hanoi'], ['Da Nang', 'Da Nang']],
    'Singapur': ['Singapur'],
    'Filipinler': ['Manila', 'Cebu'],
    'Hindistan': ['Mumbai', ['Yeni Delhi', 'New Delhi'], ['Bangalore', 'Bengaluru'], 'Goa'],
    'Kazakistan': [['Almatı', 'Almaty'], ['Astana', 'Astana']],
    'Özbekistan': [['Taşkent', 'Tashkent'], ['Semerkant', 'Samarkand']],
    'Gürcistan': [['Tiflis', 'Tbilisi'], ['Batum', 'Batumi']],
    'Ermenistan': [['Erivan', 'Yerevan']],
    'Azerbaycan': [['Bakü', 'Baku']],
  },
  'Orta Dogu': {
    'BAE': ['Dubai', ['Abu Dabi', 'Abu Dhabi']],
    'Katar': ['Doha'],
    'Suudi Arabistan': ['Riyad', ['Cidde', 'Jeddah']],
    'Lübnan': [['Beyrut', 'Beirut']],
    'Ürdün': ['Amman', 'Akabe'],
    'İsrail': ['Tel Aviv', ['Kudüs', 'Jerusalem']],
  },
  'Afrika': {
    'Fas': [['Kazablanka', 'Casablanca'], ['Marakeş', 'Marrakesh'], ['Tanca', 'Tangier'], ['Rabat', 'Rabat']],
    'Mısır': [['Kahire', 'Cairo'], ['İskenderiye', 'Alexandria']],
    'Tunus': ['Tunus'],
    'Güney Afrika': ['Cape Town', 'Johannesburg', 'Durban'],
    'Kenya': ['Nairobi', 'Mombasa'],
    'Nijerya': ['Lagos', 'Abuja'],
    'Gana': ['Accra'],
    'Etiyopya': [['Addis Ababa', 'Addis Ababa']],
    'Senegal': ['Dakar'],
  },
  'Kuzey Amerika': {
    'ABD': [['New York', 'New York City'], 'Los Angeles', 'Miami', 'Chicago', 'Austin', 'Seattle', 'San Francisco'],
    'Kanada': ['Toronto', 'Vancouver', ['Montreal', 'Montreal']],
    'Meksika': [['Mexico City', 'Mexico City'], ['Guadalajara', 'Guadalajara'], 'Tulum'],
  },
  'Guney Amerika': {
    'Brezilya': ['Rio de Janeiro', ['Sao Paulo', 'Sao Paulo'], 'Florianopolis'],
    'Arjantin': ['Buenos Aires', ['Kordoba', 'Cordoba'], 'Mendoza'],
    'Kolombiya': [['Bogota', 'Bogota'], ['Medellin', 'Medellin'], 'Cartagena'],
    'Şili': ['Santiago', ['Valparaiso', 'Valparaiso']],
    'Peru': ['Lima', 'Cusco'],
  },
  'Okyanusya': {
    'Avustralya': [['Sidney', 'Sydney'], 'Melbourne', 'Brisbane', 'Gold Coast', 'Perth'],
    'Yeni Zelanda': ['Auckland', ['Wellington', 'Wellington'], 'Queenstown'],
  },
};

/** ['TR','EN'] veya 'Ayni' bicimini {tr, en} nesnesine cevirir. */
function toCity(entry) {
  return Array.isArray(entry) ? { tr: entry[0], en: entry[1] } : { tr: entry, en: entry };
}

/** Ulkenin Ingilizce adi (prompt'ta "Barcelona, Spain" olsun diye). */
const COUNTRY_EN = {
  'Turkiye': 'Turkey', 'İspanya': 'Spain', 'İtalya': 'Italy', 'Fransa': 'France',
  'Portekiz': 'Portugal', 'Yunanistan': 'Greece', 'Almanya': 'Germany',
  'Hollanda': 'Netherlands', 'İngiltere': 'England', 'İrlanda': 'Ireland',
  'İsveç': 'Sweden', 'Norveç': 'Norway', 'Danimarka': 'Denmark',
  'İsviçre': 'Switzerland', 'Avusturya': 'Austria', 'Polonya': 'Poland',
  'Çekya': 'Czechia', 'Macaristan': 'Hungary', 'Hırvatistan': 'Croatia',
  'Sırbistan': 'Serbia', 'Romanya': 'Romania', 'Ukrayna': 'Ukraine',
  'Japonya': 'Japan', 'Güney Kore': 'South Korea', 'Çin': 'China',
  'Tayvan': 'Taiwan', 'Tayland': 'Thailand', 'Endonezya': 'Indonesia',
  'Vietnam': 'Vietnam', 'Singapur': 'Singapore', 'Filipinler': 'Philippines',
  'Hindistan': 'India', 'Kazakistan': 'Kazakhstan', 'Özbekistan': 'Uzbekistan',
  'Gürcistan': 'Georgia', 'Ermenistan': 'Armenia', 'Azerbaycan': 'Azerbaijan',
  'BAE': 'UAE', 'Katar': 'Qatar', 'Suudi Arabistan': 'Saudi Arabia',
  'Lübnan': 'Lebanon', 'Ürdün': 'Jordan', 'İsrail': 'Israel',
  'Fas': 'Morocco', 'Mısır': 'Egypt', 'Tunus': 'Tunisia',
  'Güney Afrika': 'South Africa', 'Kenya': 'Kenya', 'Nijerya': 'Nigeria',
  'Gana': 'Ghana', 'Etiyopya': 'Ethiopia', 'Senegal': 'Senegal',
  'ABD': 'USA', 'Kanada': 'Canada', 'Meksika': 'Mexico',
  'Brezilya': 'Brazil', 'Arjantin': 'Argentina', 'Kolombiya': 'Colombia',
  'Şili': 'Chile', 'Peru': 'Peru',
  'Avustralya': 'Australia', 'Yeni Zelanda': 'New Zealand',
};

function continents() {
  return Object.keys(GEO);
}

function countriesFor(continent) {
  return Object.keys(GEO[continent] || {});
}

function citiesFor(country) {
  for (const countries of Object.values(GEO)) {
    if (countries[country]) return countries[country].map(toCity);
  }
  return [];
}

/** Ulkeden kitayi bulur (eski kayitlari onarmak icin de kullanilir). */
function continentOf(country) {
  for (const [continent, countries] of Object.entries(GEO)) {
    if (countries[country]) return continent;
  }
  return null;
}

/** "Barselona, İspanya" -> "Barcelona, Spain" */
function cityEn(cityLabel) {
  const raw = String(cityLabel || '').trim();
  if (!raw) return 'the city';
  const [cityPart, countryPart] = raw.split(',').map((s) => s.trim());

  for (const countries of Object.values(GEO)) {
    for (const [country, list] of Object.entries(countries)) {
      if (countryPart && country !== countryPart) continue;
      for (const entry of list) {
        const city = toCity(entry);
        if (city.tr === cityPart) {
          const countryEn = COUNTRY_EN[country] || country;
          return city.en === countryEn ? city.en : `${city.en}, ${countryEn}`;
        }
      }
    }
  }
  // Elle yazilmis sehir: oldugu gibi gecir.
  return raw;
}

/** Kita + ulke + sehirden saklanacak etiketi kurar: "Barselona, İspanya" */
function cityLabel(cityTr, country) {
  if (!cityTr) return '';
  if (!country || cityTr === country) return cityTr;
  return `${cityTr}, ${country}`;
}

/* ------------------------------------------------------------- sorular */

const SAME_AS_CITY = 'Yasadigi sehirle ayni';

const LIFE_QUESTIONS = [
  {
    key: 'continent',
    section: 'Yasadigi yer',
    label: 'Hangi kitada yasiyor?',
    hint: 'Sehir secimi kademeli: once kita, sonra ulke, sonra sehir.',
    type: 'select',
    required: true,
    options: () => continents(),
  },
  {
    key: 'country',
    section: 'Yasadigi yer',
    label: 'Hangi ulkede yasiyor?',
    type: 'select',
    required: true,
    options: (answers) => countriesFor(answers.continent),
  },
  {
    key: 'cityName',
    section: 'Yasadigi yer',
    label: 'Hangi sehirde yasiyor?',
    hint: 'Bu secim gorsellerdeki mekanlari ve icerigin atmosferini belirler. Listede yoksa kendin yazabilirsin.',
    type: 'select-or-text',
    required: true,
    options: (answers) => citiesFor(answers.country).map((c) => c.tr),
  },
  {
    key: 'hometownMode',
    section: 'Memleket',
    label: 'Nerede dogup buyudu?',
    hint: 'Farkli bir yer secersen karaktere "tasindim" hikayesi kazandirir - icerikte kullanilabilir bir katman.',
    type: 'select',
    required: true,
    options: () => [SAME_AS_CITY, 'Farkli bir yer sececegim'],
  },
  {
    key: 'hometownContinent',
    section: 'Memleket',
    label: 'Memleketi hangi kitada?',
    type: 'select',
    required: true,
    showIf: (answers) => answers.hometownMode === 'Farkli bir yer sececegim',
    options: () => continents(),
  },
  {
    key: 'hometownCountry',
    section: 'Memleket',
    label: 'Memleketi hangi ulkede?',
    type: 'select',
    required: true,
    showIf: (answers) => answers.hometownMode === 'Farkli bir yer sececegim',
    options: (answers) => countriesFor(answers.hometownContinent),
  },
  {
    key: 'hometownCity',
    section: 'Memleket',
    label: 'Memleketi hangi sehir?',
    type: 'select-or-text',
    required: true,
    showIf: (answers) => answers.hometownMode === 'Farkli bir yer sececegim',
    options: (answers) => citiesFor(answers.hometownCountry).map((c) => c.tr),
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
/** Koken bolgesinden makul bir kita/ulke varsayilani. */
const REGION_DEFAULT = {
  'Akdeniz': ['Avrupa', 'İspanya'],
  'Kuzey Avrupa': ['Avrupa', 'İsveç'],
  'Bati Avrupa': ['Avrupa', 'Fransa'],
  'Dogu Avrupa': ['Avrupa', 'Polonya'],
  'Balkanlar': ['Avrupa', 'Hırvatistan'],
  'Anadolu / Turkiye': ['Avrupa', 'Turkiye'],
  'Kafkasya': ['Asya', 'Gürcistan'],
  'Orta Dogu': ['Orta Dogu', 'BAE'],
  'Kuzey Afrika': ['Afrika', 'Fas'],
  'Sahra Alti Afrika': ['Afrika', 'Kenya'],
  'Orta Asya': ['Asya', 'Kazakistan'],
  'Guney Asya': ['Asya', 'Hindistan'],
  'Dogu Asya': ['Asya', 'Japonya'],
  'Guneydogu Asya': ['Asya', 'Tayland'],
  'Latin Amerika': ['Guney Amerika', 'Kolombiya'],
  'Kuzey Amerika': ['Kuzey Amerika', 'ABD'],
  'Okyanusya': ['Okyanusya', 'Avustralya'],
};

function autoFill(answers, rng = deterministicRng(answers)) {
  const out = { ...answers };
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const q = (key) => LIFE_QUESTIONS.find((x) => x.key === key);
  const opts = (key) => {
    const def = q(key);
    return typeof def.options === 'function' ? def.options(out) : def.options;
  };

  // Yasadigi yer: kita -> ulke -> sehir. Bos kalanlar kokene gore doldurulur.
  const fallback = REGION_DEFAULT[answers.region] || ['Avrupa', 'İspanya'];
  if (!out.continent) out.continent = fallback[0];
  if (!out.country) {
    const list = countriesFor(out.continent);
    out.country = list.includes(fallback[1]) ? fallback[1] : (list[0] || 'İspanya');
  }
  if (!out.cityName) {
    const list = citiesFor(out.country);
    out.cityName = list.length ? pick(list).tr : out.country;
  }

  // Memleket
  if (!out.hometownMode) out.hometownMode = rng() < 0.6 ? SAME_AS_CITY : 'Farkli bir yer sececegim';
  if (out.hometownMode !== SAME_AS_CITY) {
    if (!out.hometownContinent) out.hometownContinent = out.continent;
    if (!out.hometownCountry) {
      const list = countriesFor(out.hometownContinent);
      out.hometownCountry = list.includes(out.country) ? out.country : (list[0] || out.country);
    }
    if (!out.hometownCity) {
      const list = citiesFor(out.hometownCountry);
      out.hometownCity = list.length ? pick(list).tr : out.hometownCountry;
    }
  }

  if (!out.socioeconomic) out.socioeconomic = pick(opts('socioeconomic'));

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
    out.income = pick(map[out.socioeconomic] || opts('income'));
  }

  if (!out.home) {
    const map = {
      'Kit kanaat geciniyor': ['Kucuk studyo daire', 'Ev arkadasiyla paylasimli daire', 'Aile eviyle birlikte'],
      'Orta halli, dengeli': ['Sehir merkezinde 1+1', 'Kucuk studyo daire', 'Sahil kasabasinda kucuk ev'],
      'Rahat, kendine yatirim yapiyor': ['Sehir merkezinde 1+1', 'Genis loft', 'Sahil kasabasinda kucuk ev'],
      'Yuksek gelir, luks erisimi var': ['Modern luks daire', 'Genis loft'],
      'Cok varlikli': ['Modern luks daire', 'Genis loft', 'Kirsalda tas ev'],
    };
    out.home = pick(map[out.income] || opts('home'));
  }

  if (!out.transport) {
    const map = {
      'Kit kanaat geciniyor': ['Yuruyor / toplu tasima', 'Bisiklet'],
      'Orta halli, dengeli': ['Yuruyor / toplu tasima', 'Bisiklet', 'Scooter / motosiklet', 'Eski bir araba'],
      'Rahat, kendine yatirim yapiyor': ['Scooter / motosiklet', 'Eski bir araba', 'Yeni bir araba'],
      'Yuksek gelir, luks erisimi var': ['Yeni bir araba', 'Hep taksi / uygulama'],
      'Cok varlikli': ['Luks araba', 'Hep taksi / uygulama'],
    };
    out.transport = pick(map[out.income] || opts('transport'));
  }

  if (!out.languages || !out.languages.length) {
    const local = localLanguage(out.country);
    const set = new Set(['Ingilizce']);
    if (local) set.add(local);
    out.languages = [...set].slice(0, 3);
  }

  for (const question of LIFE_QUESTIONS) {
    if (question.showIf && !question.showIf(out)) continue;
    if (out[question.key] != null && out[question.key] !== '' &&
        !(Array.isArray(out[question.key]) && !out[question.key].length)) continue;
    const list = opts(question.key);
    if (!list || !list.length) continue;
    out[question.key] = question.type === 'multiselect' ? [pick(list)] : pick(list);
  }

  return out;
}

function localLanguage(country) {
  const map = {
    'Turkiye': 'Turkce', 'İspanya': 'Ispanyolca', 'İtalya': 'Italyanca',
    'Yunanistan': 'Yunanca', 'Fransa': 'Fransizca', 'Almanya': 'Almanca',
    'Avusturya': 'Almanca', 'İsviçre': 'Almanca', 'Portekiz': 'Portekizce',
    'Brezilya': 'Portekizce', 'Japonya': 'Japonca', 'Güney Kore': 'Korece',
    'Çin': 'Cince', 'Tayvan': 'Cince', 'Hindistan': 'Hintce',
    'Ukrayna': 'Rusca', 'Kazakistan': 'Rusca', 'Özbekistan': 'Rusca',
    'Meksika': 'Ispanyolca', 'Arjantin': 'Ispanyolca', 'Kolombiya': 'Ispanyolca',
    'Şili': 'Ispanyolca', 'Peru': 'Ispanyolca',
    'BAE': 'Arapca', 'Katar': 'Arapca', 'Suudi Arabistan': 'Arapca',
    'Lübnan': 'Arapca', 'Ürdün': 'Arapca', 'Mısır': 'Arapca',
    'Fas': 'Arapca', 'Tunus': 'Arapca',
  };
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

/**
 * Kademeli secimleri saklanacak tek etikete cevirir.
 * city: "Barselona, İspanya" · hometown: ayni bicim veya sehirle ayni.
 */
function composePlaces(answers) {
  const city = cityLabel(answers.cityName, answers.country);
  const hometown = answers.hometownMode === SAME_AS_CITY || !answers.hometownCity
    ? city
    : cityLabel(answers.hometownCity, answers.hometownCountry);
  return { city, hometown };
}

/** Kosullu sorular: gorunur olanlari dondurur. */
function visible(question, answers) {
  return !question.showIf || question.showIf(answers || {});
}

/** Secenekleri fonksiyon olan sorulari cozer (kita -> ulke -> sehir). */
function resolveOptions(question, answers) {
  if (typeof question.options !== 'function') return question;
  return { ...question, options: question.options(answers || {}) };
}

module.exports = {
  LIFE_QUESTIONS,
  SAME_AS_CITY,
  GEO,
  continents,
  countriesFor,
  citiesFor,
  continentOf,
  cityEn,
  cityLabel,
  composePlaces,
  visible,
  resolveOptions,
  autoFill,
  dossier,
  enrich,
};
