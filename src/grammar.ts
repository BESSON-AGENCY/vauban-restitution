import {
  BLOCK_KINDS,
  CASE_ACCEPTS,
  CATALOGUE,
  CLOSING_TITLE,
  READING_MARK,
  READING_TITLE,
  type ItemKind,
} from './catalogue.js';
import type {
  Block,
  BlockKind,
  Case,
  Diagram,
  Figure,
  FlowStep,
  FrameBlock,
  Item,
  ListItem,
  ParseResult,
  Refusal,
  RestitutionDocument,
  Table,
} from './types.js';

const MONTHS: Record<string, number> = {
  janvier: 1,
  février: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
};

const HEAD = /^## (.+?) \{([a-z-]+)\}\s*$/;
const FIG = /^- « (.*?)\*\*(.+?)\*\*(.*?) »\s*(.*)$/;
const RESTE_ITEM = /^- (« .+ »)(?: \((« .+ »)\))?$/;
const META = /^(\d{1,2}) (\S+) (\d{4}) · (\S.*)$/;

const LABELS: Record<ItemKind, string> = {
  p: 'un paragraphe',
  quote: 'une exergue',
  figures: 'une liste de chiffres',
  take: 'une phrase de conclusion',
  break: 'un saut de page ---',
  list: 'une liste',
  table: 'un tableau',
  flow: 'un déroulé →',
  flowchart: 'un schéma flowchart',
  timeline: 'un schéma timeline',
  mindmap: 'un schéma mindmap',
  journey: 'un schéma journey',
};

