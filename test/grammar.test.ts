import { describe, expect, it } from 'vitest';
import { BLOCK_KINDS, CATALOGUE } from '../src/catalogue.js';
import { checkFrame, parse, validate } from '../src/grammar.js';
import { fixture, parseOk, wrap } from './helpers.js';

describe('reference document', () => {
  const doc = parseOk(fixture('reference.md'));

  it('reads the cover', () => {
    expect(doc.title).toBe('Vos priorités, vos irritants, ce qui ne va pas');
    expect(doc.meta).toEqual({
      raw: '23 octobre 2026 · Martin',
      date: '23 octobre 2026',
      iso: '2026-10-23',
      person: 'Martin',
      forLine: '',
      objective: '',
    });
  });

  it('reads the blocks in order', () => {
    expect(doc.blocks.map((b) => b.kind)).toEqual(['recit', 'cas', 'recit', 'recit', 'lecture', 'reste']);
    expect(doc.blocks[1]!.cases.map((c) => c.title)).toEqual([
      'Le planning des tournages et les validations client',
      'Le pipe du lundi',
    ]);
  });

  it('reads figures, flows and the mindmap', () => {
    const recit = doc.blocks[0]!;
    const figures = recit.items.find((i) => i.kind === 'figures');
    expect(figures && figures.kind === 'figures' ? figures.figures.map((f) => f.value) : []).toEqual([
      'Trois jours',
      'Deux jours',
      'la moitié',
    ]);
    const cas = doc.blocks[1]!;
    expect(cas.items).toHaveLength(1);
    const flow = cas.cases[0]!.items.find((i) => i.kind === 'diagram');
    expect(flow && flow.kind === 'diagram' && flow.diagram.type === 'flowchart' ? flow.diagram.steps : []).toHaveLength(6);
    const stuck =
      flow && flow.kind === 'diagram' && flow.diagram.type === 'flowchart'
        ? flow.diagram.steps.filter((s) => s.stuck).map((s) => s.label)
        : [];
    expect(stuck).toEqual(['calage des tournages', 'première version au client, retours']);
  });

  it('keeps the take of a page and the reading mark', () => {
    expect(doc.blocks[0]!.items.some((i) => i.kind === 'take')).toBe(true);
    expect(doc.blocks[4]!.items[0]).toMatchObject({ kind: 'p', text: 'Lecture de Vauban, pas vos mots.' });
  });

  it('validates with no refusal', () => {
    expect(validate(fixture('reference.md'))).toEqual([]);
  });
});

describe('every genre of the catalogue is read', () => {
  const doc = parseOk(fixture('genres.md'));
  it('covers the whole catalogue with the reference document', () => {
    const kinds = [...doc.blocks, ...parseOk(fixture('reference.md')).blocks].map((b) => b.kind);
    for (const k of BLOCK_KINDS) expect(kinds).toContain(k);
    expect(Object.keys(CATALOGUE).sort()).toEqual([...BLOCK_KINDS].sort());
  });
  it('reads a timeline, a table of two columns, a journey needs scores', () => {
    const frise = doc.blocks.find((b) => b.kind === 'frise')!;
    const d = frise.items.find((i) => i.kind === 'diagram');
    expect(d && d.kind === 'diagram' && d.diagram.type === 'timeline' ? d.diagram.events : []).toEqual([
      { when: 'mars 2026', what: ['le premier devis refusé'] },
      { when: 'avril 2026', what: ['la relance', 'le second devis'] },
      { when: 'juin 2026', what: ['la signature'] },
    ]);
    const aa = doc.blocks.find((b) => b.kind === 'avant-apres')!;
    const t = aa.items.find((i) => i.kind === 'table');
    expect(t && t.kind === 'table' ? t.table.head : []).toHaveLength(2);
    const j = parse(wrap('```mermaid\njourney\n  Titre: 4: moi\n  Autre: 2\n```', '## Une journée {journee}'));
    expect(j.ok).toBe(true);
    const bad = parse(wrap('```mermaid\njourney\n  Titre\n```', '## Une journée {journee}'));
    expect(bad.ok).toBe(false);
  });
});

