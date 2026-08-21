'use strict';

/**
 * Tum kalici veri burada. Hepsi data/ altinda duz JSON.
 * data/ .gitignore'da - API anahtarlari ve karakter repoya girmez.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const TRASH_DIR = path.join(DATA_DIR, '_arsiv');

const CHARACTER_FILE = path.join(DATA_DIR, 'character.json');
const PROVIDERS_FILE = path.join(DATA_DIR, 'providers.json');
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');
const APP_FILE = path.join(DATA_DIR, 'app.json');
const UPSCALER_FILE = path.join(DATA_DIR, 'upscaler.json');

function ensureDirs() {
  for (const dir of [DATA_DIR, IMAGES_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

/* --------------------------------------------------------- yazma guvenligi */

/**
 * NEDEN KILIT VAR?
 *
 * Tek bir sunucu sureci icinde yaris yok: addGalleryItem bastan sona senkron,
 * Node olay dongusu fonksiyonun ortasinda baska istege gecemez.
 *
 * Ama IKI SUREC mumkun ve bugune kadar biz oneriyorduk: port doluyken hata
 * mesaji "PORT=4300 node server.js" diyordu. Iki surec ayni data/ klasorunu
 * paylasinca:
 *   - ikisi de gallery.json'u okur, kendi karesini ekler, sirayla yazar
 *     -> ikinci yazma birincinin karesini siler (kare "sessizce kayboluyor"),
 *   - ikisi de ayni sabit `<dosya>.tmp` adini kullanirdi -> biri otekinin
 *     yarim govdesini rename edip character.json'u bozabilirdi.
 *
 * Cozum uc parca: (1) dosya basina surecler arasi kilit, (2) benzersiz tmp adi
 * + fsync, (3) oku-degistir-yaz'i tek kilit altinda yapan updateJson.
 */

// Atomics.wait icin. Node ana is parcaciginda senkron uyumaya izin verir;
// busy-wait yapmadan birkac ms beklemenin sifir bagimlilikli tek yolu bu.
const KILIT_BEKLE = new Int32Array(new SharedArrayBuffer(4));
let _tmpSeq = 0;

/**
 * Dosya basina surecler arasi kilit. fn SENKRON olmali.
 *
 * fn'in senkron olmasi sart: server.js galeriye yazarken addGalleryItem'i
 * async olmayan bir .map() icinde cagiriyor. Store async'e cevrilirse o satir
 * promise'i sessizce yutar ve kare hic kaydedilmez.
 */
function withLock(file, fn, { timeoutMs = 8000, staleMs = 30000 } = {}) {
  const lockFile = `${file}.lock`;
  const basladi = Date.now();
  let fd = null;

  while (fd === null) {
    try {
      fd = fs.openSync(lockFile, 'wx');
      fs.writeFileSync(fd, String(process.pid), 'utf8');
    } catch (err) {
      // WINDOWS TUZAGI: kilit dosyasi tam o anda siliniyorsa openSync
      // EEXIST degil EPERM/EACCES donuyor ("delete pending" durumu).
      // Ucu de "su an kilitli, tekrar dene" demektir. EPERM'i gercek hata
      // sayip firlatmak, yogun yazmada sureci olduruyordu (stres testinde
      // 900 kaydin 300'u boyle kayboldu).
      if (!['EEXIST', 'EPERM', 'EACCES'].includes(err.code)) throw err;

      // Sahibi olmus bir kilit sonsuza kadar beklenmesin.
      let yas = null;
      try {
        yas = Date.now() - fs.statSync(lockFile).mtimeMs;
      } catch {
        // Kilit tam bu arada birakildi; asagida kisa bir nefes alip tekrar denenecek.
      }

      if (yas !== null && yas > staleMs) {
        try { fs.unlinkSync(lockFile); } catch {}
        continue;
      }
      if (Date.now() - basladi > timeoutMs) {
        throw new Error(
          `${path.basename(file)} dosyasi baska bir surec tarafindan kilitli. ` +
          'Ayni klasorden ikinci bir panel acik olabilir.'
        );
      }
      Atomics.wait(KILIT_BEKLE, 0, 0, 25);
    }
  }

  try {
    const sonuc = fn();
    if (sonuc && typeof sonuc.then === 'function') {
      throw new Error('withLock senkron fonksiyon bekler - promise verildi.');
    }
    return sonuc;
  } finally {
    try { fs.closeSync(fd); } catch {}
    try { fs.unlinkSync(lockFile); } catch {}
  }
}

