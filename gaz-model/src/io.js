// Excel импорт/экспорт, JSON лойиҳа, файлларни юклаб олиш.
import { STAGE_NAME, normStage, normType, normStatus, num, blank, emptyModel, defaultParams, defaultScenarios, fmtP, pUnit } from './engine.js';

export const SHEETS = {
  nodes: { name: 'Тугунлар', cols: [['id', 'ID'], ['name', 'Номи'], ['type', 'Тури'], ['cat', 'Поғона'], ['N', 'N хонадон'], ['p4', 'Плита 4к'],
    ['p2', 'Плита 2к'], ['boil', 'Котел/АГВ'], ['col', 'Колонка'], ['q', 'Q қўшимча м³/соат'], ['Pnorm', 'P норм кПа'], ['Pmin', 'P мин кПа'],
    ['Pmeas', 'P ўлчанган кПа'], ['x', 'X'], ['y', 'Y'], ['zone', 'МФЙ / ҳудуд']] },
  pipes: { name: 'Қувурлар', cols: [['id', 'ID'], ['from', 'Бошланғич тугун'], ['to', 'Охирги тугун'], ['cat', 'Поғона'], ['L', 'L м'],
    ['d', 'd ички мм'], ['mat', 'Материал'], ['lay', 'Ётқизилиш'], ['year', 'Қурилган йили'], ['status', 'Ҳолати'], ['dProp', 'd таклиф мм']] },
  regs: { name: 'ГРП-ШРП', cols: [['id', 'ID'], ['name', 'Номи'], ['type', 'Тури'], ['in', 'Кириш тугуни'], ['out', 'Чиқиш тугуни'],
    ['Pset', 'Чиқиш босими кПа'], ['PinMin', 'Мин. кириш босими кПа'], ['cap', 'Ўтказиш қобилияти м³/соат']] },
  scen: { name: 'Режимлар', cols: [['name', 'Номи'], ['src', 'ГТС босими (нормал/минимал)'], ['dem', 'Сарф коэффициенти'], ['growth', 'Ўсиш %'],
    ['closed', 'Узилган элементлар'], ['variant', 'Таклиф варианти (ҳа/йўқ)']] },
};
const NUMERIC = new Set(['N', 'p4', 'p2', 'boil', 'col', 'q', 'Pnorm', 'Pmin', 'Pmeas', 'x', 'y', 'L', 'd', 'year', 'dProp', 'Pset', 'PinMin', 'cap', 'dem', 'growth']);

const META_ROWS = [['obj', 'Объект'], ['dist', 'Вилоят туман'], ['org', 'Ижрочи ташкилот'], ['exec', 'Ҳисобни бажарди'], ['check', 'Текширди'],
  ['date', 'Сана'], ['chainOk', 'Кетма-кет схема тўғри']];
const PARAM_ROWS = [['rho', 'Газ зичлиги ρ, кг/м³'], ['nu', 'Кинематик қовушоқлик ν, ×10⁻⁶ м²/с'], ['loc', 'Маҳаллий қаршиликлар, %'],
  ['ka', 'Бир вақтлилик коэффициенти a'], ['kb', 'Бир вақтлилик коэффициенти b'], ['norms.low.exc', 'Паст: яхши босим, кПа'],
  ['norms.low.sat', 'Паст: минимал босим, кПа'], ['norms.mid.min', 'Ўрта: минимал босим, кПа'], ['norms.high2.min', 'Юқори II: минимал босим, кПа'],
  ['norms.high1.min', 'Юқори I: минимал босим, кПа'], ['vmax.low', 'Паст: рухсат этилган тезлик, м/с'], ['vmax.mid', 'Ўрта: рухсат этилган тезлик, м/с'],
  ['vmax.high2', 'Юқори II: рухсат этилган тезлик, м/с'], ['vmax.high1', 'Юқори I: рухсат этилган тезлик, м/с']];