/** [name, markdown, expected line, expected message fragment] */
const REFUSALS: [string, string, number, string][] = [
  ['heading without genre', wrap('', '## Sans genre'), 4, 'un titre ## porte son bloc'],
  ['genre outside the catalogue', wrap('', '## Titre {inconnu}'), 4, 'hors catalogue'],
  ['content before the first block', '# T\n23 octobre 2026 · Martin\n\n> « une exergue »\n\n## Titre {recit}\nx\n', 4, 'tout contenu est dans un bloc'],
  ['four cover lines', '# T\n23 octobre 2026 · Martin\nPour Martin, Acme\nUn objectif.\nUne ligne de trop.\n\n## Titre {recit}\nx\n', 5, 'au plus trois lignes'],
  ['two Pour lines', '# T\n23 octobre 2026 · Martin\nPour Martin, Acme\nPour Autre\n\n## Titre {recit}\nx\n', 4, 'au plus trois lignes'],
  ['empty Pour', '# T\n23 octobre 2026 · Martin\nPour \n\n## Titre {recit}\nx\n', 3, 'dit pour qui'],
  ['reserved title with another genre', wrap('', '## Ce que je comprends de vos cas {recit}'), 4, 'titre réservé'],
  ['reserved genre with another title', wrap('Lecture de Vauban, pas vos mots.', '## Autre titre {lecture}'), 4, 'a pour titre'],
  ['structure outside the genre', wrap('| a | b |\n| --- | --- |\n| 1 | 2 |'), 5, 'n’est pas accepté dans un bloc recit'],
  ['### outside a cas or a recit', wrap('### Un cas', '## Chiffres {chiffres}'), 5, 'n’existe que dans un bloc cas ou recit'],
  ['cas without ###', wrap('', '## Cas {cas}'), 4, 'au moins un ### cas'],
  ['level 4 heading', wrap('#### Petit'), 5, 'niveau 4'],
  ['HTML', wrap('Du <b>gras</b> ici'), 5, 'HTML refusé'],
  ['HTML on a continuation line', wrap('Une ligne\nDu <b>gras</b> ici'), 6, 'HTML refusé'],
  ['image', wrap('![a](b.png)'), 5, 'image ou lien refusé'],
  ['link', wrap('voir [ici](http://x.y)'), 5, 'image ou lien refusé'],
  ['nested list', wrap('- « **un** jour »\n  - x'), 6, 'liste imbriquée'],
  ['numbered list', wrap('1. un\n2. deux'), 5, 'liste imbriquée ou numérotée'],
  ['free list', wrap('- une ligne libre'), 5, 'liste : chiffres'],
  ['multi-line quote', wrap('> « un »\n> « deux »'), 5, 'une exergue est une seule ligne'],
  ['quote without guillemets', wrap('> un texte'), 5, 'une exergue est une seule ligne'],
  ['code that is not mermaid', wrap('```js\nx\n```'), 5, 'seul un bloc ```mermaid'],
  ['unclosed code', wrap('```mermaid\nflowchart TB\n'), 5, 'non fermé'],
  ['mermaid type outside the list', wrap('```mermaid\npie\n  "a": 1\n```'), 5, 'refusé'],
  ['arrow line outside a cas', wrap('vente → montage'), 5, 'n’existe que dans un ### cas'],
  ['reading without the mark', wrap('Un point. Vous avez dit : « oui ».', '## Ce que je comprends de vos cas {lecture}'), 4, 's’ouvre par'],
  [
    'reading point without a quotation',
    wrap('Lecture de Vauban, pas vos mots.\n\nUn point sans citation.', '## Ce que je comprends de vos cas {lecture}'),
    7,
    'contient une citation',
  ],
  ['second title', '# A\n23 octobre 2026 · Martin\n\n# B\n', 4, 'un seul titre #'],
  ['bad meta line', '# A\nle 23 octobre\n\n## T {recit}\nx\n', 2, 'date · prénom'],
  ['meta with a dot but no name', '# A\n23 octobre 2026 · \n\n## T {recit}\nx\n', 2, 'date · prénom'],
  ['quote without space after >', wrap('>« un »'), 5, 'un espace après >'],
  ['lone >', wrap('>'), 5, 'un espace après >'],
  ['--- followed by text', wrap('---x'), 5, 'seul sur sa ligne'],
  ['# without space', wrap('#x'), 5, 'un espace après les #'],
  ['lone -', wrap('-'), 5, 'un espace après -'],
  ['day 0', '# A\n0 octobre 2026 · Martin\n\n## T {recit}\nx\n', 2, 'date illisible'],
  ['day 32', '# A\n32 octobre 2026 · Martin\n\n## T {recit}\nx\n', 2, 'date illisible'],
  ['table with a header and a separator only', wrap('| a | b |\n| --- | --- |', '## T {tableau}'), 5, 'au moins une ligne'],
  ['table separator with fewer columns', wrap('| a | b |\n| --- |\n| 1 | 2 |', '## T {tableau}'), 5, 'autant de colonnes'],
  ['unknown month', '# A\n23 octobrr 2026 · Martin\n\n## T {recit}\nx\n', 2, 'date illisible'],
  ['no title', '## T {recit}\nx\n', 1, 'commence par # Titre'],
  ['flowchart with another direction', wrap('```mermaid\nflowchart RL\n A["x"]\n```', '## J {journee}'), 5, 'flowchart TB'],
  ['flowchart with another class', wrap('```mermaid\nflowchart TB\n A["x"]\n class A rouge\n```', '## J {journee}'), 5, 'seule la classe coince'],
  ['genre missing its element', wrap('Un texte.', '## Frise {frise}'), 4, 'contient son élément'],
  ['reste without its list', wrap('Pour une autre fois :', "## Ce que nous n'avons pas abordé {reste}"), 4, 'contient son élément'],
  ['bad reste item', wrap('- libre', "## Ce que nous n'avons pas abordé {reste}"), 5, 'élément de liste finale'],
  ['table of three columns in avant-apres', wrap('| a | b | c |\n| --- | --- | --- |\n| 1 | 2 | 3 |', '## AA {avant-apres}'), 5, 'exactement 2 colonnes'],
  ['table without separator', wrap('| a | b |\n| 1 | 2 |\n| 3 | 4 |', '## T {tableau}'), 5, 'séparation'],
  ['mindmap alone before the first ### of a cas', wrap('Un texte.\n### Un cas\nx', '## Cas {cas}'), 5, 'seule une mindmap'],
];

