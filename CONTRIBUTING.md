# Contribuer à Hémodyssée

Merci ! Hémodyssée est un outil **bêta**, gratuit, conçu à Dakar pour comprendre le cœur,
la circulation et l'effet des traitements. Toute aide compte, même sans savoir coder.

*English speakers: contributions are welcome in English too. See the short section at the end.*

## Sans coder

- **Signaler une erreur médicale, un bug ou une idée** :
  - dans l'application, bouton vert **Contact** (WhatsApp, contexte joint automatiquement) ;
  - ou sur GitHub : onglet **Issues** → **New issue**, puis choisir le modèle.
- **Relire le contenu médical** : les textes sont dans `src/content/` (fichiers lisibles,
  même sans connaître la programmation). Une référence (recommandation, essai, RCP) aide beaucoup.
- **Traduire** : le wolof et l'anglais sont les priorités. Les traductions médicales doivent
  être relues par un locuteur natif, idéalement soignant.
- **Faire connaître** : bouton **Partager** dans l'application.

## En codant

```bash
git clone https://github.com/oumarmaiil-oss/hemodyssee.git
cd hemodyssee
npm install
npm run dev     # http://localhost:5173/hemodyssee/
npm test        # tests du moteur, du contenu et de la voix off
npm run lint    # vérification du typage
npm run build   # version publiée
```

Organisation :
- `src/core` : moteur physiologique, horloge cardiaque, son, voix off (sans interface) ;
- `src/content` : contenu sous forme de données (maladies, classes, présentations, cas) ;
- `src/render` : cœur 3D (three.js) et scènes 2D (canvas) ;
- `src/ui` : interface React.

Règles :
1. **Une modification = une pull request**, petite et expliquée.
2. `npm test` et `npm run lint` doivent passer.
3. **Contenu médical** : citer la source (recommandation ESC/ESH, essai, RCP) dans la description
   de la pull request. Pas de chiffre sans source.
4. **Mobile d'abord** : tester sur un écran de 360 px de large. Beaucoup d'utilisateurs ont des
   téléphones modestes et des forfaits limités : pas de bibliothèque lourde sans nécessité.
5. **Version publique en DCI** : aucune marque de médicament hors du mode labo.
6. Textes de l'interface en français clair ; code et commentaires en français.

## Licence des contributions

En proposant une contribution, vous acceptez qu'elle soit publiée sous les licences du projet :
**AGPL-3.0** pour le code, **CC BY-NC-SA 4.0** pour le contenu (voir
[`LICENCE-CONTENU.md`](LICENCE-CONTENU.md)). Vous restez auteur de votre contribution et vous
êtes cité dans l'historique du projet.

## Comportement

Voir le [code de conduite](CODE_OF_CONDUCT.md). Respect, bienveillance, et rigueur sur le fond.

---

## English summary

Hémodyssée is a free, open educational web app (French) about the heart, blood circulation,
cardiovascular diseases and their treatments, built in Dakar, Senegal.
Bug reports, medical reviews (with sources), translations and code contributions are welcome.
Run `npm install && npm run dev`; `npm test` and `npm run lint` must pass.
Code is AGPL-3.0-only; educational content is CC BY-NC-SA 4.0.
