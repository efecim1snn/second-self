'use strict';

/**
 * VESIKALIK SETI (referans kareler)
 *
 * Karakter yaratildiktan sonra atilacak ILK adim. Herhangi bir icerik gorseli
 * uretmeden once yuzun 8 acidan vesikaligi cikarilir.
 *
 * Neden: tek bir "altin kare" yuzu sadece o acidan tanimlar. Model karakteri
 * yandan veya asagidan gostermek istediginde tahmin etmeye baslar ve yuz kayar.
 * 8 acilik set, hem referans destekleyen platformlara dogru aciyi verir hem de
 * LoRA egitimi / platform karakteri olusturmak icin gereken minimum veri setidir.
 *
 * Kritik kural: 8 karede DEGISEN TEK SEY ACIDIR. Kiyafet, arka plan, isik ve
 * ifade birebir ayni tutulur - degisen her ek degisken yuzu kaydirir.
 */

const BASE_SCENE = {
  shot: 'tightly cropped passport-style identification headshot, head and shoulders only, the face filling most of the frame',
  outfit: 'a plain white crew-neck t-shirt',
  setting: 'a plain light grey seamless studio background',
  props: '',
  lighting: 'flat even soft studio lighting with no harsh shadows on the face',
  mood: 'neutral and relaxed',
  aspect: 'square',
  style: 'reference',
};

const ANGLES = [
  {
    // TEK KAREDE COK GORUNUM.
    // Referans gorsel kabul etmeyen modellerde (FLUX/Pollinations gibi) en
    // tutarli yontem budur: acilari ayri ayri uretmek yerine hepsini AYNI
    // karede uretmek. Model tek bir goruntu icinde kendini tutarli tutmak
    // zorunda kaldigi icin yuz, sac ve kiyafet uc gorunumde de ayni cikar.
    key: 'sheet',
    label: 'Karakter sayfasi (3 gorunum)',
    order: 0,
    isSheet: true,
    aspect: 'wide',
    pose: 'shown three times side by side in a single frame as a character model sheet: front view on the left, 45 degree three-quarter view in the middle, and full side profile on the right, identical face, identical hair and identical clothing in all three, evenly spaced, neutral expression with the mouth closed',
  },
  {
    key: 'front',
    label: 'Onden (0°)',
    order: 1,
    primary: true,
    pose: 'looking perfectly straight into the camera, face square to the lens, both ears equally visible, neutral expression with the mouth closed',
  },
  {
    key: 'quarter_left',
    label: 'Sol ceyrek (45°)',
    order: 2,
    pose: 'head turned 45 degrees to their left in a three-quarter view, eyes still looking towards the camera, neutral expression with the mouth closed',
  },
  {
    key: 'quarter_right',
    label: 'Sag ceyrek (45°)',
    order: 3,
    pose: 'head turned 45 degrees to their right in a three-quarter view, eyes still looking towards the camera, neutral expression with the mouth closed',
  },
  {
    key: 'profile_left',
    label: 'Sol profil (90°)',
    order: 4,
    pose: 'a full 90 degree left profile, the nose pointing towards the left edge of the frame, looking straight ahead, neutral expression with the mouth closed',
  },
  {
    key: 'profile_right',
    label: 'Sag profil (90°)',
    order: 5,
    pose: 'a full 90 degree right profile, the nose pointing towards the right edge of the frame, looking straight ahead, neutral expression with the mouth closed',
  },
  {
    key: 'tilt_up',
    label: 'Alttan aci',
    order: 6,
    pose: 'facing the camera with the chin slightly raised, photographed from slightly below eye level, neutral expression with the mouth closed',
  },
  {
    key: 'tilt_down',
    label: 'Ustten aci',
    order: 7,
    pose: 'facing the camera with the chin slightly lowered, photographed from slightly above eye level, neutral expression with the mouth closed',
  },
  {
    key: 'back_quarter',
    label: 'Arkadan ceyrek',
    order: 8,
    pose: 'seen from behind at a three-quarter angle, showing the back of the head, the hairline at the neck and one ear, face mostly hidden',
  },
];

const BY_KEY = new Map(ANGLES.map((a) => [a.key, a]));

/** Bir acinin promptcraft'a verilecek sahne nesnesi. */
function sceneFor(angleKey) {
  const angle = BY_KEY.get(angleKey);
  if (!angle) return null;
  return {
    ...BASE_SCENE,
    id: `ref_${angle.key}`,
    angle: angle.key,
    category: 'reference',
    categoryLabel: `Vesikalik · ${angle.label}`,
    pose: angle.pose,
    aspect: angle.aspect || BASE_SCENE.aspect,
    shot: angle.isSheet
      ? 'a character model sheet with three head-and-shoulders views of the same person side by side'
      : BASE_SCENE.shot,
    // Her aciya kimlikten turetilmis FARKLI bir seed verilir.
    // Ayni seed + ayni kalip = model aci talimatini yok sayip birebir ayni
    // kareyi tekrar uretiyor; 8 kare yerine 1 kareyi 8 kez almis oluyorduk.
    seedOffset: angle.order * 7919,
  };
}

function list() {
  return ANGLES.map(({ key, label, order, primary }) => ({ key, label, order, primary: !!primary }));
}

function primaryKey() {
  return (ANGLES.find((a) => a.primary) || ANGLES[0]).key;
}

/**
 * Karakterin vesikalik durumu: kac aci tamam, hangileri eksik.
 */
function status(character) {
  const set = (character && character.referenceSet) || {};
  const done = ANGLES.filter((a) => set[a.key] && set[a.key].filename);
  return {
    total: ANGLES.length,
    done: done.length,
    complete: done.length === ANGLES.length,
    missing: ANGLES.filter((a) => !(set[a.key] && set[a.key].filename)).map((a) => a.key),
    angles: ANGLES.map((a) => ({
      key: a.key,
      label: a.label,
      order: a.order,
      shot: set[a.key] || null,
      isPrimary: !!(character && character.reference && set[a.key] && character.reference.filename === set[a.key].filename),
    })),
  };
}

module.exports = { ANGLES, BASE_SCENE, sceneFor, list, primaryKey, status };
