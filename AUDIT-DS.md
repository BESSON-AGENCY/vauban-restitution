# Audit du rendu contre le design system A4

Constat de Martin : « Le DS est dégueulasse, les titres trop gros. On ne doit rien inventer. » Ce document dit ce qui était inventé, ce qui est aligné, ce qui reste indispensable. Mesures faites le 23 octobre 2026 sur `http://localhost:3011/bibliotheque/documents/preciphar?format=a4` (61 pages A4, Chrome headless, styles calculés) et sur `pages.css`, `components.css`, `editorial.css`, `decisions.css`, `scenes.css` du dépôt `vauban-ds-restitution-v2`.

## 1. L'échelle A4 réelle (mesurée sur Préciphar)

| Élément | Taille, graisse | Source |
|---|---|---|
| Titre de couverture (`.va-cover h2`) | 60 px, 550, interlettrage -0,045 em | `pages.css` |
| Sous-titre de couverture | 23 px, 420 | `pages.css` |
| « Pour X », méta de couverture | 16 px / 14 px | `pages.css` |
| Titre de page (`.vd-heading h2`) | 42 px, 600, interligne 1,13 | `pages.css` (`--vd-title`) |
| Intertitre (`.vd-subheading h3`) | 24 px, 600 | `pages.css` (`--vd-subtitle`) |
| Corps (`.vd-text`) | 16 px, 420, interligne 26,4 px | `pages.css` (`--vd-body`) |
| Chapeau (`.va-intro`) | 20 px | `pages.css` (`--vd-lead`) |
| Conclusion filetée (`.va-takeaway`) | 24 px, 420, filet de 2 px en accent au-dessus | `pages.css` |
| En-tête et pied de page | 14 px, 420, gris ardoise | `pages.css` |
| Kicker | 12 px, 600, majuscules espacées | `components.css` (retiré, décision du 23 octobre) |
| Tableau | 16 px, en-tête 550 sur fond brume | `pages.css` |
| Étape de parcours | titre 23 px, numéro 30 px en accent | `pages.css` |
| Chiffre d'une page de preuve (`.va-page .vd-figure-number`) | 96 px | `pages.css` |

Les 3,25 rem (titre), 1,625 rem (intertitre) et 2,25 rem (citation) de `tokens-print.css` sont l'échelle slide, remplacée sur `.va-page` par 42 / 24 / 16 / 20 / 14 / 12 px. Seule `--vd-quote` (2,25 rem, soit 36 px) n'est pas remplacée sur A4 : le DS n'a aucune citation en A4.

Composition d'une page Préciphar : en-tête (logo en couleur, titre du document, filet) ; `va-composition` avec `vd-heading` (kicker puis h2) ; des `va-reading-section` (intertitre `vd-subheading` puis `vd-text`) ; `va-takeaway` ; pied (libellé, `02 / 61`). La couverture a le même en-tête et le même pied, et `va-cover` y contient `va-cover-for`, un `h2`, un sous-titre, `va-cover-art`, `va-cover-meta`.

## 2. Ce qui était inventé (version 0.1.x, `profile.css`)

`profile.css` reprenait le CSS du kit de la maquette (gabarit A4), pas celui du DS. Écarts relevés :

| Inventé | Le DS fait |
|---|---|
| Couverture sans en-tête ni pied | La couverture a l'en-tête et le pied de toutes les pages |
| Titre de couverture en `h1` (60 px par une règle `.va-cover h1`) | `h2` (la règle DS est `.va-cover h2`) |
| Logo monochrome en `currentColor` | Logo en couleur `vauban-header.svg`, version `-inverse` sur fond nuit |
| Chapeau en `vd-text-lead` | `va-intro` (20 px) sous le titre de page |
| Un `vd-text` par paragraphe (écart de 28 px) | Un seul `vd-text` pour des paragraphes qui se suivent (écart de 16 px) |
| Intertitre en `div.vd-subheading` | `header.vd-subheading > div > h3`, dans un `va-reading-section` avec son texte |
| Variables `--vd-*` et tailles redéfinies sur `.vd-document` | Fournies par `tokens-print.css` et `pages.css` |
| `.va-page` avec marge de 32 px et `margin: 0 auto` | `.va-page` sans marge, l'espacement vient de la galerie |
| Règles du flux (`li` à 18 px, bordures, trait vertical à 43 px) | `.va-page .vd-journey` de `pages.css` (parcours « travel ») |
| `.vd-diagram` pour les schémas Mermaid | `.vd-diagram` du DS est celle des schémas `dg-*` : classe renommée `vr-diagram` |
| `data-layout="stack"` avec trait et une colonne | Le DS a `duo` et `mosaic` |
| Surface nuit définie à la main | Définie dans `scenes.css` (`.va-page[data-surface='nuit']`), maintenant copiée |
| Tableaux sans les attributs du DS | `vd-table[data-variant=reading] > section.vd-table-scroll > div[data-slot=table-container] > table[data-slot=table]` ; comparaison `vd-comparison` avec `caption`, `td[data-label] > span` |
| Mobile (`max-width: 700px`) et impression redéfinis | Déjà dans `pages.css` (`@media screen and (max-width: 700px)`, `@media print`) |

