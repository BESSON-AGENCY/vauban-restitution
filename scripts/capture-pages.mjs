// Captures A4 pages of a URL by element, into PNG files (dev tool, uses headless Chrome over CDP).
// Usage: node scripts/capture-pages.mjs <url> <outDir> <prefix> [selectorOrIndexList]
//   list: comma-separated data-page ids or 0-based indexes of article.va-page elements (default: all)
import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const [url, outDir, prefix, list] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const b = await launch(9334, 1000, 1400);
await b.setSize(1000, 1400);
await b.goto(url, 5000);
const info = await b.evaluate(`[...document.querySelectorAll('article.va-page')].map((a, i) => {
  a.scrollIntoView(); const r = a.getBoundingClientRect();
  return { i, id: a.dataset.page || '', x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
})`);
const want = list ? list.split(',') : info.map((p) => String(p.i));
for (const w of want) {
  const p = info.find((p) => p.id === w || String(p.i) === w);
  if (!p) { console.error(`no page ${w}`); continue; }
  const file = `${outDir}/${prefix}-${String(p.i).padStart(2, '0')}${p.id ? '-' + p.id : ''}.png`;
  await b.shot({ x: p.x, y: p.y, width: p.w, height: p.h }, file);
  console.log(file);
}
b.close();
