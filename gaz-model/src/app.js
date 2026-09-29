// Ҳолат, текширувлар, интерфейс.
import { STAGES, STAGE_NAME, solveAll, checkModel, collectProblems, fmtP, pUnit, normType, normStage, num, blank, defaultScenarios, autoSize, tracePath } from './engine.js';
import { sampleModel } from './sample.js';
import { importWorkbook, modelWorkbook, resultsWorkbook, wbToBlob, readWorkbookFile, normalizeModel, inFrame, saveFile, safeName, statusName } from './io.js';
import { mountScheme, legendHTML, describeElement, profileData, profileSVG } from './scheme.js';
import { buildReportHTML, buildRequestHTML, htmlToPdf, stageSummary, formulasHTML } from './report.js';

const DRAFT_KEY = 'gaz-tarmogi-modeli:draft:v1', THEME_KEY = 'gaz-tarmogi-modeli:theme';
const $ = s => document.querySelector(s);
const escH = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const S = { M: null, results: [], checks: [], problems: [], si: 0, tab: 'help', isSample: false, fileMsg: null, busy: false, sizing: null, sizingUndo: null, profNode: null };

// ---------- сақлаш ----------
function saveDraft() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ M: S.M, isSample: S.isSample, si: S.si, tab: S.tab })); } catch { /* хотира йўқ */ }
}
function loadDraft() {
  try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); if (d && d.M) return d; } catch { /* бузилган */ }
  return null;
}

function toast(msg, ms = 3500) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hide');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hide'), ms);
}

// ---------- ҳисоб ----------
function recompute() {
  S.results = solveAll(S.M);
  S.checks = checkModel(S.M, S.results);
  S.problems = collectProblems(S.M, S.results);
  if (S.si >= S.results.length) S.si = 0;
  window.__gaz = S;                       // синов учун
}
let timer = null;
function changed(now = false) {
  clearTimeout(timer);
  const run = () => { recompute(); renderAll(); saveDraft(); };
  if (now) run(); else timer = setTimeout(run, 150);
}

// ---------- лойиҳа ва параметрлар ----------
const META = [['obj', 'Объект'], ['dist', 'Вилоят, туман'], ['org', 'Ижрочи ташкилот'], ['exec', 'Ҳисобни бажарди'], ['check', 'Текширди'], ['date', 'Сана']];
function renderMeta() {
  $('#meta').innerHTML = META.map(([k, t]) => `<label class="f">${t}<input data-path="meta.${k}" ${k === 'date' ? 'type="date"' : ''} value="${escH(S.M.meta[k] ?? '')}"></label>`).join('') +
    `<label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" data-path="meta.chainOk" ${S.M.meta.chainOk ? 'checked' : ''}> Кетма-кет (занжир) схема тўғри — тасдиқлайман</label>`;
}
const PARAMS = [['rho', 'Газ зичлиги ρ, кг/м³'], ['nu', 'Қовушоқлик ν, ×10⁻⁶ м²/с'], ['loc', 'Маҳаллий қаршиликлар, %'], ['ka', 'K_бир коэффициенти a'], ['kb', 'K_бир даража кўрсаткичи b'],
  ['norms.low.exc', 'Паст: яхши босим, кПа'], ['norms.low.sat', 'Паст: минимал босим, кПа'], ['norms.mid.min', 'Ўрта: минимал, кПа'], ['norms.high2.min', 'Юқори II: минимал, кПа'],
  ['norms.high1.min', 'Юқори I: минимал, кПа'], ['vmax.low', 'Паст: v макс, м/с'], ['vmax.mid', 'Ўрта: v макс, м/с'], ['vmax.high2', 'Юқори II: v макс, м/с'], ['vmax.high1', 'Юқори I: v макс, м/с']];
const getP = (o, p) => p.split('.').reduce((t, k) => t?.[k], o);
function renderParams() {
  $('#params').innerHTML = PARAMS.map(([k, t]) => `<label class="f">${t}<input inputmode="decimal" data-path="params.${k}" data-num="1" value="${escH(getP(S.M.params, k))}"></label>`).join('') +
    `<div class="small muted" style="grid-column:1/-1">Нормалар: ШНҚ 2.04.08-22, ҚР 05.02-23; тезликлар — СП 42-101 п.3.38. Ўзгартириш барча режимларни қайта ҳисоблайди.</div>`;
}