Les titres : le titre de page (42 px) et l'intertitre (24 px) étaient déjà ceux du DS. Ce qui paraît trop gros dans le rendu est la citation (`vd-pullquote`, 36 px, absente du DS A4) et les chiffres dans la phrase (nombre à 1,55 em de 36 px). Voir « À décider ».

## 3. Ce qui est aligné maintenant

- Aucun `profile.css`. Le CSS embarqué est : `tokens-print`, `components`, `editorial`, `scenes`, `pages`, `decisions` du DS (copies fidèles, comparées par `npm run drift`), élagué aux classes employées, plus `engine.css` (4 règles, ci-dessous).
- Couverture, en-tête, pied, titre, chapeau, intertitre, texte, conclusion, parcours, frise, encadré de lecture, liste finale, tableau, comparaison : balisage et classes du DS (comparés aux pages Préciphar).
- Aucune valeur de couleur, de police ou de logo en dur : tout passe par la charte (`logo` et `logoInverse` sont les SVG du DS).
- Impression : 12 pages A4 pour le document de référence, pas de défilement horizontal à 320 et 390 px.

## 4. Indispensable, à remonter au DS (via Michael)

| Règle (`src/css/engine.css`) | Pourquoi |
|---|---|
| `body{margin:0;padding:32px 0;background:var(--ds-mist)}`, `.vr-restitution{display:flex;flex-direction:column;gap:32px}`, et leur repli à l'impression | Des pages A4 empilées dans une page d'artefact : le DS laisse la galerie fournir fond et espacement. |
| `.va-page{--vd-quote:var(--vd-subtitle)}` | Décision de Martin (23 octobre) : exergue à 24 px. Le DS n'a pas de citation en A4, sa base est de 36 px. |
| `.vr-figures`, `.vr-figure-number` | Décision de Martin : un chiffre dit se lit comme du texte, ligne entière à la taille du chapeau (`va-intro`, 20 px), nombre en `--ds-blue` graisse 600, en liste simple sans filet ni tuile. |
| `.vr-diagram` (masquer le source Mermaid, centrer le SVG, texte de secours) | Carte mentale et parcours dessinés par Mermaid : ce n'est pas une composition du DS. |
| `.vd-table th{text-align:left}` | Le DS obtient l'alignement à gauche des en-têtes par des classes Tailwind (`text-left`) que le moteur n'emporte pas. |

Hors CSS, non DS : la carte (`mindmap`) et le parcours (`journey`) passent par Mermaid (11.12.0, thème tiré de la charte : `mermaidTheme`). Le DS n'a pas de carte mentale.

## 5. Ce que le DS n'a pas, et ce que le moteur fait à la place

- **Exergue** : `vd-pullquote` du DS, sans `figcaption` (la source est obligatoire dans `DocumentPullQuote` ; une phrase de la personne n'en a pas). Taille 36 px, celle de `components.css`.
- **Chiffre dit** : texte, pas tuile (décision de Martin) ; `DocumentMetric` exige période, population, limite et source que la personne ne donne pas.
- **Flux de plus de 3 étapes** : `DocumentJourney` du DS est limité à trois temps et `DocumentFlow` à quatre cartes. Le moteur emploie le même `vd-journey` (variante « travel », sans pictogramme ni état) pour n étapes.
- **Cases** : un cas n'a pas de titre de page, son intertitre numéroté ouvre la page (`vd-subheading-number` existe dans le DS).
- **Kicker** : retiré (décision du 23 octobre).

## 6. Décisions de Martin appliquées (0.1.2)

Exergue à 24 px ; chiffres comme du texte (20 px, nombre bleu 600) ; page de synthèse sur le modèle de Préciphar (`###` dans un `recit` : intertitre 24 px, graisse 600, `header` du DS, `va-reading-section`, conclusion filetée `va-takeaway`) ; pas de pictogramme par étape ; couverture avec « Pour … » et objectif.

## 6 bis. Questions qui étaient ouvertes

1. **Taille de l'exergue.** En A4 le DS n'a pas de citation : le moteur prend les 36 px de la base. C'est la chose la plus grosse de la page. Alternative qui reste dans le DS : composer l'exergue à la taille de `va-takeaway` (24 px) ou de l'intertitre. Cela demande une règle ou une variante au DS.
2. **Chiffres dans la phrase.** Le nombre est à 1,55 em de la phrase (36 px), soit 56 px, face aux 96 px de la page de preuve du DS. Même question.
3. **Pictogrammes dans les parcours.** Le DS en met un par étape ; le moteur n'en met pas (aucun pictogramme n'est dit par la personne).

## 7. Captures (`dist/captures/`)

Côte à côte, Préciphar A4 à gauche, page MIROIR à droite : `cmp-ds-couverture.png`, `cmp-ds-synthese.png`, `cmp-ds-sujet.png` (page Préciphar « Le constat » contre un cas), `cmp-ds-chiffres.png` (Préciphar n'a pas de chiffres en A4 : on compare son tableau de la page « Les usages » à la page de chiffres), `cmp-ds-fin.png` (page finale sur nuit contre « Les repères »). Versions réduites `*-small.png`. Pages seules dans `dist/captures/ds/` (`preciphar-*`, `miroir-00` à `miroir-11`, `genres-00` à `genres-08`), planche `ds-genres-sheet.png`.
