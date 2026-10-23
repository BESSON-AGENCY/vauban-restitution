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
  body: string[];
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

function renderItem(item: Item, blockKind: Parameters<typeof b.table>[0], first: boolean): string {
  switch (item.kind) {
    case 'p':
      return b.paragraph(item.text, first);
    case 'quote':
      return b.pullquote(item.text);
    case 'figures':
      return b.figures(item.figures);
    case 'diagram':
      return b.diagram(item.diagram);
    case 'flow':
      return b.flow(item.steps);
    case 'table':
      return b.table(blockKind, item.table);
    case 'list':
      return b.resteList(item.items);
    default:
      return '';
  }
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
        pg.body.push(renderItem(item, block.kind, pg.fresh && item.kind === 'p'));
        pg.fresh = false;
      }
    };
    feed(block.items);
    block.cases.forEach((c, k) => {
      newPage(null, null, c.title);
      pg.body.push(
        `<div class="vd-subheading"><span class="vd-subheading-number">${pad2(k + 1)}</span><h3>${esc(c.title)}</h3></div>`,
      );
      feed(c.items);
    });
  }

  const total = pages.length + 1;
  const T = esc(doc.title);
  const brand = `<svg class="vd-brand" viewBox="${esc(logo.viewBox)}" role="img" aria-label="${esc(logo.label)}"><use href="#vr-logo"/></svg>`;
  const cover =
    `<article class="vd-document va-page" data-format="a4" aria-label="${T}"><div class="va-cover"><h1>${T}</h1>` +
    `<div class="va-cover-art" aria-hidden="true">${charte.motif}</div><p class="va-cover-meta">` +
    `<time datetime="${doc.meta.iso}">${esc(doc.meta.date)}</time><span>${esc(doc.meta.person)}</span></p></div></article>`;
  const arts = pages.map((p, idx) => {
    const n = idx + 2;
    let body = p.heading ? `<header class="vd-heading"><h2>${inline(p.heading)}</h2></header>` : '';
    body += p.body.join('');
    if (p.reading !== null) body += b.reading(p.reading);
    if (p.take) body += b.takeaway(p.take);
    const surface = p.surface ? ` data-surface="${p.surface}"` : '';
    return (
      `<article class="vd-document va-page" data-format="a4"${surface} aria-label="${esc(p.label ?? `Page ${n}`)}">` +
      `<header class="va-page-header">${brand}<span>${T}</span></header>` +
      `<div class="va-page-content"><div class="va-composition">${body}</div></div>` +
      `<footer class="va-page-footer"><span>${esc(doc.meta.raw)}</span><span>${pad2(n)} / ${pad2(total)}</span></footer></article>`
    );
  });

  const html =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' +
    `<symbol id="vr-logo" viewBox="${esc(logo.viewBox)}">${logo.inner}</symbol></svg>` +
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
