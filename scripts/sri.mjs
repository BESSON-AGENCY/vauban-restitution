// Computes the SRI hash (sha384) of the exact Mermaid file the engine loads from cdnjs.
// Usage: node scripts/sri.mjs        prints the value to put in src/compose/mermaid.ts
import { createHash } from 'node:crypto';

export const MERMAID_VERSION = '11.12.0';
export const MERMAID_URL = `https://cdnjs.cloudflare.com/ajax/libs/mermaid/${MERMAID_VERSION}/mermaid.min.js`;

export async function mermaidIntegrity() {
  const res = await fetch(MERMAID_URL);
  if (!res.ok) throw new Error(`${MERMAID_URL}: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  return `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(await mermaidIntegrity());
