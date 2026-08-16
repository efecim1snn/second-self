/* Second Self - AI influencer karakter otomasyonu · panel */
'use strict';

const S = {
  tab: 'kurulum',
  status: null,
  questions: [],
  questionsRegion: null,
  answers: {},
  step: 0,
  providers: null,
  scenes: [],
  scene: null,
  plan: null,
  edit: null,      // karakter dosyasi formundaki bekleyen degisiklikler
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
  document.getElementById('modalbody').scrollTop = 0;
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

// Kapatmanin uc yolu olsun: kose X, ESC tusu, arka plana tiklama.
// Uzun listelerde alttaki buton gorunmezse bile pencere kapatilabilsin.
document.getElementById('modalclose').onclick = closeModal;
document.getElementById('modal').addEventListener('mousedown', (e) => {
  if (e.target.id === 'modal') closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function riskBadge(risk) {
  if (risk === 'yuksek') return '<span class="risk high">YUKSEK RISK</span>';
  if (risk === 'orta') return '<span class="risk mid">ORTA RISK</span>';
  return '';
}

/* ------------------------------------------------------------------ boot */

async function refresh() {
  S.status = await api('/api/durum');
  S.providers = await api('/api/saglayicilar');

  const c = S.status.character;
  document.getElementById('charline').textContent = c
    ? `${c.identity.name} · @${c.identity.handle} · ${c.life ? c.life.city : ''} · seed ${c.seed}`
    : 'karakter yok - sihirbaz bekliyor';

  const chip = document.getElementById('providerchip');
  const p = S.status.provider;
  chip.className = 'providerchip ' + (p.generates ? 'live' : 'none');
  chip.textContent = p.generates ? `Uretici: ${p.label}` : 'Uretici bagli degil';
}

function tabs() {
  const has = S.status && S.status.hasCharacter;
  const ref = S.status && S.status.reference;
  const refLabel = ref ? `Vesikalik ${ref.done}/${ref.total}` : 'Vesikalik';
  const items = has
    ? [['dosya', 'Karakter dosyasi'], ['vesikalik', refLabel], ['uretim', 'Uretim'], ['plan', 'Haftalik plan'], ['galeri', 'Galeri'], ['ayarlar', 'Ayarlar']]
    : [['kurulum', 'Kurulum'], ['ayarlar', 'Ayarlar']];
  if (!items.find((i) => i[0] === S.tab)) S.tab = items[0][0];
  tabsEl.innerHTML = items
    .map(([id, label]) => `<button data-tab="${id}" class="${S.tab === id ? 'on' : ''}">${esc(label)}</button>`)
    .join('');
  tabsEl.querySelectorAll('button').forEach((b) => {
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
  if (S.tab === 'dosya') return renderDossier();
  if (S.tab === 'vesikalik') return renderReference();
  if (S.tab === 'uretim') return renderProduction();
  if (S.tab === 'plan') return renderPlan();
  if (S.tab === 'galeri') return renderGallery();
  if (S.tab === 'ayarlar') return renderSettings();
}

/* ---------------------------------------------------------------- wizard */

async function loadQuestions() {
  const data = await api('/api/sorular', { answers: S.answers });
  S.questions = data.questions;
}

async function renderWizard() {
  // Sorular her adimda yeniden istenir: kita -> ulke -> sehir zinciri ve
  // kosullu sorular (memleket ayniysa memleket sorulari gizlenir) hep
  // guncel kalsin diye. Yerel istek, gecikmesi yok.
  await loadQuestions();
  const total = S.questions.length;
  if (S.step >= total) return renderWizardSummary();

  const q = S.questions[S.step];
  const pct = Math.round((S.step / total) * 100);
  const value = S.answers[q.key];
  const metaFor = (opt) => (q.meta || []).find((m) => m.value === opt);

  let input = '';

  if (q.type === 'select') {
    input = `<div class="choices">${q.options.map((o) =>
      `<button class="choice ${value === o ? 'on' : ''}" data-pick="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  } else if (q.type === 'select-or-text') {
    input = `<div class="choices">${q.options.map((o) =>
      `<button class="choice ${value === o ? 'on' : ''}" data-pick="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="field" style="margin-top:14px">
        <label>Listede yoksa kendin yaz</label>
        <input id="qinput" value="${esc(value && !q.options.includes(value) ? value : '')}" placeholder="orn. Lizbon, Portekiz">
      </div>`;
  } else if (q.type === 'multiselect') {
    const sel = Array.isArray(value) ? value : [];
    input = `<div class="choices">${q.options.map((o) => {
      const m = metaFor(o);
      return `<button class="choice ${sel.includes(o) ? 'on' : ''} ${m && m.risk === 'yuksek' ? 'risky' : ''}" data-multi="${esc(o)}">
        ${esc(o)} ${m ? riskBadge(m.risk) : ''}
      </button>`;
    }).join('')}</div>
      <p class="help">${sel.length} secildi (en az ${q.min}, en fazla ${q.max})</p>
      <div id="riskbox"></div>`;
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

  const sectionIdx = S.questions.filter((x) => x.section === q.section).indexOf(q) + 1;
  const sectionTotal = S.questions.filter((x) => x.section === q.section).length;

  view.innerHTML = `
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="card">
      <div class="stepnum">${esc(q.section || '')} · ${sectionIdx}/${sectionTotal} &nbsp;·&nbsp; toplam ${S.step + 1}/${total}</div>
      <h2 class="qtitle">${esc(q.label)}</h2>
      ${q.hint ? `<p class="qhint">${esc(q.hint)}</p>` : ''}
      ${input}
      <hr class="sep">
      <div class="row">
        <button class="ghost" id="back" ${S.step === 0 ? 'disabled' : ''}>Geri</button>
        <button class="btn" id="next">${S.step === total - 1 ? 'Ozete gec' : 'Devam'}</button>
        ${!q.required ? '<span class="dim" style="font-size:12px">opsiyonel</span>' : ''}
        <button class="ghost" id="skiprest" style="margin-left:auto">Kalanini sen doldur →</button>
      </div>
      <p class="help">"Kalanini sen doldur": geri kalan hayat sorularini verdigin cevaplarla tutarli sekilde otomasyon doldurur (gelir eve, ev ulasima, bolge sehre baglanir).</p>
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
      else if (v === 'Yok') { S.answers[q.key] = []; return renderWizard(); }
      else if (sel.length < q.max) sel.push(v);
      else return toast(`En fazla ${q.max} secebilirsin.`, 'bad');
      S.answers[q.key] = sel.filter((x) => x !== 'Yok');
      renderWizard();
    };
  });

  // Riskli secim uyarisi
  const riskbox = document.getElementById('riskbox');
  if (riskbox && q.meta) {
    const chosen = (Array.isArray(value) ? value : []).map(metaFor).filter((m) => m && m.risk !== 'dusuk');
    riskbox.innerHTML = chosen.length
      ? chosen.map((m) => `<div class="notice ${m.risk === 'yuksek' ? 'bad' : 'warn'}" style="margin-top:14px">
          <b>${esc(m.value)} — ${m.risk === 'yuksek' ? 'yuksek risk' : 'orta risk'}</b><br>${esc(m.note)}
        </div>`).join('')
      : '';
  }

  const back = document.getElementById('back');
  if (back) back.onclick = () => { S.step = Math.max(0, S.step - 1); renderWizard(); };
  document.getElementById('next').onclick = next;
  document.getElementById('skiprest').onclick = () => { collect(); S.step = total; renderWizard(); };

  function collect() {
    if (q.type === 'number') {
      S.answers[q.key] = Number(document.getElementById('qinput').value);
    } else if (q.type === 'text') {
      S.answers[q.key] = document.getElementById('qinput').value;
    } else if (q.type === 'select-or-text') {
      const typed = document.getElementById('qinput').value.trim();
      if (typed) S.answers[q.key] = typed;
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
      if ((q.type === 'select' || q.type === 'select-or-text') && !v) return toast('Bir secim yap ya da kendin yaz.', 'bad');
    }
    S.step++;
    renderWizard();
  }
}

function renderWizardSummary() {
  const rows = S.questions.map((q) => {
    let v = S.answers[q.key];
    if (q.type === 'measurements') {
      v = Object.entries(v || {}).map(([k, val]) => `${k.replace(/_/g, ' ')}: ${val}`).join(' · ');
    } else if (Array.isArray(v)) v = v.join(', ');
    return `<div class="idcell"><span>${esc(q.label)}</span><b>${esc(v || 'otomatik doldurulacak')}</b></div>`;
  }).join('');

  const risky = (S.answers.distinctive || [])
    .map((val) => (S.questions.find((q) => q.key === 'distinctive').meta || []).find((m) => m.value === val))
    .filter((m) => m && m.risk !== 'dusuk');

  view.innerHTML = `
    <div class="progress"><i style="width:100%"></i></div>
    ${risky.length ? risky.map((m) => `<div class="notice ${m.risk === 'yuksek' ? 'bad' : 'warn'}">
      <b>Uyari — ${esc(m.value)}</b><br>${esc(m.note)}
    </div>`).join('') : ''}
    <div class="card">
      <h1>Karakteri kilitliyoruz</h1>
      <p class="lead">Asagidaki kimlik <b>bir daha degistirilemez</b>. Her gorsel uretiminde kelimesi kelimesine
      ayni sekilde prompt'a girecek - tutarliligin sebebi bu. Bos biraktigin hayat sorulari, verdigin cevaplarla
      tutarli sekilde otomatik doldurulur. Degistirmek istersen tek yol: Ayarlar &gt; TUM VERIYI SIL.</p>
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
      S.tab = 'vesikalik';
      toast('Karakter olusturuldu ve kilitlendi. Simdi vesikalik setini uretelim.', 'ok');
      render();
    } catch (err) {
      toast(err.message, 'bad');
      e.target.disabled = false;
      e.target.textContent = 'Karakteri olustur ve kilitle';
    }
  };
}

/* ------------------------------------------------- soru -> form alani */

/**
 * Bir soruyu form alanina cevirir. Hem tek sayfalik sihirbaz hem karakter
 * dosyasi duzenleme formu bunu kullanir - boylece iki yerde ayni secenekler.
 */
function fieldHtml(q, value) {
  const id = `fld_${q.key}`;
  const meta = (opt) => (q.meta || []).find((m) => m.value === opt);

  if (q.type === 'select' || q.type === 'select-or-text') {
    const known = (q.options || []).includes(value);
    return `
      <div class="field">
        <label>${esc(q.label)}${q.required ? ' *' : ''}</label>
        <select id="${id}" data-key="${esc(q.key)}" data-type="${q.type}">
          ${(q.options || []).map((o) => `<option ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}
          ${q.type === 'select-or-text' ? `<option value="__custom__" ${value && !known ? 'selected' : ''}>— kendim yazacagim —</option>` : ''}
        </select>
        ${q.type === 'select-or-text'
          ? `<input id="${id}_txt" data-custom="${esc(q.key)}" style="margin-top:8px;${value && !known ? '' : 'display:none'}"
                    value="${esc(value && !known ? value : '')}" placeholder="listede yoksa buraya yaz">`
          : ''}
        ${q.hint ? `<p class="help">${esc(q.hint)}</p>` : ''}
      </div>`;
  }

  if (q.type === 'multiselect') {
    const sel = Array.isArray(value) ? value : [];
    return `
      <div class="field">
        <label>${esc(q.label)} <span class="dim">(en fazla ${q.max})</span></label>
        <div class="choices" data-multikey="${esc(q.key)}">
          ${(q.options || []).map((o) => {
            const m = meta(o);
            return `<button type="button" class="choice ${sel.includes(o) ? 'on' : ''} ${m && m.risk === 'yuksek' ? 'risky' : ''}" data-opt="${esc(o)}">
              ${esc(o)} ${m ? riskBadge(m.risk) : ''}</button>`;
          }).join('')}
        </div>
        ${q.hint ? `<p class="help">${esc(q.hint)}</p>` : ''}
      </div>`;
  }

  if (q.type === 'number') {
    return `<div class="field">
      <label>${esc(q.label)} <span class="dim">(${q.min}-${q.max})</span></label>
      <input type="number" id="${id}" data-key="${esc(q.key)}" data-type="number"
             min="${q.min}" max="${q.max}" value="${value != null ? value : q.default}">
      ${q.hint ? `<p class="help">${esc(q.hint)}</p>` : ''}
    </div>`;
  }

  if (q.type === 'measurements') {
    const m = value || {};
    return `<div class="field">
      <label>${esc(q.label)}</label>
      ${q.hint ? `<p class="help">${esc(q.hint)}</p>` : ''}
      <div class="grid3" data-meas="${esc(q.key)}">
        ${q.fields.map((f) => `
          <div class="field" style="margin-bottom:0">
            <label>${esc(f.label)}${f.required ? ' *' : ''} <span class="dim">(${f.min}-${f.max})</span></label>
            <input type="number" data-m="${f.key}" min="${f.min}" max="${f.max}"
                   value="${m[f.key] != null ? m[f.key] : (f.default != null ? f.default : '')}"
                   placeholder="${f.required ? 'zorunlu' : 'opsiyonel'}">
          </div>`).join('')}
      </div>
    </div>`;
  }

  return `<div class="field">
    <label>${esc(q.label)}${q.required ? ' *' : ''}</label>
    <input type="text" id="${id}" data-key="${esc(q.key)}" data-type="text"
           maxlength="${q.maxLength || 80}" value="${esc(value || '')}" placeholder="opsiyonel">
    ${q.hint ? `<p class="help">${esc(q.hint)}</p>` : ''}
  </div>`;
}

/** Formdaki tum alanlari toplayip cevap nesnesi kurar. */
function collectForm(root) {
  const out = {};
  root.querySelectorAll('[data-key]').forEach((el) => {
    const key = el.dataset.key;
    if (el.dataset.type === 'number') out[key] = Number(el.value);
    else if (el.dataset.type === 'select-or-text' && el.value === '__custom__') {
      const txt = root.querySelector(`[data-custom="${key}"]`);
      out[key] = txt ? txt.value.trim() : '';
    } else out[key] = el.value;
  });
  root.querySelectorAll('[data-multikey]').forEach((box) => {
    out[box.dataset.multikey] = Array.from(box.querySelectorAll('.choice.on')).map((b) => b.dataset.opt);
  });
  root.querySelectorAll('[data-meas]').forEach((box) => {
    const m = {};
    box.querySelectorAll('[data-m]').forEach((el) => { if (el.value !== '') m[el.dataset.m] = Number(el.value); });
    out[box.dataset.meas] = m;
  });
  return out;
}

/** Form etkilesimleri: cok secim, "kendim yazacagim", zincirli yeniden yukleme. */
function wireForm(root, onChainChange) {
  root.querySelectorAll('[data-multikey]').forEach((box) => {
    const max = Number(box.dataset.max || 2);
    box.querySelectorAll('.choice').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.opt === 'Yok') {
          box.querySelectorAll('.choice').forEach((x) => x.classList.remove('on'));
          return;
        }
        const on = box.querySelectorAll('.choice.on').length;
        if (!b.classList.contains('on') && on >= max) return toast(`En fazla ${max} secebilirsin.`, 'bad');
        b.classList.toggle('on');
      };
    });
  });
  root.querySelectorAll('select[data-type="select-or-text"]').forEach((sel) => {
    const txt = root.querySelector(`[data-custom="${sel.dataset.key}"]`);
    sel.addEventListener('change', () => {
      if (txt) txt.style.display = sel.value === '__custom__' ? '' : 'none';
    });
  });
  // Kita/ulke degisince alt listeler yenilenmeli
  ['continent', 'country', 'hometownMode', 'hometownContinent', 'hometownCountry'].forEach((key) => {
    const el = root.querySelector(`[data-key="${key}"]`);
    if (el) el.addEventListener('change', onChainChange);
  });
}

