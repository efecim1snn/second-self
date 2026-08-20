'use strict';

/**
 * NIS KUTUPHANESI VE ANAHTAR KELIME GENISLETME
 *
 * NE ISE YARAR: kullanici "kedi" yazinca sistem 13 etiketi de dolduracak
 * uzun kuyruklu (long-tail) arama terimlerini kendisi turetir.
 *
 * ---------------------------------------------------------------------------
 * BU DOSYA BASKASININ TASARIMINI KOPYALAMAZ
 *
 * Burada tutulan sey KATEGORI, ANAHTAR KELIME ve JENERIK SOZ KALIBIDIR.
 * "Kedi sevenler tisort ariyor" bilgisi herkesin bilgisidir; belirli bir
 * saticinin cizimi, kompozisyonu veya ozgun sozu DEGILDIR ve buraya girmez.
 *
 * Kaliplar da jenerik: "X ANNESI", "DUNYANIN EN IDARE EDER X'I" gibi yapilar
 * onlarca yildir dolasan tur gelenekleridir - tipki "Keep Calm and ..." gibi.
 * Uretilen soz kullanicinin nisiyle doldurulur, ozgun cikar.
 *
 * TESCILLI IFADE KOYMA. Marka adi, film/dizi replikleri, sarki sozleri,
 * karakter isimleri buraya girmez. Kullanici kendi yazarsa uyarilir.
 * ---------------------------------------------------------------------------
 *
 * Nis secimi 2026 POD pazar arastirmasina dayaniyor (Printify/Printful/
 * Marmalead yayinlari): en cok satan kumeler retro spor, teknoloji/AI mizahi,
 * spor salonu, oyun, evcil hayvan irklari ve MESLEK gruplaridir. Meslekler
 * ozellikle guclu: her birinin kendi ic sakasi var ve rekabet daha dusuk.
 */

/**
 * Etsy etiket kurallari.
 * listing.js'teki LIMITS ile ayni degerler - orası tek dogruluk kaynagi,
 * burada yalnizca uzunluk suzgeci icin kullaniliyor.
 */
const TAG_MAX = 20;

/**
 * NISLER
 *
 * seeds  : kullanicinin nisine karsilik gelen GERCEK arama terimleri
 * audience: bu niste alici kim
 * mood   : bu niste tutan ton (kalip secimini yonlendirir)
 */
