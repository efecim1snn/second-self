/* AI Influencer Otomasyon - panel */
'use strict';

const S = {
  tab: 'kurulum',
  status: null,
  questions: [],
  answers: {},
  step: 0,
  providers: null,
  scenes: [],
  scene: null,
  prompts: null,
  busy: false,
};

const view = document.getElementById('view');
const tabsEl = document.getElementById('tabs');

/* ------------------------------------------------------------------- util */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function api(path, body) {
  const res = await fetch(path, body === undefined
    ? {}
    : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: 'Yanit okunamadi.' }));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

function toast(message, kind = '') {
  const wrap = document.getElementById('toasts');
  const node = document.createElement('div');
  node.className = `toast ${kind}`;
  node.textContent = message;
  wrap.appendChild(node);
  setTimeout(() => node.remove(), kind === 'bad' ? 9000 : 4500);
}

function copy(text) {
  navigator.clipboard.writeText(text).then(
    () => toast('Panoya kopyalandi.', 'ok'),
    () => toast('Kopyalanamadi.', 'bad')
  );
}

function modal(title, bodyHtml, actions) {
  const m = document.getElementById('modal');
  document.getElementById('modaltitle').textContent = title;
  document.getElementById('modalbody').innerHTML = bodyHtml;
  const bar = document.getElementById('modalactions');
  bar.innerHTML = '';
  for (const a of actions) {
    const b = document.createElement('button');
    b.className = a.className || 'ghost';
    b.textContent = a.label;
    b.onclick = () => a.onClick(m);
    bar.appendChild(b);
  }
  m.hidden = false;
}
function closeModal() { document.getElementById('modal').hidden = true; }

/* ------------------------------------------------------------------ boot */

async function refresh() {
  S.status = await api('/api/durum');
  S.providers = await api('/api/saglayicilar');

  const c = S.status.character;
  document.getElementById('charline').textContent = c
    ? `${c.identity.name} · @${c.identity.handle} · seed ${c.seed}`
    : 'karakter yok - sihirbaz bekliyor';

  const chip = document.getElementById('providerchip');
  const p = S.status.provider;
  chip.className = 'providerchip ' + (p.generates ? 'live' : 'none');
  chip.textContent = p.generates ? `Uretici: ${p.label}` : 'Uretici bagli degil';
}

function tabs() {
  const has = S.status && S.status.hasCharacter;
  const items = has
    ? [['karakter', 'Karakter'], ['uretim', 'Uretim'], ['galeri', 'Galeri'], ['ayarlar', 'Ayarlar']]
    : [['kurulum', 'Kurulum'], ['ayarlar', 'Ayarlar']];
  if (!items.find((i) => i[0] === S.tab)) S.tab = items[0][0];
  tabsEl.innerHTML = items
    .map(([id, label]) => `<button data-tab="${id}" class="${S.tab === id ? 'on' : ''}">${label}</button>`)
    .join('');
  tabsEl.querySelectorAll('button').forEach((b) => {
    // Her sekme gecisinde durumu tazele: galeri/karakter komut satirindan da
    // degismis olabilir (ornegin node reset.js).
    b.onclick = async () => {
      S.tab = b.dataset.tab;
      try { await refresh(); } catch (err) { toast(err.message, 'bad'); }
      render();
    };
  });
}

async function render() {
  tabs();
  if (S.tab === 'kurulum') return renderWizard();
  if (S.tab === 'karakter') return renderCharacter();
  if (S.tab === 'uretim') return renderProduction();
  if (S.tab === 'galeri') return renderGallery();
  if (S.tab === 'ayarlar') return renderSettings();
}

/* ---------------------------------------------------------------- wizard */

