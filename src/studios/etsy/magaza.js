'use strict';

/**
 * ETSY MAGAZA BAGLANTISI - TASLAK LISTELEME
 *
 * Ne yapar: tasarimi, listeleme metnini ve listeleme gorselini Etsy magazana
 * TASLAK olarak gonderir. Sen Etsy'de acip bakar, begenirsen yayina alirsin.
 *
 * ---------------------------------------------------------------------------
 * DEGISMEZ KURAL: YAYINA BASMAZ
 *
 * Bu modul listeyi YALNIZCA taslak (draft) olarak olusturur. Hicbir kod yolu
 * bir listeyi "active" yapmaz, yayina almaz, fiyat degistirmez, silmez.
 *
 * Neden: burasi senin gercek magazan ve gercek paran. Yayina alma islemi
 * Etsy'de listeleme ucreti dogurur ve alicilarin gordugu seyi degistirir.
 * Bir yazilim hatasi yuzunden magazana cop listeleme dusmesini ya da yanlis
 * fiyatla urun yayina girmesini goze alamayiz. Son karar HER ZAMAN senin ve
 * Etsy'nin kendi ekraninda veriliyor.
 *
 * NOT: taslak listelemenin ucret dogurup dogurmadigi Etsy'nin gelistirici
 * dokumanlarinda YAZMIYOR - dogrulayamadim. Yayina almadan once kendi
 * magaza panelinden kontrol et.
 * ---------------------------------------------------------------------------
 *
 * YETKILENDIRME - neden elle kod yapistiriyorsun
 *
 * Etsy OAuth yonlendirmesi `https://` olmak ZORUNDA ve uygulamaya kayitli
 * adresle birebir eslesmeli; `http://localhost` KABUL EDILMIYOR. Bu panel
 * yerelde calistigi icin Etsy bize geri donemez. Cozum: Etsy seni kendi
 * kaydettigin https adresine gonderir, sen adres cubugundaki `code=...`
 * degerini kopyalayip buraya yapistirirsin. Bir kez yapilir - tazeleme
 * anahtari 90 gun gecerli, sonrasi otomatik.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('../../store');

const CONFIG_FILE = path.join(store.DATA_DIR, 'etsy-magaza.json');
const API = 'https://openapi.etsy.com/v3/application';
const AUTH_URL = 'https://www.etsy.com/oauth/connect';
const TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';

/** Gereken kapsamlar. Silme kapsami (listings_d) BILEREK ISTENMIYOR. */
const SCOPES = ['shops_r', 'listings_r', 'listings_w'];

/* ------------------------------------------------------------ yapilandirma */

function oku() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function yaz(veri) {
  store.ensureDirs();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(veri, null, 2), 'utf8');
  return veri;
}

function maskele(s) {
  const t = String(s || '');
  if (!t) return '';
  return `${'•'.repeat(Math.max(0, Math.min(20, t.length - 4)))}${t.slice(-4)}`;
}

function getConfig() {
  const c = oku();
  return {
    apiKey: c.apiKey || '',
    apiKeyMask: maskele(c.apiKey),
    redirectUri: c.redirectUri || '',
    bagli: !!(c.refreshToken && c.shopId),
    shopId: c.shopId || null,
    shopName: c.shopName || null,
    baglandi: c.baglandi || null,
    // Yetkilendirme yarim kaldiysa panel bunu bilmeli
    bekleyen: !!c.pkce,
  };
}

function saveConfig({ apiKey, redirectUri } = {}) {
  const c = oku();
  if (apiKey && !String(apiKey).includes('•')) c.apiKey = String(apiKey).trim();
  if (redirectUri) c.redirectUri = String(redirectUri).trim();
  yaz(c);
  return getConfig();
}

/* ------------------------------------------------------------------ OAuth */

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Yetkilendirme adresini kurar ve PKCE dogrulayicisini saklar.
 * code_challenge_method S256 OLMAK ZORUNDA (Etsy baska deger kabul etmiyor).
 */
