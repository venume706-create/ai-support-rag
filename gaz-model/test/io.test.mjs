import test from 'node:test';
import assert from 'node:assert/strict';
import { solveScenario } from '../src/engine.js';
import { chainModel, sampleModel } from '../src/sample.js';
import { toGeoJSON, toKML, toDXF, coordsKind, safeName } from '../src/io.js';
import { layoutNodes } from '../src/scheme.js';

const NORM = { src: 'norm', dem: 1, growth: 0, closed: '', variant: false };

test('§13.5: GeoJSON ва KML (WGS84)', () => {
  const M = chainModel();
  M.nodes.forEach((n, k) => { n.x = 69.2 + k * 0.001; n.y = 41.3 + k * 0.0005; });
  const R = solveScenario(M, NORM);
  assert.equal(coordsKind(M), 'lonlat');
  const g = JSON.parse(toGeoJSON(M, R));
  assert.equal(g.features.filter(f => f.geometry.type === 'Point').length, 30);
  assert.equal(g.features.filter(f => f.geometry.type === 'LineString').length, 29);
  assert.ok(g.features.every(f => f.properties.id));
  assert.ok(!g.note);
  const k = toKML(M, R);
  assert.ok(k.startsWith('<?xml') && (k.match(/<Placemark>/g) || []).length === 59);
  M.nodes.forEach(n => { n.x = 500000 + n.x; });
  assert.equal(toKML(M, R), null);
  assert.ok(JSON.parse(toGeoJSON(M, R)).note);
});

test('§13.5: DXF — координатасиз ҳам схема жойлашуви бўйича', () => {
  const M = sampleModel();
  const R = solveScenario(M, M.scen[0]);
  assert.equal(coordsKind(M), 'none');
  const d = toDXF(M, R, layoutNodes(M));
  const lines = d.split('\r\n');
  assert.equal(lines[1], 'SECTION');
  assert.equal(lines.filter(l => l === 'LINE').length, M.pipes.length + M.regs.length);
  assert.equal(lines.filter(l => l === 'CIRCLE').length, M.nodes.length);
  assert.ok(d.includes('PIPE_HIGH2') && d.includes('PIPE_PROPOSED') && d.trim().endsWith('EOF'));
  assert.ok(!/[^\x00-\x7f]/.test(d), 'фақат ASCII (кирилл \\U+XXXX)');
});

test('файл номи лотинчада', () => {
  assert.equal(safeName('Ҳалқобод МФЙ газ тармоғи (намуна)'), 'Halqobod_MFY_gaz_tarmogi_namuna');
});
