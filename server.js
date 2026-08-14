'use strict';

/**
 * AI INFLUENCER OTOMASYON - yerel panel sunucusu
 *
 * Sifir bagimlilik. Node 18+ yeterli.
 *
 * ONEMLI: Bu otomasyon KENDI BASINA GORSEL URETMEZ ve stok gorsel kullanmaz.
 * Gorselin geldigi tek yer, kullanicinin Ayarlar bolumunden bagladigi
 * gorsel uretim API'sidir. Bagli API yoksa otomasyon sadece prompt verir.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const store = require('./src/store');
const wizard = require('./src/wizard');
const persona = require('./src/persona');
const promptcraft = require('./src/promptcraft');
const scenes = require('./src/scenes');
const providers = require('./src/providers');

const PORT = Number(process.env.PORT || 4200);
const PUBLIC_DIR = path.join(__dirname, 'public');

const NODE_MAJOR = Number(process.versions.node.split('.')[0]);
if (NODE_MAJOR < 18) {
  console.error(`\n[HATA] Node 18+ gerekli (su an: ${process.version}). https://nodejs.org\n`);
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/* --------------------------------------------------------------- yardimci */

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req, limit = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Istek govdesi cok buyuk.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Gecersiz JSON govdesi.'));
      }
    });
    req.on('error', reject);
  });
}

function serveFile(res, fullPath) {
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Bulunamadi');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(fullPath).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  });
}

/** API anahtarlarini panele gonderirken maskele. */
function maskConfig(providerSpec, config) {
  const out = {};
  for (const field of providerSpec.fields || []) {
    const value = config ? config[field.key] : undefined;
    if (value == null || value === '') {
      out[field.key] = '';
      continue;
    }
    if (field.type === 'password') {
      const str = String(value);
      out[field.key] = `${'•'.repeat(Math.max(0, Math.min(20, str.length - 4)))}${str.slice(-4)}`;
      out[`${field.key}__set`] = true;
      continue;
    }
    if (field.secret) {
      // Serbest metin icindeki anahtar benzeri uzun dizileri maskele
      // (ornek: Ozel API basliklarindaki "Bearer sk-...").
      out[field.key] = String(value).replace(
        /[A-Za-z0-9_\-.:]{16,}/g,
        (token) => `${'•'.repeat(12)}${token.slice(-4)}`
      );
      out[`${field.key}__set`] = true;
      continue;
    }
    out[field.key] = value;
  }
  return out;
}

/** Panelden gelen maskelenmis degeri kaydetme; eski degeri koru. */
function mergeConfig(providerSpec, oldConfig = {}, incoming = {}) {
  const out = { ...oldConfig };
  for (const field of providerSpec.fields || []) {
    if (!(field.key in incoming)) continue;
    const value = incoming[field.key];
    const masked = typeof value === 'string' && value.includes('•');
    if ((field.type === 'password' || field.secret) && masked) continue;
    out[field.key] = value;
  }
  return out;
}

function activeProvider() {
  const cfg = store.getProviderConfig();
  const spec = providers.get(cfg.active || 'manual');
  return { cfg, spec, config: (cfg.entries && cfg.entries[spec.id]) || {} };
}

function referencePayload(character) {
  if (!character.reference || !character.reference.filename) return {};
  const buffer = store.readImageBuffer(character.reference.filename);
  if (!buffer) return {};
  const b64 = buffer.toString('base64');
  return { referenceBase64: b64, referenceDataUri: `data:image/png;base64,${b64}` };
}

/* ------------------------------------------------------------------ rotalar */

