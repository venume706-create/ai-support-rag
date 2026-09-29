import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyModel, solveScenario, solveAll, lambdaQ, Kbir, Qnom, checkModel, collectProblems, nodeLoad, defaultParams, qOfDphi, pipeHyd, dphiOfQ,
} from '../src/engine.js';
import { chainModel, sampleModel, STREETS } from '../src/sample.js';

const NORM = { src: 'norm', dem: 1, growth: 0, closed: '', variant: false };
const MIN = { ...NORM, src: 'min' };
const near = (a, b, rel = 0.005, msg = '') => assert.ok(Math.abs(a - b) <= Math.abs(b) * rel + 1e-12, `${msg} ${a} ≠ ${b} (±${rel * 100}%)`);

function model() { return emptyModel(); }
const N = (M, id, o = {}) => { M.nodes.push({ id, name: id, type: 'тугун', cat: 'low', ...o }); return id; };
const Pp = (M, id, from, to, cat, L, d, o = {}) => M.pipes.push({ id, from, to, cat, L, d, mat: 'пўлат', status: 'очиқ', ...o });
const byId = (M, R, id) => R.nodes[M.nodes.findIndex(n => n.id === id)];

test('T1: паст босим, битта қувур', () => {
  const M = model();
  N(M, 'S', { type: 'ГТС', Pnorm: 3 });
  N(M, 'A', { q: 24.3 });
  Pp(M, 'P1', 'S', 'A', 'low', 300, 50);
  const R = solveScenario(M, NORM);
  assert.ok(R.conv);
  near(byId(M, R, 'A').P, 2.0728, 0.0005, 'P');
  near(R.pipes[0].v, 3.438, 0.005, 'v');
  near(lambdaQ(24.3, 50, 'пўлат'), 0.03253, 0.005, 'λ');
  near(R.pipes[0].Q, 24.3, 1e-6, 'Q');
});

test('T2: ўрта босим', () => {
  const M = model();
  N(M, 'S', { type: 'ГТС', cat: 'mid', Pnorm: 300 });
  N(M, 'A', { cat: 'mid', q: 1203 });
  Pp(M, 'P1', 'S', 'A', 'mid', 1000, 100);
  const R = solveScenario(M, NORM);
  near(byId(M, R, 'A').P, 260.20, 0.0005);
  near(byId(M, R, 'A').qGot, 1203, 1e-6);
});

test('T3: юқори II босим', () => {
  const M = model();
  N(M, 'S', { type: 'ГТС', cat: 'high2', Pnorm: 600 });
  N(M, 'A', { cat: 'high2', q: 5000 });
  Pp(M, 'P1', 'S', 'A', 'high2', 3000, 150);
  const R = solveScenario(M, NORM);
  near(byId(M, R, 'A').P, 454.33, 0.0005);
  near(R.pipes[0].v, 12.67, 0.005);
});

test('T4: иккита параллел қувур', () => {
  const M = model();
  N(M, 'A', { type: 'ГТС', Pnorm: 3 });
  N(M, 'B', { q: 40 });
  Pp(M, 'P1', 'A', 'B', 'low', 500, 70);
  Pp(M, 'P2', 'A', 'B', 'low', 500, 70);
  const R = solveScenario(M, NORM);
  near(R.pipes[0].Q, 20, 1e-6); near(R.pipes[1].Q, 20, 1e-6);
  const M1 = model();
  N(M1, 'A', { type: 'ГТС', Pnorm: 3 });
  N(M1, 'B', { q: 20 });
  Pp(M1, 'P1', 'A', 'B', 'low', 500, 70);
  const R1 = solveScenario(M1, NORM);
  near(R.pipes[0].dP, R1.pipes[0].dP, 1e-6);
});

