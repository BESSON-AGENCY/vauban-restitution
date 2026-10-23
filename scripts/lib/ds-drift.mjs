// Compares what this package copies from the design system repository with the repository itself.
// Returns a list of problems; an empty list means no drift.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

export const DEFAULT_DS_DIR = '/Users/martinbesson/Code/vauban-ds-restitution-v2';

/** The CSS files copied verbatim into src/css/, with their path in the DS repository. */
export const COPIED_CSS = [
  ['tokens.css', 'design-system/tokens.css'],
  ['tokens-print.css', 'design-system/documents/tokens-print.css'],
  ['components.css', 'design-system/documents/components.css'],
  ['editorial.css', 'design-system/documents/editorial.css'],
  ['scenes.css', 'design-system/documents/scenes.css'],
  ['pages.css', 'design-system/documents/pages.css'],
  ['decisions.css', 'design-system/documents/decisions.css'],
];

export function dsAvailable(dsDir) {
  return existsSync(join(dsDir, 'design-system/tokens.css'));
}

/** `--name: value;` declarations of the first :root block, in order. */
export function parseTokens(css) {
  const block = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  const out = {};
  for (const m of block.matchAll(/^\s*(--[\w-]+)\s*:\s*(.+?)\s*;\s*$/gm)) out[m[1]] = m[2];
  return out;
}

const pathData = (svg) => [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);

/**
 * @param {string} dsDir root of the design system repository
 * @param {{ tokens: Record<string,string>, logo: string, motif: string }} charte VAUBAN_CHARTE
 */
export function checkDrift(dsDir, charte) {
  const problems = [];
  for (const [name, rel] of COPIED_CSS) {
    const source = join(dsDir, rel);
    if (!existsSync(source)) {
      problems.push(`${rel}: missing in the design system repository`);
      continue;
    }
    if (readFileSync(source, 'utf8') !== readFileSync(join(root, 'src/css', name), 'utf8'))
      problems.push(`src/css/${name} differs from ${rel}`);
  }

  const dsTokens = parseTokens(readFileSync(join(dsDir, 'design-system/tokens.css'), 'utf8'));
  for (const [k, v] of Object.entries(dsTokens)) {
    if (charte.tokens[k] === undefined) problems.push(`token ${k} is in the design system, not in VAUBAN_CHARTE`);
    else if (charte.tokens[k] !== v) problems.push(`token ${k}: charte "${charte.tokens[k]}", design system "${v}"`);
  }
  for (const k of Object.keys(charte.tokens)) {
    if (dsTokens[k] === undefined) problems.push(`token ${k} is in VAUBAN_CHARTE, not in the design system`);
  }

  const marque = join(dsDir, 'public/marque');
  if (existsSync(marque)) {
    const svgs = readdirSync(marque)
      .filter((f) => f.endsWith('.svg'))
      .map((f) => readFileSync(join(marque, f), 'utf8'))
      .join('\n');
    for (const d of pathData(charte.logo)) if (!svgs.includes(d)) problems.push('logo path not found in public/marque/*.svg');
  } else problems.push('public/marque: missing in the design system repository');

  const decoration = join(dsDir, 'components/vauban/documents/decoration.tsx');
  if (existsSync(decoration)) {
    const tsx = readFileSync(decoration, 'utf8');
    for (const d of pathData(charte.motif)) if (!tsx.includes(d)) problems.push('motif path not found in decoration.tsx');
  } else problems.push('components/vauban/documents/decoration.tsx: missing in the design system repository');
  return problems;
}
