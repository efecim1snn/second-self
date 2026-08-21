'use strict';

/**
 * ETSY POD STUDYOSU
 *
 * Ayni mekanik, farkli islev: karakter yerine baskiya hazir tasarim uretir.
 *
 * KURAL (karakter studyosundakiyle ayni ruh): baskasinin tasarimini kopyalamaz.
 * Arastirmadan gelen sey KATEGORI ve ANAHTAR KELIMEDIR; tasarim burada
 * sifirdan kurulur. "Kedili komik tisort satiyor" bilgisi kullanilir,
 * o kisinin cizimi kullanilmaz.
 *
 * Tipografi tasarimlari tamamen YEREL ve BEDAVA uretilir (vektor -> seffaf
 * PNG). Illustrasyon isteyen tasarimlar icin, her zamanki gibi kullanicinin
 * bagladigi gorsel uretim API'si devreye girer.
 */

const store = require('../../store');
const output = require('../../output');
const design = require('./design');
const listing = require('./listing');
const niches = require('./niches');
const mockup = require('./mockup');
const magaza = require('./magaza');
const pazar = require('./pazar');
const render = require('../../raster');

/**
 * BASKI OLCUSU -> MOCKUP URUNU
 * Ilk surumde mockup urunu ile baski olcusu birbirinden bagimsizdi:
 * "kupa" listeleme gorseli dikey tisort baskisini gosterebiliyordu.
 */
const MOCKUP_ESLEME = {
  tisort: 'tisort',
  gogus: 'tisort',
  hoodieArka: 'tisort',
  kare: 'canta',
  kupa: 'kupa',
  poster: 'poster',
  posterBuyuk: 'poster',
  sticker: 'poster',
  telefon: 'poster',
};

/**
 * BIR IS = BIR KLASOR
 *
 * Her rota kendi createJobFolder'ini cagiriyordu: tek bir tisortu Etsy'ye
 * koymak masaustunde UC ayri klasor acabiliyordu (tasarim / listeleme
 * gorseli / PDF) ve hangi metnin hangi gorsele ait oldugu klasor adindan
 * anlasilmiyordu. Panel artik son is klasorunun adini gonderiyor; varsa
 * ona yaziliyor, yoksa yenisi aciliyor.
 */
function isKlasoru(devam, studio, baslik) {
  if (devam) {
    const mevcut = output.reuseJobFolder(devam);
    if (mevcut) return mevcut;
  }
  return output.createJobFolder({ studio, title: baslik });
}

