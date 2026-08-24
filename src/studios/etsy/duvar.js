'use strict';

/**
 * DUVAR KAGIDI URETECI
 *
 * NEDEN VEKTOR, NEDEN AI DEGIL
 * ---------------------------------------------------------------
 * Olculdu: bedava saglayici (Pollinations) en fazla 686x858 doner ve
 * istenen olcuyu YOK SAYAR. iPhone duvar kagidi 1290x2796 ister. Yani
 * bedava AI ile satilabilir duvar kagidi fiilen uretilemiyor.
 *
 * Vektorde boyle bir sinir yok: ayni tanim 1290x2796 telefona da
 * 3840x2160 masaustune de kayipsiz iniyor, kredi harcamadan, saniyeler
 * icinde.
 *
 * ORAN SORUNU - BU DOSYANIN ASIL ISI
 * ---------------------------------------------------------------
 * Telefon 0.46 oraninda (cok uzun), masaustu 1.78 (genis), tablet 0.75.
 * Ayni kompozisyonu esnetmek masaustunde bozuk cikarir: telefon icin
 * dikey dizilmis uc blob, 16:9'da yanyana yayilir ve tasarim dagilir.
 *
 * Bu yuzden her uretec ORANI GORUR ve ona gore yeniden kompoze eder -
 * ayni tohum, ayni renk, ayni aile, ama farkli yerlesim. Cikti "esnetilmis
 * ayni dosya" degil, "ayni tasarimin o ekran icin kurulmus hali".
 *
 * DETERMINISTIK: ayni tohum + ayni aile + ayni palet = ayni tasarim.
 * Musteri paketteki 50 duvar kagidini yeniden uretmek istedigimizde
 * birebir aynisi cikar.
 */

const { makeRng, pick } = require('../../rng');

/* ═══════════════════════════════════════════════════════════ OLCULER */

/**
 * CIHAZ OLCULERI
 *
 * `oran` hesaplanan degil yazili: kod okunurken hangi ailenin hangi
 * ekranda nasil davrandigi buradan gorunsun.
 */
const OLCULER = {
  // --- telefon
  iphonePro: { label: 'iPhone Pro Max', w: 1290, h: 2796, grup: 'telefon' },
  iphone: { label: 'iPhone standart', w: 1170, h: 2532, grup: 'telefon' },
  android: { label: 'Android (QHD+)', w: 1440, h: 3200, grup: 'telefon' },

  // --- tablet
  ipadPro: { label: 'iPad Pro 12.9"', w: 2048, h: 2732, grup: 'tablet' },
  ipad: { label: 'iPad 10.9"', w: 1640, h: 2360, grup: 'tablet' },

  // --- masaustu
  masaustu4k: { label: 'Masaustu 4K', w: 3840, h: 2160, grup: 'masaustu' },
  masaustu: { label: 'Masaustu 1080p', w: 1920, h: 1080, grup: 'masaustu' },
  ultrawide: { label: 'Ultrawide 21:9', w: 3440, h: 1440, grup: 'masaustu' },
};

/** Paket varsayilani: her tasarim bu uc olcude cikar. */
const PAKET_VARSAYILAN = ['iphonePro', 'ipadPro', 'masaustu4k'];

/* ═══════════════════════════════════════════════════════════ PALETLER */

/**
 * Her palet en az bes renk: iki zemin, uc vurgu.
 * Etsy'de satan duvar kagidi paletleri doygun degil KIRIK renklerdir -
 * ekranda saatlerce durdugu icin cig renk yoruyor.
 */
