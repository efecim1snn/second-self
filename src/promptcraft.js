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

const DISTINCTIVE = {
  'Yok': '',
  'Ciller': 'light freckles across the nose and cheeks',
  'Ben (yuzde)': 'a small beauty mark above the lip',
  'Gozluk': 'thin round glasses',
  'Dovme (kol)': 'a fine-line tattoo on the forearm',
  'Dovme (boyun)': 'a small tattoo on the side of the neck',
  'Piercing (burun)': 'a tiny nose stud',
  'Piercing (kulak)': 'stacked ear piercings',
  'Belirgin kaslar': 'strong defined eyebrows',
  'Gamze': 'dimples when smiling',
  'Heterokromi (farkli renkte gozler)': 'heterochromia, one eye a different colour',
  'Beyaz sac tutami': 'a single white streak in the hair',
  'Boyun kolyesi (sabit)': 'a signature thin chain necklace always worn',
};

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
function physicalCore(identity) {
  const gender = GENDER[identity.gender] || 'person';
  const ethnicity = ETHNICITY[identity.ethnicity] || identity.ethnicity;
  const region = REGION[identity.region] || identity.region;
  const skin = SKIN[identity.skinTone] || identity.skinTone;
  const eyes = EYES[identity.eyeColor] || identity.eyeColor;
  const hair = `${HAIR_STYLE[identity.hairStyle] || identity.hairStyle} ${HAIR_COLOR[identity.hairColor] || identity.hairColor} hair`;
  const body = BODY[identity.bodyType] || identity.bodyType;
  const mark = DISTINCTIVE[identity.distinctive] || '';

  const m = identity.measurements || {};
  const stature = [];
  if (m.height_cm) stature.push(`${m.height_cm}cm tall`);
  if (m.bust_cm && m.waist_cm && m.hips_cm) {
    stature.push(`${m.bust_cm}-${m.waist_cm}-${m.hips_cm} proportions`);
  }

  const parts = [
    `${identity.age}-year-old ${ethnicity} ${gender}`,
    `${region} heritage`,
    skin,
    eyes,
    hair,
    body,
    ...stature,
  ];
  if (mark) parts.push(mark);

  return parts.filter(Boolean).join(', ');
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

function sceneWords(scene) {
  const bits = [];
  if (scene.shot) bits.push(scene.shot);
  if (scene.outfit) bits.push(`wearing ${scene.outfit}`);
  if (scene.pose) bits.push(scene.pose);
  if (scene.setting) bits.push(`in ${scene.setting}`);
  if (scene.props) bits.push(`holding ${scene.props}`);
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
  const quality = scene.style === 'editorial' ? QUALITY.editorial : QUALITY.photo;
  const extra = scene.extra ? String(scene.extra).trim() : '';
  const spec = DIALECTS[dialect] || DIALECTS.generic;

  const negative = NEGATIVE.join(', ');
  let prompt;
  const params = {};

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
      prompt = [
        `A candid photograph of a ${core}.`,
        words.length ? `${capitalise(words.join(', '))}.` : '',
        'Natural skin texture with visible pores, realistic colour grading, shot on an 85mm lens with shallow depth of field, sharp focus on the eyes.',
        extra,
      ].filter(Boolean).join(' ');
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