test('T5: 4 тугун, 6 қувур — баланс ва контур', () => {
  const M = model();
  N(M, 'S', { type: 'ГТС', Pnorm: 3 });
  N(M, 'A', { q: 30 }); N(M, 'B', { q: 25 }); N(M, 'C', { q: 45 });
  Pp(M, 'e1', 'S', 'A', 'low', 300, 100); Pp(M, 'e2', 'A', 'B', 'low', 250, 70); Pp(M, 'e3', 'B', 'C', 'low', 200, 50);
  Pp(M, 'e4', 'C', 'S', 'low', 400, 80); Pp(M, 'e5', 'S', 'B', 'low', 350, 50); Pp(M, 'e6', 'A', 'C', 'low', 300, 50);
  const R = solveScenario(M, NORM);
  assert.ok(R.conv);
  for (const id of ['A', 'B', 'C']) {
    let bal = 0;
    M.pipes.forEach((p, e) => { if (p.to === id) bal += R.pipes[e].Q; if (p.from === id) bal -= R.pipes[e].Q; });
    bal -= byId(M, R, id).qGot;
    assert.ok(Math.abs(bal) < 1e-5, `баланс ${id}: ${bal}`);
  }
  // контур S→A→B→S: ΣΔP = 0
  const loop = R.pipes[0].dP + R.pipes[1].dP - R.pipes[4].dP;
  assert.ok(Math.abs(loop) < 1e-9, `контур ${loop}`);
});

test('T6: иккита ШРП бир паст тармоқни таъминлайди', () => {
  const M = model();
  N(M, 'G', { type: 'ГТС', cat: 'mid', Pnorm: 300 });
  N(M, 'M1', { cat: 'mid' }); N(M, 'M2', { cat: 'mid' });
  N(M, 'L1'); N(M, 'L2'); N(M, 'L3', { q: 120 });
  Pp(M, 'm1', 'G', 'M1', 'mid', 500, 100); Pp(M, 'm2', 'M1', 'M2', 'mid', 700, 80);
  Pp(M, 'l1', 'L1', 'L3', 'low', 300, 100); Pp(M, 'l2', 'L2', 'L3', 'low', 500, 100);
  M.regs.push({ id: 'ШРП1', in: 'M1', out: 'L1', Pset: 3, PinMin: 50, cap: 200 });
  M.regs.push({ id: 'ШРП2', in: 'M2', out: 'L2', Pset: 3, PinMin: 50, cap: 200 });
  const R = solveScenario(M, NORM);
  assert.ok(R.conv);
  near(R.regs[0].Q + R.regs[1].Q, 120, 1e-6, 'ШРП йиғиндиси');
  near(R.pipes[0].Q, 120, 1e-6, 'ўрта тармоқ');
  assert.ok(R.regs[0].Q > 0 && R.regs[1].Q > 0);
  near(R.supply, 120, 1e-6);
});

function cascade() {
  const M = model();
  N(M, 'G', { type: 'ГТС', cat: 'high2', Pnorm: 600, Pmin: 390 });
  N(M, 'H1', { cat: 'high2' });
  Pp(M, 'h1', 'G', 'H1', 'high2', 3000, 150);
  M.regs.push({ id: 'ГРП', in: 'H1', out: 'M0', Pset: 300, PinMin: 400, cap: 2000 });
  N(M, 'M0', { cat: 'mid' }); N(M, 'M1', { cat: 'mid' }); N(M, 'E1', { cat: 'mid', type: 'истеъмолчи', q: 300 });
  Pp(M, 'm1', 'M0', 'M1', 'mid', 1500, 100); Pp(M, 'm2', 'M1', 'E1', 'mid', 500, 80);
  M.regs.push({ id: 'ШРП', in: 'M1', out: 'L0', Pset: 3, PinMin: 50, cap: 200 });
  N(M, 'L0'); N(M, 'L1', { type: 'истеъмолчи', N: 100, p4: 100, boil: 100 });
  Pp(M, 'l1', 'L0', 'L1', 'low', 400, 100);
  return M;
}