const routes = {
  'GET /api/durum': async () => {
    const character = store.getCharacter();
    const { cfg, spec } = activeProvider();
    return {
      hasCharacter: !!character,
      character,
      gallery: store.getGallery().slice(0, 60),
      provider: {
        active: spec.id,
        label: spec.label,
        generates: spec.id !== 'manual',
        dialect: (cfg.entries && cfg.entries[spec.id] && cfg.entries[spec.id].dialect) || spec.dialect,
      },
      identityLine: character ? promptcraft.identityLine(character.identity) : null,
    };
  },

  'GET /api/sorular': async () => ({ questions: wizard.QUESTIONS }),

  'POST /api/karakter': async (body) => {
    if (store.hasCharacter()) {
      const err = new Error('Zaten kilitli bir karakter var. Yeni karakter icin once "TUM VERIYI SIL" komutunu calistir.');
      err.status = 409;
      throw err;
    }

    const { ok, errors, clean } = wizard.validate(body.answers || {});
    if (!ok) {
      const err = new Error(errors.join(' '));
      err.status = 400;
      err.errors = errors;
      throw err;
    }

    const name = clean.name || wizard.suggestName(clean);
    const handle = clean.handle || wizard.suggestHandle(name, clean.interests);

    const identity = {
      name,
      handle: handle.replace(/^@/, ''),
      gender: clean.gender,
      region: clean.region,
      ethnicity: clean.ethnicity,
      skinTone: clean.skinTone,
      eyeColor: clean.eyeColor,
      hairColor: clean.hairColor,
      hairStyle: clean.hairStyle,
      age: clean.age,
      bodyType: clean.bodyType,
      measurements: clean.measurements,
      distinctive: clean.distinctive,
    };

    const character = {
      version: 1,
      characterId: `chr_${crypto.randomBytes(4).toString('hex')}`,
      createdAt: new Date().toISOString(),
      locked: true,
      seed: wizard.deriveSeed(identity),
      identity,
      persona: persona.build(clean, name),
      reference: { filename: null, publicUrl: '', setAt: null },
    };

    store.saveCharacter(character);
    return { character, identityLine: promptcraft.identityLine(identity) };
  },

  'POST /api/karakter/persona': async (body) => {
    const character = store.getCharacter();
    if (!character) throw notFound('Once karakter yarat.');
    // Kimlik DEGISTIRILEMEZ. Sadece kisilik/metin katmani duzenlenebilir.
    const editable = ['backstory', 'tone', 'signatureHook', 'contentPillars', 'wardrobe', 'settings', 'props'];
    for (const key of editable) {
      if (key in (body || {})) character.persona[key] = body[key];
    }
    if (body && typeof body.publicReferenceUrl === 'string') {
      character.reference.publicUrl = body.publicReferenceUrl.trim();
    }
    store.saveCharacter(character);
    return { character };
  },

  'POST /api/sahneler': async (body) => {
    const character = store.getCharacter();
    if (!character) throw notFound('Once karakter yarat.');
    return {
      scenes: scenes.suggest(character, Math.min(Math.max(Number(body.count) || 12, 1), 40)),
      options: scenes.options(),
    };
  },

  'POST /api/prompt': async (body) => {
    const character = store.getCharacter();
    if (!character) throw notFound('Once karakter yarat.');
    const scene = body.scene || {};
    const { spec, config } = activeProvider();
    const dialect = config.dialect || spec.dialect;
    return {
      active: promptcraft.build(character, scene, dialect),
      all: promptcraft.buildAll(character, scene),
      dialects: promptcraft.DIALECTS,
    };
  },

  'POST /api/uret': async (body) => {
    const character = store.getCharacter();
    if (!character) throw notFound('Once karakter yarat.');

    const { spec, config } = activeProvider();
    const scene = body.scene || {};
    const dialect = config.dialect || spec.dialect;
    const built = promptcraft.build(character, scene, dialect);
    const aspectMeta = promptcraft.ASPECT[built.aspect];

    if (spec.id === 'manual') {
      const err = new Error(
        'Bagli bir gorsel uretim API\'si yok. Bu otomasyon kendi basina gorsel uretmez ve stok gorsel kullanmaz. ' +
        'Ayarlar bolumunden kullandigin platformu bagla (Leonardo, OpenAI, Stability, Replicate, fal.ai, yerel Stable Diffusion, ComfyUI veya Ozel API). ' +
        'Asagidaki prompt hazir - istersen simdilik elle kendi aracina yapistirabilirsin.'
      );
      err.status = 428;
      err.payload = { prompt: built, all: promptcraft.buildAll(character, scene) };
      throw err;
    }

    const started = Date.now();
    const result = await spec.generate({
      config,
      prompt: built.prompt,
      negative: built.negative,
      seed: built.seed,
      width: built.width,
      height: built.height,
      size: built.params.size || `${built.width}x${built.height}`,
      aspectRatio: aspectMeta.mj,
      count: Math.min(Math.max(Number(body.count) || 1, 1), 4),
      ...(spec.supportsReference ? referencePayload(character) : {}),
    });

    const saved = [];
    for (const image of result.images || []) {
      const ext = image.mime === 'image/jpeg' ? 'jpg' : image.mime === 'image/webp' ? 'webp' : 'png';
      const file = store.saveImageBuffer(image.buffer, ext);
      const item = {
        id: file.id,
        filename: file.filename,
        url: file.url,
        createdAt: new Date().toISOString(),
        provider: spec.id,
        providerLabel: spec.label,
        dialect,
        prompt: built.prompt,
        negative: built.negative,
        seed: built.seed,
        scene,
        category: scene.categoryLabel || scene.category || null,
        isGolden: false,
      };
      store.addGalleryItem(item);
      saved.push(item);
    }

    return {
      images: saved,
      prompt: built,
      provider: { id: spec.id, label: spec.label },
      tookMs: Date.now() - started,
    };
  },

  'GET /api/saglayicilar': async () => {
    const cfg = store.getProviderConfig();
    const list = providers.list().map((p) => ({
      ...p,
      config: maskConfig(providers.get(p.id), (cfg.entries && cfg.entries[p.id]) || {}),
      configured: isConfigured(providers.get(p.id), (cfg.entries && cfg.entries[p.id]) || {}),
    }));
    return { active: cfg.active || 'manual', providers: list };
  },

  'POST /api/saglayici': async (body) => {
    const spec = providers.get(body.id);
    if (!spec || spec.id !== body.id) throw badRequest('Bilinmeyen saglayici.');
    const cfg = store.getProviderConfig();
    cfg.entries = cfg.entries || {};
    cfg.entries[spec.id] = mergeConfig(spec, cfg.entries[spec.id], body.config || {});
    if (body.makeActive) cfg.active = spec.id;
    store.saveProviderConfig(cfg);
    return {
      active: cfg.active,
      config: maskConfig(spec, cfg.entries[spec.id]),
      configured: isConfigured(spec, cfg.entries[spec.id]),
    };
  },

  'POST /api/saglayici/aktif': async (body) => {
    const spec = providers.get(body.id);
    const cfg = store.getProviderConfig();
    cfg.active = spec.id;
    store.saveProviderConfig(cfg);
    return { active: cfg.active };
  },

  'POST /api/saglayici/test': async () => {
    const character = store.getCharacter();
    const { spec, config } = activeProvider();
    if (spec.id === 'manual') throw badRequest('Test icin once bir uretim saglayicisi sec.');

    const testScene = {
      shot: 'close-up portrait, head and shoulders',
      pose: 'soft smile, looking directly into the lens',
      lighting: 'soft natural window light',
      aspect: 'square',
    };
    const built = character
      ? promptcraft.build(character, testScene, config.dialect || spec.dialect)
      : { prompt: 'a simple test photograph of a red apple on a white table', negative: null, seed: 1234, width: 768, height: 768, params: {} };

    const result = await spec.generate({
      config,
      prompt: built.prompt,
      negative: built.negative,
      seed: built.seed,
      width: built.width,
      height: built.height,
      size: built.params.size || `${built.width}x${built.height}`,
      aspectRatio: '1:1',
      count: 1,
    });

    const images = (result.images || []).map((image) => {
      const file = store.saveImageBuffer(image.buffer, image.mime === 'image/jpeg' ? 'jpg' : 'png');
      const item = {
        id: file.id,
        filename: file.filename,
        url: file.url,
        createdAt: new Date().toISOString(),
        provider: spec.id,
        providerLabel: spec.label,
        prompt: built.prompt,
        seed: built.seed,
        scene: { category: 'test' },
        category: 'Baglanti testi',
        isGolden: false,
      };
      store.addGalleryItem(item);
      return item;
    });

    return { ok: true, provider: spec.label, images };
  },

  'POST /api/galeri/altin': async (body) => {
    const character = store.getCharacter();
    if (!character) throw notFound('Once karakter yarat.');
    const gallery = store.getGallery();
    const item = gallery.find((g) => g.id === body.id);
    if (!item) throw notFound('Gorsel bulunamadi.');

    for (const g of gallery) g.isGolden = g.id === item.id;
    store.saveGallery(gallery);

    character.reference = {
      filename: item.filename,
      publicUrl: (character.reference && character.reference.publicUrl) || '',
      setAt: new Date().toISOString(),
    };
    store.saveCharacter(character);
    return { character, golden: item };
  },

  'POST /api/sifirla': async (body) => {
    if (body.confirm !== 'SIFIRLA') {
      throw badRequest('Onay metni yanlis. Silmek icin kutuya SIFIRLA yaz.');
    }
    const result = store.resetAll({
      hard: !!body.hard,
      keepProviders: body.keepProviders !== false,
    });
    return {
      ok: true,
      ...result,
      message: body.hard
        ? 'Tum veri kalici olarak silindi. Sifirdan baslayabilirsin.'
        : `Tum veri arsive tasindi (${result.archive}). Sifirdan baslayabilirsin.`,
    };
  },
};