async function renderWizard() {
  if (!S.questions.length) {
    S.questions = (await api('/api/sorular')).questions;
  }
  const total = S.questions.length;
  const q = S.questions[S.step];
  const pct = Math.round((S.step / total) * 100);

  if (S.step >= total) return renderWizardSummary();

  let input = '';
  const value = S.answers[q.key];

  if (q.type === 'select') {
    input = `<div class="choices">${q.options.map((o) =>
      `<button class="choice ${value === o ? 'on' : ''}" data-pick="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  } else if (q.type === 'multiselect') {
    const sel = Array.isArray(value) ? value : [];
    input = `<div class="choices">${q.options.map((o) =>
      `<button class="choice ${sel.includes(o) ? 'on' : ''}" data-multi="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <p class="help" id="multicount">${sel.length} secildi (en az ${q.min}, en fazla ${q.max})</p>`;
  } else if (q.type === 'number') {
    input = `<input type="number" id="qinput" min="${q.min}" max="${q.max}" value="${value != null ? value : q.default}">`;
  } else if (q.type === 'measurements') {
    const m = value || {};
    input = `<div class="grid3">${q.fields.map((f) => `
      <div class="field">
        <label>${esc(f.label)}${f.required ? ' *' : ''}</label>
        <input type="number" data-m="${f.key}" min="${f.min}" max="${f.max}"
               value="${m[f.key] != null ? m[f.key] : (f.default != null ? f.default : '')}"
               placeholder="${f.required ? 'zorunlu' : 'opsiyonel'}">
      </div>`).join('')}</div>`;
  } else {
    input = `<input type="text" id="qinput" maxlength="${q.maxLength || 60}" value="${esc(value || '')}" placeholder="bos birakabilirsin">`;
  }

  view.innerHTML = `
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="card">
      <div class="stepnum">Soru ${S.step + 1} / ${total}</div>
      <h2 class="qtitle">${esc(q.label)}</h2>
      ${q.hint ? `<p class="qhint">${esc(q.hint)}</p>` : ''}
      ${input}
      <hr class="sep">
      <div class="row">
        <button class="ghost" id="back" ${S.step === 0 ? 'disabled' : ''}>Geri</button>
        <button class="btn" id="next">${S.step === total - 1 ? 'Karakteri olustur' : 'Devam'}</button>
        ${!q.required ? '<span class="dim" style="font-size:12px">bu soru opsiyonel</span>' : ''}
      </div>
    </div>`;

  view.querySelectorAll('[data-pick]').forEach((b) => {
    b.onclick = () => { S.answers[q.key] = b.dataset.pick; next(); };
  });
  view.querySelectorAll('[data-multi]').forEach((b) => {
    b.onclick = () => {
      const sel = Array.isArray(S.answers[q.key]) ? S.answers[q.key].slice() : [];
      const v = b.dataset.multi;
      const i = sel.indexOf(v);
      if (i >= 0) sel.splice(i, 1);
      else if (sel.length < q.max) sel.push(v);
      else return toast(`En fazla ${q.max} secebilirsin.`, 'bad');
      S.answers[q.key] = sel;
      renderWizard();
    };
  });

  const back = document.getElementById('back');
  if (back) back.onclick = () => { S.step = Math.max(0, S.step - 1); renderWizard(); };
  document.getElementById('next').onclick = next;

  function collect() {
    if (q.type === 'number' || q.type === 'text') {
      const el = document.getElementById('qinput');
      S.answers[q.key] = q.type === 'number' ? Number(el.value) : el.value;
    } else if (q.type === 'measurements') {
      const out = {};
      view.querySelectorAll('[data-m]').forEach((el) => {
        if (el.value !== '') out[el.dataset.m] = Number(el.value);
      });
      S.answers[q.key] = out;
    }
  }

  function next() {
    collect();
    const v = S.answers[q.key];
    if (q.required) {
      if (q.type === 'multiselect' && (!Array.isArray(v) || v.length < q.min)) {
        return toast(`En az ${q.min} secim yap.`, 'bad');
      }
      if (q.type === 'number' && (v == null || Number.isNaN(v) || v < q.min || v > q.max)) {
        return toast(`${q.label}: ${q.min}-${q.max} arasi bir deger gir.`, 'bad');
      }
      if (q.type === 'measurements') {
        for (const f of q.fields) {
          if (f.required && (v == null || v[f.key] == null)) return toast(`${f.label} zorunlu.`, 'bad');
        }
      }
      if (q.type === 'select' && !v) return toast('Bir secim yap.', 'bad');
    }
    S.step++;
    renderWizard();
  }
}

