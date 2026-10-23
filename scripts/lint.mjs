// Minimal lint: rules of the package that tsc cannot see.
//  - no em dash or en dash in sources, fixtures or docs (rendered text and prose);
//  - no assistant name anywhere (D171);
//  - no DOM in the parser and compositions (they are also imported by the server).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'dist', '.git']);
function* walk(dir) {
  for (const f of readdirSync(dir)) {
    if (SKIP.has(f)) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const problems = [];
const dash = /[—–]/;
const assistants = new RegExp(['claude', 'chatgpt', 'openai', 'anthropic', 'gemini', 'copilot'].join('|'), 'i');
for (const file of walk(root)) {
  const rel = relative(root, file);
  if (!/\.(ts|mjs|md|css|json|html|sh|txt)$/.test(file)) continue;
  if (rel === 'package-lock.json' || rel === 'scripts/lint.mjs' || rel.startsWith('fixtures/maquette')) continue;
  const text = readFileSync(file, 'utf8');
  text.split('\n').forEach((line, i) => {
    if (line.includes('lint-allow')) return;
    if (dash.test(line)) problems.push(`${rel}:${i + 1}: em or en dash`);
    if (assistants.test(line)) problems.push(`${rel}:${i + 1}: assistant name`);
  });
  // mermaid.ts only holds the browser script as text.
  const domFree = rel.startsWith('src/') && !['src/browser.ts', 'src/compose/mermaid.ts'].includes(rel);
  if (domFree && /\b(document|window|navigator)\./.test(text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')))
    problems.push(`${rel}: DOM access outside src/browser.ts`);
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('lint: ok');
