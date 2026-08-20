'use strict';

/**
 * ETSY PAZAR ARASTIRMASI
 *
 * "En cok satani bul, ona yakinini yap" isteginin DURUST karsiligi.
 *
 * ---------------------------------------------------------------------------
 * NEDEN KAZIYICI (SCRAPER) DEGIL
 *
 * Etsy sayfalarini arka planda gezip kazimak uc yerden vurur:
 *   1. Etsy'nin bot korumasi var; ev IP'sinden duzenli tarama kisa surede
 *      engellenir ve ayni IP'den giren MAGAZA da riske girer,
 *   2. Kullanim sartlarina aykiri - bu depo PUBLIC, herkes calistiriyor,
 *   3. Ve gerek yok: Etsy'nin KENDI API'si arama + filtre + siralama veriyor.
 *
 * Bu yuzden burasi resmi API'yi kullanir. Anahtar KULLANICININ - tipki gorsel
 * uretim saglayicilarindaki gibi. Otomasyonun kendi anahtari yoktur.
 * ---------------------------------------------------------------------------
 *
 * NE YAPAR: bir nis icin canli listeleri ceker ve DESEN cikarir -
 * hangi etiketler tekrar ediyor, fiyatlar nerede kumelenmis, basliklar nasil
 * kurulmus, kac kelime. Yani "ne satiyor"u KALIP olarak ogrenir.
 *
 * NE YAPMAZ: kimsenin tasarimini, gorselini veya ozgun sozunu kopyalamaz.
 * Cikti bir DESEN RAPORUDUR; tasarim her zaman burada sifirdan kurulur.
 */

const fs = require('fs');
const path = require('path');
const store = require('../../store');

const CONFIG_FILE = path.join(store.DATA_DIR, 'etsy-api.json');
const BASE = 'https://openapi.etsy.com/v3/application';

/* ------------------------------------------------------------ yapilandirma */

function getConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { apiKey: '', hazir: false };
    const c = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return { apiKey: c.apiKey || '', hazir: !!c.apiKey };
  } catch {
    return { apiKey: '', hazir: false };
  }
}

function saveConfig({ apiKey } = {}) {
  store.ensureDirs();
  const mevcut = getConfig();
  // Panel maskelenmis deger geri gonderirse eskiyi koru.
  const anahtar = (apiKey && !String(apiKey).includes('•')) ? String(apiKey).trim() : mevcut.apiKey;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey: anahtar }, null, 2), 'utf8');
  return getConfig();
}

function maskedKey() {
  const { apiKey } = getConfig();
  if (!apiKey) return '';
  return `${'•'.repeat(Math.max(0, Math.min(20, apiKey.length - 4)))}${apiKey.slice(-4)}`;
}

/* ---------------------------------------------------------------- cagri */

