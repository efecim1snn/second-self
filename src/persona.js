'use strict';

/**
 * Burc + egitim + ilgi alanlari -> kisilik, konusma tonu, backstory,
 * icerik sutunlari ve gorsel stil ipuclari.
 *
 * Burc burada astrolojik bir iddia degil, karakter yazimi icin kullanilan
 * hazir bir kisilik sablonudur - tutarli bir "ses" uretmeye yarar.
 */

const ZODIAC = {
  'Koc': {
    traits: ['cesur', 'rekabetci', 'dogrudan', 'sabirsiz'],
    tone: 'meydan okuyan, harekete gecirici, kisa cumleli',
    hook: '"Bunu bugun yapmazsan yarin da yapmayacaksin."',
    visual: 'dinamik poz, hareket halinde, kirmizi/turuncu aksan, kontrastli isik',
    emoji: '🔥⚡',
  },
  'Boga': {
    traits: ['sabirli', 'konforsever', 'inatci', 'estetik dusukun'],
    tone: 'sakin, guven veren, acele ettirmeyen',
    hook: '"Acele etme. Iyi seyler yavas kurulur."',
    visual: 'dogal dokular, toprak tonlari, sicak gunes isigi, rahat durus',
    emoji: '🤎🌿',
  },
  'Ikizler': {
    traits: ['merakli', 'konuskan', 'cok yonlu', 'cabuk sikilan'],
    tone: 'hizli, esprili, konudan konuya atlayan, soru soran',
    hook: '"Bunu kimse konusmuyor ama..."',
    visual: 'renkli katmanli stil, sehir ortami, cok kadrajli kolaj hissi',
    emoji: '✨🌀',
  },
  'Yengec': {
    traits: ['duygusal', 'koruyucu', 'sezgisel', 'ev odakli'],
    tone: 'samimi, sefkatli, hikaye anlatan, itiraf eden',
    hook: '"Uzun sure kimseye soylemedim ama..."',
    visual: 'yumusak isik, ev ic mekan, pastel tonlar, sicak kadraj',
    emoji: '🤍🌙',
  },
  'Aslan': {
    traits: ['karizmatik', 'comert', 'gosterisli', 'gurur odakli'],
    tone: 'iddiali, sahne alan, ovgu ve motivasyon karisimi',
    hook: '"Sen bunun icin fazla iyisin."',
    visual: 'merkez kadraj, altin aksan, guclu durus, sahne isigi',
    emoji: '👑🌟',
  },
  'Basak': {
    traits: ['titiz', 'analitik', 'yardimsever', 'elestirel'],
    tone: 'net, adim adim, listeleyen, kanit veren',
    hook: '"3 adimda anlatiyorum, not al."',
    visual: 'minimal, duzenli, notr renkler, temiz arka plan',
    emoji: '📋🤍',
  },
  'Terazi': {
    traits: ['estetik', 'uzlasmaci', 'sosyal', 'kararsiz'],
    tone: 'dengeli, kibar, iki tarafi da gosteren',
    hook: '"Ikisi de dogru olabilir mi? Bence evet."',
    visual: 'simetrik kompozisyon, pastel palet, yumusak gecisler',
    emoji: '🤍🕊️',
  },
  'Akrep': {
    traits: ['yogun', 'gizemli', 'kararli', 'derin'],
    tone: 'iddiali, merak uyandiran, az soyleyip cok ima eden',
    hook: '"Bunu bir kere anlatacagim."',
    visual: 'dusuk isik, guclu golgeler, koyu palet, dogrudan bakis',
    emoji: '🖤🔮',
  },
  'Yay': {
    traits: ['maceraci', 'durust', 'ozgur', 'abartili'],
    tone: 'coskulu, buyuk resim ceken, seyahat hikayeli',
    hook: '"Ucaga binmeden once sunu bilmeni istiyorum."',
    visual: 'acik hava, genis aci, dogal isik, hareket',
    emoji: '🌍🧭',
  },
  'Oglak': {
    traits: ['disiplinli', 'hirsli', 'ciddi', 'uzun vadeli'],
    tone: 'otoriter, sonuc odakli, rakam veren',
    hook: '"90 gun. Baska bahane yok."',
    visual: 'yapilandirilmis giyim, sehir/ofis, notr ve soguk palet',
    emoji: '🏔️⚙️',
  },
  'Kova': {
    traits: ['siradisi', 'yenilikci', 'bagimsiz', 'mesafeli'],
    tone: 'fikir kiskirtan, karsit gorusu savunan, gelecege bakan',
    hook: '"Herkesin yanlis bildigi sey su:"',
    visual: 'futuristik detay, neon/soguk aksan, sarsici acilar',
    emoji: '🛰️💠',
  },
  'Balik': {
    traits: ['hayalperest', 'empatik', 'sanatsal', 'dalgin'],
    tone: 'siirsel, yumusak, duyguya dokunan',
    hook: '"Bunu okurken muzigi ac."',
    visual: 'sisli/puslu isik, su, ruya gibi renk gecisleri',
    emoji: '🌊🫧',
  },
};

