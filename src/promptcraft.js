'use strict';

/**
 * PROMPT MUTFAGI
 *
 * Kilitli kimlik + sahne -> her platformun kendi diline gore prompt.
 * Her uretimde ayni "fiziksel cekirdek" kelimesi kelimesine tekrarlanir;
 * tutarliligin %70'i budur. Kalan %30: sabit seed + referans gorsel.
 */

/* ----------------------------------------------- TR -> EN sozluk (gorsel) */

const GENDER = {
  'Kadin': 'woman',
  'Erkek': 'man',
  'Androjen': 'androgynous person',
  'Non-binary': 'non-binary person',
  'Android / dijital varlik': 'humanoid android',
};

const ETHNICITY = {
  'Akdeniz': 'Mediterranean',
  'Kuzey Avrupali': 'Northern European',
  'Slav': 'Slavic',
  'Turk': 'Turkish',
  'Arap': 'Arab',
  'Fars': 'Persian',
  'Berberi': 'Amazigh',
  'Batı Afrikali': 'West African',
  'Dogu Afrikali': 'East African',
  'Hint': 'South Asian Indian',
  'Cinli': 'Han Chinese',
  'Japon': 'Japanese',
  'Koreli': 'Korean',
  'Guneydogu Asyali': 'Southeast Asian',
  'Latin / Hispanik': 'Latina/Latino Hispanic',
  'Yerli Amerikali': 'Native American',
  'Polinezyali': 'Polynesian',
  'Karma / cok etnikli': 'mixed-race',
};

const REGION = {
  'Akdeniz': 'Mediterranean coast',
  'Kuzey Avrupa': 'Nordic',
  'Bati Avrupa': 'Western European',
  'Dogu Avrupa': 'Eastern European',
  'Balkanlar': 'Balkan',
  'Anadolu / Turkiye': 'Anatolian Turkish',
  'Kafkasya': 'Caucasian highlands',
  'Orta Dogu': 'Middle Eastern',
  'Kuzey Afrika': 'North African',
  'Sahra Alti Afrika': 'Sub-Saharan African',
  'Orta Asya': 'Central Asian',
  'Guney Asya': 'South Asian',
  'Dogu Asya': 'East Asian',
  'Guneydogu Asya': 'Southeast Asian',
  'Latin Amerika': 'Latin American',
  'Kuzey Amerika': 'North American',
  'Okyanusya': 'Oceanian',
};

const SKIN = {
  'Cok acik (porselen)': 'very fair porcelain skin',
  'Acik': 'fair skin',
  'Acik bugday': 'light tan skin',
  'Bugday': 'tan skin',
  'Zeytin': 'olive skin',
  'Orta esmer': 'medium brown skin',
  'Koyu esmer': 'deep brown skin',
  'Cok koyu (abanoz)': 'rich ebony skin',
};

const EYES = {
  'Kahverengi': 'brown eyes',
  'Koyu kahve / siyaha yakin': 'near-black dark brown eyes',
  'Ela': 'hazel eyes',
  'Yesil': 'green eyes',
  'Mavi': 'blue eyes',
  'Gri': 'grey eyes',
  'Amber': 'amber eyes',
};

const HAIR_COLOR = {
  'Siyah': 'black',
  'Koyu kahve': 'dark brown',
  'Kahverengi': 'brown',
  'Acik kahve': 'light brown',
  'Sari / blonde': 'blonde',
  'Platin': 'platinum blonde',
  'Kizil': 'auburn red',
  'Gri / gumus': 'silver grey',
  'Renkli (fantezi)': 'vivid dyed',
};

const HAIR_STYLE = {
  'Kisa duz': 'short straight',
  'Kisa dalgali': 'short wavy',
  'Kisa kivircik': 'short curly',
  'Omuz hizasi duz': 'shoulder-length straight',
  'Omuz hizasi dalgali': 'shoulder-length wavy',
  'Uzun duz': 'long straight',
  'Uzun dalgali': 'long wavy',
  'Uzun kivircik': 'long curly',
  'Afro': 'natural afro',
  'Orgu / braids': 'braided',
  'Topuz': 'tied in a bun',
  'Trasli / cok kisa': 'buzzcut',
};

