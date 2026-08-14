'use strict';

/** Saglayicilarin ortak kullandigi HTTP / donusum yardimcilari. */

async function fetchJson(url, options = {}, timeoutMs = 180000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!res.ok) {
      const detail = typeof body === 'string' ? body.slice(0, 600) : JSON.stringify(body).slice(0, 600);
      throw new Error(`HTTP ${res.status} - ${detail}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBinary(url, options = {}, timeoutMs = 180000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} - ${text.slice(0, 600)}`);
    }
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } finally {
    clearTimeout(timer);
  }
}

async function downloadImage(url) {
  const buffer = await fetchBinary(url);
  const lower = url.split('?')[0].toLowerCase();
  const mime = lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'image/jpeg'
    : lower.endsWith('.webp') ? 'image/webp'
      : 'image/png';
  return { buffer, mime, sourceUrl: url };
}

function fromBase64(b64, mime = 'image/png') {
  const clean = String(b64).replace(/^data:[^;]+;base64,/, '');
  return { buffer: Buffer.from(clean, 'base64'), mime };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** "a.b[0].c" seklindeki yoldan deger okur. */
function dig(obj, path) {
  if (!path) return obj;
  return String(path)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

/** Sablondaki {{anahtar}} yerlerini doldurur. */
function fill(template, vars) {
  return String(template).replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    if (!(key in vars)) return match;
    const value = vars[key];
    return value == null ? '' : String(value);
  });
}

/** JSON gövde sablonu: string degerlerde {{}} doldurur, tip korunur. */
function fillDeep(node, vars) {
  if (typeof node === 'string') {
    // Tek basina {{seed}} gibi bir deger ise sayiyi sayi olarak birak
    const solo = node.match(/^\{\{\s*(\w+)\s*\}\}$/);
    if (solo && solo[1] in vars) return vars[solo[1]];
    return fill(node, vars);
  }
  if (Array.isArray(node)) return node.map((n) => fillDeep(n, vars));
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = fillDeep(v, vars);
    return out;
  }
  return node;
}

/**
 * JSON sablonunu once DOLDURUP sonra ayristirir.
 *
 * Neden gerekli: kullanicilar platform dokumanindan kopyalarken sayilari
 * tirnaksiz yazar -> {"seed": {{seed}}}. Bu, doldurmadan once gecerli JSON
 * DEGILDIR; once parse etmeye calisirsak patlar. Burada once metin olarak
 * doldurup (degerleri JSON'a gore kacislayarak) sonra ayristiriyoruz.
 *
 *   "{{prompt}}"  -> "tirnakli, kacislanmis metin"
 *   {{seed}}      -> 851317130   (sayi sayi kalir)
 *   "on {{aspect}} canvas" -> string icinde guvenli kacislama
 */
function fillJsonTemplate(template, vars, label = 'Sablon') {
  let text = String(template);

  // 1) Tam tirnakli yer tutucu: "{{key}}" -> degerin dogal JSON karsiligi
  text = text.replace(/"\{\{\s*(\w+)\s*\}\}"/g, (match, key) => {
    if (!(key in vars)) return match;
    return JSON.stringify(vars[key] == null ? '' : vars[key]);
  });

  // 2) Kalan yer tutucular: string ise tirnaksiz kacislanmis govde,
  //    sayi/boolean ise dogrudan deger.
  text = text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    if (!(key in vars)) return match;
    const value = vars[key];
    if (typeof value === 'string') return JSON.stringify(value).slice(1, -1);
    return JSON.stringify(value == null ? '' : value);
  });

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${label} gecerli JSON degil: ${err.message}. Doldurulmus hali: ${text.slice(0, 300)}`);
  }
}

module.exports = { fetchJson, fetchBinary, downloadImage, fromBase64, sleep, dig, fill, fillDeep, fillJsonTemplate };
