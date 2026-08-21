'use strict';

/**
 * FOTOROMAN STUDYOSU
 *
 * BU STUDYO NEDEN VAR
 * ---------------------------------------------------------------
 * Bu aracin tek ayirt edici yetenegi AYNI INSANI onlarca karede ayni
 * tutmak. Etsy ve Reklam studyolari karakteri hic kullanmiyor; AI
 * Influencer tarafi ise tek kare + metin uretiyor, yani ortada bitmis
 * bir URUN yok. Fotoroman ikisini birlestiren format: karakteri
 * kullanan, sonunda elde tutulur bir seyi olan ilk cikti.
 *
 * IKI ASAMA - BIRINCISI BEDAVA
 * ---------------------------------------------------------------
 * 1. asama (anahtar GEREKMEZ): hikaye + kare dokumu + diyalog + sayfa
 *    duzeni. Cikti, cekim listesi ve balonlari yerlestirilmis taslak
 *    sayfalar. Anahtari olmayan biri de elle tutulur bir sey aliyor.
 * 2. asama (kredi harcar): kareleri bagli saglayicidan uretmek.
 *
 * YUZ KAYMASI UYARISI DURUSTCE VERILIYOR
 * ---------------------------------------------------------------
 * Fotoroman, yuz kaymasina EN AZ tahammul eden formattir: 12 karelik
 * bir hikayede her karede baska bir surat cikarsa urun bozuktur.
 * Saglayicilarin YARISI referans gorsel kabul etmiyor (bkz.
 * providers.referenceState) - Pollinations dahil, yani anahtarsiz
 * calisan tek secenek dahil. Bu durumda studyo SESSIZCE bozuk uretmez;
 * /secenekler uyariyi acikca dondurur ve panel uretimden ONCE gosterir.
 */

const store = require('../../store');
const output = require('../../output');
const raster = require('../../raster');
const providers = require('../../providers');
const promptcraft = require('../../promptcraft');
const hikaye = require('./hikaye');
const diyalog = require('./diyalog');
const sayfa = require('./sayfa');

/**
 * Kare goruntusu uretimi server.js'teki generateScene ile yapiliyor.
 * O fonksiyon activeProvider/referencePayload gibi bir suru server.js
 * icine gomulu seye bagli; calisan uretim yolunu tasiyip risk almak
 * yerine baglaniyor (bkz. studios/index.js: init).
 */
let uretici = null;

/* ------------------------------------------------------------ yardimci */

/** Galeriden bu hikayeye ait gorseli id ile bulur. */
function gorselYolu(imageId) {
  if (!imageId) return null;
  const kayit = store.getGallery().find((g) => g.id === imageId);
  return kayit ? kayit.url : null;
}

/**
 * Panel onizlemesi icin cozucu: /gorseller/... yolu doner.
 * Tarayici bu yolu kokten cozer.
 */
function panelCozucu(kareler) {
  const harita = {};
  for (const k of kareler) if (k.imageId) harita[k.panelNo] = gorselYolu(k.imageId);
  return (kare) => harita[kare.panelNo] || null;
}

/**
 * Raster icin cozucu: data URI doner.
 *
 * ZORUNLU, TERCIH DEGIL: raster.svgToPng SVG'yi gecici bir klasordeki
 * HTML dosyasina yazip file:/// ile aciyor. Oradan '/gorseller/x.png'
 * yolu COZULMEZ (kok, gecici klasorun surucusu olur) ve goruntu
 * sessizce bos cikar. Base64 gommek dosyayi buyutur ama tek guvenli yol.
 */
function rasterCozucu(kareler) {
  const fs = require('fs');
  const path = require('path');
  const harita = {};
  for (const k of kareler) {
    if (!k.imageId) continue;
    const kayit = store.getGallery().find((g) => g.id === k.imageId);
    if (!kayit) continue;
    try {
      const dosya = path.join(store.IMAGES_DIR, kayit.filename);
      const buf = fs.readFileSync(dosya);
      const uzanti = String(kayit.filename).toLowerCase();
      const tip = uzanti.endsWith('.png') ? 'image/png'
        : uzanti.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      harita[k.panelNo] = `data:${tip};base64,${buf.toString('base64')}`;
    } catch {
      // Gorsel diskten silinmisse kare yer tutucuyla cizilir - cokme yok.
    }
  }
  return (kare) => harita[kare.panelNo] || null;
}