function isoDate(day: number, month: string, year: number): string | null {
  const m = MONTHS[month];
  if (!m || day < 1 || day > 31) return null;
  return `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ---- Mermaid, read just enough to compose it or to give its fallback text ----

function splitBr(label: string): [string, string] {
  const parts = label.split(/<br\s*\/?>/i).map((s) => s.trim());
  return [parts[0] ?? '', parts.slice(1).join(' ')];
}

function readFlowchart(code: string[], err: (msg: string) => void): Diagram | null {
  const head = /^(?:flowchart|graph)\s+(TB|TD|LR)\s*$/.exec(code[0] ?? '');
  if (!head) {
    err('un flowchart se déclare « flowchart TB » ou « flowchart LR »');
    return null;
  }
  const order: string[] = [];
  const labels = new Map<string, string>();
  const stuck = new Set<string>();
  const see = (id: string) => {
    if (!order.includes(id)) order.push(id);
  };
  for (const raw of code.slice(1)) {
    const line = raw.trim();
    if (!line || line.startsWith('%%') || line.startsWith('classDef ')) continue;
    const cls = /^class\s+(\S+)\s+(\S+)\s*$/.exec(line);
    if (cls) {
      if (cls[2] === 'coince') for (const id of cls[1]!.split(',')) stuck.add(id.trim());
      else err(`classe « ${cls[2]} » refusée : seule la classe coince est acceptée`);
      continue;
    }
    const tokens = line.split(/\s*(?:-->|---)\s*(?:\|[^|]*\|)?\s*/);
    for (const tok of tokens) {
      const m = /^(\w+)(?:\["(.*?)"\]|\[([^\]"]*)\])?$/.exec(tok.trim());
      if (!m) {
        err(`ligne de flowchart non reconnue : ${line}`);
        break;
      }
      see(m[1]!);
      const label = m[2] ?? m[3];
      if (label !== undefined) labels.set(m[1]!, label);
    }
  }
  if (order.length === 0) {
    err('le flowchart ne contient aucune étape');
    return null;
  }
  const steps: FlowStep[] = order.map((id) => {
    const [label, roles] = splitBr(labels.get(id) ?? id);
    return { label, roles, stuck: stuck.has(id) };
  });
  return {
    type: 'flowchart',
    direction: head[1] === 'LR' ? 'LR' : 'TB',
    steps,
    source: code.join('\n'),
  };
}

function readTimeline(code: string[], err: (msg: string) => void): Diagram | null {
  if (code[0]?.trim() !== 'timeline') {
    err('une timeline se déclare « timeline »');
    return null;
  }
  const events: { when: string; what: string[] }[] = [];
  for (const raw of code.slice(1)) {
    const line = raw.trim();
    if (!line || line.startsWith('%%') || /^(title|section)\s/.test(line)) continue;
    const cont = /^:\s*(.+)$/.exec(line);
    if (cont) {
      const last = events[events.length - 1];
      if (!last) err('une suite « : épisode » doit suivre une date');
      else last.what.push(cont[1]!.trim());
      continue;
    }
    const ev = /^(.+?)\s*:\s*(.+)$/.exec(line);
    if (!ev) {
      err(`ligne de timeline non reconnue (date : épisode) : ${line}`);
      continue;
    }
    events.push({ when: ev[1]!.trim(), what: ev[2]!.split(/\s+:\s+/).map((s) => s.trim()) });
  }
  if (events.length === 0) {
    err('la timeline ne contient aucun épisode');
    return null;
  }
  return { type: 'timeline', events, source: code.join('\n') };
}

function readMindmap(code: string[], err: (msg: string) => void): Diagram | null {
  if (code[0]?.trim() !== 'mindmap') {
    err('une mindmap se déclare « mindmap »');
    return null;
  }
  const rest = code.slice(1).filter((l) => l.trim() && !l.trim().startsWith('%%'));
  const root = /^\s*root\(\((.*?)\)\)\s*$/.exec(rest[0] ?? '');
  if (!root) {
    err('la mindmap commence par root((Titre))');
    return null;
  }
  const branches = rest.slice(1).map((l) => l.trim());
  if (branches.length === 0) {
    err('la mindmap ne contient aucun sujet');
    return null;
  }
  return { type: 'mindmap', root: root[1]!, branches, source: code.join('\n') };
}

function readJourney(code: string[], err: (msg: string) => void): Diagram | null {
  if (code[0]?.trim() !== 'journey') {
    err('un journey se déclare « journey »');
    return null;
  }
  const tasks: string[] = [];
  for (const raw of code.slice(1)) {
    const line = raw.trim();
    if (!line || line.startsWith('%%') || /^(title|section)\s/.test(line)) continue;
    const task = /^([^:]+):\s*([1-5])\s*(?::.*)?$/.exec(line);
    if (!task) {
      err(`journey : chaque étape porte le score qu’elle a donné (étape: score), sinon utiliser un flowchart : ${line}`);
      continue;
    }
    tasks.push(task[1]!.trim());
  }
  if (tasks.length === 0) {
    err('le journey ne contient aucune étape');
    return null;
  }
  return { type: 'journey', tasks, source: code.join('\n') };
}

function readTable(rows: string[], err: (msg: string) => void, columns?: number): Table | null {
  const cells = (row: string): string[] => {
    const inner = row.trim().replace(/^\|/, '').replace(/\|$/, '');
    return inner
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, '|'));
  };
  if (rows.length < 3) {
    err('un tableau a ses en-têtes, sa ligne de séparation et au moins une ligne');
    return null;
  }
  const head = cells(rows[0]!);
  const sep = cells(rows[1]!);
  if (!sep.every((c) => /^:?-{3,}:?$/.test(c))) {
    err('la deuxième ligne du tableau est sa séparation (| --- | --- |)');
    return null;
  }
  if (head.some((c) => !c)) {
    err('chaque colonne du tableau a son en-tête');
    return null;
  }
  if (sep.length !== head.length) {
    err('la séparation du tableau n’a pas autant de colonnes que ses en-têtes');
    return null;
  }
  if (columns !== undefined && head.length !== columns) {
    err(`ce tableau a exactement ${columns} colonnes`);
    return null;
  }
  const body = rows.slice(2).map(cells);
  for (const r of body) {
    if (r.length !== head.length) {
      err('chaque ligne du tableau a autant de colonnes que ses en-têtes');
      return null;
    }
  }
  return { head, rows: body };
}

/** Parses « step (roles) → [coince] step → … ». */
function readFlowLine(text: string): FlowStep[] {
  return text.split(' → ').map((raw) => {
    const stuck = raw.startsWith('[coince] ');
    const st = stuck ? raw.slice('[coince] '.length) : raw;
    const m = /^(.*?) \((.*)\)$/.exec(st);
    return { label: m ? m[1]! : st, roles: m ? m[2]! : '', stuck };
  });
}

function readFigure(line: number, text: string): Figure | null {
  const m = FIG.exec(text);
  if (!m) return null;
  return { line, before: m[1]!, value: m[2]!, unit: m[3]!.trim(), context: m[4]! };
}

function itemKindOf(item: Item): ItemKind {
  return item.kind === 'diagram' ? item.diagram.type : item.kind;
}

// ---- the parser ----

/**
 * Reads a restitution Markdown against the closed grammar. Everything the grammar does not name
 * is refused with the faulty line; all refusals are collected, not only the first.
 */
export function parse(markdown: string): ParseResult {
  const raw = markdown.replace(/\r\n?/g, '\n').split('\n');
  const refusals: Refusal[] = [];
  const err = (line: number, message: string) => refusals.push({ line, message });

  // Pre-pass: HTML, images and links are refused on every line outside a code fence.
  const refused = new Set<number>();
  {
    let fence = false;
    raw.forEach((l, i) => {
      if (l.startsWith('```')) {
        fence = !fence;
        return;
      }
      if (fence) return;
      if (/<[a-zA-Z/!]/.test(l)) {
        err(i + 1, 'HTML refusé');
        refused.add(i);
      } else if (l.includes('![') || l.includes('](')) {
        err(i + 1, 'image ou lien refusé');
        refused.add(i);
      }
    });
  }

  let title: string | null = null;
  let metaRaw = '';
  let metaLine = 0;
  const blocks: Block[] = [];
  let cur: Block | null = null;
  let sub: Case | null = null;
  let noTitleReported = false;

  const add = (item: Item, line: number) => {
    const kind = itemKindOf(item);
    if (!cur) return;
    if (cur.kind === 'cas' && sub === null) {
      if (kind !== 'mindmap') {
        err(
          line,
          `dans un bloc cas, avant le premier ###, seule une mindmap est acceptée (reçu : ${LABELS[kind]})`,
        );
        return;
      }
      cur.items.push(item);
      return;
    }
    const accepts = sub !== null ? CASE_ACCEPTS : CATALOGUE[cur.kind].accepts;
    if (!accepts.includes(kind)) {
      err(line, `${LABELS[kind]} n’est pas accepté dans un bloc ${cur.kind}`);
      return;
    }
    (sub ?? cur).items.push(item);
  };

  let i = 0;
  while (i < raw.length) {
    const l = raw[i]!;
    const n = i + 1;
    if (!l.trim()) {
      i++;
      continue;
    }
    if (refused.has(i)) {
      i++;
      continue;
    }
    if (/^#{4,} /.test(l)) {
      err(n, 'titre de niveau 4 ou plus refusé');
      i++;
      continue;
    }
    if (l.startsWith('# ')) {
      if (title !== null) {
        err(n, 'un seul titre # est accepté');
        i++;
        continue;
      }
      title = l.slice(2).trim();
      i++;
      while (i < raw.length && !raw[i]!.trim()) i++;
      metaRaw = (raw[i] ?? '').trim();
      metaLine = i + 1;
      i++;
      continue;
    }
    if (title === null) {
      if (!noTitleReported) err(n, 'le document commence par # Titre');
      noTitleReported = true;
      i++;
      continue;
    }
    if (l.startsWith('## ')) {
      const m = HEAD.exec(l);
      if (!m) {
        err(n, 'un titre ## porte son bloc : ## Titre {bloc}');
        i++;
        continue;
      }
      const t = m[1]!;
      const k = m[2]!;
      const known = (BLOCK_KINDS as string[]).includes(k);
      if (!known) err(n, `bloc « ${k} » hors catalogue (${[...BLOCK_KINDS].sort().join(', ')})`);
      if (k === 'lecture' && t !== READING_TITLE) err(n, `le bloc lecture a pour titre « ${READING_TITLE} »`);
      if (k === 'reste' && t !== CLOSING_TITLE) err(n, `le bloc reste a pour titre « ${CLOSING_TITLE} »`);
      if ((t === READING_TITLE && k !== 'lecture') || (t === CLOSING_TITLE && k !== 'reste'))
        err(n, 'titre réservé : bloc lecture ou reste');
      cur = { line: n, kind: (known ? k : 'recit') as BlockKind, title: t, items: [], cases: [] };
      blocks.push(cur);
      sub = null;
      i++;
      continue;
    }
    if (cur === null) {
      err(n, 'tout contenu est dans un bloc ## Titre {bloc}');
      i++;
      continue;
    }
    if (l.startsWith('### ')) {
      if (cur.kind !== 'cas') {
        err(n, '### n’existe que dans un bloc cas');
        i++;
        continue;
      }
      sub = { line: n, title: l.slice(4).trim(), items: [] };
      cur.cases.push(sub);
      i++;
      continue;
    }
    if (l.trim() === '---') {
      add({ kind: 'break', line: n }, n);
      i++;
      continue;
    }
    if (l.startsWith('```')) {
      let j = i + 1;
      while (j < raw.length && !raw[j]!.startsWith('```')) j++;
      if (j >= raw.length) {
        err(n, 'bloc de code non fermé');
        break;
      }
      if (!/^```mermaid\s*$/.test(l)) {
        err(n, 'seul un bloc ```mermaid est accepté');
        i = j + 1;
        continue;
      }
      const code = raw.slice(i + 1, j);
      const first = (code.find((c) => c.trim()) ?? '').trim().split(/\s+/)[0] ?? '';
      const body = code;
      const e = (msg: string) => err(n, msg);
      let diagram: Diagram | null = null;
      if (first === 'flowchart' || first === 'graph') diagram = readFlowchart(trimCode(body), e);
      else if (first === 'timeline') diagram = readTimeline(trimCode(body), e);
      else if (first === 'mindmap') diagram = readMindmap(trimCode(body), e);
      else if (first === 'journey') diagram = readJourney(trimCode(body), e);
      else err(n, `type Mermaid « ${first} » refusé (flowchart, timeline, mindmap, journey)`);
      if (diagram) add({ kind: 'diagram', line: n, diagram }, n);
      i = j + 1;
      continue;
    }
    if (l.startsWith('> ')) {
      const q: string[] = [];
      while (i < raw.length && raw[i]!.startsWith('> ')) {
        q.push(raw[i]!.slice(2));
        i++;
      }
      const t = q.join(' ');
      if (q.length > 1 || !t.startsWith('« ') || !t.endsWith(' »')) {
        err(n, 'une exergue est une seule ligne > « … »');
      } else {
        add({ kind: 'quote', line: n, text: t }, n);
      }
      continue;
    }
    if (l.startsWith('|')) {
      const rows: string[] = [];
      while (i < raw.length && raw[i]!.startsWith('|')) {
        rows.push(raw[i]!);
        i++;
      }
      const columns = cur.kind === 'avant-apres' ? 2 : undefined;
      const table = readTable(rows, (m) => err(n, m), columns);
      if (table) add({ kind: 'table', line: n, table }, n);
      continue;
    }
    if (/^\s+- /.test(l) || /^\d+\. /.test(l)) {
      err(n, 'liste imbriquée ou numérotée refusée');
      i++;
      continue;
    }
    if (l.startsWith('- ')) {
      const lines: { n: number; t: string }[] = [];
      while (i < raw.length && raw[i]!.startsWith('- ')) {
        lines.push({ n: i + 1, t: raw[i]! });
        i++;
      }
      const figures = lines.map((x) => readFigure(x.n, x.t));
      if (figures.every((f) => f !== null)) {
        add({ kind: 'figures', line: n, figures: figures as Figure[] }, n);
      } else if (cur.kind === 'reste') {
        const items: ListItem[] = [];
        for (const x of lines) {
          const m = RESTE_ITEM.exec(x.t);
          if (!m) err(x.n, 'élément de liste finale : - « … » ou - « … » (« … »)');
          else items.push({ line: x.n, text: m[1]!, note: m[2] ?? '' });
        }
        add({ kind: 'list', line: n, items }, n);
      } else {
        err(n, 'liste : chiffres (- « avant **nombre** unité » contexte) ou liste finale seulement');
      }
      continue;
    }
    const p: string[] = [];
    while (i < raw.length && raw[i]!.trim() && !/^(#|>|- |---|```|\|)/.test(raw[i]!)) {
      p.push(raw[i]!.trim());
      i++;
    }
    const t = p.join(' ');
    if (t.includes(' → ')) {
      if (cur.kind === 'cas' && sub !== null) add({ kind: 'flow', line: n, steps: readFlowLine(t) }, n);
      else err(n, 'la ligne → (déroulé de secours) n’existe que dans un ### cas');
    } else if (/^\*\*[^*].*[^*]\*\*$/.test(t)) {
      add({ kind: 'take', line: n, text: t.slice(2, -2) }, n);
    } else {
      add({ kind: 'p', line: n, text: t }, n);
    }
  }

  if (title === null) err(1, 'le document commence par # Titre');
  let meta: RestitutionDocument['meta'] | null = null;
  if (title !== null) {
    const m = META.exec(metaRaw);
    const iso = m ? isoDate(Number(m[1]), m[2]!, Number(m[3])) : null;
    if (!m) err(metaLine || 2, 'la ligne qui suit # doit être « date · prénom » (ex. 23 octobre 2026 · Martin)');
    else if (!iso) err(metaLine, `date illisible : « ${m[1]} ${m[2]} ${m[3]} »`);
    else meta = { raw: metaRaw, date: `${m[1]} ${m[2]} ${m[3]}`, iso, person: m[4]! };
  }
  if (blocks.length === 0) err(1, 'aucun bloc ##');

  for (const b of blocks) {
    if (b.kind === 'cas' && b.cases.length === 0) err(b.line, 'un bloc cas contient au moins un ### cas');
    if (b.kind === 'lecture') {
      const ps = b.items.filter((x): x is Extract<Item, { kind: 'p' }> => x.kind === 'p');
      if (ps.length === 0 || ps[0]!.text !== READING_MARK)
        err(b.line, `la lecture s’ouvre par « ${READING_MARK} »`);
      for (const p of ps.slice(1)) {
        if (!p.text.includes('«')) err(p.line, 'chaque point de la lecture contient une citation « … »');
      }
    }
    const need = CATALOGUE[b.kind].requires;
    if (need) {
      const kinds = b.items.map(itemKindOf);
      const ok =
        need === 'flowchart|journey'
          ? kinds.includes('flowchart') || kinds.includes('journey')
          : kinds.includes(need as ItemKind);
      if (!ok) err(b.line, `le bloc ${b.kind} contient son élément (${need})`);
    }
  }

  if (refusals.length > 0 || title === null || meta === null) {
    refusals.sort((a, b) => a.line - b.line);
    return { ok: false, document: null, refusals };
  }
  return { ok: true, document: { title, meta, blocks }, refusals: [] };
}