/**
 * Once gecici dosyaya yaz, diske indir, sonra yerine tasi.
 * Gecici ad BENZERSIZ: sabit `.tmp` iki surecte carpisiyordu.
 */
function atomicWrite(file, value) {
  ensureDirs();
  const tmp = `${file}.${process.pid}.${++_tmpSeq}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  const govde = JSON.stringify(value, null, 2);
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, govde, 'utf8');
    fs.fsyncSync(fd); // rename'den once govde gercekten diskte olsun
  } finally {
    fs.closeSync(fd);
  }
  try {
    fs.renameSync(tmp, file);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch {}
    throw err;
  }
  return value;
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;

  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8').trim();
  } catch (err) {
    console.error(`[store] ${path.basename(file)} okunamadi:`, err.message);
    return fallback;
  }
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (err) {
    // Bozuk JSON'u SESSIZCE EZME. Uzerine yazarsak kullanicinin karakteri veya
    // galeri gecmisi geri donusu olmadan gider. Kenara al, adini soyle.
    const karantina = `${file}.bozuk-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    try {
      fs.renameSync(file, karantina);
      console.error(
        `[store] ${path.basename(file)} bozuk (${err.message}).\n` +
        `        Kenara alindi: ${path.basename(karantina)}\n` +
        `        Bos hali ile devam ediliyor - dosya SILINMEDI.`
      );
    } catch (tasimaHatasi) {
      console.error(`[store] ${path.basename(file)} bozuk ve kenara alinamadi:`, tasimaHatasi.message);
    }
    return fallback;
  }
}

function writeJson(file, value) {
  return atomicWrite(file, value);
}

/**
 * Oku -> degistir -> yaz, tek kilit altinda.
 * mutator undefined dondurürse HICBIR SEY yazilmaz (degisiklik yok demektir).
 */
function updateJson(file, fallback, mutator) {
  return withLock(file, () => {
    const mevcut = readJson(file, fallback);
    const yeni = mutator(mevcut);
    if (yeni === undefined) return mevcut;
    return atomicWrite(file, yeni);
  });
}

/* Sarmalayicilar: dosya yolu server.js'e sizmaz, karisik kullanim olmaz. */

function updateGallery(mutator) {
  return updateJson(GALLERY_FILE, [], mutator);
}

function updateCharacter(mutator) {
  return updateJson(CHARACTER_FILE, null, mutator);
}

function updateProviders(mutator) {
  return updateJson(PROVIDERS_FILE, { active: 'pollinations', entries: {} }, mutator);
}

function updateUpscaler(mutator) {
  return updateJson(UPSCALER_FILE, { active: 'none', scale: 2, entries: {} }, mutator);
}

function updateAppState(mutator) {
  return updateJson(APP_FILE, { welcomeSeen: false, welcomeAnswer: null }, mutator);
}

/* ---------------------------------------------------------------- karakter */

function getCharacter() {
  return readJson(CHARACTER_FILE, null);
}

function saveCharacter(character) {
  return writeJson(CHARACTER_FILE, character);
}

function hasCharacter() {
  return getCharacter() !== null;
}

/* ------------------------------------------------------- uygulama durumu */

/** Karsilama ekrani gibi bir kez gosterilen seyler burada. */
function getAppState() {
  return readJson(APP_FILE, { welcomeSeen: false, welcomeAnswer: null });
}

function saveAppState(state) {
  return updateAppState((mevcut) => ({ ...mevcut, ...state }));
}

/* --------------------------------------------------------------- saglayici */

/** Buyutme (upscale) ayari - saglayici ayarindan ayri tutulur. */
function getUpscalerConfig() {
  return readJson(UPSCALER_FILE, { active: 'none', scale: 2, entries: {} });
}

