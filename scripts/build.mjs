// Builds dist/node (ESM), dist/types (declarations) and dist/browser/restitution.js (minified IIFE).
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const sha = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root }).toString().trim();
  } catch {
    return 'unknown';
  }
})();
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });

run('node', ['scripts/build-css.mjs']);
for (const d of ['node', 'types', 'browser']) rmSync(join(root, 'dist', d), { recursive: true, force: true });

await build({
  entryPoints: [join(root, 'src/index.ts')],
  outfile: join(root, 'dist/node/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
});
await build({
  entryPoints: [join(root, 'src/browser.ts')],
  outfile: join(root, 'dist/browser/restitution.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2019',
  minify: true,
  legalComments: 'none',
  banner: { js: `/* @vaubanhq/restitution ${version}, construit depuis ${sha} */` },
});
run('npx', ['tsc', '-p', 'tsconfig.build.json']);

for (const f of ['dist/node/index.js', 'dist/browser/restitution.js']) {
  const buf = readFileSync(join(root, f));
  console.log(`${f}: ${(buf.length / 1024).toFixed(1)} KiB, gzip ${(gzipSync(buf).length / 1024).toFixed(1)} KiB`);
}