/** Etsy listeleme metnini dosyaya yazilacak bicime cevirir. */
function listelemeMetni(l, size) {
  if (!l) return '';
  return [
    'ETSY LISTELEME METNI',
    '====================', '',
    size ? `URUN: ${size.label} (${size.w}x${size.h} @300DPI, seffaf PNG)` : '',
    size ? '' : null,
    `BASLIK (${(l.title || '').length}/140)`,
    '-------',
    l.title || '', '',
    `ETIKETLER (${(l.tags || []).length}/13)`,
    '----------',
    (l.tags || []).join(', '), '',
    'ACIKLAMA',
    '--------',
    l.description || '',
    ...(l.warnings && l.warnings.length ? ['', 'UYARILAR', '--------', ...l.warnings.map((w) => `- ${w}`)] : []),
  ].filter((x) => x !== null).join('\n');
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

module.exports = {
  id: 'etsy',
  label: 'Etsy POD',
  icon: '🎨',
  tagline: 'Baskiya hazir tasarim + Etsy listeleme metni. Tipografi tarafi tamamen bedava.',
  needsProvider: false,
  tabs: [
    { id: 'tasarim', label: 'Tasarim' },
    { id: 'listeleme', label: 'Listeleme metni' },
    { id: 'pazar', label: 'Pazar arastirmasi' },
    { id: 'magaza', label: 'Magaza' },
    { id: 'arsiv', label: 'Arsiv' },
  ],

  routes: {
    'GET /secenekler': async () => ({
      ...design.options(),
      pngHazir: render.available(),
      pngNotu: render.available()
        ? 'PNG uretimi hazir (sistemdeki tarayici kullaniliyor, ek kurulum yok).'
        : 'Sistemde Chrome/Edge bulunamadi. SVG indirip kendi aracinda PNG\'ye cevirebilirsin.',
    }),

    /**
     * VARYANT SERIDI - ayni sozu bes farkli gorunumde gosterir.
     *
     * Bedava ve aninda: onizleme yolu tarayici CALISTIRMAZ, yalnizca metin
     * kurar. Satici 20 kombinasyon denemek yerine bir bakista seciyor.
     */
    'POST /varyantlar': async (body) => {
      const temel = body.design || {};
      const gorunumler = [
        { layout: 'yigin', palette: temel.palette || 'siyah', font: 'kalin', etiket: 'Yigin · kalin' },
        { layout: 'serit', palette: 'retro', font: 'kalin', etiket: 'Serit · retro' },
        { layout: 'kemer', palette: temel.palette || 'siyah', font: 'serif', etiket: 'Kemer · serif' },
        { layout: 'minimal', palette: 'toprak', font: 'serif', etiket: 'Minimal · toprak' },
        { layout: 'cerceve', palette: 'okyanus', font: 'daktilo', etiket: 'Cerceve · daktilo' },
      ];
      return {
        varyantlar: gorunumler.map((g) => {
          const d = { ...temel, layout: g.layout, palette: g.palette, font: g.font };
          return { etiket: g.etiket, design: d, svg: design.toSvg(d) };
        }),
      };
    },

    // Onizleme: SVG dondurur, hizli ve bedava.
    'POST /onizleme': async (body) => {
      const svg = design.toSvg(body.design || {});
      return { svg, size: design.SIZES[(body.design || {}).size] || design.SIZES.tisort };
    },

    // Baskiya hazir seffaf PNG.
    'POST /uret': async (body) => {
      const d = body.design || {};
      const size = design.SIZES[d.size] || design.SIZES.tisort;
      const svg = design.toSvg(d);

      let buffer;
      try {
        buffer = await render.svgToPng(svg, size.w, size.h);
      } catch (err) {
        // PNG uretilemezse tasarimi KAYBETME - SVG'yi geri ver.
        const e = new Error(`${err.message} (Tasarim kaybolmadi, SVG olarak indirebilirsin.)`);
        e.status = 503;
        e.payload = { svg, size };
        throw e;
      }

      const file = store.saveImageBuffer(buffer, 'png');
      const listeleme = body.listing ? listing.build(body.listing) : null;
      const item = {
        id: file.id,
        filename: file.filename,
        url: file.url,
        createdAt: new Date().toISOString(),
        studio: 'etsy',
        category: `POD · ${size.label} · ${size.w}x${size.h}`,
        design: d,
        listing: listeleme,
        isGolden: false,
      };
      store.addGalleryItem(item);

      // Masaustunde bu tasarima ait kendi klasoru.
      let job = null;
      try {
        // Tasarim metni `lines` dizisinde geliyor (STUDIO_FORMS.etsy.fields).
        const ilkSatir = Array.isArray(d.lines) ? d.lines.find(Boolean) : d.lines;
        job = isKlasoru(body.exportTo, 'etsy', ilkSatir || 'tasarim');
        if (job) {
          output.writeImage(job, buffer, { index: 1, ext: 'png', label: size.label });
          output.writeText(job, 'bilgi.txt', [
            'SECOND SELF - is ozeti',
            '======================', '',
            `Tarih  : ${new Date().toLocaleString('tr-TR')}`,
            'Studyo : Etsy POD',
            `Olcu   : ${size.w}x${size.h} @300DPI (${size.label})`,
            'Zemin  : seffaf PNG',
          ].join('\n'));
          // LISTELEME METNI HER ZAMAN YAZILIR.
          // Eskiden yalnizca kullanici once "Listeleme metni" sekmesine ugrayip
          // doldurduysa yaziliyordu. Dogal sirayla (once tasarim, sonra
          // listeleme) calisan satici klasorunde metni hic bulamiyordu -
          // urunun asil satis degeri sessizce kayboluyordu.
          const yazilacak = listeleme || listing.build({
            phrase: (d.lines || []).filter(Boolean).join(' '),
            size: d.size,
          });
          output.writeText(job, 'etsy-listeleme.txt', listelemeMetni(yazilacak, size));
        }
      } catch (err) {
        console.error('[cikti] Etsy klasoru yazilamadi:', err.message);
      }

      return { image: item, size, dpi: 300, transparent: true, export: job ? { name: job.name, path: job.path } : null };
    },

    /* ------------------------------------------------- nis kutuphanesi */

    /**
     * ANAHTAR GEREKTIRMEZ. Nis kutuphanesi ve soz kaliplari araca gomulu -
     * kullanicinin hicbir sey baglamasina gerek yok.
     */
    'GET /nisler': async () => ({
      nisler: niches.list(),
      not: 'Bu liste araca gomulu; anahtar gerektirmez. Canli pazar verisi icin "Pazar arastirmasi" sekmesine bak.',
    }),

    'POST /nis/oneriler': async (body) => {
      const nis = body.nis || '';
      if (!nis) throw badRequest('Once bir nis sec veya yaz.');
      return {
        nis: niches.resolve(nis),
        etiketler: niches.expandTags(nis, body.urunKelimeleri, body.hedef, body.ekstra),
        sozler: niches.suggestPhrases(nis, body.rol, body.yil),
      };
    },

    /* ----------------------------------------------- canli pazar (opsiyonel) */

    /**
     * Anahtar KULLANICININ. Otomasyonun kendi Etsy anahtari yoktur ve
     * olmayacak: public bir depoda paylasilan anahtar ilk gunde calinir ve
     * Etsy tarafindan kapatilir. Herkes kendi anahtarini baglar - gorsel
     * uretim saglayicilarindaki duzenin aynisi.
     */
    'GET /pazar/durum': async () => {
      const cfg = pazar.getConfig();
      return {
        hazir: cfg.hazir,
        anahtar: pazar.maskedKey(),
        siralama: pazar.SORT,
        kurulum: {
          baslik: 'Etsy API anahtarini kendin aliyorsun - ucretsiz',
          neden: 'Bu otomasyonun kendi Etsy anahtari YOKTUR. Public bir depoda paylasilan anahtar herkesin eline gecer ve Etsy tarafindan kapatilir. Bu yuzden herkes kendi anahtarini baglar; gorsel uretim saglayicilarinda da duzen aynidir.',
          adimlar: [
            'Etsy hesabinla giris yap (satici hesabi sart degil, normal hesap yeter).',
            'etsy.com/developers/register adresine git ve "Create a New App" de.',
            'Uygulamaya bir ad ver (ornek: "kendi magaza arastirmam") ve ne yapacagini kisaca yaz.',
            'API kullanim sartlarini kabul et.',
            'Onaydan sonra sana bir "Keystring" verilir - API anahtarin odur.',
            'O anahtari asagidaki kutuya yapistir ve Kaydet de.',
          ],
          notlar: [
            'Anahtar yalnizca bu bilgisayarda data/etsy-api.json icinde durur; hicbir yere gonderilmez.',
            'Yeni uygulamalar once kisisel/test kipinde baslar. Bazi uc noktalar Etsy onayi isteyebilir; anahtar reddedilirse panel bunu acikca soyler.',
            'Etsy hiz siniri uygular. Arka planda surekli tarama YAPILMAZ - yalnizca sen "Arastir" dedigin an istek gider.',
          ],
          kayitUrl: 'https://www.etsy.com/developers/register',
          dokumanUrl: 'https://developers.etsy.com/documentation/',
        },
      };
    },

    'POST /pazar/anahtar': async (body) => {
      pazar.saveConfig({ apiKey: body.apiKey });
      return { hazir: pazar.getConfig().hazir, anahtar: pazar.maskedKey() };
    },

    'POST /pazar/arastir': async (body) => {
      const kelimeler = String(body.keywords || '').trim();
      if (!kelimeler) throw badRequest('Aranacak nis veya anahtar kelime yaz.');
      return pazar.research({
        keywords: kelimeler,
        limit: body.limit,
        sayfa: body.sayfa,
        sortOn: body.sortOn,
        sortOrder: body.sortOrder,
        minPrice: body.minPrice,
        maxPrice: body.maxPrice,
      });
    },

    /**
     * TOPLU URETIM - ayni sozu dort urun olcusunde birden.
     *
     * Etsy saticisi ayni tasarimi tisortte de kupada da posterde de satiyor.
     * Su ana kadar bunu dort kez elle yapmak gerekiyordu. Hepsi TEK klasore
     * yaziliyor ve her biri kendi Etsy listeleme metniyle geliyor - cunku
     * urun kelimesi degisince etiketler de degisiyor ("cat mom shirt" ->
     * "cat mom mug").
     */
    'POST /toplu': async (body) => {
      const temel = body.design || {};
      // TOPLU_VARSAYILAN kodda yaziliydi ama HIC CAGRILMIYORDU: varsayilan
      // Object.keys(SIZES) idi ve olcu sayisi 4'ten 9'a cikinca buton
      // "4 urunde birden" deyip 9 dosya uretmeye basladi.
      const olculer = Array.isArray(body.sizes) && body.sizes.length
        ? body.sizes.filter((s) => design.SIZES[s])
        : design.TOPLU_VARSAYILAN;
      if (!olculer.length) throw badRequest('Gecerli urun olcusu secilmedi.');
      if (!render.available()) {
        const e = new Error('PNG uretimi icin sistemde Chrome/Edge bulunamadi.');
        e.status = 503;
        throw e;
      }

      const ilkSatir = Array.isArray(temel.lines) ? temel.lines.find(Boolean) : temel.lines;
      const job = isKlasoru(body.exportTo, 'etsy', `${ilkSatir || 'tasarim'} - toplu`);

      const sonuclar = [];
      const hatalar = [];
      let sira = 0;

      for (const olcu of olculer) {
        const d = { ...temel, size: olcu };
        const size = design.SIZES[olcu];
        try {
          const buffer = await render.svgToPng(design.toSvg(d), size.w, size.h);
          const file = store.saveImageBuffer(buffer, 'png');
          const listeleme = listing.build({ ...(body.listing || {}), size: olcu });

          const item = {
            id: file.id,
            filename: file.filename,
            url: file.url,
            createdAt: new Date().toISOString(),
            studio: 'etsy',
            category: `POD · ${size.label} · ${size.w}x${size.h}`,
            design: d,
            listing: listeleme,
            isGolden: false,
          };
          store.addGalleryItem(item);

          if (job) {
            sira += 1;
            output.writeImage(job, buffer, { index: sira, ext: 'png', label: `BASKI ${size.label}` });
            output.writeText(job, `etsy-listeleme - ${size.label}.txt`, listelemeMetni(listeleme, size));
          }

          /* LISTELEME GORSELI DE URETILIYOR.
           * Ilk surumde toplu uretim yalnizca BASKI dosyasi cikariyordu -
           * yani en cok kullanilacak yol, alicinin gorecegi kareyi hic
           * uretmiyordu. Urun mockup'i baski olcusune BAGLI seciliyor:
           * kupa olcusu kupa mockup'ina, poster postere.
           */
          let mockupItem = null;
          if (job && render.available()) {
            try {
              const mUrun = MOCKUP_ESLEME[olcu] || 'tisort';
              const mSvg = mockup.toSvg(d, { urun: mUrun, renk: body.mockupRenk || 'siyah' });
              const mBuf = await render.svgToPng(mSvg, mockup.BOYUT, mockup.BOYUT, { background: '#ffffff' });
              const mFile = store.saveImageBuffer(mBuf, 'png');
              mockupItem = {
                id: mFile.id,
                filename: mFile.filename,
                url: mFile.url,
                createdAt: new Date().toISOString(),
                studio: 'etsy',
                category: `Listeleme gorseli · ${mUrun}`,
                design: d,
                isGolden: false,
              };
              store.addGalleryItem(mockupItem);
              sira += 1;
              output.writeImage(job, mBuf, { index: sira, ext: 'png', label: `LISTELEME ${mUrun}` });
            } catch (err) {
              console.error('[etsy] listeleme gorseli uretilemedi:', err.message);
            }
          }

          sonuclar.push({ size: olcu, image: item, listing: listeleme, mockup: mockupItem });
        } catch (err) {
          hatalar.push({ size: olcu, hata: err.message });
        }
      }

      if (job && sonuclar.length) {
        output.writeText(job, 'bilgi.txt', [
          'SECOND SELF - toplu Etsy uretimi',
          '================================', '',
          `Tarih  : ${new Date().toLocaleString('tr-TR')}`,
          `Tasarim: ${(temel.lines || []).filter(Boolean).join(' / ')}`,
          `Urun   : ${sonuclar.length} olcu`,
          '', 'URETILENLER',
          ...sonuclar.map((s) => `- ${design.SIZES[s.size].label} (${design.SIZES[s.size].w}x${design.SIZES[s.size].h} @300DPI, seffaf)`),
          ...(hatalar.length ? ['', 'URETILEMEYENLER', ...hatalar.map((h) => `- ${h.size}: ${h.hata}`)] : []),
          '', 'NOT',
          'Her urunun Etsy listeleme metni ayri dosyada - urun kelimesi degisince',
          'etiketler de degisiyor (cat mom shirt -> cat mom mug).',
        ].join('\n'));
      }

      return {
        sonuclar,
        hatalar,
        export: job ? { name: job.name, path: job.path } : null,
      };
    },

    /**
     * Etsy arsivi SUNUCUDAN geliyor.
     * Panel eskiden /api/durum icindeki EN YENI 60 kareyi suzuyordu; 60'tan
     * fazla is yapan satici kendi tasarimlarini goremiyordu ("Henuz tasarim
     * yok" yaziyordu ama duruyorlardi).
     */
    'GET /arsiv': async () => ({
      items: store.getGallery().filter((g) => g.studio === 'etsy').slice(0, 200),
    }),

    /**
     * PDF CIKTISI - vektor, YAZI TIPI GOMULU.
     *
     * SVG'nin sorunu yazi tipini tasimamasiydi; PNG onu cozuyor ama vektor
     * olmaktan cikiyor. PDF ikisini birden veriyor: Chrome kullanilan fontu
     * PDF'e gomuyor (dogrulandi: /BaseFont /AAAAAA+Arial-Black), metin vektor
     * kaliyor. Bircok matbaa zaten PDF istiyor.
     */
    /* ------------------------------------------------- listeleme gorseli */

    /**
     * MOCKUP - Etsy'de satan sey listeleme fotografidir.
     * Arac bugune kadar yalnizca BASKI dosyasi uretiyordu; o dosya baskiciya
     * gider, alicinin gordugu sey degildir.
     *
     * Stok gorsel YOK: urun vektorle ciziliyor. Bu bir fotograf degildir ve
     * oyleymis gibi sunulmuyor.
     */
    'GET /mockup/secenekler': async () => ({
      urunler: mockup.urunler(),
      renkler: mockup.renkler(),
      not: 'Vektor mockup - fotograf degil. Gercek fotograf icin urunu basip cekmen ya da '
        + 'POD saglayicinin kendi mockup uretecini kullanman gerekir (Printful/Printify bunu ucretsiz veriyor).',
    }),

    'POST /mockup/onizleme': async (body) => {
      const r = mockup.build(body.design || {}, { urun: body.urun, renk: body.renk });
      return { svg: r.svg, kontrast: r.kontrast, boyut: mockup.BOYUT };
    },

    /** Secilen renklerde listeleme gorselleri uretir ve klasore yazar. */
    'POST /mockup/uret': async (body) => {
      if (!render.available()) {
        const e = new Error('Listeleme gorseli icin sistemde Chrome/Edge bulunamadi.');
        e.status = 503;
        throw e;
      }
      const d = body.design || {};
      const urun = body.urun || 'tisort';
      const renkler = Array.isArray(body.renkler) && body.renkler.length
        ? body.renkler.slice(0, 6)
        : ['siyah'];

      const ilkSatir = Array.isArray(d.lines) ? d.lines.find(Boolean) : d.lines;
      const job = isKlasoru(body.exportTo, 'etsy', `${ilkSatir || 'tasarim'} - listeleme gorseli`);

      const uretilen = [];
      const duzeltmeler = [];
      let sira = 0;
      for (const renk of renkler) {
        const r = mockup.build(d, { urun, renk });
        const svg = r.svg;
        if (!r.kontrast.uygun) duzeltmeler.push(r.kontrast.mesaj);
        const buffer = await render.svgToPng(svg, mockup.BOYUT, mockup.BOYUT, { background: '#ffffff' });
        const file = store.saveImageBuffer(buffer, 'png');
        const item = {
          id: file.id,
          filename: file.filename,
          url: file.url,
          createdAt: new Date().toISOString(),
          studio: 'etsy',
          category: `Listeleme gorseli · ${urun} · ${renk}`,
          design: d,
          isGolden: false,
        };
        store.addGalleryItem(item);
        uretilen.push(item);
        if (job) {
          sira += 1;
          output.writeImage(job, buffer, { index: sira, ext: 'png', label: `${urun} ${renk}` });
        }
      }

      if (job) {
        output.writeText(job, 'bilgi.txt', [
          'SECOND SELF - listeleme gorselleri',
          '==================================', '',
          `Tarih : ${new Date().toLocaleString('tr-TR')}`,
          `Urun  : ${urun}`,
          `Renk  : ${renkler.join(', ')}`,
          `Olcu  : ${mockup.BOYUT}x${mockup.BOYUT} (Etsy listeleme gorselleri icin onerilen kare olcu)`,
          '', 'ONEMLI',
          'Bunlar VEKTOR mockuptur, fotograf DEGILDIR. Etsy listelemende kullanabilirsin',
          'ama urunun gercek fotografi her zaman daha iyi donusur. POD saglayicin',
          '(Printful/Printify) kendi mockup uretecini ucretsiz veriyor - oradan da alabilirsin.',
        ].join('\n'));
      }

      return {
        gorseller: uretilen,
        duzeltmeler,
        export: job ? { name: job.name, path: job.path } : null,
      };
    },

    /* --------------------------------------------------- Etsy magazasi */

    /**
     * TASLAK LISTELEME. Yayina ALMAZ - bkz. magaza.js dosya basi.
     * Son karar her zaman Etsy'nin kendi ekraninda kullanicinin.
     */
    'GET /magaza/durum': async () => ({
      config: magaza.getConfig(),
      kapsamlar: magaza.SCOPES,
      kurulum: {
        baslik: 'Etsy magazani bagla - taslak listeleme icin',
        neden: 'Bu otomasyonun kendi Etsy uygulamasi YOKTUR. Kendi uygulamani kaydediyorsun, '
          + 'jetonlar yalnizca bu bilgisayarda duruyor.',
        adimlar: [
          'etsy.com/developers/register adresinden bir uygulama olustur (ucretsiz) ve Keystring\'i al.',
          'Uygulamanin ayarlarina bir YONLENDIRME ADRESI ekle. Etsy https:// istiyor ve '
            + 'http://localhost KABUL ETMIYOR - kendi sitenden acabildigin herhangi bir https adresi olur.',
          'Keystring ve ayni yonlendirme adresini asagiya yaz, Kaydet de.',
          '"Etsy ile baglan" butonuna bas; acilan Etsy sayfasinda izin ver.',
          'Etsy seni yonlendirme adresine gonderecek. Adres cubugundaki code=... degerini kopyala.',
          'Kopyaladigin kodu asagidaki kutuya yapistir ve Baglantiyi tamamla de.',
        ],
        notlar: [
          'Neden elle kod yapistiriyorsun: panel yerelde (http://localhost) calisiyor, Etsy oraya '
            + 'geri donemiyor. Bir kez yapilir - tazeleme anahtari 90 gun gecerli.',
          'Istenen izinler: magaza okuma, listeleme okuma, listeleme yazma. SILME izni ISTENMIYOR.',
          'Bu arac listeleri yalnizca TASLAK olarak olusturur. Yayina alma, fiyat degistirme ve '
            + 'silme islemlerini yapmaz - hepsi Etsy ekraninda senin elinde.',
        ],
        kayitUrl: 'https://www.etsy.com/developers/register',
      },
    }),

    'POST /magaza/ayar': async (body) => ({
      config: magaza.saveConfig({ apiKey: body.apiKey, redirectUri: body.redirectUri }),
    }),

    'POST /magaza/baglan': async () => magaza.buildAuthUrl(),

    'POST /magaza/kod': async (body) => ({
      config: await magaza.exchangeCode(body.kod, body.state),
    }),

    'POST /magaza/kopar': async () => ({ config: magaza.kopar() }),

    'GET /magaza/kargo': async () => ({ profiller: await magaza.kargoProfilleri() }),

    'POST /magaza/kategori-ara': async (body) => ({
      kategoriler: await magaza.kategoriler(body.arama),
    }),

    /**
     * Galerideki bir isi TASLAK listelemeye cevirir.
     * Gorseller: listeleme gorselleri (mockup) once, baski dosyasi degil -
     * Etsy'de alicinin gordugu sey mockup'tir.
     */
    'POST /magaza/taslak': async (body) => {
      const listeleme = body.listing ? listing.build(body.listing) : null;
      if (!listeleme) throw badRequest('Once listeleme metnini uret.');

      const gorseller = [];
      for (const id of (body.gorselIds || []).slice(0, 10)) {
        const kayit = store.getGallery().find((g) => g.id === id);
        if (!kayit) continue;
        const buffer = store.readImageBuffer(kayit.filename);
        if (buffer) gorseller.push({ buffer, ad: kayit.filename });
      }

      const sonuc = await magaza.taslakOlustur({
        baslik: listeleme.title,
        aciklama: listeleme.description,
        etiketler: listeleme.tags,
        fiyat: body.fiyat,
        adet: body.adet,
        taxonomyId: body.taxonomyId,
        kargoProfilId: body.kargoProfilId,
        whoMade: body.whoMade,
        whenMade: body.whenMade,
        gorseller,
      });

      return { ...sonuc, listeleme };
    },

    'POST /pdf': async (body) => {
      const d = body.design || {};
      const size = design.SIZES[d.size] || design.SIZES.tisort;
      const buffer = await render.svgToPdf(design.toSvg(d), size.w, size.h, { dpi: 300 });

      /* PDF DISKE DE KAYDEDILIYOR.
       * Ilk surumde PDF yalnizca masaustu klasorune yaziliyordu; cikti
       * klasoru KAPALIYSA dosya hicbir yere yazilmiyor ama panel yine de
       * "PDF hazir - X KB" diyordu. Artik data/ altina da kaydediliyor ve
       * panel indirme baglantisi aliyor.
       */
      const kayit = store.saveImageBuffer(buffer, 'pdf');

      const ilkSatir = Array.isArray(d.lines) ? d.lines.find(Boolean) : d.lines;
      const job = isKlasoru(body.exportTo, 'etsy', `${ilkSatir || 'tasarim'} - PDF`);
      let dosya = null;
      if (job) {
        dosya = output.writeImage(job, buffer, { index: 1, ext: 'pdf', label: size.label });
        output.writeText(job, 'bilgi.txt', [
          'SECOND SELF - PDF cikti',
          '=======================', '',
          `Tarih : ${new Date().toLocaleString('tr-TR')}`,
          `Olcu  : ${size.w}x${size.h} piksel = ${(size.w / 300).toFixed(2)}x${(size.h / 300).toFixed(2)} inc @300DPI`,
          '',
          'Bu PDF vektordur ve kullanilan yazi tipi dosyaya GOMULUDUR -',
          'baskicida o font kurulu olmasa da tasarim ayni gorunur.',
        ].join('\n'));
      }
      return {
        size,
        bytes: buffer.length,
        url: kayit.url,
        export: job ? { name: job.name, path: job.path } : null,
        dosya,
      };
    },

    /* ------------------------------------------------- gorunum sablonlari */

    /**
     * Magaza tutarliligi Etsy'de dogrudan satis unsuru: alici bir tasarimi
     * begenip magazaya girdiginde ayni dili gormeli. Begenilen palet + font +
     * dizilim birlesimi F5'te kaybolmasin diye saklaniyor.
     */
    'GET /sablonlar': async () => ({ sablonlar: store.getDesignTemplates('etsy') }),

    'POST /sablon/kaydet': async (body) => {
      const ad = String(body.ad || '').trim();
      if (!ad) throw badRequest('Sablona bir ad ver.');
      const d = body.design || {};
      return {
        sablonlar: store.saveDesignTemplate('etsy', {
          ad,
          layout: d.layout,
          palette: d.palette,
          font: d.font,
          uppercase: d.uppercase,
        }),
      };
    },

    'POST /sablon/sil': async (body) => ({
      sablonlar: store.deleteDesignTemplate('etsy', body.ad),
    }),

    'POST /listeleme': async (body) => {
      const built = listing.build(body.listing || {});
      if (!built.title) throw badRequest('Once tasarimdaki sozu gir.');
      return built;
    },
  },
};
