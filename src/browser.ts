import { VAUBAN_CHARTE, assertCharte, type Charte } from './charte.js';
import { composeParts } from './compose/index.js';
import { esc } from './compose/html.js';
import { formatRefusal, parse } from './grammar.js';

declare global {
  interface Window {
    /** Optional: a charte object replaces the Vauban one. */
    RESTITUTION_CHARTE?: Charte;
  }
}

/** Removes the indentation shared by every non-blank line (the Markdown is often indented inside the page). */
function dedent(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => /^[ \t]*/.exec(l)![0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(cut)).join('\n');
}

const REFUSAL_CSS =
  'body{margin:0;padding:32px 16px;background:#f5f7fa;font-family:system-ui,sans-serif;color:#001b3e}' +
  '.vr-refusals{max-width:640px;margin:0 auto;line-height:1.5}.vr-refusals li{margin:6px 0}';

function show(css: string, html: string) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  document.body.insertAdjacentHTML('afterbegin', html);
}

function fail(title: string, lines: string[]) {
  show(
    REFUSAL_CSS,
    `<main class="vr-refusals"><h1>${esc(title)}</h1><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></main>`,
  );
}

function run() {
  const source = document.getElementById('restitution');
  if (!source || source.getAttribute('type') !== 'text/markdown') {
    fail('Restitution introuvable', ['Il manque <script type="text/markdown" id="restitution"> avec le Markdown.']);
    return;
  }
  const result = parse(dedent(source.textContent ?? ''));
  if (!result.ok) {
    fail('Cette restitution ne respecte pas la grammaire', result.refusals.map(formatRefusal));
    return;
  }
  const charte = window.RESTITUTION_CHARTE ?? VAUBAN_CHARTE;
  try {
    assertCharte(charte);
  } catch (e) {
    fail('Charte invalide', [e instanceof Error ? e.message : String(e)]);
    return;
  }
  const composed = composeParts(result.document, charte);
  document.title = composed.title;
  if (composed.fontsHref) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = composed.fontsHref;
    document.head.appendChild(link);
  }
  show(composed.css, composed.html);
  if (composed.mermaidScript) {
    const script = document.createElement('script');
    script.textContent = composed.mermaidScript;
    document.body.appendChild(script);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
else run();
