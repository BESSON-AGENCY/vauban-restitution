import { assertCharte, type Charte } from '../charte.js';
import { DS_CSS } from '../css.generated.js';
import { RESTITUTION_CSS } from '../css.restitution.js';
import type { Item, RestitutionDocument } from '../types.js';
import * as b from './blocks.js';
import { esc, inline, pad2 } from './html.js';
import { mermaidBootScript } from './mermaid.js';

interface Page {
  heading: string | null;
  label: string | null;
  surface: 'nuit' | null;
  /** Paragraphs are merged into one DS text block when they follow each other. */
  body: ({ p: string } | { html: string } | { sub: string; number: string | null })[];
  take: string | null;
  reading: string[] | null;
  fresh: boolean;
}

export interface Composed {
  title: string;
  lang: 'fr';
  /** Font stylesheet to link, or null. */
  fontsHref: string | null;
  /** All the CSS: charte tokens, then the documentary stylesheets of the design system. */
  css: string;
  /** The pages, as HTML (a hidden logo symbol then `<main>`). */
  html: string;
  /** Script that draws the Mermaid boxes, or null when the document has none. */
  mermaidScript: string | null;
  pageCount: number;
}

export interface ComposeOptions {
  /** Inline the Mermaid script in the full page (default true). */
  mermaid?: boolean;
}

/** `:root{...}` from the charte tokens: the only place colours, spacing and font names enter the CSS. */
export function tokensCss(charte: Charte): string {
  const decl = Object.entries(charte.tokens)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  return `:root{${decl}}`;
}

function logoParts(charte: Charte): { viewBox: string; label: string; inner: string } {
  const m = /^<svg\b([^>]*)>([\s\S]*)<\/svg>$/.exec(charte.logo);
  const viewBox = /\bviewBox="([^"]+)"/.exec(m?.[1] ?? '')?.[1];
  if (!m || !viewBox) throw new Error('charte: logo must be an inline <svg> with a viewBox');
  return { viewBox, label: /\baria-label="([^"]*)"/.exec(m[1]!)?.[1] ?? charte.name, inner: m[2]! };
}

function renderItem(item: Item, blockKind: Parameters<typeof b.table>[0], blockTitle: string, charte: Charte): string {
  switch (item.kind) {
    case 'quote':
      return b.pullquote(item.text);
    case 'figures':
      return b.figures(item.figures);
    case 'diagram':
      return b.diagram(item.diagram, charte);
    case 'flow':
      return b.flow(item.steps);
    case 'table':
      return b.table(blockKind, item.table, blockTitle);
    case 'list':
      return b.resteList(item.items);
    default:
      return '';
  }
}

/**
 * The body of a page in DS order: the chapeau (va-intro) right after the page title, then consecutive
 * paragraphs in one vd-text; on a case page the intertitre and its first paragraphs make a reading section.
 */
function pageBody(p: Page): string {
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length) out.push(b.paragraphs(run));
    run = [];
  };
  let first = p.heading !== null;
  // The section being built: an intertitre and the paragraphs that follow it.
  let section: string | null = null;
  const closeSection = () => {
    if (section === null) return;
    out.push(b.readingSection(section, run.length ? b.paragraphs(run) : ''));
    run = [];
    section = null;
  };
  for (const part of p.body) {
    if ('sub' in part) {
      closeSection();
      flush();
      section = b.subheading(part.number, part.sub);
    } else if ('p' in part) {
      if (first) out.push(b.intro(part.p));
      else run.push(part.p);
    } else {
      if (section !== null) closeSection();
      else flush();
      out.push(part.html);
    }
    first = false;
  }
  if (section !== null) closeSection();
  else flush();
  return out.join('');
}

