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

function ensureDirs() {
  for (const dir of [DATA_DIR, IMAGES_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[store] ${path.basename(file)} okunamadi:`, err.message);
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDirs();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
  return value;
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

/* --------------------------------------------------------------- saglayici */

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

function addGalleryItem(item) {
  const gallery = getGallery();
  gallery.unshift(item);
  saveGallery(gallery);
  return item;
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
  getProviderConfig,
  saveProviderConfig,
  getGallery,
  saveGallery,
  addGalleryItem,
  saveImageBuffer,
  readImageBuffer,
  resetAll,
};
