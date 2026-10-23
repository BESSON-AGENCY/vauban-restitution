import type { BlockKind, Diagram, Figure, FlowStep, ListItem, Table } from '../types.js';
import { esc, inline, pad2 } from './html.js';
import { PICTO_IDEE, pictogram } from './pictos.js';

export function paragraph(text: string, lead: boolean): string {
  return `<div class="vd-text"><p${lead ? ' class="vd-text-lead"' : ''}>${inline(text)}</p></div>`;
}

export function pullquote(text: string): string {
  return `<figure class="vd-pullquote"><blockquote><p>${inline(text)}</p></blockquote></figure>`;
}

function figure(f: Figure): string {
  const context = f.context ? `<span>${esc(f.context)}</span>` : '';
  return (
    '<figure class="vd-figure" data-variant="inline"><div class="vd-figure-main"><p class="vd-figure-sentence">' +
    `« ${esc(f.before)}<span class="vd-figure-number"><span class="vd-figure-value">${esc(f.value)}</span>` +
    `<span class="vd-figure-unit">${esc(f.unit)}</span></span> »${context}</p></div></figure>`
  );
}

export function figures(list: Figure[]): string {
  return `<div class="vd-figure-group" data-layout="stack">${list.map(figure).join('')}</div>`;
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
  return `<ol class="vd-journey">${li}</ol>`;
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
    `<div class="vd-diagram" data-mermaid="${d.type}"><pre class="mermaid" hidden>${esc(d.source)}</pre>` +
    `<p class="vd-diagram-fallback">${esc(fallbackText(d))}</p></div>`
  );
}

/** Flowcharts and timelines are drawn here, in the DS compositions; mindmap and journey stay Mermaid. */
export function diagram(d: Diagram): string {
  if (d.type === 'flowchart') return flow(d.steps);
  if (d.type === 'timeline') return timeline(d.events);
  return mermaidBox(d);
}

export function table(kind: BlockKind, t: Table): string {
  const th = t.head.map((h) => `<th scope="col">${inline(h)}</th>`).join('');
  const rows = t.rows
    .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`)
    .join('');
  const inner = `<table data-slot="table"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>`;
  if (kind === 'avant-apres') return `<div class="vd-comparison">${inner}</div>`;
  return `<div class="vd-table"><div class="vd-table-scroll" data-slot="table-container">${inner}</div></div>`;
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
