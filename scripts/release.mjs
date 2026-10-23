// Rebuilds, checks that the committed browser bundle is up to date, and reminds how to tag.
// The bundle's first line names the commit it was built from, so it is ignored in the comparison.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = 'dist/browser/restitution.js';
const git = (...a) => execFileSync('git', a, { cwd: root }).toString();
const body = (text) => text.split('\n').slice(1).join('\n');
const fail = (msg) => {
  console.error(`release: ${msg}`);
  process.exit(1);
};

if (git('status', '--porcelain', '--', '.', `:!${BUNDLE}`).trim()) fail('commit or stash your changes first (the bundle is built from HEAD)');
const committed = git('show', `HEAD:${BUNDLE}`);
execFileSync('node', ['scripts/build.mjs'], { cwd: root, stdio: 'inherit' });
const fresh = readFileSync(join(root, BUNDLE), 'utf8');
writeFileSync(join(root, BUNDLE), committed); // keep the committed header: no churn
if (body(fresh) !== body(committed)) {
  writeFileSync(join(root, BUNDLE), fresh);
  fail(`${BUNDLE} is out of date: it was just rebuilt, commit it, then run release again`);
}
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
console.log(`release: ${BUNDLE} is up to date.\nNext: git tag -a v${version} -m "${version}" && git push origin v${version}`);
