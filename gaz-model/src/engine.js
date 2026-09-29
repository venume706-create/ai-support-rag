// Газ тармоғи гидравлик модели — ҳисоб ядроси.
// Тоза функциялар: DOM йўқ, Node'да ишлайди (test/engine.test.mjs).
// Формулалар: СП 42-101-2003; меъёрлар: ШНҚ 2.04.08-22, ҚР 05.02-23.

export const P0 = 0.101325;                 // атмосфера босими, МПа
export const STAGES = ['high1', 'high2', 'mid', 'low'];
export const STAGE_NAME = { low: 'паст', mid: 'ўрта', high2: 'юқори II', high1: 'юқори I' };
export const STAGE_COLOR = { high1: '#8e2c5a', high2: '#c0447a', mid: '#2f6db3', low: '#d9a100', none: '#9a9a9a' };
export const APPL = { p4: 1.2, p2: 0.6, boil: 2.5, col: 2.2 };   // асбоблар сарфи, м³/соат

export function defaultParams() {
  return {
    rho: 0.73, nu: 14.3, loc: 10, ka: 0.85, kb: -0.28,
    norms: { low: { exc: 2.0, sat: 1.2 }, mid: { min: 50 }, high2: { min: 150 }, high1: { min: 300 } },
    vmax: { low: 7, mid: 15, high2: 25, high1: 25 },
  };
}

export function defaultScenarios() {
  return [
    { name: 'Амалдаги максимал қишки режим', src: 'norm', dem: 1, growth: 0, closed: '', variant: false },
    { name: 'Минимал кириш босими режими', src: 'min', dem: 1, growth: 0, closed: '', variant: false },
    { name: 'Ёзги минимал сарф режими', src: 'norm', dem: 0.3, growth: 0, closed: '', variant: false },
    { name: 'Авария / N-1 режими', src: 'norm', dem: 1, growth: 0, closed: '', variant: false },
    { name: 'Истиқболли юклама', src: 'norm', dem: 1, growth: 20, closed: '', variant: false },
    { name: 'Таклиф этилаётган ечимлар', src: 'norm', dem: 1, growth: 0, closed: '', variant: true },
  ];
}

export function emptyModel() {
  return {
    meta: { obj: '', dist: '', org: '', exec: '', check: '', date: '', chainOk: false },
    params: defaultParams(), nodes: [], pipes: [], regs: [], scen: defaultScenarios(),
  };
}

// ---------- ёрдамчи парсерлар ----------

/** Сон: "1 234,5" → 1234.5; бўш ёки "?" → NaN. */
export function num(v) {
  if (v === null || v === undefined) return NaN;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return NaN;
  const s = String(v).trim().replace(/[\s ]/g, '').replace(',', '.').replace(/^−/, '-');
  if (s === '' || s === '?') return NaN;
  const x = Number(s);
  return Number.isFinite(x) ? x : NaN;
}
const n0 = v => { const x = num(v); return Number.isFinite(x) ? x : 0; };
export const isNum = v => Number.isFinite(num(v));
export const blank = v => v === null || v === undefined || String(v).trim() === '' || String(v).trim() === '?';