test('T7: каскад ГТС → ГРП → ШРП', () => {
  const M = cascade();
  const R = solveScenario(M, NORM);
  assert.ok(R.conv);
  near(R.regs[0].Pin, 599.04, 0.0002, 'Pin norm'); near(R.regs[0].Pout, 300, 1e-9); assert.equal(R.regs[0].st, 'ok');
  near(R.regs[1].Pout, 3, 1e-9); assert.ok(R.short < 1e-6);
  const Rm = solveScenario(M, MIN);
  assert.ok(Rm.conv);
  near(Rm.regs[0].Pin, 388.62, 0.0002, 'Pin min'); near(Rm.regs[0].Pout, 291.47, 0.0002, 'Pout min');
  near(Rm.regs[0].Pout, 300 * Rm.regs[0].Pin / 400, 1e-6);
  assert.equal(Rm.regs[0].st, 'lowin');
  near(Rm.regs[1].Pout, 3, 1e-9); assert.ok(Rm.short < 1e-6);
  near(R.supply, R.deliv, 1e-9);
});

test('T8: ортиқча юклама — манфий босим йўқ', () => {
  const M = model();
  N(M, 'S', { type: 'ГТС', Pnorm: 3 });
  N(M, 'A', { q: 1180 });
  Pp(M, 'P1', 'S', 'A', 'low', 600, 50);
  const R = solveScenario(M, NORM);
  assert.ok(R.conv);
  const a = byId(M, R, 'A');
  assert.ok(a.P >= 0 && a.Praw >= 0);
  near(a.P, 0.0065, 0.2, 'P≈0.0065');
  near(a.qGot, 31.6, 0.01, 'олинган');
  near(R.short, 1148.4, 0.002);
  assert.equal(a.st, 'dead');
  assert.ok(R.pipes[0].dP <= 3);
});

test('T9: Ҳалқобод занжири', () => {
  const M = chainModel();
  const R = solveAll(M);
  for (const r of R) {
    assert.ok(r.conv, 'яқинлашди');
    for (const n of r.nodes) { assert.ok(n.P >= 0); if (Number.isFinite(n.Praw)) assert.ok(n.Praw >= -1e-9, `Praw ${n.Praw}`); }
    for (const p of r.pipes) assert.ok(p.dP <= 3 + 1e-9);
  }
  near(R[0].tot, 1203.7, 0.5 / 1203.7);
  near(R[0].deliv, 29.9, 0.02);
  const cards = checkModel(M, R);
  assert.ok(cards.some(c => c.lvl === 'crit' && c.title === 'Схема шубҳали'));
  M.meta.chainOk = true;
  assert.ok(!checkModel(M, R).some(c => c.title === 'Схема шубҳали'));
});

test('T10: N-1 — ягона қувур узилган', () => {
  const M = chainModel();
  const R = solveScenario(M, { ...NORM, closed: 'Q-K-01' });
  for (let k = 1; k < M.nodes.length; k++) assert.equal(R.nodes[k].st, 'nosrc');
  near(R.risk, R.tot, 1e-9);
  assert.ok(R.errors.some(e => e.includes('Манбага уланмаган қисм')));
  const probs = collectProblems(M, [R]);
  assert.ok(probs.some(p => p.kind === 'Манбасиз' && p.measure.startsWith('Захира')));
});

test('T11: бир вақтлилик коэффициенти', () => {
  near(Kbir(32), 0.3221, 0.0005);
  assert.equal(Kbir(0), 0);
  const s = STREETS[0];
  assert.equal(Math.round(Qnom(s) * 10) / 10, 137.2);
});

test('қувур: Q(Δφ) тескари функция узлуксиз ва аниқ', () => {
  const P = defaultParams();
  for (const [st, d] of [['low', 50], ['mid', 100], ['low', 250], ['high1', 300]]) {
    const h = pipeHyd(500, d, 'пўлат', st, P);
    let prevQ = -Infinity;
    for (let k = -8; k <= 6; k += 0.01) {
      const a = Math.pow(10, k) * (st === 'low' ? 1000 : 0.01);
      const [Q] = qOfDphi(h, a);
      assert.ok(Q >= prevQ - 1e-12, 'монотон');
      prevQ = Q;
      if (Math.abs(Q - h.Q4) > 1e-9 * h.Q4) near(dphiOfQ(h, Q), a, 1e-9);
    }
  }
});