const BODY = {
  'Ince / zayif': 'slim slender build',
  'Atletik': 'athletic toned build',
  'Kaslı': 'muscular build',
  'Kum saati': 'hourglass figure',
  'Armut': 'pear-shaped figure',
  'Elma': 'apple-shaped figure',
  'Duz / dikdortgen': 'straight rectangular figure',
  'Kivrimli': 'curvy figure',
  'Ortalama': 'average build',
  'Uzun ve ince (manken)': 'tall lean model build',
  'Balikci / iri yapili': 'broad sturdy build',
};

// Ayirt edici ozelliklerin Ingilizce tarifleri ve risk seviyeleri src/traits.js'te.
const traits = require('./traits');

/* ---------------------------------------------------------- negatif liste */

const NEGATIVE = [
  'deformed hands', 'extra fingers', 'missing fingers', 'fused fingers',
  'mutated limbs', 'extra limbs', 'extra arms', 'asymmetrical eyes',
  'crossed eyes', 'distorted face', 'disfigured', 'bad anatomy', 'long neck',
  'lowres', 'blurry', 'out of focus', 'jpeg artifacts', 'oversaturated',
  'plastic skin', 'waxy skin', 'airbrushed skin', 'doll-like', 'uncanny valley',
  'watermark', 'signature', 'text', 'logo', 'caption',
  'duplicate person', 'cloned face', 'two heads',
  'cartoon', 'anime', '3d render', 'cgi', 'illustration', 'painting',
];

/**
 * Riskli ozellikler secildiginde negatif listeye eklenenler.
 * Negatif prompt tutarliligi tam cozmez ama en sik goruleni (cilin lekeye
 * donusmesi, dovmenin bulaniklasmasi) belirgin sekilde azaltir.
 */
const RISK_NEGATIVE = {
  freckles: ['blotchy skin', 'skin blemishes', 'acne', 'smudged freckles', 'muddy skin tone', 'dirt on face'],
  tattoo: ['blurry tattoo', 'smudged tattoo', 'illegible tattoo text', 'random tattoos', 'tattoo sleeve', 'body covered in tattoos'],
};

const QUALITY = {
  photo: [
    'photorealistic', 'natural skin texture with visible pores', 'candid photograph',
    'shot on 85mm lens', 'shallow depth of field', 'sharp focus on the eyes',
    'realistic color grading', 'high detail',
  ],
  editorial: [
    'editorial fashion photograph', 'studio quality', 'natural skin texture',
    'shot on medium format camera', 'sharp focus', 'high detail',
  ],
  // Vesikalik seti: kimligi tanimlayan kare. Sanatsal hicbir sey istemiyoruz.
  reference: [
    'photorealistic', 'natural skin texture with visible pores', 'sharp focus across the whole face',
    'evenly lit', 'no makeup styling', 'no jewellery', 'no accessories',
    'shot on 85mm lens at f/8', 'full face in focus', 'high detail', 'identification photo',
  ],
};

const ASPECT = {
  'post': { label: 'Instagram post (4:5)', mj: '4:5', wh: [864, 1080] },
  'story': { label: 'Story / Reel (9:16)', mj: '9:16', wh: [768, 1344] },
  'square': { label: 'Kare (1:1)', mj: '1:1', wh: [1024, 1024] },
  'wide': { label: 'Yatay (16:9)', mj: '16:9', wh: [1344, 768] },
};

/* ---------------------------------------------------- fiziksel cekirdek */

/**
 * Kimligin degismez tarifi. Her prompt'a AYNEN girer.
 */
/** Ayirt edici ozellik alani hem eski (metin) hem yeni (dizi) bicimi kabul eder. */
function distinctiveList(identity) {
  const raw = identity.distinctive;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw && raw !== 'Yok') return [raw];
  return [];
}

/**
 * @param {object} options
 *   short=true      -> vucut/boy/olcu atlanir (bas-omuz kadrajinda anlamsiz ve
 *                      prompt'u sulandirir)
 *   facialOnly=true -> sadece kadrajda gorunebilen ozellikler (bilek dovmesi
 *                      vesikalikta gorunmez; birakilirsa model uydurur)
 */
