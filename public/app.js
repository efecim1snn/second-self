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
  studios: [],
  studio: 'karakter',
  design: {},      // etsy/reklam tasarim formu
  upscaler: undefined, // undefined = henuz sorulmadi, null = bagli arac yok
  captionPlatform: 'instagram',
  cikti: null,        // masaustu cikti ayari
  sonKlasor: null,    // son uretimin is klasoru adi (metin oraya yazilsin diye)
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

function modal(title, bodyHtml, actions, opts = {}) {
  const m = document.getElementById('modal');
  document.getElementById('modaltitle').textContent = title;
  document.getElementById('modalbody').innerHTML = bodyHtml;
  document.getElementById('modalbody').scrollTop = 0;
  const kutu = m.querySelector('.modalbox');
  if (kutu) kutu.classList.toggle('wide', !!opts.wide);
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
function closeModal() {
  const m = document.getElementById('modal');
  m.hidden = true;
  const kutu = m.querySelector('.modalbox');
  if (kutu) kutu.classList.remove('wide');
}

/**
 * REFERANS DURUMU BANNER'I - tek yerden.
 *
 * Eskiden buradaki kosul `supportsReference` bayragina bakiyordu ve o bayrak
 * yalan soyluyordu: ComfyUI ve alan adi girilmemis Replicate/fal HICBIR uyari
 * gostermiyordu, yani sessizlik "yuz kilidi acik" anlamina geliyordu.
 * Artik uc durum var ve durum kullanicinin ayarina gore hesaplaniyor.
 */
function referenceBanner(kisa = false) {
  const p = S.status && S.status.provider;
  if (!p || !p.generates) return '';
  const durum = p.referenceState || (p.supportsReference ? 'ready' : 'none');

  if (durum === 'ready') {
    if (kisa) return '';
    return `<div class="notice ok">
      <b>Yuz kilidi acik.</b> ${esc(p.label)} referans kareyi kabul ediyor -
      uretilen her kare vesikalik setindeki en yakin aciyla eslestirilerek gonderiliyor.
    </div>`;
  }

  if (durum === 'needs-config') {
    return `<div class="notice bad">
      <b>Yuz kilidi KAPALI.</b> ${esc(p.label)} referans gorseli destekliyor ama
      <b>su anki ayarla gonderilmiyor</b>.<br>
      ${p.referenceReason ? `${esc(p.referenceReason)}<br>` : ''}
      ${p.referenceFix ? `<br><b>Yapilacak:</b> ${esc(p.referenceFix)}` : ''}
      <div class="row" style="margin-top:10px">
        <button class="ghost tiny" data-goto-settings="1">Ayarlara git</button>
      </div>
    </div>`;
  }

  // none
  if (kisa) {
    return `<div class="notice warn">
      <b>${esc(p.label)} referans gorsel kabul etmiyor.</b> Acilar arasinda yuz kayabilir.
    </div>`;
  }
  return `<div class="notice warn">
    <b>Dikkat: ${esc(p.label)} referans gorsel kabul etmiyor.</b><br>
    Vesikaliklar uretilir ama platforma geri gonderilemez - bu yuzden acilar arasinda yuz, sac uzunlugu
    ve detaylar kayabilir. Yuzu <b>gercekten</b> kilitlemek icin referans destekleyen bir platform gerekir:
    Replicate veya fal.ai (IP-Adapter / redux modelleri), yerel ComfyUI (IPAdapter FaceID) veya
    "Ozel API" ile karakter referansi destekleyen bir servis. Ucretsiz secenek isin yapisini kurar,
    yuzu tam kilitlemez.
  </div>`;
}

// Banner'daki "Ayarlara git" butonu. Olay devri: her render'da yeniden
// baglamak gerekmesin diye tek sefer, kapsayici uzerinde dinleniyor.
view.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-goto-settings]');
  if (!b) return;
  S.tab = 'ayarlar';
  render();
});

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

  S.studios = S.status.studios || [];
  S.studio = S.status.activeStudio || 'karakter';
  studioBar();

  const chip = document.getElementById('providerchip');
  const p = S.status.provider;
  chip.className = 'providerchip ' + (p.generates ? 'live' : 'none');
  chip.textContent = p.generates ? `Uretici: ${p.label}` : 'Uretici bagli degil';
}

/** Ust bardaki studyo gecisi: kim ne uretmek istiyorsa ona tiklar. */
function studioBar() {
  const bar = document.getElementById('studiobar');
  if (!bar) return;
  bar.innerHTML = S.studios.map((st) => `
    <button data-studio="${esc(st.id)}" class="${S.studio === st.id ? 'on' : ''}" title="${esc(st.tagline || '')}">
      <span>${esc(st.icon || '')}</span> ${esc(st.label)}
    </button>`).join('');
  bar.querySelectorAll('button').forEach((b) => {
    b.onclick = async () => {
      if (b.dataset.studio === S.studio) return;
      await api('/api/studyolar/aktif', { id: b.dataset.studio });
      S.studio = b.dataset.studio;
      S.tab = null;
      await refresh();
      render();
    };
  });
}

function studioTabs() {
  const st = S.studios.find((x) => x.id === S.studio);
  if (!st) return [['ayarlar', 'Ayarlar']];
  if (S.studio === 'karakter') {
    const has = S.status && S.status.hasCharacter;
    const ref = S.status && S.status.reference;
    const refLabel = ref ? `Vesikalik ${ref.done}/${ref.total}` : 'Vesikalik';
    return has
      ? [['dosya', 'Karakter dosyasi'], ['vesikalik', refLabel], ['uretim', 'Uretim'], ['plan', 'Haftalik plan'], ['galeri', 'Galeri'], ['ayarlar', 'Ayarlar']]
      : [['kurulum', 'Kurulum'], ['ayarlar', 'Ayarlar']];
  }
  return [...st.tabs.map((t) => [t.id, t.label]), ['ayarlar', 'Ayarlar']];
}

