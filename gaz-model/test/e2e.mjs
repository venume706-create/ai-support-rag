// Сквозной синов (Playwright, Chromium). Ишга тушириш: npm run e2e
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { STREETS } from '../src/sample.js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const OUT = 'test-out';
mkdirSync(OUT, { recursive: true });
const LIB = { xlsx: 'node_modules/xlsx/dist/xlsx.full.min.js', html2pdf: 'node_modules/html2pdf.js/dist/html2pdf.bundle.min.js' };

// T9 эски форматда: «Истеъмолчилар» + «Гидравлик ҳисоб», ҳар бир кўча олдингисидан
function oldFormatFile() {
  const cons = [['Ҳалқобод МФЙ истеъмолчилари'], [], ['№', 'Кўча номи', 'Хонадон сони', 'Газ плита 4 конф.', 'Газ плита 2 конф.', 'Котел / АГВ', 'Колонка']];
  STREETS.forEach((s, k) => cons.push([k + 1, s.name, s.N, s.p4, s.p2, s.boil, s.col]));
  cons.push(['', 'Жами', STREETS.reduce((a, s) => a + s.N, 0)]);
  const hyd = [['ГРПдаги босим, кПа', 3], [], ['№', 'Участка', 'Қаердан', 'L, м', 'd, мм', 'Q, м³/соат']];
  STREETS.forEach((s, k) => hyd.push([k + 1, s.name, k ? STREETS[k - 1].name : 'ГРП', s.L, s.d, '']));
  hyd.push(['', 'Жами', '', STREETS.reduce((a, s) => a + s.L, 0)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cons), 'Истеъмолчилар');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hyd), 'Гидравлик ҳисоб');
  const f = `${OUT}/halqobod_eski.xlsx`;
  XLSX.writeFile(wb, f);
  return f;
}

const browser = await chromium.launch();
async function open(opts = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 }, ...opts });
  await ctx.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: readFileSync(r.request().url().includes('xlsx') ? LIB.xlsx : LIB.html2pdf), contentType: 'application/javascript' }));
  const page = await ctx.newPage();
  const errors = [], downloads = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('download', d => downloads.push(d));
  await page.goto('file://' + process.cwd() + '/dist/Gaz_tarmogi_modeli.html');
  await page.waitForFunction(() => window.__gaz && window.__gaz.results.length === 6);
  return { ctx, page, errors, downloads };
}
async function waitDownloads(list, n, ms = 90000) {
  const t0 = Date.now();
  while (list.length < n) { if (Date.now() - t0 > ms) throw new Error(`юклаб олишлар: ${list.length}/${n}`); await new Promise(r => setTimeout(r, 200)); }
  return Promise.all(list.slice(0, n).map(async d => ({ name: d.suggestedFilename(), path: await d.path() })));
}
let step = 0;
const ok = msg => console.log(`✔ ${++step}. ${msg}`);

