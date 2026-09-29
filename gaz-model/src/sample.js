// Намуна маълумотлар: Ҳалқобод кўчалари (T9) ва намуна тармоқ (§11).
import { emptyModel } from './engine.js';

export const STREET_NAMES = ['Бодомзор', 'Усмонобод', 'Регистон 1-тупик', 'Регистон 2-тупик', 'Лаззат', 'Регистон', 'Дўстлик дом', 'Дўстлик',
  'Мактаб тор', 'Тенглик', 'Ғунча', 'Саломатлик', 'Зиё', 'Лолазор', 'Бунёдкор', 'Ўзбекистон', 'Оқ-олтин', 'Соҳибкор', 'Минг ўрик 1',
  'Минг ўрик 2', 'Минг ўрик', 'Минг ўрик 3', 'Анҳор', 'Оби-Ҳаёт', 'Соғлом авлод', 'Қурилиш', 'Янги ҳаёт', 'Ғалаба', 'Янги ҳаёт 2'];

// N, плита 4к, плита 2к, котел, колонка, L м, d мм
const RAW = `32,32,2,32,8,600,50; 10,10,0,10,0,250,50; 10,10,0,10,0,170,38; 10,10,0,10,0,150,38; 12,12,0,12,0,220,50;
78,78,2,78,9,370,50; 20,20,0,20,0,100,50; 32,32,0,32,0,450,70; 10,10,5,10,0,120,38; 42,42,0,42,0,330,50;
30,30,0,30,3,270,50; 20,20,0,20,0,70,38; 48,48,6,48,2,490,50; 46,46,5,46,3,500,70; 94,94,3,94,8,420,50;
34,34,0,34,1,600,50; 28,28,0,28,4,260,50; 36,36,9,36,5,150,50; 32,32,0,32,8,120,50; 41,41,6,41,2,150,50;
30,30,2,30,0,110,50; 16,16,0,16,0,130,50; 117,117,5,117,15,850,50; 36,36,0,36,0,420,50; 20,20,0,20,0,430,50;
30,30,0,30,0,360,50; 45,45,4,45,6,380,50; 17,17,8,17,5,190,50; 50,50,2,50,3,560,50`;

export const STREETS = RAW.split(';').map((r, k) => {
  const [N, p4, p2, boil, col, L, d] = r.trim().split(',').map(Number);
  return { name: STREET_NAMES[k], N, p4, p2, boil, col, L, d };
});