/** Composes the typed document with a charte. The compositions read only the charte and the DS classes. */
export function composeParts(doc: RestitutionDocument, charte: Charte): Composed {
  assertCharte(charte);
  const logo = logoParts(charte);
  const pages: Page[] = [];
  let pg!: Page;
  const newPage = (heading: string | null, surface: 'nuit' | null = null, label: string | null = heading) => {
    pg = { heading, label, surface, body: [], take: null, reading: null, fresh: heading !== null };
    pages.push(pg);
  };

  for (const block of doc.blocks) {
    newPage(block.title, block.kind === 'reste' ? 'nuit' : null);
    if (block.kind === 'lecture') pg.reading = [];
    const feed = (items: Item[]) => {
      for (const item of items) {
        if (item.kind === 'break') {
          newPage(null);
          continue;
        }
        if (item.kind === 'take') {
          pg.take = item.text;
          continue;
        }
        if (pg.reading !== null) {
          if (item.kind === 'p') pg.reading.push(item.text);
          continue;
        }
        if (item.kind === 'p') pg.body.push({ p: item.text });
        else pg.body.push({ html: renderItem(item, block.kind, block.title, charte) });
      }
    };
    feed(block.items);
    block.cases.forEach((c, k) => {
      // A case has its own page; a section of a recit stays on the page of its part.
      // A block with nothing before its first case has no page of its own: its title heads the first case page.
      const headsFirstCase = k === 0 && pg.body.length === 0 && pg.take === null && pg.reading === null;
      if (block.kind === 'cas' && !headsFirstCase) newPage(null, null, c.title);
      pg.body.push({ sub: c.title, number: block.kind === 'cas' ? pad2(k + 1) : null });
      feed(c.items);
    });
  }

  const total = pages.length + 1;
  const T = esc(doc.title);
  const brand = (id: string) =>
    `<svg class="vd-brand" viewBox="${esc(logo.viewBox)}" role="img" aria-label="${esc(logo.label)}"><use href="#${id}"/></svg>`;
  /** The DS A4 page: signature header, content, numbered footer. The cover has the same chrome. */
  const frame = (n: number, label: string, surface: string | null, content: string) =>
    `<article class="vd-document va-page" data-format="a4"${surface ? ` data-surface="${surface}"` : ''} aria-label="${esc(label)}">` +
    `<header class="va-page-header">${brand(surface === 'nuit' ? 'vr-logo-inverse' : 'vr-logo')}<span>${T}</span></header>` +
    `<div class="va-page-content"><div class="va-composition">${content}</div></div>` +
    `<footer class="va-page-footer"><span>${esc(doc.meta.raw)}</span><span>${pad2(n)} / ${pad2(total)}</span></footer></article>`;
  const cover = frame(
    1,
    doc.title,
    null,
    `<div class="va-cover">${doc.meta.forLine ? `<p class="va-cover-for">Pour ${esc(doc.meta.forLine)}</p>` : ''}<h2>${T}</h2>` +
      `${doc.meta.objective ? `<p class="va-cover-subtitle">${inline(doc.meta.objective)}</p>` : ''}<div class="va-cover-art" aria-hidden="true">${charte.motif}</div><p class="va-cover-meta">` +
      `<time datetime="${doc.meta.iso}">${esc(doc.meta.date)}</time>${doc.meta.person ? `<span>${esc(doc.meta.person)}</span>` : ''}</p></div>`,
  );
  const arts = pages.map((p, idx) => {
    let body = p.heading ? `<header class="vd-heading"><h2>${inline(p.heading)}</h2></header>` : '';
    body += pageBody(p);
    if (p.reading !== null) body += b.reading(p.reading);
    if (p.take) body += b.takeaway(p.take);
    return frame(idx + 2, p.label ?? `Page ${idx + 2}`, p.surface, body);
  });

  const symbol = (id: string, svg: string) => {
    const parts = logoParts({ ...charte, logo: svg });
    return `<symbol id="${id}" viewBox="${esc(parts.viewBox)}">${parts.inner}</symbol>`;
  };
  const html =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' +
    symbol('vr-logo', charte.logo) +
    symbol('vr-logo-inverse', charte.logoInverse ?? charte.logo) +
    '</svg>' +
    `<main class="vr-restitution">${cover}${arts.join('')}</main>`;
  const hasMermaid = html.includes('data-mermaid="');
  return {
    title: doc.title,
    lang: 'fr',
    fontsHref: charte.fonts.stylesheet,
    css: tokensCss(charte) + DS_CSS + RESTITUTION_CSS,
    html,
    mermaidScript: hasMermaid ? mermaidBootScript(charte) : null,
    pageCount: total,
  };
}

/** Composes a full standalone HTML page. */
export function compose(doc: RestitutionDocument, charte: Charte, options: ComposeOptions = {}): string {
  const c = composeParts(doc, charte);
  const fonts = c.fontsHref ? `<link rel="stylesheet" href="${esc(c.fontsHref)}">` : '';
  const script = c.mermaidScript && options.mermaid !== false ? `<script>${c.mermaidScript}</script>` : '';
  return (
    `<!doctype html>\n<html lang="${c.lang}">\n<head>\n<meta charset="utf-8">\n` +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    `<title>${esc(c.title)}</title>\n${fonts}\n<style>\n${c.css}\n</style>\n</head>\n<body>\n${c.html}\n${script}\n</body>\n</html>\n`
  );
}