function physicalCore(identity, options = {}) {
  const gender = GENDER[identity.gender] || 'person';
  const ethnicity = ETHNICITY[identity.ethnicity] || identity.ethnicity;
  const region = REGION[identity.region] || identity.region;
  const skin = SKIN[identity.skinTone] || identity.skinTone;
  const eyes = EYES[identity.eyeColor] || identity.eyeColor;
  const hair = `${HAIR_STYLE[identity.hairStyle] || identity.hairStyle} ${HAIR_COLOR[identity.hairColor] || identity.hairColor} hair`;
  const body = BODY[identity.bodyType] || identity.bodyType;
  const list = distinctiveList(identity);
  const marks = options.facialOnly ? traits.describeFacial(list) : traits.describe(list);

  if (options.short) {
    return [
      `${identity.age}-year-old ${ethnicity} ${gender}`,
      skin, eyes, hair, ...marks,
    ].filter(Boolean).join(', ');
  }

  const m = identity.measurements || {};
  const stature = [];
  if (m.height_cm) stature.push(`${m.height_cm}cm tall`);
  if (m.bust_cm && m.waist_cm && m.hips_cm) {
    stature.push(`${m.bust_cm}-${m.waist_cm}-${m.hips_cm} proportions`);
  }

  // DIKKAT: bolge tarifi bilerek DISARIDA birakildi.
  // "Mediterranean coast heritage" gibi ifadelerdeki mekan kelimeleri
  // (coast, highlands) modeli sahneden kopararak plaja/dagliga cekiyordu.
  // Gorunusu zaten etnik koken tasiyor; bolge karakter verisinde duruyor.
  const parts = [
    `${identity.age}-year-old ${ethnicity} ${gender}`,
    skin,
    eyes,
    hair,
    body,
    ...stature,
    ...marks,
  ];

  return parts.filter(Boolean).join(', ');
}

/** Vesikalik icin ek negatifler: sahne/aksesuar sizmasini engeller. */
const REFERENCE_NEGATIVE = [
  'outdoor background', 'scenery', 'landscape', 'beach', 'sky', 'trees', 'street',
  'busy background', 'patterned background', 'props', 'jewellery', 'hat', 'sunglasses',
  'heavy makeup', 'full body', 'wide shot', 'multiple people', 'text overlay',
];

/** Secilen riskli ozelliklere gore negatif listeyi genisletir. */
function negativeFor(identity, scene = {}) {
  const list = distinctiveList(identity);
  const extra = [];
  if (traits.hasFreckles(list)) extra.push(...RISK_NEGATIVE.freckles);
  if (traits.hasTattoo(list)) extra.push(...RISK_NEGATIVE.tattoo);
  if (scene.style === 'reference') extra.push(...REFERENCE_NEGATIVE);
  return [...NEGATIVE, ...extra].join(', ');
}

/**
 * VESIKALIK PROMPTU - normal sahnelerden ayri kurulur.
 *
 * Neden ayri: gorsel modelleri prompt'un BASINDAKI kelimelere agirlik verir.
 * Kisiyi anlatarak baslarsan "duz gri stüdyo arka plani" talimati sonda kalir
 * ve model karakteri plaja, sokaga, nereye isterse koyar. Burada once FORMAT
 * soylenir, kisi sonra gelir.
 */
function buildReferencePrompt(identity, scene, dialect) {
  const core = physicalCore(identity, { short: true, facialOnly: true });
  const naturalLanguage = ['flux', 'dalle', 'leonardo', 'higgsfield', 'generic'].includes(dialect);

  if (naturalLanguage) {
    // Sira onemli: once format (arka plani sabitler), hemen ardindan KISI
    // (kimligi yuksek agirlikta tutar), en sonda aci ve teknik detaylar.
    return [
      'A studio passport identification photograph taken against a plain, seamless light grey background.',
      `The subject is a ${core}.`,
      'Their hair length, hair style, eye colour and facial features must stay exactly as described above.',
      `${capitalise(scene.shot)}.`,
      `${capitalise(scene.pose)}.`,
      'They are wearing a plain white crew-neck t-shirt.',
      'Flat, even studio lighting with no harsh shadows and no coloured light.',
      'Photorealistic, natural skin texture with visible pores, sharp focus across the whole face, high detail.',
      'The background is completely empty - no scenery, no furniture, no props, no jewellery.',
    ].join(' ');
  }

  // Etiket tabanli araclar (Midjourney, SDXL): format kelimeleri yine basta.
  return [
    'passport ID photograph', 'plain seamless light grey studio backdrop',
    scene.shot, scene.pose,
    core,
    'plain white crew-neck t-shirt', 'flat even studio lighting', 'no shadows',
    'photorealistic', 'natural skin texture with visible pores', 'sharp focus on the face', 'high detail',
  ].filter(Boolean).join(', ');
}