/**
 * Prompt'a giren ruh hali kelimeleri INGILIZCE olmali - gorsel modelleri
 * Turkce sifatlari anlamiyor. Burcun Turkce ozellikleri panelde gosterilir,
 * asagidaki karsiliklari prompt'a gider.
 */
const MOODS_EN = {
  'Koc': ['bold', 'energetic', 'determined', 'restless'],
  'Boga': ['calm', 'grounded', 'sensual', 'unhurried'],
  'Ikizler': ['curious', 'playful', 'quick-witted', 'animated'],
  'Yengec': ['tender', 'nostalgic', 'protective', 'intimate'],
  'Aslan': ['confident', 'radiant', 'commanding', 'warm'],
  'Basak': ['focused', 'precise', 'observant', 'composed'],
  'Terazi': ['graceful', 'balanced', 'charming', 'serene'],
  'Akrep': ['intense', 'mysterious', 'magnetic', 'brooding'],
  'Yay': ['adventurous', 'free-spirited', 'optimistic', 'restless'],
  'Oglak': ['disciplined', 'stoic', 'ambitious', 'reserved'],
  'Kova': ['detached', 'futuristic', 'unconventional', 'thoughtful'],
  'Balik': ['dreamy', 'wistful', 'ethereal', 'gentle'],
};

const EDUCATION = {
  'Ilkogretim': {
    register: 'cok sade gunluk dil, kisa cumleler, hic jargon yok',
    sentence: '8-12 kelimelik cumleler',
    avoid: ['teknik terim', 'yabanci kelime', 'uzun paragraf'],
  },
  'Lise': {
    register: 'samimi, gundelik, hafif espri, arkadas dili',
    sentence: '10-15 kelimelik cumleler',
    avoid: ['akademik dil', 'agir terim'],
  },
  'Meslek yuksekokulu': {
    register: 'pratik ve uygulamaya donuk, "nasil yapilir" dili',
    sentence: '12-18 kelimelik cumleler',
    avoid: ['soyut teori'],
  },
  'Universite (lisans)': {
    register: 'dengeli, aciklayici, arada bir terim kullanip hemen sadelestiren',
    sentence: '12-20 kelimelik cumleler',
    avoid: ['gereksiz jargon', 'kaynaksiz iddia'],
  },
  'Yuksek lisans': {
    register: 'analitik, veri ve karsilastirma seven, nuans ekleyen',
    sentence: '15-25 kelimelik cumleler',
    avoid: ['asiri basitlestirme', 'clickbait abartisi'],
  },
  'Doktora': {
    register: 'otoriter ama sadelestiren, "aslinda sunu biliyoruz ki" dili',
    sentence: '15-30 kelimelik cumleler',
    avoid: ['kanitsiz genelleme', 'moda kelimeler'],
  },
  'Otodidakt (kendi kendini yetistirmis)': {
    register: 'deneyim anlatan, "ben denedim, sonuc su" dili, kurumsal olmayan',
    sentence: '10-18 kelimelik cumleler',
    avoid: ['akademik ton', 'ustten bakan dil'],
  },
};