function renderWizardSummary() {
  const a = S.answers;
  const rows = S.questions.map((q) => {
    let v = a[q.key];
    if (q.type === 'measurements') {
      v = Object.entries(v || {}).map(([k, val]) => `${k.replace(/_/g, ' ')}: ${val}`).join(' · ');
    } else if (Array.isArray(v)) v = v.join(', ');
    return `<div class="idcell"><span>${esc(q.label)}</span><b>${esc(v || '—')}</b></div>`;
  }).join('');

  view.innerHTML = `
    <div class="progress"><i style="width:100%"></i></div>
    <div class="card">
      <h1>Karakteri kilitliyoruz</h1>
      <p class="lead">Asagidaki kimlik <b>bir daha degistirilemez</b>. Her gorsel uretiminde kelimesi kelimesine
      ayni sekilde prompt'a girecek - tutarliligin sebebi bu. Degistirmek istersen Ayarlar &gt; TUM VERIYI SIL ile
      sifirdan baslarsin.</p>
      <div class="identity">${rows}</div>
      <hr class="sep">
      <div class="row">
        <button class="ghost" id="back">Geri don</button>
        <button class="btn" id="create">Karakteri olustur ve kilitle</button>
      </div>
    </div>`;

  document.getElementById('back').onclick = () => { S.step = S.questions.length - 1; renderWizard(); };
  document.getElementById('create').onclick = async (e) => {
    e.target.disabled = true;
    e.target.innerHTML = '<span class="spin"></span>olusturuluyor';
    try {
      await api('/api/karakter', { answers: S.answers });
      await refresh();
      S.tab = 'karakter';
      toast('Karakter olusturuldu ve kilitlendi.', 'ok');
      render();
    } catch (err) {
      toast(err.message, 'bad');
      e.target.disabled = false;
      e.target.textContent = 'Karakteri olustur ve kilitle';
    }
  };
}

/* -------------------------------------------------------------- character */

function renderCharacter() {
  const c = S.status.character;
  const id = c.identity;
  const p = c.persona;
  const m = id.measurements || {};

  const cell = (label, value) => `<div class="idcell"><span>${esc(label)}</span><b>${esc(value || '—')}</b></div>`;

  view.innerHTML = `
    <h1>${esc(id.name)} <span class="dim">@${esc(id.handle)}</span></h1>
    <p class="lead">
      <span class="locked">🔒 Kimlik kilitli</span> · seed <span class="mono">${c.seed}</span> ·
      olusturuldu ${new Date(c.createdAt).toLocaleString('tr-TR')}
    </p>

    <div class="card">
      <h2>Kilitli kimlik</h2>
      <div class="identity">
        ${cell('Cinsiyet', id.gender)}
        ${cell('Bolge', id.region)}
        ${cell('Etnik koken', id.ethnicity)}
        ${cell('Ten rengi', id.skinTone)}
        ${cell('Goz rengi', id.eyeColor)}
        ${cell('Sac', `${id.hairStyle} · ${id.hairColor}`)}
        ${cell('Yas', id.age)}
        ${cell('Vucut tipi', id.bodyType)}
        ${cell('Boy / kilo', `${m.height_cm || '—'} cm · ${m.weight_kg || '—'} kg`)}
        ${cell('Olculer', m.bust_cm ? `${m.bust_cm}-${m.waist_cm || '?'}-${m.hips_cm || '?'}` : '—')}
        ${cell('Ayirt edici', id.distinctive)}
      </div>
    </div>

    <div class="card">
      <h2>Fiziksel cekirdek</h2>
      <p class="help">Her prompt'a AYNEN bu satir girer. Tutarliligin %70'i budur.</p>
      <div class="core">${esc(S.status.identityLine)}</div>
      <div class="row" style="margin-top:12px">
        <button class="ghost" id="copycore">Kopyala</button>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h2>Kisilik</h2>
        <div class="field"><label>Burc</label><b>${esc(p.zodiac)}</b></div>
        <div class="field"><label>Ozellikler</label>${p.traits.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
        <div class="field"><label>Konusma tonu</label>${esc(p.tone)}</div>
        <div class="field"><label>Imza kancasi</label>${esc(p.signatureHook)}</div>
        <div class="field"><label>Gorsel ruh hali</label>${esc(p.visualMood)}</div>
      </div>
      <div class="card">
        <h2>Ses rehberi</h2>
        <div class="field"><label>Egitim / dil kaydi</label>${esc(p.voiceGuide.register)}</div>
        <div class="field"><label>Cumle uzunlugu</label>${esc(p.voiceGuide.sentenceLength)}</div>
        <div class="field"><label>Emoji kurali</label>${esc(p.voiceGuide.emojiRule)}</div>
        <div class="field"><label>Kacinilacaklar</label>${p.voiceGuide.avoid.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
      </div>
    </div>

    <div class="card">
      <h2>Hikaye</h2>
      <p>${esc(p.backstory)}</p>
      <hr class="sep">
      <h3>Icerik sutunlari</h3>
      <div>${p.contentPillars.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
    </div>

    <div class="card">
      <h2>Altin kare (referans gorsel)</h2>
      ${c.reference && c.reference.filename
        ? `<div class="row" style="align-items:flex-start">
             <img src="/gorseller/${esc(c.reference.filename)}" style="width:150px;border-radius:10px">
             <div>
               <p class="help">Bu gorsel, referans destekleyen platformlarda yuz kilidi olarak gonderiliyor.</p>
               <div class="field" style="max-width:420px">
                 <label>Herkese acik URL (Midjourney --cref / Higgsfield icin)</label>
                 <input id="refurl" value="${esc(c.reference.publicUrl || '')}" placeholder="https://...">
                 <p class="help">Bu gorseli internete yukleyip linkini buraya koyarsan, link gerektiren platformlarin prompt'una otomatik eklenir.</p>
               </div>
               <button class="ghost" id="saveref">Kaydet</button>
             </div>
           </div>`
        : `<p class="dim">Henuz altin kare secilmedi. Galeriden en iyi gorseli "altin kare yap" ile isaretle;
           bundan sonraki uretimlerde referans olarak kullanilir.</p>`}
    </div>`;

  document.getElementById('copycore').onclick = () => copy(S.status.identityLine);
  const saveref = document.getElementById('saveref');
  if (saveref) {
    saveref.onclick = async () => {
      await api('/api/karakter/persona', { publicReferenceUrl: document.getElementById('refurl').value });
      await refresh();
      toast('Kaydedildi.', 'ok');
    };
  }
}