const PALETLER = {
  toprak: { label: 'Toprak', zemin: ['#E8DCC8', '#D9C7A7'], renk: ['#A67B5B', '#7D5A44', '#3E2F26'] },
  gunbatimi: { label: 'Gun batimi', zemin: ['#FFE5D0', '#FFC9A8'], renk: ['#F09A7B', '#D4675A', '#8C3D4A'] },
  okyanus: { label: 'Okyanus', zemin: ['#DDEAF0', '#B9D4E0'], renk: ['#6FA3B8', '#3D6E85', '#1F3F52'] },
  orman: { label: 'Orman', zemin: ['#E2E8DC', '#C4D1BB'], renk: ['#8AA37B', '#5A7350', '#2E3F2A'] },
  pastel: { label: 'Pastel', zemin: ['#FBEFF3', '#F3E0EA'], renk: ['#E3B7CC', '#C68FA8', '#9C6B84'] },
  gece: { label: 'Gece', zemin: ['#1B1F2A', '#232838'], renk: ['#3E4A63', '#6B7A99', '#C7D0E0'] },
  monokrom: { label: 'Monokrom', zemin: ['#F4F4F2', '#E4E4E1'], renk: ['#B8B8B4', '#6E6E6A', '#1F1F1D'] },
  retro70: { label: 'Retro 70', zemin: ['#F2E3C4', '#E8D0A0'], renk: ['#D98E48', '#B5502F', '#5C4022'] },
  lavanta: { label: 'Lavanta', zemin: ['#EDE8F5', '#DCD3EC'], renk: ['#B3A5D6', '#8674B8', '#4E4275'] },
  kum: { label: 'Kum', zemin: ['#F5EFE6', '#EADFCE'], renk: ['#C9B79C', '#9B8A73', '#4A3F35'] },
};

/* Yazim hatasi guvenligi: bozuk bir hex kodu SVG'de sessizce siyaha
 * duser ve palet bozulur - satisa giden bir dosyada fark edilmesi zor.
 * paletDogrula() bunu acikca yakaliyor; nitekim ilk yazimda `kum`
 * paletinde "#9B8straight" gibi bir yazim hatasi vardi ve bu dogrulayici
 * onu ilk calistirmada bildirdi. */

