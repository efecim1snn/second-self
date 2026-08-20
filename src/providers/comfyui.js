'use strict';

const { fetchJson, fetchBinary, sleep, fillDeep } = require('./helpers');

/**
 * Yerel ComfyUI.
 * Kendi workflow JSON'unu (API formatinda export edilmis) yapistirirsin;
 * icindeki {{prompt}} {{negative}} {{seed}} {{width}} {{height}} {{reference}}
 * yerlerini otomasyon doldurur.
 *
 * REFERANS GORSEL: {{reference}} yer tutucusu, vesikalik karesinin ComfyUI'ye
 * yuklendikten sonraki DOSYA ADIYLA degistirilir. LoadImage dugumunun "image"
 * girdisi tam olarak bunu bekler. Bulut API'lerindeki gibi base64 gomulemez -
 * ComfyUI dosyayi once /upload/image ucundan ister.
 */
module.exports = {
  id: 'comfyui',
  label: 'Yerel ComfyUI',
  dialect: 'sdxl',
  local: true,
  docs: 'https://docs.comfy.org/development/comfyui-server/comms_routes',
  blurb: 'En esnek yerel secenek. IPAdapter FaceID gibi dugumlerle en saglam yuz kilidini burada kurarsin.',
  supportsReference: true,
  // Referans GERCEKTEN yuklenebiliyor (POST /upload/image) ama workflow'un
  // icinde bir LoadImage dugumu ve {{reference}} yer tutucusu olmali.
  // Yoksa gonderilecek yer yok demektir.
  referenceMode: 'needs-config',
  referenceReady: (config) => /\{\{\s*reference\s*\}\}/.test(String((config && config.workflow) || '')),
  referenceNotReadyReason: 'Workflow JSON icinde {{reference}} yer tutucusu yok, bu yuzden referans kare gonderilecek bir dugum bulunamiyor.',
  referenceFixHint: 'Workflow\'una bir LoadImage dugumu ekle ve "image" degerini {{reference}} yap. Otomasyon vesikalik karesini ComfyUI\'ye yukleyip adini oraya yazar.',
  cost: 'yerel',
  costNote: 'Kendi bilgisayarinda calisir - sifir maliyet.',
  pricingUrl: null,
  realism: 'yuksek',
  realismNote: 'En esnek yerel secenek; IPAdapter FaceID gibi dugumlerle en saglam yuz kilidi burada kurulur.',
  maxResolution: 'donaniminla sinirli',
  resolutionNote: 'VRAM ne kadarsa o kadar.',
  setup: 'ileri duzey',
  setupNote: 'Workflow JSON (API formati) yapistirilmali.',
  supportsSeed: true,
  supportsNegative: true,
  needs: 'Acik ComfyUI + workflow JSON',
  keyUrl: null,
  fields: [
    {
      key: 'baseUrl',
      label: 'ComfyUI adresi',
      type: 'text',
      default: 'http://127.0.0.1:8188',
    },
    {
      key: 'workflow',
      label: 'Workflow JSON (API formati)',
      type: 'textarea',
      required: true,
      help: 'ComfyUI > Settings > "Enable dev mode options" > "Save (API Format)". Cikan dosyayi buraya yapistir ve degismesini istedigin yerlere {{prompt}}, {{negative}}, {{seed}}, {{width}}, {{height}} yaz. YUZ KILIDI icin workflow\'una bir LoadImage dugumu ekleyip "image" degerini {{reference}} yap - ornek: "9": { "class_type": "LoadImage", "inputs": { "image": "{{reference}}" } }',
    },
  ],

  /**
   * Referans kareyi ComfyUI'nin girdi klasorune yukler, dosya adini dondurur.
   *
   * DIKKAT - iki tuzak:
   * 1) 'content-type' basligini ELLE KOYMA. FormData gonderirken fetch'in
   *    kendisi multipart sinirini (boundary) baslikta tasir; elle koyarsan
   *    boundary kaybolur ve ComfyUI govdeyi ayristiramaz.
   * 2) new File() KULLANMA. Node 18'de yok, projenin engines sozu >=18.
   *    Blob + append'in ucuncu parametresi ayni isi goruyor.
   */
  async uploadReference(base, buffer, mime = 'image/png') {
    const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
    const ad = `secondself_ref_${Date.now().toString(36)}.${ext}`;

    const form = new FormData();
    form.append('image', new Blob([buffer], { type: mime }), ad);
    form.append('type', 'input');
    form.append('overwrite', 'true');

    let res;
    try {
      res = await fetchJson(`${base}/upload/image`, { method: 'POST', body: form });
    } catch (err) {
      if (/fetch failed|ECONNREFUSED/i.test(err.message)) {
        throw new Error(`ComfyUI'ye baglanilamadi (${base}). Acik mi?`);
      }
      throw new Error(`Referans gorsel ComfyUI'ye yuklenemedi: ${err.message}`);
    }

    // Yanit: { name, subfolder, type }. Alt klasor varsa LoadImage "alt/ad"
    // biciminde bekliyor.
    const name = res && (res.name || res.filename);
    if (!name) {
      throw new Error(`ComfyUI yukleme yaniti beklenmedik: ${JSON.stringify(res).slice(0, 200)}`);
    }
    return res.subfolder ? `${res.subfolder}/${name}` : name;
  },

  async generate({ config, prompt, negative, seed, width, height, referenceBuffer, referenceMime }) {
    const base = (config.baseUrl || 'http://127.0.0.1:8188').replace(/\/$/, '');
    if (!config.workflow) throw new Error('ComfyUI workflow JSON girilmemis.');

    let graph;
    try {
      graph = typeof config.workflow === 'string' ? JSON.parse(config.workflow) : config.workflow;
    } catch (err) {
      throw new Error(`Workflow JSON gecersiz: ${err.message}`);
    }

    // Workflow referans istiyor mu? Ham metinde bakiyoruz cunku yer tutucu
    // hangi dugumde oldugundan bagimsiz.
    const wantsRef = /\{\{\s*reference\s*\}\}/.test(
      typeof config.workflow === 'string' ? config.workflow : JSON.stringify(config.workflow)
    );

    let referenceName = '';
    if (wantsRef) {
      if (!referenceBuffer) {
        throw new Error(
          'Workflow {{reference}} istiyor ama gonderilecek referans kare yok. ' +
          'Once "Vesikalik seti" sekmesinden en az "Onden" karesini uret.'
        );
      }
      referenceName = await this.uploadReference(base, referenceBuffer, referenceMime);
    }

    const filled = fillDeep(graph, {
      prompt,
      negative: negative || '',
      seed: seed == null ? Math.floor(Math.random() * 2147483647) : Number(seed),
      width: Number(width) || 832,
      height: Number(height) || 1216,
      // HER ZAMAN konur: helpers.fillDeep bir anahtari vars'ta bulamazsa yer
      // tutucuyu HAM birakir ve ComfyUI "invalid image file: {{reference}}" der.
      reference: referenceName,
    });

    const clientId = `aiinf_${Date.now().toString(36)}`;
    let queued;
    try {
      queued = await fetchJson(`${base}/prompt`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: filled, client_id: clientId }),
      });
    } catch (err) {
      if (/fetch failed|ECONNREFUSED/i.test(err.message)) {
        throw new Error(`ComfyUI'ye baglanilamadi (${base}). Acik mi?`);
      }
      throw err;
    }

    const promptId = queued && queued.prompt_id;
    if (!promptId) throw new Error(`ComfyUI kuyruk yaniti beklenmedik: ${JSON.stringify(queued).slice(0, 300)}`);

    for (let attempt = 0; attempt < 120; attempt++) {
      await sleep(2000);
      const history = await fetchJson(`${base}/history/${promptId}`);
      const entry = history && history[promptId];
      if (!entry || !entry.outputs) continue;

      const found = [];
      for (const nodeOutput of Object.values(entry.outputs)) {
        for (const img of (nodeOutput.images || [])) {
          const qs = new URLSearchParams({
            filename: img.filename,
            subfolder: img.subfolder || '',
            type: img.type || 'output',
          });
          const buffer = await fetchBinary(`${base}/view?${qs.toString()}`);
          found.push({ buffer, mime: 'image/png' });
        }
      }
      if (found.length) return { images: found, raw: { promptId, reference: referenceName || null } };
    }

    throw new Error('ComfyUI uretimi zaman asimina ugradi (4 dakika).');
  },
};
