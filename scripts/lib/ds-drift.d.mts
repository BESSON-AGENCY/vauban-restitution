export const DEFAULT_DS_DIR: string;
export const COPIED_CSS: [string, string][];
export function dsAvailable(dsDir: string): boolean;
export function parseTokens(css: string): Record<string, string>;
export function checkDrift(
  dsDir: string,
  charte: { tokens: Readonly<Record<string, string>>; logo: string; motif: string },
): string[];