/* ═══════════════════════════════════════════════════════════ yardim */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Benzersiz SVG id oneki - ayni sayfada birden fazla tasarim carpismasin. */
function onek(tohum, aile) {
  let h = 2166136261;
  const s = `${tohum}|${aile}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `w${(h >>> 0).toString(36)}`;
}

const n = (x) => Number(x).toFixed(1);

/* ─────────────────────────────────────────────────── kontrast kilidi */

/**
 * WCAG bagil parlaklik. Ayni yontem mockup.js'te de kullaniliyor
 * (orada siyah-uzerine-siyah tasarim uretilmesini engellemisti).
 */
function parlaklik(hex) {
  const v = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

/** Iki renk arasindaki kontrast orani (1 = ayni, 21 = siyah/beyaz). */
function kontrast(a, b) {
  const la = parlaklik(a);
  const lb = parlaklik(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * INCE CIZGI AILELERI ICIN GOREBILIRLIK.
 *
 * Ciktiya bakinca goruldu: `dalga` ailesi acik paletlerde neredeyse
 * gorunmuyordu - pastel zeminde pastel cizgi, ekranda bos beyaz gibi
 * duruyor ve satilamaz.
 *
 * Zemine karsi kontrasti dusuk kalan renk, paletin en kontrastli
 * rengiyle degistiriliyor. Dolgu ailelerinde (bauhaus, tepe) bu gerekmez -
 * orada genis alanlar var, dusuk kontrast "yumusak" durur; ince cizgide
 * ayni sey "yok" demek.
 */
function gorunurRenk(renk, zemin, esik = 1.6) {
  if (kontrast(renk, zemin) >= esik) return renk;
  return null; // cagiran taraf yedek rengi secer
}

/* ═══════════════════════════════════════════════════════════ AILELER */

/**
 * Her uretec ayni sozlesmeye uyar:
 *   uret(w, h, palet, rng) -> { defs, govde }
 * `defs` <defs> icine, `govde` dogrudan tuvale gider.
 *
 * ORAN DUYARLILIGI: her uretec `w/h` oranina bakip yerlesimi degistirir.
 * Dikey ekranda dikey yigilma, yatay ekranda yatay yayilma.
 */
const AILELER = {

  /* ---------------------------------------------------------- gradyan */
  gradyan: {
    label: 'Gradyan',
    aciklama: 'Yumusak renk gecisi. Her ekranda calisir, en guvenli aile.',
    uret(w, h, p, rng, id) {
      const dikey = h > w;
      const renkler = [p.zemin[0], p.renk[0], p.renk[1]];
      // Dikey ekranda gecis yukaridan asagi, yatayda capraz - yatayda
      // dikey gecis "bant" gibi gorunuyor.
      const [x1, y1, x2, y2] = dikey ? [0, 0, 0, 1] : [0, 0, 1, 1];
      const duraklar = renkler.map((c, i) => (
        `<stop offset="${(i / (renkler.length - 1) * 100).toFixed(0)}%" stop-color="${c}"/>`
      )).join('');
      // Ikinci katman: yumusak isik lekesi, kompozisyonu duzlukten kurtarir
      const cx = 0.2 + rng() * 0.6;
      const cy = dikey ? 0.15 + rng() * 0.3 : 0.2 + rng() * 0.6;
      return {
        defs:
          `<linearGradient id="${id}g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${duraklar}</linearGradient>`
          + `<radialGradient id="${id}r" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="0.7">`
          + `<stop offset="0%" stop-color="${p.zemin[0]}" stop-opacity="0.85"/>`
          + `<stop offset="100%" stop-color="${p.zemin[0]}" stop-opacity="0"/></radialGradient>`,
        govde:
          `<rect width="${w}" height="${h}" fill="url(#${id}g)"/>`
          + `<rect width="${w}" height="${h}" fill="url(#${id}r)"/>`,
      };
    },
  },

  /* ------------------------------------------------------------- blob */
  blob: {
    label: 'Organik blob',
    aciklama: 'Ust uste binen yumusak lekeler. Boho/minimalist raflarda en cok satan.',
    uret(w, h, p, rng, id) {
      const dikey = h > w;
      const adet = dikey ? 3 : 4;
      const parcalar = [];
      for (let i = 0; i < adet; i++) {
        /* YERLESIM ORANA BAGLI:
         * dikey ekranda bloblar dikey eksende dizilir (t = i/adet -> y),
         * yatayda yatay eksende. Esnetilmis tek kompozisyon yerine
         * ekrana kurulmus kompozisyon. */
        const t = (i + 0.5) / adet;
        const cx = dikey ? (0.25 + rng() * 0.5) * w : t * w;
        const cy = dikey ? t * h : (0.3 + rng() * 0.4) * h;
        const r = (dikey ? w : h) * (0.28 + rng() * 0.22);
        parcalar.push(blobYolu(cx, cy, r, rng, p.renk[i % p.renk.length], 0.55 + rng() * 0.25));
      }
      /* BULANIKLIK AZALTILDI: 0.02 (kisa kenarin %2'si) cok fazlaydi -
       * 1290px genislikte 26px sapma demek ve bloblar birbirine karisip
       * camur gorunumu veriyordu. Ciktiya bakinca goruldu. %0.6 formu
       * koruyup kenari yumusatiyor. */
      return {
        defs: `<filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%">`
          + `<feGaussianBlur stdDeviation="${n(Math.min(w, h) * 0.006)}"/></filter>`,
        govde: `<rect width="${w}" height="${h}" fill="${p.zemin[0]}"/>`
          + `<g filter="url(#${id}b)">${parcalar.join('')}</g>`,
      };
    },
  },

  /* -------------------------------------------------------- bauhaus */
  bauhaus: {
    label: 'Bauhaus',
    aciklama: 'Daire, yarim daire ve blok. Net, grafik, zamansiz.',
    uret(w, h, p, rng, id) {
      const dikey = h > w;
      const sut = dikey ? 2 : 4;
      const sat = dikey ? 4 : 2;
      const hw = w / sut;
      const hh = h / sat;
      const parcalar = [];
      for (let sy = 0; sy < sat; sy++) {
        for (let sx = 0; sx < sut; sx++) {
          const x = sx * hw;
          const y = sy * hh;
          const c = pick(p.renk, rng);
          const tur = Math.floor(rng() * 4);
          if (tur === 0) {
            parcalar.push(`<circle cx="${n(x + hw / 2)}" cy="${n(y + hh / 2)}" r="${n(Math.min(hw, hh) * 0.38)}" fill="${c}"/>`);
          } else if (tur === 1) {
            // yarim daire, dort yonden biri
            const yon = Math.floor(rng() * 4);
            const r = Math.min(hw, hh) * 0.46;
            const cx = x + hw / 2;
            const cy = y + hh / 2;
            const a = [[cx - r, cy, cx + r, cy], [cx, cy - r, cx, cy + r]][yon % 2];
            const sweep = yon < 2 ? 1 : 0;
            parcalar.push(`<path d="M ${n(a[0])} ${n(a[1])} A ${n(r)} ${n(r)} 0 0 ${sweep} ${n(a[2])} ${n(a[3])} Z" fill="${c}"/>`);
          } else if (tur === 2) {
            parcalar.push(`<rect x="${n(x + hw * 0.12)}" y="${n(y + hh * 0.12)}" width="${n(hw * 0.76)}" height="${n(hh * 0.76)}" fill="${c}"/>`);
          } else {
            const kal = Math.min(hw, hh) * 0.1;
            parcalar.push(`<line x1="${n(x + hw * 0.15)}" y1="${n(y + hh / 2)}" x2="${n(x + hw * 0.85)}" y2="${n(y + hh / 2)}" stroke="${c}" stroke-width="${n(kal)}" stroke-linecap="round"/>`);
          }
        }
      }
      return { defs: '', govde: `<rect width="${w}" height="${h}" fill="${p.zemin[0]}"/>${parcalar.join('')}` };
    },
  },

  /* ------------------------------------------------------------ tepe */
  tepe: {
    label: 'Katmanli tepe',
    aciklama: 'Ust uste dag/tepe siluetleri ve gunes. Manzara hissi, sifir fotograf.',
    uret(w, h, p, rng, id) {
      const dikey = h > w;
      const katman = 4;
      const parcalar = [];
      // gunes/ay
      const gx = (0.25 + rng() * 0.5) * w;
      const gy = dikey ? h * (0.22 + rng() * 0.12) : h * (0.3 + rng() * 0.15);
      parcalar.push(`<circle cx="${n(gx)}" cy="${n(gy)}" r="${n(Math.min(w, h) * 0.13)}" fill="${p.renk[0]}" opacity="0.9"/>`);

      for (let i = 0; i < katman; i++) {
        /* Katmanlar asagidan yukari koyulasiyor; dikey ekranda daha
         * genise yayiliyor cunku 0.46 oraninda alcak tepe cok kucuk kalir. */
        const taban = h * (dikey ? 0.55 + i * 0.12 : 0.45 + i * 0.16);
        const yuk = h * (dikey ? 0.1 : 0.14);
        const nokta = [`M 0 ${n(h)}`, `L 0 ${n(taban)}`];
        const adim = 5;
        for (let k = 0; k <= adim; k++) {
          const x = (k / adim) * w;
          const y = taban - Math.sin((k / adim) * Math.PI) * yuk * (0.5 + rng());
          nokta.push(`L ${n(x)} ${n(y)}`);
        }
        nokta.push(`L ${n(w)} ${n(h)} Z`);
        parcalar.push(`<path d="${nokta.join(' ')}" fill="${p.renk[Math.min(i, p.renk.length - 1)]}" opacity="${(0.55 + i * 0.15).toFixed(2)}"/>`);
      }
      return {
        defs: `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">`
          + `<stop offset="0%" stop-color="${p.zemin[0]}"/><stop offset="100%" stop-color="${p.zemin[1]}"/></linearGradient>`,
        govde: `<rect width="${w}" height="${h}" fill="url(#${id}s)"/>${parcalar.join('')}`,
      };
    },
  },

  /* --------------------------------------------------------- terrazzo */
  terrazzo: {
    label: 'Terrazzo',
    aciklama: 'Dagilmis renkli parcalar. Desen oldugu icin her orana esit dagiliyor.',
    uret(w, h, p, rng) {
      // YOGUNLUK ALANLA ORANTILI: sabit adet kullanilsa masaustunde seyrek,
      // telefonda tikis tikis gorunurdu.
      const alan = w * h;
      const adet = Math.round(alan / (Math.min(w, h) * 14));
      const parcalar = [];
      for (let i = 0; i < adet; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const r = Math.min(w, h) * (0.006 + rng() * 0.014);
        const c = pick(p.renk, rng);
        const donme = rng() * 360;
        parcalar.push(
          `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(r * (1 + rng()))}" ry="${n(r)}" `
          + `fill="${c}" opacity="${(0.5 + rng() * 0.5).toFixed(2)}" `
          + `transform="rotate(${n(donme)} ${n(x)} ${n(y)})"/>`
        );
      }
      return { defs: '', govde: `<rect width="${w}" height="${h}" fill="${p.zemin[0]}"/>${parcalar.join('')}` };
    },
  },

  /* ------------------------------------------------------------ dalga */
  dalga: {
    label: 'Dalga cizgileri',
    aciklama: 'Ic ice gecen cizgi katmanlari. Topografik harita hissi.',
    uret(w, h, p, rng) {
      const dikey = h > w;
      const adet = dikey ? 22 : 16;
      const parcalar = [];
      const genlik = h * (dikey ? 0.045 : 0.07);

      /* GOREBILIRLIK: ince cizgi ailesi oldugu icin dusuk kontrast
       * "yumusak" degil "yok" demek. Paletin zemine en kontrastli rengi
       * yedek olarak secliyor. */
      const zemin = p.zemin[0];
      const enKontrast = [...p.renk].sort((a, b) => kontrast(b, zemin) - kontrast(a, zemin))[0];

      for (let i = 0; i < adet; i++) {
        const y0 = (i / adet) * h * 1.1;
        const faz = rng() * Math.PI * 2;
        const nokta = [];
        const adim = 12;
        for (let k = 0; k <= adim; k++) {
          const x = (k / adim) * w;
          const y = y0 + Math.sin((k / adim) * Math.PI * 2 + faz) * genlik;
          nokta.push(`${k === 0 ? 'M' : 'L'} ${n(x)} ${n(y)}`);
        }
        const ham = p.renk[i % p.renk.length];
        const c = gorunurRenk(ham, zemin) || enKontrast;
        parcalar.push(
          `<path d="${nokta.join(' ')}" fill="none" stroke="${c}" `
          + `stroke-width="${n(Math.min(w, h) * 0.005)}" opacity="${(0.5 + (i / adet) * 0.45).toFixed(2)}"/>`
        );
      }
      return { defs: '', govde: `<rect width="${w}" height="${h}" fill="${p.zemin[0]}"/>${parcalar.join('')}` };
    },
  },

  /* ----------------------------------------------------------- kemer */
  kemer: {
    label: 'Kemer',
    aciklama: 'Ic ice yay ve kemer formlari. Mid-century / art deco hissi.',
    uret(w, h, p, rng) {
      /* ILK SURUM KADRAJDAN TASIYORDU.
       * `r` en distaki halkada w*0.6'ya cikiyordu ve kemer `w/2 - r`
       * noktasindan basladigi icin sol kenarin DISINA cikiyordu; ayrica
       * taban 0.62h'de sabitti, altta ekranin %38'i bos kaliyordu.
       * Ciktiya bakinca goruldu.
       *
       * Yeni hali: en dis halka kadrajin icinde kalacak sekilde
       * hesaplaniyor ve kemer tabani alt kenara oturuyor - klasik
       * mid-century kemer kompozisyonu boyle. */
      const dikey = h > w;
      const adet = dikey ? 5 : 6;
      const parcalar = [];
      // Taban alt kenardan biraz yukarida; kemer oradan yukseliyor.
      const taban = h * (dikey ? 0.88 : 0.92);
      // En dis yaricap: hem genislige hem yuksekligre sigmali.
      const enDis = Math.min(w * 0.44, taban * 0.82);
      for (let i = adet - 1; i >= 0; i--) {
        const r = enDis * ((i + 1) / adet);
        const c = p.renk[i % p.renk.length];
        parcalar.push(
          `<path d="M ${n(w / 2 - r)} ${n(taban)} A ${n(r)} ${n(r)} 0 0 1 ${n(w / 2 + r)} ${n(taban)} Z" `
          + `fill="${c}" opacity="${(0.55 + (i / adet) * 0.4).toFixed(2)}"/>`
        );
      }
      return { defs: '', govde: `<rect width="${w}" height="${h}" fill="${p.zemin[0]}"/>${parcalar.join('')}` };
    },
  },

  /* ----------------------------------------------------------- dama */
  dama: {
    label: 'Dama',
    aciklama: 'Retro dama deseni, hafif egilmis. Y2K / retro raflarda guclu.',
    uret(w, h, p, rng, id) {
      // Kare hucre: orana bakilmaksizin hucre KARE kalmali, yoksa
      // masaustunde dikdortgen dama olur ve retro hissi kaybolur.
      const hucre = Math.min(w, h) / (8 + Math.floor(rng() * 5));

      /* DONDURULEN IZGARA KOSELERI ACIKTA BIRAKIYORDU.
       * Tam w x h'yi kaplayan bir izgara dondurulunce dort kosede zemin
       * gorunuyordu - ciktida koyu kamalar olarak fark edildi.
       * Cozum: izgarayi kadrajin KOSEGENI kadar buyut. Kosegen, merkez
       * etrafinda her donme acisinda kadraji kapsayan en kucuk daire. */
      const kosegen = Math.hypot(w, h);
      /* TASMA EKSEN BASINA hesaplanmali.
       * Ilk denemede tek bir `tasma = (kosegen - min(w,h))/2` kullandim;
       * 1290x2796'da bu her iki eksende de ~894px demek ve izgara
       * kadrajin cok disina tasti - onizleme izgarasinda komsu karelerin
       * uzerine yayildigi goruldu.
       * Dogrusu: merkez etrafinda donen izgara kosegen capinda bir daireyi
       * kaplamali, yani her eksende (kosegen - o eksen)/2 kadar tasmali. */
      const tasmaX = (kosegen - w) / 2 + hucre;
      const tasmaY = (kosegen - h) / 2 + hucre;
      const basX = -tasmaX;
      const basY = -tasmaY;
      const sut = Math.ceil((w + tasmaX * 2) / hucre) + 1;
      const sat = Math.ceil((h + tasmaY * 2) / hucre) + 1;

      const c1 = p.zemin[0];
      const c2 = pick(p.renk, rng);
      const parcalar = [];
      for (let y = 0; y < sat; y++) {
        for (let x = 0; x < sut; x++) {
          if ((x + y) % 2) continue;
          parcalar.push(`<rect x="${n(basX + x * hucre)}" y="${n(basY + y * hucre)}" width="${n(hucre)}" height="${n(hucre)}" fill="${c2}"/>`);
        }
      }
      const aci = -8 + rng() * 16;
      /* Izgara bilerek kadrajdan buyuk - kirpmayi uret() yapiyor
       * (butun aileler icin tek yerde, bkz. "HER AILE ICIN TEK KIRPMA"). */
      return {
        defs: '',
        govde: `<rect width="${w}" height="${h}" fill="${c1}"/>`
          + `<g transform="rotate(${n(aci)} ${n(w / 2)} ${n(h / 2)})">${parcalar.join('')}</g>`,
      };
    },
  },
};

