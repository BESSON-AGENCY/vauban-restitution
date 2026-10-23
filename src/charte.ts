/**
 * A charte is data: the composition engine knows no colour, font, logo or motif of its own.
 * Compositions read only what is here (as CSS custom properties) and the design system classes.
 */
export interface Charte {
  name: string;
  /** An inline SVG with a viewBox, drawn with currentColor, labelled for assistive technology. */
  logo: string;
  /** The stylesheet that provides the font of `--ds-font-body`; null when the system font is enough. */
  fonts: { stylesheet: string | null };
  /** CSS custom properties of the design system (`--ds-*`), name to value. */
  tokens: Readonly<Record<string, string>>;
  /** The cover motif, an inline SVG drawn with the accent colour classes of the design system. */
  motif: string;
}

/** The tokens the document compositions read. A charte without one of them is refused. */
export const REQUIRED_TOKENS = [
  '--ds-font-body',
  '--ds-weight-body',
  '--ds-white',
  '--ds-cloud',
  '--ds-mist',
  '--ds-slate',
  '--ds-navy',
  '--ds-blue',
  '--ds-silver',
  '--ds-radius-field',
  '--ds-space-1',
  '--ds-space-2',
  '--ds-space-3',
  '--ds-space-4',
  '--ds-space-6',
  '--ds-space-8',
  '--ds-space-12',
] as const;

const COLOUR_TOKENS = ['--ds-white', '--ds-cloud', '--ds-mist', '--ds-slate', '--ds-navy', '--ds-blue', '--ds-silver'];
const HEX = /^#[0-9a-fA-F]{3,8}$/;

/** Throws on a charte the compositions cannot use: fail-fast, before any HTML is produced. */
export function assertCharte(charte: Charte): void {
  if (!charte.name.trim()) throw new Error('charte: name is empty');
  for (const key of REQUIRED_TOKENS) {
    if (!charte.tokens[key]) throw new Error(`charte: missing token ${key}`);
  }
  for (const key of COLOUR_TOKENS) {
    if (!HEX.test(charte.tokens[key]!)) throw new Error(`charte: ${key} must be a hex colour`);
  }
  for (const [key, value] of Object.entries(charte.tokens)) {
    if (!/^--[\w-]+$/.test(key)) throw new Error(`charte: invalid token name ${key}`);
    if (/[{};<]/.test(value)) throw new Error(`charte: invalid value for ${key}`);
  }
  if (!/^<svg\b[^>]*\bviewBox="[^"]+"[^>]*>[\s\S]*<\/svg>$/.test(charte.logo))
    throw new Error('charte: logo must be an inline <svg> with a viewBox');
  if (/<script|\son\w+=/i.test(charte.logo + charte.motif)) throw new Error('charte: logo and motif must not carry script');
}