const INTERESTS = {
  'Fitness': { outfits: ['sportswear set', 'cropped training top and leggings', 'oversized gym hoodie'], settings: ['modern gym with soft window light', 'outdoor running track at sunrise', 'home workout corner'], props: ['dumbbell', 'water bottle', 'resistance band'], pillars: ['Haftalik antrenman rutini', 'Form hatalari', 'Toparlanma ve uyku'] },
  'Yoga / pilates': { outfits: ['seamless yoga set', 'linen wrap top', 'ribbed bodysuit'], settings: ['sunlit wooden studio', 'beach at golden hour', 'minimal white room with plants'], props: ['yoga mat', 'wooden block', 'ceramic cup'], pillars: ['Sabah rutini', 'Nefes teknikleri', 'Esneklik ilerlemesi'] },
  'Saglikli beslenme': { outfits: ['linen apron over neutral tee', 'soft knit sweater'], settings: ['bright kitchen with marble counter', 'farmers market stall', 'sunny breakfast table'], props: ['fresh produce', 'glass jar', 'wooden board'], pillars: ['Gunluk tabak', 'Etiket okuma', 'Basit tarifler'] },
  'Moda': { outfits: ['tailored blazer over silk slip', 'oversized trench coat', 'monochrome knit set'], settings: ['city street with concrete backdrop', 'boutique fitting room', 'rooftop at blue hour'], props: ['structured handbag', 'sunglasses', 'layered jewelry'], pillars: ['Gunluk kombin', 'Trend analizi', 'Gardirop kurma'] },
  'Guzellik / makyaj': { outfits: ['silk robe', 'simple white tank'], settings: ['vanity with ring light', 'bathroom with soft daylight'], props: ['makeup brush', 'skincare bottle', 'mirror'], pillars: ['Cilt bakim rutini', 'Urun incelemesi', '5 dakikalik makyaj'] },
  'Seyahat': { outfits: ['linen shirt and shorts', 'lightweight travel jacket', 'flowing summer dress'], settings: ['old town alley', 'airport terminal window', 'coastal cliff viewpoint'], props: ['worn backpack', 'film camera', 'paper map'], pillars: ['Sehir rehberi', 'Butce hesabi', 'Yerel yemek'] },
  'Kahve': { outfits: ['oversized cardigan', 'barista apron'], settings: ['specialty coffee bar', 'window seat with steam on glass'], props: ['ceramic cup', 'pour-over kettle', 'coffee beans'], pillars: ['Demleme yontemleri', 'Cekirdek tadimi', 'Kafe turu'] },
  'Gastronomi': { outfits: ['chef apron over rolled sleeves', 'simple dark tee'], settings: ['restaurant kitchen pass', 'rustic dining table'], props: ['chef knife', 'cast iron pan', 'plated dish'], pillars: ['Tarif', 'Mutfak teknigi', 'Restoran incelemesi'] },
  'Kitap / edebiyat': { outfits: ['knit sweater', 'wool coat and scarf'], settings: ['library aisle', 'armchair by rainy window', 'independent bookshop'], props: ['open book', 'reading glasses', 'notebook'], pillars: ['Kitap onerisi', 'Alinti analizi', 'Okuma rutini'] },
  'Muzik': { outfits: ['leather jacket', 'vintage band tee'], settings: ['recording studio', 'vinyl store', 'small stage with stage lights'], props: ['headphones', 'guitar', 'vinyl record'], pillars: ['Calma listesi', 'Album incelemesi', 'Perde arkasi'] },
  'Dans': { outfits: ['fitted bodysuit', 'loose sweatpants and crop top'], settings: ['mirrored dance studio', 'empty parking garage', 'city square at night'], props: ['speaker', 'dance shoes'], pillars: ['Koreografi', 'Teknik kirilim', 'Trend dans'] },
  'Sanat / tasarim': { outfits: ['paint-stained overalls', 'black turtleneck'], settings: ['artist studio with canvases', 'gallery white wall'], props: ['paintbrush', 'sketchbook', 'color swatches'], pillars: ['Sureç videosu', 'Ilham kaynagi', 'Teknik anlatimi'] },
  'Fotografcilik': { outfits: ['utility vest', 'simple denim and tee'], settings: ['rooftop at golden hour', 'darkroom with red light', 'desert road'], props: ['film camera', 'lens', 'contact sheet'], pillars: ['Kadraj dersi', 'Ekipman', 'Once-sonra duzenleme'] },
  'Teknoloji': { outfits: ['minimal zip hoodie', 'crisp white shirt'], settings: ['desk setup with monitors', 'modern office with glass walls'], props: ['laptop', 'smartphone', 'mechanical keyboard'], pillars: ['Urun incelemesi', 'Kurulum turu', 'Ipucu ve kisayol'] },
  'Yapay zeka': { outfits: ['technical jacket', 'monochrome minimal outfit'], settings: ['dark room lit by screen glow', 'futuristic lab corridor'], props: ['tablet with abstract interface', 'holographic overlay'], pillars: ['Arac incelemesi', 'Prompt taktikleri', 'Gelecek senaryolari'] },
  'Bilim / uzay': { outfits: ['technical bomber jacket', 'simple dark knit'], settings: ['observatory at night', 'planetarium', 'desert under starry sky'], props: ['telescope', 'star chart', 'notebook of equations'], pillars: ['Gunun gorseli', 'Kavram anlatimi', 'Yanlis bilinen'] },
  'Oyun / gaming': { outfits: ['graphic hoodie', 'oversized jersey'], settings: ['RGB-lit gaming setup', 'dark room with monitor glow'], props: ['controller', 'headset', 'energy drink'], pillars: ['Oyun incelemesi', 'Taktik', 'Kurulum turu'] },
  'Otomobil': { outfits: ['racing jacket', 'fitted black tee and jeans'], settings: ['underground parking garage', 'mountain road at dusk', 'garage workshop'], props: ['car keys', 'steering wheel', 'toolbox'], pillars: ['Arac incelemesi', 'Bakim ipucu', 'Yol videosu'] },
  'Motosiklet': { outfits: ['leather riding jacket', 'armored textile jacket'], settings: ['coastal highway', 'garage with bikes'], props: ['helmet', 'gloves'], pillars: ['Guvenlik', 'Rota', 'Ekipman'] },
  'Finans / yatirim': { outfits: ['tailored suit', 'smart casual shirt'], settings: ['minimal office with city view', 'cafe with laptop and notes'], props: ['notebook with charts', 'laptop', 'coffee'], pillars: ['Butce sistemi', 'Piyasa yorumu', 'Hata analizi'] },
  'Girisimcilik': { outfits: ['smart casual blazer', 'clean basics'], settings: ['co-working space', 'whiteboard covered in notes'], props: ['marker', 'laptop', 'sticky notes'], pillars: ['Kurulus hikayesi', 'Rakam paylasimi', 'Ders cikarma'] },
  'Doga / kamp': { outfits: ['technical shell jacket', 'flannel and hiking boots'], settings: ['forest trail', 'mountain campsite at dawn', 'lakeside'], props: ['backpack', 'camp stove', 'thermos'], pillars: ['Ekipman', 'Rota', 'Kamp yemegi'] },
  'Surf / deniz': { outfits: ['wetsuit half-zipped', 'swimwear with open shirt'], settings: ['beach at sunrise', 'harbor', 'boat deck'], props: ['surfboard', 'towel', 'sunscreen'], pillars: ['Dalga raporu', 'Teknik', 'Sahil rehberi'] },
  'Kayak': { outfits: ['ski jacket and goggles', 'thermal layers'], settings: ['snowy slope', 'mountain lodge'], props: ['skis', 'goggles', 'hot drink'], pillars: ['Pist rehberi', 'Ekipman', 'Teknik'] },
  'Evcil hayvan': { outfits: ['cozy oversized sweater', 'casual denim'], settings: ['living room with pet bed', 'park at golden hour'], props: ['dog leash', 'pet toy'], pillars: ['Bakim ipucu', 'Gunluk an', 'Egitim'] },
  'Ic mimari / dekorasyon': { outfits: ['neutral linen set', 'structured minimal outfit'], settings: ['renovated loft', 'showroom with natural light'], props: ['fabric samples', 'floor plan', 'plant'], pillars: ['Once-sonra', 'Butce dekor', 'Renk paleti'] },
  'Surdurulebilirlik': { outfits: ['organic linen dress', 'recycled denim jacket'], settings: ['urban community garden', 'zero-waste shop', 'city park'], props: ['reusable bottle', 'canvas tote', 'seedling'], pillars: ['Kucuk degisiklik', 'Urun alternatifi', 'Mit yikma'] },
  'Mental saglik': { outfits: ['soft knit cardigan', 'comfortable neutral set'], settings: ['quiet room with warm lamp', 'park bench at dusk'], props: ['journal', 'tea cup'], pillars: ['Gunluk pratik', 'Sinir koyma', 'Kaygi yonetimi'] },
  'Verimlilik': { outfits: ['clean monochrome outfit', 'structured shirt'], settings: ['organized desk', 'library study nook'], props: ['planner', 'timer', 'laptop'], pillars: ['Sistem kurma', 'Arac incelemesi', 'Gunluk plan'] },
  'Astroloji': { outfits: ['flowing dark dress', 'layered silver jewelry'], settings: ['candlelit room', 'night sky rooftop'], props: ['tarot deck', 'star map', 'crystal'], pillars: ['Haftalik yorum', 'Burc profili', 'Gokyuzu olayi'] },
};