/** Organik blob yolu - kenarlari dalgalanan daire. */
function blobYolu(cx, cy, r, rng, renk, opaklik) {
  const nokta = 7;
  const yol = [];
  const yaricap = [];
  for (let i = 0; i < nokta; i++) yaricap.push(r * (0.75 + rng() * 0.5));
  for (let i = 0; i < nokta; i++) {
    const a = (i / nokta) * Math.PI * 2;
    const x = cx + Math.cos(a) * yaricap[i];
    const y = cy + Math.sin(a) * yaricap[i];
    if (i === 0) { yol.push(`M ${n(x)} ${n(y)}`); continue; }
    // Yumusak gecis icin kiris yaricapinin biraz ustunde yay
    const on = (i - 1 + nokta) % nokta;
    const oa = (on / nokta) * Math.PI * 2;
    const ox = cx + Math.cos(oa) * yaricap[on];
    const oy = cy + Math.sin(oa) * yaricap[on];
    const kiris = Math.hypot(x - ox, y - oy);
    yol.push(`A ${n(kiris * 0.85)} ${n(kiris * 0.85)} 0 0 1 ${n(x)} ${n(y)}`);
  }
  yol.push('Z');
  return `<path d="${yol.join(' ')}" fill="${renk}" opacity="${opaklik.toFixed(2)}"/>`;
}