/* -------------------------------------------------------------- production */

async function renderProduction() {
  if (!S.scenes.length) {
    const data = await api('/api/sahneler', { count: 12 });
    S.scenes = data.scenes;
    S.scene = S.scenes[0];
  }
  const generates = S.status.provider.generates;

  view.innerHTML = `
    <h1>Uretim</h1>
    <p class="lead">Kimlik sabit; degisen tek sey poz, kiyafet, ortam ve isik.
    Gorsel <b>bagladigin API'den</b> gelir - bu otomasyonun kendi gorsel havuzu yoktur.</p>

    ${generates ? '' : `<div class="notice warn">
      <b>Bagli gorsel uretim API'si yok.</b><br>
      Bu otomasyon kendi basina gorsel uretmez ve stok gorsel kullanmaz. Asagida prompt'u hazir goreceksin,
      ama gorseli almak icin <b>Ayarlar</b> bolumunden kendi uretim platformunu baglaman gerekiyor
      (Leonardo, OpenAI, Stability, Replicate, fal.ai, yerel Stable Diffusion, ComfyUI veya "Ozel API" ile herhangi biri).
    </div>`}

    <div class="card">
      <h2>Sahne</h2>
      <div class="choices" id="scenelist">
        ${S.scenes.map((s, i) => `<button class="choice ${S.scene && S.scene.id === s.id ? 'on' : ''}" data-scene="${i}">
          <b>${esc(s.categoryLabel)}</b><br><span class="dim" style="font-size:12px">${esc(s.pose)}</span>
        </button>`).join('')}
      </div>
      <hr class="sep">
      <div class="grid3">
        <div class="field"><label>Kadraj</label><input id="f_shot" value="${esc(S.scene.shot)}"></div>
        <div class="field"><label>Poz</label><input id="f_pose" value="${esc(S.scene.pose)}"></div>
        <div class="field"><label>Kiyafet</label><input id="f_outfit" value="${esc(S.scene.outfit)}"></div>
        <div class="field"><label>Ortam</label><input id="f_setting" value="${esc(S.scene.setting)}"></div>
        <div class="field"><label>Aksesuar</label><input id="f_props" value="${esc(S.scene.props)}"></div>
        <div class="field"><label>Isik</label><input id="f_lighting" value="${esc(S.scene.lighting)}"></div>
        <div class="field">
          <label>Format</label>
          <select id="f_aspect">
            <option value="post">Instagram post (4:5)</option>
            <option value="story">Story / Reel (9:16)</option>
            <option value="square">Kare (1:1)</option>
            <option value="wide">Yatay (16:9)</option>
          </select>
        </div>
        <div class="field"><label>Ek detay (opsiyonel)</label><input id="f_extra" placeholder="istedigin ekstra tarif"></div>
        <div class="field"><label>Kac adet</label><input id="f_count" type="number" min="1" max="4" value="1"></div>
      </div>
      <div class="row">
        <button class="btn" id="gen">${generates ? 'URET' : 'Prompt hazirla'}</button>
        <button class="ghost" id="preview">Prompt'u gor</button>
        <button class="ghost" id="reroll">Sahneleri yenile</button>
      </div>
    </div>

    <div id="output"></div>`;

  document.getElementById('f_aspect').value = S.scene.aspect || 'post';

  view.querySelectorAll('[data-scene]').forEach((b) => {
    b.onclick = () => { S.scene = S.scenes[Number(b.dataset.scene)]; renderProduction(); };
  });
  document.getElementById('reroll').onclick = async () => {
    S.scenes = [];
    await renderProduction();
  };
  document.getElementById('preview').onclick = () => showPrompts(currentScene());
  document.getElementById('gen').onclick = () => generate(currentScene());

  function currentScene() {
    return {
      ...S.scene,
      shot: document.getElementById('f_shot').value,
      pose: document.getElementById('f_pose').value,
      outfit: document.getElementById('f_outfit').value,
      setting: document.getElementById('f_setting').value,
      props: document.getElementById('f_props').value,
      lighting: document.getElementById('f_lighting').value,
      aspect: document.getElementById('f_aspect').value,
      extra: document.getElementById('f_extra').value,
    };
  }
}

