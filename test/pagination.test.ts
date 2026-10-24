import { Window, type Element, type HTMLElement, type Document } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { VAUBAN_CHARTE } from '../src/charte.js';
import { composeParts } from '../src/compose/index.js';
import { parseOk } from './helpers.js';

/** Happy DOM has no layout. These measured boxes exercise page cuts; real font/SVG layout is checked in the browser. */
async function paginate(markdown: string, tallText = new Map<string, number>(), diagramHeight = 400) {
  const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true } });
  const { document } = window;
  const composed = composeParts(parseOk(markdown), { ...VAUBAN_CHARTE, fonts: { stylesheet: null } });
  document.body.innerHTML = composed.html;
  document.querySelectorAll('.va-page').forEach((p) => { (p as unknown as HTMLElement).style.minHeight = '1123px'; });
  // Already drawn diagrams: this test controls their measured dimensions, not the Mermaid renderer.
  document.querySelectorAll('[data-mermaid]').forEach((p) => p.removeAttribute('data-mermaid'));
  const gap = 28;
  function height(el: Element): number {
    if (el.matches('.va-page')) return Math.max(1123, height(el.querySelector('.va-composition')!) + 200);
    if (el.matches('.va-cover')) return 400;
    if (el.matches('.vd-heading')) return 60;
    if (el.matches('.vd-subheading')) return 40;
    if (el.matches('.vr-diagram')) return diagramHeight;
    if (el.matches('.vd-journey > li')) return 120;
    if (el.matches('p,h3,tr')) return tallText.get(el.textContent ?? '') ?? 80;
    const children = [...el.children];
    return children.reduce((sum, child) => sum + height(child), 0) + Math.max(0, children.length - 1) * (el.matches('.vd-journey') ? 0 : gap);
  }
  function top(el: Element): number {
    if (el.matches('.va-page')) {
      const pages = [...document.querySelectorAll('.va-page')];
      return pages.slice(0, pages.indexOf(el)).reduce((sum, page) => sum + height(page) + 32, 0);
    }
    if (el.matches('.va-composition')) return top(el.closest('.va-page')!) + 100;
    const parent = el.parentElement!;
    const children = [...parent.children];
    return top(parent) + children.slice(0, children.indexOf(el)).reduce((sum, child) => sum + height(child) + (parent.matches('.vd-journey') ? 0 : gap), 0);
  }
  Object.defineProperty(window.HTMLElement.prototype, 'getBoundingClientRect', { configurable: true, value: function (this: Element) {
    const y = top(this), h = height(this);
    return { x: 0, y, top: y, bottom: y + h, left: 0, right: 674, width: 674, height: h };
  } });
  Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { configurable: true, get: function (this: Element) { return height(this); } });
  window.eval(composed.script);
  for (let i = 0; i < 20 && !document.documentElement.hasAttribute('data-vr-ready'); i++) await Promise.resolve();
  expect(document.documentElement.getAttribute('data-vr-ready')).toBe('1');
  return { window, document, script: composed.script };
}

const wrap = (body: string) => '# Pagination\n24 octobre 2026 · Test\n\n' + body;
const pagesOf = (document: Document) => [...document.querySelectorAll('article.va-page')];

