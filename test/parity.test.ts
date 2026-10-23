import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '../src/grammar.js';
import { root } from './helpers.js';

// The parity corpus is shared with MIROIR (scripts/check-parity.mjs compares the copy): the same file
// must get the same verdict from both parsers. First line: <!-- expect: ok --> or <!-- expect: refus -->.
const dir = join(root, 'test/fixtures/parity');
const files = existsSync(dir)
  ? readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .sort()
  : [];

describe('parity corpus', () => {
  // The corpus comes from MIROIR (copy it with: cp <miroir>/tests/fixtures/debrief/parity/*.md test/fixtures/parity/).
  it.skipIf(files.length === 0)('is not empty', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s gets the expected verdict', (file) => {
    const text = readFileSync(join(dir, file), 'utf8');
    const first = text.split('\n')[0] ?? '';
    const expected = /^<!-- expect: (ok|refus) -->\s*$/.exec(first)?.[1];
    expect(expected, `${file}: first line must be <!-- expect: ok|refus -->`).toBeDefined();
    // The marker line is blanked, not removed, so refusal line numbers stay those of the file.
    const verdict = parse(`\n${text.split('\n').slice(1).join('\n')}`).ok ? 'ok' : 'refus';
    expect(verdict).toBe(expected);
  });
});