try {
  // 1. Очиш: консолда хато йўқ
  {
    const { ctx, page, errors } = await open();
    for (const t of ['scheme', 'profile', 'nodes', 'pipes', 'regs', 'scen', 'probs', 'method', 'help']) { await page.click(`[data-tab="${t}"]`); await page.waitForTimeout(150); }
    for (let i = 0; i < 6; i++) await page.click(`[data-si="${i}"]`);
    assert.deepEqual(errors, []);
    ok('саҳифа очилди, барча вкладка ва режимлар — консолда хато йўқ');
    await ctx.close();
  }
  // 2. Эски формат занжири → PDF-сўров ва «?» ли XLSX
  {
    const { ctx, page, errors, downloads } = await open();
    await page.setInputFiles('#fileX', oldFormatFile());
    const files = await waitDownloads(downloads, 2);
    const pdf = files.find(f => f.name.endsWith('.pdf')), xl = files.find(f => f.name.endsWith('.xlsx'));
    assert.ok(pdf && /soro/.test(pdf.name), 'PDF-сўров');
    assert.equal(readFileSync(pdf.path).subarray(0, 4).toString(), '%PDF');
    const wb = XLSX.readFile(xl.path);
    const par = XLSX.utils.sheet_to_json(wb.Sheets['Параметрлар'], { header: 1 });
    const q = par.filter(r => r[1] === '?').map(r => r[0]);
    assert.ok(q.includes('Объект') && q.includes('Ҳисобни бажарди') && q.includes('Кетма-кет схема тўғри'), '«?» белгилари: ' + q);
    const st = await page.evaluate(() => ({ n: __gaz.M.nodes.length, crit: __gaz.checks.filter(c => c.lvl === 'crit').map(c => c.title), tot: __gaz.results[0].tot, minP: Math.min(...__gaz.results.flatMap(r => r.nodes.map(n => n.P))) }));
    assert.equal(st.n, 30);
    assert.ok(st.crit.includes('Схема шубҳали'));
    assert.ok(Math.abs(st.tot - 1203.7) < 0.5 && st.minP >= 0);
    // «?» ли файлни қайта юклаш: «?» бўш деб ўқилади
    downloads.length = 0;
    await page.setInputFiles('#fileX', xl.path);
    await waitDownloads(downloads, 2);
    assert.equal(await page.evaluate(() => __gaz.M.meta.obj), '');
    assert.deepEqual(errors, []);
    ok(`эски формат (29 кўча занжири): PDF-сўров + Excel, «?»: ${q.join(', ')}; қайта юкланганда «?» = бўш`);
    await ctx.close();
  }
  // 3–4. Намуна модели Excel орқали → тўлиқ PDF; ҳисоботда манфий босим йўқ
  {
    const { ctx, page, errors, downloads } = await open();
    await page.click('[data-act="template"]');
    const [tpl] = await waitDownloads(downloads, 1);
    writeFileSync(`${OUT}/namuna_model.xlsx`, readFileSync(tpl.path));
    downloads.length = 0;
    await page.setInputFiles('#fileX', `${OUT}/namuna_model.xlsx`);
    const [pdf] = await waitDownloads(downloads, 1, 180000);
    assert.ok(/hisobot\.pdf$/.test(pdf.name), pdf.name + " / " + downloads.map(d => d.suggestedFilename()).join(","));
    const buf = readFileSync(pdf.path);
    writeFileSync(`${OUT}/hisobot.pdf`, buf);
    assert.equal(buf.subarray(0, 4).toString(), '%PDF');
    const pages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    const rep = await page.evaluate(() => {
      const d = document.createElement('div'); d.innerHTML = window.__lastReport;
      return { pv: [...d.querySelectorAll('.pv')].map(e => e.textContent), cells: [...d.querySelectorAll('td')].map(e => e.textContent.trim()), text: d.textContent };
    });
    assert.ok(rep.pv.length > 50);
    assert.ok(rep.pv.every(t => !/^[−-]/.test(t.trim())), 'манфий босим');
    const negCells = rep.cells.filter(t => /^[−-]\s?\d/.test(t));
    assert.deepEqual(negCells, [], 'манфий қийматли катаклар');
    for (const h of ['Босим профили', 'мавсумий ҳажми', 'Ижрочилар', 'Норматив база', 'Муаммолар реестри', 'Чоралар дастури', 'Хулоса', 'Иловалар']) assert.ok(rep.text.includes(h), h);
    assert.deepEqual(errors, []);
    ok(`намуна модели (объект ва ижрочи тўлдирилган) → тўлиқ PDF ҳисобот, ${pages} саҳифа`);
    ok(`ҳисоботда ${rep.pv.length} та босим қиймати — биронтаси ҳам «−» билан эмас`);
    await ctx.close();
  }
  // §13.6 / §13.7: диаметрларни танлаш ва профиль
  {
    const { ctx, page, errors } = await open();
    await page.click('[data-tab="pipes"]');
    await page.click('[data-act="autosize"]');
    await page.waitForFunction(() => window.__gaz.sizing);
    const r = await page.evaluate(() => ({ si: __gaz.si, ok: __gaz.sizing.ok, ch: __gaz.sizing.changes.map(c => `${c.id}:${c.d0}→${c.d1}`),
      bad: __gaz.results[5].nodes.filter(n => n.qReq > 0 && n.st !== 'ok').length, dProp: __gaz.M.pipes.filter(p => p.dProp !== '' && p.dProp !== undefined).length }));
    assert.ok(r.ok && r.si === 5 && r.bad === 0 && r.ch.length > 0, JSON.stringify(r));
    await page.click('[data-act="autosizeUndo"]');
    assert.equal(await page.evaluate(() => __gaz.results[5].nodes.filter(n => n.qReq > 0 && n.st !== 'ok').length) > 0, true);
    await page.click('[data-tab="profile"]');
    const nsvg = await page.locator('.prof svg').count();
    await page.selectOption('#profSel', 'K-02');
    const rows = await page.locator('#panel tbody tr').count();
    assert.ok(nsvg === 3 && rows >= 5, `${nsvg} ${rows}`);
    // §13.5: DXF экспорт; §13.4: калибровка (ўлчовлар йўқ — хабар)
    const dl = [];
    page.on('download', d => dl.push(d));
    await page.click('[data-tab="scheme"]');
    await page.click('[data-act="dxf"]');
    await waitDownloads(dl, 1);
    const dxf = readFileSync(await dl[0].path(), 'latin1');
    assert.ok(dxf.includes('ENTITIES') && dxf.trim().endsWith('EOF'), 'DXF');
    await page.click('#paramsBox summary');
    await page.click('[data-act="calib"]');
    assert.ok((await page.textContent('#params')).includes('Ўлчанган босимлар йўқ'));
    assert.deepEqual(errors, []);
    ok(`DXF экспорт (${(dxf.match(/\r\nLINE\r\n/g) || []).length} та чизиқ), калибровка тугмаси`);
    assert.deepEqual(errors, []);
    ok(`диаметрлар автоматик танланди (${r.ch.join(', ')}), 6-режимда барча истеъмолчилар меъёрда; бекор қилиш ишлайди; профиль: ${nsvg} график`);
    await ctx.close();
  }
  // 5. 400 px: горизонтал айланиш йўқ
  {
    const { ctx, page } = await open({ viewport: { width: 400, height: 860 } });
    for (const t of ['help', 'scheme', 'profile', 'nodes', 'pipes', 'probs', 'method']) {
      await page.click(`[data-tab="${t}"]`); await page.waitForTimeout(150);
      const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      assert.ok(sw <= iw, `${t}: ${sw} > ${iw}`);
    }
    await page.screenshot({ path: `${OUT}/mobile-400.png` });
    ok('400 px кенгликда саҳифа горизонтал айланмайди');
    await ctx.close();
  }
  // 6. Тўқ мавзу: матн ўқилади (контраст ≥ 4.5)
  {
    const { ctx, page } = await open({ colorScheme: 'dark' });
    const res = await page.evaluate(() => {
      const lum = c => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const bg = getComputedStyle(document.body).backgroundColor;
      const out = [];
      for (const sel of ['h1', 'label.f', '.kpi .v', '.tabs button.on', '.chk h4']) {
        const el = document.querySelector(sel); if (!el) continue;
        let p = el, b = 'rgba(0, 0, 0, 0)';
        while (p && /rgba\(0, 0, 0, 0\)|transparent/.test(b)) { b = getComputedStyle(p).backgroundColor; p = p.parentElement; }
        if (/rgba\(0, 0, 0, 0\)/.test(b)) b = bg;
        out.push([sel, ratio(getComputedStyle(el).color, b)]);
      }
      return { bg, out };
    });
    assert.ok(res.out.every(([, r]) => r >= 4.5), JSON.stringify(res.out));
    await page.screenshot({ path: `${OUT}/dark.png` });
    ok(`тўқ мавзу: фон ${res.bg}, контраст ${res.out.map(([s, r]) => `${s} ${r.toFixed(1)}`).join('; ')}`);
    await ctx.close();
  }
  console.log('\nE2E: барча текширувлар ўтди');
} catch (err) {
  console.error('\nE2E ХАТО:', err.stack || err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
