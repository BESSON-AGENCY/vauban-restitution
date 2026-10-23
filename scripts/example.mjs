// Composes fixtures/reference.md into dist/exemple.html with the built node entry.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VAUBAN_CHARTE, compose, formatRefusal, parse } from '../dist/node/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = parse(readFileSync(join(root, 'fixtures/reference.md'), 'utf8'));
if (!result.ok) {
  console.error(result.refusals.map(formatRefusal).join('\n'));
  process.exit(1);
}
mkdirSync(join(root, 'dist'), { recursive: true });
const html = compose(result.document, VAUBAN_CHARTE);
writeFileSync(join(root, 'dist/exemple.html'), html);
console.log(`dist/exemple.html: ${html.length} bytes`);