/* -------------------------------------------------------------- dossier */

async function renderDossier() {
  const c = S.status.character;
  const p = c.persona;
  const l = c.life || {};
  const risks = S.status.risks || [];
  const ref = S.status.reference;

  const data = await api('/api/sorular', { useSaved: true, answers: S.edit || {} });
  const questions = data.questions;
  const answers = data.answers || {};
  const bySection = {};
  for (const q of questions) (bySection[q.section] = bySection[q.section] || []).push(q);

  view.innerHTML = `
    <h1>${esc(c.identity.name)} <span class="dim">@${esc(c.identity.handle)}</span></h1>
    <p class="lead">
      seed <span class="mono">${c.seed}</span> · ${esc(l.city || '')} ·
      olusturuldu ${new Date(c.createdAt).toLocaleString('tr-TR')}
      ${c.updatedAt ? ` · guncellendi ${new Date(c.updatedAt).toLocaleString('tr-TR')}` : ''}
    </p>

    ${risks.length ? risks.map((r) => `<div class="notice ${r.risk === 'yuksek' ? 'bad' : 'warn'}">
      <b>${esc(r.value)} — ${r.risk === 'yuksek' ? 'yuksek risk' : 'orta risk'}</b><br>${esc(r.note)}
    </div>`).join('') : ''}

    ${ref && !ref.complete ? `<div class="notice warn">
      <b>Vesikalik seti eksik (${ref.done}/${ref.total}).</b> Icerik uretmeden once tamamla -
      yuz tutarliligini en cok yukselten adim budur.
    </div>` : ''}

    <div class="notice info">
      <b>Her sey buradan tek tek secilir.</b> Bir alani degistirip <b>Kaydet</b> dedigin an
      karakter dosyasi, ses rehberi ve prompt'lar yeniden uretilir.
      Gorunusu degistirirsen seed de degisir - daha once uretilmis vesikalik ve gorseller
      artik ayni kisiyi gostermeyebilir; kaydederken bunu sana soracagim.
    </div>

    <form id="charform">
      ${Object.entries(bySection).map(([section, qs]) => `
        <div class="card">
          <h2>${esc(section)}</h2>
          ${qs.map((q) => fieldHtml(q, answers[q.key])).join('')}
        </div>`).join('')}
    </form>

    <div class="card savebar">
      <div class="row">
        <button class="btn" id="savechar">Kaydet</button>
        <button class="ghost" id="revert">Degisiklikleri geri al</button>
        <span class="dim" id="savehint">Kimlik degisirse seed yeniden hesaplanir.</span>
      </div>
    </div>

    <div class="card">
      <h2>Fiziksel cekirdek</h2>
      <p class="help">Her prompt'a AYNEN bu satir girer. Tutarliligin %70'i budur.</p>
      <div class="core">${esc(S.status.identityLine)}</div>
      <div class="row" style="margin-top:12px"><button class="ghost" id="copycore">Kopyala</button></div>
    </div>

    <div class="card">
      <h2>Karakter hikayesi</h2>
      <p class="help">Cevaplarindan uretildi. Caption yazarken ve marka isbirligi degerlendirirken tek referans nokta.</p>
      <div class="dossier">${esc(c.dossier || '').split('\n\n').map((par) => `<p>${esc(par)}</p>`).join('')}</div>
    </div>

    <div class="grid2">
      <div class="card">
        <h2>Kisilik</h2>
        <div class="field"><label>Ozellikler</label>${p.traits.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
        <div class="field"><label>Konusma tonu</label>${esc(p.tone)}</div>
        <div class="field"><label>Imza kancasi</label>${esc(p.signatureHook)}</div>
      </div>
      <div class="card">
        <h2>Ses rehberi</h2>
        <div class="field"><label>Dil kaydi</label>${esc(p.voiceGuide.register)}</div>
        <div class="field"><label>Cumle uzunlugu</label>${esc(p.voiceGuide.sentenceLength)}</div>
        <div class="field"><label>Emoji kurali</label>${esc(p.voiceGuide.emojiRule)}</div>
      </div>
    </div>

    <div class="card">
      <h3>Icerik sutunlari</h3>
      <div>${p.contentPillars.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
    </div>`;

  const form = document.getElementById('charform');
  wireForm(form, async () => {
    S.edit = collectForm(form);
    await renderDossier();
  });

  document.getElementById('copycore').onclick = () => copy(S.status.identityLine);
  document.getElementById('revert').onclick = async () => {
    S.edit = null;
    await renderDossier();
    toast('Degisiklikler geri alindi.', 'ok');
  };
  document.getElementById('savechar').onclick = () => saveCharacter(collectForm(form));
}