/** Hikayeyi okunabilir bir cekim senaryosuna cevirir (bedava cikti). */
function senaryoMetni(character, h, dialect) {
  const satirlar = [];
  const ad = (character.identity && character.identity.name) || 'Karakter';

  satirlar.push(`FOTOROMAN - ${h.baslik}`);
  satirlar.push('='.repeat(60));
  satirlar.push(`Karakter : ${ad}`);
  satirlar.push(`Tur      : ${h.turLabel}`);
  satirlar.push(`Zaman    : ${h.zamanLabel}`);
  satirlar.push(`Kare     : ${h.kareler.length}`);
  satirlar.push('');
  satirlar.push('SUREKLILIK (butun karelerde ayni kalmali)');
  satirlar.push(`  Kiyafet : ${h.kiyafet || '(belirtilmedi)'}`);
  h.mekanlar.forEach((m, i) => satirlar.push(`  Mekan ${i + 1} : ${m}`));
  if (h.esya) satirlar.push(`  Esya    : ${h.esya}`);
  satirlar.push('');

  for (const k of h.kareler) {
    satirlar.push('-'.repeat(60));
    satirlar.push(`${k.panelNo}. KARE  -  ${k.perdeLabel}`);
    satirlar.push(`  Plan  : ${k.shotKey}  (${k.shot})`);
    satirlar.push(`  Poz   : ${k.pose}`);
    satirlar.push(`  Ortam : ${k.setting}`);
    satirlar.push(`  Isik  : ${k.lighting}`);
    if (k.props) satirlar.push(`  Esya  : ${k.props}`);
    if (k.balon) {
      satirlar.push(`  Balon : [${k.balon.tip}] ${k.balon.metin}`);
    } else {
      satirlar.push('  Balon : (sessiz kare)');
    }
    try {
      const p = promptcraft.build(character, k, dialect);
      satirlar.push('  PROMPT:');
      satirlar.push(`    ${p.prompt}`);
      if (p.negative) satirlar.push(`  NEGATIF: ${p.negative}`);
      satirlar.push(`  SEED  : ${p.seed}`);
    } catch {
      satirlar.push('  PROMPT: (uretilemedi)');
    }
    satirlar.push('');
  }

  satirlar.push('='.repeat(60));
  satirlar.push('Bu dosya Second Self fotoroman studyosu tarafindan uretildi.');
  satirlar.push('Promptlari kendi araciniza yapistirip kareleri elle de uretebilirsiniz.');
  return satirlar.join('\n');
}

/** Bir is icin klasor: ayni fotoromanin butun ciktilari TEK klasore. */
function isKlasoru(devam, baslik) {
  if (devam) {
    const mevcut = output.reuseJobFolder(devam);
    if (mevcut) return mevcut;
  }
  return output.createJobFolder({ studio: 'fotoroman', title: baslik });
}

/* ------------------------------------------------------------- studyo */

