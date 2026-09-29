// PDF ҳисобот (ТТ §17, 15 бўлим) ва етишмаётган маълумотлар бўйича PDF-сўров.
import { STAGES, STAGE_NAME, num, isNum, fmtP, pUnit, normType, chainDepth, tracePath, seasonal } from './engine.js';
import { statusName } from './io.js';
import { schemeSVG, svgToPng, profileData, profileSVG } from './scheme.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = x => (Number(x) || 0).toFixed(1), f2 = x => (Number(x) || 0).toFixed(2), f0 = x => Math.round(Number(x) || 0).toLocaleString('ru-RU');
const pv = (P, st) => `<span class="pv">${fmtP(P, st)}</span>`;          // босим: ҳеч қачон манфий эмас
const table = (head, rows, cls = '') => `<table class="${cls}"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
  rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

const CSS = `
.rep{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;font-size:11px;line-height:1.4}
.rep h1{font-size:22px;margin:0 0 8px}.rep h2{font-size:15px;margin:14px 0 6px;border-bottom:2px solid #2f6db3;padding-bottom:3px;color:#1d3f6e}
.rep h3{font-size:12.5px;margin:10px 0 4px}.rep p{margin:4px 0}
.rep table{border-collapse:collapse;width:100%;margin:4px 0 8px;font-size:10px}
.rep th,.rep td{border:1px solid #9aa4b2;padding:2px 4px;text-align:left;vertical-align:top}
.rep th{background:#e8eef7}.rep tr{page-break-inside:avoid}
.rep .num td{text-align:right}.rep .num td:first-child,.rep .num td:nth-child(2){text-align:left}
.rep .red{color:#c0262d;font-weight:bold}.rep .ok{color:#1f7a45}.rep .muted{color:#555}
.rep .pb{page-break-before:always}.rep .title{text-align:center;padding-top:40px}
.rep .title .org{font-size:14px;font-weight:bold;letter-spacing:.5px}.rep .title .obj{font-size:17px;margin:14px 0}
.rep .box{border:1px solid #9aa4b2;padding:8px 10px;margin:8px 0;background:#f6f8fb}
.rep .sign{display:flex;justify-content:space-between;margin-top:40px}.rep .sign div{width:45%}
.rep .formula{font-family:'Times New Roman',serif;font-size:12px;margin:3px 0 3px 12px}
.rep img{max-width:100%}.rep .crit{border-left:4px solid #c0262d;padding:4px 8px;margin:6px 0;background:#fff4f4}
.rep .warn{border-left:4px solid #e0a100;padding:4px 8px;margin:6px 0;background:#fffaee}`;

export function stageSummary(M, R) {
  const out = {};
  for (const s of STAGES) out[s] = { n: 0, L: 0, dL: 0, dmin: Infinity };
  M.pipes.forEach((p, e) => {
    const s = R?.pipes?.[e]?.stage || 'low', L = num(p.L), d = num(p.d);
    if (!(L > 0) || !out[s]) return;
    const o = out[s]; o.n++; o.L += L; if (d > 0) { o.dL += d * L; o.dmin = Math.min(o.dmin, d); }
  });
  return out;
}

export function formulasHTML(P) {
  return `<p><b>Ҳисобий сарф</b> (СП 42-101): Q<sub>ном</sub> = 1,2·n<sub>4к</sub> + 0,6·n<sub>2к</sub> + 2,5·n<sub>котел</sub> + 2,2·n<sub>колонка</sub>, м³/соат;
  K<sub>бир</sub>(N) = min(1; a·N<sup>b</sup>), a = ${P.ka}, b = ${P.kb}; Q<sub>тугун</sub> = K<sub>бир</sub>·Q<sub>ном</sub> + Q<sub>қўшимча</sub>; режимда Q·k<sub>сарф</sub>·(1 + ўсиш/100).</p>
  <p><b>Ишқаланиш коэффициенти λ</b>: Re = 0,0354·Q/(d·ν); Re &lt; 2000: λ = 64/Re; 2000–4000: λ = 0,0025·Re<sup>0,333</sup>;
  Re ≥ 4000: λ = 0,11·(n·k<sub>n</sub>/d + 68/Re)<sup>0,25</sup>, n = 0,01 см (пўлат), 0,0007 см (ПЭ), k<sub>n</sub> = ${P.nk ?? 1} (калибровка). d — см, ν = ${P.nu}·10⁻⁶ м²/с.</p>
  <p class="formula">Паст босим: ΔP = 626,1·λ·Q²·ρ·L′/d⁵, Па</p>
  <p class="formula">Ўрта ва юқори босим: P<sub>б</sub>² − P<sub>о</sub>² = 1,2687·10⁻⁴·λ·Q²·ρ·L′/d⁵, МПа (абсолют)</p>
  <p class="formula">Баландлик тузатмаси (паст босим): P<sub>о</sub> = P<sub>б</sub> − ΔP + g·(ρ<sub>ҳаво</sub> − ρ)·(z<sub>о</sub> − z<sub>б</sub>), ρ<sub>ҳаво</sub> = ${P.rhoAir ?? 1.293} кг/м³</p>
  <p>L′ = L·(1 + ${P.loc}/100) — маҳаллий қаршиликлар ҳисобга олинган; ρ = ${P.rho} кг/м³.
  Тезлик v = Q/(3600·πd²/4), ўрта ва юқори босимда ·P<sub>атм</sub>/P<sub>ўрт</sub>.</p>
  <p><b>Босимга боғлиқ истеъмол</b>: s = P/P<sub>т</sub>; s ≥ 1 — тўлиқ сарф; 0 &lt; s &lt; 1 — q = q<sub>т</sub>·(√(s+ε) − √ε)/(√(1+ε) − √ε), ε = 0,01;
  s ≤ 0 — q = 0. Тармоқ ўтказа олмаган газ — <b>етказиб берилмаган газ</b> Σ(q<sub>т</sub> − q). Шу сабабли босим манфий бўлмайди.</p>
  <p><b>Ечиш усули</b>: тугун потенциаллари (паст: φ = P, ўрта/юқори: φ = P<sub>абс</sub>²), Ньютон усули, Якобиан — сийрак симметрик матрица,
  предобуславливателли қўшма градиентлар; ҳалқалар, тупиклар ва параллел қувурлар алоҳида элемент сифатида. ГРП/ШРП: P<sub>чиқ</sub> = P<sub>созл</sub>,
  ${P.regChar === 'char' ? 'агар сарф регулятор ўтказиш қобилиятидан ошмаса; акс ҳолда тўлиқ очиқ клапан тавсифномаси бўйича: Q = K·√((p<sub>1</sub> − p<sub>2</sub>)·p<sub>2</sub>), критик оқимда Q = K·p<sub>1</sub>/2 (абсолют босимлар), K — паспорт қобилияти (P<sub>кир.мин</sub>, P<sub>созл</sub>) бўйича.' : 'агар P<sub>кир</sub> ≥ P<sub>кир.мин</sub>; акс ҳолда P<sub>созл</sub>·P<sub>кир</sub>/P<sub>кир.мин</sub>.'} Поғоналар пастдан юқорига (сарф) ва юқоридан пастга (босим) ўзаро боғланади.</p>`;
}

const TERM = { 'тезкор': 'Тезкор (1 йилгача)', 'ўрта': 'Ўрта муддатли (1–3 йил)', 'узоқ': 'Узоқ муддатли (3 йилдан ортиқ)' };

export async function buildReportHTML(M, results, problems, checks) {
  const R1 = results[0], R6 = results.find(r => r.scen?.variant) || results[5];
  const P = M.params, meta = M.meta;
  const S = stageSummary(M, R1);
  const crit = checks.filter(c => c.lvl === 'crit'), warn = checks.filter(c => c.lvl === 'warn');
  const totalKm = STAGES.reduce((s, k) => s + S[k].L, 0) / 1000;
  const src = M.nodes.filter(n => normType(n.type) === 'ГТС');
  const probIn = i => problems.filter(p => p.scen.includes(i + 1)).length;
  let png = null;
  try { png = await svgToPng(schemeSVG(M, R1, { print: true }), 2400); } catch { png = null; }
  // §13.7: энг паст нисбий босимли истеъмолчигача профиль
  let prof = null;
  const cons = M.nodes.map((n, k) => [k, R1.nodes[k]]).filter(([, r]) => r.qReq > 0 && r.st !== 'nosrc');
  if (cons.length) {
    const rel = r => r.P / (r.stage === 'low' ? P.norms.low.sat : P.norms[r.stage].min);
    const [kw] = cons.sort((a, b) => rel(a[1]) - rel(b[1]))[0];
    const data = profileData(M, R1, tracePath(M, R1, kw));
    const imgs = [];
    for (const svg of profileSVG(M, R1, data, { print: true, width: 900 }).split('</svg>').filter(x => x.trim())) {
      try { imgs.push((await svgToPng(svg + '</svg>', 1800)).data); } catch { /* ўтказиб юборамиз */ }
    }
    prof = { id: M.nodes[kw].id, name: M.nodes[kw].name || '', data, imgs };
  }

  const Z = seasonal(M);
  const worst = results.reduce((a, r, i) => (r.short > (a?.short ?? -1) ? { ...r, i } : a), null);
  const verdict = R1.short > 0.01 || R1.riskN > 0
    ? `Амалдаги максимал режимда ${R1.riskN} та истеъмолчи меъёрий босимсиз, етказиб берилмаган газ ${f1(R1.short)} м³/соат.`
    : `Амалдаги максимал режимда барча истеъмолчилар меъёрий босим билан таъминланади.`;
  const verdict2 = worst && worst.short > 0.01 ? ` Энг оғир режим — «${esc(worst.scen.name)}»: етказиб берилмаган газ ${f1(worst.short)} м³/соат.` : '';

  const h = [];
  // 1. Титул
  h.push(`<div class="title"><div class="org">${esc(meta.org || '—')}</div>
    <h1 style="margin-top:30px">ГАЗ ТАҚСИМЛАШ ТАРМОҒИНИНГ ГИДРАВЛИК ҲИСОБИ</h1>
    <div class="muted">«Ҳудудгазтаъминот» АЖ техник топшириғи (2026) асосида</div>
    <div class="obj"><b>${esc(meta.obj || '—')}</b><br>${esc(meta.dist || '')}</div>
    <div>${esc(meta.date || '')}</div>
    <div class="box" style="text-align:left;margin:24px auto;max-width:760px"><b>Қисқа хулоса.</b> ${verdict}${verdict2}
      Муаммолар реестрида ${problems.length} та ёзув.</div>
    <div class="sign"><div>Ҳисобни бажарди: ____________ ${esc(meta.exec || '')}</div><div>Текширди: ____________ ${esc(meta.check || '')}</div></div></div>`);
  // 2. Ижрочилар
  h.push(`<h2 class="pb">1. Ижрочилар</h2>${table(['Вазифа', 'Ф.И.Ш. / ташкилот'], [['Ижрочи ташкилот', esc(meta.org || '—')], ['Ҳисобни бажарди', esc(meta.exec || '—')], ['Текширди', esc(meta.check || '—')], ['Сана', esc(meta.date || '—')]])}`);
  // 3. ТЗ ва чегаралар
  h.push(`<h2>2. Техник топшириқ ва ҳисоб чегаралари</h2>
    <p>Ҳисоб ГТС дан охирги истеъмолчигача бўлган тўлиқ модель бўйича бажарилди (ТТ §3.1, §4.2): тармоқ узунлиги ${totalKm.toFixed(2)} км,
    ${M.nodes.length} тугун, ${M.pipes.length} участка, ${(M.regs || []).length} ГРП/ШРП. Ҳалқалар, тупиклар ва параллел қувурлар алоҳида элемент сифатида киритилган (§4.3).</p>
    ${table(['Поғона', 'Участкалар', 'Узунлик, км'], STAGES.filter(s => S[s].n).map(s => [STAGE_NAME[s], S[s].n, (S[s].L / 1000).toFixed(3)]), 'num')}
    <p><b>Манбалар:</b> ${src.map(n => `${esc(n.id)} (нормал ${f1(num(n.Pnorm))} кПа${isNum(n.Pmin) ? `, минимал ${f1(num(n.Pmin))} кПа` : ''})`).join('; ') || '—'}.</p>`);
  // 4. Норматив база
  h.push(`<h2>3. Норматив база</h2><ul><li>ШНҚ 2.04.08-22 «Газ таъминоти»;</li><li>ҚР 05.02-23;</li><li>Вазирлар Маҳкамасининг 31.05.2024 йилдаги 319-сон қарори;</li>
    <li>СП 42-101-2003 — гидравлик ҳисоб формулалари;</li></ul>
    ${table(['Поғона', 'Минимал босим', 'Рухсат этилган тезлик, м/с'], [['паст', `${P.norms.low.sat} кПа (яхши ≥ ${P.norms.low.exc} кПа)`, P.vmax.low],
      ['ўрта', `${P.norms.mid.min} кПа`, P.vmax.mid], ['юқори II', `${P.norms.high2.min} кПа`, P.vmax.high2], ['юқори I', `${P.norms.high1.min} кПа`, P.vmax.high1]])}`);
  // 5. Аудит
  h.push(`<h2>4. Бошланғич маълумотлар аудити</h2>
    ${crit.length ? crit.map(c => `<div class="crit"><b>${esc(c.title)}.</b> ${esc(c.what)} ${c.ids.length ? `<span class="muted">(${esc(c.ids.slice(0, 20).join(', '))})</span>` : ''}</div>`).join('') : '<p class="ok">Жиддий камчиликлар йўқ.</p>'}
    ${warn.map(c => `<div class="warn"><b>${esc(c.title)}.</b> ${esc(c.what)} ${c.ids.length ? `<span class="muted">(${esc(c.ids.slice(0, 20).join(', '))})</span>` : ''}</div>`).join('')}
    <p><b>Қабул қилинган фаразлар:</b> босимлар — ортиқча; материал кўрсатилмаса — пўлат; поғонаси кўрсатилмаган қувур — у жойлашган тармоқ қисмининг поғонаси;
    P мин кўрсатилмаса — нормал босим; бир вақтлилик коэффициенти K = ${P.ka}·N^${P.kb}.${M.meta.chainOk ? ' Кетма-кет схема буюртмачи томонидан тасдиқланган.' : ''}</p>`);
  // 6. Мавжуд тармоқ
  h.push(`<h2 class="pb">5. Мавжуд тармоқ тавсифи</h2>
    ${table(['Поғона', 'Участкалар', 'Узунлик, км', 'Ўртача вазнли d, мм', 'Минимал d, мм'], STAGES.filter(s => S[s].n).map(s => [STAGE_NAME[s], S[s].n, (S[s].L / 1000).toFixed(3), S[s].L ? f1(S[s].dL / S[s].L) : '—', Number.isFinite(S[s].dmin) ? S[s].dmin : '—']), 'num')}
    <h3>ГРП / ШРП</h3>${(M.regs || []).length ? table(['ID', 'Номи', 'Тури', 'Кириш → чиқиш', 'Созланган P чиқ., кПа', 'P кир. мин, кПа', 'Ўтказиш қобилияти, м³/соат'],
      M.regs.map(g => [esc(g.id), esc(g.name || ''), esc(g.type || ''), `${esc(g.in)} → ${esc(g.out)}`, esc(g.Pset), esc(g.PinMin), esc(g.cap)])) : '<p>—</p>'}`);
  // 7, 9. Ўлчовлар ва калибровка
  const meas = M.nodes.map((n, k) => [n, R1.nodes[k]]).filter(([n]) => isNum(n.Pmeas));
  h.push(`<h2>6. Ўлчовлар ва калибровка</h2>${meas.length ? table(['Тугун', 'Ўлчанган, кПа', 'Ҳисобий, кПа', 'Фарқ, %'], meas.map(([n, r]) => {
      const m = num(n.Pmeas), dev = m ? (r.P - m) / m * 100 : 0;
      return [esc(n.id), f2(m), pv(r.P, 'low'), `<span class="${Math.abs(dev) > 10 ? 'red' : ''}">${dev.toFixed(1)}</span>`];
    }), 'num') + `<p>Ғадир-будурлик коэффициенти k<sub>n</sub> = ${P.nk ?? 1}${Number(P.nk ?? 1) !== 1 ? ' (ўлчовлар бўйича энг кичик квадратлар усулида танланган)' : ''}.</p><p>Фарқ 10% дан ортиқ бўлган нуқталар қизил рангда; улар учун қувур ҳолати (ички диаметр, ифлосланиш) ва юкламаларни аниқлаштириш тавсия этилади.</p>`
    : '<p class="red">Назорат нуқталарида ўлчанган босимлар тақдим этилмаган — модель калибровка қилинмаган (ТТ §9, §14). Натижалар ҳисобий баҳо ҳисобланади.</p>'}`);
  // 8. Модель ва параметрлар
  h.push(`<h2>7. Модель ва ҳисоб параметрлари</h2>${formulasHTML(P)}
    ${table(['Режим', 'Яқинлашиш', 'ГРП итерациялари'], results.map((r, i) => [`${i + 1}. ${esc(r.scen.name)}`, r.conv ? '<span class="ok">яқинлашди</span>' : '<span class="red">ҳисоб яқинлашмади</span>', r.outerIters]))}`);
  // 10. Натижалар
  h.push(`<h2 class="pb">8. Режимлар бўйича натижалар</h2>
    ${table(['Режим', 'Ҳисобий сарф, м³/соат', 'Етказилган, м³/соат', 'Етказиб берилмаган, м³/соат', 'Етказиб берилмаган, м³/сутка*', 'Меъёрий босимсиз истеъмолчилар', 'Паст тармоқ мин. P, кПа', 'Муаммолар'],
      results.map((r, i) => [`${i + 1}. ${esc(r.scen.name)}`, f1(r.tot), f1(r.deliv), `<span class="${r.short > 0.05 ? 'red' : ''}">${f1(r.short)}</span>`, f1(r.short * 24),
        `${r.riskN} (${f1(r.risk)} м³/соат)`, r.minLow === null ? '—' : pv(r.minLow, 'low'), probIn(i)]), 'num')}
    <p class="muted">* Суткалик ҳажм — юқори баҳо: соатлик етишмовчилик × 24 (пик соатлар бутун сутка давом этади деб фараз қилинган).${Z ? ' Ойлик маълумотлар бўйича аниқроқ баҳо — қуйида.' : ' Аниқ баҳо учун ойлик қабул маълумотлари керак (ТТ §3.4).'}</p>
    ${Z ? `<h3>Етказиб берилмаган газнинг мавсумий ҳажми (ойлик қабул бўйича)</h3>${table(['Ой', 'Қабул, м³', 'Юклама k', 'Чўққи соатда, м³/соат', 'м³/сутка', 'м³/ой'],
      [...Z.rows.map(r => [r.name, f0(r.V), r.k.toFixed(2), f1(r.peakShort), f0(r.shortDay), f0(r.shortMonth)]), ['<b>Йил</b>', '', '', '', '', `<b>${f0(Z.year)}</b>`]], 'num')}
      <p class="muted">Ойлик қабул мавсумий шакл сифатида олинган (k = V/V<sub>макс</sub>; энг кўп ой чўққи соати — 1-режим), сутка ичидаги тақсимот — маиший истеъмолнинг типик соатбай профили; ҳар бир соатлик юклама учун тармоқ қайта ҳисобланган.</p>` : ''}
    ${(M.regs || []).length ? `<h3>ГРП/ШРП: кириш босими ва юкланиш бўйича режимлар</h3>${table(['Режим', ...M.regs.map(g => esc(g.id))],
      results.map((r, i) => [`${i + 1}`, ...r.regs.map((g, t) => g.st === 'off' ? '—' : `<span class="${g.lowin || g.dead || g.over ? 'red' : ''}">${pv(g.Pin, 'low')} кПа · ${g.load.toFixed(0)}%</span>`)]), 'num')}` : ''}
    <h3>1-режим схемаси</h3>${png ? `<img src="${png.data}" style="max-height:640px;object-fit:contain">` : '<p>—</p>'}
    ${prof ? `<h3>Босим профили: манбадан ${esc(prof.id)} ${esc(prof.name)} гача (энг паст нисбий босим)</h3>
      ${prof.imgs.map(src => `<img src="${src}" style="width:760px;display:block">`).join('')}
      ${table(['Тугун', 'Келган элемент', 'Масофа, км', 'P', 'Бирлик'], prof.data.pts.map(p => [esc(p.id), esc(p.via), p.x.toFixed(3), pv(p.P, p.stage), pUnit(p.stage)]), 'num')}` : ''}
    <p class="muted">Қувур ранги — босим поғонаси (юқори I — тўқ қизил-бинафша, юқори II — пушти, ўрта — кўк, паст — сариқ, кулранг — манбасиз); тугун ранги — ҳолат (яшил — меъёрда, сариқ — паст, қизил — меъёрдан паст, тўқ қизил — газсиз). Пунктир — таклиф ёки ёпиқ.</p>`);
  // 11. Муаммолар
  h.push(`<h2 class="pb">9. Муаммолар реестри</h2>${problems.length ? table(['№', 'Тури', 'Элемент', 'Энг ёмон қиймат', 'Режимлар', 'Чора', 'Муддат'],
    problems.map((p, k) => [k + 1, esc(p.kind), `${esc(p.id)} ${esc(p.name)}`, p.unit === 'кПа' ? `${pv(p.worst, 'low')} кПа` : `${f2(p.worst)} ${p.unit}`, p.scen.join(', '), esc(p.measure), esc(p.term)])) : '<p class="ok">Муаммолар аниқланмади.</p>'}`);
  // 12. Солиштириш
  if (R6) {
    const bad = R => R.nodes.filter(n => n.qReq > 0 && ['bad', 'dead', 'nosrc'].includes(n.st)).length;
    const fixed = M.nodes.map((n, k) => [n, R1.nodes[k], R6.nodes[k]]).filter(([, a, b]) => a.qReq > 0 && ['bad', 'dead', 'warn'].includes(a.st) && b.st === 'ok');
    h.push(`<h2>10. Мавжуд ва таклиф этилаётган ҳолат солиштируви</h2>
      ${table(['Кўрсаткич', 'Мавжуд (1-режим)', 'Таклиф (6-режим)'], [['Етказиб берилмаган газ, м³/соат', f1(R1.short), f1(R6.short)], ['Меъёрий босимсиз истеъмолчилар', bad(R1), bad(R6)],
        ['Паст тармоқ мин. босими, кПа', R1.minLow === null ? '—' : pv(R1.minLow, 'low'), R6.minLow === null ? '—' : pv(R6.minLow, 'low')],
        ['Муаммолар сони', probIn(0), probIn(results.indexOf(R6))]])}
      ${fixed.length ? `<p>Таклиф натижасида меъёрга келтирилган тугунлар: ${fixed.map(([n, a, b]) => `${esc(n.id)} (${pv(a.P, a.stage)} → ${pv(b.P, b.stage)} ${pUnit(b.stage)})`).join('; ')}.</p>` : ''}
      <p>Таклиф этилган элементлар: ${M.pipes.filter(p => /таклиф/i.test(p.status || '') || isNum(p.dProp)).map(p => `${esc(p.id)}${isNum(p.dProp) ? ` (d → ${p.dProp} мм)` : ''}`).join(', ') || '—'}.
      Ҳар бир ечим 6-режимда қайта ҳисоб билан тасдиқланган (ТТ §14).</p>`);
  }
  // 13. Чоралар дастури
  h.push(`<h2>11. Чоралар дастури</h2>${['тезкор', 'ўрта', 'узоқ'].map(t => {
    const L = problems.filter(p => p.term === t);
    return L.length ? `<h3>${TERM[t]}</h3><ol>${L.map(p => `<li><b>${esc(p.id)}</b> (${esc(p.kind)}, режимлар ${p.scen.join(', ')}): ${esc(p.measure)}.</li>`).join('')}</ol>` : '';
  }).join('') || '<p>Чоралар талаб этилмайди.</p>'}`);
  // 14. Хулоса
  const nosrcScen = results.map((r, i) => r.errors.some(e => e.startsWith('Манбага')) ? i + 1 : 0).filter(Boolean);
  h.push(`<h2>12. Хулоса</h2><ol><li>${verdict}${verdict2}</li>
    <li>Минимал кириш босими режимида (2-режим) ${results[1] ? `${results[1].riskN} та истеъмолчи меъёрий босимсиз; ${results[1].regs.filter(g => g.lowin).length} та ГРП/ШРП кириш босими паст.` : '—'}</li>
    ${nosrcScen.length ? `<li>Манбадан узилган қисмлар ${nosrcScen.join(', ')}-режимларда аниқланди — захира таъминот (ҳалқалаш) кўриб чиқилсин.</li>` : ''}
    <li>Муаммолар реестрида ${problems.length} та ёзув; тезкор чоралар — ${problems.filter(p => p.term === 'тезкор').length}, ўрта муддатли — ${problems.filter(p => p.term === 'ўрта').length}, узоқ муддатли — ${problems.filter(p => p.term === 'узоқ').length}.</li>
    <li>${meas.length ? 'Модель ўлчовлар билан солиштирилди (6-бўлим).' : 'Модель ўлчовлар билан калибровка қилинмаган — назорат ўлчовларини ўтказиш тавсия этилади.'}</li>
    ${results.some(r => !r.conv) ? '<li class="red">Айрим режимларда ҳисоб яқинлашмади — уларнинг натижалари ишончсиз, маълумотларни текширинг.</li>' : ''}</ol>`);
  // 15. Иловалар
  h.push(`<h2 class="pb">13. Иловалар: 1-режим тугунлари</h2>${table(['ID', 'Номи', 'Поғона', 'Талаб, м³/соат', 'Олинган, м³/соат', 'P', 'Бирлик', 'Ҳолат'],
    M.nodes.map((n, k) => { const r = R1.nodes[k]; return [esc(n.id), esc(n.name || ''), STAGE_NAME[r.stage], f1(r.qReq), f1(r.qGot), pv(r.P, r.stage), pUnit(r.stage), statusName(r.st)]; }), 'num')}
    <h2 class="pb">14. Иловалар: 1-режим қувурлари</h2>${table(['ID', 'Бошланғич', 'Охирги', 'Поғона', 'L, м', 'd, мм', 'Q, м³/соат', 'v, м/с', 'ΔP, кПа', 'Ҳолат'],
    M.pipes.map((p, e) => { const r = R1.pipes[e]; return [esc(p.id), esc(p.from), esc(p.to), STAGE_NAME[r.stage] || '', esc(p.L), esc(p.d), `${f1(Math.abs(r.Q))}${r.Q < -1e-9 ? ' ←' : ''}`, f2(r.v), `<span class="pv">${Math.abs(r.dP).toFixed(3)}</span>`, statusName(r.st)]; }), 'num')}<p class="muted">«←» — газ қувур охиридан бошига томон оқади (ҳалқада оқим йўналиши).</p>`);
  return `<div class="rep"><style>${CSS}</style>${h.join('\n')}</div>`;
}

/** §7 ТТ: буюртмачидан олинадиган маълумотлар. */
const TZ7 = ['Газ тақсимлаш тармоғи ижро чизмалари (трасса, узунлик, диаметр, материал, ётқизилиш усули, қурилган йили)', 'ГТС чиқишидаги нормал ва минимал босим (қишки пик)',
  'ГРП/ШРП паспортлари: регулятор тури, созланган чиқиш босими, минимал кириш босими, ўтказиш қобилияти', 'Абонентлар базаси: кўчалар/МФЙ бўйича хонадонлар, газ асбоблари (плита, котел/АГВ, колонка)',
  'Саноат ва коммунал-маиший истеъмолчилар соатлик сарфи', 'Назорат нуқталаридаги босим ўлчовлари (калибровка учун)', 'Ойлик/суткалик газ қабул қилиш маълумотлари (етказиб берилмаган газ ҳажми учун)',
  'Тармоқнинг истиқболли ривожланиш режаси (янги истеъмолчилар)'];

export function buildRequestHTML(M, checks, fileName) {
  const crit = checks.filter(c => c.lvl === 'crit'), warn = checks.filter(c => c.lvl === 'warn');
  const ch = chainDepth(M);
  const card = c => `<div class="${c.lvl === 'crit' ? 'crit' : 'warn'}"><b>${esc(c.title)}</b><br>${esc(c.what)}
    ${c.why ? `<br><i>Нега муҳим:</i> ${esc(c.why)}` : ''}${c.where ? `<br><i>Қаердан олинади:</i> ${esc(c.where)}` : ''}${c.excel ? `<br><i>Excel'да қаерга:</i> ${esc(c.excel)}` : ''}
    ${c.todo ? `<br><i>Нима қилиш керак:</i> ${esc(c.todo)}` : ''}${c.ids.length ? `<br><span class="muted">ID: ${esc(c.ids.slice(0, 40).join(', '))}${c.ids.length > 40 ? ' …' : ''}</span>` : ''}</div>`;
  return `<div class="rep"><style>${CSS}</style>
    <h1>Маълумотлар бўйича сўров</h1>
    <p><b>Объект:</b> ${esc(M.meta.obj || '—')} &nbsp; <b>Туман:</b> ${esc(M.meta.dist || '—')} &nbsp; <b>Сана:</b> ${new Date().toISOString().slice(0, 10)}</p>
    <div class="box">Тўлиқ гидравлик ҳисобот тайёрлаш учун <b>${crit.length}</b> та муҳим маълумот етишмайди${warn.length ? `, ${warn.length} та маълумотни текшириш керак` : ''}.
    Илова қилинган Excel файлда тўлдирилиши шарт бўлган катаклар «?» билан белгиланган. Тўлдирилган файлни дастурга қайта юкланг.</div>
    <h2>Юкланган маълумотлар</h2>${table(['Кўрсаткич', 'Қиймат'], [['Файл', esc(fileName || '—')], ['Тугунлар', M.nodes.length], ['Қувурлар', M.pipes.length], ['ГРП/ШРП', (M.regs || []).length],
      ['Истеъмолчилар', ch.consumers], ['Манбадан энг узоқ тугунгача участкалар', ch.max]])}
    <h2>Етишмаётган маълумотлар</h2>${crit.map(card).join('') || '<p>—</p>'}
    ${warn.length ? `<h2>Текшириш керак</h2>${warn.map(card).join('')}` : ''}
    <h2>ТТ §7 бўйича тақдим этиладиган маълумотлар рўйхати</h2><ol>${TZ7.map(t => `<li>${t}</li>`).join('')}</ol></div>`;
}

/** HTML → PDF Blob (html2pdf), саҳифа рақамлари «i / n». */
export async function htmlToPdf(html, orientation = 'landscape') {
  if (typeof html2pdf === 'undefined') throw new Error('html2pdf кутубхонаси юкланмаган (интернет йўқми?)');
  const el = document.createElement('div');
  el.style.width = orientation === 'landscape' ? '1040px' : '720px';
  el.style.background = '#fff';
  el.innerHTML = html;
  const opt = {
    margin: [8, 8, 12, 8], image: { type: 'jpeg', quality: 0.92 },
    html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation }, pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.crit', '.warn', 'img'] },
  };
  const worker = html2pdf().set(opt).from(el).toPdf();
  const pdf = await worker.get('pdf');
  const n = pdf.internal.getNumberOfPages(), W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) { pdf.setPage(i); pdf.setFontSize(9); pdf.setTextColor(90); pdf.text(`${i} / ${n}`, W - 14, H - 5, { align: 'right' }); }
  return pdf.output('blob');
}

