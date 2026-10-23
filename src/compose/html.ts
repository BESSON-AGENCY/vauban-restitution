/** Escapes text for an HTML text node or a double-quoted attribute. */
export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The only inline marks of the grammar: **bold** and *italic*. Everything else is text. */
export function inline(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
