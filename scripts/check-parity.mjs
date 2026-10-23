// Fails when the parity corpus copied into test/fixtures/parity differs from the one of MIROIR.
// Path: first argument, or MIROIR_PARITY_DIR, or the default MIROIR worktree.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT = '/Users/martinbesson/Code/MIROIR-vba-3198/tests/fixtures/debrief/parity';
const other = process.argv[2] ?? process.env.MIROIR_PARITY_DIR ?? DEFAULT;
const mine = join(root, 'test/fixtures/parity');
if (!existsSync(other)) {
  console.error(`parity: MIROIR corpus not found at ${other} (pass its path or set MIROIR_PARITY_DIR)`);
  process.exit(2);
}
const list = (d) => readdirSync(d).filter((f) => f.endsWith('.md')).sort();
const a = list(mine);
const b = list(other);
const problems = [];
for (const f of b) if (!a.includes(f)) problems.push(`${f}: in MIROIR, not copied here`);
for (const f of a) if (!b.includes(f)) problems.push(`${f}: here, not in MIROIR`);
for (const f of a.filter((f) => b.includes(f)))
  if (readFileSync(join(mine, f), 'utf8') !== readFileSync(join(other, f), 'utf8')) problems.push(`${f}: content differs`);
if (problems.length) {
  console.error(`parity: ${problems.length} difference(s) against ${other}`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`parity: ${a.length} file(s) identical to ${other}`);