// ---------- T12: тасодифий тармоқлар ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const DS = [26, 33, 41, 51, 70, 82, 100, 125, 150, 207, 259, 309];

/**
 * Тасодифий тармоқ: 4 поғона (юқори I → юқори II → ўрта → паст), ҳар бирида дарахт + ҳалқалар,
 * L 50–1550 м, d сортаментдан. harsh=true — атайлаб ҳаддан ташқари юкланган (стресс) вариант.
 */
export function randomNet(seed, harsh = false) {
  const r = rng(seed), pick = a => a[Math.floor(r() * a.length)], M = emptyModel();
  const stages = [['high1', 1000, 700], ['high2', 550, 400], ['mid', 280, 200], ['low', 3, 50]];
  const dset = harsh ? { high1: DS.slice(3), high2: DS.slice(3), mid: DS.slice(3), low: DS.slice(1, 10) }
    : { high1: DS.slice(6), high2: DS.slice(6), mid: DS.slice(4, 11), low: DS.slice(3, 10) };
  const qmax = harsh ? { high1: 1500, high2: 1500, mid: 300 } : { high1: 400, high2: 300, mid: 80 };
  const Nmax = harsh ? 80 : 50;
  let prev = null, pid = 0;
  stages.forEach(([st], s) => {
    const n = 3 + Math.floor(r() * 30), ids = [];
    for (let k = 0; k < n; k++) {
      const id = `${st}-${k}`, o = { id, name: id, type: 'тугун', cat: st };
      if (s === 0 && k === 0) Object.assign(o, { type: 'ГТС', Pnorm: 1000, Pmin: 650 });
      else if (k > 0) {
        if (st === 'low') { const NN = Math.floor(r() * Nmax); Object.assign(o, { N: NN, p4: NN, p2: Math.floor(r() * 5), boil: Math.floor(r() * NN), col: Math.floor(r() * 5) }); }
        else o.q = r() < 0.4 ? Math.round(r() * qmax[st]) : '';
      }
      M.nodes.push(o); ids.push(id);
      if (k > 0) M.pipes.push({ id: 'p' + pid++, from: ids[Math.floor(r() * k)], to: id, cat: st, L: 50 + r() * 1500, d: pick(dset[st]), mat: r() < 0.3 ? 'ПЭ' : 'пўлат', status: 'очиқ' });
    }
    const rings = Math.floor(r() * 4);
    for (let k = 0; k < rings && n > 3; k++) {
      const a = pick(ids), b = pick(ids);
      if (a !== b) M.pipes.push({ id: 'p' + pid++, from: a, to: b, cat: st, L: 50 + r() * 1500, d: pick(dset[st]), mat: 'пўлат', status: 'очиқ' });
    }
    if (prev) {
      const nr = 1 + Math.floor(r() * 2);
      for (let k = 0; k < nr; k++) M.regs.push({ id: `R${s}-${k}`, in: pick(prev), out: k === 0 ? ids[0] : pick(ids.slice(1).length ? ids.slice(1) : ids), Pset: stages[s][1], PinMin: stages[s][2], cap: 3000 });
    }
    prev = ids;
  });
  const seen = new Set();                     // бир хил чиқиш тугунли регуляторлардан биттаси қолади
  M.regs = M.regs.filter(g => !seen.has(g.out) && seen.add(g.out));
  return M;
}