/* ═══════════════════════════════════════════════════════════ URETIM */

/** Palet renk kodlarini dogrular - bozuk kod sessizce siyah olmasin. */
function paletDogrula() {
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const bozuk = [];
  for (const [ad, p] of Object.entries(PALETLER)) {
    for (const c of [...p.zemin, ...p.renk]) if (!HEX.test(c)) bozuk.push(`${ad}: ${c}`);
  }
  return bozuk;
}

/**
 * Tek duvar kagidi uretir.
 * @param {object} ayar { aile, palet, tohum, olcu }
 * @returns {{ svg, w, h, aile, palet, tohum, olcu }}
 */
function uret({ aile = 'gradyan', palet = 'toprak', tohum = 1, olcu = 'iphonePro' } = {}) {
  const A = AILELER[aile] || AILELER.gradyan;
  const P = PALETLER[palet] || PALETLER.toprak;
  const O = OLCULER[olcu] || OLCULER.iphonePro;

  // Ayni tohum + ayni aile = ayni tasarim. Olcu tohuma GIRMIYOR: paketteki
  // uc dosya ayni tasarimin uc ekrana kurulmus hali olmali, uc ayri
  // tasarim degil.
  const rng = makeRng([aile, palet, tohum]);
  const id = onek(tohum, aile);
  const { defs, govde } = A.uret(O.w, O.h, P, rng, id);

  /* HER AILE ICIN TEK KIRPMA.
   *
   * Uretecler bilerek kadrajdan tasan cizim yapiyor: dama dondurulen
   * izgarayi kosegen capinda kuruyor, dalga son dalgayi 1.1h'ye kadar
   * indiriyor, blob kenardan tasan lekeler koyuyor. Tek basina duran bir
   * SVG'de viewBox bunu kirpar - ama cikti her zaman tek basina durmuyor:
   * panel onizleme izgarasinda, mockup icinde ve albüm sayfasinda SVG bir
   * <g> icine gomuluyor ve orada viewBox KIRPMIYOR.
   *
   * Olculdu: masaustu onizleme izgarasinda dalga ailesinin cizgileri
   * komsu karenin uzerine tasti. Aileleri tek tek yamamak yerine kirpma
   * burada, bir kez, hepsi icin yapiliyor. */
  const kirpId = `${id}clip`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${O.w}" height="${O.h}" `
    + `viewBox="0 0 ${O.w} ${O.h}">`
    + `<defs><clipPath id="${kirpId}"><rect width="${O.w}" height="${O.h}"/></clipPath>`
    + (defs || '')
    + '</defs>'
    + `<g clip-path="url(#${kirpId})">${govde}</g>`
    + '</svg>';

  return { svg, w: O.w, h: O.h, aile, palet, tohum, olcu, olcuLabel: O.label };
}