function saveUpscalerConfig(config) {
  return writeJson(UPSCALER_FILE, config);
}

function getProviderConfig() {
  // Varsayilan: Pollinations - ucretsiz ve anahtar istemez, boylece otomasyon
  // kutudan cikar cikmaz calisir. Kullanici istedigi an kendi platformuna gecer.
  return readJson(PROVIDERS_FILE, { active: 'pollinations', entries: {} });
}

function saveProviderConfig(config) {
  return writeJson(PROVIDERS_FILE, config);
}

/* ----------------------------------------------------------------- galeri */

function getGallery() {
  return readJson(GALLERY_FILE, []);
}

function saveGallery(items) {
  return writeJson(GALLERY_FILE, items);
}

/**
 * DIKKAT: imza bilerek SENKRON. server.js:731 ve stüdyolar bunu async
 * olmayan bir .map() icinde cagiriyor; async'e cevrilirse promise yutulur
 * ve kare hic kaydedilmez.
 */
function addGalleryItem(item) {
  updateGallery((gallery) => {
    gallery.unshift(item);
    return gallery;
  });
  return item;
}

/** Panelin gordugu pencere. Tum galeriyi her istekte tasimamak icin. */
function getGalleryPage(limit = 60) {
  return getGallery().slice(0, Math.max(Number(limit) || 60, 1));
}

