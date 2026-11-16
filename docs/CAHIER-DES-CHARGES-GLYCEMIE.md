# Cahier des charges : simulateur de la glycémie et du diabète

> Nom de travail : **Glucodyssée : le voyage du sucre** (à confirmer par le Dr O. Sow).
> Projet **séparé** d'Hémodyssée (nouveau dépôt, nouveau lien), conçu pour pouvoir fusionner plus tard.
> Auteur : Dr O. Sow, pharmacien, Dakar. Rédigé le 16 novembre 2026.

---

## 0. Prompt de démarrage (à coller dans la nouvelle conversation)

```
Je suis le Dr O. Sow, pharmacien à Dakar. Je veux créer un nouveau simulateur pédagogique,
séparé d'Hémodyssée mais construit sur la même base technique et les mêmes principes.
Lis d'abord en entier ce cahier des charges :
https://github.com/oumarmaiil-oss/hemodyssee/blob/main/docs/CAHIER-DES-CHARGES-GLYCEMIE.md
Puis inspire-toi du code d'Hémodyssée (dépôt oumarmaiil-oss/hemodyssee) pour la structure,
l'interface, le service worker, les licences, le bouton Contact, l'aide à l'installation, la voix off
et les tests. Application en ligne de référence : https://oumarmaiil-oss.github.io/hemodyssee/
Construis par lots, dans l'ordre du chapitre 11, en testant chaque lot sur téléphone (360 px)
avant de passer au suivant. Sois co-chef de projet : oppose-toi à moi quand c'est justifié et dis pourquoi.
Réponds-moi en français.
```

---

## 1. Objectif et public

**Objectif** : faire **voir** comment le corps règle le sucre dans le sang, ce qui se dérègle dans le
diabète de type 1 et de type 2, et **où et comment agit chaque classe de traitement**, étape par étape.

**Publics** (3 niveaux de lecture, comme Hémodyssée) :
- **Découvrir** : patients, familles, lycéens : images, mots simples, l'essentiel ;
- **Comprendre** : étudiants, infirmiers, délégués médicaux : mécanismes et chiffres clés ;
- **Approfondir** : médecins, pharmaciens, internes : physiopathologie, critères, stratégie.

