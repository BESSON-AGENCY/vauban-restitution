import type { Charte } from '../charte.js';

export const MERMAID_VERSION = '11.12.0';
export const MERMAID_URL = `https://cdnjs.cloudflare.com/ajax/libs/mermaid/${MERMAID_VERSION}/mermaid.min.js`;
/**
 * Subresource integrity of the exact file above. Computed by scripts/sri.mjs (sha384 of the downloaded
 * file; the sha512 matches the one cdnjs publishes) and recomputed by test/sri.test.ts.
 */
export const MERMAID_INTEGRITY = 'sha384-o+g/BxPwhi0C3RK7oQBxQuNimeafQ3GE/ST4iT2BxVI4Wzt60SH4pq9iXVYujjaS';

/** Mermaid theme variables, all taken from the charte tokens. */
export function mermaidTheme(charte: Charte): Record<string, string> {
  const t = charte.tokens;
  const ink = t['--ds-navy']!;
  const accent = t['--ds-blue']!;
  const soft = t['--ds-mist']!;
  const line = t['--ds-silver']!;
  const paper = t['--ds-white']!;
  const vars: Record<string, string> = {
    fontFamily: t['--ds-font-body']!,
    fontSize: '16px',
    background: paper,
    primaryColor: paper,
    primaryTextColor: ink,
    primaryBorderColor: line,
    nodeBorder: line,
    lineColor: accent,
    secondaryColor: soft,
    tertiaryColor: soft,
    clusterBkg: soft,
    clusterBorder: line,
    textColor: ink,
    edgeLabelBackground: paper,
  };
  for (let k = 0; k < 12; k++) {
    vars[`cScale${k}`] = soft;
    vars[`cScaleLabel${k}`] = ink;
    vars[`cScalePeer${k}`] = accent;
    vars[`cScaleInv${k}`] = accent;
  }
  return vars;
}

/**
 * The script that draws the Mermaid boxes (mindmap, journey) once the library is loaded from the CDN.
 * Without it, or if it fails, the fallback text of each box stays on the page.
 * Plain ES5 text: it is inlined as is in a full page, and injected by the browser loader.
 */
export function mermaidBootScript(charte: Charte): string {
  const cfg = JSON.stringify({ url: MERMAID_URL, integrity: MERMAID_INTEGRITY, theme: mermaidTheme(charte) }).replace(/</g, '\\u003c');
  return (
    '(function(c){var boxes=document.querySelectorAll(".vr-diagram[data-mermaid]");if(!boxes.length)return;' +
    'var s=document.createElement("script");s.integrity=c.integrity;s.crossOrigin="anonymous";s.src=c.url;s.async=true;' +
    's.onload=function(){var M=window.mermaid;if(!M)return;' +
    'M.initialize({startOnLoad:false,theme:"base",securityLevel:"strict",themeVariables:c.theme});' +
    '(document.fonts?document.fonts.ready:Promise.resolve()).then(function(){' +
    'Array.prototype.forEach.call(boxes,function(box,n){var pre=box.querySelector("pre.mermaid");if(!pre)return;' +
    'var id="vr-m"+n;' +
    'M.render(id,pre.textContent.trim()).then(function(r){box.innerHTML=r.svg;box.removeAttribute("data-mermaid")})' +
    '.catch(function(){var e=document.getElementById("d"+id);if(e)e.remove()})})})};' +
    'document.head.appendChild(s)})(' +
    cfg +
    ');'
  );
}