/** §11 намуна тармоғи. */
export function sampleModel() {
  const M = emptyModel();
  M.meta = { obj: 'Ҳалқобод МФЙ газ тақсимлаш тармоғи (намуна)', dist: 'Намуна вилояти, Намуна тумани', org: '«Намуна лойиҳа» МЧЖ',
    exec: 'Муҳандис А. Намунов', check: '', date: new Date().toISOString().slice(0, 10), chainOk: false };
  const node = (id, name, type, cat, extra = {}) => M.nodes.push({ id, name, type, cat, N: '', p4: '', p2: '', boil: '', col: '', q: '',
    Pnorm: '', Pmin: '', Pmeas: '', x: '', y: '', zone: '', ...extra });
  const pipe = (id, from, to, cat, L, d, extra = {}) => M.pipes.push({ id, from, to, cat, L, d, mat: 'пўлат', lay: 'ер ости', year: '', status: 'очиқ', dProp: '', ...extra });
  node('ГТС-1', 'ГТС чиқиши', 'ГТС', 'high2', { Pnorm: 600, Pmin: 390 });
  node('H-01', 'Магистрал тугуни', 'тугун', 'high2');
  node('H-02', 'ГРП-1 кириши', 'тугун', 'high2');
  pipe('Q-H01', 'ГТС-1', 'H-01', 'high2', 2500, 150);
  pipe('Q-H02', 'H-01', 'H-02', 'high2', 1800, 125);
  M.regs.push({ id: 'ГРП-1', name: 'ГРП-1 (посёлок)', type: 'ГРП', in: 'H-02', out: 'M-00', Pset: 300, PinMin: 350, cap: 2500 });
  for (const id of ['M-00', 'M-01', 'M-02', 'M-03', 'M-04']) node(id, id === 'M-00' ? 'ГРП-1 чиқиши' : 'Ўрта босим тугуни', 'тугун', 'mid');
  node('M-F1', 'Корхона', 'истеъмолчи', 'mid', { q: 350 });
  pipe('Q-M01', 'M-00', 'M-01', 'mid', 800, 100);
  pipe('Q-M02', 'M-01', 'M-02', 'mid', 900, 100);
  pipe('Q-M03', 'M-02', 'M-03', 'mid', 700, 80);
  pipe('Q-M04', 'M-03', 'M-00', 'mid', 1000, 80);
  pipe('Q-M05', 'M-01', 'M-04', 'mid', 600, 80);
  pipe('Q-M06', 'M-01', 'M-F1', 'mid', 400, 80);
  M.regs.push({ id: 'ШРП-1', name: 'ШРП-1', type: 'ШРП', in: 'M-02', out: 'L-00', Pset: 3, PinMin: 50, cap: 1300 });
  M.regs.push({ id: 'ШРП-2', name: 'ШРП-2', type: 'ШРП', in: 'M-03', out: 'K-00', Pset: 3, PinMin: 50, cap: 100 });
  M.regs.push({ id: 'ШРП-3', name: 'ШРП-3', type: 'ШРП', in: 'M-04', out: 'L-T2', Pset: 3, PinMin: 50, cap: 600 });
  node('L-00', 'ШРП-1 чиқиши', 'тугун', 'low');
  node('L-T1', 'Тармоқланиш 1', 'тугун', 'low');
  node('L-T2', 'ШРП-3 чиқиши', 'тугун', 'low');
  pipe('Q-L00', 'L-00', 'L-T1', 'low', 40, 250);
  STREETS.forEach((s, k) => {
    const id = 'L-' + String(k + 1).padStart(2, '0');
    node(id, s.name + ' кўчаси', 'истеъмолчи', 'low', { N: s.N, p4: s.p4, p2: s.p2, boil: s.boil, col: s.col, zone: 'Ҳалқобод МФЙ' });
    const d = s.d === 50 ? (s.N > 40 ? 100 : 80) : s.d === 38 ? 50 : s.d;
    pipe('Q-' + id, k < 15 ? 'L-T1' : 'L-T2', id, 'low', s.L, d);
  });
  node('K-00', 'ШРП-2 чиқиши', 'тугун', 'low');
  node('K-01', 'Намуна кўча 1', 'истеъмолчи', 'low', { N: 25, p4: 25, boil: 25, zone: 'Қўшни МФЙ' });
  node('K-02', 'Намуна кўча 2', 'истеъмолчи', 'low', { N: 18, p4: 18, boil: 18, zone: 'Қўшни МФЙ' });
  pipe('Q-K01', 'K-00', 'K-01', 'low', 250, 70);
  pipe('Q-K02', 'K-00', 'K-02', 'low', 200, 50);
  pipe('Q-L99', 'L-T1', 'L-T2', 'low', 600, 130.8, { mat: 'ПЭ', status: 'таклиф', lay: 'ер ости' });
  M.scen[3].closed = 'Q-M02';
  return M;
}

/** T9: 29 кўча бир занжирда (эски формат импорти натижаси каби). */
export function chainModel(P0kPa = 3) {
  const M = emptyModel();
  M.nodes.push({ id: 'GRP', name: 'ГРП', type: 'ГТС', cat: 'low', Pnorm: P0kPa, Pmin: '' });
  STREETS.forEach((s, k) => {
    const id = 'K-' + String(k + 1).padStart(2, '0');
    M.nodes.push({ id, name: s.name, type: 'истеъмолчи', cat: 'low', N: s.N, p4: s.p4, p2: s.p2, boil: s.boil, col: s.col });
    M.pipes.push({ id: 'Q-' + id, from: k ? 'K-' + String(k).padStart(2, '0') : 'GRP', to: id, cat: 'low', L: s.L, d: s.d, mat: 'пўлат', status: 'очиқ' });
  });
  return M;
}