function saveImageBuffer(buffer, ext = 'png') {
  ensureDirs();
  const id = `img_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
  const filename = `${id}.${ext}`;
  fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
  return { id, filename, url: `/gorseller/${filename}` };
}

function readImageBuffer(filename) {
  const safe = path.basename(filename);
  const full = path.join(IMAGES_DIR, safe);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full);
}

/**
 * Bir gorsel dosyasini kaldirir.
 * VARSAYILAN ARSIVDIR: dosya data/_arsiv/silinen/ altina tasinir, silinmez.
 * Kullanici yanlislikla sildiginde geri donebilsin diye - PNG'ler kucuk,
 * geri donusu olmayan silme tek tikla sunulacak bir sey degil.
 */
function trashImageFile(filename, { hard = false } = {}) {
  const safe = path.basename(String(filename || ''));
  if (!safe) return { removed: false, hard, archived: null };
  const full = path.join(IMAGES_DIR, safe);
  if (!fs.existsSync(full)) return { removed: false, hard, archived: null };

  if (hard) {
    fs.unlinkSync(full);
    return { removed: true, hard: true, archived: null };
  }

  const dest = path.join(TRASH_DIR, 'silinen');
  fs.mkdirSync(dest, { recursive: true });
  let hedef = path.join(dest, safe);
  if (fs.existsSync(hedef)) {
    hedef = path.join(dest, `${Date.now().toString(36)}_${safe}`);
  }
  fs.renameSync(full, hedef);
  return { removed: true, hard: false, archived: hedef };
}

/**
 * Bir dosya adini kac galeri kaydi kullaniyor?
 * Buyutme "yerinde guncelleme" yaptigi icin ayni dosya birden fazla kayitta
 * gecebiliyor; sayaç sifirlanmadan dosyayi kaldirmak oteki kaydin gorselini
 * de yok eder.
 */
function galleryUsesFile(filename) {
  const safe = path.basename(String(filename || ''));
  if (!safe) return 0;
  return getGallery().filter((i) => i && path.basename(String(i.filename || '')) === safe).length;
}

/* --------------------------------------------------- tasarim sablonlari */

const TEMPLATE_FILE = path.join(DATA_DIR, 'sablonlar.json');

/**
 * Begenilen gorunum birlesimleri (palet + font + dizilim).
 * Magaza tutarliligi Etsy'de satis unsuru; F5'te kaybolmamali.
 */
function getDesignTemplates(studio) {
  const hepsi = readJson(TEMPLATE_FILE, {});
  return Array.isArray(hepsi[studio]) ? hepsi[studio] : [];
}

function saveDesignTemplate(studio, sablon) {
  const sonuc = updateJson(TEMPLATE_FILE, {}, (hepsi) => {
    const liste = Array.isArray(hepsi[studio]) ? hepsi[studio] : [];
    // Ayni ad varsa uzerine yaz - kullanici "guncelle" beklentisinde.
    const kalan = liste.filter((s) => s.ad !== sablon.ad);
    kalan.unshift({ ...sablon, at: new Date().toISOString() });
    hepsi[studio] = kalan.slice(0, 30);
    return hepsi;
  });
  return sonuc[studio] || [];
}

function deleteDesignTemplate(studio, ad) {
  const sonuc = updateJson(TEMPLATE_FILE, {}, (hepsi) => {
    const liste = Array.isArray(hepsi[studio]) ? hepsi[studio] : [];
    hepsi[studio] = liste.filter((s) => s.ad !== ad);
    return hepsi;
  });
  return sonuc[studio] || [];
}

/* --------------------------------------------------------------- sifirlama */

/**
 * "TUM DATAYI SIL" komutu.
 * hard=false  -> data/_arsiv/<zaman-damgasi>/ altina tasir (geri alinabilir)
 * hard=true   -> kalici siler
 * API anahtarlarini varsayilan olarak KORUR (keepProviders), cunku genelde
 * silinmek istenen sey karakter, baglantilar degil.
 */
function resetAll({ hard = false, keepProviders = true } = {}) {
  ensureDirs();
  const savedProviders = keepProviders ? getProviderConfig() : null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targets = [CHARACTER_FILE, GALLERY_FILE];
  if (!keepProviders) targets.push(PROVIDERS_FILE);

  const moved = [];

  if (hard) {
    for (const file of targets) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        moved.push(path.basename(file));
      }
    }
    if (fs.existsSync(IMAGES_DIR)) {
      for (const f of fs.readdirSync(IMAGES_DIR)) {
        fs.unlinkSync(path.join(IMAGES_DIR, f));
      }
    }
  } else {
    const dest = path.join(TRASH_DIR, stamp);
    fs.mkdirSync(dest, { recursive: true });
    for (const file of targets) {
      if (fs.existsSync(file)) {
        fs.renameSync(file, path.join(dest, path.basename(file)));
        moved.push(path.basename(file));
      }
    }
    if (fs.existsSync(IMAGES_DIR)) {
      const files = fs.readdirSync(IMAGES_DIR);
      if (files.length) {
        const imgDest = path.join(dest, 'images');
        fs.mkdirSync(imgDest, { recursive: true });
        for (const f of files) {
          fs.renameSync(path.join(IMAGES_DIR, f), path.join(imgDest, f));
        }
      }
    }
  }

  // Kilit ve karantina dosyalari yukaridaki donguler disinda kaliyor -
  // sifirlamadan sonra bayat bir .lock kalirsa panel acilista takilir.
  try {
    for (const f of fs.readdirSync(DATA_DIR)) {
      if (/\.lock$|\.bozuk-|\.tmp$/.test(f)) {
        try { fs.unlinkSync(path.join(DATA_DIR, f)); } catch {}
      }
    }
  } catch {}

  ensureDirs();
  if (keepProviders && savedProviders) saveProviderConfig(savedProviders);

  return { hard, moved, archive: hard ? null : path.join(TRASH_DIR, stamp) };
}

module.exports = {
  ROOT,
  DATA_DIR,
  IMAGES_DIR,
  ensureDirs,
  getCharacter,
  saveCharacter,
  hasCharacter,
  getAppState,
  saveAppState,
  getProviderConfig,
  saveProviderConfig,
  getUpscalerConfig,
  saveUpscalerConfig,
  getGallery,
  saveGallery,
  addGalleryItem,
  getGalleryPage,
  getDesignTemplates,
  saveDesignTemplate,
  deleteDesignTemplate,
  saveImageBuffer,
  readImageBuffer,
  trashImageFile,
  galleryUsesFile,
  resetAll,
  // Yazma guvenligi katmani
  withLock,
  atomicWrite,
  updateJson,
  updateGallery,
  updateCharacter,
  updateProviders,
  updateUpscaler,
  updateAppState,
};