function invariants(harsh) {
  let notConv = 0, cases = 0, starved = 0;
  const bad = [];
  for (let s = 1; s <= 200; s++) {
    const M = randomNet(s * 7919, harsh);
    for (const sc of [NORM, MIN, { ...NORM, dem: 1.8, growth: 30 }]) {
      const R = solveScenario(M, sc);
      cases++;
      if (R.outerIters > 1) starved++;
      if (!R.conv) { notConv++; bad.push(`seed ${s} ${sc.src}/${sc.dem}`); }
      assert.equal(R.errors.includes('ҳисоб яқинлашмади — натижа ишончсиз'), !R.conv);
      for (const n of R.nodes) {
        assert.ok(Number.isFinite(n.P) && n.P >= 0, `P seed ${s}`);
        assert.ok(Number.isFinite(n.qGot) && n.qGot >= 0 && n.qGot <= n.qReq + 1e-9);
      }
      for (const p of R.pipes) assert.ok(Number.isFinite(p.Q) && Number.isFinite(p.v));
      for (const g of R.regs) assert.ok(g.Pin >= 0 && g.Pout >= 0 && g.Pout <= 1000);
      const err = Math.abs(R.supply - R.deliv) / Math.max(1, R.deliv);
      assert.ok(err < 1e-3, `баланс seed ${s}: ${R.supply} vs ${R.deliv}`);
    }
  }
  return { notConv, cases, starved, bad };
}

test('T12: 200 тасодифий тармоқ × 3 режим — инвариантлар, яқинлашмаган йўқ', () => {
  const { notConv, cases, starved, bad } = invariants(false);
  console.log(`# T12: ${cases} ҳисоб, ГРП «очлиги» ${starved} та, яқинлашмаган ${notConv}`);
  assert.equal(notConv, 0, bad.join('; '));
});

test('T12-стресс: ҳаддан ташқари юкланган тармоқлар — инвариантлар; яқинлашмаса албатта белгиланади', () => {
  const { notConv, cases, starved, bad } = invariants(true);
  console.log(`# T12-стресс: ${cases} ҳисоб, ГРП «очлиги» ${starved} та, яқинлашмаган ${notConv} (${(100 * notConv / cases).toFixed(1)}%): ${bad.join('; ')}`);
  assert.ok(notConv / cases <= 0.02, `${notConv}/${cases}`);
});

test('намуна тармоқ (§11)', () => {
  const M = sampleModel();
  const R = solveAll(M);
  R.forEach((r, i) => assert.ok(r.conv, `режим ${i + 1}`));
  assert.ok(R[0].short < 1e-6, 'режим 1 да етказилмаган газ йўқ');
  assert.ok(R[0].minLow > 1.5 && R[0].minLow < 1.9, 'minLow ≈ 1,63…1,73: ' + R[0].minLow);
  const i3 = M.regs.findIndex(g => g.id === 'ШРП-3');
  assert.ok(R[0].regs[i3].over, 'ШРП-3 ортиқча юкланган');
  const i1 = M.regs.findIndex(g => g.id === 'ГРП-1');
  assert.equal(R[1].regs[i1].st, 'lowin');
  const crit = checkModel(M, R).filter(c => c.lvl === 'crit');
  assert.deepEqual(crit.map(c => c.title), []);
  assert.ok(collectProblems(M, R).length > 0);
  assert.ok(nodeLoad(M.nodes[0], M.params) === 0);
});

// ---------- §13.6, §13.7 ----------
import { autoSize, tracePath, nextSize } from '../src/engine.js';

test('§13.7: манбадан тугунгача йўл (ГРП орқали)', () => {
  const M = cascade();
  const R = solveScenario(M, NORM);
  const path = tracePath(M, R, M.nodes.findIndex(n => n.id === 'L1'));
  assert.deepEqual(path.map(s => M.nodes[s.k].id), ['G', 'H1', 'M0', 'M1', 'L0', 'L1']);
  assert.equal(path.at(-1).x, 3000 + 1500 + 400);
  assert.ok(path.some(s => s.r !== null));
});

