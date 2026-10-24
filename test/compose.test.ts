import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { VAUBAN_CHARTE, assertCharte, type Charte } from '../src/charte.js';
import { compose, composeParts } from '../src/compose/index.js';
import { fixture, parseOk } from './helpers.js';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// Frozen fingerprint of the reference restitution composed with VAUBAN_CHARTE. It changes when a
// composition, the profile or a copied DS sheet changes: update it on purpose, after looking at the render.
const REFERENCE_FINGERPRINT = 'a1bfeed43af178923bea10a0af872a435348a54436134e99de8e5a8a62a3ca24';

describe('reference composition', () => {
  const doc = parseOk(fixture('reference.md'));
  const html = compose(doc, VAUBAN_CHARTE);

  it('has the frozen fingerprint', () => {
    expect(sha256(html)).toBe(REFERENCE_FINGERPRINT);
  });

  it('is deterministic', () => {
    expect(compose(doc, VAUBAN_CHARTE)).toBe(html);
  });

  it('starts with the cover and explicit page breaks, before browser measurement', () => {
    const c = composeParts(doc, VAUBAN_CHARTE);
    expect(c.pageCount).toBe(5);
    expect(c.html.match(/class="vd-document va-page"/g)).toHaveLength(5);
    expect(c.html).toContain('02 / 05');
    expect(c.html).toContain('05 / 05');
  });

  it('keeps the cases and all block titles in source order without implicit breaks', () => {
    const content = composeParts(doc, VAUBAN_CHARTE).html;
    expect(content.indexOf('Le planning des tournages et les validations client')).toBeLessThan(content.indexOf('Le pipe du lundi'));
    expect(content).toContain("Ce que nous n'avons pas abordé");
    expect(content).toContain('<section class="vr-section"');
  });

  it('hands the flowcharts to Mermaid and marks the stuck steps with the accent of the charte', () => {
    const c = composeParts(doc, VAUBAN_CHARTE);
    expect(c.html.match(/data-mermaid="flowchart"/g)).toHaveLength(2);
    expect(c.html).not.toContain('vd-journey');
    // The classDef is the engine's, written with the accent token; the assistant's own class lines stay.
    expect(c.html.match(/classDef coince fill:#0755ff,stroke:#0755ff,color:#ffffff/g)).toHaveLength(2);
    expect(c.html).toContain('class B,D coince');
    expect(c.html).not.toMatch(/amber|#845200/);
  });

  it('ships a boot script that is plain ES5 and keeps a diagram and the text inside their A4 page', () => {
    const script = composeParts(doc, VAUBAN_CHARTE).script;
    expect(() => new Function(script)).not.toThrow();
    expect(script).not.toMatch(/=>|\blet\b|\bconst\b|`|\?\./);
    // Diagram candidates target the body size of the design system, independently of previous sections.
    expect(script).toContain('"body":16');
    expect(script).toContain('.va-page');
    // page continuation: cuts between elements, repeats a table head, keeps the reading box going
    expect(script).toContain('thead');
    expect(script).toContain('.vd-callout');
  });

  it('keeps the schemas for Mermaid, with a text fallback, and loads Mermaid 11.12.0 only then', () => {
    const c = composeParts(doc, VAUBAN_CHARTE);
    expect(c.html).toContain('<pre class="mermaid" hidden>');
    expect(c.html).toContain('Vos cas : ');
    expect(c.html).toContain('vente (le distributeur) → calage des tournages');
    expect(c.mermaidScript).toContain('mermaid/11.12.0/mermaid.min.js');
    const noMap = parseOk(fixture('genres.md'));
    expect(composeParts(noMap, VAUBAN_CHARTE).mermaidScript).not.toBeNull(); // genres.md has a mindmap
    const plain = parseOk('# T\n23 octobre 2026 · A\n\n## B {recit}\nUn texte.\n');
    expect(composeParts(plain, VAUBAN_CHARTE).mermaidScript).toBeNull();
    expect(composeParts(plain, VAUBAN_CHARTE).script).toContain('function paginate');
    expect(compose(plain, VAUBAN_CHARTE, { mermaid: false })).not.toContain('<script');
  });

  it('has no kicker, no em dash, no assistant name', () => {
    expect(html).not.toMatch(/vd-kicker/);
    expect(html).not.toMatch(/[\u2014\u2013]/);
    expect(html).not.toMatch(/claude|chatgpt|openai|anthropic|gemini|copilot/i); // lint-allow
  });

  it('marks the reading as Vauban, not the person', () => {
    expect(html).toContain('<h3>Ma lecture, pas vos mots.</h3>');
    expect(html).toContain('data-variant="lecture"');
  });

  it('puts the last block on the night surface', () => {
    expect(html).toContain('data-surface="nuit"');
    expect(composeParts(doc, VAUBAN_CHARTE).html.match(/<section class="vr-section" data-surface="nuit"/g)).toHaveLength(1);
  });

  it('escapes what the person wrote', () => {
    const d = parseOk('# Titre & co\n23 octobre 2026 · A&B\n\n## B {recit}\nUn « "texte" » & plus.\n');
    const out = compose(d, VAUBAN_CHARTE);
    expect(out).toContain('<title>Titre &amp; co</title>');
    expect(out).toContain('Un « &quot;texte&quot; » &amp; plus.');
  });
});

describe('synthesis page and figures as text', () => {
  const html = composeParts(parseOk(fixture('synthese.md')), VAUBAN_CHARTE).html;
  it('puts the sections on one page, each an intertitre and its text, then the filleted conclusion', () => {
    const page = html.split('<article').find((a) => a.includes('aria-label="Ce que vous m&#39;avez dit"') || a.includes("aria-label=\"Ce que vous m'avez dit\"") || a.includes('Ce que vous avez déroulé'))!;
    expect(page.match(/<section class="va-reading-section">/g)).toHaveLength(3);
    expect(page).toContain('<header class="vd-subheading"><div><h3>Ce qui coince</h3></div></header>');
    expect(page).not.toContain('vd-subheading-number');
    expect(page.indexOf('va-reading-section')).toBeLessThan(page.indexOf('class="va-takeaway"'));
  });
  it('writes each figure as one line at the chapeau size, number in the accent, no tile', () => {
    expect(html).toContain('<p class="va-intro">« <strong class="vr-figure-number">Trois jours</strong> perdus » sur les validations client.</p>');
    expect(html).not.toContain('vd-figure');
  });
  it('has no pictogram in the flows before Mermaid draws them', () => {
    const ref = composeParts(parseOk(fixture('reference.md')), VAUBAN_CHARTE).html;
    const flows = ref.match(/<div class="vr-diagram" data-mermaid="flowchart">[\s\S]*?<\/div>/g) ?? [];
    expect(flows.length).toBe(2);
    for (const f of flows) expect(f).not.toContain('<svg');
  });
});

describe('the other genres', () => {
  const html = compose(parseOk(fixture('genres.md')), VAUBAN_CHARTE);
  it('hands a timeline to Mermaid, with its dates as the fallback text', () => {
    expect(html).toContain('<div class="vr-diagram" data-mermaid="timeline">');
    expect(html).not.toContain('vd-timeline');
    expect(html).toContain('mars 2026 : le premier devis refusé ; avril 2026 : la relance ; le second devis ; juin 2026 : la signature');
  });
  it('keeps the branches and loops the assistant wrote, and ignores a classDef of its own', () => {
    const loop = parseOk(
      '# T\n23 octobre 2026 · A\n\n## J {journee}\n```mermaid\nflowchart TB\n  A["montage"] --> B["client"]\n  B -->|retours| A\n  B -->|validé| C["fin"]\n  classDef coince fill:red\n  class B coince\n```\n',
    );
    const out = composeParts(loop, VAUBAN_CHARTE).html;
    expect(out).toContain('B --&gt;|retours| A');
    expect(out).toContain('B --&gt;|validé| C[&quot;fin&quot;]');
    expect(out).not.toContain('fill:red');
    expect(out.match(/classDef coince/g)).toHaveLength(1);
  });
  it('does not draw a classDef when no step is stuck', () => {
    const d = parseOk('# T\n23 octobre 2026 · A\n\n## J {journee}\n```mermaid\nflowchart TB\n  A["a"] --> B["b"]\n```\n');
    expect(composeParts(d, VAUBAN_CHARTE).html).not.toContain('classDef');
  });
  it('heads the first case page with the block title when the block has no text before it', () => {
    const d = parseOk('# T\n23 octobre 2026 · A\n\n## Vos cas {cas}\n\n### Un cas\nTexte.\n\n### Un autre\nSuite.\n');
    const c = composeParts(d, VAUBAN_CHARTE);
    expect(c.pageCount).toBe(2);
    const pages = c.html.split('<article').slice(2);
    expect(pages[0]).toContain('<header class="vd-heading"><h2>Vos cas</h2></header>');
    expect(pages[0]).toContain('<h3>Un cas</h3>');
    expect(pages).toHaveLength(1);
    expect(pages[0]).toContain('<h3>Un autre</h3>');
  });
  it('lets the browser place a mindmap and the following case according to available space', () => {
    const d = parseOk('# T\n23 octobre 2026 · A\n\n## Vos cas {cas}\n```mermaid\nmindmap\n  root((Vos cas))\n    un\n```\n\n### Un cas\nTexte.\n');
    expect(composeParts(d, VAUBAN_CHARTE).pageCount).toBe(2);
  });
  it('composes tables with vd-table and the before/after with decisions.css', () => {
    expect(html).toContain('<div class="vd-table" data-variant="reading">');
    expect(html).toContain('<div class="vd-comparison">');
    expect(html).toContain('<th data-slot="table-head" scope="row">Airtable</th>');
  });
  it('composes figures in their sentence', () => {
    expect(html).toContain('<strong class="vr-figure-number">Quatre heures</strong>');
  });
});

/** A charte that shares no value with Vauban's. */
const FAKE: Charte = {
  name: 'Acme',
  logo: '<svg viewBox="0 0 10 10" role="img" aria-label="Acme"><g fill="currentColor"><path d="M1 1H9V9H1Z"/></g></svg>',
  fonts: { stylesheet: null },
  tokens: {
    '--ds-font-body': 'Georgia, serif',
    '--ds-weight-body': '400',
    '--ds-white': '#fefefe',
    '--ds-cloud': '#efefef',
    '--ds-mist': '#e1f5e1',
    '--ds-slate': '#444444',
    '--ds-navy': '#2b1a0e',
    '--ds-blue': '#c2185b',
    '--ds-silver': '#cccccc',
    '--ds-radius-field': '4px',
    '--ds-space-1': '1px',
    '--ds-space-2': '2px',
    '--ds-space-3': '3px',
    '--ds-space-4': '5px',
    '--ds-space-6': '7px',
    '--ds-space-8': '9px',
    '--ds-space-12': '11px',
  },
  motif: '<svg class="vd-motif" viewBox="0 0 10 10"><circle class="vd-motif-fill" cx="5" cy="5" r="4"/></svg>',
};

describe('the charte is data', () => {
  // The reserved opening line of the reading block belongs to the grammar, so the reading block is left out here.
  const source = fixture('reference.md').replace(/## Ce que je comprends de vos cas \{lecture\}[\s\S]*?(?=## Ce que nous)/, '');
  const doc = parseOk(source);
  const withFake = compose(doc, FAKE);
  const withVauban = compose(doc, VAUBAN_CHARTE);

  it('carries none of the Vauban values when composed with another charte', () => {
    const vauban = Object.values(VAUBAN_CHARTE.tokens).filter((v) => /^#/.test(v) || /Jost/.test(v));
    expect(vauban.length).toBeGreaterThan(8);
    for (const v of vauban) expect(withFake.toLowerCase()).not.toContain(v.toLowerCase());
    expect(withFake).not.toContain('Vauban'); // the name; DS class names such as vauban-art are not values
    expect(withFake).not.toContain('M0 0H38.4');
    expect(withFake).not.toContain('M100 430V204');
    expect(withFake).not.toContain('fonts.googleapis.com');
  });

  it('carries the charte values instead', () => {
    expect(withFake).toContain('--ds-blue:#c2185b');
    expect(withFake).toContain('aria-label="Acme"');
    expect(withFake).toContain('M1 1H9V9H1Z');
    expect(withFake).toContain('<circle class="vd-motif-fill"');
  });

  it('changes nothing in the structure of the pages', () => {
    const strip = (h: string) => h.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/classDef coince [^<]*/g, '');
    const a = strip(composeParts(doc, FAKE).html);
    expect(a.length).toBeGreaterThan(1000);
    expect(a).toBe(strip(composeParts(doc, VAUBAN_CHARTE).html));
  });

  it('refuses a charte the compositions cannot use', () => {
    expect(() => assertCharte({ ...FAKE, tokens: { ...FAKE.tokens, '--ds-blue': 'blue' } })).toThrow('hex colour');
    const { '--ds-navy': _omit, ...rest } = FAKE.tokens;
    expect(() => assertCharte({ ...FAKE, tokens: rest })).toThrow('missing token --ds-navy');
    expect(() => assertCharte({ ...FAKE, logo: '<svg viewBox="0 0 1 1"><script>x</script></svg>' })).toThrow('script');
    expect(() => assertCharte({ ...FAKE, tokens: { ...FAKE.tokens, '--ds-space-1': '1px;}body{x:y' } })).toThrow('invalid value');
  });
});
