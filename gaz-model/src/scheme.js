// SVG схема: поғона бўйича рангли қувурлар, ҳолат бўйича тугунлар, масштаб ва суриш.
import { STAGE_COLOR, STAGE_NAME, normType, normStatus, num, isNum, fmtP, pUnit } from './engine.js';
import { statusName } from './io.js';

export const NODE_COLOR = { ok: '#2e9e5b', warn: '#e0a100', bad: '#d64541', dead: '#7b1f1f', nosrc: '#9a9a9a' };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Координаталар: ҳаммасида X,Y бўлса — улар; акс ҳолда ГТС дан BFS қатламлари. */
export function layoutNodes(M) {
  const n = M.nodes.length;
  const pos = new Array(n);
  if (n && M.nodes.every(t => isNum(t.x) && isNum(t.y))) {
    const xs = M.nodes.map(t => num(t.x)), ys = M.nodes.map(t => num(t.y));
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const span = Math.max(x1 - x0, y1 - y0) || 1, W = Math.max(600, 60 * Math.sqrt(n) * 3);
    for (let k = 0; k < n; k++) pos[k] = [40 + (xs[k] - x0) / span * W, 40 + (y1 - ys[k]) / span * W];
    return { pos, w: 80 + (x1 - x0) / span * W, h: 80 + (y1 - y0) / span * W };
  }
  const idx = new Map(M.nodes.map((t, k) => [String(t.id ?? '').trim(), k]));
  const adj = M.nodes.map(() => []);
  const link = (a, b) => { const i = idx.get(String(a ?? '').trim()), j = idx.get(String(b ?? '').trim()); if (i !== undefined && j !== undefined && i !== j) { adj[i].push(j); adj[j].push(i); } };
  for (const p of M.pipes) if (normStatus(p.status) !== 'таклиф') link(p.from, p.to);
  for (const g of M.regs || []) link(g.in, g.out);
  const depth = new Array(n).fill(-1), order = [], q = [];
  M.nodes.forEach((t, k) => { if (normType(t.type) === 'ГТС') { depth[k] = 0; q.push(k); } });
  if (!q.length && n) { depth[0] = 0; q.push(0); }
  for (let h = 0; h < q.length; h++) { const k = q[h]; order.push(k); for (const j of adj[k]) if (depth[j] < 0) { depth[j] = depth[k] + 1; q.push(j); } }
  let maxD = Math.max(0, ...depth);
  for (let k = 0; k < n; k++) if (depth[k] < 0) { depth[k] = maxD + 1; order.push(k); }
  maxD = Math.max(0, ...depth);
  const layers = Array.from({ length: maxD + 1 }, () => []);
  for (const k of order) layers[depth[k]].push(k);
  const rank = new Array(n).fill(0);
  layers.forEach((L, d) => {
    if (d > 0) {
      const bc = k => { const ps = adj[k].filter(j => depth[j] === d - 1); return ps.length ? ps.reduce((s, j) => s + rank[j], 0) / ps.length : 1e9; };
      const b = new Map(L.map(k => [k, bc(k)]));
      L.sort((a, c) => b.get(a) - b.get(c));
    }
    L.forEach((k, i) => { rank[k] = i; });
  });
  const DX = 150, DY = 46, maxLen = Math.max(1, ...layers.map(L => L.length));
  layers.forEach((L, d) => L.forEach((k, i) => { pos[k] = [50 + d * DX, 40 + (i + (maxLen - L.length) / 2) * DY]; }));
  return { pos, w: 100 + maxD * DX + 60, h: 60 + maxLen * DY };
}

/**
 * SVG матни. R — фаол режим натижаси (ихтиёрий). opts.print — оқ фон, литерал ранглар (PDF учун).
 */