async function saveCharacter(answers, clearReference) {
  const btn = document.getElementById('savechar');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span>kaydediliyor'; }
  try {
    const res = await api('/api/karakter/duzenle', { answers, clearReference: !!clearReference });
    S.edit = null;
    await refresh();

    if (res.referenceStale) {
      modal('Kimlik degisti', `
        <p>Gorunus degistigi icin <b>seed yeniden hesaplandi</b>. Daha once uretilmis
        vesikalik kareleri ve gorseller artik bu kisiyi gostermiyor olabilir.</p>
        <p>Vesikalik setini silip yeni kimlikle bastan uretmek ister misin?</p>`,
      [
        { label: 'Kalsin, ben karar veririm', onClick: () => { closeModal(); render(); } },
        {
          label: 'Vesikaligi sil ve bastan uret',
          className: 'btn',
          onClick: async () => {
            closeModal();
            await api('/api/karakter/duzenle', { answers, clearReference: true });
            await refresh();
            S.tab = 'vesikalik';
            render();
            toast('Vesikalik seti silindi. Yeni kimlikle bastan uretebilirsin.', 'ok');
          },
        },
      ]);
      return;
    }

    render();
    toast(res.identityChanged ? 'Kaydedildi. Kimlik degisti, seed yenilendi.' : 'Kaydedildi.', 'ok');
  } catch (err) {
    toast(err.message, 'bad');
    if (btn) { btn.disabled = false; btn.textContent = 'Kaydet'; }
  }
}

