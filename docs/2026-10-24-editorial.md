# Ouverture corrigible de la lecture

VBA-3299. Base `00b0148`, moteur `0.2.0`, arbre isolé `vauban-restitution-editorial`.

## Besoin et périmètre

MIROIR prépare la formulation « Voici ma lecture de vos cas. Vous pouvez la corriger. ». Le moteur la refusait, car son catalogue ne reconnaissait que deux ouvertures exactes. Ce lot ajoute cette troisième ouverture et la rend préférée dans le catalogue, le message de refus et la documentation.

`PREFERRED_READING_MARK` est un nouvel export public. Les valeurs de `READING_MARK` (« Ma lecture, pas vos mots. ») et de `LEGACY_READING_MARK` (« Lecture de Vauban, pas vos mots. ») restent strictement inchangées. `READING_MARKS` contient désormais les trois lignes. Les documents historiques restent acceptés et affichés tels qu’écrits.

Le parseur ne réécrit aucune ligne. Le titre réservé, les genres acceptés et la citation requise dans chaque point de lecture restent inchangés. Le complément de pagination décrit plus bas corrige uniquement un intertitre isolé ; le CSS et les règles de fidélité ne changent pas.

## Vérifications locales

- Dépendances propres installées par `npm ci`, sans lien symbolique : 49 paquets installés, audit sans vulnérabilité signalée.
- Avant correction : trois échecs et 109 réussites dans les tests ciblés de grammaire et de composition. La nouvelle ouverture était refusée, y compris avant composition, et le refus indiquait encore l’ancienne préférence.
- Après correction : `npx vitest run test/grammar.test.ts test/parity.test.ts test/compose.test.ts` donne **148 tests réussis, trois fichiers, zéro échec et zéro ignoré**. `npm run typecheck`, `npm run lint` et `git diff --check` réussissent.
- Les tests vérifient les exports publics historiques, les trois ouvertures, le contenu conservé après l’ouverture et le rendu entier identique à la référence sauf cette ligne. L’empreinte de référence existante n’est pas actualisée.
- La fixture `33-valid-lecture-corrigible.md` complète le corpus ; les fixtures 20, 31 et 32 restent intactes. Un point sans citation reste refusé avec la nouvelle ouverture.
- Après relecture favorable de la session principale, `npm run build` réussit : distribution Node de 66,0 Kio et chargeur navigateur de 53,5 Kio. Le fichier suivi `dist/browser/restitution.js` est régénéré ; les sources CSS restent inchangées.
- Le créneau de suite complète est ensuite attribué par la session principale : **`npm test`, sept fichiers, 174 tests réussis, zéro échec et zéro ignoré**, y compris les tests du chargeur navigateur. TypeScript et lint, déjà réussis avant cette exécution et sans changement de code ultérieur, ne sont pas répétés.

## Ordre de livraison et limites

Publier d’abord une version du moteur qui accepte la troisième ouverture, puis rendre cette version disponible dans MIROIR avant que sa nouvelle consigne la produise. Les fixtures 31, 32 et 33 ont été copiées dans le lot MIROIR. La comparaison inter-dépôts `node scripts/check-parity.mjs /Users/martinbesson/Code/MIROIR-restitution-editorial/tests/fixtures/debrief/parity` confirme 33 fichiers identiques ; le contrôle du corpus MIROIR passe 34 tests, sans test ignoré. Cette parité locale ne prouve pas la disponibilité du paquet publié.

La relecture indépendante du diff source par la session principale est favorable, sans observation. Aucune publication, release, modification de version, PR, commit ou push n’est effectué dans ce lot.

## Vérification dans Chrome

La session principale a composé puis ouvert deux aperçus locaux avec la distribution construite, le 24 octobre : `/tmp/miroir-editorial-preview-20261024/reading.html` et `full.html`, servis uniquement sur `127.0.0.1:3199`. Le premier comporte une couverture et la lecture réécrite, quatre paragraphes et six citations substantielles exactes. L'ouverture et les paragraphes s'affichent ; capture relue : `/tmp/miroir-editorial-reading-20261024.png`.