function isConfigured(spec, config) {
  if (spec.id === 'manual') return true;
  const required = (spec.fields || []).filter((f) => f.required);
  if (!required.length) return true;
  return required.every((f) => config && config[f.key] != null && String(config[f.key]).trim() !== '');
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

/* ------------------------------------------------------------------ sunucu */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);
  const key = `${req.method} ${pathname}`;

  // API
  if (pathname.startsWith('/api/')) {
    const handler = routes[key];
    if (!handler) return sendJson(res, 404, { error: 'Bilinmeyen uc nokta.' });
    try {
      const body = req.method === 'GET' ? {} : await readBody(req);
      const result = await handler(body, url);
      return sendJson(res, 200, result);
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.error(`[hata] ${key}:`, err);
      return sendJson(res, status, {
        error: err.message || 'Bilinmeyen hata.',
        code: err.code || null,
        errors: err.errors || null,
        ...(err.payload || {}),
      });
    }
  }

  // Uretilen gorseller
  if (pathname.startsWith('/gorseller/')) {
    const filename = path.basename(pathname);
    return serveFile(res, path.join(store.IMAGES_DIR, filename));
  }

  // Statik panel
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const full = path.join(PUBLIC_DIR, rel);
  if (!full.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Yasak');
  }
  return serveFile(res, full);
});

store.ensureDirs();

server.listen(PORT, '127.0.0.1', () => {
  const character = store.getCharacter();
  const { spec } = activeProvider();
  console.log('');
  console.log('  ================================================');
  console.log('   AI INFLUENCER OTOMASYON');
  console.log('  ================================================');
  console.log(`   Panel      : http://localhost:${PORT}`);
  console.log(`   Karakter   : ${character ? `${character.identity.name} (@${character.identity.handle}) - KILITLI` : 'yok - sihirbaz acilacak'}`);
  console.log(`   Uretici    : ${spec.label}`);
  if (spec.id === 'manual') {
    console.log('');
    console.log('   ! Bagli gorsel uretim API\'si yok.');
    console.log('     Bu otomasyon kendi basina gorsel URETMEZ, stok gorsel de kullanmaz.');
    console.log('     Panelde Ayarlar > Gorsel Uretim bolumunden kendi platformunu bagla.');
  }
  console.log('');
  console.log('   Kapatmak icin Ctrl+C');
  console.log('');
});
