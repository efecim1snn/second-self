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
  // "subject small in frame" bilerek kaldirildi: modele yuzu kucult demek
  // oluyordu ve tam boy karelerde yuz eriyordu.
  wide: 'wide environmental shot, the subject clearly readable in the frame',
};

/**
 * ISIK HAVUZU
 *
 * Onceden 8 sabit dize vardi ve 12 sahne onerisinde ayni isik iki kez
 * donuyordu - akis gorsel olarak tekduze cikiyordu.
 *
 * Asagidakiler YouMind OpenLab prompt kutuphanesinden (MIT) TURETILDI:
 * kaynaktaki 677 sahne kaydinin isik alanlari cikarilip temizlendi,
 * kimlik/kamera/kalite kalintilari elendi, benzer olanlar teklendi.
 * Tam lisans: THIRD_PARTY_LICENSES.md
 *
 * NOT: bu dizinin uzamasi sahne ONERILERINI degistirir (pick() index
 * tabanli), karakterin KIMLIGINI degistirmez - kimlik promptcraft
 * physicalCore()'dan gelir ve bu dosyaya bagli degildir.
 */
const LIGHTING = [
  'single soft key light positioned from the upper left',
  'golden hour lighting',
  'studio softbox, very soft, low, subtle',
  'natural daylight with cool winter tones',
  'direct built in camera flash',
  'warm bedside lamp lighting with soft shadows',
  'harsh direct flash, high contrast',
  'mixed lighting, warm ambient room lighting in background',
  'soft warm sunlight through window blinds',
  'soft studio lighting',
  'soft natural window light from the side, warm indoor ambience',
  'soft indoor lighting, warm and natural, gentle, evenly lit',
  'cool-toned, slightly overexposed, soft glow',
  'high contrast, light leaks, chromatic aberration',
  'high key lighting, soft with gentle highlights',
  'soft, natural daylight from a window',
  'bright natural, window sunlight, playful highlights',
  'natural gym lighting, realistic shadows, clean neutral tones',
  'soft diffused, ambient room light, low, gentle',
  'natural night lighting, slightly dark, professional and calm',
  'soft key-light, natural indoor arena tones',
  'orange lantern glow, teal neon strips, high',
  'flash photography style mixed with ambient street lighting',
  'bright natural daylight, dappled sunlight',
  'bright, hard natural sunlight',
  'bright soft diffused lighting',
  'cloudy daylight with harsh reflections',
  'harsh cloudy daylight with uneven reflections',
  'natural sunlight, golden hour, soft shadows',
  'overhead indoor lighting, soft but directional from above',
  'warm champagne and cream tones',
  'soft golden light diffused through a pale overcast sky',
  'bright, natural-looking indoor lighting, soft shadows',
  'natural daylight, soft and even',
  'overhead fluorescent lighting',
  'soft, bright, natural-looking indoor daylight',
  'warm golden hour natural light with soft shadows',
  'cinematic with gentle highlights and specular reflections',
  'natural sunlight from window',
  'dramatic soft studio lighting',
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