/** Insan tarafindan okunabilir kisa ozet (panelde gosterilir) */
function identityLine(identity) {
  return physicalCore(identity);
}

/* ------------------------------------------------------------- lehceler */

const DIALECTS = {
  midjourney: {
    label: 'Midjourney',
    supportsNegative: false,
    supportsSeed: true,
    notes: [
      'Resmi API yok. Prompt\'u kopyalayip Discord/web arayuzune yapistir.',
      'Yuz kilidi icin golden shot\'i internete yukleyip --cref <url> --cw 100 ekle.',
    ],
  },
  leonardo: {
    label: 'Leonardo.ai (Phoenix)',
    supportsNegative: true,
    supportsSeed: true,
    notes: [
      'Negatif prompt ayri alana girilir.',
      'Yuz kilidi icin golden shot\'i "Image Guidance / Character Reference" olarak 0.8-0.9 agirlikla ekle.',
    ],
  },
  sdxl: {
    label: 'Stable Diffusion / SDXL (A1111, ComfyUI, Forge)',
    supportsNegative: true,
    supportsSeed: true,
    notes: [
      'Onerilen: 30 adim, CFG 4.5-6, DPM++ 2M Karras, 832x1216.',
      'Yuz kilidi icin IPAdapter FaceID veya bir LoRA en saglam sonucu verir.',
    ],
  },
  flux: {
    label: 'FLUX (Replicate, fal, BFL)',
    supportsNegative: false,
    supportsSeed: true,
    notes: [
      'Negatif prompt kullanmaz - istemediklerini yazma, sadece istedigini tarif et.',
      'Duz cumlelerle yazilan uzun tarifleri etiket yiginindan daha iyi anlar.',
    ],
  },
  dalle: {
    label: 'DALL-E 3 / gpt-image (OpenAI)',
    supportsNegative: false,
    supportsSeed: false,
    notes: [
      'Seed desteklemez - ayni yuzu birebir tekrarlamakta en zayif secenek.',
      'Prompt\'u kendi icinde yeniden yazar; bu yuzden tarif cok net olmali.',
    ],
  },
  higgsfield: {
    label: 'Higgsfield / karakter referansli araclar',
    supportsNegative: true,
    supportsSeed: true,
    notes: [
      'Once golden shot\'i "character / soul" olarak kaydet, sonra her uretimde onu sec.',
      'Bu tur araclarda tutarlilik prompt\'tan cok referans karakterden gelir.',
    ],
  },
  generic: {
    label: 'Genel (diger tum araclar)',
    supportsNegative: true,
    supportsSeed: true,
    notes: ['Araciniz ne kabul ediyorsa: prompt + negatif + seed alanlarini doldurun.'],
  },
};

/* -------------------------------------------------------------- uretim */

/**
 * Duz cumle isteyen lehceler (DALL-E) icin eksik artikeli tamamlar.
 * Difuzyon modelleri artikelsiz etiket dizisinden etkilenmez, ama DALL-E
 * prompt'u bir dil modeli gibi yeniden yazdigi icin dilbilgisi onemli.
 */
const UNCOUNTABLE = new Set([
  'produce', 'jewelry', 'jewellery', 'makeup', 'coffee', 'water', 'food',
  'equipment', 'lighting', 'hair', 'sportswear', 'swimwear', 'denim',
  'linen', 'gear', 'clothing', 'furniture', 'art', 'music',
]);

function withArticle(phrase) {
  const text = String(phrase || '').trim();
  if (!text) return '';
  if (/^(a|an|the|his|her|their|its|some|two|three)\s/i.test(text)) return text;
  const words = text.split(/\s+/);
  const last = words[words.length - 1].toLowerCase();
  if (last.endsWith('s')) return text;          // cogul
  if (UNCOUNTABLE.has(last)) return text;       // sayilamayan
  return `${/^[aeiou]/i.test(text) ? 'an' : 'a'} ${text}`;
}