function tabs() {
  const items = studioTabs();
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

/* ------------------------------------------------------------ karsilama */

/**
 * Ilk acilista bir kez gosterilir. Otomasyonu ENGELLEMEZ - "Simdilik gec"
 * tek tikla gecer ve bir daha cikmaz. Affiliate oldugu acikca yazili.
 */
async function renderWelcome() {
  const { welcome: w } = await api('/api/karsilama');
  tabsEl.innerHTML = '';

  view.innerHTML = `
    <div class="card" style="max-width:760px;margin:0 auto">
      <h1>${esc(w.title)}</h1>
      ${w.body.map((p) => `<p class="lead">${esc(p)}</p>`).join('')}

      <div class="field">
        <label>Ne ise yariyor</label>
        <ul class="help" style="margin:0;padding-left:18px;line-height:1.9">
          ${w.usedFor.map((u) => `<li>${esc(u)}</li>`).join('')}
        </ul>
      </div>

      <hr class="sep">
      <h2>${esc(w.question)}</h2>
      <div class="row">
        ${w.options.map((o) => `<button class="${o.key === 'gec' ? 'ghost' : 'btn'}" data-ans="${esc(o.key)}">${esc(o.label)}</button>`).join('')}
      </div>

      <div id="offer" hidden style="margin-top:18px">
        <div class="notice info">
          <p style="margin:0 0 10px">${esc(w.offer.text)}</p>
          <p style="margin:0 0 12px">
            <a href="${esc(w.offer.url)}" target="_blank" rel="noreferrer noopener"><b>${esc(w.offer.linkLabel)}</b></a>
          </p>
          <p class="help" style="margin:0">${esc(w.offer.disclosure)}</p>
        </div>
        <div class="row" style="margin-top:14px">
          <button class="btn" data-ans="gec">Otomasyona gec</button>
        </div>
      </div>
    </div>`;

  view.querySelectorAll('[data-ans]').forEach((b) => {
    b.onclick = async () => {
      const answer = b.dataset.ans;
      // "Hayir, bakayim" secilirse once teklifi goster, gecis butonuyla devam.
      if (answer === 'yok' && document.getElementById('offer').hidden) {
        document.getElementById('offer').hidden = false;
        return;
      }
      await api('/api/karsilama', { answer });
      await refresh();
      S.tab = S.status.hasCharacter ? 'dosya' : 'kurulum';
      render();
    };
  });
}

async function render() {
  // Karsilama yalnizca bir kez, en basta.
  if (S.status && S.status.app && !S.status.app.welcomeSeen) return renderWelcome();
  tabs();
  if (S.tab === 'ayarlar') return renderSettings();
  if (S.studio === 'etsy') return renderStudioDesign('etsy');
  if (S.studio === 'reklam') return renderStudioDesign('reklam');
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
    // life.autoFill YALNIZCA hayat sorularini dolduruyor. Gorunus ve yuz
    // alanlarinda "otomatik doldurulacak" yazmak yalan olurdu: bos birakilan
    // gorunus alani prompt'a hic girmez, uydurulmaz.
    const bosMetin = q.section === 'Hayat' ? 'otomatik doldurulacak' : 'belirtilmedi - prompta girmez';
    return `<div class="idcell"><span>${esc(q.label)}</span><b>${esc(v || bosMetin)}</b></div>`;
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
        <p class="help">Gonderi metni motoru bu rehbere gore yaziyor.</p>
        ${(() => {
          // Korumasiz okuma eski/elle duzenlenmis dosyalarda paneli kiriyordu.
          const vg = p.voiceGuide || {};
          const satir = (etiket, deger) => deger
            ? `<div class="field"><label>${esc(etiket)}</label>${esc(deger)}</div>`
            : '';
          return [
            satir('Dil kaydi', vg.register),
            satir('Cumle uzunlugu', vg.sentenceLength),
            satir('Emoji kurali', vg.emojiRule),
            satir('Bitis bicimi', vg.ctaStyle),
            satir('Emoji seti', p.emojiStyle),
            Array.isArray(vg.openers) && vg.openers.length
              ? `<div class="field"><label>Acilis kaliplari</label>${vg.openers.map((o) => esc(o)).join('<br>')}</div>`
              : '',
            Array.isArray(vg.avoid) && vg.avoid.length
              ? `<div class="field"><label>Kacinilacaklar</label>${vg.avoid.map((o) => esc(o)).join(' · ')}</div>`
              : '',
          ].filter(Boolean).join('');
        })()}
      </div>
    </div>

    <div class="card">
      <h3>Icerik sutunlari</h3>
      <div>${p.contentPillars.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
    </div>

    <div class="card savebar">
      <div class="row">
        <button class="btn" id="savechar">Kaydet</button>
        <button class="ghost" id="revert">Degisiklikleri geri al</button>
        <span class="dim">Kimlik degisirse seed yeniden hesaplanir.</span>
      </div>
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

    ${referenceBanner()}

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
    S.realismOptions = data.realism || [];
  }
  const generates = S.status.provider.generates;
  const ref = S.status.reference;
  if (!S.realism) S.realism = 'ultra';

  view.innerHTML = `
    <h1>Uretim</h1>
    <p class="lead">Kimlik sabit; degisen tek sey poz, kiyafet, ortam ve isik.
    Gorsel <b>bagladigin API'den</b> gelir - bu otomasyonun kendi gorsel havuzu yoktur.</p>

    ${ref && !ref.complete ? `<div class="notice warn">
      <b>Vesikalik seti eksik (${ref.done}/${ref.total}).</b> Once onu tamamlaman tutarliligi ciddi artirir.
    </div>` : ''}

    ${referenceBanner(true)}

    ${S.status.provider.active === 'pollinations' ? `<div class="notice bad">
      <b>Ucretsiz saglayici FOTOGRAF GERCEKCILIGI veremez.</b><br>
      Pollinations su an yalnizca <span class="mono">sana</span> modelini sunuyor. SANA hiz icin
      damitilmis bir modeldir; cilt gozenegi, ince tuy ve gercek deri dokusu uretmez - ciktilar
      puruzsuz ve "AI cizimi" gibi durur. <b>Bu prompt ile duzelmez, modelin sinirdir.</b><br><br>
      Kompozisyon, mekan, poz ve kadraj denemek icin kullan. Gercekten ayirt edilemeyecek sonuc icin
      Ayarlar'dan <b>Replicate</b> (FLUX.1-dev), <b>fal.ai</b> veya yerel <b>Stable Diffusion</b>
      (RealVisXL / epiCRealism gibi gercekcilik modelleri) bagla.
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

    <div class="card" id="captioncard">
      <h2>Gonderi metni</h2>
      <p class="help">Karakterin KENDI sesiyle yazilir (burcu, egitimi, ilgi alanlari ve ses rehberi).
      Yerel uretilir - harici bir yapay zeka servisi ya da kredi gerekmez.
      Asagidaki sahne neyse metin de o sahne icin yazilir.</p>
      <div class="choices" id="platlist">
        ${CAPTION_PLATFORMS.map((p) => `<button class="choice ${S.captionPlatform === p.id ? 'on' : ''}" data-plat="${p.id}">
          <b>${esc(p.label)}</b><br><span class="dim" style="font-size:12px">${p.max} karakter</span>
        </button>`).join('')}
      </div>
      <div class="row" style="margin-top:10px">
        <label style="display:flex;gap:8px;align-items:center">
          <input type="checkbox" id="f_ailabel" style="width:auto" checked> AI etiketi ekle
        </label>
        <button class="ghost" id="captiongo">Metin uret</button>
      </div>
      <div id="captionout"></div>
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
        <div class="field">
          <label>Gercekcilik</label>
          <select id="f_realism">
            ${(S.realismOptions || []).map((o) => `<option value="${esc(o.key)}" ${S.realism === o.key ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
          </select>
          <p class="help">Ultra = "AI portresi" degil, birinin telefonuyla cektigi an gibi. En gercekci sonucu bu verir.</p>
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

  // Gonderi metni: gorselle AYNI sahneyi kullanir, yoksa metin baska bir
  // kareyi anlatir.
  view.querySelectorAll('[data-plat]').forEach((b) => {
    b.onclick = () => {
      S.captionPlatform = b.dataset.plat;
      view.querySelectorAll('[data-plat]').forEach((x) => x.classList.toggle('on', x === b));
    };
  });

  const capBtn = document.getElementById('captiongo');
  if (capBtn) {
    capBtn.onclick = async () => {
      const box = document.getElementById('captionout');
      capBtn.disabled = true;
      box.innerHTML = '<div class="card"><span class="spin"></span>metin yaziliyor...</div>';
      try {
        const data = await api('/api/metin', {
          scene: currentScene(),
          platform: S.captionPlatform,
          variants: 3,
          aiLabel: document.getElementById('f_ailabel').checked,
          // Bu oturumda gorsel uretildiyse metin ONUN klasorune yazilir.
          exportTo: S.sonKlasor || undefined,
        });
        if (data.export) S.sonKlasor = data.export.name;
        renderCaptions(box, data);
      } catch (err) {
        box.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`;
      } finally {
        capBtn.disabled = false;
      }
    };
  }

  function currentScene() {
    S.realism = document.getElementById('f_realism').value;
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
      realism: S.realism,
    };
  }
}

// NOT: asagidaki "prompt" kartlari GORSEL MODELI dilidir (flux/sdxl/midjourney).
// Gonderi metni kartindaki "platform" ise SOSYAL PLATFORMDUR. Iki ayri kavram.
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
    // Metin de ayni isin klasorune yazilsin diye hatirla.
    S.sonKlasor = data.export ? data.export.name : null;
    out.innerHTML = `
      ${exportBar(data.export)}
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
            <button class="ghost tiny" data-planmetin="${i}">Metin uret</button>
            <button class="ghost tiny" data-planuretim="${i}">Uretim'e gonder</button>
          </div>
          <div id="planout${i}"></div>
        </div>`).join('')}
    </div>`;

  // Plan gununden gonderi metni: gorsel uretmeden, bagli API gerekmeden.
  view.querySelectorAll('[data-planmetin]').forEach((b) => {
    b.onclick = async () => {
      const i = Number(b.dataset.planmetin);
      const box = document.getElementById(`planout${i}`);
      b.disabled = true;
      box.innerHTML = '<p class="help"><span class="spin"></span>metin yaziliyor...</p>';
      try {
        const data = await api('/api/metin', {
          scene: S.plan[i].scene,
          platform: S.captionPlatform,
          variants: 1,
        });
        renderCaptions(box, data);
      } catch (err) {
        box.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`;
      } finally {
        b.disabled = false;
      }
    };
  });

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

/* ------------------------------------------------ tasarim studyolari */

/**
 * Etsy ve Reklam studyolari ayni kalibi kullanir: form -> canli SVG onizleme
 * -> baskiya hazir PNG. Ikisi de tamamen yerel ve bedava calisir.
 */
const STUDIO_FORMS = {
  etsy: {
    title: 'Baskiya hazir tasarim',
    lead: 'Tipografi tasarimlari tamamen yerel uretilir - AI gerekmez, bedava ve sinirsizdir. Cikti seffaf PNG, 300 DPI.',
    fields: [
      { key: 'lines', label: 'Tasarim metni (her satir ayri)', type: 'lines', rows: 4, placeholder: 'POWERED BY\nCOFFEE\nAND CAT HAIR' },
      { key: 'layout', label: 'Dizilim', type: 'select', from: 'layouts' },
      { key: 'palette', label: 'Renk', type: 'select', from: 'palettes' },
      { key: 'font', label: 'Yazi tipi', type: 'select', from: 'fonts' },
      { key: 'size', label: 'Urun / olcu', type: 'select', from: 'sizes' },
      {
        key: 'uppercase',
        label: 'BUYUK HARFE cevir',
        type: 'boolean',
        default: true,
        help: 'Kapatirsan yazdigin gibi kalir. Serif ve el yazisi tipleri kucuk harfle cok daha iyi duruyor - bu kapali olmadan o iki yazi tipi fiilen kullanilamiyordu.',
      },
    ],
  },
  reklam: {
    title: 'Reklam gorseli',
    lead: 'Sosyal medya reklam, kampanya, duyuru ve etkinlik gorselleri. AI gerekmez: yazi isi vektorle daha keskin cikar.',
    fields: [
      { key: 'brand', label: 'Marka / ust satir', type: 'text', placeholder: 'MARKA ADI' },
      { key: 'badge', label: 'Rozet (kampanya orani vb.)', type: 'text', placeholder: '%40' },
      { key: 'headline', label: 'Ana baslik', type: 'text', placeholder: 'Sezon sonu indirimi' },
      { key: 'sub', label: 'Alt metin', type: 'text', placeholder: 'Secili urunlerde gecerlidir.' },
      { key: 'cta', label: 'Cagri butonu', type: 'text', placeholder: 'Hemen incele' },
      { key: 'footer', label: 'Alt satir (site / tarih / adres)', type: 'text', placeholder: 'site.com' },
      { key: 'layout', label: 'Dizilim', type: 'select', from: 'layouts' },
      { key: 'theme', label: 'Tema', type: 'select', from: 'themes' },
      { key: 'size', label: 'Olcu', type: 'select', from: 'sizes' },
    ],
  },
};