Le second reprend les neuf blocs du brouillon final de la recette fictive Guillaume, en remplaçant seulement le bloc de lecture par cet exemple. Le parseur accepte le document ; Chrome compose 24 articles d'environ 1 123 px. Aucun corps vide ni chevauchement de contenu avec le pied de page n'est mesuré. Preuves DOM : `/tmp/miroir-editorial-full-render-20261024.json` et `/tmp/miroir-editorial-full-layout-20261024.json`.

Cette mesure locale ne constitue ni un nouvel entretien avec un hôte, ni une livraison staging, ni une validation de restitution. Le titre isolé observé initialement en bas de l'article 21 relève de VBA-3223 et reçoit le correctif local suivant. Le brouillon enregistré en staging n'est pas modifié.

## Intertitre gardé avec son exergue (VBA-3223, coordination VBA-3314)

Avant correction, l'article 21 se termine par « Où l'information change de sens, à partir de la demande du jeudi 22 », tandis que l'exergue correspondante commence l'article 22. Un intertitre suivi d'une exergue ou d'un schéma est composé dans une enveloppe `va-reading-section` qui contient seulement son titre. La pagination reconnaissait les titres directs, mais pas cette enveloppe. Elle laissait donc l'intertitre sur la page précédente.

La reconnaissance d'un titre inclut maintenant cette enveloppe lorsqu'elle contient uniquement des titres. La règle existante qui garde un titre avec son premier contenu s'applique alors aussi à ce cas. Aucun texte, schéma, format de stockage ou règle de grammaire n'est réécrit.

Le nouveau test de pagination échoue avant correction (un échec et quatorze réussites), puis passe avec le correctif. Les tests ciblés de pagination et du chargeur navigateur donnent 22 réussites sans test ignoré. L'empreinte HTML de référence est actualisée explicitement : restaurer seulement l'ancienne fonction `isTitle` restitue exactement l'ancienne empreinte, ce qui confirme que le script est l'unique différence dans le document composé avant exécution.

Le contrôle Chrome utilise un processus headless et un profil indépendants, sans interface utilisateur partagée. Le même HTML fictif est repris en remplaçant uniquement le script de pagination : `/tmp/vauban-pagination-fixed-full-20261024.html`. Avant/après : `/tmp/vauban-pagination-before-20261024.json` et `/tmp/vauban-pagination-after-20261024.json`. Le titre et son exergue sont désormais ensemble sur l'article 22. Les captures `/tmp/vauban-pagination-after-20261024-21.png` et `-22.png` sont relues. Le document passe de 24 à 25 articles pour garder les titres avec leur contenu ; aucun corps vide, débordement signalé ou chevauchement de pied de page n'est mesuré. Les trois schémas sont rendus, sans repli, et le texte concaténé reste strictement identique avant et après (43 777 caractères, contenu SVG compris).

Cette vérification porte sur le scénario fictif et la largeur A4 stabilisée de Chrome. Elle ne garantit pas toutes les largeurs, polices de repli, moteurs d'impression ou matières indivisibles. Les paragraphes sans titre qui annoncent une liste ne sont pas automatiquement reconnus comme des intitulés ; le présent correctif porte sur les titres structurés.

Après actualisation de l'empreinte, la suite complète autorisée donne **175 tests réussis dans sept fichiers, zéro échec et zéro ignoré**. Build, TypeScript, lint, `git diff --check` et parité des 33 fichiers MIROIR réussissent. La distribution est régénérée : Node 66,2 Kio, navigateur 53,7 Kio. Le complément antérieur des trois ouvertures est conservé.

Le paquet d'intégration local, sans publication, est `/tmp/vauban-editorial-pack-20261024/vaubanhq-restitution-0.2.0.tgz`, version `0.2.0`, SHA-256 `aa048ded1348cd4c549ecc298bc85f84a7b4476e90cb5bb8b528ddd2c4402071`. Il est transmis à la session principale et à l'agent d'intégration pour les contrôles MIROIR. Ce fichier temporaire n'est pas une dépendance à livrer dans le lockfile. L'état initial du lot est conservé avant modification dans `/tmp/vauban-editorial-before-pagination-20261024-213601` (diff binaire et archive des fichiers non suivis).