const NICHES = [
  {
    id: 'kedi', label: 'Kedi sever', en: 'cat',
    seeds: ['cat mom', 'cat dad', 'cat lover', 'crazy cat lady', 'rescue cat'],
    audience: ['for women', 'for cat moms'],
    mood: 'komik',
  },
  {
    id: 'kopek', label: 'Kopek sever', en: 'dog',
    seeds: ['dog mom', 'dog dad', 'dog lover', 'rescue dog', 'fur mama'],
    audience: ['for women', 'for dog moms'],
    mood: 'komik',
  },
  {
    id: 'hemsire', label: 'Hemsire', en: 'nurse',
    seeds: ['nurse life', 'nurse gift', 'er nurse', 'nursing school', 'night shift'],
    audience: ['for nurses', 'for women'],
    mood: 'ic saka',
  },
  {
    id: 'ogretmen', label: 'Ogretmen', en: 'teacher',
    seeds: ['teacher life', 'teacher gift', 'kindergarten', 'teacher squad', 'back to school'],
    audience: ['for teachers'],
    mood: 'ic saka',
  },
  {
    id: 'spor', label: 'Spor salonu / fitness', en: 'gym',
    seeds: ['gym rat', 'lift heavy', 'gym life', 'workout gift', 'leg day'],
    audience: ['for men', 'for gym lovers'],
    mood: 'kalin',
  },
  {
    id: 'kahve', label: 'Kahve', en: 'coffee',
    seeds: ['coffee lover', 'but first coffee', 'coffee addict', 'iced coffee', 'barista gift'],
    audience: ['for women', 'for coffee lovers'],
    mood: 'komik',
  },
  {
    id: 'kamp', label: 'Kamp / doga', en: 'camping',
    seeds: ['camping life', 'happy camper', 'hiking gift', 'mountain lover', 'campfire'],
    audience: ['for men', 'for campers'],
    mood: 'retro',
  },
  {
    id: 'balik', label: 'Balikcilik', en: 'fishing',
    seeds: ['fishing gift', 'fishing dad', 'gone fishing', 'bass fishing', 'fisherman'],
    audience: ['for dad', 'for men'],
    mood: 'retro',
  },
  {
    id: 'oyun', label: 'Oyun / geek', en: 'gaming',
    seeds: ['gamer gift', 'gaming life', 'retro gaming', 'pc gamer', 'game night'],
    audience: ['for men', 'for gamers'],
    mood: 'kalin',
  },
  {
    id: 'teknoloji', label: 'Yazilim / teknoloji mizahi', en: 'programmer',
    seeds: ['programmer gift', 'coder life', 'it support', 'debugging', 'tech humor'],
    audience: ['for men', 'for developers'],
    mood: 'ic saka',
  },
  {
    id: 'kitap', label: 'Kitap kurdu', en: 'book',
    seeds: ['book lover', 'bookworm gift', 'reading life', 'librarian gift', 'just one more chapter'],
    audience: ['for women', 'for readers'],
    mood: 'minimal',
  },
  {
    id: 'elisi', label: 'El isi / orgu', en: 'crochet',
    seeds: ['crochet lover', 'knitting gift', 'yarn addict', 'crafting life', 'sewing gift'],
    audience: ['for women', 'for crafters'],
    mood: 'minimal',
  },
  {
    id: 'anne', label: 'Anne', en: 'mom',
    seeds: ['mom life', 'girl mom', 'boy mom', 'mama bear', 'new mom gift'],
    audience: ['for women', 'for mom'],
    mood: 'minimal',
  },
  {
    id: 'baba', label: 'Baba', en: 'dad',
    seeds: ['dad life', 'girl dad', 'best dad ever', 'dad joke', 'new dad gift'],
    audience: ['for dad', 'for men'],
    mood: 'komik',
  },
  {
    id: 'retro-spor', label: 'Retro spor', en: 'vintage sports',
    seeds: ['retro sports', 'vintage varsity', 'game day', 'football mom', 'baseball mom'],
    audience: ['for men', 'for sports fans'],
    mood: 'retro',
  },
];

/**
 * SOZ KALIPLARI
 *
 * Hepsi tur gelenegi - jenerik yapilar. {nis} kullanicinin nisinden,
 * {rol} hedef kitleden doluyor. Uretilen soz kullanicinindir.
 *
 * `satirlar` dogrudan tasarim metnine (design.lines) gider.
 */
const FORMULAS = [
  {
    id: 'powered',
    label: 'POWERED BY ...',
    hint: 'Klasik uc satir yigin. Kalin grotesk ile iyi durur.',
    mood: 'komik',
    build: (n) => ['POWERED BY', n.upper, 'AND CAFFEINE'],
  },
  {
    id: 'annesi',
    label: '... MOM / ... DAD',
    hint: 'En cok satan kaliplardan. Tek kelime + rol.',
    mood: 'minimal',
    build: (n, rol) => [n.upper, (rol || 'MOM').toUpperCase()],
  },
  {
    id: 'idare-eder',
    label: "WORLD'S OKAYEST ...",
    hint: 'Mutevazi mizah. Tek satir vurgu isteyen dizilimlerle iyi.',
    mood: 'komik',
    build: (n) => ["WORLD'S OKAYEST", n.upper],
  },
  {
    id: 'bugun-degil',
    label: 'NOT TODAY, ...',
    hint: 'Kisa ve keskin. Serit dizilimiyle guclu.',
    mood: 'kalin',
    build: (n) => ['NOT TODAY,', n.upper],
  },
  {
    id: 'hayat',
    label: '... LIFE',
    hint: 'Iki kelime, buyuk punto. Tisortte uzaktan okunur.',
    mood: 'kalin',
    build: (n) => [n.upper, 'LIFE'],
  },
  {
    id: 'once',
    label: 'BUT FIRST, ...',
    hint: 'Sabah/rutin nislerinde tutuyor.',
    mood: 'minimal',
    build: (n) => ['BUT FIRST,', n.upper],
  },
  {
    id: 'kulup',
    label: '... CLUB (est. yil)',
    hint: 'Retro rozet hissi. Kemer veya cerceve dizilimiyle.',
    mood: 'retro',
    build: (n, rol, yil) => [n.upper, 'CLUB', `EST. ${yil || '2026'}`],
  },
  {
    id: 'takim',
    label: '... SQUAD',
    hint: 'Grup/ekip hediyeleri. Meslek nislerinde guclu.',
    mood: 'kalin',
    build: (n) => [n.upper, 'SQUAD'],
  },
];