/**
 * Bir paket uretir: N tasarim x M olcu.
 *
 * Aile ve palet TOHUMDAN turetiliyor, rastgele degil - 50'lik bir pakette
 * hepsi gradyan cikmasin, aileler ve paletler esit dagilsin diye.
 */
function paket({ adet = 50, olculer = PAKET_VARSAYILAN, aileler = null, paletler = null, tohum = 1 } = {}) {
  const A = (aileler && aileler.length) ? aileler.filter((x) => AILELER[x]) : Object.keys(AILELER);
  const P = (paletler && paletler.length) ? paletler.filter((x) => PALETLER[x]) : Object.keys(PALETLER);
  const O = (olculer && olculer.length) ? olculer.filter((x) => OLCULER[x]) : PAKET_VARSAYILAN;
  if (!A.length || !P.length || !O.length) return { tasarimlar: [], dosyaSayisi: 0 };

  const tasarimlar = [];
  for (let i = 0; i < adet; i++) {
    /* CIFT SAYICI - her tasarim FARKLI bir aile+palet birlesimi alsin.
     *
     * Ilk surum `palet = P[(i*3 + floor(i/A)) % P]` kullaniyordu ve
     * olculdu: 50 tasarimda yalnizca 16 farkli aile+palet cifti cikti,
     * yani ucer tasarim ayni gorunumu paylasiyordu. Ayrica palet dagilimi
     * bozuktu (toprak 7, kum 3).
     *
     * Ikinci deneme "iki basamakli sayac" idi (aile hizli, palet yavas) ve
     * tekillik sorununu cozdu ama YENI bir sorun yaratti: palet ancak 8
     * tasarimda bir degistigi icin 6'lik bir paketin ALTISI DA ayni
     * palette cikiyordu - kucuk paket tek renk goruntusu veriyordu,
     * masaustune yazilan pakette goruldu.
     *
     * Uctuncu ve dogru hali: palet her adimda ilerlesin, aile dongusu
     * tamamlandiginda bir adim daha kaysin. Boylece
     *   - ilk 6 tasarim: 6 farkli aile VE 6 farkli palet,
     *   - tekrar periyodu yine 80 (kayma 9, palet 10 ile aralarinda asal).
     */
    const aile = A[i % A.length];
    const palet = P[(i + Math.floor(i / A.length)) % P.length];
    const t = tohum * 1000 + i;
    tasarimlar.push({
      no: i + 1,
      aile,
      palet,
      tohum: t,
      dosyalar: O.map((olcu) => uret({ aile, palet, tohum: t, olcu })),
    });
  }
  return { tasarimlar, dosyaSayisi: adet * O.length, olculer: O };
}

function options() {
  return {
    aileler: Object.entries(AILELER).map(([key, v]) => ({ key, label: v.label, aciklama: v.aciklama })),
    paletler: Object.entries(PALETLER).map(([key, v]) => ({ key, label: v.label, ornek: [...v.zemin, ...v.renk] })),
    olculer: Object.entries(OLCULER).map(([key, v]) => ({ key, ...v })),
    paketVarsayilan: PAKET_VARSAYILAN,
    paletSorunu: paletDogrula(),
  };
}

module.exports = { uret, paket, options, AILELER, PALETLER, OLCULER, PAKET_VARSAYILAN, paletDogrula };
