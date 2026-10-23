import { describe, expect, it } from 'vitest';
import { MERMAID_INTEGRITY, MERMAID_URL, mermaidBootScript } from '../src/compose/mermaid.js';
import { VAUBAN_CHARTE } from '../src/charte.js';
import { MERMAID_URL as SCRIPT_URL, mermaidIntegrity } from '../scripts/sri.mjs';

describe('Mermaid subresource integrity', () => {
  it('is asked for, with an anonymous cross-origin load, in the boot script', () => {
    const js = mermaidBootScript(VAUBAN_CHARTE);
    expect(js).toContain(MERMAID_INTEGRITY);
    expect(js).toContain('s.integrity=c.integrity;s.crossOrigin="anonymous"');
    expect(js.indexOf('s.integrity')).toBeLessThan(js.indexOf('s.src='));
    expect(MERMAID_INTEGRITY).toMatch(/^sha384-[A-Za-z0-9+/]{64}$/);
    expect(SCRIPT_URL).toBe(MERMAID_URL);
  });

  // Recomputed from the file on cdnjs; skipped, loudly, when the network is not reachable.
  it('equals the hash of the file cdnjs serves', async (ctx) => {
    let computed: string;
    try {
      computed = await mermaidIntegrity();
    } catch (e) {
      console.warn(`SRI recomputation skipped (network): ${e instanceof Error ? e.message : e}`);
      ctx.skip();
      return;
    }
    expect(computed).toBe(MERMAID_INTEGRITY);
  }, 30000);
});