/* ------------------------------------------------------------ vesikalik */

async function renderReference() {
  const data = await api('/api/referans');
  const st = data.status;
  const generates = S.status.provider.generates;

  view.innerHTML = `
    <h1>Vesikalik seti</h1>
    <p class="lead">Karakter yaratildiktan sonraki <b>ilk is</b>. Yuzun 8 acidan vesikaligi cikarilir;
    bundan sonraki her uretimde referans olarak kullanilir. Tek bir kare yuzu sadece o acidan tanimlar -
    model karakteri yandan gostermek istediginde tahmin etmeye baslar ve yuz kayar. Bu set onu engeller.</p>

    <div class="notice info">
      <b>Karelerde degisen tek sey acidir.</b> Kiyafet (duz beyaz tisort), arka plan (duz acik gri),
      isik ve ifade birebir ayni tutulur. Degisen her ek degisken yuzu kaydirir.
      Bu set ayni zamanda LoRA egitimi veya platformda "karakter" olusturmak icin gereken minimum veri setidir.
      <br><br>
      <b>Once "Karakter sayfasi"ni uret.</b> Uc gorunumu tek karede birden cikarir; model ayni goruntu
      icinde kendini tutarli tutmak zorunda kaldigi icin, referans gorsel kabul etmeyen ucretsiz
      modellerde en tutarli sonucu veren yontem budur.
    </div>

    ${!generates ? `<div class="notice warn">
      <b>Uretici bagli degil.</b> Ayarlar'dan bir platform sec - varsayilan <b>Pollinations.ai ucretsiz ve
      anahtar istemiyor</b>. Ya da asagidan 8 prompt'u alip kendi aracinda uret, sonuclari elle ekle.
    </div>` : ''}

    ${generates && !S.status.provider.supportsReference ? `<div class="notice warn">
      <b>Dikkat: ${esc(S.status.provider.label)} referans gorsel kabul etmiyor.</b><br>
      Vesikaliklar uretilir ama platforma geri gonderilemez - bu yuzden acilar arasinda yuz, sac uzunlugu
      ve detaylar kayabilir. Yuzu <b>gercekten</b> kilitlemek icin referans destekleyen bir platform gerekir:
      Replicate veya fal.ai (IP-Adapter / redux modelleri), yerel ComfyUI (IPAdapter FaceID) veya
      "Ozel API" ile karakter referansi destekleyen bir servis. Ucretsiz secenek isin yapisini kurar,
      yuzu tam kilitlemez.
    </div>` : ''}

    <div class="card">
      <div class="row">
        <button class="btn" id="genall" ${!generates ? 'disabled' : ''}>
          ${st.complete ? 'Tumunu yeniden uret' : `Eksik ${st.missing.length} aciyi uret`}
        </button>
        <button class="ghost" id="prompts">8 prompt'u goster</button>
        <span class="dim">${st.done}/${st.total} tamam</span>
      </div>
      <div class="progress" style="margin-top:14px"><i style="width:${Math.round((st.done / st.total) * 100)}%"></i></div>
      <div id="refprogress"></div>
    </div>

    <div class="gallery" id="refgrid">
      ${st.angles.map((a) => `
        <div class="shot ${a.isPrimary ? 'golden' : ''}">
          ${a.shot
            ? `<img src="${esc(a.shot.url)}" loading="lazy">`
            : `<div class="placeholder">${esc(a.label)}<br><span class="dim">uretilmedi</span></div>`}
          <div class="meta">
            <b>${esc(a.label)}</b>${a.isPrimary ? ' <span class="badge">★ birincil</span>' : ''}
            <div class="row" style="margin-top:8px">
              <button class="ghost tiny" data-gen="${esc(a.key)}" ${!generates ? 'disabled' : ''}>
                ${a.shot ? 'Yenile' : 'Uret'}
              </button>
              ${a.shot ? `<button class="ghost tiny" data-primary="${esc(a.key)}">Birincil yap</button>` : ''}
            </div>
          </div>
        </div>`).join('')}
    </div>`;

  view.querySelectorAll('[data-gen]').forEach((b) => {
    b.onclick = () => generateAngles([b.dataset.gen]);
  });
  view.querySelectorAll('[data-primary]').forEach((b) => {
    b.onclick = async () => {
      await api('/api/referans/birincil', { angle: b.dataset.primary });
      await refresh();
      renderReference();
      toast('Birincil referans degistirildi.', 'ok');
    };
  });
  document.getElementById('genall').onclick = () => {
    const targets = st.complete ? st.angles.map((a) => a.key) : st.missing;
    generateAngles(targets);
  };
  document.getElementById('prompts').onclick = async () => {
    const { prompts } = await api('/api/referans/promptlar', {});
    modal('Vesikalik promptlari', prompts.map((p) => `
      <div class="field"><label>${esc(p.label)}</label>
      <div class="core" style="max-height:120px;overflow:auto">${esc(p.built.prompt)}</div></div>`).join(''),
    [
      { label: 'Hepsini kopyala', onClick: () => copy(prompts.map((p) => `### ${p.label}\n${p.built.prompt}`).join('\n\n')) },
      { label: 'Kapat', className: 'btn', onClick: closeModal },
    ]);
  };
}

