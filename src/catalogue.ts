import type { BlockKind } from './types.js';

export type ItemKind =
  | 'p'
  | 'quote'
  | 'figures'
  | 'take'
  | 'break'
  | 'list'
  | 'table'
  | 'flow'
  | 'flowchart'
  | 'timeline'
  | 'mindmap'
  | 'journey';

export interface BlockSpec {
  kind: BlockKind;
  /** What the block carries, in the words the guide uses. */
  carries: string;
  /** The closed set of structures the block accepts (for `cas`: before the first ###, see CASE_ACCEPTS). */
  accepts: readonly ItemKind[];
  /** The structure the block must contain, if any. */
  requires?: 'flowchart|journey' | 'timeline' | 'mindmap' | 'table' | 'list';
  /** A reserved title: only this kind may carry it, and this kind only this title. */
  reservedTitle?: string;
  /** The composition of the design system that renders it. */
  composition: string;
}

export const READING_TITLE = 'Ce que je comprends de vos cas';
export const CLOSING_TITLE = "Ce que nous n'avons pas abordé";
/** The preferred opening of the reading block; the person can correct the interlocutor's reading. */
export const PREFERRED_READING_MARK = 'Voici ma lecture de vos cas. Vous pouvez la corriger.';
/** The opening introduced in 0.2.0. Keep this public export and already written restitutions compatible. */
export const READING_MARK = 'Ma lecture, pas vos mots.';
/** The line written before 0.2.0. Restitutions already written carry it: it stays accepted and is shown as written. */
export const LEGACY_READING_MARK = 'Lecture de Vauban, pas vos mots.';
/** Every opening line the grammar accepts for the reading block. */
export const READING_MARKS: readonly string[] = [PREFERRED_READING_MARK, READING_MARK, LEGACY_READING_MARK];

const COMMON: readonly ItemKind[] = ['take', 'break'];

export const CATALOGUE: Readonly<Record<BlockKind, BlockSpec>> = {
  recit: {
    kind: 'recit',
    carries: 'un récit dans ses mots, avec ses intertitres (###) sur une même page',
    accepts: ['p', 'quote', 'figures', ...COMMON],
    composition: 'vd-text, vd-pullquote, vd-figure, va-takeaway',
  },
  cas: {
    kind: 'cas',
    carries: 'des cas déroulés',
    // Before the first ###: a mindmap alone.
    accepts: ['mindmap'],
    composition: 'vd-subheading, vd-journey, vd-timeline',
  },
  chiffres: {
    kind: 'chiffres',
    carries: 'ses chiffres, chacun dans sa phrase',
    accepts: ['p', 'figures', ...COMMON],
    composition: 'vd-figure-group',
  },
  frise: {
    kind: 'frise',
    carries: 'des épisodes datés',
    accepts: ['p', 'timeline', ...COMMON],
    requires: 'timeline',
    composition: 'vd-timeline',
  },
  carte: {
    kind: 'carte',
    carries: 'ses sujets autour d’elle',
    accepts: ['p', 'mindmap', ...COMMON],
    requires: 'mindmap',
    composition: 'Mermaid',
  },
  journee: {
    kind: 'journee',
    carries: 'une journée type',
    accepts: ['p', 'flowchart', 'journey', ...COMMON],
    requires: 'flowchart|journey',
    composition: 'vd-journey, Mermaid',
  },
  'avant-apres': {
    kind: 'avant-apres',
    carries: 'ce qui a été essayé, ce que ça a donné',
    accepts: ['p', 'table', 'quote', ...COMMON],
    requires: 'table',
    composition: 'vd-comparison (decisions.css)',
  },
  tableau: {
    kind: 'tableau',
    carries: 'une liste à colonnes qu’elle a dictée',
    accepts: ['p', 'table', ...COMMON],
    requires: 'table',
    composition: 'vd-table',
  },
  lecture: {
    kind: 'lecture',
    carries: 'la lecture de Vauban',
    accepts: ['p'],
    reservedTitle: READING_TITLE,
    composition: 'vd-callout[data-variant=lecture]',
  },
  reste: {
    kind: 'reste',
    carries: 'ce qui n’a pas été abordé',
    accepts: ['p', 'list'],
    requires: 'list',
    reservedTitle: CLOSING_TITLE,
    composition: 'vd-next-steps sur data-surface=nuit',
  },
};

/** What a `### cas` accepts. */
export const CASE_ACCEPTS: readonly ItemKind[] = [
  'p',
  'quote',
  'figures',
  'flowchart',
  'timeline',
  'flow',
  'take',
  'break',
];

export const BLOCK_KINDS = Object.keys(CATALOGUE) as BlockKind[];
export const MERMAID_TYPES = ['flowchart', 'timeline', 'mindmap', 'journey'] as const;