async function renderStudioDesign(studioId) {
  if (S.tab === 'arsiv') return renderStudioArchive(studioId);
  if (studioId === 'etsy' && S.tab === 'listeleme') return renderEtsyListing();
  if (studioId === 'etsy' && S.tab === 'pazar') return renderEtsyPazar();

  const spec = STUDIO_FORMS[studioId];
  const opts = await api('/api/' + studioId + '/secenekler');
  if (!S.design[studioId]) S.design[studioId] = defaultsFor(spec, opts);
  const d = S.design[studioId];

  view.innerHTML = `
    <h1>${esc(spec.title)}</h1>
    <p class="lead">${esc(spec.lead)}</p>

    ${opts.pngHazir ? '' : `<div class="notice warn">
      Sistemde Chrome/Edge bulunamadi; PNG uretilemiyor. Tasarimi SVG olarak indirip
      kendi aracinda PNG'ye cevirebilirsin.</div>`}

    <div class="grid2">
      <div class="card">
        <h2>Ayarlar</h2>
        <form id="dform">${spec.fields.map((f) => designField(f, d, opts)).join('')}</form>
        <div id="dsatiruyari"></div>
        <div class="row">
          <button type="button" class="btn" id="dgen">PNG uret</button>
          ${studioId === 'etsy' ? '<button type="button" class="ghost" id="dtoplu">4 urunde birden uret</button>' : ''}
          ${studioId === 'etsy' ? '<button type="button" class="ghost" id="dpdf">PDF (vektor)</button>' : ''}
          <button type="button" class="ghost" id="dsvg">SVG indir</button>
        </div>
        ${studioId === 'etsy' ? `<p class="help">
          <b>4 urunde birden:</b> tisort, kare (canta/yastik), kupa ve poster - hepsi tek klasore,
          her biri kendi Etsy listeleme metniyle (urun kelimesi degisince etiketler de degisiyor).<br>
          <b>PDF:</b> vektor cikti ve <b>yazi tipi dosyaya gomulu</b> - baskicida o font kurulu
          olmasa bile tasarim ayni gorunur. Cogu matbaa PDF istiyor.
        </p>
        <div id="dsablon"></div>` : ''}
      </div>
      <div class="card">
        <h2>Onizleme</h2>
        <div id="dprev" class="preview"><span class="dim">hazirlaniyor...</span></div>
        ${studioId === 'etsy' ? `
        <hr class="sep">
        <div class="row" style="justify-content:space-between">
          <b style="font-size:14px">Varyantlar</b>
          <button type="button" class="ghost tiny" id="dvaryant">5 gorunumu goster</button>
        </div>
        <p class="help">Bedava ve aninda - onizleme tarayici calistirmaz, yalnizca metin kurar.</p>
        <div id="dvaryantlar"></div>` : ''}
      </div>
    </div>
    <div id="dout"></div>`;

  // Istek sayaci EN BASTA tanimlanmali: preview() bir fonksiyon bildirimi
  // oldugu icin yukari cekiliyor ve asagida cagriliyor, ama `let` yukari
  // cekilmiyor - sayac asagida tanimlanirsa ILK onizleme
  // "Cannot access 'istekNo' before initialization" ile patliyordu.
  // (Sonraki her duzenleme calistigi icin testte gorunmemisti.)
  let istekNo = 0;

  const form = document.getElementById('dform');
  // Her tus vurusunda sunucuya gitmek yerine 140 ms bekle. Ayrica gec gelen
  // eski cevap yeni onizlemenin uzerine yazmasin diye istek sirasi tutuluyor.
  let gecikme = null;
  const onEdit = () => {
    collectDesign(studioId, spec);
    satirUyarisi(studioId, spec);
    clearTimeout(gecikme);
    gecikme = setTimeout(preview, 140);
  };
  form.oninput = onEdit;
  form.onchange = onEdit;
  satirUyarisi(studioId, spec);
  document.getElementById('dgen').onclick = () => generateDesign(studioId);
  document.getElementById('dsvg').onclick = downloadSvgUyari;

  const toplu = document.getElementById('dtoplu');
  if (toplu) toplu.onclick = () => bulkDesign(studioId);

  const pdfBtn = document.getElementById('dpdf');
  if (pdfBtn) {
    pdfBtn.onclick = async () => {
      const out = document.getElementById('dout');
      pdfBtn.disabled = true;
      const eski = pdfBtn.textContent;
      pdfBtn.innerHTML = '<span class="spin"></span>PDF';
      try {
        const r = await api('/api/etsy/pdf', { design: S.design[studioId] });
        out.innerHTML = `${exportBar(r.export)}
          <div class="card">
            <h2>PDF hazir · ${(r.bytes / 1024).toFixed(0)} KB</h2>
            <p class="help">${r.size.w}x${r.size.h} piksel = ${(r.size.w / 300).toFixed(2)}x${(r.size.h / 300).toFixed(2)} inc @300DPI.
            Vektor, yazi tipi gomulu.</p>
          </div>`;
      } catch (err) {
        out.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`;
      } finally { pdfBtn.disabled = false; pdfBtn.textContent = eski; }
    };
  }

  // --- gorunum sablonlari (palet + font + dizilim)
  if (studioId === 'etsy') {
    const kutu = document.getElementById('dsablon');
    const ciz = (liste) => {
      kutu.innerHTML = `
        <hr class="sep">
        <div class="row" style="justify-content:space-between">
          <b style="font-size:14px">Gorunum sablonlari</b>
          <button type="button" class="ghost tiny" id="dsablonkaydet">Su anki gorunumu kaydet</button>
        </div>
        <p class="help">Palet + yazi tipi + dizilim birlesimi. Magaza tutarliligi Etsy'de satis unsuru.</p>
        ${liste.length ? `<div class="nisler">${liste.map((s) => `
          <span class="sablonrozet">
            <button type="button" class="ghost tiny" data-sablon="${esc(s.ad)}">${esc(s.ad)}</button>
            <button type="button" class="ghost tiny danger" data-sablonsil="${esc(s.ad)}" title="Sil">×</button>
          </span>`).join('')}</div>`
          : '<p class="dim">Henuz sablon yok.</p>'}`;

      document.getElementById('dsablonkaydet').onclick = async () => {
        const ad = prompt('Sablona bir ad ver (ornek: "magaza retro"):');
        if (!ad) return;
        try {
          ciz((await api('/api/etsy/sablon/kaydet', { ad, design: S.design[studioId] })).sablonlar);
          toast('Sablon kaydedildi.', 'ok');
        } catch (err) { toast(err.message, 'bad'); }
      };
      kutu.querySelectorAll('[data-sablon]').forEach((b) => {
        b.onclick = () => {
          const s = liste.find((x) => x.ad === b.dataset.sablon);
          if (!s) return;
          S.design[studioId] = {
            ...S.design[studioId],
            layout: s.layout, palette: s.palette, font: s.font, uppercase: s.uppercase,
          };
          toast('Sablon uygulandi.', 'ok');
          render();
        };
      });
      kutu.querySelectorAll('[data-sablonsil]').forEach((b) => {
        b.onclick = async () => {
          try { ciz((await api('/api/etsy/sablon/sil', { ad: b.dataset.sablonsil })).sablonlar); }
          catch (err) { toast(err.message, 'bad'); }
        };
      });
    };
    api('/api/etsy/sablonlar').then((r) => ciz(r.sablonlar)).catch(() => { kutu.innerHTML = ''; });
  }

  const varyantBtn = document.getElementById('dvaryant');
  if (varyantBtn) {
    varyantBtn.onclick = async () => {
      const kutu = document.getElementById('dvaryantlar');
      varyantBtn.disabled = true;
      kutu.innerHTML = '<p class="help"><span class="spin"></span>hazirlaniyor...</p>';
      try {
        const r = await api('/api/' + studioId + '/varyantlar', { design: S.design[studioId] });
        kutu.innerHTML = `<div class="varyantlar">${r.varyantlar.map((v, i) => `
          <div class="varyant" data-varyant="${i}">
            <div class="varyantgorsel">${v.svg}</div>
            <div class="dim">${esc(v.etiket)}</div>
          </div>`).join('')}</div>`;
        kutu.querySelectorAll('.varyantgorsel svg').forEach((s) => {
          s.removeAttribute('width'); s.removeAttribute('height');
          s.style.maxWidth = '100%'; s.style.height = 'auto';
        });
        kutu.querySelectorAll('[data-varyant]').forEach((el) => {
          el.onclick = () => {
            const v = r.varyantlar[Number(el.dataset.varyant)];
            S.design[studioId] = { ...S.design[studioId], ...v.design };
            toast('Gorunum uygulandi.', 'ok');
            render();
          };
        });
      } catch (err) {
        kutu.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`;
      } finally { varyantBtn.disabled = false; }
    };
  }

  preview();

  async function preview() {
    const box = document.getElementById('dprev');
    if (!box) return;
    const benim = ++istekNo;
    try {
      const r = await api('/api/' + studioId + '/onizleme', { design: S.design[studioId] });
      // Gec gelen eski cevabi at - yoksa ekranda bir onceki tasarim kalir.
      if (benim !== istekNo) return;
      box.innerHTML = r.svg;
      const svg = box.querySelector('svg');
      if (svg) {
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.maxWidth = '100%';
        svg.style.height = 'auto';
      }
      box.dataset.svg = r.svg;
    } catch (err) {
      if (benim !== istekNo) return;
      // Eskiden hata sessizce yutuluyordu; kullanici bos kutuya bakiyordu.
      box.innerHTML = `<div class="notice bad">Onizleme alinamadi: ${esc(err.message)}</div>`;
    }
  }

  function downloadSvgUyari() {
    // SVG yalnizca yazi tipinin ADINI tasiyor, kendisini degil. Baska
    // bilgisayarda veya baskicida o font yoksa dosya bambaska gorunur.
    // Kullaniciya bunu SOYLEMEDEN dosyayi vermek dogru degil.
    modal('SVG indirmeden once',
      `<div class="notice warn"><b>Yazi tipi dosyaya gomulu degil.</b></div>
       <p>SVG icinde yalnizca yazi tipinin <b>adi</b> yaziyor ("Arial Black", "Georgia"...).
       Dosyayi acan bilgisayarda o yazi tipi yoksa metin baska bir fontla cizilir -
       harf genislikleri degisir, tasarim bozulur.</p>
       <p class="help">Baskiciya gonderecegin dosya <b>PNG</b> olmali: orada yazi zaten
       piksele donmustur ve her yerde ayni gorunur. SVG'yi yalnizca kendin duzenlemek
       icin indir.</p>`,
      [
        { label: 'Yine de indir', onClick: () => { closeModal(); downloadSvg(); } },
        { label: 'Vazgec', className: 'btn', onClick: closeModal },
      ]);
  }

  function downloadSvg() {
    const box = document.getElementById('dprev');
    const blob = new Blob([box.dataset.svg || ''], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = studioId + '-' + Date.now() + '.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

function defaultsFor(spec, opts) {
  const d = {};
  for (const f of spec.fields) {
    if (f.type === 'select') d[f.key] = ((opts[f.from] || [])[0] || {}).key;
    else if (f.type === 'lines') d[f.key] = (f.placeholder || '').split('\n');
    else if (f.type === 'boolean') d[f.key] = !!f.default;
    else d[f.key] = '';
  }
  return d;
}

function designField(f, d, opts) {
  if (f.type === 'boolean') {
    // d[f.key] tanimsizsa varsayilan f.default
    const acik = d[f.key] === undefined ? !!f.default : !!d[f.key];
    return `<div class="field"><label style="display:flex;gap:8px;align-items:center">
      <input type="checkbox" data-d="${esc(f.key)}" style="width:auto" ${acik ? 'checked' : ''}> ${esc(f.label)}
    </label>${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}</div>`;
  }
  if (f.type === 'select') {
    const list = opts[f.from] || [];
    const cur = list.find((o) => o.key === d[f.key]) || {};
    return `<div class="field"><label>${esc(f.label)}</label>
      <select data-d="${esc(f.key)}">${list.map((o) =>
        `<option value="${esc(o.key)}" ${d[f.key] === o.key ? 'selected' : ''}>${esc(o.label)}${o.w ? ' (' + o.w + 'x' + o.h + ')' : ''}</option>`).join('')}</select>
      ${cur.hint ? `<p class="help">${esc(cur.hint)}</p>` : ''}</div>`;
  }
  if (f.type === 'lines') {
    return `<div class="field"><label>${esc(f.label)}</label>
      <textarea data-d="${esc(f.key)}" rows="${f.rows || 4}">${esc((d[f.key] || []).join('\n'))}</textarea></div>`;
  }
  return `<div class="field"><label>${esc(f.label)}</label>
    <input data-d="${esc(f.key)}" value="${esc(d[f.key] || '')}" placeholder="${esc(f.placeholder || '')}"></div>`;
}

/**
 * design.js metni 5 satirla siniriyor (slice(0,5)). Kullanici 7 satir
 * yazarsa 2'si sessizce dusuyordu ve nereye gittigini anlamiyordu.
 */
function satirUyarisi(studioId, spec) {
  const kutu = document.getElementById('dsatiruyari');
  if (!kutu) return;
  const alan = spec.fields.find((f) => f.type === 'lines');
  if (!alan) { kutu.innerHTML = ''; return; }
  const satirlar = (S.design[studioId] || {})[alan.key] || [];
  kutu.innerHTML = satirlar.length > 5
    ? `<div class="notice warn">Tasarim en fazla <b>5 satir</b> alir; yazdigin ${satirlar.length} satirin
       son ${satirlar.length - 5} tanesi <b>kullanilmayacak</b>.</div>`
    : '';
}

function collectDesign(studioId, spec) {
  const d = S.design[studioId] || {};
  // TARAMA FORMLA SINIRLI. Eskiden tum belge taraniyordu; varyant seridi ve
  // sablon paneli eklendikten sonra ayni data-d adini tasiyan baska bir alan
  // tasarimi sessizce ezebilirdi.
  const kapsam = document.getElementById('dform') || document;
  kapsam.querySelectorAll('[data-d]').forEach((el) => {
    const f = spec.fields.find((x) => x.key === el.dataset.d);
    if (f && f.type === 'boolean') d[el.dataset.d] = el.checked;
    else if (f && f.type === 'lines') d[el.dataset.d] = el.value.split('\n').map((x) => x.trim()).filter(Boolean);
    else d[el.dataset.d] = el.value;
  });
  S.design[studioId] = d;
}

async function bulkDesign(studioId) {
  const btn = document.getElementById('dtoplu');
  const out = document.getElementById('dout');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>4 urun uretiliyor';
  out.innerHTML = '';
  try {
    const r = await api('/api/' + studioId + '/toplu', {
      design: S.design[studioId],
      listing: S.listing || undefined,
    });
    out.innerHTML = `
      ${exportBar(r.export)}
      ${r.hatalar.length ? `<div class="notice warn">${r.hatalar.length} urun uretilemedi:
        ${r.hatalar.map((h) => esc(h.size + ' - ' + h.hata)).join('<br>')}</div>` : ''}
      <div class="card">
        <h2>${r.sonuclar.length} urun hazir</h2>
        <p class="help">Hepsi tek klasorde, her biri kendi Etsy listeleme metniyle.</p>
        <div class="gallery">${r.sonuclar.map((s) => `
          <div class="shot"><img src="${esc(s.image.url)}" loading="lazy">
            <div class="meta">${esc(s.image.category || '')}
              <div class="actions">
                <a class="ghost tiny" href="${esc(s.image.url)}" download>Indir</a>
              </div>
            </div></div>`).join('')}</div>
      </div>`;
    await refresh();
  } catch (err) {
    out.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '4 urunde birden uret';
  }
}

async function generateDesign(studioId) {
  const btn = document.getElementById('dgen');
  const out = document.getElementById('dout');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>uretiliyor';
  out.innerHTML = '';
  try {
    const body = { design: S.design[studioId] };
    if (studioId === 'etsy' && S.listing) body.listing = S.listing;
    const r = await api('/api/' + studioId + '/uret', body);
    out.innerHTML = `${exportBar(r.export)}
    <div class="card">
      <h2>Hazir · ${r.size.w}x${r.size.h}${r.dpi ? ' @' + r.dpi + 'DPI' : ''}${r.transparent ? ' · seffaf' : ''}</h2>
      <div class="gallery"><div class="shot">
        <img src="${esc(r.image.url)}">
        <div class="meta">${esc(r.image.category || '')}
          <div class="row" style="margin-top:8px">
            <a class="ghost tiny" style="text-decoration:none" href="${esc(r.image.url)}" download>Indir</a>
          </div>
        </div>
      </div></div></div>`;
    await refresh();
    toast('Tasarim uretildi.', 'ok');
  } catch (err) {
    out.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`;
    toast(err.message.slice(0, 140), 'bad');
  } finally {
    btn.disabled = false;
    btn.textContent = 'PNG uret';
  }
}

async function renderEtsyListing() {
  if (!S.listing) S.listing = { phrase: '', niche: '', size: 'tisort', audience: '', keywords: [], delivery: undefined };
  const l = S.listing;

  // TASARIMDAKI SOZ OTOMATIK GELIR. Eskiden kullanici ayni sozu iki kez
  // yaziyordu: bir kez "Tasarim" sekmesinde satir olarak, bir kez burada.
  if (!l.phrase) {
    const satirlar = (S.design.etsy || {}).lines;
    const metin = Array.isArray(satirlar) ? satirlar.filter(Boolean).join(' ') : '';
    if (metin) l.phrase = metin;
  }

  let nisler = [];
  try { nisler = (await api('/api/etsy/nisler')).nisler; } catch { nisler = []; }
  view.innerHTML = `
    <h1>Etsy listeleme metni</h1>
    <p class="lead">Etsy aramasi baslik ve etiketlerde yasiyor; cogu satici tam burada kaybediyor.
    Sifir API, tamamen yerel. Arastirmandan gelen anahtar kelimeleri ekle, gerisini kurar.</p>
    <div class="card">
      <div class="grid3">
        <div class="field"><label>Tasarimdaki soz</label><input id="l_phrase" value="${esc(l.phrase)}" placeholder="Powered By Coffee And Cat Hair"></div>
        <div class="field"><label>Nis / kategori</label>
          <input id="l_niche" value="${esc(l.niche)}" placeholder="kedi, hemsire, kamp..." list="nislistesi">
          <datalist id="nislistesi">${nisler.map((n) => `<option value="${esc(n.label)}">${esc(n.en)}</option>`).join('')}</datalist>
          <p class="help">Turkce yazabilirsin - kutuphanedekiler Ingilizceye cevrilir (kedi -> cat).</p>
        </div>
        <div class="field"><label>Hedef kitle</label><input id="l_aud" value="${esc(l.audience)}" placeholder="for women"></div>
        <div class="field">
          <label>Ne satiyorsun?</label>
          <select id="l_delivery">
            <option value="">- sec -</option>
            <option value="fiziksel" ${l.delivery === 'fiziksel' ? 'selected' : ''}>Basili urun (kargolanacak)</option>
            <option value="dijital" ${l.delivery === 'dijital' ? 'selected' : ''}>Dijital dosya (indirilecek)</option>
          </select>
          <p class="help">Aciklama buna gore yazilir. Baslik tisort satip aciklama PNG teslim ederse alici iade acar.</p>
        </div>
      </div>
      <div class="field"><label>Anahtar kelimeler (virgulle ayir)</label>
        <input id="l_kw" value="${esc((l.keywords || []).join(', '))}" placeholder="cat mom, crazy cat lady"></div>
      <div class="field">
        <label>Cok satan nisler <span class="dim">(tikla, doldursun)</span></label>
        <div class="nisler">${nisler.map((n) => `<button class="ghost tiny" data-nis="${esc(n.label)}">${esc(n.label)}</button>`).join('')}</div>
        <p class="help">2026 POD pazar arastirmasindan; anahtar gerektirmez, araca gomulu.
        Listede olmayan nisi elle yazabilirsin.</p>
      </div>
      <div class="row">
        <button class="btn" id="lgo">Uret</button>
        <button class="ghost" id="lsoz">Soz onerileri</button>
      </div>
    </div>
    <div id="lsozout"></div>
    <div id="lout"></div>`;

  view.querySelectorAll('[data-nis]').forEach((b) => {
    b.onclick = () => { document.getElementById('l_niche').value = b.dataset.nis; };
  });

  document.getElementById('lsoz').onclick = async () => {
    const kutu = document.getElementById('lsozout');
    const nis = document.getElementById('l_niche').value;
    if (!nis) return toast('Once bir nis yaz veya sec.', 'bad');
    kutu.innerHTML = '<div class="card"><span class="spin"></span>oneriler hazirlaniyor...</div>';
    try {
      const r = await api('/api/etsy/nis/oneriler', { nis, urunKelimeleri: ['shirt', 'tee'] });
      kutu.innerHTML = `
        <div class="card">
          <h2>Soz kaliplari</h2>
          <p class="help">Hepsi JENERIK tur kalibi - kimsenin tasarimi degil. Nisinle doldurulur,
          cikan soz senin olur. Tikla, tasarim metnine gecsin.</p>
          ${r.sozler.map((s) => `
            <div class="sozsatir">
              <div>
                <b>${esc(s.lines.join(' / '))}</b>
                <div class="dim" style="font-size:12px">${esc(s.label)} - ${esc(s.hint)}</div>
              </div>
              <button class="ghost tiny" data-soz="${esc(JSON.stringify(s.lines))}">Tasarima gecir</button>
            </div>`).join('')}
        </div>`;
      kutu.querySelectorAll('[data-soz]').forEach((b) => {
        b.onclick = () => {
          const satirlar = JSON.parse(b.dataset.soz);
          S.design.etsy = { ...(S.design.etsy || {}), lines: satirlar };
          S.listing.phrase = satirlar.join(' ');
          toast('Tasarim metnine gecirildi.', 'ok');
          S.tab = 'tasarim';
          render();
        };
      });
    } catch (err) {
      kutu.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`;
    }
  };

  document.getElementById('lgo').onclick = async () => {
    S.listing = {
      phrase: document.getElementById('l_phrase').value,
      niche: document.getElementById('l_niche').value,
      audience: document.getElementById('l_aud').value,
      keywords: document.getElementById('l_kw').value.split(',').map((x) => x.trim()).filter(Boolean),
      delivery: document.getElementById('l_delivery').value || undefined,
      size: (S.design.etsy || {}).size || 'tisort',
    };
    try {
      const r = await api('/api/etsy/listeleme', { listing: S.listing });
      document.getElementById('lout').innerHTML = `
        ${r.warnings.map((w) => `<div class="notice warn">${esc(w)}</div>`).join('')}
        <div class="card">
          <div class="field"><label>Baslik (${r.titleLength}/${r.limits.title})</label>
            <div class="core">${esc(r.title)}</div>
            <div class="row" style="margin-top:8px"><button class="ghost tiny" data-c="t">Kopyala</button></div></div>
          <div class="field"><label>Etiketler (${r.tagCount}/${r.limits.tagCount})</label>
            <div>${r.tags.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
            <div class="row" style="margin-top:8px"><button class="ghost tiny" data-c="g">Kopyala</button></div></div>
          <div class="field"><label>Aciklama</label>
            <div class="core" style="max-height:220px;overflow:auto">${esc(r.description)}</div>
            <div class="row" style="margin-top:8px"><button class="ghost tiny" data-c="a">Kopyala</button></div></div>
        </div>`;
      document.querySelector('[data-c="t"]').onclick = () => copy(r.title);
      document.querySelector('[data-c="g"]').onclick = () => copy(r.tags.join(', '));
      document.querySelector('[data-c="a"]').onclick = () => copy(r.description);
    } catch (err) {
      toast(err.message, 'bad');
    }
  };
}

async function renderStudioArchive(studioId) {
  // ARSIV SUNUCUDAN. Eskiden /api/durum icindeki EN YENI 60 kare suzuluyordu;
  // 60'tan fazla is yapan satici kendi tasarimlarini goremiyor, ekranda
  // "Henuz tasarim yok" yaziyordu - oysa hepsi duruyordu.
  let items;
  if (studioId === 'etsy') {
    try { items = (await api('/api/etsy/arsiv')).items; }
    catch { items = (S.status.gallery || []).filter((g) => g.studio === studioId); }
  } else {
    items = (S.status.gallery || []).filter((g) => g.studio === studioId);
  }
  view.innerHTML = `
    <h1>Arsiv</h1>
    <p class="lead">Bu studyoda uretilen tasarimlar.</p>
    ${items.length ? `<div class="gallery">${items.map((i) => `
      <div class="shot"><img src="${esc(i.url)}" loading="lazy">
        <div class="meta">${esc(i.category || '')}<br>${new Date(i.createdAt).toLocaleString('tr-TR')}
          <div class="actions">
            <a class="ghost tiny" href="${esc(i.url)}" download>Indir</a>
            <button class="ghost tiny danger" data-arsivsil="${esc(i.id)}">Sil</button>
          </div>
        </div></div>`).join('')}</div>`
      : '<div class="empty">Henuz tasarim yok.</div>'}`;

  view.querySelectorAll('[data-arsivsil]').forEach((b) => {
    b.onclick = () => {
      modal('Tasarimi sil',
        '<p>Bu tasarim <b>arsive tasinacak</b>. Dosya silinmiyor, kayit kaldiriliyor.</p>',
        [
          {
            label: 'Sil',
            className: 'danger ghost',
            onClick: async () => {
              try {
                await api('/api/galeri/sil', { id: b.dataset.arsivsil });
                closeModal();
                toast('Silindi (arsive tasindi).', 'ok');
                await refresh();
                render();
              } catch (err) { toast(err.message, 'bad'); }
            },
          },
          { label: 'Vazgec', className: 'btn', onClick: closeModal },
        ]);
    };
  });
}

/* ---------------------------------------------------- masaustu cikti klasoru */

/** Uretim sonucunun altinda "su klasore yazildi" seridi. */
function exportBar(exp) {
  if (!exp || !exp.name) return '';
  return `<div class="exportbar">
    <span>📁 Masaustunde <b>${esc(exp.name)}</b> klasorune yazildi</span>
    <button class="ghost tiny" data-openfolder="${esc(exp.name)}">Klasoru ac</button>
  </div>`;
}

// Klasor acma butonlari - olay devri, her render'da yeniden baglanmasin.
view.addEventListener('click', async (e) => {
  const b = e.target.closest && e.target.closest('[data-openfolder]');
  if (!b) return;
  try {
    await api('/api/cikti/ac', { path: b.dataset.openfolder });
  } catch (err) {
    toast(err.message, 'bad');
  }
});

/* ------------------------------------------------------------ gonderi metni */

// Panelin bildigi sosyal platformlar. src/caption.js PLATFORMS ile ayni sira.
// DIKKAT: bu SOSYAL PLATFORM listesi; prompt kartlarindaki "gorsel modeli
// dili" (flux/sdxl/midjourney) bambaska bir kavram.
const CAPTION_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', max: 2200 },
  { id: 'tiktok', label: 'TikTok', max: 2200 },
  { id: 'x', label: 'X (Twitter)', max: 280 },
  { id: 'linkedin', label: 'LinkedIn', max: 3000 },
  { id: 'youtube', label: 'YouTube', max: 5000 },
  { id: 'pinterest', label: 'Pinterest', max: 500 },
  { id: 'threads', label: 'Threads', max: 500 },
];

function renderCaptions(box, data) {
  box.innerHTML = `
    <hr class="sep">
    ${exportBar(data.export)}
    <p class="help">${esc(data.platformLabel)} · ${esc(data.platformNote || '')}</p>
    ${data.variants.map((v, i) => `
      <div class="card" style="margin-bottom:10px">
        <div class="row" style="justify-content:space-between">
          <b>Varyant ${i + 1}</b>
          <span class="dim">${v.chars} / ${v.max} karakter${v.truncated ? ' · kisaltildi' : ''}</span>
        </div>
        <div class="core" style="white-space:pre-wrap">${esc(v.text)}</div>
        <div class="row" style="margin-top:8px">
          <button class="ghost tiny" data-cap="${i}">Kopyala</button>
        </div>
      </div>`).join('')}
    <p class="help">${esc(data.aiNote)}</p>`;

  box.querySelectorAll('[data-cap]').forEach((b) => {
    b.onclick = () => copy(data.variants[Number(b.dataset.cap)].text);
  });
}

/* ------------------------------------------------- Etsy pazar arastirmasi */

async function renderEtsyPazar() {
  let d;
  try { d = await api('/api/etsy/pazar/durum'); }
  catch (err) { view.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`; return; }

  const k = d.kurulum;
  view.innerHTML = `
    <h1>Pazar arastirmasi</h1>
    <p class="lead">Bir niste neyin calistigini <b>desen olarak</b> gosterir: hangi etiketler
    tekrar ediyor, fiyatlar nerede kumelenmis, basliklar nasil kurulmus.</p>

    <div class="notice info">
      <b>Bu ekran kimsenin tasarimini kopyalamaz.</b> Rakiplerin gorselini, cizimini veya ozgun
      sozunu saklamaz; yalnizca <b>desen</b> cikarir. Tasarim her zaman sifirdan kurulur -
      hem Etsy kopyaci magazalari kapatiyor hem de gerek yok.
    </div>

    ${d.hazir ? '' : `
    <div class="card">
      <h2>${esc(k.baslik)}</h2>
      <p class="help">${esc(k.neden)}</p>
      <ol class="adimlar">${k.adimlar.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>
      <p class="help">
        <a href="${esc(k.kayitUrl)}" target="_blank" rel="noreferrer">${esc(k.kayitUrl)}</a> ·
        <a href="${esc(k.dokumanUrl)}" target="_blank" rel="noreferrer">Etsy API dokumani</a>
      </p>
      ${k.notlar.map((n) => `<p class="help">• ${esc(n)}</p>`).join('')}
    </div>`}

    <div class="card">
      <h2>Etsy API anahtari</h2>
      <div class="field">
        <label>Keystring</label>
        <input id="p_key" value="${esc(d.anahtar)}" placeholder="Etsy gelistirici panelinden aldigin anahtar" spellcheck="false">
        <p class="help">${d.hazir
          ? 'Kayitli. Yalnizca bu bilgisayarda <span class="mono">data/etsy-api.json</span> icinde durur.'
          : 'Henuz girilmedi - yukaridaki adimlari izle.'}</p>
      </div>
      <div class="row"><button class="btn" id="pkaydet">Kaydet</button></div>
    </div>

    <div class="card">
      <h2>Arastir</h2>
      <div class="grid3">
        <div class="field"><label>Nis / anahtar kelime</label>
          <input id="p_kw" placeholder="cat mom shirt" spellcheck="false"></div>
        <div class="field"><label>Siralama</label>
          <select id="p_sort">${Object.entries(d.siralama).map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></div>
        <div class="field"><label>Kayit sayisi</label>
          <select id="p_limit"><option>50</option><option selected>100</option></select></div>
      </div>
      <div class="row">
        <button class="btn" id="pgo" ${d.hazir ? '' : 'disabled'}>Arastir</button>
        ${d.hazir ? '' : '<span class="dim">once anahtari kaydet</span>'}
      </div>
      <p class="help">Istek yalnizca sen bu dugmeye bastiginda gider. Arka planda surekli
      tarama YAPILMAZ - hem Etsy hiz siniri uygular hem de gerek yok.</p>
    </div>
    <div id="pout"></div>`;

  document.getElementById('pkaydet').onclick = async (e) => {
    e.target.disabled = true;
    try {
      await api('/api/etsy/pazar/anahtar', { apiKey: document.getElementById('p_key').value });
      toast('Anahtar kaydedildi.', 'ok');
      render();
    } catch (err) { toast(err.message, 'bad'); e.target.disabled = false; }
  };

  const go = document.getElementById('pgo');
  if (go) {
    go.onclick = async () => {
      const kutu = document.getElementById('pout');
      go.disabled = true;
      kutu.innerHTML = '<div class="card"><span class="spin"></span>Etsy sorgulaniyor...</div>';
      try {
        const r = await api('/api/etsy/pazar/arastir', {
          keywords: document.getElementById('p_kw').value,
          sortOn: document.getElementById('p_sort').value,
          limit: Number(document.getElementById('p_limit').value),
        });
        renderPazarSonuc(kutu, r);
      } catch (err) {
        kutu.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`;
      } finally { go.disabled = false; }
    };
  }
}

function renderPazarSonuc(kutu, r) {
  const a = r.analiz;
  if (!a.adet) { kutu.innerHTML = '<div class="notice warn">Sonuc bulunamadi.</div>'; return; }

  kutu.innerHTML = `
    <div class="card">
      <h2>${esc(r.sorgu)} · ${a.adet} liste incelendi</h2>
      ${a.ogutler.map((o) => `<p class="help">• ${esc(o)}</p>`).join('')}
    </div>

    <div class="card">
      <h2>En cok tekrar eden etiketler</h2>
      <p class="help">Bu nisin gercek arama dili. <span class="tag kotu">tek kelime</span> isaretli
      olanlar zayif - senin firsatin cok kelimeli terimlerde.</p>
      <table class="cmptable"><thead><tr><th>Etiket</th><th>Kac listede</th><th>Oran</th><th></th></tr></thead>
      <tbody>${a.etiketler.slice(0, 20).map((e) => `
        <tr>
          <td data-label="Etiket"><span class="mono">${esc(e.etiket)}</span></td>
          <td data-label="Kac listede">${e.kac}</td>
          <td data-label="Oran">%${e.oran}</td>
          <td data-label="Not">${e.tekKelime ? '<span class="tag kotu">tek kelime</span>' : '<span class="tag iyi">uzun kuyruk</span>'}</td>
        </tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:10px">
        <button class="ghost tiny" id="pkopya">Uzun kuyruklu olanlari kopyala</button>
      </div>
    </div>

    ${a.fiyat ? `<div class="card">
      <h2>Fiyat</h2>
      <p>Ortanca <b>${a.fiyat.ortanca}</b> · aralik ${a.fiyat.enDusuk.toFixed(2)} - ${a.fiyat.enYuksek.toFixed(2)}
      <span class="dim">(${a.fiyat.adet} listede fiyat okunabildi)</span></p>
    </div>` : ''}

    <div class="card">
      <h2>Basliklar</h2>
      <p>Ortanca uzunluk <b>${a.baslik.ortancaUzunluk}</b> karakter · en uzun ${a.baslik.enUzun}
      <span class="dim">(Etsy siniri 140)</span></p>
      <p class="help">Basliklarda tekrar eden kelimeler:
      ${a.baslikKelimeleri.slice(0, 15).map((x) => `<span class="pill">${esc(x.kelime)} (${x.kac})</span>`).join(' ')}</p>
    </div>`;

  const kop = document.getElementById('pkopya');
  if (kop) {
    kop.onclick = () => copy(a.etiketler.filter((e) => !e.tekKelime).slice(0, 13).map((e) => e.etiket).join(', '));
  }
}

/* ---------------------------------------------------------------- gallery */

async function renderGallery() {
  const g = S.status.gallery;

  // Buyutme araci bagli mi? Butonu bosuna gostermemek icin bir kez sorulur.
  if (S.upscaler === undefined) {
    try {
      const u = await api('/api/buyutme');
      S.upscaler = u && u.active && u.active !== 'none' ? u : null;
    } catch { S.upscaler = null; }
  }
  const buyutmeVar = !!S.upscaler;

  view.innerHTML = `
    <h1>Galeri</h1>
    <p class="lead">Hepsi bagladigin uretim API'sinden geldi.</p>
    ${g.length ? `<div class="gallery">${g.map((i) => {
      // "· " ayraci bos alanlarda tek basina kaliyordu.
      const meta = [i.category, i.providerLabel || i.provider].filter(Boolean).map(esc).join(' · ');
      const studyo = i.studio && i.studio !== 'karakter';
      return `
      <div class="shot ${i.isGolden ? 'golden' : ''}">
        <img src="${esc(i.url)}" loading="lazy" data-big="${esc(i.id)}">
        <div class="meta">
          ${i.isGolden ? '<span class="badge">★ birincil referans</span><br>' : ''}
          ${meta}${meta ? '<br>' : ''}
          ${new Date(i.createdAt).toLocaleString('tr-TR')}
          ${i.upscaled && i.upscaled.failed ? '<br><span class="dim">buyutme basarisiz - orijinal kaydedildi</span>' : ''}
          ${i.upscaled && !i.upscaled.failed ? `<br><span class="dim">buyutuldu ${esc(String(i.upscaled.scale || ''))}x</span>` : ''}
          <div class="actions">
            <a class="ghost tiny" href="${esc(i.url)}" download>Indir</a>
            <button class="ghost tiny" data-big="${esc(i.id)}">Buyuk goster</button>
            ${i.prompt ? `<button class="ghost tiny" data-prompt="${esc(i.id)}">Prompt</button>` : ''}
            ${buyutmeVar && !(i.upscaled && !i.upscaled.failed) ? `<button class="ghost tiny" data-up="${esc(i.id)}">Kaliteyi buyut</button>` : ''}
            ${!studyo && !i.isGolden ? `<button class="ghost tiny" data-golden="${esc(i.id)}">Birincil yap</button>` : ''}
            <button class="ghost tiny danger" data-del="${esc(i.id)}">Sil</button>
          </div>
        </div>
      </div>`;
    }).join('')}</div>`
      : `<div class="empty">Henuz gorsel yok.<br><br>
         <span class="dim">Bu otomasyon gorsel uretmez ve stok gorsel kullanmaz -
         once vesikalik setini uret.</span></div>`}`;

  const bul = (id) => g.find((i) => i.id === id);

  view.querySelectorAll('[data-prompt]').forEach((b) => {
    b.onclick = () => {
      const item = bul(b.dataset.prompt);
      modal('Kullanilan prompt', `<div class="core">${esc(item.prompt)}</div>
        <p class="help">seed: ${item.seed != null ? item.seed : 'yok'} · ${esc(item.providerLabel || '')}</p>`,
      [
        { label: 'Kopyala', onClick: () => copy(item.prompt) },
        { label: 'Kapat', className: 'btn', onClick: closeModal },
      ]);
    };
  });

  // Buyuk goster: sunucuya gitmez, ayni dosyayi buyuk gosterir.
  view.querySelectorAll('[data-big]').forEach((b) => {
    b.onclick = () => {
      const item = bul(b.dataset.big);
      if (!item) return;
      modal(item.category || 'Gorsel',
        `<img class="full" src="${esc(item.url)}" alt="">`,
        [
          { label: 'Indir', onClick: () => { window.location.href = item.url; } },
          { label: 'Kapat', className: 'btn', onClick: closeModal },
        ], { wide: true });
    };
  });

  view.querySelectorAll('[data-golden]').forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      try {
        await api('/api/galeri/altin', { id: b.dataset.golden });
        toast('Birincil referans guncellendi.', 'ok');
        await refresh();
        render();
      } catch (err) {
        toast(err.message, 'bad');
        b.disabled = false;
      }
    };
  });

  // Buyutme UCRETLI olabilir ve dakikalar surebilir (Replicate 4-5 dk).
  // Buton kilitlenmezse kullanici arka arkaya tiklayip birden fazla
  // ucretli istek acar.
  view.querySelectorAll('[data-up]').forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      const eski = b.textContent;
      b.textContent = 'Buyutuluyor...';
      try {
        await api('/api/galeri/buyut', { id: b.dataset.up });
        toast('Kare buyutuldu.', 'ok');
        await refresh();
        render();
      } catch (err) {
        toast(err.message, 'bad');
        b.disabled = false;
        b.textContent = eski;
      }
    };
  });

  view.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = () => {
      const item = bul(b.dataset.del);
      const sil = async (force) => {
        try {
          const res = await api('/api/galeri/sil', { id: item.id, force });
          closeModal();
          toast(res.clearedAngles && res.clearedAngles.length
            ? `Silindi - ${res.clearedAngles.length} vesikalik acisi bosaldi.`
            : 'Silindi (arsive tasindi).', 'ok');
          await refresh();
          render();
        } catch (err) {
          if (err.data && err.data.code === 'REFERANS_KULLANIMDA') {
            modal('Bu kare vesikalik setinde kullaniliyor',
              `<div class="notice bad">${esc(err.message)}</div>
               <p class="help">Silersen o aci icin yuz referansi kalmaz ve
               "Vesikalik seti" sekmesinden yeniden uretmen gerekir.</p>`,
              [
                { label: 'Yine de sil', className: 'danger ghost', onClick: () => sil(true) },
                { label: 'Vazgec', className: 'btn', onClick: closeModal },
              ]);
            return;
          }
          toast(err.message, 'bad');
        }
      };

      modal('Kareyi sil',
        `<p>Bu kare <b>arsive tasinacak</b> (data/_arsiv/silinen/). Dosya silinmiyor,
         galeri kaydi kaldiriliyor.</p>
         <p class="help">Prompt ve seed kaydi geri gelmez.</p>`,
        [
          { label: 'Sil', className: 'danger ghost', onClick: () => sil(false) },
          { label: 'Vazgec', className: 'btn', onClick: closeModal },
        ]);
    };
  });
}

/* --------------------------------------------------------------- settings */

const UCRET_ETIKET = {
  bedava: { metin: 'Bedava', sinif: 'iyi' },
  yerel: { metin: 'Yerel (bedava)', sinif: 'iyi' },
  kredili: { metin: 'Kredili', sinif: 'orta' },
  degisir: { metin: 'Degisir', sinif: '' },
  yok: { metin: '-', sinif: '' },
};
const GERCEKCILIK_ETIKET = {
  dusuk: { metin: 'Dusuk', sinif: 'kotu' },
  orta: { metin: 'Orta', sinif: 'orta' },
  yuksek: { metin: 'Yuksek', sinif: 'iyi' },
  uretmez: { metin: 'Uretmez', sinif: '' },
  degisir: { metin: 'Degisir', sinif: '' },
};
const REFERANS_ETIKET = {
  ready: { metin: 'Hazir', sinif: 'iyi' },
  'needs-config': { metin: 'Ayar gerekir', sinif: 'orta' },
  none: { metin: 'Yok', sinif: 'kotu' },
};

function etiket(tablo, anahtar) {
  const e = tablo[anahtar] || { metin: anahtar || '-', sinif: '' };
  return `<span class="tag ${e.sinif}">${esc(e.metin)}</span>`;
}

/**
 * KARSILASTIRMA TABLOSU.
 *
 * "Hangisini secmeliyim" sorusunun cevabi buydu: kullanici hangi platformun
 * fotogerceklik verdigini, hangisinin referans kabul ettigini, ne kadara mal
 * oldugunu hicbir yerde goremiyordu.
 *
 * FIYAT RAKAMI YAZILMAZ. Kodda fiyat tutulmuyor ve tutulmayacak - rakamlar
 * eskiyor ve yanlis bilgi vermek bilgi vermemekten kotu. Yalnizca kategori
 * ve platformun kendi guncel fiyat sayfasina link.
 */
function comparisonTable(list, active) {
  const satir = (p) => {
    const notlar = [p.realismNote, p.referenceReason, p.resolutionNote, p.costNote, p.setupNote]
      .filter(Boolean).join(' ');
    return `
    <tr class="${p.id === active ? 'aktif' : ''}">
      <td data-label="Platform">
        <b>${esc(p.label)}</b>
        <div class="rozetler">
          ${p.id === active ? '<span class="tag iyi">aktif</span>' : ''}
          ${p.local ? '<span class="tag">yerel</span>' : ''}
          ${!p.configured && p.id !== 'manual' ? '<span class="tag orta">ayarlanmadi</span>' : ''}
        </div>
      </td>
      <td data-label="Ucret">${etiket(UCRET_ETIKET, p.cost)}</td>
      <td data-label="Fotogerceklik">${etiket(GERCEKCILIK_ETIKET, p.realism)}</td>
      <td data-label="Referans gorsel">${etiket(REFERANS_ETIKET, p.referenceState)}</td>
      <td data-label="Cozunurluk">${esc(p.maxResolution)}</td>
      <td data-label="Kurulum">
        ${esc(p.setup)}
        ${p.id !== active ? `<div class="row" style="margin-top:6px"><button class="ghost tiny" data-pick-provider="${esc(p.id)}">Sec</button></div>` : ''}
      </td>
    </tr>
    ${notlar ? `<tr class="notsatiri ${p.id === active ? 'aktif' : ''}"><td colspan="6"><span class="help">${esc(notlar)}</span></td></tr>` : ''}`;
  };

  return `
  <details class="cmp" open>
    <summary>Hangisini secmeliyim? - 10 platformun karsilastirmasi</summary>
    <div class="cmpwrap">
      <table class="cmptable">
        <thead><tr>
          <th>Platform</th><th>Ucret</th><th>Fotogerceklik</th>
          <th>Referans gorsel</th><th>Cozunurluk</th><th>Kurulum</th>
        </tr></thead>
        <tbody>${list.map(satir).join('')}</tbody>
      </table>
    </div>
    <p class="help">
      <b>"Referans gorsel"</b> yuz kilidinin calisip calismadigini soyler ve <b>senin ayarina gore</b>
      hesaplanir - "Ayar gerekir" yazan bir platformda kare uretirsen yuz her seferinde kayar.<br>
      <b>Fiyat rakami tutulmuyor</b> (eskiyor ve yanlis bilgi vermek istemiyoruz). Guncel fiyatlar:
      ${list.filter((p) => p.pricingUrl).map((p) => `<a href="${esc(p.pricingUrl)}" target="_blank" rel="noreferrer">${esc(p.label.split(' ')[0])}</a>`).join(' · ')}
    </p>
  </details>`;
}

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

      ${comparisonTable(list, active)}

      <div class="field">
        <label>Aktif platform</label>
        <select id="provsel">
          ${list.map((p) => `<option value="${p.id}" ${p.id === active ? 'selected' : ''}>
            ${esc(p.label)}${p.local ? ' (yerel)' : ''}${p.configured || p.id === 'manual' ? '' : ' — ayarlanmadi'}${
              p.referenceState === 'ready' ? ' · yuz kilidi ✓'
                : p.referenceState === 'needs-config' ? ' · yuz kilidi ayar bekliyor' : ''
            }
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
      <h2>Masaustu cikti klasoru</h2>
      <p class="help">Her is icin masaustunde <b>ayri bir klasor</b> acilir; gorsel, prompt ve
      metin o klasorde yan yana durur. Ic ice klasor acilmaz - her is kokte, yan yana.
      <span class="dim">(<span class="mono">data/</span> klasoru eskisi gibi calismaya devam eder,
      burasi ona ek.)</span></p>
      <div class="field">
        <label style="display:flex;gap:8px;align-items:center">
          <input type="checkbox" id="ciktiacik" style="width:auto"> Masaustune klasor ac
        </label>
      </div>
      <div class="field">
        <label>Klasorun yeri</label>
        <input id="ciktikok" spellcheck="false">
        <p class="help" id="ciktinot"></p>
      </div>
      <div class="row">
        <button class="btn" id="ciktikaydet">Kaydet</button>
        <button class="ghost" data-openfolder="">Klasoru ac</button>
        <button class="ghost" id="ciktivarsayilan">Varsayilana don</button>
      </div>
      <div id="ciktilist"></div>
    </div>

    <div class="card">
      <h2>Buyutme (upscale)</h2>
      <p class="help">Difuzyon modelleri ~1 MP'de egitiliyor; daha buyugunu zorlayinca anatomi bozuluyor.
      Herkesin yaptigi sey ayni: once uret, sonra buyut. Ucretsiz saglayici ~686x858 donduruyor,
      Instagram 1080 istiyor - yani buyutme "4K hevesi" degil, temel kalite ihtiyaci.</p>
      <div class="field">
        <label>Buyutme araci</label>
        <select id="upsel"></select>
        <p class="help" id="upblurb"></p>
      </div>
      <div class="field" style="max-width:220px">
        <label>Olcek</label>
        <select id="upscale">
          <option value="1">1x (kapali)</option>
          <option value="2">2x</option>
          <option value="3">3x</option>
          <option value="4">4x</option>
        </select>
      </div>
      <div id="upfields"></div>
      <div class="row"><button class="btn" id="upsave">Kaydet</button></div>
    </div>

    <div class="card">
      <h2 style="color:#ff8fa3">TUM VERIYI SIL</h2>
      <p class="lead">Karakteri, vesikalik setini ve uretilen tum gorselleri kaldirir; sihirbaz sifirdan baslar.
      Karakter bir kez kilitlendigi icin yeni bir insan yaratmanin tek yolu budur.</p>
      <div class="row"><button class="danger ghost" id="wipe">TUM VERIYI SIL</button></div>
      <p class="help">Komut satirindan: <span class="mono">node reset.js --confirm</span></p>
    </div>`;

  // --- masaustu cikti klasoru ---
  (async () => {
    const acik = document.getElementById('ciktiacik');
    const kok = document.getElementById('ciktikok');
    const not = document.getElementById('ciktinot');
    const liste = document.getElementById('ciktilist');
    if (!acik) return;

    const ciz = (data) => {
      S.cikti = data.config;
      acik.checked = !!data.config.enabled;
      kok.value = data.config.root;
      not.innerHTML = data.config.desktopFound
        ? `Varsayilan: <span class="mono">${esc(data.config.defaultRoot)}</span>`
        : '<b>Masaustu bulunamadi</b> - ciktilar proje klasorune yaziliyor.';
      liste.innerHTML = data.jobs && data.jobs.length
        ? `<hr class="sep"><p class="help">Son isler:</p>${data.jobs.slice(0, 8).map((j) => `
            <div class="jobrow">
              <span>${esc(j.name)}</span>
              <span class="dim">${j.files} dosya</span>
              <button class="ghost tiny" data-openfolder="${esc(j.name)}">Ac</button>
            </div>`).join('')}`
        : '<hr class="sep"><p class="dim">Henuz is klasoru yok - ilk uretimde olusacak.</p>';
    };

    try { ciz(await api('/api/cikti')); } catch (err) { not.textContent = err.message; }

    document.getElementById('ciktikaydet').onclick = async (e) => {
      e.target.disabled = true;
      try {
        ciz(await api('/api/cikti', { enabled: acik.checked, root: kok.value }));
        toast('Cikti klasoru kaydedildi.', 'ok');
      } catch (err) {
        toast(err.message, 'bad');
      } finally { e.target.disabled = false; }
    };

    document.getElementById('ciktivarsayilan').onclick = async () => {
      try {
        ciz(await api('/api/cikti', { enabled: true, root: S.cikti.defaultRoot }));
        toast('Varsayilana donuldu.', 'ok');
      } catch (err) { toast(err.message, 'bad'); }
    };
  })();

  // Tablodaki "Sec" butonu MEVCUT akisi kullanir: select'i degistirip
  // onun onchange'ini tetikler. Boylece tek bir kod yolu kalir.
  view.querySelectorAll('[data-pick-provider]').forEach((b) => {
    b.onclick = () => {
      const s = document.getElementById('provsel');
      s.value = b.dataset.pickProvider;
      s.onchange();
    };
  });

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

  drawUpscalers();

  async function drawUpscalers() {
    const data = await api('/api/buyutme');
    const sel = document.getElementById('upsel');
    sel.innerHTML = data.upscalers.map((u) =>
      `<option value="${u.id}" ${u.id === data.active ? 'selected' : ''}>${esc(u.label)}</option>`).join('');
    document.getElementById('upscale').value = String(data.scale || 2);

    const paint = () => {
      const u = data.upscalers.find((x) => x.id === sel.value);
      document.getElementById('upblurb').textContent = u.blurb || '';
      const box = document.getElementById('upfields');
      box.innerHTML = (u.fields || []).map((f) => {
        const val = u.config[f.key] != null && u.config[f.key] !== '' ? u.config[f.key] : (f.default != null ? f.default : '');
        const note = u.config[`${f.key}__set`] ? '<p class="help">🔒 Kayitli deger gizlendi.</p>' : '';
        if (f.type === 'select') {
          return `<div class="field"><label>${esc(f.label)}</label>
            <select id="uf_${f.key}">${f.options.map((o) => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
            ${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}</div>`;
        }
        if (f.type === 'textarea') {
          return `<div class="field"><label>${esc(f.label)}</label><textarea id="uf_${f.key}">${esc(val)}</textarea>
            ${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}${note}</div>`;
        }
        return `<div class="field"><label>${esc(f.label)}${f.required ? ' *' : ''}</label>
          <input id="uf_${f.key}" type="${f.type === 'number' ? 'number' : 'text'}" value="${esc(val)}">
          ${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}${note}</div>`;
      }).join('') || '<p class="dim">Bu secenekte ayar yok.</p>';
    };
    paint();
    sel.onchange = paint;

    document.getElementById('upsave').onclick = async (e) => {
      const u = data.upscalers.find((x) => x.id === sel.value);
      const config = {};
      for (const f of (u.fields || [])) {
        const el = document.getElementById(`uf_${f.key}`);
        if (el) config[f.key] = f.type === 'number' ? Number(el.value) : el.value;
      }
      e.target.disabled = true;
      try {
        await api('/api/buyutme', {
          id: u.id, config, makeActive: true,
          scale: Number(document.getElementById('upscale').value),
        });
        toast('Buyutme ayari kaydedildi.', 'ok');
        S.upscaler = undefined; // galeri butonu icin onbellegi tazele
        renderSettings();
      } catch (err) {
        toast(err.message, 'bad');
      } finally { e.target.disabled = false; }
    };
  }

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
      // Referans alani BOSSA bu, yuz kilidinin kapali olmasinin tek sebebidir.
      // Sessiz gecme: kalici kirmizi not + oneri + (varsa) gercek sema kesfi.
      const refNotu = f.key === 'referenceField' ? (() => {
        const bos = !String(val || '').trim();
        const g = p.referenceGuess;
        const oneri = g && g.key
          ? `<div class="guessbox">
               <b>Oneri:</b> <span class="mono">${esc(g.key)}</span>
               <span class="dim">(${esc(g.confidence)} guven)</span><br>
               <span class="help">${esc(g.why)}</span>
               <div class="row" style="margin-top:6px">
                 <button class="ghost tiny" data-guess="${esc(g.key)}">Kutuya yaz</button>
                 ${p.canDiscoverReferenceFields ? '<button class="ghost tiny" data-discover="1">Modelin alanlarini bul</button>' : ''}
               </div>
             </div>`
          : (g ? `<div class="guessbox warnbox"><span class="help">${esc(g.why)}</span>
                 ${p.canDiscoverReferenceFields ? '<div class="row" style="margin-top:6px"><button class="ghost tiny" data-discover="1">Modelin alanlarini bul</button></div>' : ''}
               </div>` : '');
        return (bos
          ? `<p class="help bad-help"><b>Bu kutu bos oldugu icin referans kare GONDERILMIYOR - yuz kilidi kapali.</b></p>`
          : '') + oneri;
      })() : '';

      return `<div class="field"><label>${esc(f.label)}${f.required ? ' *' : ''}</label>
        <input id="pf_${f.key}" type="${f.type === 'number' ? 'number' : 'text'}"
               value="${esc(val)}" ${f.type === 'password' ? 'autocomplete="off" spellcheck="false"' : ''}>
        ${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}${maskedNote}${refNotu}</div>`;
    }).join('');

    // ONERI ASLA KENDILIGINDEN UYGULANMAZ. Buton yalnizca input'u doldurur;
    // Kaydet'e basilana kadar hicbir sey degismez.
    box.querySelectorAll('[data-guess]').forEach((b) => {
      b.onclick = () => {
        const input = document.getElementById('pf_referenceField');
        if (input) { input.value = b.dataset.guess; input.focus(); }
        toast('Kutuya yazildi - kaydetmeyi unutma.', 'ok');
      };
    });

    const bul = box.querySelector('[data-discover]');
    if (bul) {
      bul.onclick = async () => {
        bul.disabled = true;
        const eskiMetin = bul.textContent;
        bul.textContent = 'Araniyor...';
        try {
          const modelInput = document.getElementById('pf_model');
          const res = await api('/api/saglayici/referans-alanlari', {
            id: p.id,
            model: modelInput ? modelInput.value : undefined,
          });
          if (!res.fields.length) {
            modal('Referans alani bulunamadi',
              `<p>Bu modelin girdi semasinda gorsel kabul eden bir alan yok.</p>
               <p class="help">Buyuk ihtimalle saf metin-den-gorsel bir model. Yuz kilidi icin
               redux / IP-Adapter / InstantID gibi referans destekleyen bir modele gecmen gerekiyor.</p>`,
              [{ label: 'Kapat', className: 'btn', onClick: closeModal }]);
          } else {
            modal('Modelin gorsel alanlari',
              `<p class="help">Modelin kendi semasindan okundu - tahmin degil.</p>` +
              res.fields.map((x) => `<div class="core" style="margin-bottom:6px">
                  <b>${esc(x.key)}</b>${x.title && x.title !== x.key ? ` - ${esc(x.title)}` : ''}
                  ${x.description ? `<br><span class="help">${esc(x.description)}</span>` : ''}
                  <div class="row" style="margin-top:6px"><button class="ghost tiny" data-pick="${esc(x.key)}">Bunu kullan</button></div>
                </div>`).join(''),
              [{ label: 'Kapat', className: 'btn', onClick: closeModal }]);
            document.querySelectorAll('[data-pick]').forEach((pb) => {
              pb.onclick = () => {
                const input = document.getElementById('pf_referenceField');
                if (input) input.value = pb.dataset.pick;
                closeModal();
                toast('Kutuya yazildi - kaydetmeyi unutma.', 'ok');
              };
            });
          }
        } catch (err) {
          toast(err.message, 'bad');
        } finally {
          bul.disabled = false;
          bul.textContent = eskiMetin;
        }
      };
    }
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