function buildAuthUrl() {
  const c = oku();
  if (!c.apiKey) {
    const e = new Error('Once Etsy API anahtarini (Keystring) gir.');
    e.status = 428;
    throw e;
  }
  if (!c.redirectUri) {
    const e = new Error('Once yonlendirme adresini gir. Etsy https:// istiyor, http://localhost kabul etmiyor.');
    e.status = 428;
    throw e;
  }
  if (!/^https:\/\//i.test(c.redirectUri)) {
    const e = new Error('Yonlendirme adresi https:// ile baslamali - Etsy http adresleri kabul etmiyor.');
    e.status = 400;
    throw e;
  }

  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  const state = base64url(crypto.randomBytes(16));

  c.pkce = { verifier, state, at: new Date().toISOString() };
  yaz(c);

  const qs = new URLSearchParams({
    response_type: 'code',
    client_id: c.apiKey,
    redirect_uri: c.redirectUri,
    scope: SCOPES.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return { url: `${AUTH_URL}?${qs.toString()}`, scopes: SCOPES };
}

async function istek(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    throw new Error(`Etsy'ye baglanilamadi: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
  const metin = await res.text();
  let govde = null;
  try { govde = metin ? JSON.parse(metin) : null; } catch { govde = metin; }
  if (!res.ok) {
    const detay = typeof govde === 'string' ? govde.slice(0, 300) : JSON.stringify(govde).slice(0, 300);
    const e = new Error(`Etsy HTTP ${res.status}: ${detay}`);
    e.status = res.status;
    throw e;
  }
  return govde;
}

/** Adres cubugundan kopyalanan kodu jetona cevirir. */
async function exchangeCode(kod, state) {
  const c = oku();
  if (!c.pkce) throw new Error('Bekleyen bir yetkilendirme yok. Once "Etsy ile baglan" de.');
  if (state && c.pkce.state && state !== c.pkce.state) {
    throw new Error('state degeri eslesmiyor - yetkilendirme guvenli degil, bastan basla.');
  }

  const temiz = String(kod || '').trim();
  if (!temiz) throw new Error('Kod bos.');

  const govde = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: c.apiKey,
    redirect_uri: c.redirectUri,
    code: temiz,
    code_verifier: c.pkce.verifier,
  });

  const jeton = await istek(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: govde.toString(),
  });

  c.accessToken = jeton.access_token;
  c.refreshToken = jeton.refresh_token;
  c.expiresAt = Date.now() + (Number(jeton.expires_in || 3600) - 60) * 1000;
  delete c.pkce;
  yaz(c);

  // Magaza kimligini hemen ogren - listeleme icin sart.
  await magazaTani();
  return getConfig();
}

/** Erisim jetonu 1 saat yasiyor; suresi dolduysa tazele. */
async function jeton() {
  const c = oku();
  if (!c.refreshToken) {
    const e = new Error('Etsy magazasi bagli degil.');
    e.status = 428;
    throw e;
  }
  if (c.accessToken && c.expiresAt && Date.now() < c.expiresAt) return c.accessToken;

  const govde = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: c.apiKey,
    refresh_token: c.refreshToken,
  });
  const yeni = await istek(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: govde.toString(),
  });
  c.accessToken = yeni.access_token;
  if (yeni.refresh_token) c.refreshToken = yeni.refresh_token;
  c.expiresAt = Date.now() + (Number(yeni.expires_in || 3600) - 60) * 1000;
  yaz(c);
  return c.accessToken;
}

async function cagir(yol, options = {}) {
  const c = oku();
  const t = await jeton();
  return istek(`${API}${yol}`, {
    ...options,
    headers: {
      'x-api-key': c.apiKey,
      authorization: `Bearer ${t}`,
      ...(options.headers || {}),
    },
  });
}

/** Kullanicinin magazasini bulur ve kaydeder. */
async function magazaTani() {
  const c = oku();
  const ben = await cagir('/users/me');
  const shopId = ben && (ben.shop_id || ben.shopId);
  if (!shopId) {
    throw new Error('Bu hesaba bagli bir Etsy magazasi bulunamadi. Satici hesabin var mi?');
  }
  const magaza = await cagir(`/shops/${shopId}`);
  c.shopId = shopId;
  c.shopName = magaza && (magaza.shop_name || magaza.shopName);
  c.baglandi = new Date().toISOString();
  yaz(c);
  return { shopId: c.shopId, shopName: c.shopName };
}

function kopar() {
  const c = oku();
  yaz({ apiKey: c.apiKey, redirectUri: c.redirectUri });
  return getConfig();
}

/* ------------------------------------------------------- magaza bilgileri */

/** Fiziksel urun icin kargo profili SART. */
async function kargoProfilleri() {
  const c = oku();
  const r = await cagir(`/shops/${c.shopId}/shipping-profiles`);
  return (r && r.results ? r.results : []).map((p) => ({
    id: p.shipping_profile_id,
    ad: p.title,
    ulke: p.origin_country_iso,
  }));
}

/** taxonomy_id zorunlu - kategori agacinin ust dugumleri. */
async function kategoriler(arama = '') {
  const r = await istek(`${API}/seller-taxonomy/nodes`, {
    headers: { 'x-api-key': oku().apiKey },
  });
  const hepsi = [];
  const gez = (dugumler, yol) => {
    for (const d of dugumler || []) {
      const ad = yol ? `${yol} > ${d.name}` : d.name;
      hepsi.push({ id: d.id, ad });
      if (d.children) gez(d.children, ad);
    }
  };
  gez(r && r.results, '');
  const q = String(arama || '').toLowerCase().trim();
  const suzulmus = q ? hepsi.filter((x) => x.ad.toLowerCase().includes(q)) : hepsi;
  return suzulmus.slice(0, 200);
}

/* --------------------------------------------------------- taslak listeme */

/**
 * TASLAK listeleme olusturur. YAYINA ALMAZ.
 *
 * @param {object} p
 *   baslik, aciklama, etiketler[], fiyat, taxonomyId, kargoProfilId,
 *   adet, gorseller[] (Buffer), whoMade, whenMade
 */
async function taslakOlustur(p = {}) {
  const c = oku();
  if (!c.shopId) {
    const e = new Error('Magaza bagli degil.');
    e.status = 428;
    throw e;
  }

  const eksik = [];
  if (!p.baslik) eksik.push('baslik');
  if (!p.aciklama) eksik.push('aciklama');
  if (!(Number(p.fiyat) > 0)) eksik.push('fiyat');
  if (!p.taxonomyId) eksik.push('kategori (taxonomy_id)');
  if (eksik.length) {
    const e = new Error(`Etsy su alanlari zorunlu tutuyor: ${eksik.join(', ')}.`);
    e.status = 400;
    throw e;
  }

  const govde = new URLSearchParams();
  govde.set('quantity', String(Math.max(1, Number(p.adet) || 1)));
  govde.set('title', String(p.baslik).slice(0, 140));
  govde.set('description', String(p.aciklama));
  govde.set('price', String(Number(p.fiyat)));
  govde.set('who_made', p.whoMade || 'i_did');
  govde.set('when_made', p.whenMade || 'made_to_order');
  govde.set('taxonomy_id', String(p.taxonomyId));
  // BURASI BILEREK YOK: state / is_active. Taslak olarak kalir.
  if (p.kargoProfilId) govde.set('shipping_profile_id', String(p.kargoProfilId));
  if (p.readinessStateId) govde.set('readiness_state_id', String(p.readinessStateId));
  for (const e of (p.etiketler || []).slice(0, 13)) govde.append('tags', e);

  const liste = await cagir(`/shops/${c.shopId}/listings`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: govde.toString(),
  });

  const listingId = liste && (liste.listing_id || liste.listingId);
  const yuklenen = [];
  const gorselHatalari = [];

  for (const [i, gorsel] of (p.gorseller || []).slice(0, 10).entries()) {
    try {
      const form = new FormData();
      form.append('image', new Blob([gorsel.buffer], { type: 'image/png' }), gorsel.ad || `${i + 1}.png`);
      form.append('rank', String(i + 1));
      const t = await jeton();
      const r = await istek(`${API}/shops/${c.shopId}/listings/${listingId}/images`, {
        method: 'POST',
        headers: { 'x-api-key': c.apiKey, authorization: `Bearer ${t}` },
        body: form,
      }, 60000);
      yuklenen.push(r && (r.listing_image_id || r.listingImageId));
    } catch (err) {
      gorselHatalari.push(err.message);
    }
  }

  return {
    listingId,
    durum: liste && (liste.state || 'draft'),
    gorselSayisi: yuklenen.length,
    gorselHatalari,
    // Kullanici Etsy'de acip bakabilsin
    url: `https://www.etsy.com/your/shops/me/tools/listings/${listingId}`,
  };
}

module.exports = {
  getConfig, saveConfig, buildAuthUrl, exchangeCode, magazaTani, kopar,
  kargoProfilleri, kategoriler, taslakOlustur, SCOPES,
};