/* ------------------------------------------------------------- yardimcilar */

function clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function byId(id) {
  return NICHES.find((n) => n.id === id) || null;
}

/**
 * Serbest yazilmis nisi kutuphaneyle eslestirmeye calisir.
 * Eslesmezse kullanicinin yazdigini oldugu gibi kullanir - kutuphane
 * bir KISIT degil, hizlandirici.
 */
function resolve(input) {
  const ham = clean(input).toLocaleLowerCase('tr');
  if (!ham) return null;

  const tam = NICHES.find((n) => n.id === ham
    || n.en.toLowerCase() === ham
    || n.label.toLocaleLowerCase('tr') === ham);
  if (tam) return tam;

  const kismi = NICHES.find((n) => n.label.toLocaleLowerCase('tr').includes(ham)
    || n.en.toLowerCase().includes(ham)
    || n.seeds.some((s) => s.toLowerCase().includes(ham)));
  if (kismi) return kismi;

  // Kutuphanede yok - kullanicinin yazdigindan gecici bir nis kur.
  return { id: null, label: clean(input), en: clean(input).toLowerCase(), seeds: [], audience: [], mood: null, ozel: true };
}

/**
 * UZUN KUYRUKLU ETIKET URETIMI
 *
 * Etsy'de tek kelimelik etiket ("shirt") ise yaramaz: rekabet cok yuksek,
 * gorunme sansi yok. Deger cok kelimeli, alicinin gercekten yazdigi
 * terimlerdedir ("funny cat mom shirt").
 *
 * Bu fonksiyon 13 slotu doldurmaya calisir ve TEK KELIMELIK etiket URETMEZ.
 *
 * @returns {string[]} en fazla `adet` etiket, hepsi <= 20 karakter
 */
/**
 * Kutuphanede olmayan nisler icin JENERIK turetme kaliplari.
 * Kutuphane bir kisit degil - kullanici ne yazarsa yazsin 13 slot dolmali.
 */
const JENERIK = [
  (k, u) => `funny ${k} ${u}`,
  (k) => `${k} lover`,
  (k) => `${k} gift`,
  (k) => `${k} mom`,
  (k) => `${k} dad`,
  (k) => `${k} life`,
  (k, u) => `${k} lover ${u}`,
  (k, u) => `cute ${k} ${u}`,
  (k, u) => `vintage ${k} ${u}`,
  (k) => `gift for ${k}`,
  (k) => `${k} squad`,
  (k) => `${k} birthday`,
  (k) => `${k} christmas`,
  (k, u) => `retro ${k} ${u}`,
  (k, u) => `${k} ${u} gift`,
];