const INSTR = [
  ['Excel андозани тўлдириш бўйича кўрсатма'],
  [''],
  ['1. «Тугунлар»: ҳар бир тугун (ГТС, тармоқланиш, кўча, корхона) — ягона ID. Тури: ГТС / тугун / истеъмолчи.'],
  ['   Поғона: паст / ўрта / юқори II / юқори I. Хонадонлар ва асбоблар сони — абонентлар базасидан.'],
  ['   ГТС учун P норм ва P мин (кПа, ортиқча босим) шарт. P ўлчанган — назорат нуқталаридаги манометр кўрсаткичи.'],
  ['2. «Қувурлар»: ҳар бир участка — бошланғич ва охирги тугун ID, узунлик L (м), ички диаметр d (мм), материал (пўлат/ПЭ).'],
  ['   Ҳолати: очиқ / ёпиқ / таклиф. «таклиф» қувурлар фақат «Таклиф варианти» режимида ҳисобга олинади; d таклиф — янги диаметр.'],
  ['   МУҲИМ: ҳар бир кўча қайси магистралдан олинишини тўғри кўрсатинг. Барча кўчаларни занжир қилиб улаш хато натижа беради.'],
  ['3. «ГРП-ШРП»: кириш ва чиқиш тугунлари турли поғоналарда бўлади. Чиқиш босими (уставка), минимал кириш босими, ўтказиш қобилияти — паспортдан.'],
  ['4. «Режимлар»: ТТ §9 бўйича 6 режим. Узилган элементлар — вергул билан ID лар (масалан: Q-M02).'],
  ['5. «Параметрлар»: объект, ижрочи ва ҳисоб параметрлари. «?» белгиси — тўлдирилиши шарт бўлган катак.'],
  ['Барча босимлар — ортиқча, кПа. Натижада паст босим кПа да, ўрта ва юқори босим МПа да кўрсатилади.'],
];

function fromCell(field, v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' && v.trim() === '?') return '';
  if (field === 'cat') return normStage(v) || (typeof v === 'string' ? v.trim() : '');
  if (field === 'type') return normType(v);
  if (field === 'status') return normStatus(v);
  if (NUMERIC.has(field)) { const x = num(v); return Number.isFinite(x) ? x : (String(v).trim() ? String(v).trim() : ''); }
  return String(v).trim();
}
function toCell(field, v) {
  if (v === undefined || v === null) return '';
  if (field === 'cat') return STAGE_NAME[normStage(v)] || v;
  return v;
}