test('§13.6: занжир (T9) учун диаметрлар танланади — барча тугунлар меъёрда', () => {
  const M = chainModel();
  const A = autoSize(M, { scenIndex: 5 });
  assert.ok(A.ok, JSON.stringify(A.remaining));
  assert.ok(A.changes.length > 0);
  const M2 = JSON.parse(JSON.stringify(M));
  M2.pipes.forEach(p => { if (A.dProp[p.id]) p.dProp = A.dProp[p.id]; });
  const R = solveScenario(M2, { ...NORM, variant: true });
  assert.ok(R.nodes.every(n => !(n.qReq > 0) || n.st === 'ok'));
  assert.ok(R.short < 1e-6);
  // минималлик: бирорта қувурни бир поғона кичрайтирсак, мақсад бузилади
  for (const c of A.changes.slice(0, 8)) {
    const M3 = JSON.parse(JSON.stringify(M2));
    const p = M3.pipes.find(q => q.id === c.id);
    const smaller = [26, 33, 41, 51, 70, 82, 100, 125, 150, 207, 259, 309, 408].filter(x => x < c.d1 && x >= c.d0 * 0.999).pop();
    if (!smaller) continue;
    p.dProp = smaller;
    const R3 = solveScenario(M3, { ...NORM, variant: true });
    assert.ok(R3.nodes.some(n => n.qReq > 0 && n.st !== 'ok') || R3.pipes.some(q => q.st === 'fast'), `${c.id} ${smaller} ҳам етарли`);
  }
});

test('§13.6: намуна тармоқ — паст тармоқдаги «паст» тугунлар тузатилади', () => {
  const M = sampleModel();
  const A = autoSize(M);
  assert.ok(A.ok, JSON.stringify(A.remaining));
  assert.ok(A.remaining.regs.includes('ШРП-3'), 'ШРП-3 юкланиши диаметр билан ҳал бўлмайди');
  assert.equal(nextSize(50, 'пўлат'), 70);
  assert.equal(nextSize(130.8, 'ПЭ'), 184);
});

test('§13.1: баландлик фарқи (паст босим)', () => {
  const M = model();
  N(M, 'S', { type: 'ГТС', Pnorm: 3, z: 0 });
  N(M, 'A', { q: 24.3, z: 100 });
  N(M, 'B', { z: -50 });
  Pp(M, 'P1', 'S', 'A', 'low', 300, 50);
  Pp(M, 'P2', 'S', 'B', 'low', 200, 50);
  const R = solveScenario(M, NORM);
  const dh = 9.81 * (1.293 - 0.73) / 1000;        // кПа/м
  near(byId(M, R, 'A').P, 2.0728 + 100 * dh, 0.0005, 'A');   // T1 + 100 м юқорида
  near(byId(M, R, 'B').P, 3 - 50 * dh, 1e-6, 'B');           // оқимсиз — фақат гидростатика
  near(R.pipes[0].Q, 24.3, 1e-9);
  // баландлик кўрсатилмаса — T1 билан бир хил
  M.nodes.forEach(n => { n.z = ''; });
  near(byId(M, solveScenario(M, NORM), 'A').P, 2.0728, 0.0005);
});

import { calibrate } from '../src/engine.js';
test('§13.4: калибровка — синтетик ўлчовлардан ғадир-будурлик тикланади', () => {
  const M = sampleModel();
  M.params.nk = 4;
  const R = solveScenario(M, M.scen[0]);
  for (const id of ['L-01', 'L-06', 'L-14', 'L-23', 'L-29', 'K-02']) { const k = M.nodes.findIndex(n => n.id === id); M.nodes[k].Pmeas = +R.nodes[k].P.toFixed(4); }
  M.params.nk = 1;
  const C = calibrate(M);
  assert.ok(C.ok && C.n === 6);
  near(C.nk, 4, 0.03, 'nk');
  assert.ok(C.rmsAfter < 0.01 && C.rmsBefore > C.rmsAfter * 5, `${C.rmsBefore} ${C.rmsAfter}`);
  assert.equal(calibrate(sampleModel()).ok, false);
});
