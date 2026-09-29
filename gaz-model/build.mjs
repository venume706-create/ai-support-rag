// Йиғиш: src/*.js модулларини битта ўзи етарли HTML файлга бирлаштиради.
// node build.mjs            → dist/Gaz_tarmogi_modeli.html (кутубхоналар cdnjs дан)
// node build.mjs --inline   → кутубхоналар файл ичига жойланади (интернетсиз синов учун, ~1.3 МБ)
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const src = f => readFileSync(join(root, 'src', f), 'utf8');
const ORDER = ['engine.js', 'sample.js', 'io.js', 'scheme.js', 'report.js', 'app.js'];
const LIBS = [
  ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'node_modules/xlsx/dist/xlsx.full.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js', 'node_modules/html2pdf.js/dist/html2pdf.bundle.min.js'],
];

/** ES модулни функция доирасига ўраш: import лар олиб ташланади, export номлари қайтарилади. */
function wrap(name, code) {
  code = code.replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  const names = [];
  code = code.replace(/^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (m, kw, id) => { names.push(id); return `${kw} ${id}`; });
  if (/^export\s/m.test(code)) throw new Error(`${name}: қўллаб-қувватланмайдиган export`);
  const v = '__m_' + name.replace(/\W/g, '_');
  return `const ${v} = (() => {\n${code}\nreturn { ${names.join(', ')} };\n})();\n` + (names.length ? `const { ${names.join(', ')} } = ${v};\n` : '');
}

const inline = process.argv.includes('--inline');
const app = ORDER.map(f => `// ===== ${f} =====\n` + wrap(f, src(f))).join('\n');
const libs = LIBS.map(([url, local]) => inline
  ? `<script>${readFileSync(join(root, local), 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`
  : `<script src="${url}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>`).join('\n');
const html = src('shell.html')
  .replace('<!--LIBS-->', () => libs)
  .replace('<!--APP-->', () => `<script>\n'use strict';\n${app.replace(/<\/script/gi, '<\\/script')}\n</script>`);
mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist', inline ? 'Gaz_tarmogi_modeli.inline.html' : 'Gaz_tarmogi_modeli.html');
writeFileSync(out, html);
console.log(`${out}: ${(statSync(out).size / 1024).toFixed(0)} КБ`);