const GENERIC_INTEREST = {
  outfits: ['smart casual outfit', 'simple neutral basics'],
  settings: ['modern city street', 'bright minimal interior'],
  props: ['smartphone', 'coffee cup'],
  pillars: ['Gunluk yasam', 'Ipucu', 'Perde arkasi'],
};

function interestProfile(interest) {
  return INTERESTS[interest] || GENERIC_INTEREST;
}

function collect(interests, key) {
  const out = [];
  for (const i of interests) {
    for (const v of interestProfile(i)[key]) {
      if (!out.includes(v)) out.push(v);
    }
  }
  return out.length ? out : GENERIC_INTEREST[key];
}

/**
 * Cevaplardan tam persona uretir: kisilik, ses rehberi, backstory, icerik sutunlari.
 */
function build(answers, name) {
  const z = ZODIAC[answers.zodiac] || ZODIAC['Terazi'];
  const e = EDUCATION[answers.education] || EDUCATION['Universite (lisans)'];
  const interests = answers.interests || [];
  const primary = interests[0] || 'Gunluk yasam';

  const traits = z.traits;
  const outfits = collect(interests, 'outfits');
  const settings = collect(interests, 'settings');
  const props = collect(interests, 'props');
  const pillars = collect(interests, 'pillars');

  const backstory = [
    `${name}, ${answers.age} yasinda, ${answers.region} kokenli.`,
    `${traits[0].charAt(0).toUpperCase() + traits[0].slice(1)} ve ${traits[2]} bir karakter;`,
    `${answers.education.toLowerCase()} egitiminin ardindan ${primary.toLowerCase()} alanina yoneldi.`,
    `Bugun ${interests.slice(0, 3).join(', ').toLowerCase()} uzerine icerik uretiyor.`,
    `Amaci: takipcilerine ${primary.toLowerCase()} konusunda kisa, uygulanabilir ve durust bir rehber olmak.`,
  ].join(' ');

  return {
    zodiac: answers.zodiac,
    education: answers.education,
    interests,
    traits,
    moodsEn: MOODS_EN[answers.zodiac] || MOODS_EN['Terazi'],
    tone: z.tone,
    signatureHook: z.hook,
    emojiStyle: z.emoji,
    visualMood: z.visual,
    voiceGuide: {
      register: e.register,
      sentenceLength: e.sentence,
      avoid: e.avoid.concat(['gercek bir kisiyi taklit etmek', 'saglik/finans konusunda kesin vaat']),
      emojiRule: `Caption basina 2-3 emoji, cumle sonunda. Tercih: ${z.emoji}`,
      ctaStyle: 'Her caption bir soru veya net bir eylem cagrisi ile biter.',
      openers: [z.hook, `"${primary} hakkinda kimsenin soylemedigi sey:"`, '"3 hafta denedim, sonuc su:"'],
    },
    backstory,
    contentPillars: pillars.slice(0, 6),
    wardrobe: outfits,
    settings,
    props,
  };
}

module.exports = { build, ZODIAC, EDUCATION, INTERESTS, MOODS_EN, interestProfile };