**Principes** (repris d'Hémodyssée, non négociables) :
- version publique en **DCI** (aucune marque hors d'un éventuel « mode labo » caché) ;
- **mobile d'abord** : tout doit tenir et rester lisible sur un écran de **360 px** ;
- **gratuit, hors connexion**, installable (application web progressive) ;
- contenu **sourcé** (ADA/EASD, IDF, recommandations françaises HAS/SFD, IDF-DAR pour le Ramadan) ;
- unités : **g/L en premier** (usage au Sénégal), mmol/L en second (1 g/L = 5,55 mmol/L) ;
- avertissement : outil pédagogique, ne remplace pas l'avis médical.

---

## 2. Base technique (reprendre Hémodyssée)

Dépôt de référence : `oumarmaiil-oss/hemodyssee`. Reprendre à l'identique ou en l'adaptant :

| Élément | Où le trouver dans Hémodyssée |
|---|---|
| Vite + React + TypeScript + Tailwind 4, déploiement GitHub Pages | `package.json`, `vite.config.ts`, `.github/workflows/deploy.yml` |
| Service worker économe (ne retélécharge que les fichiers modifiés) | plugin `serviceWorker()` dans `vite.config.ts` |
| Moteur sans interface, testé (`node --test` via `tsx`) | `src/core/engine.ts`, `src/core/engine.test.ts` |
| Contenu sous forme de données (fiches, classes, cas, présentations) | `src/content/*.ts` |
| Scènes 2D canvas avec zoom, pincement, déplacement, cadrage dans la zone libre | `src/render/zoom2d.ts`, `src/render/corps2d.ts` |
| Présentations guidées avec voix off qui attend la fin de la phrase | `src/content/presentations.ts`, `src/core/voix.ts` |
| Bilan du traitement (objectifs, manquant, en trop, remarques) + test de cohérence | `src/content/evaluation.ts` |
| Bouton Contact WhatsApp avec contexte, signature, licences, aide à l'installation | `src/ui/Signalement.tsx`, `src/ui/Installer.tsx`, `LICENSE`, `LICENCE-CONTENU.md` |
| Barre « Tout retirer », bouton « Réinitialiser » avec Annuler, plein écran, aides au défilement | `src/ui/App.tsx`, `src/ui/Stage.tsx`, `src/ui/Defilement.tsx` |
| Statistiques GoatCounter, données structurées, sitemap, IndexNow | `index.html`, `public/sitemap.xml`, `deploy.yml` |

Licences : **AGPL-3.0** (code) et **CC BY-NC-SA 4.0** (contenu), comme Hémodyssée.
Contact : WhatsApp +221 77 414 47 99 · oumarmaiil@gmail.com · signature « Dr O. Sow ».
GoatCounter : créer un **nouveau code** (ou réutiliser `marsow` avec un chemin distinct).

---

## 3. Le parcours pédagogique, étape par étape

Chaque chapitre est une suite d'**étapes** affichées dans la scène, avec un texte court, un détail
chiffré (niveaux 2-3), et un bouton « étape suivante ». Chaque chapitre peut être lancé en
**présentation guidée** (voix off) ou parcouru à la main.

### Chapitre 1 : la glycémie normale (le voyage du sucre)
1. **Le repas** : les glucides sont digérés en glucose dans l'intestin.
2. **Le passage dans le sang** : la glycémie monte (de 0,80-1,00 à jeun vers 1,20-1,40 g/L après le repas).
3. **Le pancréas détecte** : les cellules bêta des îlots de Langerhans sentent la hausse.
4. **L'insuline est libérée** : un premier pic rapide, puis une sécrétion prolongée.
5. **La clé ouvre la porte** : l'insuline se fixe sur son récepteur, les transporteurs GLUT4 montent à la surface des cellules (muscle, graisse), le glucose entre.
6. **Le foie stocke** : il transforme le surplus en glycogène.
7. **Entre les repas et la nuit** : l'insuline baisse, le glucagon (cellules alpha) fait libérer du glucose par le foie ; la glycémie reste stable.
8. **Le rein filtre et récupère** : sous environ 1,80 g/L, tout le glucose filtré est réabsorbé (SGLT2) ; au-dessus, il passe dans les urines.
9. **Le bilan sur 24 h** : courbe de glycémie avec les 3 repas ; notion d'HbA1c (reflet des 3 derniers mois).

### Chapitre 2 : le diabète de type 1
1. **L'attaque** : le système immunitaire détruit les cellules bêta (auto-immunité), souvent chez l'enfant ou le jeune adulte.
2. **Les clés disparaissent** : l'insuline chute progressivement.
3. **Le sucre reste dehors** : les cellules « affamées » malgré un sang plein de sucre.
4. **Le foie s'emballe** : sans insuline, il continue de libérer du glucose.
5. **Le rein déborde** : sucre dans les urines, soif intense, urines abondantes, amaigrissement.
6. **Le corps brûle ses graisses** : production de corps cétoniques → **acidocétose** (urgence).
7. **Le traitement** : l'insuline remplace les clés (schéma basal + bolus aux repas, ou pompe) ; autosurveillance.
8. **L'équilibre au quotidien** : repas, activité physique, adaptation des doses ; risque d'hypoglycémie.

### Chapitre 3 : le diabète de type 2 (évolution sur des années)
1. **Le terrain** : surpoids abdominal, sédentarité, hérédité, âge.
2. **Les serrures se grippent** : résistance à l'insuline (muscle, foie, graisse).
3. **Le pancréas compense** : il produit plus d'insuline ; la glycémie reste normale (des années, en silence).
4. **Le prédiabète** : glycémie à jeun entre 1,10 et 1,25 g/L.
5. **Le pancréas s'épuise** : la masse et la fonction des cellules bêta diminuent progressivement.
6. **Le diabète s'installe** : glycémie à jeun ≥ 1,26 g/L ; souvent sans symptôme.
7. **Le foie aggrave** : production de glucose excessive la nuit (glycémie du matin élevée).
8. **Les années passent sans traitement** : complications (chapitre 7).
9. **L'escalade thérapeutique** : mesures hygiéno-diététiques → metformine → ajout d'une 2e classe → … → insuline (chapitre 5).

### Chapitre 4 : le diagnostic
1. **Les critères** : glycémie à jeun ≥ 1,26 g/L à deux reprises ; ou glycémie à tout moment ≥ 2,00 g/L avec symptômes ; ou HbA1c ≥ 6,5 % ; ou glycémie ≥ 2,00 g/L 2 h après une charge orale de glucose.
2. **Le prédiabète** : glycémie à jeun 1,10-1,25 g/L (ou HbA1c 5,7-6,4 % selon l'ADA) : moment idéal pour agir.
3. **Type 1 ou type 2 ?** Âge, rapidité d'installation, amaigrissement, cétose, anticorps.
4. **Le bilan initial** : fonction rénale, albuminurie, lipides, fond d'œil, examen des pieds, PA.

### Chapitre 5 : les traitements, classe par classe (chacune visible là où elle agit)
1. **Les mesures hygiéno-diététiques** : alimentation, activité physique, perte de poids. Montrer leur effet sur la résistance à l'insuline.
2. **Metformine** (foie) : moins de glucose produit par le foie, meilleure sensibilité ; première intention en type 2.
3. **Sulfamides hypoglycémiants** (gliclazide, glibenclamide, glimépiride) (pancréas) : forcent la libération d'insuline ; **risque d'hypoglycémie**, surtout si repas sauté ou insuffisance rénale.
4. **Inhibiteurs de la DPP-4** (sitagliptine, vildagliptine) (intestin → pancréas) : prolongent l'action des incrétines ; plus d'insuline seulement quand la glycémie est haute.
5. **Analogues du GLP-1** (liraglutide, dulaglutide, sémaglutide) (pancréas, estomac, cerveau) : plus d'insuline après le repas, moins de glucagon, estomac plus lent, satiété, perte de poids ; bénéfice cardiovasculaire démontré pour certains.
6. **Inhibiteurs du SGLT2** (dapagliflozine, empagliflozine) (rein) : le sucre part dans les urines ; protection du cœur et des reins (lien avec Hémodyssée).
7. **Insulines** : basale (lente), rapide (repas), mélanges ; en type 1 toujours, en type 2 quand les comprimés ne suffisent plus.
8. **La stratégie en type 2** : metformine + mesures ; ajouter un iSGLT2 ou un aGLP-1 en cas de maladie cardiovasculaire, d'insuffisance cardiaque ou rénale (indépendamment de l'HbA1c) ; intensifier par étapes ; objectif d'HbA1c individualisé (souvent < 7 %).
9. **Montrer les associations** : chaque classe ajoutée agit à un endroit différent du corps.

### Chapitre 6 : l'hypoglycémie et les urgences
1. **Hypoglycémie** : glycémie < 0,70 g/L ; signes (sueurs, tremblements, faim, palpitations, confusion, malaise).
2. **Les causes** : sulfamide ou insuline + repas sauté, effort imprévu, alcool, insuffisance rénale.
3. **La conduite à tenir** : règle des « 15 » : 15 g de sucre rapide, contrôle après 15 minutes, recommencer si besoin, puis collation ; glucagon si la personne ne peut pas avaler.
4. **L'acidocétose** (type 1 surtout) : soif, vomissements, haleine fruitée, respiration rapide → urgence.
5. **Le coma hyperosmolaire** (type 2, sujet âgé, déshydratation) → urgence.

### Chapitre 7 : les complications (avec ou sans traitement)
1. **Les petits vaisseaux** : rétinopathie (yeux), néphropathie (reins, albuminurie), neuropathie (nerfs).
2. **Les gros vaisseaux** : infarctus, AVC, artériopathie (lien direct avec Hémodyssée).
3. **Le pied diabétique** : neuropathie + artériopathie + infection → plaie, amputation ; prévention.
4. **L'effet du traitement dans le temps** : évolution sur 5 à 10 ans sans traitement / traitement suivi / traitement arrêté, comme dans Hémodyssée.

### Chapitre 8 : situations de la vie réelle (terrain sénégalais)
1. **Le jeûne du Ramadan** : catégories de risque (IDF-DAR 2021), adaptation des horaires et des doses, sulfamides et insuline à risque, rupture du jeûne si hypoglycémie.
2. **La conservation de l'insuline à la chaleur** : flacons en réserve au frais (2-8 °C), flacon en cours à température ambiante, jamais au soleil ni au congélateur ; solutions locales (canari en terre cuite, pochette rafraîchissante).
3. **L'activité physique** : baisse de la glycémie, collation, prudence sous insuline et sulfamides.
4. **Les repas locaux** : charge glucidique de plats courants (riz, thiéboudienne, mil, pain), à présenter de façon générale et non culpabilisante.
5. **Le diabète gestationnel** (bref) : dépistage, risques, prise en charge.

---

## 4. Les scènes (vues)

| Vue | Ce qu'on voit | Interactions |
|---|---|---|
| **Corps** | intestin, sang, pancréas, foie, muscles, graisse, reins, cerveau ; particules de glucose qui circulent | toucher un organe pour zoomer |
| **Îlot de Langerhans** | cellules bêta (insuline) et alpha (glucagon) ; destruction en type 1, épuisement en type 2 | curseur « masse de cellules bêta » |
| **Cellule** | récepteur de l'insuline, porte GLUT4 qui s'ouvre, glucose qui entre ; serrure grippée en type 2 | voir l'effet de la metformine, de l'activité physique |
| **Foie** | stockage en glycogène, libération la nuit | jour / nuit |
| **Rein (néphron)** | filtration, réabsorption par SGLT2, seuil ≈ 1,80 g/L, glycosurie | effet des iSGLT2 |
| **Courbes** | glycémie sur 24 h (repas, nuit), insuline, HbA1c sur des mois | ajouter ou retirer un repas, une dose |

Chaque classe de traitement s'**allume à l'endroit où elle agit** (couleur propre, comme dans Hémodyssée).

---

## 5. Modèle physiologique simplifié (moteur `src/core`)

Variables d'état (pas de temps : quelques minutes ; vue « années » pour l'évolution) :
- `glycemie` (g/L), `insuline` (relative), `glucagon` (relatif) ;
- `sensibilite` à l'insuline (1 = normal, baisse en type 2) ;
- `masseBeta` (1 = normale ; ≈ 0 en type 1 avancé ; baisse lente en type 2) ;
- `productionHepatique` (augmentée sans insuline, baissée par la metformine) ;
- `absorption` du repas (courbe en cloche après chaque repas) ;
- `seuilRenal` ≈ 1,80 g/L (abaissé par les iSGLT2 : glycosurie) ;
- `hba1c` calculée à partir de la glycémie moyenne (formule ADAG : glycémie moyenne en mg/dL ≈ 28,7 × HbA1c − 46,7).

Effets des classes (ordres de grandeur **à vérifier avec les sources** avant de figer les tests) :

| Classe | Baisse d'HbA1c attendue | Autres effets à simuler |
|---|---|---|
| Metformine | ≈ 1 à 1,5 % | ↓ production hépatique ; pas d'hypoglycémie seule |
| Sulfamides | ≈ 1 à 1,5 % | ↑ insuline même si glycémie basse → hypoglycémie possible |
| iDPP-4 | ≈ 0,5 à 0,8 % | ↑ insuline glucose-dépendante |
| aGLP-1 | ≈ 1 à 1,5 % | ↑ insuline glucose-dépendante, ↓ glucagon, vidange gastrique lente, perte de poids |
| iSGLT2 | ≈ 0,5 à 0,8 % | ↓ seuil rénal (glycosurie), légère perte de poids et de PA |
| Insuline | sans plafond | hypoglycémie si dose trop forte ou repas sauté |

Tests à écrire dès le début (comme `engine.test.ts`) : sujet sain stable entre les repas ; type 1 sans
insuline → hyperglycémie et cétose ; type 2 → glycémie à jeun ≥ 1,26 ; chaque classe baisse l'HbA1c
dans sa fourchette ; sulfamide + repas sauté → hypoglycémie ; iSGLT2 → glycosurie ; cohérence
« fiche ↔ bilan » (le traitement proposé n'est jamais jugé incomplet ni en trop).

---

## 6. Contenu à rédiger (`src/content`)

- **Fiches** (type 1, type 2, prédiabète, hypoglycémie, acidocétose, diabète gestationnel, complications) :
  même plan que les fiches d'Hémodyssée : ce qui se passe (3 niveaux) → ce qu'on voit → conséquences → traitement proposé → arrêt.
- **Classes** (7) : nom, DCI, où elle agit, mécanisme (3 niveaux), effet visible, effets indésirables, arrêt, précautions (fonction rénale, hypoglycémie, Ramadan).
- **Cas cliniques** (8 à 10), par exemple :
  1. Adolescent, soif, amaigrissement, glycémie 3 g/L, cétonurie → type 1, insuline.
  2. Homme de 52 ans, surpoids, bilan de routine, glycémie à jeun 1,40 g/L ×2 → type 2, mesures + metformine.
  3. Diabétique de type 2 sous glibenclamide, malaise à midi, repas sauté → hypoglycémie.
  4. Type 2 avec antécédent d'infarctus → ajout d'un iSGLT2 ou d'un aGLP-1.
  5. Type 2 avec maladie rénale → iSGLT2, adaptation des doses.
  6. Patient sous insuline qui veut jeûner pendant le Ramadan.
  7. Femme enceinte, dépistage du diabète gestationnel.
  8. Plaie du pied chez un diabétique ancien.
- **Présentations guidées** (2 à 3 minutes, voix off) :
  - « Le voyage du sucre » (normal) ;
  - « Le diabète de type 1 » (de l'attaque à l'insuline) ;
  - « Le diabète de type 2 » (des années de silence à l'escalade thérapeutique et à ce qu'on évite) ;
  - « L'hypoglycémie » (causes, signes, règle des 15).
- **Bilan du traitement** : objectifs HbA1c (souvent < 7 %, individualisé), glycémie à jeun ≈ 0,80-1,30 g/L,
  après repas < 1,80 g/L, **aucune hypoglycémie** ; rappel PA et LDL (lien Hémodyssée).

---

## 7. Exigences d'ergonomie (leçons d'Hémodyssée, à appliquer dès le premier jour)

1. **Cadrage** : chaque scène tient entièrement dans la zone libre (hors barres de boutons) dès l'ouverture, sur 360 px, tablette et ordinateur.
2. **Mention permanente** des gestes possibles (glisser, pincer) + animation à chaque chargement (l'appareil peut être prêté).
3. **Zoom + / −, pincement, plein écran, « Tout voir »** sur toutes les scènes.
4. **« Tout retirer »** toujours visible dès qu'une maladie ou un traitement est appliqué ; **« Réinitialiser »** dans l'en-tête ; **« Annuler »** après chaque remise à zéro.
5. **Barre de glissement tactile + bouton « Haut »** dans le panneau ; signature en fin de panneau sur téléphone.
6. **Boutons nommés** (pas d'icône seule incompréhensible) ; un seul bouton « Capturer » (photo ou vidéo).
7. **Cibles tactiles ≥ 44 px**, texte des champs en 16 px (pas de zoom automatique sur iPhone).
8. **Fluidité** : pleine qualité sur les bons téléphones, qualité adaptative si l'appareil peine ; mises à jour économes en données.
9. **Aide à l'installation** selon le navigateur (Safari, Brave, Chrome, navigateurs intégrés Facebook/WhatsApp).
10. **Contact WhatsApp** avec le contexte de l'écran ; mention **Bêta** ; avertissement médical ; sources accessibles.

---

## 8. Plan de construction par lots (avec critère de validation)

| Lot | Contenu | Validé quand… |
|---|---|---|
| 1 | Squelette du projet (copie de la base Hémodyssée : build, déploiement, service worker, licences, Contact, installation, signature) | le site vide s'installe sur téléphone et fonctionne hors ligne |
| 2 | Moteur glycémie + tests (sujet sain, type 1, type 2, 7 classes) | tous les tests passent ; ordres de grandeur vérifiés |
| 3 | Vue Corps + courbe 24 h + chapitre 1 | le voyage du sucre se déroule étape par étape sur 360 px |
| 4 | Vues Îlot, Cellule, Rein, Foie | chaque classe s'allume à son site d'action |
| 5 | Chapitres 2 et 3 (type 1, type 2) + évolution sur des années | l'évolution sans / avec / arrêt du traitement est visible |
| 6 | Chapitre 5 (traitements) + panneau « Ajuster classe par classe » + bilan | test de cohérence fiche ↔ bilan au vert |
| 7 | Chapitres 4, 6, 7, 8 + cas cliniques | relecture médicale complète par le Dr Sow |
| 8 | Présentations guidées + voix off + teaser vidéo | une présentation s'enchaîne seule sans erreur |
| 9 | Finitions ergonomiques (chapitre 7), tests 360 px / tablette / ordinateur, référencement | contrôle sur 5 tailles d'écran sans chevauchement |
| 10 | Phase 1 avec des médecins et pharmaciens, comme pour Hémodyssée | retours recueillis et corrigés |

---

## 9. Points à valider par le Dr O. Sow avant de coder

- [ ] Le nom (Glucodyssée ? autre ?).
- [ ] Les classes à inclure (ajouter acarbose, glitazones, glinides ? les retirer pour rester simple ?).
- [ ] Les DCI réellement disponibles au Sénégal à mettre en avant (glibenclamide, gliclazide, metformine…).
- [ ] Les référentiels à suivre en priorité (ADA/EASD, SFD, recommandations nationales sénégalaises si elles existent).
- [ ] La place du Ramadan et des repas locaux (niveau de détail, ton).
- [ ] Mode labo (gamme commerciale) : oui ou non pour ce simulateur.
