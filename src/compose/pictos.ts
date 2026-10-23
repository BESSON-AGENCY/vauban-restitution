/**
 * Pictograms of the design system, inlined (assets/pictogrammes). Colours are inherited from the page:
 * the stroke is currentColor, the accent follows --vd-accent.
 */
export const PICTO_IDEE =
  '<path d="M17 31C17 26 10 25 10 17C10 0 38 0 38 17C38 25 31 26 31 31M17 32H31M18 38H30M21 43H27"/>' +
  '<path d="M20 19L24 23L29 16" stroke="var(--vd-accent)"/>';

export function pictogram(inner: string): string {
  return (
    '<svg class="vauban-art" viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" ' +
    'stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    inner +
    '</svg>'
  );
}
