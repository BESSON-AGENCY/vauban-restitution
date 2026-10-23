import { describe, expect, it } from 'vitest';
import { VAUBAN_CHARTE } from '../src/charte.js';
import { DEFAULT_DS_DIR, checkDrift, dsAvailable, parseTokens } from '../scripts/lib/ds-drift.mjs';

const dsDir = process.env.VAUBAN_DS_DIR ?? DEFAULT_DS_DIR;

describe('drift against the design system repository', () => {
  it.skipIf(!dsAvailable(dsDir))('copied sheets, tokens, logo and motif are in sync', () => {
    expect(checkDrift(dsDir, VAUBAN_CHARTE)).toEqual([]);
  });

  it.skipIf(!dsAvailable(dsDir))('fails on a drifted token or logo', () => {
    const drifted = { ...VAUBAN_CHARTE, tokens: { ...VAUBAN_CHARTE.tokens, '--ds-blue': '#0755fe' }, logo: '<svg viewBox="0 0 1 1"><path d="M1 2Z"/></svg>' };
    const problems = checkDrift(dsDir, drifted);
    expect(problems.some((p) => p.includes('--ds-blue'))).toBe(true);
    expect(problems.some((p) => p.includes('logo'))).toBe(true);
  });

  it('reads the tokens of a :root block', () => {
    expect(parseTokens(':root {\n  --a: 1px;\n  --b: #fff;\n}\n')).toEqual({ '--a': '1px', '--b': '#fff' });
  });
});