function lowerKey(s) { return String(s ?? '').toLowerCase().replace(/[’ʼ‘`']/g, '').replace(/\s+/g, ' ').trim(); }

/** Босим поғонаси: паст / ўрта / юқори II / юқори I (кирилл, лотин, low/mid/high). */
export function normStage(v) {
  if (v === null || v === undefined) return '';
  const raw = String(v).trim();
  if (STAGES.includes(raw)) return raw;
  const s = lowerKey(raw);
  if (!s) return '';
  if (/^(паст|past|low|низ|н\.?д\.?|нд)/.test(s)) return 'low';
  if (/^(ўрта|урта|орта|o[‘’ʼ']?rta|orta|mid|сред|с\.?д\.?|сд)/.test(s)) return 'mid';
  if (/(юқори|юкори|yuqori|high|выс|в\.?д\.?|вд)/.test(s) || /^(i|ii|1|2)$/.test(s)) {
    if (/(ii|2|іі|ⅱ)\s*$/.test(s) || /\b(ii|2)\b/.test(s)) return 'high2';
    return 'high1';
  }
  return '';
}

export function normType(v) {
  const s = lowerKey(v);
  if (/^(гтс|грс|gts|grs|манба|source|src)/.test(s)) return 'ГТС';
  if (/^(истеъмол|истемол|iste|consumer|потреб)/.test(s)) return 'истеъмолчи';
  return 'тугун';
}

export function normStatus(v) {
  const s = lowerKey(v);
  if (/^(ёпиқ|ёпик|епик|yopiq|closed|закр|off)/.test(s)) return 'ёпиқ';
  if (/^(таклиф|taklif|proposed|предл|new|янги)/.test(s)) return 'таклиф';
  return 'очиқ';
}

export function isPE(mat) { return /(пэ|pe|полиэт|poliet)/i.test(String(mat ?? '')); }

export function splitIds(s) {
  return String(s ?? '').split(/[,;\s]+/).map(x => x.trim()).filter(Boolean);
}

// ---------- 4.1 ҳисобий сарф ----------

export function Kbir(N, ka = 0.85, kb = -0.28) {
  N = n0(N);
  if (N <= 0) return 0;
  return Math.min(1, ka * Math.pow(N, kb));
}

export function Qnom(n) {
  return APPL.p4 * n0(n.p4) + APPL.p2 * n0(n.p2) + APPL.boil * n0(n.boil) + APPL.col * n0(n.col);
}

/** Тугуннинг ҳисобий сарфи (режим коэффициентисиз), м³/соат. */
export function nodeLoad(n, P) {
  if (normType(n.type) === 'ГТС') return 0;
  return Kbir(n.N, P.ka, P.kb) * Qnom(n) + Math.max(0, n0(n.q));
}

// ---------- 4.2 ишқаланиш коэффициенти ----------

const RE_X = Math.pow(25600, 1 / 1.333);   // 64/Re = 0.0025·Re^0.333 кесишган нуқта (≈2019.6)

/** λ(Re). 2000…2020 оралиғида 64/Re ва ўтиш формуласининг каттаси — λ узлуксиз бўлиши учун. */
export function lambdaRe(Re, nd) {
  if (!(Re > 0)) return 0;
  if (Re < 2000) return 64 / Re;
  if (Re < 4000) return Math.max(64 / Re, 0.0025 * Math.pow(Re, 0.333));
  return 0.11 * Math.pow(nd + 68 / Re, 0.25);
}

export function reynolds(Q, dmm, nu = 14.3) { return 0.0354 * Math.abs(Q) / ((dmm / 10) * nu * 1e-6); }

export function lambdaQ(Q, dmm, mat, nu = 14.3) {
  const dcm = dmm / 10;
  return lambdaRe(reynolds(Q, dmm, nu), (isPE(mat) ? 0.0007 : 0.01) / dcm);
}

// ---------- 4.3 қувур: Δφ = r·Q·|Q| ----------

/** Қувурнинг гидравлик доимийлари. stage — компонента поғонаси. */
export function pipeHyd(Lm, dmm, mat, stage, P) {
  const dcm = dmm / 10;
  const Lp = Lm * (1 + P.loc / 100);
  const C = stage === 'low' ? 626.1 : 1.2687e-4;
  const K = C * P.rho * Lp / Math.pow(dcm, 5);
  const beta = 0.0354 / (dcm * P.nu * 1e-6);
  const nd = (isPE(mat) ? 0.0007 : 0.01) / dcm;
  const h = { K, beta, nd, dmm, stage };
  h.QX = RE_X / beta;                       // ламинар чегараси
  h.hX = K * 64 * h.QX / beta;
  h.Q4 = 4000 / beta;
  h.hT4 = K * 0.0025 * Math.pow(4000, 0.333) * h.Q4 * h.Q4;
  h.hU4 = K * 0.11 * Math.pow(nd + 68 / 4000, 0.25) * h.Q4 * h.Q4;
  h.cT = K * 0.0025 * Math.pow(beta, 0.333);
  return h;
}

/** Δφ(Q) = K·λ(Q)·Q·|Q|. */
export function dphiOfQ(h, Q) {
  const a = Math.abs(Q);
  return Math.sign(Q) * h.K * lambdaRe(h.beta * a, h.nd) * a * a;
}

/**
 * Берилган Δφ бўйича сарф: h(Q)=K·λ(Q)·Q² тескари функцияси, аниқ ечим.
 * h монотон ўсувчи, Re=4000 да сакраш бор — у ерда Q=Q4 (Q(Δφ) узлуксиз).
 * Қайтаради [Q, dQ/dΔφ].
 */
export function qOfDphi(h, dphi, Qguess) {
  const a = Math.abs(dphi), sg = dphi < 0 ? -1 : 1;
  if (a === 0) return [0, h.beta / (64 * h.K)];
  if (a <= h.hX) {                                  // ламинар
    const g = h.beta / (64 * h.K);
    return [sg * a * g, g];
  }
  if (a < h.hT4) {                                  // ўтиш зонаси
    const Q = Math.pow(a / h.cT, 1 / 2.333);
    return [sg * Q, Q / (2.333 * a)];
  }
  if (a <= h.hU4) return [sg * h.Q4, h.Q4 / (2 * a)]; // Re=4000 сакраши
  // турбулент: Q = √(a/(K·λ(Q))), қисқарувчи итерация
  let Q = Qguess && Math.abs(Qguess) > h.Q4 ? Math.abs(Qguess) : Math.sqrt(a / (h.K * 0.11 * Math.pow(h.nd, 0.25)));
  for (let k = 0; k < 60; k++) {
    const lam = 0.11 * Math.pow(h.nd + 68 / (h.beta * Q), 0.25);
    const Qn = Math.sqrt(a / (h.K * lam));
    const done = Math.abs(Qn - Q) <= 1e-14 * Qn;
    Q = Qn;
    if (done) break;
  }
  const x = h.nd + 68 / (h.beta * Q);
  const lam = 0.11 * Math.pow(x, 0.25);
  const dh = h.K * (2 * lam * Q - 0.0275 * Math.pow(x, -0.75) * 68 / h.beta);
  return [sg * Q, 1 / Math.max(dh, 1e-300)];
}

// потенциал φ ↔ босим (кПа, ортиқча)
export function phiOfP(Pk, stage) { return stage === 'low' ? Pk * 1000 : Math.pow(Pk / 1000 + P0, 2); }
export function pOfPhi(phi, stage) { return stage === 'low' ? phi / 1000 : (Math.sqrt(Math.max(phi, 0)) - P0) * 1000; }

// ---------- 4.4 босимга боғлиқ истеъмол ----------

const EPS = 0.01, SQE = Math.sqrt(EPS), DEN = Math.sqrt(1 + EPS) - Math.sqrt(EPS);

export function demandFactor(s) {
  if (s >= 1) return 1;
  if (s <= 0) return 0;
  return (Math.sqrt(s + EPS) - SQE) / DEN;
}

/** [q, dq/dφ] — тугун олган сарф ва унинг ҳосиласи. */
function demand(qr, Pt, stage, phi) {
  if (!(qr > 0)) return [0, 0];
  let P, dPdphi;
  if (stage === 'low') { P = phi / 1000; dPdphi = 1 / 1000; } else {
    if (phi <= 0) return [0, 0];
    const sp = Math.sqrt(phi);
    P = (sp - P0) * 1000; dPdphi = 1000 / (2 * sp);
  }
  const s = P / Pt;
  if (s >= 1) return [qr, 0];
  if (s <= 0) return [0, 0];
  const r = Math.sqrt(s + EPS);
  return [qr * (r - SQE) / DEN, qr / (DEN * 2 * r) / Pt * dPdphi];
}

// ---------- 4.5 битта поғона: Ньютон + CG ----------

/**
 * comp: { n (тугунлар сони), pipes:[{i,j,h,Q}], fixed: Float64Array|NaN (φ), qr[], Pt[], extra[], stage,
 *         xfn: [[k, φ => [q, dq/dφ]]] — босимга боғлиқ қўшимча юклар (ГРП кириши) }
 * phi0 — илиқ бошланғич (ихтиёрий). Қайтаради {phi, Q, conv, iters, maxF}.
 */
export function solveComponent(comp, phi0) {
  const { n, pipes, fixed, qr, Pt, extra, stage } = comp;
  const xf = Array.from({ length: n }, () => null);
  for (const [k, fn] of comp.xfn || []) (xf[k] ||= []).push(fn);
  const free = [], loc = new Int32Array(n).fill(-1);
  let minFix = Infinity;
  for (let k = 0; k < n; k++) {
    if (Number.isFinite(fixed[k])) minFix = Math.min(minFix, fixed[k]);
    else { loc[k] = free.length; free.push(k); }
  }
  const phi = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    if (Number.isFinite(fixed[k])) phi[k] = fixed[k];
    else if (phi0 && Number.isFinite(phi0[k])) phi[k] = phi0[k];
    else phi[k] = 0.99 * minFix;
  }
  const m = free.length;
  const Qp = new Float64Array(pipes.length);
  for (let e = 0; e < pipes.length; e++) Qp[e] = pipes[e].Q || 0;
  let sumQ = 0;
  for (let k = 0; k < n; k++) sumQ += (qr[k] || 0) + Math.abs(extra[k] || 0);
  for (const [, fn] of comp.xfn || []) sumQ += Math.abs(fn(Infinity)[0]);
  const tol = Math.max(1e-6, 1e-7 * sumQ);
  const F = new Float64Array(m), dq = new Float64Array(m), g = new Float64Array(pipes.length);
  const Ftry = new Float64Array(m), Qtry = new Float64Array(pipes.length);
  const trial = new Float64Array(n);
  if (m === 0 || !Number.isFinite(minFix)) {
    evaluate(phi, true);
    return { phi, Q: Qp, conv: true, iters: 0, maxF: 0 };
  }

  // Невязка F_i = Σ оқим кириши − q_i(φ_i) − extra_i (фақат эркин тугунлар учун)
  function evaluate(ph, store, Fout = F, Qout = Qp, withJac = true) {
    Fout.fill(0);
    for (let e = 0; e < pipes.length; e++) {
      const p = pipes[e];
      const [Q, dQ] = qOfDphi(p.h, ph[p.i] - ph[p.j], Qout[e]);
      Qout[e] = Q;
      if (withJac) g[e] = dQ;
      const a = loc[p.i], b = loc[p.j];
      if (a >= 0) Fout[a] -= Q;
      if (b >= 0) Fout[b] += Q;
    }
    for (let f = 0; f < m; f++) {
      const k = free[f];
      let [q, d] = demand(qr[k], Pt[k], stage, ph[k]);
      if (xf[k]) for (const fn of xf[k]) { const [q2, d2] = fn(ph[k]); q += q2; d += d2; }
      Fout[f] -= q + (extra[k] || 0);
      if (withJac) dq[f] = d;
    }
    let mx = 0;
    for (let f = 0; f < m; f++) mx = Math.max(mx, Math.abs(Fout[f]));
    return mx;
  }

  const diag = new Float64Array(m);
  function applyA(x, y) {
    for (let f = 0; f < m; f++) y[f] = dq[f] * x[f];
    for (let e = 0; e < pipes.length; e++) {
      const a = loc[pipes[e].i], b = loc[pipes[e].j], w = g[e];
      const xa = a >= 0 ? x[a] : 0, xb = b >= 0 ? x[b] : 0;
      if (a >= 0) y[a] += w * (xa - xb);
      if (b >= 0) y[b] += w * (xb - xa);
    }
  }
  const r = new Float64Array(m), z = new Float64Array(m), pv = new Float64Array(m), Ap = new Float64Array(m), dx = new Float64Array(m);
  function pcg(b) {
    diag.set(dq);
    for (let e = 0; e < pipes.length; e++) {
      const a = loc[pipes[e].i], c = loc[pipes[e].j];
      if (a >= 0) diag[a] += g[e];
      if (c >= 0) diag[c] += g[e];
    }
    for (let f = 0; f < m; f++) if (!(diag[f] > 0)) diag[f] = 1e-300;
    dx.fill(0); r.set(b);
    let bn = 0; for (let f = 0; f < m; f++) bn += b[f] * b[f];
    bn = Math.sqrt(bn);
    if (bn === 0) return;
    for (let f = 0; f < m; f++) z[f] = r[f] / diag[f];
    pv.set(z);
    let rz = 0; for (let f = 0; f < m; f++) rz += r[f] * z[f];
    const maxit = 2 * m + 50;
    for (let it = 0; it < maxit; it++) {
      applyA(pv, Ap);
      let pAp = 0; for (let f = 0; f < m; f++) pAp += pv[f] * Ap[f];
      if (!(pAp > 0)) break;
      const al = rz / pAp;
      let rn = 0;
      for (let f = 0; f < m; f++) { dx[f] += al * pv[f]; r[f] -= al * Ap[f]; rn += r[f] * r[f]; }
      if (Math.sqrt(rn) <= 1e-11 * bn) break;
      for (let f = 0; f < m; f++) z[f] = r[f] / diag[f];
      let rz2 = 0; for (let f = 0; f < m; f++) rz2 += r[f] * z[f];
      const be = rz2 / rz; rz = rz2;
      for (let f = 0; f < m; f++) pv[f] = z[f] + be * pv[f];
    }
  }

  // Йўналиш бўйича ҳосила: d(t) = −F(φ+tδ)·δ (қавариқ энергиянинг ҳосиласи, t бўйича монотон)
  function dirDeriv(t) {
    trial.set(phi);
    for (let f = 0; f < m; f++) trial[free[f]] += t * dx[f];
    Qtry.set(Qp);
    evaluate(trial, false, Ftry, Qtry, false);
    let d = 0; for (let f = 0; f < m; f++) d -= Ftry[f] * dx[f];
    return d;
  }

  let maxF = evaluate(phi, true), it = 0, conv = false, polish = 0;
  for (it = 0; it < 300; it++) {
    if (maxF < tol) { conv = true; if (++polish > 2) break; }
    pcg(F);
    let d0 = 0; for (let f = 0; f < m; f++) d0 -= F[f] * dx[f];
    if (!(d0 < 0)) {           // CG ишонсиз — предобуславливателли градиент қадами
      for (let f = 0; f < m; f++) dx[f] = F[f] / diag[f];
      d0 = 0; for (let f = 0; f < m; f++) d0 -= F[f] * dx[f];
      if (!(d0 < 0)) break;
    }
    let t = 1, d1 = dirDeriv(1);
    if (d1 > 0.5 * -d0) {       // тўлиқ қадам минимумдан ўтиб кетди — регула фальси (Иллинойс)
      let tl = 0, dl = d0, th = 1, dh = d1, side = 0;
      for (let k = 0; k < 40; k++) {
        t = tl - dl * (th - tl) / (dh - dl);
        if (!(t > tl && t < th)) t = 0.5 * (tl + th);
        const dt = dirDeriv(t);
        if (Math.abs(dt) <= 0.1 * -d0) break;
        if (dt < 0) { tl = t; dl = dt; if (side === -1) dh *= 0.5; side = -1; }
        else { th = t; dh = dt; if (side === 1) dl *= 0.5; side = 1; }
        if (th - tl < 1e-14) break;
      }
    }
    for (let f = 0; f < m; f++) phi[free[f]] += t * dx[f];
    const prev = maxF;
    maxF = evaluate(phi, true);
    if (conv && maxF >= prev) break;
  }
  if (maxF < tol) conv = true;
  return { phi, Q: Qp, conv, iters: it, maxF };
}

// ---------- 4.6 поғоналар, ГРП/ШРП, режим ----------

function scenLoadFactor(sc) {
  const dem = isNum(sc.dem) ? num(sc.dem) : 1;
  const gr = isNum(sc.growth) ? num(sc.growth) : 0;
  return dem * (1 + gr / 100);
}

/** Топология: фаол қувурлар, компоненталар, поғоналар, регуляторлар тартиби. */
export function buildTopology(M, sc = {}) {
  const P = M.params || defaultParams();
  const closed = new Set(splitIds(sc.closed));
  const idx = new Map();
  M.nodes.forEach((n, k) => { const id = String(n.id ?? '').trim(); if (id && !idx.has(id)) idx.set(id, k); });
  const N = M.nodes.length;
  const topo = [];                               // топология хатолари (crit)
  const pipes = M.pipes.map((p, e) => {
    const st = normStatus(p.status);
    const i = idx.get(String(p.from ?? '').trim()), j = idx.get(String(p.to ?? '').trim());
    const useProp = sc.variant && isNum(p.dProp) && num(p.dProp) > 0;
    const d = useProp ? num(p.dProp) : num(p.d);
    const L = num(p.L);
    const valid = i !== undefined && j !== undefined && i !== j && L > 0 && d > 0;
    let active = valid && st !== 'ёпиқ' && !closed.has(String(p.id ?? '').trim());
    if (st === 'таклиф' && !sc.variant) active = false;
    return { e, i, j, d, L, valid, active, cat: normStage(p.cat), mat: p.mat };
  });
  // union-find
  const par = Array.from({ length: N }, (_, k) => k);
  const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (const p of pipes) if (p.active) { const a = find(p.i), b = find(p.j); if (a !== b) par[a] = b; }
  const compOf = new Int32Array(N);
  const roots = new Map(), comps = [];
  for (let k = 0; k < N; k++) {
    const r = find(k);
    if (!roots.has(r)) { roots.set(r, comps.length); comps.push({ id: comps.length, nodes: [], pipes: [], len: {}, stage: 'low' }); }
    compOf[k] = roots.get(r);
    comps[compOf[k]].nodes.push(k);
  }
  for (const p of pipes) if (p.active) {
    const c = comps[compOf[p.i]];
    c.pipes.push(p.e);
    const cat = p.cat || '?';
    c.len[cat] = (c.len[cat] || 0) + p.L;
  }
  for (const c of comps) {
    let best = '', bl = -1;
    for (const s of STAGES) if ((c.len[s] || 0) > bl && (c.len[s] || 0) > 0) { bl = c.len[s]; best = s; }
    if (!best) {                                  // қувур поғонаси йўқ — тугунлар поғонаси бўйича
      const cnt = {};
      for (const k of c.nodes) { const s = normStage(M.nodes[k].cat); if (s) cnt[s] = (cnt[s] || 0) + 1; }
      for (const s of STAGES) if ((cnt[s] || 0) > bl && cnt[s] > 0) { bl = cnt[s]; best = s; }
    }
    c.stage = best || 'low';
  }
  // регуляторлар
  const regs = (M.regs || []).map((g, r) => {
    const i = idx.get(String(g.in ?? '').trim()), o = idx.get(String(g.out ?? '').trim());
    const Pset = num(g.Pset);
    let active = i !== undefined && o !== undefined && Pset > 0 && !closed.has(String(g.id ?? '').trim());
    if (active && compOf[i] === compOf[o]) {
      topo.push(`${g.id}: кириш (${g.in}) ва чиқиш (${g.out}) тугунлари бир тармоқ қисмида — ГРП айланиб ўтилган`);
      active = false;
    }
    const PinMin = isNum(g.PinMin) && num(g.PinMin) > 0 ? num(g.PinMin) : 0;
    return { r, i, o, Pset, PinMin, cap: num(g.cap), active, cin: i !== undefined ? compOf[i] : -1, cout: o !== undefined ? compOf[o] : -1 };
  });
  // компоненталар тартиби (Kahn)
  const C = comps.length, indeg = new Int32Array(C), adj = Array.from({ length: C }, () => []);
  for (const g of regs) if (g.active) { adj[g.cin].push(g.cout); indeg[g.cout]++; }
  const order = [], q = [];
  for (let c = 0; c < C; c++) if (!indeg[c]) q.push(c);
  while (q.length) { const c = q.shift(); order.push(c); for (const d of adj[c]) if (--indeg[d] === 0) q.push(d); }
  if (order.length < C) {
    const inCycle = new Set();
    for (let c = 0; c < C; c++) if (indeg[c] > 0) { inCycle.add(c); order.push(c); }
    const ids = regs.filter(g => g.active && inCycle.has(g.cin) && inCycle.has(g.cout)).map(g => M.regs[g.r].id);
    topo.push(`ГРП/ШРП лар ёпиқ айлана ҳосил қилган: ${ids.join(', ')}`);
    for (const g of regs) if (g.active && inCycle.has(g.cin) && inCycle.has(g.cout)) g.active = false;
  }
  // манба ва таъминланган қисмлар
  const srcP = new Float64Array(N).fill(NaN);
  for (let k = 0; k < N; k++) {
    const n = M.nodes[k];
    if (normType(n.type) !== 'ГТС') continue;
    const pn = num(n.Pnorm), pm = num(n.Pmin);
    const p = sc.src === 'min' ? (Number.isFinite(pm) ? pm : pn) : pn;
    if (Number.isFinite(p) && p > 0) srcP[k] = p;
  }
  const powered = new Uint8Array(C);
  for (let k = 0; k < N; k++) if (Number.isFinite(srcP[k])) powered[compOf[k]] = 1;
  for (const c of order) if (powered[c]) for (const g of regs) if (g.active && g.cin === c) powered[g.cout] = 1;
  return { P, idx, pipes, comps, compOf, regs, order, topo, srcP, powered };
}

/** Кичик зич система: Гаусс усули (танлаш билан). */
function gauss(A, b) {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (!(Math.abs(M[p][c]) > 0)) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const k = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let j = r + 1; j < n; j++) s -= M[r][j] * x[j]; x[r] = s / M[r][r]; }
  return x.every(Number.isFinite) ? x : null;
}

/** Битта режим ҳисоби. */
export function solveScenario(M, sc = {}) {
  const T = buildTopology(M, sc);
  const { P, pipes, comps, compOf, regs, order, srcP, powered } = T;
  const N = M.nodes.length;
  const fac = scenLoadFactor(sc);
  const qr = new Float64Array(N), Pt = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    qr[k] = nodeLoad(M.nodes[k], P) * fac;
    const st = comps[compOf[k]].stage;
    Pt[k] = st === 'low' ? P.norms.low.sat : P.norms[st].min;
  }
  const hyd = pipes.map(p => p.active ? pipeHyd(p.L, p.d, p.mat, comps[compOf[p.i]].stage, P) : null);
  const phi = new Float64Array(N).fill(NaN), Qe = new Float64Array(pipes.length);
  const Pout = regs.map(g => g.active && powered[g.cin] ? g.Pset : 0);
  const Qreg = regs.map(() => 0);          // регулятор сарфи (чиқиш тугунига етказилган)
  let backClosed = regs.map(() => false);
  const errors = [...T.topo];
  let conv = true, outerIters = 0, outerConv = false;
  const compConv = new Uint8Array(comps.length).fill(1);
  const PinEff = g => g.PinMin > 0 ? g.PinMin : g.Pset;   // PinMin йўқ бўлса: Pout ≤ Pin
  const law = (g, Pin) => !(Pin > 0) ? 0 : Pin < PinEff(g) ? g.Pset * Pin / PinEff(g) : g.Pset;

  // Пастки тармоқ жавоби модели D_r(Pout): жорий нуқта ва кичик оғиш бўйича (уринма).
  // Юқори тармоқда ГРП кириши юки = D_r(law(Pin)) — Pin га монотон ва узлуксиз, масала қавариқ қолади.
  const samples = regs.map(() => []), Qup = regs.map(() => 0), Dcap = regs.map(() => Infinity);
  function model(r) {
    const S = [...samples[r]].sort((u, v) => u[0] - v[0]);
    if (!S.length) return () => [0, 0];
    const [pb, Db] = S[S.length - 1];
    if (!(pb > 0)) return () => [Db, 0];
    if (S.length === 1) return p => !(p > 0) ? [0, 0] : p >= pb ? [Db, 0] : [Db * p / pb, Db / pb];
    const [pa, Da] = S[0];
    const sl = Math.max(0, (Db - Da) / (pb - pa)), cap = Math.max(Db, Dcap[r]);
    const lin = p => Db + sl * (p - pb), p1 = pb / 2, l1 = lin(p1);
    // юқорига экстраполяция ишонч оралиғи билан чекланган (D(p) тўйинади — уринма ортиқча баҳолайди)
    const pTop = pb + Math.max(pb, 0.05 * regs[r].Pset), top = Math.min(cap, lin(pTop));
    return p => {
      if (!(p > 0)) return [0, 0];
      if (p < p1 && l1 > 0) return [l1 * p / p1, l1 / p1];
      const v = lin(p);
      if (p > pb && v >= top) return [top, 0];
      return v <= 0 ? [0, 0] : v >= cap ? [cap, 0] : [v, sl];
    };
  }
  function regLoadFn(r, stage) {
    const g = regs[r], D = model(r), pe = PinEff(g);
    return ph => {
      if (ph === Infinity) return [D(g.Pset)[0], 0];
      let Pin, dPin;
      if (stage === 'low') { Pin = ph / 1000; dPin = 1 / 1000; } else {
        if (!(ph > 0)) return [0, 0];
        const sp = Math.sqrt(ph); Pin = (sp - P0) * 1000; dPin = 1000 / (2 * sp);
      }
      if (!(Pin > 0)) return [0, 0];
      if (Pin >= pe) return [D(g.Pset)[0], 0];
      const [q, dq] = D(g.Pset * Pin / pe);
      return [q, dq * g.Pset / pe * dPin];
    };
  }

  function solveComp(c, useModel = false) {
    const cp = comps[c];
    const loc = new Map(cp.nodes.map((k, a) => [k, a]));
    const n = cp.nodes.length;
    if (!powered[c]) { for (const k of cp.nodes) phi[k] = NaN; for (const e of cp.pipes) Qe[e] = 0; return; }
    // ГРП кириш тугунига унинг сарфи қўшилади (пастки поғона аввал ҳисобланган)
    const extra = new Float64Array(n), xfn = [];
    for (let r = 0; r < regs.length; r++) {
      const g = regs[r];
      if (!g.active || g.cin !== c) continue;
      if (useModel) xfn.push([loc.get(g.i), regLoadFn(r, cp.stage), r]);
      else extra[loc.get(g.i)] += Qreg[r];
    }
    const loadAt = (a, ph) => { let t = extra[a]; for (const [b, fn] of xfn) if (b === a) t += fn(ph)[0]; return t; };
    const cPipes = cp.pipes.map(e => ({ i: loc.get(pipes[e].i), j: loc.get(pipes[e].j), h: hyd[e], Q: Qe[e] }));
    const qrc = cp.nodes.map(k => qr[k]), Ptc = cp.nodes.map(k => Pt[k]);
    for (let round = 0; round <= regs.length; round++) {
      const fixed = new Float64Array(n).fill(NaN);
      for (const k of cp.nodes) if (Number.isFinite(srcP[k])) fixed[loc.get(k)] = phiOfP(srcP[k], cp.stage);
      const feeders = [];
      for (let r = 0; r < regs.length; r++) {
        const g = regs[r];
        if (!g.active || g.cout !== c || !powered[g.cin] || backClosed[r]) continue;
        if (!Number.isFinite(srcP[g.o])) fixed[loc.get(g.o)] = phiOfP(Math.max(0, Pout[r]), cp.stage);
        feeders.push(r);
      }
      const phi0 = new Float64Array(n);
      cp.nodes.forEach((k, a) => { phi0[a] = phi[k]; });
      const res = solveComponent({ n, pipes: cPipes, fixed, qr: qrc, Pt: Ptc, extra, stage: cp.stage, xfn }, phi0);
      compConv[c] = res.conv ? 1 : 0;
      cp.nodes.forEach((k, a) => { phi[k] = res.phi[a]; });
      cp.pipes.forEach((e, t) => { Qe[e] = res.Q[t]; cPipes[t].Q = res.Q[t]; });
      // регулятор сарфи = чиқиш тугунига етказилган газ (қувурлар оқими + тугуннинг ўз юки).
      // Иккита ГРП бир тармоқни таъминласа, сарф ечим бўйича бўлинади — икки марта ҳисобланмайди.
      const supply = new Map();
      for (const r of feeders) supply.set(regs[r].o, 0);
      for (const o of supply.keys()) {
        let s = 0;
        cp.pipes.forEach((e, t) => { if (pipes[e].i === o) s += res.Q[t]; else if (pipes[e].j === o) s -= res.Q[t]; });
        s += demand(qr[o], Pt[o], cp.stage, phi[o])[0] + loadAt(loc.get(o), phi[o]);
        supply.set(o, s);
      }
      const byOut = new Map();
      for (const r of feeders) { const o = regs[r].o; byOut.set(o, (byOut.get(o) || 0) + 1); }
      for (const r of feeders) {
        const o = regs[r].o;
        Qreg[r] = Number.isFinite(srcP[o]) ? 0 : supply.get(o) / byOut.get(o);
      }
      // тескари оқим: регулятор ёпилади (фақат бошқа манба қолса)
      const fixedCount = feeders.filter(r => !Number.isFinite(srcP[regs[r].o])).length + cp.nodes.filter(k => Number.isFinite(srcP[k])).length;
      let worst = -1, wq = -1e-6 * (1 + Math.abs(res.maxF));
      for (const r of feeders) if (Qreg[r] < wq) { wq = Qreg[r]; worst = r; }
      if (worst >= 0 && fixedCount > 1) { backClosed[worst] = true; Qreg[worst] = 0; continue; }
      break;
    }
    for (let r = 0; r < regs.length; r++) if (regs[r].cout === c && backClosed[r]) Qreg[r] = 0;
    for (const [a, fn, r] of xfn) Qup[r] = fn(phi[cp.nodes[a]])[0];
  }

  // Бир ўтиш: берилган Pout да пастдан юқорига ҳисоб; натижа G_r = law(Pin_r) − Pout_r.
  // Ҳар бир ўтиш масса баланси бўйича мос: юқори поғона юки = пастки поғона олган газ.
  const bottomUp = [...order].reverse();
  const act = regs.map((g, r) => r).filter(r => regs[r].active && powered[regs[r].cin]);
  function pass(p) {
    outerIters++;
    for (const r of act) Pout[r] = p[r];
    backClosed = regs.map(() => false);
    for (const c of bottomUp) solveComp(c);
    const G = regs.map(() => 0);
    for (const r of act) G[r] = law(regs[r], pOfPhi(phi[regs[r].i], comps[regs[r].cin].stage)) - p[r];
    return G;
  }
  const gnorm = G => act.reduce((m, r) => Math.max(m, Math.abs(G[r]) / regs[r].Pset), 0);

  // Ташқи Ньютон: номаълумлар — фақат «очлик»даги регуляторлар (Pout < Pset ёки Pin < PinMin).
  // Якобиан чекли айирмалар билан, қадам ярмига бўлиш билан (line search).
  {
    const need = comps.map(c => c.nodes.reduce((t, k) => t + qr[k], 0));
    for (const c of bottomUp) for (const g of regs) if (g.active && g.cin === c) need[c] += need[g.cout];
    regs.forEach((g, r) => { if (g.active) Dcap[r] = need[g.cout] * 1.0001 + 1e-9; });
  }
  // Моделли ўтиш: пастдан юқорига, ҳар бир таъминланувчи қисм учун D(Pout) уринмаси ўлчанади,
  // юқори қисмда ГРП юки шу модель билан; сўнг юқоридан пастга Pout = law(Pin).
  function modelPass(p) {
    outerIters++;
    for (const r of act) Pout[r] = p[r];
    backClosed = regs.map(() => false);
    for (const c of bottomUp) {
      const feed = act.filter(r => regs[r].cout === c);
      const pert = [];
      for (const r of feed) {
        const p0 = Pout[r], Ps = regs[r].Pset;
        if (!(p0 < Ps * (1 - 1e-9)) || !(p0 > 0)) continue;
        const dp = Math.min(p0 * 0.5, Math.max(1e-4 * Ps, 2e-3 * p0));
        Pout[r] = p0 - dp; solveComp(c, true); pert.push([r, Pout[r], Qreg[r]]); Pout[r] = p0;
      }
      solveComp(c, true);
      for (const r of feed) samples[r] = [[Pout[r], Math.max(0, Qreg[r])]];
      for (const [r, pp, D] of pert) samples[r].push([pp, Math.max(0, D)]);
      // тескари оқим билан ёпилган регулятор: чиқиш тугунидаги босимгача 0, ундан юқорида —
      // очиқ қўшнисининг қиялиги билан (акс ҳолда қўшнилар навбатма-навбат ёпилиб тебранади)
      let sref = 0;
      for (const r of feed) {
        if (backClosed[r] || samples[r].length < 2) continue;
        const [[p1, d1], [p2, d2]] = samples[r];
        sref = Math.max(sref, Math.abs((d1 - d2) / (p1 - p2)) || 0);
      }
      for (const r of feed) {
        if (!backClosed[r]) continue;
        const Pf = pOfPhi(phi[regs[r].o], comps[c].stage), Ps = regs[r].Pset;
        const s0 = sref > 0 ? sref : Dcap[r] / (0.05 * Ps);
        const dpp = Math.max(1e-4 * Ps, 1e-3 * Math.max(Pf, 0));
        samples[r] = [[Math.max(Pf, 1e-9), 0], [Math.max(Pf, 1e-9) + dpp, s0 * dpp]];
      }
    }
    const pn = p.slice();
    let dmax = 0, qerr = 0;
    for (const r of act) {
      pn[r] = law(regs[r], pOfPhi(phi[regs[r].i], comps[regs[r].cin].stage));
      dmax = Math.max(dmax, Math.abs(pn[r] - p[r]) / regs[r].Pset);
      qerr = Math.max(qerr, Math.abs(Qup[r] - Qreg[r]) / Math.max(1, Dcap[r]));
    }
    return [pn, Math.max(dmax, qerr)];
  }
  const g2 = G => act.reduce((m, r) => m + (G[r] / regs[r].Pset) ** 2, 0);
  // Левенберг–Марквардт аниқ акслантиришда (чекли айирмали Якобиан)
  function lm(p, G, maxIt) {
    let gn = gnorm(G), mu = 1e-4;
    for (let it = 0; it < maxIt; it++) {
      if (gn <= 1e-8) break;
      const S = act.filter(r => p[r] < regs[r].Pset * (1 - 1e-12) || G[r] < 0);
      // Базис: битта қисмни таъминловчи «қўшни» регуляторлар учун умумий (1,1,…) ва фарқ (e1−ek) йўналишлари —
      // қаттиқ боғланган тармоқда Якобианнинг умумий модаси аниқ ҳисобланади.
      const n = S.length, idxOf = new Map(S.map((r, t) => [r, t])), V = [];
      const groups = new Map();
      for (const r of S) { const k = regs[r].cout; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
      for (const grp of groups.values()) {
        const one = new Float64Array(n); for (const r of grp) one[idxOf.get(r)] = 1; V.push(one);
        for (let k = 1; k < grp.length; k++) { const v = new Float64Array(n); v[idxOf.get(grp[0])] = 1; v[idxOf.get(grp[k])] = -1; V.push(v); }
      }
      const closedNow = backClosed.slice();
      const J = S.map(() => new Float64Array(n));          // J[row][col] — V базисида
      V.forEach((v, col) => {
        let h = 1e-5 * Math.max(1e-2, ...S.map((r, t) => v[t] ? p[r] / regs[r].Pset : 0));
        const up = S.some((r, t) => v[t] > 0 && closedNow[r]);
        if (!up) h = -h;
        let ps = p.slice();
        S.forEach((r, t) => { if (v[t]) ps[r] = p[r] + h * v[t] * regs[r].Pset; });
        if (S.some((r, t) => v[t] && (ps[r] < 0 || ps[r] > regs[r].Pset))) {
          h = -h; ps = p.slice();
          S.forEach((r, t) => { if (v[t]) ps[r] = Math.min(regs[r].Pset, Math.max(0, p[r] + h * v[t] * regs[r].Pset)); });
        }
        const Gs = pass(ps);
        S.forEach((r, row) => { J[row][col] = (Gs[r] - G[r]) / regs[r].Pset / h; });
      });
      const f = S.map(r => G[r] / regs[r].Pset), m0 = g2(G);
      const JtJ = S.map((_, a) => Float64Array.from(S.map((__, b) => { let t = 0; for (let k = 0; k < n; k++) t += J[k][a] * J[k][b]; return t; })));
      const Jtf = S.map((_, a) => { let t = 0; for (let k = 0; k < n; k++) t += J[k][a] * f[k]; return -t; });
      let ok = false;
      for (let k = 0; k < 10; k++) {
        const A = JtJ.map((row, a) => { const rr = Float64Array.from(row); rr[a] += mu * (1 + row[a]); return rr; });
        const d = gauss(A, Jtf);
        if (d) {
          const pn = p.slice();
          S.forEach((r, t) => { let y = 0; V.forEach((v, c) => { y += v[t] * d[c]; }); pn[r] = Math.min(regs[r].Pset, Math.max(0, p[r] + y * regs[r].Pset)); });
          const Gn = pass(pn);
          if (g2(Gn) < m0) { p = pn; G = Gn; gn = gnorm(G); mu = Math.max(1e-10, mu / 5); ok = true; break; }
        }
        mu *= 6;
      }
      if (!ok) break;
    }
    return [p, G, gn];
  }

  let p = Pout.slice();
  let G = pass(p), gn = gnorm(G);
  for (let round = 0; round < 3 && act.length && gn > 1e-8; round++) {
    // 1) моделли ўтишлар (глобал яқинлашиш), 2) LM (аниқ ечим)
    let prev = Infinity, slow = 0;
    const om = regs.map(() => 1), last = regs.map(() => 0);
    for (let k = 0; k < 30; k++) {
      const [pt, dd] = modelPass(p);
      // тебраниш (ишора алмашиши) — сўндириш; бир томонга ҳаракат — тезлаштириш
      const pn = p.slice();
      for (const r of act) {
        const st = pt[r] - p[r];
        if (st * last[r] < 0) om[r] = Math.max(0.1, om[r] * 0.5); else om[r] = Math.min(1, om[r] * 1.5);
        pn[r] = p[r] + om[r] * st; last[r] = st;
      }
      p = pn;
      if (dd < 1e-6) break;
      slow = dd > 0.6 * prev ? slow + 1 : 0;
      prev = dd;
      if (slow >= 3 && k >= 5) break;
    }
    G = pass(p); gn = gnorm(G);
    [p, G, gn] = lm(p, G, 30);
  }
  if (outerIters > 1) { G = pass(p); gn = gnorm(G); }   // якуний ҳолат p га мос бўлсин
  outerConv = !act.length || gn <= 1e-5;   // |Pout − law(Pin)| ≤ 10⁻⁵·Pset
  for (let c = 0; c < comps.length; c++) if (powered[c] && !compConv[c]) conv = false;
  if (!outerConv) conv = false;

  // ---- натижалар ----
  const nodesR = M.nodes.map((n, k) => {
    const c = comps[compOf[k]], stage = c.stage;
    const isFixed = Number.isFinite(srcP[k]) || regs.some((g, r) => g.active && g.o === k && powered[g.cin] && !backClosed[r]);
    if (!powered[compOf[k]]) return { P: 0, Praw: NaN, qReq: qr[k], qGot: 0, st: 'nosrc', stage, comp: c.id, fixed: false };
    const Praw = pOfPhi(phi[k], stage);
    const Pk = Math.max(0, Praw);
    const qGot = demand(qr[k], Pt[k], stage, phi[k])[0];
    let st;
    if (stage === 'low') st = Pk >= P.norms.low.exc ? 'ok' : Pk >= P.norms.low.sat ? 'warn' : 'bad';
    else st = Pk >= P.norms[stage].min ? 'ok' : 'bad';
    if (Pk < 1e-3 || (qr[k] > 0 && qGot < 0.05 * qr[k])) st = 'dead';
    return { P: Pk, Praw, qReq: qr[k], qGot, st, stage, comp: c.id, fixed: isFixed };
  });
  const pipesR = pipes.map((p, e) => {
    if (!p.active) return { active: false, Q: 0, v: 0, dP: 0, st: p.valid ? 'off' : 'invalid', stage: p.i !== undefined ? comps[compOf[p.i]].stage : '', lam: 0, Re: 0 };
    const c = comps[compOf[p.i]], stage = c.stage;
    if (!powered[c.id]) return { active: true, Q: 0, v: 0, dP: 0, st: 'nosrc', stage, lam: 0, Re: 0 };
    const Q = Qe[e], Pa = nodesR[p.i].P, Pb = nodesR[p.j].P;
    let v = Math.abs(Q) / 3600 / (Math.PI * Math.pow(p.d / 1000, 2) / 4);
    if (stage !== 'low') v *= P0 / ((Pa + Pb) / 2000 + P0);
    const Re = reynolds(Q, p.d, P.nu);
    let st = 'ok';
    if (v > (P.vmax[stage] ?? 99)) st = 'fast';
    if (Pa < 1e-3 && Pb < 1e-3) st = 'dead';
    return { active: true, Q, v, dP: Pa - Pb, st, stage, lam: lambdaRe(Re, hyd[e].nd), Re };
  });
  const regsR = regs.map((g, r) => {
    const base = { Pin: 0, Pout: 0, Q: 0, load: 0, st: 'off', lowin: false, over: false, dead: false };
    if (!g.active) return base;
    if (!powered[g.cin]) return { ...base, st: 'nosrc' };
    const Pin = nodesR[g.i].P;
    const Po = backClosed[r] ? nodesR[g.o].P : Math.max(0, Pout[r]);
    const Q = Math.max(0, Qreg[r]);
    const cap = g.cap;
    const load = cap > 0 ? Q / cap * 100 : 0;
    const dead = !(Pin > 1e-3), lowin = !dead && g.PinMin > 0 && Pin < g.PinMin, over = cap > 0 && Q > cap;
    const st = dead ? 'dead' : lowin ? 'lowin' : over ? 'over' : 'ok';
    return { Pin, Pout: Po, Q, load, st, lowin, over, dead, closedBack: backClosed[r] };
  });
  let tot = 0, deliv = 0, risk = 0, riskN = 0, minLow = Infinity, supply = 0;
  M.nodes.forEach((n, k) => {
    const r = nodesR[k];
    tot += r.qReq; deliv += r.qGot;
    if (r.qReq > 0 && ['bad', 'dead', 'nosrc'].includes(r.st)) { risk += r.qReq; riskN++; }
    if (r.stage === 'low' && !r.fixed && r.st !== 'nosrc') minLow = Math.min(minLow, r.P);
    if (Number.isFinite(srcP[k]) && powered[compOf[k]]) {
      pipes.forEach((p, e) => { if (!p.active) return; if (p.i === k) supply += Qe[e]; else if (p.j === k) supply -= Qe[e]; });
      supply += r.qGot;
      regs.forEach((g, t) => { if (g.active && g.i === k) supply += Qreg[t]; });
    }
  });
  const unpowered = comps.filter(c => !powered[c.id]);
  const unpNodes = unpowered.reduce((s, c) => s + c.nodes.length, 0);
  if (unpNodes && M.nodes.length) {
    const ids = unpowered.flatMap(c => c.nodes.map(k => M.nodes[k].id)).slice(0, 12);
    errors.push(`Манбага уланмаган қисм: ${unpNodes} та тугун (${ids.join(', ')}${unpNodes > 12 ? ', …' : ''})`);
  }
  if (!conv) errors.push('ҳисоб яқинлашмади — натижа ишончсиз');
  return {
    scen: sc, conv, outerIters, errors, topo: T.topo,
    nodes: nodesR, pipes: pipesR, regs: regsR, comps: comps.map(c => ({ id: c.id, stage: c.stage, powered: !!powered[c.id], nodes: c.nodes, len: c.len })),
    tot, deliv, short: Math.max(0, tot - deliv), risk, riskN, minLow: Number.isFinite(minLow) ? minLow : null, supply,
  };
}

export function solveAll(M) {
  return (M.scen || []).map(sc => solveScenario(M, sc));
}

// ---------- 5. маълумотлар текшируви («Ёрдамчи») ----------

function card(lvl, title, o) {
  return { lvl, title, what: o.what || '', why: o.why || '', where: o.where || '', excel: o.excel || '', todo: o.todo || '', ids: o.ids || [] };
}

function dupIds(arr) {
  const seen = new Set(), d = new Set();
  for (const x of arr) { const id = String(x.id ?? '').trim(); if (!id) continue; if (seen.has(id)) d.add(id); seen.add(id); }
  return [...d];
}

/** BFS чуқурлиги ГТС дан (қувурлар + регуляторлар). */
export function chainDepth(M) {
  const idx = new Map(M.nodes.map((n, k) => [String(n.id ?? '').trim(), k]));
  const adj = M.nodes.map(() => []);
  const link = (a, b) => { const i = idx.get(String(a ?? '').trim()), j = idx.get(String(b ?? '').trim()); if (i !== undefined && j !== undefined && i !== j) { adj[i].push(j); adj[j].push(i); } };
  for (const p of M.pipes) if (normStatus(p.status) !== 'таклиф') link(p.from, p.to);
  for (const g of M.regs || []) link(g.in, g.out);
  const depth = new Int32Array(M.nodes.length).fill(-1), q = [];
  M.nodes.forEach((n, k) => { if (normType(n.type) === 'ГТС') { depth[k] = 0; q.push(k); } });
  while (q.length) { const k = q.shift(); for (const j of adj[k]) if (depth[j] < 0) { depth[j] = depth[k] + 1; q.push(j); } }
  let max = 0;
  const consumers = M.nodes.filter(n => nodeLoad(n, M.params || defaultParams()) > 0 || normType(n.type) === 'истеъмолчи').length;
  M.nodes.forEach((n, k) => { if (depth[k] > max) max = depth[k]; });
  return { depth, max, consumers };
}

export function checkModel(M, results) {
  const out = [];
  const P = M.params || defaultParams();
  const nodeIds = new Set(M.nodes.map(n => String(n.id ?? '').trim()).filter(Boolean));
  const ex = { nodes: 'Excel: «Тугунлар» варағи', pipes: 'Excel: «Қувурлар» варағи', regs: 'Excel: «ГРП-ШРП» варағи', par: 'Excel: «Параметрлар» варағи' };

  if (!M.nodes.length || !M.pipes.length) out.push(card('crit', 'Тармоқ маълумотлари йўқ', {
    what: `Тугунлар: ${M.nodes.length}, қувурлар: ${M.pipes.length}.`,
    why: 'Моделсиз гидравлик ҳисоб бажарилмайди (ТТ §3.1, §8).',
    where: 'Тармоқ паспорти, ижро чизмалари, ГАТ/ГИС маълумотлари.',
    excel: `${ex.nodes} ва ${ex.pipes}`, todo: 'Excel андозасини юклаб, тугун ва қувурларни тўлдиринг.' }));
  const miss = [];
  if (blank(M.meta?.obj)) miss.push('Объект');
  if (blank(M.meta?.exec)) miss.push('Ҳисобни бажарди');
  if (miss.length) out.push(card('crit', 'Лойиҳа маълумотлари тўлиқ эмас', {
    what: `Тўлдирилмаган: ${miss.join(', ')}.`, why: 'Ҳисобот титул варағи ва имзолар учун шарт (ТТ §17).',
    where: 'Шартнома / буюртмачи хати.', excel: `${ex.par}: «Объект», «Ҳисобни бажарди»`, todo: 'Объект номи ва ижрочини киритинг.' }));
  const src = M.nodes.filter(n => normType(n.type) === 'ГТС');
  if (M.nodes.length && !src.length) out.push(card('crit', 'Манба (ГТС) йўқ', {
    what: 'Бирорта тугуннинг тури «ГТС» эмас.', why: 'Ҳисоб манбадан энг узоқ тугунгача бажарилади (ТТ §4.2).',
    where: 'ГТС чиқишидаги босим ва уланиш нуқтаси — «Ҳудудгазтаъминот» диспетчерлик хизмати.',
    excel: `${ex.nodes}: «Тури» = ГТС`, todo: 'Манба тугунини қўшинг ёки турини ГТС деб белгиланг.' }));
  const noPn = src.filter(n => !(num(n.Pnorm) > 0));
  if (noPn.length) out.push(card('crit', 'ГТС босими кўрсатилмаган', {
    what: 'ГТС нинг нормал чиқиш босими (P норм) йўқ.', why: 'Манба босимисиз ҳисоб бошланмайди.',
    where: 'ГТС режим картаси, диспетчерлик журнали.', excel: `${ex.nodes}: «P норм кПа»`, todo: 'Нормал босимни кПа да киритинг.', ids: noPn.map(n => n.id) }));
  const dn = dupIds(M.nodes), dp = dupIds(M.pipes);
  if (dn.length || dp.length) out.push(card('crit', 'Такрорланувчи ID', {
    what: `Тугунлар: ${dn.join(', ') || '—'}; қувурлар: ${dp.join(', ') || '—'}.`, why: 'ID барча файлларда ягона бўлиши шарт (ТТ §12).',
    where: 'Тармоқ схемаси.', excel: `${ex.nodes} / ${ex.pipes}: «ID»`, todo: 'Ҳар бир элементга ягона ID беринг.', ids: [...dn, ...dp] }));
  const badRef = M.pipes.filter(p => !nodeIds.has(String(p.from ?? '').trim()) || !nodeIds.has(String(p.to ?? '').trim()));
  if (badRef.length) out.push(card('crit', 'Қувур мавжуд бўлмаган тугунга уланган', {
    what: 'Бошланғич ёки охирги тугун «Тугунлар» рўйхатида йўқ.', why: 'Топологик узилиш — ТТ §14 бўйича йўл қўйилмайди.',
    where: 'Тармоқ схемаси.', excel: `${ex.pipes}: «Бошланғич тугун», «Охирги тугун»`, todo: 'Тугун ID ларини текширинг ёки етишмаган тугунни қўшинг.', ids: badRef.map(p => p.id) }));
  const self = M.pipes.filter(p => String(p.from ?? '').trim() && String(p.from).trim() === String(p.to ?? '').trim());
  if (self.length) out.push(card('crit', 'Қувур боши ва охири бир хил', {
    what: 'Бошланғич ва охирги тугун бир хил.', why: 'Бундай қувур ҳисобда маънога эга эмас.', where: 'Тармоқ схемаси.',
    excel: `${ex.pipes}`, todo: 'Тугунларни тузатинг.', ids: self.map(p => p.id) }));
  const badLd = M.pipes.filter(p => !(num(p.L) > 0) || !(num(p.d) > 0));
  if (badLd.length) out.push(card('crit', 'Қувур узунлиги ёки диаметри йўқ', {
    what: 'L ёки ички d кўрсатилмаган ёки 0 дан катта эмас.', why: 'Босим йўқотиши L ва d⁵ га боғлиқ (СП 42-101).',
    where: 'Ижро чизмалари, тармоқ паспорти.', excel: `${ex.pipes}: «L м», «d ички мм»`, todo: 'Узунлик (м) ва ички диаметрни (мм) киритинг.', ids: badLd.map(p => p.id) }));
  const regs = M.regs || [];
  const badReg = regs.filter(g => !nodeIds.has(String(g.in ?? '').trim()) || !nodeIds.has(String(g.out ?? '').trim()));
  if (badReg.length) out.push(card('crit', 'ГРП/ШРП мавжуд бўлмаган тугунга уланган', {
    what: 'Кириш ёки чиқиш тугуни рўйхатда йўқ.', why: 'Поғоналар ўртасида узилиш ҳосил бўлади.', where: 'ГРП/ШРП паспорти.',
    excel: `${ex.regs}: «Кириш тугуни», «Чиқиш тугуни»`, todo: 'Тугун ID ларини тузатинг.', ids: badReg.map(g => g.id) }));
  const noSet = regs.filter(g => !(num(g.Pset) > 0));
  if (noSet.length) out.push(card('crit', 'ГРП/ШРП чиқиш босими йўқ', {
    what: 'Созланган чиқиш босими (уставка) кўрсатилмаган.', why: 'Паст поғонанинг манба босими — регулятор уставкаси (ТТ §8).',
    where: 'ГРП/ШРП паспорти, созлаш далолатномаси.', excel: `${ex.regs}: «Чиқиш босими кПа»`, todo: 'Уставкани кПа да киритинг.', ids: noSet.map(g => g.id) }));
  const noStove = M.nodes.filter(n => num(n.N) > 0 && !(num(n.p4) > 0) && !(num(n.p2) > 0));
  if (noStove.length) out.push(card('crit', 'Хонадонлар бор, плиталар йўқ', {
    what: 'N > 0, лекин плита сони кўрсатилмаган.', why: 'Ҳисобий сарф асбоблар сони ва бир вақтлилик коэффициенти орқали топилади (§4.1).',
    where: 'Абонентлар базаси (биллинг), МФЙ маълумотлари.', excel: `${ex.nodes}: «Плита 4к», «Плита 2к»`, todo: 'Плиталар сонини киритинг.', ids: noStove.map(n => n.id) }));
  const topo = new Set();
  for (const r of results || []) for (const t of r.topo || []) topo.add(t);
  if (topo.size) out.push(card('crit', 'Топология хатоси', {
    what: [...topo].join('; '), why: 'Модель узилишсиз ва тўғри поғоналанган бўлиши шарт (ТТ §14).', where: 'Тармоқ схемаси, ГРП/ШРП уланиш чизмаси.',
    excel: `${ex.regs} / ${ex.pipes}`, todo: 'ГРП кириш/чиқиш тугунларини ва қувурлар уланишини текширинг.' }));
  const ch = chainDepth(M);
  if (ch.consumers >= 10 && ch.max >= Math.max(10, 0.7 * ch.consumers) && !M.meta?.chainOk) out.push(card('crit', 'Схема шубҳали', {
    what: `Манбадан энг узоқ тугунгача ${ch.max} та қувур кетма-кет уланган (${ch.consumers} истеъмолчи). Барча кўчалар бир занжирда бўлса, бутун маҳалла гази биринчи кичик қувур орқали ўтади.`,
    why: 'Олдинги ҳисобда айнан шу сабабли босим −18 644 кПа чиққан. Нотўғри схема нотўғри хулосага олиб келади.',
    where: 'Ижро чизмаси: ҳар бир кўча қайси қувурдан (тармоқланишдан) олинишини аниқланг.',
    excel: `${ex.pipes}: «Бошланғич тугун»; схема тўғри бўлса — ${ex.par}: «Кетма-кет схема тўғри» = ҳа`,
    todo: 'Ҳар бир кўча қайси магистралдан олинишини кўрсатинг ёки занжир ҳақиқатан тўғрилигини тасдиқланг.' }));

  // --- warn ---
  const noPm = src.filter(n => num(n.Pnorm) > 0 && !(num(n.Pmin) > 0));
  if (noPm.length) out.push(card('warn', 'ГТС минимал босими йўқ', {
    what: 'P мин кўрсатилмаган — 2-режимда нормал босим ишлатилади.', why: 'ТТ §3.2: минимал босимда меъёрий босим сақланадиган ҳудудлар.',
    where: 'Қишки пик кунлари диспетчерлик журнали.', excel: `${ex.nodes}: «P мин кПа»`, todo: 'Минимал кузатилган босимни киритинг.', ids: noPm.map(n => n.id) }));
  const noCat = M.pipes.filter(p => !normStage(p.cat));
  if (noCat.length) out.push(card('warn', 'Қувур поғонаси кўрсатилмаган', {
    what: `${noCat.length} та қувурда босим поғонаси йўқ.`, why: 'Поғона формула ва меъёрни белгилайди; ҳозир қўшни қувурлардан олинди.',
    where: 'Тармоқ паспорти.', excel: `${ex.pipes}: «Поғона» (паст / ўрта / юқори II / юқори I)`, todo: 'Поғонани киритинг.', ids: noCat.map(p => p.id) }));
  const regWarn = regs.filter(g => !(num(g.PinMin) > 0) || !(num(g.cap) > 0));
  if (regWarn.length) out.push(card('warn', 'ГРП/ШРП паспорт маълумотлари тўлиқ эмас', {
    what: 'Минимал кириш босими ёки ўтказиш қобилияти йўқ.', why: 'Регулятор кириш босими етарлилиги ва юкланиши текширилмайди (ТТ §8).',
    where: 'Регулятор паспорти (РДГ, РДНК ва б.).', excel: `${ex.regs}: «Мин. кириш босими кПа», «Ўтказиш қобилияти м³/соат»`, todo: 'Паспорт қийматларини киритинг.', ids: regWarn.map(g => g.id) }));
  const linked = new Set();
  for (const p of M.pipes) { linked.add(String(p.from ?? '').trim()); linked.add(String(p.to ?? '').trim()); }
  for (const g of regs) { linked.add(String(g.in ?? '').trim()); linked.add(String(g.out ?? '').trim()); }
  const lonely = M.nodes.filter(n => !linked.has(String(n.id ?? '').trim()));
  if (lonely.length) out.push(card('warn', 'Уланмаган тугунлар', {
    what: `${lonely.length} та тугунга бирорта қувур уланмаган.`, why: 'Бу тугунлар газсиз қолади.', where: 'Тармоқ схемаси.',
    excel: ex.pipes, todo: 'Уловчи қувурни қўшинг ёки ортиқча тугунни ўчиринг.', ids: lonely.map(n => n.id) }));
  const r0 = results && results[0];
  if (r0) {
    const mism = [];
    M.pipes.forEach((p, e) => { const c = normStage(p.cat), rp = r0.pipes[e]; if (c && rp && rp.active && rp.stage && c !== rp.stage) mism.push(p.id); });
    if (mism.length) out.push(card('warn', 'Поғоналар ГРП сиз уланган', {
      what: 'Қувур поғонаси у жойлашган тармоқ қисмининг поғонасига мос эмас.', why: 'Турли босимли тармоқлар фақат ГРП/ШРП орқали уланади.',
      where: 'Тармоқ схемаси.', excel: `${ex.pipes}: «Поғона» ёки ${ex.regs}`, todo: 'Поғонани тузатинг ёки орага ГРП/ШРП қўшинг.', ids: mism }));
  }
  const noAppl = M.nodes.filter(n => !(num(n.N) > 0) && Qnom(n) > 0);
  if (noAppl.length) out.push(card('warn', 'Асбоблар бор, хонадон сони йўқ', {
    what: 'N = 0 бўлгани учун бир вақтлилик коэффициенти 0 — асбоблар сарфи ҳисобга олинмади.', why: 'K_бир(N) хонадон сонига боғлиқ.',
    where: 'Абонентлар базаси.', excel: `${ex.nodes}: «N хонадон»`, todo: 'Хонадон сонини киритинг.', ids: noAppl.map(n => n.id) }));
  // --- tip ---
  if (M.nodes.length && !M.nodes.some(n => isNum(n.Pmeas))) out.push(card('tip', 'Ўлчанган босимлар йўқ', {
    what: 'Модель ўлчовлар билан солиштирилмаган (калибровка).', why: 'ТТ §9, §14: модель ҳақиқий ўлчовлар билан тасдиқланади.',
    where: 'Назорат нуқталарида манометр кўрсаткичлари (қишки пик).', excel: `${ex.nodes}: «P ўлчанган кПа»`, todo: 'Камида 3–5 нуқтада ўлчанган босимни киритинг.' }));
  const n1 = (M.scen || []).find(s => /N-1|авария/i.test(s.name || ''));
  if (n1 && !splitIds(n1.closed).length) out.push(card('tip', 'N-1 режими учун элемент танланмаган', {
    what: 'Авария режимида ҳеч қайси қувур ёки ГРП узилмаган.', why: 'ТТ §9: битта элемент ишдан чиққанда таъминот ишончлилиги.',
    where: 'Энг юкланган магистрал ёки ягона ГРП.', excel: 'Excel: «Режимлар» варағи — «Узилган элементлар»', todo: 'Узиладиган элемент ID сини киритинг.' }));
  if (M.nodes.length && !M.nodes.some(n => isNum(n.x) && isNum(n.y))) out.push(card('tip', 'Тугун координаталари йўқ', {
    what: 'Схема автоматик қатламлар бўйича чизилди.', why: 'Ҳақиқий жойлашув схемани ўқишни осонлаштиради (ТТ §11).',
    where: 'ГИС, топосъёмка.', excel: `${ex.nodes}: «X», «Y»`, todo: 'Координаталарни киритинг (ихтиёрий).' }));
  return out;
}

// ---------- 7. муаммолар реестри ----------

const TERM_ORDER = { 'тезкор': 0, 'ўрта': 1, 'узоқ': 2 };

export function collectProblems(M, results) {
  const map = new Map();
  const add = (key, o, ri, val, worse) => {
    let p = map.get(key);
    if (!p) { p = { ...o, scen: [], worst: val }; map.set(key, p); }
    if (!p.scen.includes(ri + 1)) p.scen.push(ri + 1);
    if (worse(val, p.worst)) p.worst = val;
  };
  const lower = (a, b) => a < b, higher = (a, b) => a > b;
  (results || []).forEach((R, ri) => {
    const closed = splitIds(R.scen?.closed);
    M.nodes.forEach((n, k) => {
      const r = R.nodes[k];
      if (!r || !(r.qReq > 0)) return;
      if (r.st === 'bad' || r.st === 'dead') add('P:' + n.id, { kind: 'Босим', type: 'node', id: n.id, name: n.name || '', unit: 'кПа',
        measure: 'Таъминловчи қувурлар диаметрини ошириш ёки ҳалқалаш; ШРП чиқиш босимини текшириш', term: 'ўрта' }, ri, r.P, lower);
      if (r.st === 'nosrc') add('S:' + n.id, { kind: 'Манбасиз', type: 'node', id: n.id, name: n.name || '', unit: 'м³/соат',
        measure: closed.length ? 'Захира таъминот: ҳалқаловчи боғловчи қувур' : 'Тармоқ уланишини текшириш', term: closed.length ? 'ўрта' : 'тезкор' }, ri, r.qReq, higher);
    });
    M.pipes.forEach((p, e) => {
      const r = R.pipes[e];
      if (r && r.st === 'fast') add('V:' + p.id, { kind: 'Газ тезлиги', type: 'pipe', id: p.id, name: `${p.from} → ${p.to}`, unit: 'м/с',
        measure: 'Диаметрни ошириш ёки параллел қувур', term: 'ўрта' }, ri, r.v, higher);
    });
    (M.regs || []).forEach((g, t) => {
      const r = R.regs[t];
      if (!r) return;
      if (r.lowin || r.dead) add('I:' + g.id, { kind: 'Кириш босими', type: 'reg', id: g.id, name: g.name || '', unit: 'кПа',
        measure: 'Юқори поғона тармоғини кучайтириш (диаметр, ҳалқалаш) ёки ГРП ни бошқа манбага кўчириш', term: 'узоқ' }, ri, r.Pin, lower);
      if (r.over) add('O:' + g.id, { kind: 'Юкланиш %', type: 'reg', id: g.id, name: g.name || '', unit: '%',
        measure: 'ГРП/ШРП ни модернизация қилиш ёки қўшимча ШРП', term: 'ўрта' }, ri, r.load, higher);
    });
  });
  return [...map.values()].sort((a, b) => b.scen.length - a.scen.length || TERM_ORDER[a.term] - TERM_ORDER[b.term]);
}

// ---------- форматлаш ----------

/** Босим матни: паст — кПа, ўрта/юқори — МПа (4 белги). Ҳеч қачон манфий эмас. */
export function fmtP(Pk, stage) {
  const p = Math.max(0, Number(Pk) || 0);
  return stage === 'low' || !stage ? p.toFixed(3) : (p / 1000).toFixed(4);
}
export function pUnit(stage) { return stage === 'low' || !stage ? 'кПа' : 'МПа'; }