export const VAUBAN_CHARTE: Charte = {
  name: 'Vauban',
  logo:
    "<svg viewBox=\"-4 -4 708 174.3\" role=\"img\" aria-label=\"Vauban\"><g fill=\"currentColor\"><path d=\"M0 0H38.4L115.2 133.0215L96 166.27688L0 0Z\"/><path d=\"M45.79009 0H84.19009L115.69504 54.56819H77.29504L45.79009 0Z\"/><path d=\"M153.6 0H192L160.49504 54.56819H122.09504L153.6 0Z\"/><path d=\"M80.99009 60.96819H156.8L118.89504 126.6215L80.99009 60.96819Z\"/><g fill-rule=\"evenodd\"><path d=\"M226 71H252V165H226V155C218 163 208 168 196 168C170 168 150 147 150 118C150 89 170 68 196 68C208 68 218 73 226 81V71ZM224.5 118C224.5 104.469 213.531 93.5 200 93.5C186.469 93.5 175.5 104.469 175.5 118C175.5 131.531 186.469 142.5 200 142.5C213.531 142.5 224.5 131.531 224.5 118Z\"/><path d=\"M265 71H292V124C292 137.5 298.5 144 310 144C324 144 333 135.5 333 121V71H360V165H334V154C327 163 316.5 168 304 168C279 168 265 151 265 126V71Z\"/><path d=\"M374 24H401V81C409 73 419 68 431 68C457 68 477 89 477 118C477 147 457 168 431 168C419 168 409 163 401 155V165H374V24ZM451.5 118C451.5 104.469 440.531 93.5 427 93.5C413.469 93.5 402.5 104.469 402.5 118C402.5 131.531 413.469 142.5 427 142.5C440.531 142.5 451.5 131.531 451.5 118Z\"/><path d=\"M566 71H592V165H566V155C558 163 548 168 536 168C510 168 490 147 490 118C490 89 510 68 536 68C548 68 558 73 566 81V71ZM564.5 118C564.5 104.469 553.531 93.5 540 93.5C526.469 93.5 515.5 104.469 515.5 118C515.5 131.531 526.469 142.5 540 142.5C553.531 142.5 564.5 131.531 564.5 118Z\"/><path d=\"M700 165H673V112C673 98.5 666.5 92 655 92C641 92 632 100.5 632 115V165H605V71H631V82C638 73 648.5 68 661 68C686 68 700 85 700 110V165Z\"/></g></g></svg>",
  fonts: { stylesheet: 'https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,400..700;1,400..500&display=swap' },
  tokens: {
    '--ds-font-body': "'Jost', 'Segoe UI', Arial, sans-serif",
    '--ds-weight-body': "420",
    '--ds-h1-weight': "700",
    '--ds-white': "#ffffff",
    '--ds-cloud': "#f5f7fa",
    '--ds-mist': "#eaf0f8",
    '--ds-slate': "#59677a",
    '--ds-navy': "#001b3e",
    '--ds-blue': "#0755ff",
    '--ds-blue-dark': "#0643cc",
    '--ds-silver': "#d9e0e9",
    '--ds-green': "#146341",
    '--ds-green-soft': "#e9f6ee",
    '--ds-amber': "#845200",
    '--ds-amber-soft': "#fff4d9",
    '--ds-red': "#a32638",
    '--ds-red-soft': "#fcecef",
    '--ds-paper': "var(--ds-cloud)",
    '--ds-surface': "var(--ds-white)",
    '--ds-ink': "var(--ds-navy)",
    '--ds-muted': "var(--ds-slate)",
    '--ds-line': "var(--ds-silver)",
    '--ds-brand': "var(--ds-blue)",
    '--ds-brand-hover': "var(--ds-blue-dark)",
    '--ds-on-brand': "var(--ds-white)",
    '--ds-soft': "var(--ds-mist)",
    '--ds-success': "var(--ds-green)",
    '--ds-success-bg': "var(--ds-green-soft)",
    '--ds-pending': "var(--ds-amber)",
    '--ds-pending-bg': "var(--ds-amber-soft)",
    '--ds-error': "var(--ds-red)",
    '--ds-error-bg': "var(--ds-red-soft)",
    '--ds-radius-field': "16px",
    '--ds-radius-card': "28px",
    '--ds-radius-stage': "40px",
    '--ds-radius-pill': "999px",
    '--ds-space-1': "4px",
    '--ds-space-2': "8px",
    '--ds-space-3': "12px",
    '--ds-space-4': "16px",
    '--ds-space-6': "24px",
    '--ds-space-8': "32px",
    '--ds-space-12': "48px",
    '--ds-space-16': "64px",
    '--ds-duration': "180ms",
    '--ds-easing': "cubic-bezier(0.2, 0.8, 0.2, 1)",
    '--ds-shadow': "0 12px 40px #001b3e09",
    '--ds-auth-column': "480px",
  },
  motif:
    "<svg class=\"vd-motif\" viewBox=\"0 0 480 480\" fill=\"none\"><path class=\"vd-motif-fill\" d=\"M100 430V204a140 140 0 0 1 280 0v226h-58V204a82 82 0 0 0-164 0v226Z\"/><path class=\"vd-motif-stroke\" d=\"M44 430V204a196 196 0 0 1 392 0v226M190 430V216a50 50 0 0 1 100 0v214\"/></svg>",
};