async function showPrompts(scene) {
  const out = document.getElementById('output');
  out.innerHTML = '<div class="card"><span class="spin"></span>prompt hazirlaniyor...</div>';
  const data = await api('/api/prompt', { scene });
  renderPromptCards(out, data);
}

function renderPromptCards(container, data) {
  const entries = Object.entries(data.all);
  container.innerHTML = `
    <div class="card">
      <h2>Aktif platform icin prompt</h2>
      <p class="help">${esc(data.active.dialectLabel)} · ${esc(data.active.aspectLabel)}${data.active.seed != null ? ` · seed ${data.active.seed}` : ' · seed desteklenmiyor'}</p>
      <div class="core">${esc(data.active.prompt)}</div>
      <div class="row" style="margin-top:12px">
        <button class="ghost" data-copy="active">Prompt'u kopyala</button>
        ${data.active.negative ? '<button class="ghost" data-copy="neg">Negatif prompt\'u kopyala</button>' : ''}
      </div>
      ${data.active.negative ? `<div class="field" style="margin-top:14px"><label>Negatif prompt</label><div class="core">${esc(data.active.negative)}</div></div>` : ''}
      ${data.active.notes && data.active.notes.length ? `<ul class="help">${data.active.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    </div>

    <div class="card">
      <h2>Diger platformlarin dili</h2>
      <p class="help">Ayni sahne, her aracin sevdigi bicimde. Hangisini kullaniyorsan onu kopyala.</p>
      ${entries.map(([key, v]) => `
        <div class="field">
          <label>${esc(v.dialectLabel)}</label>
          <div class="core">${esc(v.prompt)}</div>
          <div class="row" style="margin-top:8px"><button class="ghost" data-copyd="${key}">Kopyala</button></div>
        </div>`).join('')}
    </div>`;

  container.querySelector('[data-copy="active"]').onclick = () => copy(data.active.prompt);
  const negBtn = container.querySelector('[data-copy="neg"]');
  if (negBtn) negBtn.onclick = () => copy(data.active.negative);
  container.querySelectorAll('[data-copyd]').forEach((b) => {
    b.onclick = () => copy(data.all[b.dataset.copyd].prompt);
  });
}

async function generate(scene) {
  if (S.busy) return;
  const btn = document.getElementById('gen');
  const out = document.getElementById('output');
  const count = Number(document.getElementById('f_count').value) || 1;

  S.busy = true;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>uretiliyor...';
  out.innerHTML = `<div class="card"><span class="spin"></span>
    ${esc(S.status.provider.label)} calisiyor. Model ve kuyruga gore 10 saniye - 2 dakika surebilir.</div>`;

  try {
    const data = await api('/api/uret', { scene, count });
    out.innerHTML = `
      <div class="card">
        <h2>Uretildi · ${data.images.length} gorsel · ${(data.tookMs / 1000).toFixed(1)} sn</h2>
        <p class="help">Kaynak: ${esc(data.provider.label)} · seed ${data.prompt.seed != null ? data.prompt.seed : 'yok'}</p>
        <div class="gallery">${data.images.map((i) => `
          <div class="shot">
            <img src="${esc(i.url)}" loading="lazy">
            <div class="meta">${esc(i.category || '')}<br>
              <button class="ghost" style="margin-top:8px;padding:6px 10px;font-size:12px" data-golden="${esc(i.id)}">Altin kare yap</button>
            </div>
          </div>`).join('')}</div>
      </div>
      <div class="card">
        <h3>Kullanilan prompt</h3>
        <div class="core">${esc(data.prompt.prompt)}</div>
      </div>`;
    out.querySelectorAll('[data-golden]').forEach((b) => {
      b.onclick = () => setGolden(b.dataset.golden);
    });
    await refresh();
    toast(`${data.images.length} gorsel uretildi.`, 'ok');
  } catch (err) {
    if (err.status === 428 && err.data && err.data.prompt) {
      out.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`;
      const box = document.createElement('div');
      out.appendChild(box);
      renderPromptCards(box, { active: err.data.prompt, all: err.data.all });
    } else {
      out.innerHTML = `<div class="notice bad"><b>Uretim basarisiz.</b><br>${esc(err.message)}</div>`;
    }
    toast(err.message.slice(0, 160), 'bad');
  } finally {
    S.busy = false;
    btn.disabled = false;
    btn.textContent = S.status.provider.generates ? 'URET' : 'Prompt hazirla';
  }
}