const hk = s => String(s ?? '').toLowerCase().replace(/[’ʼ‘`']/g, '').replace(/[^a-zа-яёўқғҳ0-9]/g, '');

/** Сарлавҳа қаторини топиш ва устунларни ном бўйича мослаштириш. */
function readTable(ws, def, keyHeader = 'ID') {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  let h = rows.findIndex(r => r.some(c => hk(c) === hk(keyHeader)));
  if (h < 0) h = 0;
  const head = rows[h].map(hk);
  const map = def.cols.map(([f, title]) => {
    const t = hk(title);
    let i = head.indexOf(t);
    if (i < 0) i = head.findIndex(c => c && (c.startsWith(t) || t.startsWith(c)) && c.length >= 2);
    return [f, i];
  });
  const out = [];
  for (let r = h + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every(c => String(c).trim() === '')) continue;
    const o = {};
    for (const [f, i] of map) o[f] = i >= 0 ? fromCell(f, row[i]) : '';
    out.push(o);
  }
  return out;
}

function setPath(o, path, v) { const ks = path.split('.'); let t = o; for (let k = 0; k < ks.length - 1; k++) t = t[ks[k]]; t[ks[ks.length - 1]] = v; }
function getPath(o, path) { return path.split('.').reduce((t, k) => t?.[k], o); }
const yes = v => /^(ҳа|ха|ha|yes|true|1|да|\+)$/i.test(String(v ?? '').trim());

/** Workbook → модель. Эски формат ҳам танилади. */
export function importWorkbook(wb) {
  const names = wb.SheetNames;
  const find = n => names.find(s => hk(s) === hk(n)) || names.find(s => hk(s).includes(hk(n)));
  if (!find('Тугунлар') && find('Истеъмолчилар') && find('Гидравлик ҳисоб')) return importOld(wb, find('Истеъмолчилар'), find('Гидравлик ҳисоб'));
  const M = emptyModel();
  if (find('Тугунлар')) M.nodes = readTable(wb.Sheets[find('Тугунлар')], SHEETS.nodes).filter(n => !blank(n.id) || !blank(n.name));
  if (find('Қувурлар')) M.pipes = readTable(wb.Sheets[find('Қувурлар')], SHEETS.pipes).filter(p => !blank(p.id) || !blank(p.from));
  const rs = find('ГРП-ШРП') || find('ГРП');
  if (rs) M.regs = readTable(wb.Sheets[rs], SHEETS.regs).filter(g => !blank(g.id) || !blank(g.in));
  if (find('Режимлар')) {
    const sc = readTable(wb.Sheets[find('Режимлар')], SHEETS.scen, 'Номи').filter(s => !blank(s.name));
    if (sc.length) M.scen = sc.map(s => ({ name: s.name, src: /мин|min/i.test(String(s.src)) ? 'min' : 'norm', dem: isFinite(num(s.dem)) ? num(s.dem) : 1,
      growth: isFinite(num(s.growth)) ? num(s.growth) : 0, closed: String(s.closed ?? ''), variant: yes(s.variant) }));
  }
  const ps = find('Параметрлар');
  if (ps) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[ps], { header: 1, defval: '', raw: true });
    const val = new Map(rows.filter(r => r.length >= 2).map(r => [hk(r[0]), r[1]]));
    for (const [k, t] of META_ROWS) {
      const v = val.get(hk(t));
      if (v === undefined) continue;
      M.meta[k] = k === 'chainOk' ? yes(v) : (String(v).trim() === '?' ? '' : String(v).trim());
    }
    for (const [k, t] of PARAM_ROWS) { const v = num(val.get(hk(t))); if (Number.isFinite(v)) setPath(M.params, k, v); }
  }
  M.nodes.forEach((n, k) => { if (blank(n.id)) n.id = 'N-' + (k + 1); });
  M.pipes.forEach((p, k) => { if (blank(p.id)) p.id = 'P-' + (k + 1); });
  M.regs.forEach((g, k) => { if (blank(g.id)) g.id = 'R-' + (k + 1); });
  return M;
}

/** Эски формат: «Истеъмолчилар» + «Гидравлик ҳисоб» (кўчалар занжири). */
function importOld(wb, consName, hydName) {
  const M = emptyModel();
  const cons = XLSX.utils.sheet_to_json(wb.Sheets[consName], { header: 1, defval: '', raw: true });
  const hyd = XLSX.utils.sheet_to_json(wb.Sheets[hydName], { header: 1, defval: '', raw: true });
  // ГРП даги босим
  let P0 = 3;
  for (const sheet of [hyd, cons]) for (const row of sheet) row.forEach((c, i) => {
    if (/грп.*босим|босим.*грп/i.test(String(c))) { const v = row.slice(i + 1).map(num).find(Number.isFinite); if (Number.isFinite(v) && v > 0) P0 = v; }
  });
  const col = (head, res) => head.findIndex(h => res.some(re => re.test(h)));
  const skip = r => r.some(c => /^\s*жами/i.test(String(c)));
  // истеъмолчилар
  let hc = cons.findIndex(r => r.some(c => /хонадон|квартир/i.test(String(c))));
  if (hc < 0) hc = 0;
  const H = cons[hc].map(c => String(c).toLowerCase());
  const ci = { name: col(H, [/кўча|куча|номи|мфй|улиц/]), N: col(H, [/хонадон|квартир/]), p4: col(H, [/4\s*к|4\s*конф|4-конф/]),
    p2: col(H, [/2\s*к|2\s*конф|2-конф/]), boil: col(H, [/котел|қозон|козон|агв/]), col: col(H, [/колонка|сув иситгич/]) };
  const streets = [];
  for (let r = hc + 1; r < cons.length; r++) {
    const row = cons[r];
    if (!row || skip(row)) continue;
    const name = ci.name >= 0 ? String(row[ci.name]).trim() : '';
    const N = num(row[ci.N]);
    if (!name && !Number.isFinite(N)) continue;
    streets.push({ name: name || 'Кўча ' + (streets.length + 1), N: Number.isFinite(N) ? N : '', p4: fromCell('p4', row[ci.p4]), p2: fromCell('p2', row[ci.p2]),
      boil: fromCell('boil', row[ci.boil]), col: fromCell('col', row[ci.col]) });
  }
  // гидравлик ҳисоб
  let hh = hyd.findIndex(r => r.some(c => /участка|қаердан|каердан/i.test(String(c))));
  if (hh < 0) hh = 0;
  const G = hyd[hh].map(c => String(c).toLowerCase().trim());
  const gi = { name: col(G, [/участка|кўча|номи/]), from: col(G, [/қаердан|каердан|qayerdan|откуда/]), L: col(G, [/^l\b|^l,|узунлик|длина/]), d: col(G, [/^d\b|^d,|диаметр/]) };
  const segs = [];
  for (let r = hh + 1; r < hyd.length; r++) {
    const row = hyd[r];
    if (!row || skip(row)) continue;
    const name = gi.name >= 0 ? String(row[gi.name]).trim() : '';
    if (!name && !Number.isFinite(num(row[gi.L]))) continue;
    segs.push({ name, from: gi.from >= 0 ? String(row[gi.from]).trim() : '', L: fromCell('L', row[gi.L]), d: fromCell('d', row[gi.d]) });
  }
  M.nodes.push({ id: 'GRP', name: 'ГРП', type: 'ГТС', cat: 'low', Pnorm: P0, Pmin: '' });
  const n = Math.max(streets.length, segs.length);
  const idOf = k => 'K-' + String(k + 1).padStart(2, '0');
  const nameKey = s => hk(s);
  const byName = new Map();
  for (let k = 0; k < n; k++) byName.set(nameKey((streets[k] || segs[k]).name), k);
  for (let k = 0; k < n; k++) {
    const s = streets[k] || { name: segs[k].name }, seg = segs.find(g => nameKey(g.name) === nameKey(s.name)) || segs[k] || {};
    M.nodes.push({ id: idOf(k), name: s.name, type: 'истеъмолчи', cat: 'low', N: s.N ?? '', p4: s.p4 ?? '', p2: s.p2 ?? '', boil: s.boil ?? '', col: s.col ?? '' });
    const f = String(seg.from ?? '').trim();
    let from = 'GRP';
    if (f && !/грп|шрп|grp/i.test(f)) {
      const ix = byName.get(nameKey(f));
      if (ix !== undefined) from = idOf(ix);
      else if (Number.isFinite(num(f)) && num(f) >= 1 && num(f) <= n) from = idOf(num(f) - 1);
    }
    M.pipes.push({ id: 'Q-' + idOf(k), from, to: idOf(k), cat: 'low', L: seg.L ?? '', d: seg.d ?? '', mat: 'пўлат', lay: '', year: '', status: 'очиқ', dProp: '' });
  }
  return M;
}

function aoaSheet(aoa, widths) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (widths) ws['!cols'] = widths.map(w => ({ wch: w }));
  return ws;
}

/**
 * Модел файли (таҳрирланадиган). missing — ID/майдон бўйича «?» қўйиладиган катаклар:
 * { nodes:{id:[field]}, pipes:{...}, regs:{...}, meta:[field] }
 */
export function modelWorkbook(M, missing = null) {
  const wb = XLSX.utils.book_new();
  for (const key of ['nodes', 'pipes', 'regs']) {
    const def = SHEETS[key];
    const aoa = [def.cols.map(c => c[1])];
    for (const o of M[key]) {
      const miss = missing?.[key]?.[o.id] || [];
      aoa.push(def.cols.map(([f]) => miss.includes(f) && blank(o[f]) ? '?' : toCell(f, o[f])));
    }
    XLSX.utils.book_append_sheet(wb, aoaSheet(aoa, def.cols.map(c => Math.max(8, c[1].length + 2))), def.name);
  }
  const sc = [SHEETS.scen.cols.map(c => c[1])];
  for (const s of M.scen) sc.push([s.name, s.src === 'min' ? 'минимал' : 'нормал', s.dem, s.growth, s.closed || '', s.variant ? 'ҳа' : 'йўқ']);
  XLSX.utils.book_append_sheet(wb, aoaSheet(sc, [36, 26, 18, 10, 24, 22]), SHEETS.scen.name);
  const par = [['Параметр', 'Қиймат']];
  for (const [k, t] of META_ROWS) {
    let v = k === 'chainOk' ? (M.meta.chainOk ? 'ҳа' : 'йўқ') : (M.meta[k] ?? '');
    if (missing?.meta?.includes(k) && (k === 'chainOk' || blank(v))) v = '?';
    par.push([t, v]);
  }
  for (const [k, t] of PARAM_ROWS) par.push([t, getPath(M.params, k)]);
  XLSX.utils.book_append_sheet(wb, aoaSheet(par, [40, 40]), 'Параметрлар');
  XLSX.utils.book_append_sheet(wb, aoaSheet(INSTR, [120]), 'Кўрсатма');
  return wb;
}

const ST_NAME = { ok: 'меъёрда', warn: 'паст', bad: 'меъёрдан паст', dead: 'газсиз', nosrc: 'манбасиз', fast: 'тезлик юқори', off: 'ўчирилган',
  invalid: 'нотўғри', lowin: 'кириш босими паст', over: 'ортиқча юкланган' };
export const statusName = s => ST_NAME[s] || s;

/** §9.2 натижалар китоби. */
export function resultsWorkbook(M, results, problems) {
  const wb = XLSX.utils.book_new();
  const r2 = x => Math.round(x * 100) / 100, r4 = x => Math.round(x * 10000) / 10000;
  results.forEach((R, i) => {
    const nd = [['ID', 'Номи', 'Поғона', 'Талаб, м³/соат', 'Олинган, м³/соат', 'P', 'Бирлик', 'Ҳолат']];
    M.nodes.forEach((n, k) => { const r = R.nodes[k]; nd.push([n.id, n.name || '', STAGE_NAME[r.stage], r2(r.qReq), r2(r.qGot), Number(fmtP(r.P, r.stage)), pUnit(r.stage), statusName(r.st)]); });
    XLSX.utils.book_append_sheet(wb, aoaSheet(nd, [10, 24, 10, 14, 14, 10, 7, 16]), `Р${i + 1} тугунлар`);
    const pp = [['ID', 'Бошланғич', 'Охирги', 'Поғона', 'L, м', 'd, мм', 'Q, м³/соат', 'Йўналиш', 'v, м/с', 'ΔP, кПа', 'Ҳолат']];
    M.pipes.forEach((p, e) => { const r = R.pipes[e]; pp.push([p.id, p.from, p.to, STAGE_NAME[r.stage] || '', num(p.L), num(p.d), r2(Math.abs(r.Q)), r.Q < -1e-9 ? 'тескари (охиридан бошига)' : 'тўғри', r2(r.v), r4(Math.abs(r.dP)), statusName(r.st)]); });
    XLSX.utils.book_append_sheet(wb, aoaSheet(pp, [10, 10, 10, 10, 8, 8, 11, 22, 8, 10, 14]), `Р${i + 1} қувурлар`);
  });
  const rg = [['Режим', 'ID', 'Номи', 'P кириш, кПа', 'P чиқиш, кПа', 'Сарф, м³/соат', 'Юкланиш, %', 'Ҳолат']];
  results.forEach((R, i) => (M.regs || []).forEach((g, t) => { const r = R.regs[t]; rg.push([i + 1, g.id, g.name || '', r2(r.Pin), r4(r.Pout), r2(r.Q), r2(r.load), statusName(r.st)]); }));
  XLSX.utils.book_append_sheet(wb, aoaSheet(rg, [7, 10, 18, 12, 12, 12, 11, 18]), 'ГРП-ШРП натижа');
  const pr = [['№', 'Тури', 'Элемент', 'Номи', 'Энг ёмон қиймат', 'Бирлик', 'Режимлар', 'Чора', 'Муддат']];
  problems.forEach((p, k) => pr.push([k + 1, p.kind, p.id, p.name, r2(p.worst), p.unit, p.scen.join(', '), p.measure, p.term]));
  XLSX.utils.book_append_sheet(wb, aoaSheet(pr, [5, 14, 10, 22, 12, 8, 10, 60, 8]), 'Муаммолар');
  return wb;
}

export function wbToBlob(wb) {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function readWorkbookFile(file) {
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
}

/** JSON лойиҳа → модель (эски майдонларни тўлдириш). */
export function normalizeModel(o) {
  const M = emptyModel();
  if (!o || typeof o !== 'object') return M;
  Object.assign(M.meta, o.meta || {});
  const P = defaultParams();
  M.params = { ...P, ...(o.params || {}), norms: { ...P.norms, ...(o.params?.norms || {}) }, vmax: { ...P.vmax, ...(o.params?.vmax || {}) } };
  for (const s of Object.keys(P.norms)) M.params.norms[s] = { ...P.norms[s], ...(o.params?.norms?.[s] || {}) };
  M.nodes = Array.isArray(o.nodes) ? o.nodes : [];
  M.pipes = Array.isArray(o.pipes) ? o.pipes : [];
  M.regs = Array.isArray(o.regs) ? o.regs : [];
  M.scen = Array.isArray(o.scen) && o.scen.length ? o.scen : defaultScenarios();
  return M;
}

// ---------- юклаб олиш ----------

export function inFrame() { try { return window.self !== window.top; } catch { return true; } }

export async function saveFile(filename, blob) {
  try {
    const dl = window.claude?.use?.('downloads');
    if (dl && typeof dl.save === 'function') {
      const data = new Uint8Array(await blob.arrayBuffer());
      await dl.save({ filename, data });
      return true;
    }
  } catch { /* оддий усулга ўтамиз */ }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
  return true;
}

const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h' };
/** Файл номи: лотинча (баъзи браузерлар кирилл номни «download» га алмаштиради). */
export function safeName(s) {
  const t = [...String(s || 'loyiha')].map(c => { const l = c.toLowerCase(), r = TR[l]; return r === undefined ? c : (c !== l && r ? r[0].toUpperCase() + r.slice(1) : r); }).join('');
  return t.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'loyiha';
}
