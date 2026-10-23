import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { fixture, root } from './helpers.js';

let bundle = '';

beforeAll(async () => {
  const out = await build({
    entryPoints: [`${root}/src/browser.ts`],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2019',
    minify: true,
  });
  bundle = out.outputFiles[0]!.text;
});

/** Loads the bundle in a page whose body holds the Markdown script, as the artefact does. */
function page(markdown: string | null, charte?: unknown) {
  const window = new Window({
    settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true },
  });
  const { document } = window;
  document.body.innerHTML =
    markdown === null ? '' : `<script type="text/markdown" id="restitution">${markdown}</script>`;
  if (charte) (window as unknown as { RESTITUTION_CHARTE: unknown }).RESTITUTION_CHARTE = charte;
  window.eval(bundle);
  return { window, document };
}

describe('browser bundle', () => {
  it('reads the Markdown script and composes the pages', () => {
    const { document } = page(fixture('reference.md'));
    expect(document.querySelectorAll('.va-page')).toHaveLength(12);
    expect(document.title).toBe('Vos priorités, vos irritants, ce qui ne va pas');
    expect(document.querySelector('style')!.textContent).toContain('--ds-blue:#0755ff');
    expect(document.querySelector('link[rel=stylesheet]')!.getAttribute('href')).toContain('fonts.googleapis.com');
    expect(document.querySelector('.vd-callout[data-variant=lecture] h3')!.textContent).toBe(
      'Lecture de Vauban, pas vos mots.',
    );
  });

  it('asks for Mermaid 11.12.0 from cdnjs only when a schema needs it', () => {
    const withMap = page(fixture('reference.md'));
    const scripts = [...withMap.document.querySelectorAll('script')].map((s) => s.textContent ?? '');
    expect(scripts.some((t) => t.includes('cdnjs.cloudflare.com/ajax/libs/mermaid/11.12.0/mermaid.min.js'))).toBe(true);
    const plain = page('# T\n23 octobre 2026 · A\n\n## B {recit}\nUn texte.\n');
    expect([...plain.document.querySelectorAll('script')].filter((s) => s.id !== 'restitution')).toHaveLength(0);
    expect(plain.document.querySelectorAll('.va-page')).toHaveLength(2);
  });

  it('keeps the fallback text of a schema that is not drawn', () => {
    const { document } = page(fixture('reference.md'));
    expect(document.querySelector('.vd-diagram[data-mermaid] .vd-diagram-fallback')!.textContent).toContain('Vos cas');
  });

  it('accepts a Markdown indented inside the page', () => {
    const md = fixture('genres.md').split('\n').map((l) => (l ? `    ${l}` : l)).join('\n');
    const { document } = page(md);
    expect(document.querySelectorAll('.va-page').length).toBeGreaterThan(5);
  });

  it('shows the grammar refusals readably', () => {
    const { document } = page('# T\n23 octobre 2026 · A\n\n## B {recit}\nDu <b>html</b>\n');
    expect(document.querySelectorAll('.va-page')).toHaveLength(0);
    const text = document.querySelector('.vr-refusals')!.textContent!;
    expect(text).toContain('ne respecte pas la grammaire');
    expect(text).toContain('ligne 5 : HTML refusé');
  });

  it('says so when the Markdown script is missing', () => {
    const { document } = page(null);
    expect(document.querySelector('.vr-refusals')!.textContent).toContain('Restitution introuvable');
  });

  it('uses the charte of window.RESTITUTION_CHARTE', async () => {
    const { VAUBAN_CHARTE } = await import('../src/charte.js');
    const charte = {
      ...VAUBAN_CHARTE,
      name: 'Acme',
      tokens: { ...VAUBAN_CHARTE.tokens, '--ds-blue': '#c2185b' },
      fonts: { stylesheet: null },
    };
    const { document } = page(fixture('genres.md'), charte);
    expect(document.querySelector('style')!.textContent).toContain('--ds-blue:#c2185b');
    expect(document.querySelector('link[rel=stylesheet]')).toBeNull();
  });
});
