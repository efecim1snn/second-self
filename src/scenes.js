'use strict';

/**
 * Sahne uretici.
 * Kimlik sabit kalir; degisen tek sey POZ / KIYAFET / ORTAM / ISIK.
 * Kategoriler: gunluk yasam, aktivite, egitim, close-up (stok icerik dengesi).
 */

const SHOTS = {
  closeup: 'close-up portrait, head and shoulders',
  bust: 'upper body shot, waist up',
  half: 'half body shot',
  full: 'full body shot',
  wide: 'wide environmental shot, subject small in frame',
};

const LIGHTING = [
  'soft natural window light',
  'golden hour sunlight',
  'overcast diffused daylight',
  'warm indoor lamp light',
  'blue hour city light',
  'bright midday sun with hard shadows',
  'soft studio key light with fill',
  'neon accent lighting at night',
];

const POSES = {
  daily: [
    'sitting relaxed and looking out of frame',
    'walking and mid-stride, looking over the shoulder',
    'leaning against a wall with arms crossed',
    'sitting on the floor with knees up',
    'stretching after waking up',
    'laughing candidly, hand near the face',
  ],
  activity: [
    'in the middle of the activity, focused',
    'adjusting equipment before starting',
    'catching breath after finishing, slight smile',
    'crouching down to look at something closely',
    'reaching up towards something',
  ],
  educational: [
    'talking directly to the camera, mid-sentence, hands gesturing',
    'pointing at something off frame while explaining',
    'holding an object up towards the camera to show it',
    'writing on a notebook and glancing up',
  ],
  closeup: [
    'soft smile, looking directly into the lens',
    'thoughtful expression, looking slightly away',
    'surprised expression, eyebrows raised',
    'serious neutral expression, direct eye contact',
    'eyes closed, calm expression',
  ],
};

const CATEGORIES = [
  { key: 'daily', label: 'Gunluk yasam', shot: 'half', ratio: 0.35 },
  { key: 'activity', label: 'Aktivite / hobi', shot: 'full', ratio: 0.3 },
  { key: 'educational', label: 'Egitim / anlatim', shot: 'bust', ratio: 0.2 },
  { key: 'closeup', label: 'Close-up / duygu', shot: 'closeup', ratio: 0.15 },
];

function pick(list, i) {
  if (!list || !list.length) return '';
  return list[i % list.length];
}

/**
 * Kimlik + persona -> hazir sahne onerileri.
 * Deterministik (index tabanli): ayni karakter icin ayni liste cikar.
 */
function suggest(character, count = 12) {
  const p = character.persona;
  const out = [];
  let i = 0;

  const plan = [];
  for (const cat of CATEGORIES) {
    const n = Math.max(1, Math.round(count * cat.ratio));
    for (let k = 0; k < n; k++) plan.push(cat);
  }

  for (const cat of plan.slice(0, count)) {
    out.push({
      id: `sc_${cat.key}_${i}`,
      category: cat.key,
      categoryLabel: cat.label,
      shot: SHOTS[cat.shot],
      pose: pick(POSES[cat.key], i),
      outfit: pick(p.wardrobe, i),
      setting: pick(p.settings, i + (cat.key === 'closeup' ? 1 : 0)),
      props: cat.key === 'closeup' ? '' : pick(p.props, i),
      lighting: pick(LIGHTING, i),
      // Prompt'a giren kelime Ingilizce olmali (bkz. persona.MOODS_EN).
      mood: pick(p.moodsEn || [], i),
      aspect: cat.key === 'closeup' ? 'square' : 'post',
      style: 'photo',
    });
    i++;
  }

  return out;
}

function options() {
  return {
    shots: Object.entries(SHOTS).map(([key, value]) => ({ key, value })),
    lighting: LIGHTING,
    categories: CATEGORIES,
    poses: POSES,
  };
}

module.exports = { suggest, options, SHOTS, LIGHTING, POSES, CATEGORIES };