describe('cover without a first name', () => {
  it('accepts the date alone and composes a cover with the date only', async () => {
    const d = parseOk('# A\n23 octobre 2026\n\n## T {recit}\nx\n');
    expect(d.meta).toMatchObject({ raw: '23 octobre 2026', iso: '2026-10-23', person: '' });
    const { composeParts } = await import('../src/compose/index.js');
    const { VAUBAN_CHARTE } = await import('../src/charte.js');
    const html = composeParts(d, VAUBAN_CHARTE).html;
    expect(html).toContain('<time datetime="2026-10-23">23 octobre 2026</time></p>');
    expect(html).toContain('<span>23 octobre 2026</span><span>02 / 02</span>');
  });
});

describe('bold in a paragraph', () => {
  const items = (body: string) => parseOk(wrap(body)).blocks[0]!.items.map((i) => i.kind);
  it('is a conclusion only when the whole line is one bold span', () => {
    expect(items('**Une conclusion entière.**')).toEqual(['take']);
    expect(items('**Un** mot **deux**')).toEqual(['p']);
    expect(items('**Un** mot')).toEqual(['p']);
    expect(items('Un mot **deux**')).toEqual(['p']);
  });
});

describe('journey scores', () => {
  it.each(['a: b : 3', 'a: 6', 'a: 0: x', 'a', 'a:'])('refuses « %s »', (line) => {
    expect(parse(wrap(`\`\`\`mermaid\njourney\n  ${line}\n\`\`\``, '## J {journee}')).ok).toBe(false);
  });
  it.each(['a: 3', 'a b : 4 : moi, toi'])('accepts « %s »', (line) => {
    expect(parse(wrap(`\`\`\`mermaid\njourney\n  ${line}\n\`\`\``, '## J {journee}')).ok).toBe(true);
  });
});

describe('calendar days', () => {
  const meta = (d: string) => parse(`# A\n${d} · Martin\n\n## T {recit}\nx\n`).ok;
  it('requires the day to exist in the month, leap years included', () => {
    expect(meta('29 février 2028')).toBe(true);
    expect(meta('29 février 2027')).toBe(false);
    expect(meta('29 février 2100')).toBe(false);
    expect(meta('29 février 2000')).toBe(true);
    expect(meta('31 avril 2026')).toBe(false);
    expect(meta('30 avril 2026')).toBe(true);
    expect(meta('31 décembre 2026')).toBe(true);
  });
});

describe('figures and flows', () => {
  const fig = (l: string) => parse(wrap(l)).ok;
  it('takes one bold span only', () => {
    expect(fig('- « **Trois** jours » ici.')).toBe(true);
    expect(fig('- « **Trois** jours **perdus** » ici.')).toBe(false);
    expect(fig('- « **Trois** jours » ici **encore**.')).toBe(false);
  });
  const flow = (l: string) => parse(wrap(`### Un cas\n${l}`, '## C {cas}')).ok;
  it('refuses an empty step or a lone [coince]', () => {
    expect(flow('vente → [coince] montage → fin')).toBe(true);
    expect(flow('vente → [coince] → montage')).toBe(false);
    expect(flow('vente →  → montage')).toBe(false);
    expect(flow('[coince] → montage')).toBe(false);
  });
});

describe('recit with intertitres', () => {
  const doc = parseOk(fixture('synthese.md'));
  it('reads ### sections inside a recit and keeps the closing line as the take', () => {
    const recit = doc.blocks[0]!;
    expect(recit.cases.map((c) => c.title)).toEqual(['Ce que vous avez déroulé', 'Ce qui coince', 'Ce que vous voudriez']);
    expect(recit.cases[2]!.items.map((i) => i.kind)).toEqual(['p', 'take']);
  });
  it('accepts what a recit accepts in a section and refuses the rest', () => {
    expect(parse(wrap('### Un intertitre\n> « une exergue »\n\nUn texte.')).ok).toBe(true);
    expect(parse(wrap('### Un intertitre\nvente → montage')).ok).toBe(false);
    expect(parse(wrap('### Un intertitre\n```mermaid\nmindmap\n  root((x))\n    a\n```')).ok).toBe(false);
  });
});