module.exports = {
  id: 'fotoroman',
  label: 'Fotoroman',
  icon: '📖',
  tagline: 'Karakterinle bes perdelik bir hikaye kur; balonlari ve sayfa duzeni bedava.',
  needsProvider: false, // 1. asama anahtarsiz calisir
  tabs: [
    { id: 'hikaye', label: 'Hikaye' },
    { id: 'sayfalar', label: 'Sayfalar' },
    { id: 'arsiv', label: 'Arsiv' },
  ],

  /** server.js kare uretimini buradan baglar. */
  init({ generateScene }) {
    uretici = generateScene;
  },

  routes: {
    'GET /secenekler': async () => {
      const character = store.getCharacter();
      const { spec, config } = providers.active(store.getProviderConfig());
      const ref = providers.referenceState(spec, config);

      return {
        ...hikaye.options(),
        ...sayfa.options(),
        balonTipleri: diyalog.tipler(),
        karakterVar: !!character,
        pngHazir: raster.available(),
        saglayici: { id: spec.id, label: spec.label },

        /* YUZ KAYMASI UYARISI - panel bunu uretimden ONCE gosteriyor.
         * Tek kare ureten bir arac icin bu bilgi "guzel olurdu"; fotoroman
         * icin urunun calisip calismadigini belirleyen sey. */
        referans: {
          durum: ref.state,
          mesaj: ref.state === 'ready'
            ? 'Referans gorsel gonderiliyor - yuz kareler arasinda sabit kalacak.'
            : ref.state === 'needs-config'
              ? `${ref.reason} ${ref.fix || ''}`.trim()
              : `${ref.reason} Fotoroman yuz kaymasina en az tahammul eden formattir: `
                + 'kareler arasinda yuz degisebilir. Hikaye, diyalog ve sayfa duzeni '
                + 'yine de tam calisir; kareleri baska bir araçta uretip buraya '
                + 'baglayabilir ya da referans destekleyen bir platforma gecebilirsin.',
        },
      };
    },

    /** 1. ASAMA: hikayeyi kur. Anahtar gerekmez, kredi harcamaz. */
    'POST /kur': async (body) => {
      const character = store.getCharacter();
      if (!character) {
        const e = new Error('Once bir karakter yarat - fotoroman o karakterin hikayesi.');
        e.status = 404;
        throw e;
      }
      const h = hikaye.kur(character, body.ayar || {});
      return { hikaye: diyalog.kur(character, h, body.ayar || {}) };
    },

    /** Sayfalari SVG olarak dondurur - panelde gosterilmek icin. */
    'POST /onizleme': async (body) => {
      const h = body.hikaye;
      if (!h || !Array.isArray(h.kareler)) {
        const e = new Error('Once hikayeyi kur.');
        e.status = 400;
        throw e;
      }
      const r = sayfa.sayfalar(h, {
        size: body.size, tema: body.tema, font: body.font,
        gorselCoz: panelCozucu(h.kareler),
      });
      return { ...r, sayfaSayisi: r.sayfalar.length };
    },

    /**
     * 2. ASAMA: TEK kareyi uretir.
     *
     * Neden tek tek: 12 karelik bir hikaye 12 API cagrisi demek, hepsini
     * tek istekte yapmak hem zaman asimina ugrar hem de 9. karede hata
     * alindiginda ilk 8'i cope atar. Panel kare kare ilerliyor,
     * ilerleme gorunuyor, hata olan kare tek basina tekrarlanabiliyor.
     */
    'POST /kare-uret': async (body) => {
      const character = store.getCharacter();
      if (!character) {
        const e = new Error('Once karakter yarat.'); e.status = 404; throw e;
      }
      if (!uretici) {
        const e = new Error('Uretim baglantisi kurulmamis.'); e.status = 500; throw e;
      }
      const kare = body.kare;
      if (!kare) {
        const e = new Error('Kare bilgisi eksik.'); e.status = 400; throw e;
      }

      const out = await uretici(character, kare, 1);
      const gorsel = (out.images || [])[0] || null;

      if (gorsel) {
        store.addGalleryItem({
          id: gorsel.id,
          filename: gorsel.filename,
          url: gorsel.url,
          createdAt: new Date().toISOString(),
          studio: 'fotoroman',
          category: `Fotoroman · ${kare.panelNo}. kare · ${kare.perdeLabel || ''}`.trim(),
          scene: kare,
          isGolden: false,
        });
      }

      return {
        panelNo: kare.panelNo,
        image: gorsel,
        prompt: out.built,
        reference: out.reference,
      };
    },

    /** Senaryoyu masaustune yazar. Tamamen bedava - goruntu gerektirmez. */
    'POST /senaryo': async (body) => {
      const character = store.getCharacter();
      if (!character) {
        const e = new Error('Once karakter yarat.'); e.status = 404; throw e;
      }
      const h = body.hikaye;
      if (!h) { const e = new Error('Once hikayeyi kur.'); e.status = 400; throw e; }

      const { spec, config } = providers.active(store.getProviderConfig());
      const metin = senaryoMetni(character, h, config.dialect || spec.dialect);

      let job = null;
      try {
        job = isKlasoru(body.exportTo, h.baslik || 'fotoroman');
        if (job) output.writeText(job, 'senaryo.txt', metin);
      } catch {
        // Masaustune yazilamadiysa metin yine de doner - is kaybolmaz.
      }
      return { metin, export: job };
    },

    /** Sayfalari PNG olarak uretir ve masaustune yazar. */
    'POST /uret': async (body) => {
      const h = body.hikaye;
      if (!h || !Array.isArray(h.kareler)) {
        const e = new Error('Once hikayeyi kur.'); e.status = 400; throw e;
      }

      const r = sayfa.sayfalar(h, {
        size: body.size, tema: body.tema, font: body.font,
        gorselCoz: rasterCozucu(h.kareler),
      });

      const buffers = [];
      try {
        for (const svg of r.sayfalar) {
          buffers.push(await raster.svgToPng(svg, r.w, r.h, { background: '#ffffff' }));
        }
      } catch (err) {
        // PNG uretilemezse SAYFALARI KAYBETME - SVG'leri geri ver.
        const e = new Error(`${err.message} (Sayfalar kaybolmadi, SVG olarak alabilirsin.)`);
        e.status = 503;
        e.payload = { sayfalar: r.sayfalar, w: r.w, h: r.h };
        throw e;
      }

      let job = null;
      const kayitlar = [];
      try {
        job = isKlasoru(body.exportTo, h.baslik || 'fotoroman');
      } catch { /* masaustu yazilamiyorsa galeri yine dolar */ }

      buffers.forEach((buf, i) => {
        const file = store.saveImageBuffer(buf, 'png');
        const item = {
          id: file.id,
          filename: file.filename,
          url: file.url,
          createdAt: new Date().toISOString(),
          studio: 'fotoroman',
          category: `Fotoroman · ${h.turLabel || ''} · ${i + 1}. sayfa`.trim(),
          hikaye: i === 0 ? h : undefined, // tam hikaye yalnizca ilk sayfada
          isGolden: false,
        };
        store.addGalleryItem(item);
        kayitlar.push({ id: file.id, url: file.url });
        if (job) {
          try {
            output.writeImage(job, buf, { index: i + 1, ext: 'png', label: `sayfa-${i + 1}` });
          } catch { /* tek sayfa yazilamadiysa digerleri devam etsin */ }
        }
      });

      // Senaryo da ayni klasore - sayfalar ve metin birlikte dursun.
      if (job) {
        try {
          const character = store.getCharacter();
          const { spec, config } = providers.active(store.getProviderConfig());
          if (character) {
            output.writeText(job, 'senaryo.txt',
              senaryoMetni(character, h, config.dialect || spec.dialect));
          }
        } catch { /* senaryo yazilamadiysa sayfalar yine yerinde */ }
      }

      return { sayfalar: kayitlar, w: r.w, h: r.h, export: job };
    },

    /** Albüm PDF - butun sayfalar tek dosyada. */
    'POST /pdf': async (body) => {
      const h = body.hikaye;
      if (!h || !Array.isArray(h.kareler)) {
        const e = new Error('Once hikayeyi kur.'); e.status = 400; throw e;
      }
      const r = sayfa.sayfalar(h, {
        size: body.size || 'album4', tema: body.tema, font: body.font,
        gorselCoz: rasterCozucu(h.kareler),
      });

      /* Sayfalari tek bir uzun belgeye diziyoruz: Chrome her sayfayi
       * ayri kagida basmasi icin page-break kullaniyor. */
      const govde = r.sayfalar.map((svg, i) => (
        `<div style="page-break-after:${i === r.sayfalar.length - 1 ? 'auto' : 'always'}">${svg}</div>`
      )).join('');

      const buffer = await raster.svgToPdf(govde, r.w, r.h);
      const file = store.saveImageBuffer(buffer, 'pdf');

      let job = null;
      try {
        job = isKlasoru(body.exportTo, h.baslik || 'fotoroman');
        if (job) output.writeImage(job, buffer, { index: 1, ext: 'pdf', label: 'album' });
      } catch { /* masaustu yazilamadi */ }

      return { url: file.url, export: job };
    },

    'GET /arsiv': async () => ({
      items: store.getGallery().filter((g) => g.studio === 'fotoroman').slice(0, 200),
    }),
  },
};
