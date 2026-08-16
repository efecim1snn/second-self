'use strict';

const { fetchJson, fetchBinary, sleep, fillDeep } = require('./helpers');

/**
 * Yerel ComfyUI.
 * Kendi workflow JSON'unu (API formatinda export edilmis) yapistirirsin;
 * icindeki {{prompt}} {{negative}} {{seed}} {{width}} {{height}} yerlerini
 * otomasyon doldurur.
 */
module.exports = {
  id: 'comfyui',
  label: 'Yerel ComfyUI',
  dialect: 'sdxl',
  local: true,
  docs: 'https://docs.comfy.org/development/comfyui-server/comms_routes',
  blurb: 'En esnek yerel secenek. IPAdapter FaceID gibi dugumlerle en saglam yuz kilidini burada kurarsin.',
  supportsReference: true,
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
      help: 'ComfyUI > Settings > "Enable dev mode options" > "Save (API Format)". Cikan dosyayi buraya yapistir ve degismesini istedigin yerlere {{prompt}}, {{negative}}, {{seed}}, {{width}}, {{height}} yaz.',
    },
  ],

  async generate({ config, prompt, negative, seed, width, height }) {
    const base = (config.baseUrl || 'http://127.0.0.1:8188').replace(/\/$/, '');
    if (!config.workflow) throw new Error('ComfyUI workflow JSON girilmemis.');

    let graph;
    try {
      graph = typeof config.workflow === 'string' ? JSON.parse(config.workflow) : config.workflow;
    } catch (err) {
      throw new Error(`Workflow JSON gecersiz: ${err.message}`);
    }

    const filled = fillDeep(graph, {
      prompt,
      negative: negative || '',
      seed: seed == null ? Math.floor(Math.random() * 2147483647) : Number(seed),
      width: Number(width) || 832,
      height: Number(height) || 1216,
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
      if (found.length) return { images: found, raw: { promptId } };
    }

    throw new Error('ComfyUI uretimi zaman asimina ugradi (4 dakika).');
  },
};