async function setGolden(id) {
  await api('/api/galeri/altin', { id });
  await refresh();
  toast('Altin kare secildi. Bundan sonraki uretimlerde referans olarak kullanilacak.', 'ok');
}

/* ---------------------------------------------------------------- gallery */

function renderGallery() {
  const g = S.status.gallery;
  view.innerHTML = `
    <h1>Galeri</h1>
    <p class="lead">Hepsi bagladigin uretim API'sinden geldi. En iyi kareyi "altin kare" yap;
    referans destekleyen platformlarda yuz kilidi olarak kullanilir.</p>
    ${g.length ? `<div class="gallery">${g.map((i) => `
      <div class="shot ${i.isGolden ? 'golden' : ''}">
        <img src="${esc(i.url)}" loading="lazy">
        <div class="meta">
          ${i.isGolden ? '<span class="badge">★ altin kare</span><br>' : ''}
          ${esc(i.category || '')} · ${esc(i.providerLabel || i.provider || '')}<br>
          ${new Date(i.createdAt).toLocaleString('tr-TR')}
          <div class="row" style="margin-top:8px">
            <button class="ghost" style="padding:5px 9px;font-size:11.5px" data-golden="${esc(i.id)}">Altin kare</button>
            <button class="ghost" style="padding:5px 9px;font-size:11.5px" data-prompt="${esc(i.id)}">Prompt</button>
          </div>
        </div>
      </div>`).join('')}</div>`
      : `<div class="empty">Henuz gorsel yok.<br><br>
         <span class="dim">Bu otomasyon gorsel uretmez ve stok gorsel kullanmaz -
         Ayarlar'dan bir uretim API'si baglayip Uretim sekmesinden ilk kareyi al.</span></div>`}`;

  view.querySelectorAll('[data-golden]').forEach((b) => { b.onclick = () => setGolden(b.dataset.golden); });
  view.querySelectorAll('[data-prompt]').forEach((b) => {
    b.onclick = () => {
      const item = g.find((i) => i.id === b.dataset.prompt);
      modal('Kullanilan prompt', `<div class="core">${esc(item.prompt)}</div>
        <p class="help">seed: ${item.seed != null ? item.seed : 'yok'} · ${esc(item.providerLabel || '')}</p>`,
      [
        { label: 'Kopyala', onClick: () => copy(item.prompt) },
        { label: 'Kapat', className: 'btn', onClick: closeModal },
      ]);
    };
  });
}

