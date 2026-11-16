# Hémodyssée — le voyage du sang

Outil pédagogique interactif pour **comprendre et faire comprendre** le cœur, la circulation, les maladies cardiovasculaires et l'effet des traitements.

**En ligne :** https://oumarmaiil-oss.github.io/hemodyssee/

## Ce qu'on peut faire
- **Explorer** : suivre une goutte de sang (veines caves → cœur droit → poumons → cœur gauche → aorte → organes) ; cliquer sur une zone pour zoomer (cœur 3D en coupe et en transparence, ou voyage du sang en 2D).
- **Maladies** : 21 pathologies (HTA, dyslipidémie, valvulopathies, FA, BAV, infarctus, insuffisance cardiaque, AVC, maladie rénale, diabète…) avec leurs conséquences visibles.
- **Traitements** : 13 classes, à ajouter une par une (½, standard, double dose) pour voir l'effet propre de chacune ; traitement proposé ; effets indésirables, associations à éviter, conséquences de l'arrêt.
- **Évolution** : sans traitement, traitement suivi, traitement arrêté, sur 5 ans.
- **Présentations guidées** (HTA, cholestérol, fibrillation atriale), **9 cas cliniques** corrigés, **fiche récapitulative** imprimable ou en PDF, voix off.
- **3 niveaux** : Découvrir, Comprendre, Approfondir. Bruits du cœur synthétisés. Fonctionne hors ligne et s'installe sur l'écran d'accueil.
- **Mode labo** (bouton mallette ou `?labo` à la fin de l'adresse) : gamme commerciale, définie dans `src/content/labo.ts`.

## Organisation du code
- `src/core` : moteur physiologique, horloge du cycle cardiaque, son (sans interface).
- `src/content` : tout le contenu sous forme de données (zones, pathologies, classes, marques). Ajouter une maladie ou corriger un texte se fait ici.
- `src/render` : cœur 3D (three.js, chargé à la demande), voyage du sang, corps et vaisseau en 2D (canvas).
- `src/ui` : interface React.

```bash
npm install
npm run dev     # développement
npm test        # tests du moteur et du contenu
npm run build   # version publiée (déployée automatiquement sur GitHub Pages)
```

## Avertissement
Modèle simplifié à visée pédagogique : il montre les bons sens de variation et les bons ordres de grandeur, pas l'évolution d'un patient réel. Il ne remplace ni l'avis médical ni le RCP des médicaments.

© 2026 Dr O. Sow — tous droits réservés (voir LICENSE).
