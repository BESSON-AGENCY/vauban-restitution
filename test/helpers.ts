import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/grammar.js';
import type { RestitutionDocument } from '../src/types.js';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const fixture = (name: string): string => readFileSync(join(root, 'fixtures', name), 'utf8');

export function parseOk(markdown: string): RestitutionDocument {
  const r = parse(markdown);
  if (!r.ok) throw new Error(r.refusals.map((x) => `ligne ${x.line} : ${x.message}`).join('\n'));
  return r.document;
}

/** A minimal valid document around a body, for refusal tests. */
export const wrap = (body: string, head = '## Titre {recit}'): string =>
  `# Un titre\n23 octobre 2026 · Martin\n\n${head}\n${body}\n`;