/** Drops the blank lines around a code block, keeping its first line as the declaration. */
function trimCode(lines: string[]): string[] {
  let a = 0;
  let b = lines.length;
  while (a < b && !lines[a]!.trim()) a++;
  while (b > a && !lines[b - 1]!.trim()) b--;
  return lines.slice(a, b);
}

/** « ligne 8 : HTML refusé » */
export function formatRefusal(r: Refusal): string {
  return `ligne ${r.line} : ${r.message}`;
}

/** Reads a Markdown and lists its refusals (empty when the grammar accepts it). */
export function validate(markdown: string, frame?: readonly FrameBlock[]): Refusal[] {
  const result = parse(markdown);
  if (!result.ok) return result.refusals;
  return frame ? checkFrame(result.document, frame) : [];
}

/** Compares the blocks of a document to the frame pinned by a model revision: same kinds, titles and order. */
export function checkFrame(doc: RestitutionDocument, frame: readonly FrameBlock[]): Refusal[] {
  const out: Refusal[] = [];
  const suite = (kinds: readonly string[]) => kinds.join(', ');
  const got = doc.blocks.map((b) => b.kind);
  const want = frame.map((b) => b.kind);
  if (suite(got) !== suite(want)) {
    out.push({
      line: doc.blocks[0]?.line ?? 1,
      message: `la suite des blocs (${suite(got)}) n’est pas celle de la trame (${suite(want)})`,
    });
    return out;
  }
  doc.blocks.forEach((b, idx) => {
    const f = frame[idx]!;
    if (b.title !== f.title) out.push({ line: b.line, message: `le titre du bloc devrait être « ${f.title} »` });
    const opt = f.options;
    if (!opt) return;
    if (opt.diagram !== undefined) {
      // For `cas`, only the schemas of the cases count: the mindmap before the first ### is the block's own.
      const items = b.kind === 'cas' ? b.cases.flatMap((c) => c.items) : b.items;
      const diagrams = items.flatMap((x) => (x.kind === 'diagram' ? [x.diagram.type] : []));
      if (opt.diagram === null && diagrams.length > 0)
        out.push({ line: b.line, message: 'ce bloc n’admet aucun schéma' });
      else if (opt.diagram !== null && diagrams.some((d) => d !== opt.diagram))
        out.push({ line: b.line, message: `ce bloc n’admet qu’un schéma ${opt.diagram}` });
    }
    if (opt.repeat !== undefined && b.kind === 'cas' && b.cases.length !== opt.repeat)
      out.push({ line: b.line, message: `ce bloc attend ${opt.repeat} cas, il en contient ${b.cases.length}` });
  });
  return out;
}