/**
 * Poz zaten "holding ..." diyorsa aksesuari tekrar "holding" ile eklemek
 * modeli sasirtiyor (iki ayri nesne sanip ikisini de dusuruyor).
 */
function propsPhrase(scene) {
  if (!scene.props) return '';
  const poseHasHold = /\bholding\b/i.test(scene.pose || '');
  return poseHasHold ? `with ${scene.props} clearly in frame` : `holding ${scene.props}`;
}

function sceneWords(scene) {
  const bits = [];
  if (scene.shot) bits.push(scene.shot);
  if (scene.outfit) bits.push(`wearing ${scene.outfit}`);
  if (scene.pose) bits.push(scene.pose);
  if (scene.setting) bits.push(`in ${scene.setting}`);
  const props = propsPhrase(scene);
  if (props) bits.push(props);
  if (scene.lighting) bits.push(scene.lighting);
  if (scene.mood) bits.push(`${scene.mood} mood`);
  return bits.filter(Boolean);
}

/**
 * Ana fonksiyon.
 * @param {object} character  data/character.json icerigi
 * @param {object} scene      { shot, outfit, pose, setting, props, lighting, mood, aspect, extra }
 * @param {string} dialect    DIALECTS anahtari
 */
function build(character, scene = {}, dialect = 'generic') {
  const identity = character.identity;
  const core = physicalCore(identity);
  const aspectKey = ASPECT[scene.aspect] ? scene.aspect : 'post';
  const aspect = ASPECT[aspectKey];
  const seed = character.seed;
  const words = sceneWords(scene);
  const quality = QUALITY[scene.style] || QUALITY.photo;
  const extra = scene.extra ? String(scene.extra).trim() : '';
  const spec = DIALECTS[dialect] || DIALECTS.generic;

  // Negatif liste, secilen riskli ozelliklere gore genisler (cil -> lekelenme,
  // dovme -> bulanik/degisken desen) ve vesikalikta sahne sizmasini engeller.
  const negative = negativeFor(identity, scene);
  let prompt;
  const params = {};

  // Vesikalik: format-onde prompt, tum lehcelerde ayni mantik.
  if (scene.style === 'reference') {
    prompt = buildReferencePrompt(identity, scene, dialect);
    if (dialect === 'midjourney') {
      const flags = [`--ar ${aspect.mj}`, '--style raw', '--v 7', `--seed ${seed}`];
      prompt = `${prompt} ${flags.join(' ')}`;
    } else if (dialect === 'dalle') {
      params.size = '1024x1024';
    } else {
      params.negative_prompt = negative;
      params.seed = seed;
      params.width = aspect.wh[0];
      params.height = aspect.wh[1];
    }
    return {
      dialect,
      dialectLabel: spec.label,
      prompt: prompt.replace(/\s+/g, ' ').trim(),
      negative: spec.supportsNegative ? negative : null,
      seed: spec.supportsSeed ? seed : null,
      aspect: aspectKey,
      aspectLabel: aspect.label,
      width: aspect.wh[0],
      height: aspect.wh[1],
      params,
      notes: spec.notes,
      core,
      isReference: true,
    };
  }

  switch (dialect) {
    case 'midjourney': {
      prompt = [core, ...words, ...quality, extra].filter(Boolean).join(', ');
      const flags = [`--ar ${aspect.mj}`, '--style raw', '--v 7', `--seed ${seed}`];
      if (character.reference && character.reference.publicUrl) {
        flags.push(`--cref ${character.reference.publicUrl}`, '--cw 100');
      }
      prompt = `${prompt} ${flags.join(' ')}`;
      break;
    }

    case 'leonardo': {
      prompt = [
        `A ${core}, ${words.join(', ')}.`,
        `${quality.join(', ')}.`,
        extra,
      ].filter(Boolean).join(' ');
      params.negative_prompt = negative;
      params.seed = seed;
      params.width = aspect.wh[0];
      params.height = aspect.wh[1];
      params.preset = 'LEONARDO';
      break;
    }

    case 'sdxl': {
      prompt = [
        '(RAW photo:1.2)', '(photorealistic:1.2)',
        core,
        ...words,
        'natural skin texture', 'visible skin pores', 'film grain',
        '85mm f/1.8', 'sharp focus on eyes', 'high detail',
        extra,
      ].filter(Boolean).join(', ');
      params.negative_prompt = negative;
      params.seed = seed;
      params.steps = 30;
      params.cfg_scale = 5;
      params.sampler = 'DPM++ 2M Karras';
      params.width = aspect.wh[0];
      params.height = aspect.wh[1];
      break;
    }

    case 'flux': {
      // Once KADRAJ + MEKAN, sonra kisi, sonra eylem. Kisiyi anlatarak
      // baslarsan model bunu bir portre istegi sanip mekani gormezden gelir.
      prompt = [
        `${capitalise(scene.shot || 'A candid photograph')}${scene.setting ? `, set in ${scene.setting}` : ''}.`,
        `The subject is a ${core}.`,
        [
          scene.pose ? `They are ${scene.pose}` : '',
          scene.outfit ? `wearing ${scene.outfit}` : '',
          propsPhrase(scene),
        ].filter(Boolean).join(', ') + '.',
        scene.lighting ? `${capitalise(scene.lighting)}.` : '',
        extra ? `${extra}.` : '',
        'Photorealistic, natural skin texture with visible pores, realistic colour grading, shot on an 85mm lens, sharp focus on the eyes.',
      ].filter((s) => s && s !== '.').join(' ');
      params.seed = seed;
      params.width = aspect.wh[0];
      params.height = aspect.wh[1];
      break;
    }

    case 'dalle': {
      // DALL-E etiket yigini degil duz cumle ister; sahneyi cumlelere ceviriyoruz.
      const sentences = [
        scene.shot ? `Framed as ${withArticle(scene.shot)}.` : '',
        scene.outfit ? `The subject is wearing ${withArticle(scene.outfit)}.` : '',
        scene.pose ? `They are ${scene.pose}.` : '',
        scene.setting ? `The scene is set in ${withArticle(scene.setting)}.` : '',
        scene.props ? `They are holding ${withArticle(scene.props)}.` : '',
        scene.lighting ? `Lit by ${withArticle(scene.lighting)}.` : '',
        scene.mood ? `The overall mood is ${scene.mood}.` : '',
      ].filter(Boolean).join(' ');

      prompt = [
        `A realistic photograph of a ${core}.`,
        sentences,
        'The photograph looks candid and natural, with realistic skin texture, soft natural lighting and shallow depth of field. Do not add any text or watermark.',
        extra,
      ].filter(Boolean).join(' ');
      params.size = aspectKey === 'square' ? '1024x1024' : (aspectKey === 'wide' ? '1792x1024' : '1024x1792');
      break;
    }

    case 'higgsfield': {
      prompt = [
        `${core}, ${words.join(', ')}.`,
        `${quality.join(', ')}.`,
        extra,
      ].filter(Boolean).join(' ');
      params.negative_prompt = negative;
      params.seed = seed;
      params.aspect_ratio = aspect.mj;
      params.character_reference = character.reference && character.reference.publicUrl
        ? character.reference.publicUrl
        : '(golden shot\'i platformda karakter olarak kaydet ve burada sec)';
      break;
    }

    default: {
      prompt = [core, ...words, ...quality, extra].filter(Boolean).join(', ');
      params.negative_prompt = negative;
      params.seed = seed;
      params.width = aspect.wh[0];
      params.height = aspect.wh[1];
    }
  }

  return {
    dialect,
    dialectLabel: spec.label,
    prompt: prompt.replace(/\s+/g, ' ').trim(),
    negative: spec.supportsNegative ? negative : null,
    seed: spec.supportsSeed ? seed : null,
    aspect: aspectKey,
    aspectLabel: aspect.label,
    width: aspect.wh[0],
    height: aspect.wh[1],
    params,
    notes: spec.notes,
    core,
  };
}

function buildAll(character, scene = {}) {
  const out = {};
  for (const key of Object.keys(DIALECTS)) {
    out[key] = build(character, scene, key);
  }
  return out;
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  build,
  buildAll,
  physicalCore,
  identityLine,
  DIALECTS,
  ASPECT,
  NEGATIVE,
};