function expandTags(nis, urunKelimeleri = ['shirt'], hedef = '', ekstra = [], adet = 13) {
  const n = resolve(nis);
  if (!n) return [];

  const kok = n.en;
  const urun = urunKelimeleri[0] || 'shirt';
  const urun2 = urunKelimeleri[1] || urun;

  // Sira ONEMLI: en degerli (en spesifik) terimler basta, slot onlara gitsin.
  // Kutuphanedeki nislerde seeds dolu; serbest yazilan niste bos, o zaman
  // JENERIK kaliplar devreye girer ve 13 slot yine dolar.
  const havuz = [
    ...ekstra.map(clean),
    ...n.seeds.map((s) => `${s} ${urun}`),
    ...n.seeds,
    `funny ${kok} ${urun}`,
    `${kok} lover ${urun}`,
    `${kok} gift`,
    `${kok} ${urun2}`,
    hedef && `${kok} ${urun} ${hedef}`,
    hedef && `${kok} gift ${hedef}`,
    ...(n.audience || []).map((a) => `${kok} ${urun} ${a}`),
    `gift for ${kok} lover`,
    `${kok} birthday gift`,
    `${kok} christmas gift`,
    `cute ${kok} ${urun}`,
    `vintage ${kok} ${urun}`,
    ...JENERIK.map((f) => f(kok, urun)),
    ...JENERIK.map((f) => f(kok, urun2)),
    // UZUN NIS SORUNU: Etsy etiketi en fazla 20 karakter. "sourdough baking"
    // gibi 16 harflik bir nise "shirt" eklenince sinir asiliyor ve neredeyse
    // hicbir kalip sigmiyor. Cozum: nisin tek tek kelimelerini de kok kabul et.
    // "sourdough baking" -> "sourdough" ve "baking" uzerinden de uret.
    ...(kok.includes(' ')
      ? kok.split(' ').filter((p) => p.length > 2).flatMap((p) => [
        `${p} ${urun}`,
        `funny ${p} ${urun}`,
        `${p} lover`,
        `${p} gift`,
        `${p} life`,
        `${p} mom`,
        `${p} ${urun2}`,
        `cute ${p} ${urun}`,
        `gift for ${p}`,
      ])
      : []),
  ].filter(Boolean);

  const gorulen = new Set();
  const etiketler = [];

  for (const ham of havuz) {
    const etiket = clean(String(ham).toLowerCase());
    if (!etiket) continue;
    // TEK KELIME ELENIR - Etsy'de degeri yok.
    if (!etiket.includes(' ')) continue;
    if (etiket.length > TAG_MAX) continue;
    if (gorulen.has(etiket)) continue;
    gorulen.add(etiket);
    etiketler.push(etiket);
    if (etiketler.length >= adet) break;
  }

  return etiketler;
}

/**
 * Etiket uretimi hakkinda kullaniciya soylenecek uyarilar.
 * Kac etiket uretilebildigine de bakar - 13'u dolduramadiysak sebebi soylenir.
 */
function uyarilar(nis, urunKelimeleri, hedef, ekstra) {
  const out = [];
  const dil = dilUyarisi(nis);
  if (dil) out.push(dil);

  const n = resolve(nis);
  if (n) {
    const uretilen = expandTags(nis, urunKelimeleri, hedef, ekstra);
    if (uretilen.length < 13) {
      out.push(
        `Yalnizca ${uretilen.length}/13 etiket uretilebildi. Sebep: Etsy etiketi en fazla ` +
        `${TAG_MAX} karakter ve "${n.en}" ifadesi uzun - ustune urun kelimesi eklenince sinir asiliyor. ` +
        'Daha kisa bir nis kokU dene (ornek: "sourdough baking" yerine "sourdough") ' +
        'veya "ek anahtar kelime" alanina kendi terimlerini yaz.'
      );
    }
  }
  return out;
}

/** Latin harf disi karakter var mi - Etsy alicilari cogunlukla Ingilizce ariyor. */
function dilUyarisi(nis) {
  const n = resolve(nis);
  if (!n) return null;
  if (/[^\x00-\x7F]/.test(n.en)) {
    return 'Nis Turkce yazilmis gorunuyor. Etsy alicilari cogunlukla Ingilizce ariyor - ' +
      'etiketleri Ingilizce yazarsan cok daha fazla kisiye gorunursun.';
  }
  if (n.ozel) {
    return 'Bu nis kutuphanede yok, etiketler jenerik kaliplarla turetildi. ' +
      'Etsy arama kutusuna nisini yazip cikan onerileri "ek anahtar kelime" alanina eklersen ' +
      'cok daha isabetli olur - o oneriler gercek talebi gosterir.';
  }
  return null;
}

/** Kalip havuzundan bu nise uygun soz onerileri. */
function suggestPhrases(nis, rol = '', yil = '') {
  const n = resolve(nis);
  if (!n) return [];
  const kok = { upper: clean(n.en).toLocaleUpperCase('en-US'), label: n.label };

  return FORMULAS.map((f) => ({
    id: f.id,
    label: f.label,
    hint: f.hint,
    mood: f.mood,
    lines: f.build(kok, rol, yil),
    // Nisin tonuyla ortusuyorsa one cikar
    uygun: !n.mood || !f.mood || n.mood === f.mood,
  })).sort((a, b) => Number(b.uygun) - Number(a.uygun));
}

function list() {
  return NICHES.map(({ id, label, en, seeds, audience, mood }) => ({
    id, label, en, seeds, audience, mood,
  }));
}

module.exports = { NICHES, FORMULAS, list, resolve, expandTags, suggestPhrases, dilUyarisi, uyarilar, TAG_MAX };