// ---------- режимлар ва кўрсаткичлар ----------
function renderScen() {
  $('#scenBtns').innerHTML = S.M.scen.map((s, i) => `<button type="button" data-si="${i}" class="${i === S.si ? 'on' : ''}" title="${escH(s.name)}">${i + 1}. ${escH(s.name)}</button>`).join('');
}
function renderKpis() {
  const R = S.results[S.si];
  if (!R) { $('#kpis').innerHTML = ''; $('#errs').innerHTML = ''; return; }
  const st = stageSummary(S.M, R);
  const len = STAGES.filter(s => st[s].n).map(s => `${STAGE_NAME[s]} ${(st[s].L / 1000).toFixed(2)}`).join(' · ') || '—';
  const pct = R.tot > 0 ? R.short / R.tot * 100 : 0;
  const np = S.problems.filter(p => p.scen.includes(S.si + 1)).length;
  const k = (l, v, s = '', cls = '') => `<div class="kpi ${cls}"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  $('#kpis').innerHTML = [
    k('Тармоқ', `${S.M.nodes.length} / ${S.M.pipes.length} / ${(S.M.regs || []).length}`, 'тугун / қувур / ГРП'),
    k('Узунлик, км', (STAGES.reduce((a, s) => a + st[s].L, 0) / 1000).toFixed(2), len),
    k('Ҳисобий сарф', `${R.tot.toFixed(1)}`, 'м³/соат'),
    k('Етказиб берилмаган газ', `${R.short.toFixed(1)} м³/соат`, `${pct.toFixed(1)}% · ${(R.short * 24).toFixed(0)} м³/сутка гача`, R.short > 0.05 ? 'bad' : 'good'),
    k('Меъёрий босимсиз истеъмолчилар', `${R.riskN}`, `${R.risk.toFixed(1)} м³/соат`, R.riskN ? 'bad' : 'good'),
    k('Паст тармоқ мин. босими', R.minLow === null ? '—' : `${fmtP(R.minLow, 'low')} кПа`, `меъёр ≥ ${S.M.params.norms.low.sat} кПа`, R.minLow !== null && R.minLow < S.M.params.norms.low.sat ? 'bad' : ''),
    k('Муаммолар', `${np}`, `бу режимда · жами ${S.problems.length}`, np ? 'bad' : 'good'),
  ].join('');
  $('#errs').innerHTML = R.errors.map(e => `<div class="banner red">${escH(e)}</div>`).join('');
}

// ---------- вкладкалар ----------
const TABS = [['help', 'Ёрдамчи'], ['scheme', 'Схема'], ['profile', 'Профиль'], ['nodes', 'Тугунлар'], ['pipes', 'Қувурлар'], ['regs', 'ГРП / ШРП'], ['scen', 'Режимлар'], ['probs', 'Муаммолар'], ['method', 'Усул']];
function renderTabs() {
  const crit = S.checks.filter(c => c.lvl === 'crit').length;
  $('#tabs').innerHTML = TABS.map(([k, t]) => {
    const c = k === 'help' ? crit : k === 'probs' ? S.problems.length : 0;
    return `<button type="button" data-tab="${k}" class="${k === S.tab ? 'on' : ''}">${t}${c ? `<span class="cnt">${c}</span>` : ''}</button>`;
  }).join('');
}

const stCell = s => `<span class="st ${s}">${statusName(s)}</span>`;
const typeSel = (path, v) => `<select data-path="${path}">${['ГТС', 'тугун', 'истеъмолчи'].map(o => `<option ${normType(v) === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
const stageSel = (path, v) => `<select data-path="${path}"><option value="">—</option>${STAGES.map(s => `<option value="${s}" ${normStage(v) === s ? 'selected' : ''}>${STAGE_NAME[s]}</option>`).join('')}</select>`;
const statusSel = (path, v) => `<select data-path="${path}">${['очиқ', 'ёпиқ', 'таклиф'].map(o => `<option ${String(v || 'очиқ') === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
const inp = (path, v, cls = 'w1', isN = false) => `<input class="${cls}" data-path="${path}" ${isN ? 'inputmode="decimal" data-num="1"' : ''} value="${escH(v ?? '')}">`;

function nodesTab() {
  const R = S.results[S.si];
  const rows = S.M.nodes.map((n, i) => {
    const r = R?.nodes[i], p = `nodes.${i}.`;
    return `<tr><td>${inp(p + 'id', n.id)}</td><td>${inp(p + 'name', n.name, 'w3')}</td><td>${typeSel(p + 'type', n.type)}</td><td>${stageSel(p + 'cat', n.cat)}</td>
      ${['N', 'p4', 'p2', 'boil', 'col', 'q', 'Pnorm', 'Pmin', 'Pmeas', 'x', 'y'].map(f => `<td>${inp(p + f, n[f], 'w0', true)}</td>`).join('')}<td>${inp(p + 'zone', n.zone, 'w2')}</td>
      <td class="r res">${r ? r.qReq.toFixed(1) : ''}</td><td class="r res">${r ? r.qGot.toFixed(1) : ''}</td><td class="r res">${r ? `${fmtP(r.P, r.stage)} ${pUnit(r.stage)}` : ''}</td><td class="res">${r ? stCell(r.st) : ''}</td>
      <td><button type="button" data-del="nodes.${i}" title="Ўчириш">✕</button></td></tr>`;
  }).join('');
  return `<div class="row-actions"><button type="button" data-add="nodes">＋ Тугун</button><span class="small muted">Натижалар — фаол режим: ${escH(S.M.scen[S.si]?.name)}</span></div>
    <div class="tw"><table class="t"><thead><tr><th>ID</th><th>Номи</th><th>Тури</th><th>Поғона</th><th>N хонадон</th><th>Плита 4к</th><th>Плита 2к</th><th>Котел/АГВ</th><th>Колонка</th>
    <th>Q қўш., м³/с</th><th>P норм, кПа</th><th>P мин, кПа</th><th>P ўлч., кПа</th><th>X</th><th>Y</th><th>МФЙ / ҳудуд</th><th>Талаб</th><th>Олинган</th><th>P</th><th>Ҳолат</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function pipesTab() {
  const R = S.results[S.si];
  const rows = S.M.pipes.map((q, i) => {
    const r = R?.pipes[i], p = `pipes.${i}.`;
    return `<tr><td>${inp(p + 'id', q.id)}</td><td>${inp(p + 'from', q.from)}</td><td>${inp(p + 'to', q.to)}</td><td>${stageSel(p + 'cat', q.cat)}</td><td>${inp(p + 'L', q.L, 'w0', true)}</td>
      <td>${inp(p + 'd', q.d, 'w0', true)}</td><td>${inp(p + 'mat', q.mat, 'w0')}</td><td>${inp(p + 'lay', q.lay, 'w1')}</td><td>${inp(p + 'year', q.year, 'w0', true)}</td><td>${statusSel(p + 'status', q.status)}</td>
      <td>${inp(p + 'dProp', q.dProp, 'w0', true)}</td><td class="r res">${r ? Math.abs(r.Q).toFixed(1) + (r.Q < -1e-9 ? ' ←' : '') : ''}</td><td class="r res">${r ? r.v.toFixed(2) : ''}</td><td class="r res">${r ? Math.abs(r.dP).toFixed(3) : ''}</td>
      <td class="res">${r ? stCell(r.st) : ''}</td><td><button type="button" data-del="pipes.${i}" title="Ўчириш">✕</button></td></tr>`;
  }).join('');
  return `${sizingBox()}<div class="row-actions"><button type="button" data-add="pipes">＋ Қувур</button><button type="button" data-act="autosize">Диаметрларни автоматик танлаш</button>${S.sizingUndo ? '<button type="button" data-act="autosizeUndo">Танловни бекор қилиш</button>' : ''}<span class="small muted">L — м, d — ички диаметр, мм; «таклиф» ва «d таклиф» фақат 6-режимда.</span></div>
    <div class="tw"><table class="t"><thead><tr><th>ID</th><th>Бошланғич</th><th>Охирги</th><th>Поғона</th><th>L, м</th><th>d, мм</th><th>Материал</th><th>Ётқизилиш</th><th>Йили</th><th>Ҳолати</th><th>d таклиф</th>
    <th>Q, м³/соат</th><th>v, м/с</th><th>ΔP, кПа</th><th>Ҳолат</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function sizingBox() {
  const A = S.sizing;
  if (!A) return '';
  const rem = [...A.remaining.nodes.map(x => 'тугун ' + x), ...A.remaining.pipes.map(x => 'қувур ' + x)];
  return `<div class="banner ${A.ok ? 'info' : 'red'}"><b>Диаметрлар автоматик танланди (${A.scenIndex + 1}-режим).</b>
    ${A.changes.length ? `Ўзгартирилган участкалар: ${A.changes.length}; қўшимча «метал» Σ L·Δd = ${A.extraMetal.toFixed(1)} м·м. «d таклиф» устунига ёзилди.` : 'Ўзгартириш талаб этилмади.'}
    ${A.ok ? 'Барча истеъмолчилар меъёрий босимда, тезлик ошмаган.' : `Диаметр билан ҳал бўлмаган: ${escH(rem.join(', '))}.`}
    ${A.remaining.regs.length ? `<br>ГРП/ШРП муаммоси диаметр билан ҳал бўлмайди: ${escH(A.remaining.regs.join(', '))} (юкланиш ёки кириш босими — «Муаммолар»).` : ''}
    ${A.changes.length ? `<div class="tw" style="margin-top:6px"><table class="t"><thead><tr><th>Қувур</th><th>L, м</th><th>d мавжуд, мм</th><th>d таклиф, мм</th><th>Материал</th></tr></thead><tbody>${
      A.changes.map(c => `<tr><td>${escH(c.id)}</td><td class="r">${c.L}</td><td class="r">${c.d0}</td><td class="r"><b>${c.d1}</b></td><td>${escH(c.mat)}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>`;
}
function profileTab() {
  const R = S.results[S.si];
  if (!R) return '';
  const cons = S.M.nodes.map((n, k) => [n, R.nodes[k], k]).filter(([, r]) => r.qReq > 0 && r.st !== 'nosrc');
  if (!cons.length) return '<p>Истеъмолчилар йўқ.</p>';
  const worst = cons.slice().sort((a, b) => a[1].P / (a[1].stage === 'low' ? 1 : 100) - b[1].P / (b[1].stage === 'low' ? 1 : 100))[0][2];
  let k = S.M.nodes.findIndex(n => n.id === S.profNode);
  if (k < 0 || R.nodes[k].st === 'nosrc') k = worst;
  const data = profileData(S.M, R, tracePath(S.M, R, k));
  const opts = cons.map(([n, r, i]) => `<option value="${escH(n.id)}" ${i === k ? 'selected' : ''}>${escH(n.id)} ${escH(n.name || '')} — ${fmtP(r.P, r.stage)} ${pUnit(r.stage)}</option>`).join('');
  return `<div class="row-actions"><label class="f" style="flex:1 1 260px">Тугун (манбадан шу тугунгача йўл)<select id="profSel">${opts}</select></label></div>
    <p class="small muted">Ҳар бир босим поғонаси — алоҳида график (ўз бирлиги). X ўқи — манбадан масофа, км. Қизил пунктир — меъёрий минимал босим. Нуқта устига олиб боринг — маълумот.</p>
    <div class="prof">${profileSVG(S.M, R, data, { width: Math.round(Math.max(300, Math.min(900, ($('#panel').clientWidth || 800) - 30))) })}</div><div class="sch-tip" hidden></div>
    <div class="tw"><table class="t"><thead><tr><th>Тугун</th><th>Номи</th><th>Келган элемент</th><th>Масофа, км</th><th>Поғона</th><th>P</th><th>Ҳолат</th></tr></thead><tbody>${
      data.pts.map(p => `<tr><td>${escH(p.id)}</td><td>${escH(p.name)}</td><td>${escH(p.via)}</td><td class="r">${p.x.toFixed(3)}</td><td>${STAGE_NAME[p.stage]}</td><td class="r">${fmtP(p.P, p.stage)} ${pUnit(p.stage)}</td><td>${stCell(p.st)}</td></tr>`).join('')}</tbody></table></div>`;
}
function regsTab() {
  const R = S.results[S.si];
  const rows = (S.M.regs || []).map((g, i) => {
    const r = R?.regs[i], p = `regs.${i}.`;
    return `<tr><td>${inp(p + 'id', g.id)}</td><td>${inp(p + 'name', g.name, 'w2')}</td><td>${inp(p + 'type', g.type, 'w0')}</td><td>${inp(p + 'in', g.in)}</td><td>${inp(p + 'out', g.out)}</td>
      <td>${inp(p + 'Pset', g.Pset, 'w0', true)}</td><td>${inp(p + 'PinMin', g.PinMin, 'w0', true)}</td><td>${inp(p + 'cap', g.cap, 'w0', true)}</td>
      <td class="r res">${r ? r.Pin.toFixed(2) : ''}</td><td class="r res">${r ? r.Pout.toFixed(3) : ''}</td><td class="r res">${r ? r.Q.toFixed(1) : ''}</td><td class="r res">${r ? r.load.toFixed(0) : ''}</td>
      <td class="res">${r ? stCell(r.over && r.st !== 'over' ? r.st : r.st) + (r.over && r.st !== 'over' ? ' ' + stCell('over') : '') : ''}</td><td><button type="button" data-del="regs.${i}" title="Ўчириш">✕</button></td></tr>`;
  }).join('');
  return `<div class="row-actions"><button type="button" data-add="regs">＋ ГРП/ШРП</button><span class="small muted">Босимлар — кПа (ортиқча).</span></div>
    <div class="tw"><table class="t"><thead><tr><th>ID</th><th>Номи</th><th>Тури</th><th>Кириш тугуни</th><th>Чиқиш тугуни</th><th>P чиқ., кПа</th><th>P кир. мин, кПа</th><th>Ўтказиш, м³/соат</th>
    <th>P кир., кПа</th><th>P чиқ., кПа</th><th>Сарф</th><th>Юкл., %</th><th>Ҳолат</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function scenTab() {
  const rows = S.M.scen.map((s, i) => {
    const R = S.results[i], p = `scen.${i}.`;
    return `<tr><td>${i + 1}</td><td>${inp(p + 'name', s.name, 'w3')}</td><td><select data-path="${p}src"><option value="norm" ${s.src !== 'min' ? 'selected' : ''}>нормал</option><option value="min" ${s.src === 'min' ? 'selected' : ''}>минимал</option></select></td>
      <td>${inp(p + 'dem', s.dem, 'w0', true)}</td><td>${inp(p + 'growth', s.growth, 'w0', true)}</td><td>${inp(p + 'closed', s.closed, 'w2')}</td><td><input type="checkbox" data-path="${p}variant" ${s.variant ? 'checked' : ''}></td>
      <td class="r res">${R ? R.tot.toFixed(1) : ''}</td><td class="r res">${R ? R.short.toFixed(1) : ''}</td><td class="r res">${R ? R.riskN : ''}</td><td class="r res">${R && R.minLow !== null ? fmtP(R.minLow, 'low') : '—'}</td>
      <td class="res">${R ? (R.conv ? stCell('ok') : '<span class="st bad">яқинлашмади</span>') : ''}</td></tr>`;
  }).join('');
  return `<p class="small muted">ТТ §9: олти режим. «Узилган элементлар» — вергул билан қувур ёки ГРП ID лари (N-1). «Таклиф» белгиланган режимда «таклиф» ҳолатидаги қувурлар ва «d таклиф» ишлатилади.</p>
    <div class="row-actions"><button type="button" data-act="resetScen">Режимларни тиклаш</button></div>
    <div class="tw"><table class="t"><thead><tr><th>№</th><th>Номи</th><th>ГТС босими</th><th>Сарф коэфф.</th><th>Ўсиш, %</th><th>Узилган элементлар</th><th>Таклиф</th>
    <th>Сарф, м³/соат</th><th>Етказилмаган</th><th>Меъёрсиз ист.</th><th>Мин. P паст, кПа</th><th>Ҳисоб</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function probsTab() {
  if (!S.problems.length) return '<p class="status good">Муаммолар аниқланмади.</p>';
  return `<p class="small muted">Барча режимлар бўйича: тур + ID бўйича ягона ёзув, энг ёмон қиймат ва режимлар рўйхати. Тартиб: режимлар сони, сўнг муддат.</p>
    <div class="tw"><table class="t"><thead><tr><th>№</th><th>Тури</th><th>Элемент</th><th>Номи</th><th>Энг ёмон</th><th>Режимлар</th><th>Чора</th><th>Муддат</th></tr></thead><tbody>${
    S.problems.map((p, k) => `<tr><td>${k + 1}</td><td>${escH(p.kind)}</td><td>${escH(p.id)}</td><td>${escH(p.name)}</td><td class="r">${p.unit === 'кПа' ? fmtP(p.worst, 'low') : p.worst.toFixed(2)} ${p.unit}</td>
      <td>${p.scen.join(', ')}</td><td style="white-space:normal;min-width:260px">${escH(p.measure)}</td><td>${escH(p.term)}</td></tr>`).join('')}</tbody></table></div>`;
}
function methodTab() {
  return `<div class="method"><h3>Формулалар (СП 42-101-2003)</h3>${formulasHTML(S.M.params)}
    <h3>Режимлар (ТТ §9)</h3><ol>${defaultScenarios().map(s => `<li>${escH(s.name)}: ГТС босими — ${s.src === 'min' ? 'минимал' : 'нормал'}, сарф ×${s.dem}${s.growth ? `, ўсиш +${s.growth}%` : ''}${s.variant ? ', таклиф этилган қувурлар билан' : ''}.</li>`).join('')}</ol>
    <h3>Ҳолатлар</h3><p>Паст босим: меъёрда — P ≥ ${S.M.params.norms.low.exc} кПа; паст — P ≥ ${S.M.params.norms.low.sat} кПа; меъёрдан паст — ундан кам. Ўрта/юқори: P ≥ минимал.
    Газсиз — P ≈ 0 ёки талабнинг 5% дан камини олган. Манбасиз — манбага уланмаган. Қувур: тезлик юқори — v > v<sub>макс</sub>.</p>
    <h3>Чекловлар</h3><p>Баландлик фарқи, ойлик сарф маълумотлари ва регулятор тавсифномаси ҳисобга олинмаган (кейинги босқичлар).</p></div>`;
}
function helpTab() {
  const crit = S.checks.filter(c => c.lvl === 'crit').length, warn = S.checks.filter(c => c.lvl === 'warn').length;
  const status = crit ? `<div class="status bad">${crit} та муҳим маълумот етишмайди — тўлиқ ҳисобот ўрнига маълумот сўрови тайёрланади.</div>`
    : warn ? `<div class="status warn">Маълумотлар етарли. ${warn} та огоҳлантиришни кўриб чиқинг.</div>` : '<div class="status good">Маълумотлар тўлиқ — PDF ҳисобот тайёрлаш мумкин.</div>';
  const LV = { crit: 'Етишмайди', warn: 'Текширинг', tip: 'Маслаҳат' };
  const cards = S.checks.map(c => `<div class="chk ${c.lvl}"><h4><span class="lv">${LV[c.lvl]}</span>${escH(c.title)}</h4><dl>
    <dt>Нима</dt><dd>${escH(c.what)}</dd>${c.why ? `<dt>Нега муҳим</dt><dd>${escH(c.why)}</dd>` : ''}${c.where ? `<dt>Қаердан олинади</dt><dd>${escH(c.where)}</dd>` : ''}
    ${c.excel ? `<dt>Excel'да қаерга</dt><dd>${escH(c.excel)}</dd>` : ''}${c.todo ? `<dt>Нима қилиш керак</dt><dd>${escH(c.todo)}</dd>` : ''}
    ${c.ids.length ? `<dt>ID</dt><dd>${escH(c.ids.slice(0, 60).join(', '))}${c.ids.length > 60 ? ' …' : ''}</dd>` : ''}</dl></div>`).join('');
  return `<label class="drop" id="drop"><input type="file" id="fileX" accept=".xlsx,.xls,.xlsm,.json" hidden>
      <b>Excel файлни шу ерга ташланг ёки босинг</b><br><span class="small muted">Андоза («Excel андоза») ёки эски формат («Истеъмолчилар» + «Гидравлик ҳисоб»). Юклангач маълумотлар текширилади ва жавоб файл сифатида юкланади.</span></label>
    ${S.fileMsg ? `<div class="banner info">${S.fileMsg}</div>` : ''}${status}${cards || ''}`;
}

let schemeKey = '';
function renderPanel() {
  const el = $('#panel');
  if (S.tab === 'scheme') {
    const key = JSON.stringify([S.M.nodes, S.M.pipes, S.M.regs, S.si, S.results[S.si]?.tot, S.results[S.si]?.deliv]);
    if (key === schemeKey && el.querySelector('.sch')) return;
    schemeKey = key;
    el.innerHTML = `${legendHTML()}<div class="sch"></div><p class="small muted">Ғилдирак ёки тугмалар — масштаб, судраш — суриш, элемент устига олиб боринг ёки босинг — маълумот.</p>`;
    mountScheme(el.querySelector('.sch'), S.M, S.results[S.si], (k, i) => describeElement(S.M, S.results[S.si], k, i));
    return;
  }
  schemeKey = '';
  el.innerHTML = { help: helpTab, profile: profileTab, nodes: nodesTab, pipes: pipesTab, regs: regsTab, scen: scenTab, probs: probsTab, method: methodTab }[S.tab]();
}

function renderAll() {
  const ae = document.activeElement, path = ae?.dataset?.path, sel = ae && 'selectionStart' in ae ? [ae.selectionStart, ae.selectionEnd] : null;
  $('#sampleBanner').classList.toggle('hide', !S.isSample);
  renderMeta(); renderParams(); renderScen(); renderKpis(); renderTabs(); renderPanel();
  if (path) {
    const el = document.querySelector(`[data-path="${CSS.escape(path)}"]`);
    if (el && el !== document.activeElement) { el.focus({ preventScroll: true }); try { if (sel && el.setSelectionRange) el.setSelectionRange(...sel); } catch { /* select */ } }
  }
}

// ---------- таҳрирлаш ----------
function setPath(path, value) {
  const ks = path.split('.');
  let t = S.M;
  for (let k = 0; k < ks.length - 1; k++) t = t[ks[k]];
  t[ks[ks.length - 1]] = value;
}
function onEdit(e) {
  const el = e.target;
  const path = el.dataset?.path;
  if (!path) return;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.num && typeof v === 'string') { const x = num(v); v = v.trim() === '' ? '' : Number.isFinite(x) ? x : v.trim(); }
  setPath(path, v);
  changed();
}
const BLANK = {
  nodes: () => ({ id: 'N-' + (S.M.nodes.length + 1), name: '', type: 'тугун', cat: 'low', N: '', p4: '', p2: '', boil: '', col: '', q: '', Pnorm: '', Pmin: '', Pmeas: '', x: '', y: '', zone: '' }),
  pipes: () => ({ id: 'P-' + (S.M.pipes.length + 1), from: '', to: '', cat: 'low', L: '', d: '', mat: 'пўлат', lay: '', year: '', status: 'очиқ', dProp: '' }),
  regs: () => ({ id: 'ШРП-' + ((S.M.regs || []).length + 1), name: '', type: 'ШРП', in: '', out: '', Pset: 3, PinMin: 50, cap: '' }),
};

// ---------- файллар ----------
function missingMap(M) {
  const m = { nodes: {}, pipes: {}, regs: {}, meta: [] };
  const add = (k, id, f) => { (m[k][id] ||= []).push(f); };
  for (const n of M.nodes) {
    if (normType(n.type) === 'ГТС' && !(num(n.Pnorm) > 0)) add('nodes', n.id, 'Pnorm');
    if (num(n.N) > 0 && !(num(n.p4) > 0) && !(num(n.p2) > 0)) add('nodes', n.id, 'p4');
  }
  for (const p of M.pipes) for (const f of ['from', 'to', 'L', 'd']) if (blank(p[f])) add('pipes', p.id, f);
  for (const g of M.regs || []) for (const f of ['in', 'out', 'Pset']) if (blank(g[f])) add('regs', g.id, f);
  if (blank(M.meta.obj)) m.meta.push('obj');
  if (blank(M.meta.exec)) m.meta.push('exec');
  if (S.checks.some(c => c.title === 'Схема шубҳали')) m.meta.push('chainOk');
  return m;
}
const libsOk = () => typeof XLSX !== 'undefined' && typeof html2pdf !== 'undefined';
const base = () => safeName(S.M.meta.obj || 'Gaz_tarmogi');

async function fullReport() {
  const html = await buildReportHTML(S.M, S.results, S.problems, S.checks);
  window.__lastReport = html;
  const blob = await htmlToPdf(html, 'landscape');
  await saveFile(`${base()}_gidravlik_hisobot.pdf`, blob);
}
async function requestPdf(fileName) {
  const html = buildRequestHTML(S.M, S.checks, fileName);
  window.__lastRequest = html;
  const blob = await htmlToPdf(html, 'portrait');
  await saveFile(`${base()}_malumot_sorovi.pdf`, blob);
}
async function modelXlsx(mark = true) {
  await saveFile(`${base()}_model.xlsx`, wbToBlob(modelWorkbook(S.M, mark ? missingMap(S.M) : null)));
}

async function busy(label, fn) {
  if (S.busy) return;
  S.busy = true;
  document.querySelectorAll('header button').forEach(b => { b.disabled = true; });
  toast(label, 60000);
  try { await fn(); } catch (err) { console.warn(err); toast('Хато: ' + (err?.message || err), 6000); S.busy = false; enable(); return; }
  S.busy = false; enable(); toast('Тайёр', 1500);
  function enable() { document.querySelectorAll('header button').forEach(b => { b.disabled = false; }); }
}

async function handleFile(file) {
  if (!file) return;
  const name = file.name || 'файл';
  if (/\.json$/i.test(name)) {
    try { S.M = normalizeModel(JSON.parse(await file.text())); } catch { toast('JSON файл ўқилмади'); return; }
    S.isSample = false; S.fileMsg = `«${escH(name)}» лойиҳаси очилди.`; changed(true); return;
  }
  if (typeof XLSX === 'undefined') { toast('Excel кутубхонаси юкланмаган — интернетни текширинг'); return; }
  let M;
  try { M = importWorkbook(await readWorkbookFile(file)); } catch (err) { console.warn(err); toast('Excel файл ўқилмади: ' + (err?.message || err), 6000); return; }
  S.M = M; S.isSample = false; S.si = 0; S.tab = 'help';
  changed(true);
  const crit = S.checks.filter(c => c.lvl === 'crit').length;
  if (!crit) {
    S.fileMsg = `«${escH(name)}» юкланди: ${M.nodes.length} тугун, ${M.pipes.length} қувур. Маълумотлар тўлиқ — PDF ҳисобот юкланмоқда.`;
    renderAll();
    await busy('PDF ҳисобот тайёрланмоқда…', fullReport);
  } else {
    S.fileMsg = `«${escH(name)}» юкланди: ${M.nodes.length} тугун, ${M.pipes.length} қувур. ${crit} та муҳим маълумот етишмайди — PDF сўров ва «?» белгиланган Excel юкланмоқда.`;
    renderAll();
    await busy('Маълумот сўрови тайёрланмоқда…', async () => { await requestPdf(name); await modelXlsx(true); });
  }
}

async function onAction(act) {
  if (act === 'theme') {
    const cur = document.documentElement.dataset.theme || 'auto';
    const next = cur === 'auto' ? 'dark' : cur === 'dark' ? 'light' : 'auto';
    if (next === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* */ }
    toast('Мавзу: ' + { auto: 'тизим бўйича', dark: 'тўқ', light: 'ёруғ' }[next], 1500);
    return;
  }
  if (act === 'open') { $('#fileJson').click(); return; }
  if (act === 'save') { await saveFile(`${base()}.json`, new Blob([JSON.stringify(S.M, null, 1)], { type: 'application/json' })); return; }
  if (act === 'resetScen') { S.M.scen = defaultScenarios(); changed(true); return; }
  if (act === 'autosize') {
    await busy('Диаметрлар танланмоқда…', async () => {
      await new Promise(r => setTimeout(r, 30));
      const A = autoSize(S.M);
      S.sizingUndo = S.M.pipes.map(p => p.dProp ?? '');
      S.M.pipes.forEach(p => { if (A.dProp[p.id] !== undefined) p.dProp = A.dProp[p.id]; });
      const { result, ...rest } = A; void result;
      S.sizing = rest; S.si = A.scenIndex;
      changed(true);
    });
    return;
  }
  if (act === 'autosizeUndo') {
    if (S.sizingUndo) S.M.pipes.forEach((p, i) => { if (i < S.sizingUndo.length) p.dProp = S.sizingUndo[i]; });
    S.sizingUndo = null; S.sizing = null; changed(true); return;
  }
  if (!libsOk()) { toast('Excel/PDF кутубхоналари юкланмаган — интернет керак'); return; }
  if (act === 'template') { await busy('Excel тайёрланмоқда…', () => modelXlsx(true)); return; }
  if (act === 'xlsxres') { await busy('Натижалар тайёрланмоқда…', () => saveFile(`${base()}_natijalar.xlsx`, wbToBlob(resultsWorkbook(S.M, S.results, S.problems)))); return; }
  if (act === 'pdf') {
    const crit = S.checks.filter(c => c.lvl === 'crit').length;
    if (crit) { toast(`${crit} та муҳим маълумот етишмайди — тўлиқ ҳисобот ўрнига маълумот сўрови`, 5000); await busy('Маълумот сўрови тайёрланмоқда…', () => requestPdf('')); return; }
    await busy('PDF ҳисобот тайёрланмоқда…', fullReport);
  }
}

// ---------- ишга тушириш ----------
function init() {
  try { const t = localStorage.getItem(THEME_KEY); if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; } catch { /* */ }
  const d = loadDraft();
  if (d) { S.M = normalizeModel(d.M); S.isSample = !!d.isSample; S.si = d.si || 0; S.tab = TABS.some(t => t[0] === d.tab) ? d.tab : 'help'; }
  else { S.M = sampleModel(); S.isSample = true; }
  if (inFrame()) $('#frameBanner').classList.remove('hide');
  if (!libsOk()) $('#libBanner').classList.remove('hide');
  recompute(); renderAll();

  document.body.addEventListener('change', e => { if (e.target.dataset?.path) onEdit(e); });
  document.body.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.si !== undefined) { S.si = +b.dataset.si; renderAll(); saveDraft(); return; }
    if (b.dataset.tab) { S.tab = b.dataset.tab; renderAll(); saveDraft(); return; }
    if (b.dataset.add) { const k = b.dataset.add; (S.M[k] ||= []).push(BLANK[k]()); changed(true); return; }
    if (b.dataset.del) { const [k, i] = b.dataset.del.split('.'); S.M[k].splice(+i, 1); changed(true); return; }
    if (b.dataset.act) onAction(b.dataset.act);
  });
  $('#fileJson').addEventListener('change', e => { handleFile(e.target.files[0]); e.target.value = ''; });
  const panel = $('#panel');
  panel.addEventListener('change', e => { if (e.target.id === 'fileX') { handleFile(e.target.files[0]); e.target.value = ''; } });
  panel.addEventListener('dragover', e => { const d = e.target.closest?.('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  panel.addEventListener('dragleave', e => { e.target.closest?.('#drop')?.classList.remove('over'); });
  panel.addEventListener('drop', e => { const d = e.target.closest?.('#drop'); if (!d) return; e.preventDefault(); d.classList.remove('over'); handleFile(e.dataTransfer.files[0]); });
  panel.addEventListener('change', e => { if (e.target.id === 'profSel') { S.profNode = e.target.value; renderPanel(); } });
  panel.addEventListener('pointermove', e => {
    const tip = panel.querySelector('.prof ~ .sch-tip');
    if (!tip) return;
    const t = e.target.closest?.('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    const b = panel.getBoundingClientRect();
    tip.textContent = t.dataset.tip; tip.hidden = false;
    tip.style.left = Math.min(b.width - 240, e.clientX - b.left + 12) + 'px'; tip.style.top = (e.clientY - b.top + 12) + 'px';
  });
  window.__gazHandleFile = handleFile;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