/* --------------------------------------------------------------- settings */

function renderSettings() {
  const list = S.providers.providers;
  const active = S.providers.active;
  const spec = list.find((p) => p.id === active) || list[0];

  view.innerHTML = `
    <h1>Ayarlar</h1>

    <div class="notice info">
      <b>Bu otomasyon gorsel uretmez.</b> Hicbir stok gorsel de icermez.
      Gorseli <b>senin bagladigin platform</b> uretir; otomasyonun isi, kilitli karakterden o platformun
      diline gore en iyi prompt'u kurup istegi gondermek ve donen gorseli kaydetmektir.
      Listede olmayan bir platform kullaniyorsan <b>"Ozel API"</b> secenegiyle herhangi birini baglayabilirsin.
    </div>

    <div class="card">
      <h2>Gorsel uretim saglayicisi</h2>
      <div class="field">
        <label>Aktif platform</label>
        <select id="provsel">
          ${list.map((p) => `<option value="${p.id}" ${p.id === active ? 'selected' : ''}>
            ${esc(p.label)}${p.local ? ' (yerel)' : ''}${p.configured || p.id === 'manual' ? '' : ' — ayarlanmadi'}
          </option>`).join('')}
        </select>
        <p class="help" id="provblurb">${esc(spec.blurb || '')}</p>
        ${spec.docs ? `<p class="help">Dokuman: <a href="${esc(spec.docs)}" target="_blank" rel="noreferrer">${esc(spec.docs)}</a></p>` : ''}
      </div>
      <div id="provfields"></div>
      <div class="row">
        <button class="btn" id="savep">Kaydet</button>
        <button class="ghost" id="testp" ${spec.id === 'manual' ? 'disabled' : ''}>Baglantiyi test et</button>
      </div>
      <p class="help">Anahtarlar sadece bu bilgisayarda <span class="mono">data/providers.json</span> icinde tutulur; hicbir yere gonderilmez ve repoya girmez.</p>
      <div id="testout"></div>
    </div>

    <div class="card">
      <h2 style="color:#ff8fa3">TUM VERIYI SIL</h2>
      <p class="lead">Karakteri ve uretilen tum gorselleri kaldirir, sihirbaz sifirdan baslar.
      Karakter bir kez kilitlendigi icin yeni bir kisi yaratmanin tek yolu budur.</p>
      <div class="row">
        <button class="danger ghost" id="wipe">TUM VERIYI SIL</button>
      </div>
      <p class="help">Komut satirindan: <span class="mono">node reset.js --confirm</span></p>
    </div>`;

  const sel = document.getElementById('provsel');
  sel.onchange = async () => {
    await api('/api/saglayici/aktif', { id: sel.value });
    S.providers = await api('/api/saglayicilar');
    await refresh();
    renderSettings();
  };

  drawFields(list.find((p) => p.id === sel.value));

  document.getElementById('savep').onclick = async (e) => {
    const p = list.find((x) => x.id === sel.value);
    const config = {};
    for (const f of p.fields) {
      const el = document.getElementById(`pf_${f.key}`);
      if (!el) continue;
      config[f.key] = f.type === 'boolean' ? el.checked : (f.type === 'number' ? Number(el.value) : el.value);
    }
    e.target.disabled = true;
    try {
      await api('/api/saglayici', { id: p.id, config, makeActive: true });
      S.providers = await api('/api/saglayicilar');
      await refresh();
      toast('Kaydedildi.', 'ok');
      renderSettings();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      e.target.disabled = false;
    }
  };

  document.getElementById('testp').onclick = async (e) => {
    const out = document.getElementById('testout');
    e.target.disabled = true;
    e.target.innerHTML = '<span class="spin"></span>test ediliyor';
    out.innerHTML = '';
    try {
      const data = await api('/api/saglayici/test', {});
      out.innerHTML = `<div class="notice info" style="margin-top:16px"><b>Baglanti calisiyor.</b> ${esc(data.provider)} gorsel dondurdu.</div>
        <div class="gallery">${data.images.map((i) => `<div class="shot"><img src="${esc(i.url)}"><div class="meta">baglanti testi</div></div>`).join('')}</div>`;
      toast('Baglanti calisiyor.', 'ok');
    } catch (err) {
      out.innerHTML = `<div class="notice bad" style="margin-top:16px"><b>Baglanti kurulamadi.</b><br>${esc(err.message)}</div>`;
    } finally {
      e.target.disabled = false;
      e.target.textContent = 'Baglantiyi test et';
    }
  };

  document.getElementById('wipe').onclick = () => {
    modal('TUM VERIYI SIL', `
      <p>Karakter, galeri ve tum uretilen gorseller kaldirilacak. Sihirbaz sifirdan baslayacak.</p>
      <div class="field"><label>Onaylamak icin kutuya <b>SIFIRLA</b> yaz</label><input id="wipeconfirm" placeholder="SIFIRLA"></div>
      <label style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <input type="checkbox" id="wipehard" style="width:auto"> Kalici sil (arsivleme, geri alinamaz)
      </label>
      <label style="display:flex;gap:8px;align-items:center">
        <input type="checkbox" id="wipekeys" style="width:auto"> API anahtarlarini da sil
      </label>`,
    [
      { label: 'Vazgec', onClick: closeModal },
      {
        label: 'SIL',
        className: 'ghost danger',
        onClick: async () => {
          try {
            const data = await api('/api/sifirla', {
              confirm: document.getElementById('wipeconfirm').value.trim().toUpperCase(),
              hard: document.getElementById('wipehard').checked,
              keepProviders: !document.getElementById('wipekeys').checked,
            });
            closeModal();
            S.answers = {}; S.step = 0; S.scenes = []; S.scene = null; S.tab = 'kurulum';
            await refresh();
            toast(data.message, 'ok');
            render();
          } catch (err) {
            toast(err.message, 'bad');
          }
        },
      },
    ]);
  };

  function drawFields(p) {
    const box = document.getElementById('provfields');
    if (!p.fields.length) {
      box.innerHTML = '<p class="dim">Bu secenekte ayar yok.</p>';
      return;
    }
    box.innerHTML = p.fields.map((f) => {
      const val = p.config[f.key] != null && p.config[f.key] !== '' ? p.config[f.key] : (f.default != null ? f.default : '');
      const maskedNote = p.config[`${f.key}__set`]
        ? '<p class="help">🔒 Kayitli deger gizlendi. Degistirmeyeceksen dokunma; degistireceksen alanin tamamini yeniden yaz.</p>'
        : '';
      if (f.type === 'boolean') {
        return `<div class="field"><label style="display:flex;gap:8px;align-items:center">
          <input type="checkbox" id="pf_${f.key}" style="width:auto" ${val ? 'checked' : ''}> ${esc(f.label)}
        </label>${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}</div>`;
      }
      if (f.type === 'select') {
        return `<div class="field"><label>${esc(f.label)}</label>
          <select id="pf_${f.key}">${f.options.map((o) => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
          ${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}</div>`;
      }
      if (f.type === 'textarea') {
        return `<div class="field"><label>${esc(f.label)}${f.required ? ' *' : ''}</label>
          <textarea id="pf_${f.key}">${esc(val)}</textarea>
          ${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}${maskedNote}</div>`;
      }
      return `<div class="field"><label>${esc(f.label)}${f.required ? ' *' : ''}</label>
        <input id="pf_${f.key}" type="${f.type === 'password' ? 'text' : (f.type === 'number' ? 'number' : 'text')}"
               value="${esc(val)}" ${f.type === 'password' ? 'autocomplete="off" spellcheck="false"' : ''}>
        ${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}${maskedNote}</div>`;
    }).join('');
  }
}

/* ------------------------------------------------------------------- init */

(async function init() {
  try {
    await refresh();
    S.tab = S.status.hasCharacter ? 'karakter' : 'kurulum';
    render();
  } catch (err) {
    view.innerHTML = `<div class="notice bad">Panel yuklenemedi: ${esc(err.message)}</div>`;
  }
})();