describe('cover lines', () => {
  const cover = (lines: string) => parseOk(`# T\n${lines}\n\n## B {recit}\nx\n`).meta;
  it('reads Pour and the objective, each optional', () => {
    expect(cover('23 octobre 2026 · Martin\nPour Martin, Acme\nVoir où part le temps.')).toMatchObject({
      person: 'Martin',
      forLine: 'Martin, Acme',
      objective: 'Voir où part le temps.',
    });
    expect(cover('23 octobre 2026 · Martin\nPour Acme')).toMatchObject({ forLine: 'Acme', objective: '' });
    expect(cover('23 octobre 2026\nVoir où part le temps.')).toMatchObject({ forLine: '', objective: 'Voir où part le temps.' });
    expect(cover('23 octobre 2026\n\nPour Acme\n\nUn objectif.')).toMatchObject({ forLine: 'Acme', objective: 'Un objectif.' });
    expect(cover('23 octobre 2026 · Martin')).toMatchObject({ forLine: '', objective: '' });
  });
  it('composes the cover like the DS one: Pour above, title, objective as subtitle, date below', async () => {
    const { composeParts } = await import('../src/compose/index.js');
    const { VAUBAN_CHARTE } = await import('../src/charte.js');
    const d = parseOk('# Un titre\n23 octobre 2026 · Martin\nPour Martin, Acme\nVoir où part le temps.\n\n## B {recit}\nx\n');
    const html = composeParts(d, VAUBAN_CHARTE).html;
    const at = (s: string) => html.indexOf(s);
    expect(at('<p class="va-cover-for">Pour Martin, Acme</p>')).toBeGreaterThan(0);
    expect(at('<p class="va-cover-for">')).toBeLessThan(at('<h2>Un titre</h2>'));
    expect(at('<h2>Un titre</h2>')).toBeLessThan(at('<p class="va-cover-subtitle">Voir où part le temps.</p>'));
    expect(at('<p class="va-cover-subtitle">')).toBeLessThan(at('<p class="va-cover-meta">'));
    const plain = composeParts(parseOk('# T\n23 octobre 2026 · A\n\n## B {recit}\nx\n'), VAUBAN_CHARTE).html;
    expect(plain).not.toContain('va-cover-for');
    expect(plain).not.toContain('va-cover-subtitle');
  });
});

describe('cover date', () => {
  it('accepts the first of the month written 1er', () => {
    const d = parseOk('# A\n1er novembre 2026 · Martin\n\n## T {recit}\nx\n');
    expect(d.meta).toMatchObject({ date: '1er novembre 2026', iso: '2026-11-01', person: 'Martin' });
  });
});

describe('refusals name the line and the reason', () => {
  it.each(REFUSALS)('%s', (_name, markdown, line, fragment) => {
    const r = parse(markdown);
    expect(r.ok).toBe(false);
    const hit = r.refusals.find((x) => x.message.includes(fragment));
    expect(hit, JSON.stringify(r.refusals)).toBeDefined();
    expect(hit!.line).toBe(line);
  });

  it('collects every refusal, not only the first', () => {
    const r = parse(wrap('Du <b>HTML</b>\n\n![i](x.png)\n\n#### Petit'));
    expect(r.refusals.map((x) => x.line)).toEqual([5, 7, 9]);
  });
});

describe('frame check', () => {
  const doc = parseOk(fixture('reference.md'));
  const frame = doc.blocks.map((b) => ({ kind: b.kind, title: b.title }));
  it('accepts the frame the document follows', () => {
    expect(checkFrame(doc, frame)).toEqual([]);
  });
  it('refuses another order of kinds', () => {
    expect(checkFrame(doc, [...frame].reverse())).toHaveLength(1);
  });
  it('refuses another title', () => {
    expect(checkFrame(doc, frame.map((f, i) => (i === 0 ? { ...f, title: 'Autre' } : f)))).toHaveLength(1);
  });
  it('applies the options: repeat and diagram', () => {
    const withOptions = frame.map((f) => (f.kind === 'cas' ? { ...f, options: { repeat: 3, diagram: 'flowchart' as const } } : f));
    const out = checkFrame(doc, withOptions).map((r) => r.message);
    expect(out.some((m) => m.includes('attend 3 cas'))).toBe(true);
    expect(out.some((m) => m.includes('qu’un schéma'))).toBe(false);
  });
});
