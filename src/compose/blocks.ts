import type { BlockKind, Diagram, Figure, FlowStep, ListItem, Table } from '../types.js';
import { esc, inline, pad2 } from './html.js';
import { PICTO_IDEE, pictogram } from './pictos.js';

/** The chapeau of a part: the DS A4 introduction line. */
export function intro(text: string): string {
  return `<p class="va-intro">${inline(text)}</p>`;
}

/** Consecutive paragraphs share one DS text block. */
export function paragraphs(texts: string[]): string {
  return `<div class="vd-text">${texts.map((t) => `<p>${inline(t)}</p>`).join('')}</div>`;
}

/** The DS intertitre, numbered inside a case page. */
export function subheading(number: string | null, title: string): string {
  const n = number ? `<span class="vd-subheading-number">${number}</span>` : '';
  return `<header class="vd-subheading">${n}<div><h3>${esc(title)}</h3></div></header>`;
}

/** The DS reading section: an intertitre and its text. */
export function readingSection(...parts: string[]): string {
  return `<section class="va-reading-section">${parts.join('')}</section>`;
}

export function pullquote(text: string): string {
  return `<figure class="vd-pullquote"><blockquote><p>${inline(text)}</p></blockquote></figure>`;
}

/** A figure said in a sentence is text: the whole line at the chapeau size, the number in the accent. */
function figureLine(f: Figure): string {
  const context = f.context ? ` ${esc(f.context)}` : '';
  return (
    `<p class="va-intro">« ${esc(f.before)}<strong class="vr-figure-number">${esc(f.value)}</strong>` +
    `${f.unit ? ` ${esc(f.unit)}` : ''} »${context}</p>`
  );
}

export function figures(list: Figure[]): string {
  return `<div class="vr-figures">${list.map(figureLine).join('')}</div>`;
}

/** A process drawn by us, one step per line in the order said; the step that gets stuck carries the DS step mark. */
export function flow(steps: FlowStep[]): string {
  const li = steps
    .map((s, i) => {
      const who = s.roles ? `<p>${esc(s.roles)}</p>` : '';
      return (
        `<li${s.stuck ? ' aria-current="step"' : ''}><div class="vd-journey-top">` +
        `<span class="vd-step-number">${pad2(i + 1)}</span></div><h3>${esc(s.label)}</h3>${who}</li>`
      );
    })
    .join('');
  return `<section class="vd-journey-wrap" data-variant="travel"><ol class="vd-journey">${li}</ol></section>`;
}

function timeline(events: { when: string; what: string[] }[]): string {
  const li = events
    .map((e) => {
      const [first, ...rest] = e.what;
      return (
        `<li><time>${esc(e.when)}</time><div><h3>${esc(first ?? '')}</h3>` +
        rest.map((r) => `<p>${esc(r)}</p>`).join('') +
        '</div></li>'
      );
    })
    .join('');
  return `<ol class="vd-timeline">${li}</ol>`;
}

/** The text a Mermaid box shows when it is not drawn (no script, no network, a canvas). */
function fallbackText(d: Diagram): string {
  if (d.type === 'mindmap') return `${d.root} : ${d.branches.join(' ; ')}`;
  if (d.type === 'journey') return d.tasks.join(' → ');
  return '';
}

function mermaidBox(d: Diagram): string {
  return (
    `<div class="vr-diagram" data-mermaid="${d.type}"><pre class="mermaid" hidden>${esc(d.source)}</pre>` +
    `<p class="vr-diagram-fallback">${esc(fallbackText(d))}</p></div>`
  );
}

/** Flowcharts and timelines are drawn here, in the DS compositions; mindmap and journey stay Mermaid. */
export function diagram(d: Diagram): string {
  if (d.type === 'flowchart') return flow(d.steps);
  if (d.type === 'timeline') return timeline(d.events);
  return mermaidBox(d);
}

export function table(kind: BlockKind, t: Table, title: string): string {
  const th = t.head.map((h) => `<th scope="col">${inline(h)}</th>`).join('');
  if (kind === 'avant-apres') {
    const rows = t.rows
      .map(
        (r) =>
          `<tr><th scope="row">${inline(r[0] ?? '')}</th><td data-label="${esc(t.head[1] ?? '')}"><span>${inline(r[1] ?? '')}</span></td></tr>`,
      )
      .join('');
    return `<div class="vd-comparison"><table><caption>${esc(title)}</caption><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  const rows = t.rows
    .map(
      (r) =>
        `<tr>${r.map((c, i) => (i === 0 ? `<th data-slot="table-head" scope="row">${inline(c)}</th>` : `<td data-slot="table-cell" data-kind="text">${inline(c)}</td>`)).join('')}</tr>`,
    )
    .join('');
  const head = t.head.map((h) => `<th data-slot="table-head" scope="col" data-kind="text">${inline(h)}</th>`).join('');
  return (
    `<div class="vd-table" data-variant="reading"><section class="vd-table-scroll" aria-label="${esc(title)}">` +
    `<div data-slot="table-container"><table data-slot="table"><thead data-slot="table-header"><tr>${head}</tr></thead>` +
    `<tbody data-slot="table-body">${rows}</tbody></table></div></section></div>`
  );
}

export function resteList(items: ListItem[]): string {
  const li = items
    .map(
      (it, k) =>
        `<li><span class="vd-step-index" aria-hidden="true">${pad2(k + 1)}</span><div><h3>${inline(it.text)}</h3>` +
        `${it.note ? `<p>${inline(`(${it.note})`)}</p>` : ''}</div></li>`,
    )
    .join('');
  return `<ol class="vd-next-steps">${li}</ol>`;
}

/** The reading of Vauban: the mark is the title, each following paragraph is a point. */
export function reading(paragraphs: string[]): string {
  const [mark = '', ...points] = paragraphs;
  return (
    `<aside class="vd-callout" data-variant="lecture">${pictogram(PICTO_IDEE)}<div><h3>${inline(mark.trimEnd())}</h3><div>` +
    points.map((p) => `<p>${inline(p)}</p>`).join('') +
    '</div></div></aside>'
  );
}

export function takeaway(text: string): string {
  return `<p class="va-takeaway">${inline(text)}</p>`;
}
