# Sprites pixel de l'équipe

Personnages en pixel art, façon calques (« paper doll ») : un corps de base + des objets par catégorie,
tous sur la même grille. C'est le seul dessin des persos de tout le bureau (vues isométrique et 2D,
portraits, éditeur du chef) : les anciens persos vectoriels ont été retirés (`web/js/svg/people.js`, voir l'historique git 0.29.0).

## Grille
- 40×64 px (8 px de marge au-dessus de la tête pour les chapeaux hauts), 60 images = 15 poses × 4 :
  debout, marche face, marche dos, assis (dos, tape), boit, tape (face, assis), hourra, hourra dos, parle,
  porte (plateau, assiette, papiers), joue (atteint devant), joue dos, verse, chef d'orchestre, lit.
  L'ordre exact, les décalages de tête et les points d'accroche des mains : `rig.json`.
- Face = 3/4 tourné vers le bas-droite ; le jeu retourne l'image pour les autres directions.
- Lumière en haut à droite. Contour foncé côté ombre, plus doux côté lumière.

## Fichiers
| Chemin | Rôle |
|---|---|
| `src/base_character.piskel` | corps (`body`) et ombre (`shadow`) ; les autres calques = tenue par défaut, pour référence |
| `src/<catégorie>/template.piskel` | gabarit : calque `ref` (le perso en transparence), `behind` et `item` vides |
| `src/<catégorie>/<objet>.piskel` | un objet : calque `item`, et `behind` pour ce qui passe derrière le corps (cape, jetpack, katana) |
| `src/props/<objet>.piskel` | ce que tient une main (1 ou 2 images, sa taille à lui) ; point de prise dans `props.json` |
| `palettes.json` | rampes de couleurs (7 tons), variantes, rampes par catégorie / objet, tenue par défaut |
| `rig.json` / `props.json` | écrits par make_pack : poses, ancres des mains ; prise de chaque objet tenu |
| `tools/make_pack.py` | régénère base, gabarits et objets de départ : **réécrit ces fichiers-là** (une retouche faite dans Piskel sur l'un d'eux serait perdue : enregistre-la sous un autre nom) |
| `tools/build_sprites.py` | vérifie les sources et écrit `web/sprites/atlas.png`, `props.png` et `atlas.json` |

Catégories, de l'arrière vers l'avant : `body`, `bottom`, `shoes`, `top`, `extra`, `face`, `beard`, `hair`,
`glasses`, `hat` (+ les objets tenus, dessinés à la main).

## Ajouter un objet
1. Ouvrir `src/<catégorie>/template.piskel` dans https://www.piskelapp.com (Import → .piskel).
2. Dessiner sur le calque `item` (onion skin pour suivre l'image précédente). 4 images « debout » suffisent
   pour un objet de la tête (chapeau, lunettes…) : le build les recopie sur les autres poses en suivant la tête.
3. Pour qu'il change de couleur : dessiner avec la rampe source de sa catégorie (`palettes.json`).
4. Save → Save offline as File → `src/<catégorie>/<nom>.piskel`.
5. `python3 -I app/sprites/tools/build_sprites.py`, puis recharger `/sprites`.

Un objet avec ses propres rampes ou couleurs par défaut : l'ajouter à `ITEM_META` (make_pack.py) ou
directement dans `palettes.json` → `items`.

## Dans le bureau
`web/js/svg/pixelpeople.js` traduit l'apparence d'un perso (coupe 0-8, tenue, barbe, lunettes, chapeau,
couleurs → variante la plus proche) en tenue du pack et compose ses images : `IsoAvatar.image()` (`web/js/svg/iso.js`) prend
directement le canvas, tout le reste passe par `personSvg()` (`web/js/svg/people.js`), qui renvoie l'image en SVG.