export function schemeSVG(M, R, opts = {}) {
  const { pos, w, h } = layoutNodes(M);
  const idx = new Map(M.nodes.map((t, k) => [String(t.id ?? '').trim(), k]));
  const txt = opts.print ? '#222' : 'currentColor';
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" font-family="Arial, sans-serif">`);
  if (opts.print) parts.push(`<rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>`);
  parts.push('<g class="vp">');
  M.pipes.forEach((p, e) => {
    const i = idx.get(String(p.from ?? '').trim()), j = idx.get(String(p.to ?? '').trim());
    if (i === undefined || j === undefined || i === j) return;
    const r = R?.pipes?.[e];
    const st = normStatus(p.status);
    const dash = st !== 'очиқ' || (r && !r.active) ? ' stroke-dasharray="7 5"' : '';
    let col = STAGE_COLOR[r?.stage || 'low'] || STAGE_COLOR.low;
    if (r && (r.st === 'nosrc' || r.st === 'dead' || !r.active)) col = STAGE_COLOR.none;
    const d = num(p.d) || 50, sw = Math.min(9, 1.2 + d / 45);
    const [x1, y1] = pos[i], [x2, y2] = pos[j];
    if (r?.st === 'fast') parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d64541" stroke-width="${sw + 5}" stroke-opacity="0.45"/>`);
    parts.push(`<line data-k="p" data-i="${e}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round"${dash}><title>${esc(p.id)}</title></line>`);
    if (opts.labels !== false) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 4;
      parts.push(`<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" font-size="8" fill="${txt}" fill-opacity="0.65" text-anchor="middle">${esc(p.id)}</text>`);
    }
  });
  (M.regs || []).forEach((g, t) => {
    const i = idx.get(String(g.in ?? '').trim()), j = idx.get(String(g.out ?? '').trim());
    if (i === undefined || j === undefined) return;
    const r = R?.regs?.[t];
    const bad = r && ['lowin', 'dead', 'over', 'nosrc'].includes(r.st) || r?.over;
    const [x1, y1] = pos[i], [x2, y2] = pos[j], mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const col = bad ? '#d64541' : (opts.print ? '#333' : 'currentColor');
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="1.6" stroke-dasharray="4 3"/>`);
    parts.push(`<rect data-k="r" data-i="${t}" x="${mx - 8}" y="${my - 8}" width="16" height="16" fill="${bad ? '#d64541' : '#ffffff'}" stroke="${col}" stroke-width="2"><title>${esc(g.id)}</title></rect>`);
    parts.push(`<text x="${mx}" y="${my - 12}" font-size="9" font-weight="bold" fill="${bad ? '#d64541' : txt}" text-anchor="middle">${esc(g.id)}</text>`);
  });
  M.nodes.forEach((t, k) => {
    const [x, y] = pos[k], r = R?.nodes?.[k];
    if (normType(t.type) === 'ГТС') {
      parts.push(`<rect data-k="n" data-i="${k}" x="${x - 9}" y="${y - 9}" width="18" height="18" fill="#111"><title>${esc(t.id)}</title></rect>`);
    } else {
      const col = r ? NODE_COLOR[r.st] || '#888' : '#888';
      const rad = r && r.qReq > 0 ? 6.5 : 4.5;
      parts.push(`<circle data-k="n" data-i="${k}" cx="${x}" cy="${y}" r="${rad}" fill="${col}" stroke="#ffffff" stroke-width="1.5"><title>${esc(t.id)}</title></circle>`);
    }
    if (opts.labels !== false) {
      const lbl = r ? `${t.id} · ${fmtP(r.P, r.stage)}` : t.id;
      parts.push(`<text x="${x + 9}" y="${y + 13}" font-size="9" fill="${txt}">${esc(lbl)}</text>`);
    }
  });
  parts.push('</g></svg>');
  return parts.join('');
}

export function legendHTML() {
  const st = [['high1', 'юқори I'], ['high2', 'юқори II'], ['mid', 'ўрта'], ['low', 'паст'], ['none', 'манбасиз']];
  const nd = [['ok', 'меъёрда'], ['warn', 'паст'], ['bad', 'меъёрдан паст'], ['dead', 'газсиз'], ['nosrc', 'манбасиз']];
  return `<div class="legend">${st.map(([k, t]) => `<span><i class="ln" style="background:${STAGE_COLOR[k]}"></i>${t}</span>`).join('')}
    ${nd.map(([k, t]) => `<span><i class="dot" style="background:${NODE_COLOR[k]}"></i>${t}</span>`).join('')}
    <span><i class="sq"></i>ГТС</span><span><i class="sq2"></i>ГРП/ШРП</span><span><i class="dash"></i>таклиф / ёпиқ</span></div>`;
}

/** Интерактив кўрсатгич: ғилдирак билан масштаб, суриш, маълумот ойнаси. */
export function mountScheme(host, M, R, describe) {
  host.innerHTML = `<div class="sch-tools"><button type="button" data-z="in" aria-label="Катталаштириш">＋</button><button type="button" data-z="out" aria-label="Кичрайтириш">－</button><button type="button" data-z="fit">Бутун схема</button></div>
    <div class="sch-view">${schemeSVG(M, R)}</div><div class="sch-tip" hidden></div>`;
  const view = host.querySelector('.sch-view'), svg = view.querySelector('svg'), tip = host.querySelector('.sch-tip');
  if (!svg) return;
  const vb0 = svg.viewBox.baseVal;
  const W = vb0.width, H = vb0.height;
  svg.removeAttribute('width'); svg.removeAttribute('height');
  let vb = { x: 0, y: 0, w: W, h: H };
  const apply = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const fit = () => { vb = { x: 0, y: 0, w: W, h: H }; apply(); };
  const zoom = (f, cx = 0.5, cy = 0.5) => {
    const nw = Math.min(W * 4, Math.max(40, vb.w * f)), nh = nw * vb.h / vb.w;
    vb.x += (vb.w - nw) * cx; vb.y += (vb.h - nh) * cy; vb.w = nw; vb.h = nh; apply();
  };
  fit();
  host.querySelector('.sch-tools').addEventListener('click', e => {
    const z = e.target.closest('button')?.dataset.z;
    if (z === 'in') zoom(0.75); else if (z === 'out') zoom(1 / 0.75); else if (z === 'fit') fit();
  });
  view.addEventListener('wheel', e => {
    e.preventDefault();
    const b = svg.getBoundingClientRect();
    zoom(e.deltaY < 0 ? 0.85 : 1 / 0.85, (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height);
  }, { passive: false });
  let drag = null;
  view.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, moved: false }; });
  view.addEventListener('pointermove', e => {
    if (drag && (e.buttons & 1 || e.pointerType === 'touch')) {
      const b = svg.getBoundingClientRect(), k = vb.w / b.width;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) { drag.moved = true; view.setPointerCapture?.(e.pointerId); }
      vb.x = drag.vx - dx * k; vb.y = drag.vy - dy * k; apply();
      return;
    }
    show(e);
  });
  view.addEventListener('pointerup', e => { const d = drag; drag = null; if (d && !d.moved) show(e, true); });
  view.addEventListener('pointerleave', () => { if (!drag) tip.hidden = true; });
  function show(e, sticky) {
    const el = e.target.closest?.('[data-k]');
    if (!el) { if (sticky) tip.hidden = true; if (!sticky && !tip.dataset.sticky) tip.hidden = true; return; }
    tip.innerHTML = describe(el.dataset.k, +el.dataset.i);
    const b = host.getBoundingClientRect();
    tip.style.left = Math.min(b.width - 230, Math.max(4, e.clientX - b.left + 12)) + 'px';
    tip.style.top = (e.clientY - b.top + 12) + 'px';
    tip.hidden = false;
  }
}

/** SVG → PNG dataURL (PDF учун; html2pdf SVG ни нотўғри чизади). */
export function svgToPng(svgText, maxW = 2200) {
  return new Promise((resolve, reject) => {
    const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svgText);
    const w0 = m ? +m[1] : 800, h0 = m ? +m[2] : 600;
    const k = Math.min(3, maxW / w0), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ data: c.toDataURL('image/png'), w, h });
    };
    img.onerror = err => { URL.revokeObjectURL(url); reject(err); };
    img.src = url;
  });
}

export function describeElement(M, R, kind, i) {
  const row = (a, b) => `<div><span>${a}</span><b>${b}</b></div>`;
  if (kind === 'n') {
    const t = M.nodes[i], r = R?.nodes?.[i];
    if (!t) return '';
    return `<h4>${esc(t.id)} ${esc(t.name || '')}</h4>` + (r ? row('Поғона', STAGE_NAME[r.stage]) + row('Босим', `${fmtP(r.P, r.stage)} ${pUnit(r.stage)}`) +
      row('Талаб / олинган', `${r.qReq.toFixed(1)} / ${r.qGot.toFixed(1)} м³/соат`) + row('Ҳолат', statusName(r.st)) : '');
  }
  if (kind === 'p') {
    const p = M.pipes[i], r = R?.pipes?.[i];
    if (!p) return '';
    return `<h4>${esc(p.id)}: ${esc(p.from)} → ${esc(p.to)}</h4>` + row('L × d', `${p.L} м × ${p.d} мм`) +
      (r ? row('Q', `${Math.abs(r.Q).toFixed(1)} м³/соат${r.Q < -1e-9 ? ' (тескари)' : ''}`) + row('v', `${r.v.toFixed(2)} м/с`) + row('ΔP', `${Math.abs(r.dP).toFixed(3)} кПа`) + row('Ҳолат', statusName(r.st)) : '');
  }
  const g = M.regs[i], r = R?.regs?.[i];
  if (!g) return '';
  return `<h4>${esc(g.id)} ${esc(g.name || '')}</h4>` + (r ? row('P кириш', `${r.Pin.toFixed(2)} кПа`) + row('P чиқиш', `${r.Pout.toFixed(2)} кПа`) +
    row('Сарф', `${r.Q.toFixed(1)} м³/соат (${r.load.toFixed(0)}%)`) + row('Ҳолат', statusName(r.st)) : '');
}

// ---------- §13.7 босим профили ----------

/** Йўл бўйлаб нуқталар: [{k, id, x (км), P, stage, st, via}] ва поғона бўлаклари. */
export function profileData(M, R, path) {
  const pts = path.map(s => {
    const r = R.nodes[s.k];
    const via = s.e !== null ? M.pipes[s.e].id : s.r !== null ? M.regs[s.r].id : '';
    return { k: s.k, id: M.nodes[s.k].id, name: M.nodes[s.k].name || '', x: s.x / 1000, P: r.P, stage: r.stage, st: r.st, via, viaReg: s.r !== null };
  });
  const segs = [];
  for (const p of pts) {
    const last = segs[segs.length - 1];
    if (!last || last.stage !== p.stage || p.viaReg) segs.push({ stage: p.stage, pts: [p] }); else last.pts.push(p);
  }
  return { pts, segs, L: pts.length ? pts[pts.length - 1].x : 0 };
}

function niceStep(span) {
  const raw = span / 4, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

/**
 * Кичик кўп графиклар: ҳар бир поғона — алоҳида график (ўз ўқи, ўз бирлиги), X ўқи — манбадан масофа, км.
 * opts.print — литерал ранглар (PDF).
 */
export function profileSVG(M, R, data, opts = {}) {
  const P = M.params, W = opts.width || 760, H = 150, padL = 58, padR = 16, padT = 26, padB = 26;
  const ink = opts.print ? '#222' : 'currentColor', grid = opts.print ? '#dde2e8' : 'var(--line)', muted = opts.print ? '#666' : 'var(--muted)';
  const ring = opts.print ? '#fff' : 'var(--panel)', crit = opts.print ? '#c0262d' : 'var(--bad)';
  const xMax = Math.max(0.001, data.L), X = x => padL + x / xMax * (W - padL - padR);
  const xs = niceStep(xMax);
  return data.segs.map(seg => {
    const low = seg.stage === 'low', k = low ? 1 : 1 / 1000, unit = low ? 'кПа' : 'МПа';
    const norm = low ? P.norms.low.sat : P.norms[seg.stage]?.min;
    const vals = seg.pts.map(p => p.P * k).concat(norm ? [norm * k] : []);
    const hi = Math.max(...vals) * 1.08, lo = 0, ys = niceStep(hi - lo);
    const Y = v => padT + (1 - (v - lo) / (hi - lo || 1)) * (H - padT - padB);
    const g = [];
    g.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial, sans-serif" font-size="11" role="img" aria-label="Босим профили: ${STAGE_NAME[seg.stage]}">`);
    if (opts.print) g.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);
    g.push(`<text x="${padL}" y="15" font-size="12" font-weight="bold" fill="${ink}">${STAGE_NAME[seg.stage]} босим, ${unit}</text>`);
    for (let v = 0; v <= hi + 1e-12; v += ys) g.push(`<line x1="${padL}" x2="${W - padR}" y1="${Y(v)}" y2="${Y(v)}" stroke="${grid}" stroke-width="1"/><text x="${padL - 6}" y="${Y(v) + 4}" text-anchor="end" fill="${muted}">${+v.toFixed(4)}</text>`);
    for (let x = 0; x <= xMax + 1e-9; x += xs) g.push(`<text x="${X(x)}" y="${H - 8}" text-anchor="middle" fill="${muted}">${+x.toFixed(3)}</text>`);
    g.push(`<text x="${W - padR}" y="${H - 8}" text-anchor="end" fill="${muted}">км</text>`);
    if (norm) g.push(`<line x1="${padL}" x2="${W - padR}" y1="${Y(norm * k)}" y2="${Y(norm * k)}" stroke="${crit}" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${padL + 6}" y="${Y(norm * k) - 5}" text-anchor="start" fill="${ink}">меъёр ${+(norm * k).toFixed(4)} ${unit}</text>`);
    const col = STAGE_COLOR[seg.stage];
    g.push(`<polyline fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${seg.pts.map(p => `${X(p.x).toFixed(1)},${Y(p.P * k).toFixed(1)}`).join(' ')}"/>`);
    seg.pts.forEach((p, i) => {
      const cx = X(p.x), cy = Y(p.P * k), bad = ['bad', 'dead'].includes(p.st);
      const tip = `${p.id}${p.name ? ' ' + p.name : ''} · ${p.x.toFixed(3)} км · ${fmtP(p.P, p.stage)} ${unit} · ${statusName(p.st)}`;
      g.push(`<circle cx="${cx}" cy="${cy}" r="4.5" fill="${bad ? crit : col}" stroke="${ring}" stroke-width="2"/>`);
      g.push(`<circle cx="${cx}" cy="${cy}" r="11" fill="transparent" data-tip="${esc(tip)}"><title>${esc(tip)}</title></circle>`);
      const last = i === seg.pts.length - 1;
      if (i === 0 || last) {
        // бошланғич ва охирги нуқта ёрлиғи: чегарадан чиқмасин, бир-бирини ёпмасин
        const anchor = cx > W * 0.55 ? 'end' : 'start', dx = anchor === 'end' ? -7 : 7;
        const close = last && seg.pts.length > 1 && Math.abs(cx - X(seg.pts[0].x)) < 150;
        const ty = close ? cy + 17 : cy - 9;
        g.push(`<text x="${cx + dx}" y="${Math.max(padT + 2, Math.min(H - padB - 2, ty))}" text-anchor="${anchor}" fill="${ink}">${esc(p.id)} ${fmtP(p.P, p.stage)}</text>`);
      }
    });
    g.push('</svg>');
    return g.join('');
  }).join('');
}