describe('content pagination with measured boxes (VBA-3223)', () => {
  it('shares a page between short sections and the night closing block, after an isolated cover', async () => {
    const { document } = await paginate(wrap('## First {recit}\nOne.\n\n## Second {recit}\nTwo.\n\n## Ce que nous n\'avons pas abordé {reste}\n- « Later. »\n'));
    const pages = pagesOf(document);
    expect(pages).toHaveLength(2);
    expect(pages[0]!.querySelector('.vr-section')).toBeNull();
    expect(pages[1]!.textContent).toContain('First');
    expect(pages[1]!.textContent).toContain('Second');
    expect(pages[1]!.querySelector('.vr-section[data-surface=nuit]')).not.toBeNull();
  });

  it('keeps a title and its first case with the diagram when they fit the following page', async () => {
    const { document } = await paginate(wrap('## Before {recit}\nPrelude.\n\n## Cases {cas}\n### Last case\nCase text.\n```mermaid\nflowchart TB\n A["one"] --> B["two"]\n```\n'), new Map([['Prelude.', 450]]));
    const pages = pagesOf(document);
    expect(pages).toHaveLength(3);
    expect(pages[1]!.textContent).not.toContain('Cases');
    expect(pages[2]!.querySelector('h2')!.textContent).toBe('Cases');
    expect(pages[2]!.querySelector('h3')!.textContent).toBe('Last case');
    expect(pages[2]!.querySelector('.vr-diagram')).not.toBeNull();
  });

  it('continues a long section without losing, duplicating or reordering paragraphs', async () => {
    const paragraphs = Array.from({ length: 22 }, (_, i) => `Paragraph ${i}.`);
    const { document, window, script } = await paginate(wrap('## Long {recit}\n' + paragraphs.join('\n\n') + '\n\n## After {recit}\nThe end.\n'));
    expect(pagesOf(document).length).toBeGreaterThan(3);
    const actual = [...document.querySelectorAll('.vr-section p')].map((p) => p.textContent);
    expect(actual).toEqual([...paragraphs, 'The end.']);
    const before = document.body.innerHTML;
    window.eval(script);
    await Promise.resolve();
    expect(document.body.innerHTML).toBe(before);
    const pages = pagesOf(document);
    pages.forEach((p, i) => expect(p.querySelector('.va-page-footer span:last-child')!.textContent).toBe(`${String(i + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`));
  });

  it('keeps a nested section title with its first paragraph across a page boundary', async () => {
    const { document } = await paginate(wrap('## Before {recit}\nPrelude.\n\n## Narrative {recit}\n### Inside\nFirst.\n\nSecond.\n'), new Map([['Prelude.', 700]]));
    const pages = pagesOf(document);
    expect(pages[1]!.textContent).not.toContain('Narrative');
    expect(pages[2]!.textContent).toContain('Narrative');
    expect(pages[2]!.textContent).toContain('Inside');
    expect(pages[2]!.textContent).toContain('First.');
  });

  it('keeps a nested title with the following pull quote when its wrapper contains only the title', async () => {
    const { document } = await paginate(wrap('## Narrative {recit}\nPrelude.\n\n### Quoted argument\n> « The words that support it. »\n\nFollowing paragraph.\n'), new Map([['Prelude.', 700]]));
    const pages = pagesOf(document);
    expect(pages[1]!.textContent).not.toContain('Quoted argument');
    expect(pages[2]!.querySelector('h3')!.textContent).toBe('Quoted argument');
    expect(pages[2]!.querySelector('.vd-pullquote')!.textContent).toBe('« The words that support it. »');
    expect([...document.querySelectorAll('.vr-section p')].map((p) => p.textContent)).toEqual([
      'Prelude.', '« The words that support it. »', 'Following paragraph.',
    ]);
    expect(document.querySelector('[data-vr-overflow]')).toBeNull();
  });

  it('reserves the parent heading when a long case body would fit only without that heading', async () => {
    const paragraphs = ['First case paragraph.', 'Second case paragraph.', 'Third case paragraph.', 'Fourth case paragraph.'];
    const { document } = await paginate(wrap('## Summary {recit}\nOpening.\n\n**Takeaway.**\n\n## Cases {cas}\n### Long case\n' + paragraphs.join('\n\n') + '\n'),
      new Map([['Opening.', 740], ['Takeaway.', 90], ...paragraphs.map((text, i) => [text, [120, 170, 250, 200][i]!] as [string, number])]));
    expect(document.querySelector('[data-vr-overflow]')).toBeNull();
    const takeawayPage = pagesOf(document).find((page) => page.querySelector('.va-takeaway'))!;
    expect(takeawayPage.textContent).toContain('Cases');
    expect(takeawayPage.textContent).toContain('Long case');
    expect(takeawayPage.textContent).toContain(paragraphs[0]);
    expect([...document.querySelectorAll('.vr-section p')].map((p) => p.textContent)).toEqual(['Opening.', 'Takeaway.', ...paragraphs]);
  });

  it('splits a textual flow between steps instead of isolating the whole flow after its case', async () => {
    const steps = Array.from({ length: 8 }, (_, i) => `Step ${i} (Role ${i})`);
    const { document } = await paginate(wrap('## Cases {cas}\n### A case\nCase narrative.\n\n' + steps.join(' → ') + '\n'), new Map([['Case narrative.', 450]]));
    expect(document.querySelector('[data-vr-overflow]')).toBeNull();
    const casePage = pagesOf(document).find((page) => page.textContent?.includes('Case narrative.'))!;
    expect(casePage.querySelector('.vd-journey li')).not.toBeNull();
    expect(document.querySelectorAll('.vd-journey')).toHaveLength(2);
    expect([...document.querySelectorAll('.vd-journey li h3')].map((h) => h.textContent)).toEqual(steps.map((_, i) => `Step ${i}`));
    expect([...document.querySelectorAll('.vd-step-number')].map((n) => n.textContent)).toEqual(steps.map((_, i) => String(i + 1).padStart(2, '0')));
  });

  it.each([[105, 158, 237, 185], [95, 95, 400, 350]])('keeps the final two case paragraphs together before an indivisible diagram (%j)', async (...heights) => {
    const paragraphs = ['First case paragraph.', 'Second case paragraph.', 'Third case paragraph.', 'Fourth case paragraph.'];
    const { document } = await paginate(wrap('## Summary {recit}\nOpening.\n\n**Takeaway.**\n\n## Cases {cas}\n### Long case\n' + paragraphs.join('\n\n') + '\n```mermaid\nflowchart TB\n A["one"] --> B["two"]\n```\n'),
      new Map([['Opening.', 740], ['Takeaway.', 90], ...paragraphs.map((text, i) => [text, heights[i]!] as [string, number])]), 760);
    const lastTextPage = pagesOf(document).find((page) => [...page.querySelectorAll('p')].some((p) => p.textContent === paragraphs[3]))!;
    expect(lastTextPage.textContent).toContain(paragraphs[2]);
    expect(document.querySelector('[data-vr-overflow]')).toBeNull();
    expect([...document.querySelectorAll('.vr-section p')].filter((p) => p.closest('.vr-diagram') === null).map((p) => p.textContent)).toEqual(['Opening.', 'Takeaway.', ...paragraphs]);
    expect(document.querySelectorAll('.vr-diagram')).toHaveLength(1);
  });

  it('continues beyond forty pages and assigns each continuation a distinct accessible label', async () => {
    const paragraphs = Array.from({ length: 43 }, (_, i) => `Tall paragraph ${i}.`);
    const { document } = await paginate(wrap('## Very long {recit}\n' + paragraphs.join('\n\n') + '\n'), new Map(paragraphs.map((p) => [p, 650])));
    const pages = pagesOf(document);
    expect(pages).toHaveLength(44);
    expect([...document.querySelectorAll('.vr-section p')].map((p) => p.textContent)).toEqual(paragraphs);
    expect(new Set(pages.map((p) => p.getAttribute('aria-label'))).size).toBe(pages.length);
    expect(document.querySelector('[data-vr-overflow]')).toBeNull();
  });

  it('reports an indivisible oversized paragraph while still continuing the following content', async () => {
    const { document } = await paginate(wrap('## Large {recit}\nOversized.\n\nFollowing one.\n\nFollowing two.\n'), new Map([['Oversized.', 1300]]));
    const pages = pagesOf(document);
    expect(pages[1]!.hasAttribute('data-vr-overflow')).toBe(true);
    expect(pages[1]!.querySelector('h2')!.textContent).toBe('Large');
    expect(pages[1]!.textContent).toContain('Oversized.');
    expect(pages[2]!.textContent).toContain('Following one.');
    expect(pages[2]!.textContent).toContain('Following two.');
    expect(document.querySelectorAll('.vr-section p')).toHaveLength(3);
  });

  it('does not emit an empty continuation for a sole oversized unit', async () => {
    const { document } = await paginate(wrap('## Large {recit}\nOversized.\n'), new Map([['Oversized.', 1300]]));
    expect(pagesOf(document)).toHaveLength(2);
    expect(pagesOf(document)[1]!.hasAttribute('data-vr-overflow')).toBe(true);
    expect(document.querySelectorAll('.vr-section p')).toHaveLength(1);
  });

  it('keeps the night surface on each continuation of a long closing list', async () => {
    const items = Array.from({ length: 14 }, (_, i) => `- « Subject ${i}. »`);
    const { document } = await paginate(wrap("## Ce que nous n'avons pas abordé {reste}\n" + items.join('\n') + '\n'));
    const sections = [...document.querySelectorAll('.vr-section')];
    expect(sections.length).toBeGreaterThan(1);
    expect(sections.every((s) => s.getAttribute('data-surface') === 'nuit')).toBe(true);
    expect([...document.querySelectorAll('ol.vd-next-steps li h3')].map((h) => h.textContent)).toEqual(items.map((_, i) => `« Subject ${i}. »`));
  });

  it('repeats a split table header without repeating or losing its data rows', async () => {
    const rows = Array.from({ length: 18 }, (_, i) => `| Entry ${i} | Value ${i} |`);
    const { document } = await paginate(wrap('## Table {tableau}\n| Entry | Value |\n|---|---|\n' + rows.join('\n') + '\n'));
    const tables = [...document.querySelectorAll('.vr-section table')];
    expect(tables.length).toBeGreaterThan(1);
    expect(tables.every((t) => t.querySelector('thead')?.textContent === 'EntryValue')).toBe(true);
    expect([...document.querySelectorAll('tbody tr')].map((r) => r.textContent)).toEqual(rows.map((_, i) => `Entry ${i}Value ${i}`));
  });

  it('honors an explicit break even when both sides would fit together', async () => {
    const { document } = await paginate(wrap('## First {recit}\nBefore.\n\n---\n\nAfter.\n\n## Second {recit}\nFinal.\n'));
    const pages = pagesOf(document);
    expect(pages).toHaveLength(3);
    expect(pages[1]!.textContent).toContain('Before.');
    expect(pages[1]!.textContent).not.toContain('After.');
    expect(pages[2]!.textContent).toContain('After.');
    expect(pages[2]!.textContent).toContain('Final.');
  });
});