async function call(yol, params = {}) {
  const { apiKey } = getConfig();
  if (!apiKey) {
    const err = new Error(
      'Etsy API anahtari girilmemis. Ayarlar > Etsy pazar arastirmasi bolumunden ekle. ' +
      'Anahtar ucretsiz: etsy.com/developers/register'
    );
    err.status = 428;
    throw err;
  }

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let res;
  try {
    res = await fetch(`${BASE}${yol}?${qs.toString()}`, {
      headers: { 'x-api-key': apiKey, accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(`Etsy'ye baglanilamadi: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  const metin = await res.text();
  let govde = null;
  try { govde = metin ? JSON.parse(metin) : null; } catch { govde = metin; }

  if (res.status === 401 || res.status === 403) {
    const err = new Error(
      `Etsy anahtari kabul edilmedi (HTTP ${res.status}). Iki ihtimal: anahtar yanlis, ` +
      'ya da bu uc nokta uygulamanin OAuth onayini istiyor. Etsy gelistirici panelinde ' +
      'uygulamanin durumunu kontrol et. Yanit: ' +
      (typeof govde === 'string' ? govde.slice(0, 200) : JSON.stringify(govde).slice(0, 200))
    );
    err.status = res.status;
    throw err;
  }
  if (res.status === 429) {
    const err = new Error('Etsy hiz sinirina takildi. Biraz bekleyip tekrar dene.');
    err.status = 429;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Etsy hatasi HTTP ${res.status}: ${(typeof govde === 'string' ? govde : JSON.stringify(govde)).slice(0, 240)}`);
  }
  return govde;
}

/* ---------------------------------------------------------------- arama */

const SORT = {
  score: 'Etsy ilgililik puani (varsayilan)',
  created: 'Yeni eklenenler',
  price: 'Fiyat',
  updated: 'Guncellenenler',
};

/**
 * Bir nis icin canli listeleri ceker.
 * Etsy tek istekte en fazla 100 kayit veriyor; `sayfa` ile derinlesir.
 */
async function search({ keywords, limit = 100, sayfa = 1, sortOn = 'score', sortOrder = 'desc', minPrice, maxPrice, taxonomyId } = {}) {
  const adet = Math.min(Math.max(Number(limit) || 100, 1), 100);
  const offset = (Math.max(Number(sayfa) || 1, 1) - 1) * adet;

  const yanit = await call('/listings/active', {
    keywords,
    limit: adet,
    offset,
    sort_on: sortOn,
    sort_order: sortOrder,
    min_price: minPrice,
    max_price: maxPrice,
    taxonomy_id: taxonomyId,
  });

  const kayitlar = (yanit && yanit.results) || [];
  return {
    toplam: (yanit && yanit.count) || kayitlar.length,
    sayfa: Math.max(Number(sayfa) || 1, 1),
    kayitlar,
  };
}

/* --------------------------------------------------------------- analiz */

const DURDURMA = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'this', 'that', 'from', 'are',
  'shirt', 'tshirt', 't', 'tee', 'gift', 'gifts', 'custom', 'personalized',
  'unisex', 'women', 'men', 'womens', 'mens', 'ladies', 'top', 'tops',
]);

function kelimeler(metin) {
  return String(metin || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((k) => k.length > 2 && !DURDURMA.has(k));
}

function say(liste) {
  const m = new Map();
  for (const x of liste) m.set(x, (m.get(x) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * DESEN CIKARIMI
 *
 * Ham listeler tek basina ise yaramaz. Degerli olan sey TEKRAR EDEN sey:
 * hangi etiket kac listede geciyor, fiyat nerede kumelenmis, basliklar kac
 * kelime. Bunlar "bu niste ne calisiyor" sorusunun cevabidir ve hicbiri
 * kimsenin mulkiyeti degildir.
 */
function analyze(kayitlar = []) {
  const n = kayitlar.length;
  if (!n) return { adet: 0 };

  const tumEtiketler = [];
  const baslikKelimeleri = [];
  const fiyatlar = [];
  const baslikUzunluklari = [];
  const favoriler = [];

  for (const k of kayitlar) {
    for (const e of (k.tags || [])) tumEtiketler.push(String(e).toLowerCase().trim());
    baslikKelimeleri.push(...kelimeler(k.title));
    baslikUzunluklari.push(String(k.title || '').length);
    if (typeof k.num_favorers === 'number') favoriler.push(k.num_favorers);

    const p = k.price && (k.price.amount != null && k.price.divisor
      ? k.price.amount / k.price.divisor
      : Number(k.price));
    if (Number.isFinite(p) && p > 0) fiyatlar.push(p);
  }

  const ortanca = (a) => {
    if (!a.length) return null;
    const s = [...a].sort((x, y) => x - y);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const etiketSayim = say(tumEtiketler);

  return {
    adet: n,
    // En cok tekrar eden etiketler: bu nisin gercek arama dili.
    etiketler: etiketSayim.slice(0, 30).map(([etiket, kac]) => ({
      etiket,
      kac,
      oran: Math.round((kac / n) * 100),
      // Etsy'de tek kelime zayif - isaretleyelim
      tekKelime: !etiket.includes(' '),
      uzun: etiket.length > 20,
    })),
    // Basliklarda tekrar eden kelimeler (etiket olmayan ama satan dil)
    baslikKelimeleri: say(baslikKelimeleri).slice(0, 25).map(([kelime, kac]) => ({ kelime, kac })),
    fiyat: fiyatlar.length ? {
      enDusuk: Math.min(...fiyatlar),
      enYuksek: Math.max(...fiyatlar),
      ortanca: Math.round(ortanca(fiyatlar) * 100) / 100,
      adet: fiyatlar.length,
    } : null,
    baslik: {
      ortancaUzunluk: ortanca(baslikUzunluklari),
      enUzun: Math.max(...baslikUzunluklari),
    },
    favori: favoriler.length ? {
      ortanca: ortanca(favoriler),
      enYuksek: Math.max(...favoriler),
      adet: favoriler.length,
    } : null,
    // Kullaniciya net ogut
    ogutler: ogutCikar(etiketSayim, n, fiyatlar),
  };
}

function ogutCikar(etiketSayim, n, fiyatlar) {
  const out = [];
  const cokKelimeli = etiketSayim.filter(([e]) => e.includes(' '));
  if (cokKelimeli.length) {
    out.push(`Bu niste en cok tekrar eden cok kelimeli etiket: "${cokKelimeli[0][0]}" (${cokKelimeli[0][1]}/${n} listede). Uzun kuyruklu etiketler tek kelimeliden daha degerli.`);
  }
  const tekKelimeOran = Math.round((etiketSayim.filter(([e]) => !e.includes(' ')).length / Math.max(etiketSayim.length, 1)) * 100);
  if (tekKelimeOran > 40) {
    out.push(`Rakiplerin etiketlerinin %${tekKelimeOran}'i tek kelime - bu bir firsat: sen cok kelimeli terimlere yuklenirsen daha az rekabetle gorunursun.`);
  }
  if (fiyatlar.length >= 5) {
    const s = [...fiyatlar].sort((a, b) => a - b);
    const alt = s[Math.floor(s.length * 0.25)];
    const ust = s[Math.floor(s.length * 0.75)];
    out.push(`Fiyatlarin yarisi ${alt.toFixed(2)} - ${ust.toFixed(2)} arasinda. Bu bandin cok disina cikmak donusumu dusurur.`);
  }
  out.push('Bu rapor DESEN gosterir, tasarim gostermez. Rakibin gorselini, cizimini veya ozgun sozunu kopyalama - hem Etsy kapatir hem gerek yok.');
  return out;
}

/** Arama + analiz tek adimda. */
async function research(opts = {}) {
  const { kayitlar, toplam, sayfa } = await search(opts);
  return {
    sorgu: opts.keywords || '',
    toplam,
    sayfa,
    analiz: analyze(kayitlar),
    // Ham kayitlarin YALNIZCA desen icin gerekli alanlari tutulur -
    // baskasinin gorselini/aciklamasini saklamiyoruz.
    ornekler: kayitlar.slice(0, 12).map((k) => ({
      baslik: k.title,
      baslikUzunluk: String(k.title || '').length,
      etiketAdedi: (k.tags || []).length,
      favori: k.num_favorers,
    })),
  };
}

module.exports = { getConfig, saveConfig, maskedKey, search, analyze, research, SORT };
