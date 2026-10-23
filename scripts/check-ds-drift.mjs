// Fails when the CSS copied into src/css/, the Vauban tokens, the logo or the motif drift from the
// design system repository. Path: first argument, or VAUBAN_DS_DIR, or the default checkout.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { DEFAULT_DS_DIR, checkDrift, dsAvailable } from './lib/ds-drift.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dsDir = process.argv[2] ?? process.env.VAUBAN_DS_DIR ?? DEFAULT_DS_DIR;
if (!dsAvailable(dsDir)) {
  console.error(`drift: design system repository not found at ${dsDir} (pass its path or set VAUBAN_DS_DIR)`);
  process.exit(2);
}
const out = await build({
  entryPoints: [join(root, 'src/charte.ts')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
});
const { VAUBAN_CHARTE } = await import(
  `data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`
);
const problems = checkDrift(dsDir, VAUBAN_CHARTE);
if (problems.length) {
  console.error(`drift: ${problems.length} problem(s) against ${dsDir}`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`drift: none against ${dsDir}`);