async function generateAngles(keys) {
  if (S.busy) return;
  S.busy = true;
  const box = document.getElementById('refprogress');
  const btn = document.getElementById('genall');
  if (btn) btn.disabled = true;

  let done = 0;
  for (const key of keys) {
    box.innerHTML = `<p class="help"><span class="spin"></span>${esc(key)} uretiliyor... (${done}/${keys.length})</p>`;
    try {
      await api('/api/referans/uret', { angle: key });
      done++;
    } catch (err) {
      box.innerHTML = `<div class="notice bad" style="margin-top:14px"><b>${esc(key)} uretilemedi.</b><br>${esc(err.message)}</div>`;
      S.busy = false;
      if (btn) btn.disabled = false;
      toast(err.message.slice(0, 160), 'bad');
      return;
    }
  }

  S.busy = false;
  await refresh();
  await renderReference();
  toast(`${done} vesikalik uretildi.`, 'ok');
}

/* ------------------------------------------------------------ production */

async function renderProduction() {
  if (!S.scenes.length) {
    const data = await api('/api/sahneler', { count: 12 });
    S.scenes = data.scenes;
    S.scene = S.scenes[0];
  }
  const generates = S.status.provider.generates;
  const ref = S.status.reference;

  view.innerHTML = `
    <h1>Uretim</h1>
    <p class="lead">Kimlik sabit; degisen tek sey poz, kiyafet, ortam ve isik.
    Gorsel <b>bagladigin API'den</b> gelir - bu otomasyonun kendi gorsel havuzu yoktur.</p>

    ${ref && !ref.complete ? `<div class="notice warn">
      <b>Vesikalik seti eksik (${ref.done}/${ref.total}).</b> Once onu tamamlaman tutarliligi ciddi artirir.
    </div>` : ''}

    <div class="card">
      <h2>Ne yapmasini istiyorsun?</h2>
      <p class="help">Serbest yaz: "kahve reklami yap", "spor salonunda foto", "sokakta kombin cekimi",
      "otel isbirligi". Otomasyon bunu karakterin sehrine, gelirine ve gardirobuna uygun bir sahneye cevirir.</p>
      <div class="row">
        <input id="brieftext" placeholder="orn. kahve reklami yap" style="flex:1;min-width:260px">
        <button class="ghost" id="briefgo">Sahneye cevir</button>
      </div>
      <div id="briefout"></div>
    </div>

    <div class="card">
      <h2>Ya da hazir sahnelerden sec</h2>
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
        <div class="field"><label>Ek detay</label><input id="f_extra" value="${esc(S.scene.extra || '')}" placeholder="istedigin ekstra tarif"></div>
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
  document.getElementById('reroll').onclick = async () => { S.scenes = []; await renderProduction(); };
  document.getElementById('preview').onclick = () => showPrompts(currentScene());
  document.getElementById('gen').onclick = () => generate(currentScene());

  document.getElementById('briefgo').onclick = async () => {
    const text = document.getElementById('brieftext').value.trim();
    if (!text) return toast('Once ne istedigini yaz.', 'bad');
    const out = document.getElementById('briefout');
    out.innerHTML = '<p class="help"><span class="spin"></span>sahne kuruluyor...</p>';
    try {
      const data = await api('/api/brief', { text });
      S.scene = data.scene;
      S.scenes = [data.scene, ...S.scenes.filter((s) => s.category !== 'brief')];
      await renderProduction();
      document.getElementById('brieftext').value = text;
      document.getElementById('briefout').innerHTML =
        `<div class="notice info" style="margin-top:14px"><b>Sahne hazir: ${esc(data.scene.categoryLabel)}</b><br>
         Asagidaki alanlar dolduruldu. Istersen elle degistir, sonra URET'e bas.</div>`;
    } catch (err) {
      out.innerHTML = `<div class="notice bad" style="margin-top:14px">${esc(err.message)}</div>`;
    }
  };

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
  const entries = Object.entries(data.all || {});
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
    ${entries.length ? `<div class="card">
      <h2>Diger platformlarin dili</h2>
      ${entries.map(([key, v]) => `
        <div class="field">
          <label>${esc(v.dialectLabel)}</label>
          <div class="core">${esc(v.prompt)}</div>
          <div class="row" style="margin-top:8px"><button class="ghost" data-copyd="${key}">Kopyala</button></div>
        </div>`).join('')}
    </div>` : ''}`;

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
    ${esc(S.status.provider.label)} calisiyor...</div>`;

  try {
    const data = await api('/api/uret', { scene, count });
    out.innerHTML = `
      <div class="card">
        <h2>Uretildi · ${data.images.length} gorsel · ${(data.tookMs / 1000).toFixed(1)} sn</h2>
        <p class="help">Kaynak: ${esc(data.provider.label)} · seed ${data.prompt.seed != null ? data.prompt.seed : 'yok'}</p>
        <div class="gallery">${data.images.map((i) => `
          <div class="shot"><img src="${esc(i.url)}" loading="lazy">
            <div class="meta">${esc(i.category || '')}</div>
          </div>`).join('')}</div>
      </div>
      <div class="card"><h3>Kullanilan prompt</h3><div class="core">${esc(data.prompt.prompt)}</div></div>`;
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

/* ------------------------------------------------------------------ plan */

async function renderPlan() {
  if (!S.plan) S.plan = (await api('/api/plan')).plan;
  const l = S.status.character.life || {};

  view.innerHTML = `
    <h1>Haftalik plan</h1>
    <p class="lead">Karakterin gercek bir insan gibi haftasi. Gunluk ritmi (<b>${esc(l.routine || '')}</b>),
    mesleği (<b>${esc(l.occupation || '')}</b>) ve ilgi alanlarindan uretildi.
    Her gunun sahnesi hazir - "Uret" dedigin an bagli API'ye gider.</p>

    <div class="grid2">
      ${S.plan.map((d, i) => `
        <div class="card">
          <h3>${esc(d.day)} · ${esc(d.label)}</h3>
          <p class="help">${esc(d.note)}</p>
          <div class="core" style="max-height:90px;overflow:auto">${esc(d.scene.pose)} — ${esc(d.scene.setting)}</div>
          <div class="row" style="margin-top:12px">
            <button class="ghost tiny" data-planuret="${i}">Uret</button>
            <button class="ghost tiny" data-planuretim="${i}">Uretim'e gonder</button>
          </div>
          <div id="planout${i}"></div>
        </div>`).join('')}
    </div>`;

  view.querySelectorAll('[data-planuretim]').forEach((b) => {
    b.onclick = () => {
      S.scene = S.plan[Number(b.dataset.planuretim)].scene;
      S.scenes = [S.scene, ...S.scenes];
      S.tab = 'uretim';
      render();
    };
  });
  view.querySelectorAll('[data-planuret]').forEach((b) => {
    b.onclick = async () => {
      const i = Number(b.dataset.planuret);
      const box = document.getElementById(`planout${i}`);
      b.disabled = true;
      box.innerHTML = '<p class="help"><span class="spin"></span>uretiliyor...</p>';
      try {
        const data = await api('/api/uret', { scene: S.plan[i].scene, count: 1 });
        box.innerHTML = `<div class="gallery" style="margin-top:12px">${data.images.map((im) =>
          `<div class="shot"><img src="${esc(im.url)}"></div>`).join('')}</div>`;
      } catch (err) {
        box.innerHTML = `<div class="notice bad" style="margin-top:12px">${esc(err.message)}</div>`;
      } finally {
        b.disabled = false;
      }
    };
  });
}

/* ---------------------------------------------------------------- gallery */

function renderGallery() {
  const g = S.status.gallery;
  view.innerHTML = `
    <h1>Galeri</h1>
    <p class="lead">Hepsi bagladigin uretim API'sinden geldi.</p>
    ${g.length ? `<div class="gallery">${g.map((i) => `
      <div class="shot ${i.isGolden ? 'golden' : ''}">
        <img src="${esc(i.url)}" loading="lazy">
        <div class="meta">
          ${i.isGolden ? '<span class="badge">★ birincil referans</span><br>' : ''}
          ${esc(i.category || '')} · ${esc(i.providerLabel || i.provider || '')}<br>
          ${new Date(i.createdAt).toLocaleString('tr-TR')}
          <div class="row" style="margin-top:8px">
            <button class="ghost tiny" data-prompt="${esc(i.id)}">Prompt</button>
          </div>
        </div>
      </div>`).join('')}</div>`
      : `<div class="empty">Henuz gorsel yok.<br><br>
         <span class="dim">Bu otomasyon gorsel uretmez ve stok gorsel kullanmaz -
         once vesikalik setini uret.</span></div>`}`;

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
      Gorseli <b>bagli platform</b> uretir. Varsayilan olarak <b>Pollinations.ai</b> secilidir:
      ucretsiz, API anahtari istemez, kurulumdan hemen sonra calisir.
      Kaliteyi yukseltmek istersen kendi platformunu bagla; listede olmayan her sey icin <b>"Ozel API"</b> var.
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
        <p class="help">${esc(spec.blurb || '')}</p>
        ${spec.docs ? `<p class="help">Dokuman: <a href="${esc(spec.docs)}" target="_blank" rel="noreferrer">${esc(spec.docs)}</a></p>` : ''}
      </div>
      <div id="provfields"></div>
      <div class="row">
        <button class="btn" id="savep">Kaydet</button>
        <button class="ghost" id="testp" ${spec.id === 'manual' ? 'disabled' : ''}>Baglantiyi test et</button>
      </div>
      <p class="help">Anahtarlar sadece bu bilgisayarda <span class="mono">data/providers.json</span> icinde tutulur.</p>
      <div id="testout"></div>
    </div>

    <div class="card">
      <h2 style="color:#ff8fa3">TUM VERIYI SIL</h2>
      <p class="lead">Karakteri, vesikalik setini ve uretilen tum gorselleri kaldirir; sihirbaz sifirdan baslar.
      Karakter bir kez kilitlendigi icin yeni bir insan yaratmanin tek yolu budur.</p>
      <div class="row"><button class="danger ghost" id="wipe">TUM VERIYI SIL</button></div>
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
      <p>Karakter, vesikalik seti, galeri ve tum uretilen gorseller kaldirilacak.</p>
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
            S.answers = {}; S.step = 0; S.scenes = []; S.scene = null; S.plan = null;
            S.questions = []; S.questionsRegion = null; S.tab = 'kurulum';
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
      box.innerHTML = '<p class="dim">Bu secenekte ayar yok - dogrudan kullanabilirsin.</p>';
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
        <input id="pf_${f.key}" type="${f.type === 'number' ? 'number' : 'text'}"
               value="${esc(val)}" ${f.type === 'password' ? 'autocomplete="off" spellcheck="false"' : ''}>
        ${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}${maskedNote}</div>`;
    }).join('');
  }
}

/* ------------------------------------------------------------------- init */

(async function init() {
  try {
    await refresh();
    S.tab = S.status.hasCharacter ? 'dosya' : 'kurulum';
    render();
  } catch (err) {
    view.innerHTML = `<div class="notice bad">Panel yuklenemedi: ${esc(err.message)}</div>`;
  }
})();
