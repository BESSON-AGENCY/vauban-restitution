/** Block kinds of the closed catalogue (see catalogue.ts). */
export type BlockKind =
  | 'recit'
  | 'cas'
  | 'chiffres'
  | 'frise'
  | 'carte'
  | 'journee'
  | 'avant-apres'
  | 'tableau'
  | 'lecture'
  | 'reste';

/** One refusal of the grammar: the faulty line (1-based) and the reason. */
export interface Refusal {
  line: number;
  message: string;
}

/** A figure said in a sentence: « before **value** unit » context. */
export interface Figure {
  line: number;
  before: string;
  value: string;
  unit: string;
  context: string;
}

export interface FlowStep {
  label: string;
  roles: string;
  /** The step the person said gets stuck. */
  stuck: boolean;
}

export interface TimelineEvent {
  when: string;
  what: string[];
}

/** A Mermaid block, read just enough to compose it or to give its fallback text. */
export type Diagram =
  | { type: 'flowchart'; direction: 'TB' | 'LR'; steps: FlowStep[]; source: string }
  | { type: 'timeline'; events: TimelineEvent[]; source: string }
  | { type: 'mindmap'; root: string; branches: string[]; source: string }
  | { type: 'journey'; tasks: string[]; source: string };

export interface Table {
  head: string[];
  rows: string[][];
}

export interface ListItem {
  line: number;
  /** The quoted phrase, with its guillemets. */
  text: string;
  /** The optional parenthesis, with its guillemets. */
  note: string;
}

export type Item =
  | { kind: 'p'; line: number; text: string }
  | { kind: 'quote'; line: number; text: string }
  | { kind: 'figures'; line: number; figures: Figure[] }
  | { kind: 'take'; line: number; text: string }
  | { kind: 'break'; line: number }
  | { kind: 'diagram'; line: number; diagram: Diagram }
  | { kind: 'flow'; line: number; steps: FlowStep[] }
  | { kind: 'table'; line: number; table: Table }
  | { kind: 'list'; line: number; items: ListItem[] };

export interface Case {
  line: number;
  title: string;
  items: Item[];
}

export interface Block {
  line: number;
  kind: BlockKind;
  title: string;
  items: Item[];
  /** Only for `cas`: the `###` cases. */
  cases: Case[];
}

export interface DocumentMeta {
  /** The raw line under the title: « 23 octobre 2026 · Martin ». */
  raw: string;
  date: string;
  iso: string;
  person: string;
}

/** The typed document read from the Markdown. The Markdown stays the source of truth. */
export interface RestitutionDocument {
  title: string;
  meta: DocumentMeta;
  blocks: Block[];
}

export type ParseResult =
  | { ok: true; document: RestitutionDocument; refusals: [] }
  | { ok: false; document: null; refusals: Refusal[] };

/** A block of a model's frame, as pinned by a prompt revision. */
export interface FrameBlock {
  kind: BlockKind;
  title: string;
  options?: { diagram?: 'flowchart' | 'timeline' | 'mindmap' | 'journey' | null; repeat?: number };
}
