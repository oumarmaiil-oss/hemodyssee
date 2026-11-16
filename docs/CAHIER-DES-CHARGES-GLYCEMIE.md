# Cahier des charges : Glucodyssée, le voyage du sucre (version 2)

> Simulateur pédagogique de la glycémie et du diabète. Projet **séparé** d'Hémodyssée (nouveau dépôt,
> nouveau lien), conçu pour pouvoir fusionner plus tard. Auteur : Dr O. Sow, pharmacien, Dakar.
> Version 2 du 16 novembre 2026 : sources vérifiées, **moteur de glycémie écrit et calibré (10 tests)**,
> **prototype interactif en ligne**, parcours scénarisé étape par étape, idées qui rendront le projet unique.

**Ce qui existe déjà**
- Moteur : [`docs/glucodyssee/moteur-glycemie.mjs`](glucodyssee/moteur-glycemie.mjs), tests : [`docs/glucodyssee/moteur-glycemie.test.mjs`](glucodyssee/moteur-glycemie.test.mjs) (`node --test`).
- Prototype interactif (privé, compte du Dr Sow) : https://claude.ai/artifact/D2QLvZDHcRrkAApRp6V3Xv
- Base technique de référence : dépôt `oumarmaiil-oss/hemodyssee`, application https://oumarmaiil-oss.github.io/hemodyssee/

---

## 0. Prompt de démarrage (à coller dans une nouvelle conversation)

```
Je suis le Dr O. Sow, pharmacien à Dakar. On construit Glucodyssée, simulateur pédagogique de la
glycémie et du diabète, séparé d'Hémodyssée mais sur la même base technique et les mêmes principes.
1. Lis en entier ce cahier des charges :
   https://github.com/oumarmaiil-oss/hemodyssee/blob/main/docs/CAHIER-DES-CHARGES-GLYCEMIE.md
2. Reprends le moteur déjà calibré et ses tests (docs/glucodyssee/ du dépôt oumarmaiil-oss/hemodyssee) :
   ne change pas ses repères sans me le dire ; les 10 tests doivent rester au vert.
3. Inspire-toi du code d'Hémodyssée pour la structure, l'interface, le service worker, les licences,
   le bouton Contact, l'aide à l'installation, la voix off, le bilan et les tests.
4. Le dépôt du projet est oumarmaiil-oss/glucodyssee (je l'ai créé vide sur GitHub) : ajoute-le à la session.
5. Construis par lots, dans l'ordre du chapitre 10, en testant chaque lot sur un écran de 360 px.
Sois co-chef de projet : oppose-toi à moi quand c'est justifié et dis pourquoi. Vérifie les chiffres
médicaux sur le web en croisant les sources. Réponds en français.
```

---

## 1. Vision : ce qui rendra Glucodyssée unique

Un outil gratuit, en français, pensé pour l'Afrique de l'Ouest, qui fait **voir** le diabète au lieu de le décrire.

| Idée | Pourquoi c'est fort |
|---|---|
| **Capteur de glucose virtuel** : courbe sur 24 h, temps dans la cible, HbA1c estimée | Les indicateurs modernes (consensus international 2019), visibles sans capteur réel |
| **Courbe fantôme « sans traitement »** sous la courbe du patient | On voit d'un coup d'œil ce que chaque traitement apporte (déjà dans le prototype) |
| **Chaque classe s'allume là où elle agit** (foie, pancréas, intestin, rein…) | Comprendre une association = voir plusieurs sites d'action à la fois |
| **L'assiette sénégalaise** : thiéboudienne, yassa, mafé, thiéré, lakh, fondé, pain, café Touba sucré, bissap… | Personne ne le fait ; c'est ce qui parle aux patients et aux soignants d'ici |
| **Mode Ramadan** : sahur et ndogu, score de risque IDF-DAR, comparaison des traitements | Sujet majeur au Sénégal, peu d'outils visuels |
| **Le piège de l'HbA1c basse** : une HbA1c « parfaite » peut cacher des hypoglycémies | Message clinique fort, déjà dans le prototype |
| **Rein malade** : accumulation des sulfamides et de l'insuline, adaptation des doses | Point clé pour les pharmaciens (déjà simulé) |
| **Idées reçues** : « l'insuline rend aveugle », « on arrête quand la glycémie est normale »… | Lever les freins au traitement, dans la langue du terrain |
| **Gestes du quotidien** : stylo à insuline, rotation des sites, conservation à la chaleur, lecteur, kit hypo | Le rôle concret du pharmacien et de l'éducation thérapeutique |
| **Évolution sur 10 ans** avec jauges de complications et lien vers Hémodyssée | Montrer ce qu'on évite, comme dans Hémodyssée |

---

## 2. Repères médicaux vérifiés (à citer dans l'application)

| Repère | Valeur | Source (vérifiée le 16/11/2026) |
|---|---|---|
| Diabète | HbA1c ≥ 6,5 % ; glycémie à jeun ≥ 1,26 g/L (2 fois) ; ≥ 2,00 g/L à 2 h de l'HGPO 75 g ; ≥ 2,00 g/L à tout moment avec symptômes | ADA, *Standards of Care 2025*, section 2 |
| Prédiabète | HbA1c 5,7-6,4 % ; glycémie à jeun 1,00-1,25 g/L (ADA) ou 1,10-1,25 g/L (OMS) | ADA 2025 ; OMS |
| Hypoglycémie | niveau 1 < 0,70 g/L ; niveau 2 < 0,54 g/L ; niveau 3 = besoin de l'aide d'un tiers | ADA (classification en 3 niveaux) |
| Resucrage | règle des « 15 » : 15 g de sucre rapide, contrôle après 15 min, recommencer si < 0,70 ; glucagon si la personne ne peut pas avaler | ADA |
| Temps dans la cible | 0,70-1,80 g/L plus de 70 % du temps ; < 0,70 moins de 4 % ; < 0,54 moins de 1 % | Consensus international, Battelino et al., *Diabetes Care* 2019 (le seuil de 4 % est à reconfirmer sur l'article original) |
| HbA1c ↔ glycémie moyenne | glycémie moyenne (mg/dL) ≈ 28,7 × HbA1c − 46,7 | Étude ADAG, Nathan et al., 2008 |
| Seuil rénal du glucose | ≈ 1,80 g/L ; abaissé par les iSGLT2 (≈ 60-80 g de glucose urinaire par jour) | Physiologie ; données dapagliflozine |
| Efficacité comparée | metformine ≈ sulfamides ≈ iSGLT2 > iDPP-4 (écart ≈ 0,2-0,4 point d'HbA1c) ; aGLP-1 parmi les plus puissants ; insuline sans plafond | Méta-analyses et guide de l'ACP ; fourchettes exactes à confirmer dans le tableau de la section 9 des *Standards* ADA |
| Ramadan : score IDF-DAR 2021 | risque faible 0-3 ; modéré 3,5-6 ; élevé > 6. Points de traitement : glibenclamide 1 ; gliclazide LM, glimépiride, répaglinide 0,5 ; insuline basale 1,5 ; mélange 1 fois/j 2 ; basal-bolus ou pompe 2,5 ; mélange plusieurs fois/j 3 | Résumés concordants du guide IDF-DAR 2021 (à confirmer sur le PDF officiel) |
| Ramadan : conduite | éviter le glibenclamide ; réduire de 25 à 50 % les doses d'insuline et de sulfamide | Résumés IDF-DAR 2021 |
| Insuline et chaleur | les canaris (pots en terre) et pochettes rafraîchissantes baissent la température de 2,7 à 8,3 °C ; l'insuline humaine garde son activité entre 4 et 37 °C (revue Cochrane, 17 études) ; **aucune étude ne prouve directement l'efficacité du canari sur la puissance de l'insuline** | Ogle et al., *Diabetic Medicine* 2016 ; revue Cochrane |
| Sénégal | prévalence du diabète 3,4 % (STEPS 2015) ; 4,2 % (STEPS 2024, selon la presse) ; 5,4 % à 45-59 ans ; insuline subventionnée | ANSD / ministère de la Santé ; *Le Soleil* 2025 |

Sources : [Standards ADA 2025 (résumé)](https://ada.silverchair-cdn.com/ada/content_public/journal/clinical/issue/43/2/8/abridged-standards-of-care.pdf) · [classification des hypoglycémies (ADA)](https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-hcp-5-27-25.pdf) · [consensus temps dans la cible](https://pubmed.ncbi.nlm.nih.gov/31177185/) · [IDF-DAR, résumé](https://redwhale.co.uk/pearls/ramadan-impact-on-diabetes-and-other-chronic-diseases) · [conservation de l'insuline : dispositifs locaux](https://lifeforachild.org/2017/02/06/keeping-insulin-cool/) · [Cochrane : insuline et température](https://www.cochrane.org/pl/about-us/news/human-insulin-less-temperature-sensitive-previously-thought) · [STEPS Sénégal 2015](https://www.vie-publique.sn/documents/9921/enquete-nationale-facteurs-risque-maladies-non-transmissibles-steps-senegal-2015-ansd) · [Le Soleil : progression du diabète](https://lesoleil.sn/actualites/sante/la-progression-inquietante-du-diabete-au-senegal/) · [guide ACP, traitements oraux](https://www.acpjournals.org/doi/10.7326/M16-1860)

À vérifier avant publication : seuils de fonction rénale par classe (KDIGO 2022, ADA : metformine pleine dose si DFG ≥ 45, dose réduite entre 30 et 44, arrêt sous 30 ; iSGLT2 débutables jusqu'à un DFG de 20 pour la protection rénale ; iDPP-4 à adapter sauf linagliptine ; préférer le gliclazide au glibenclamide), valeurs glucidiques des plats locaux (table de composition des aliments d'Afrique de l'Ouest FAO/INFOODS 2019), disponibilité réelle des molécules au Sénégal.

---

## 3. Le moteur de glycémie (déjà écrit et calibré)

**Fichier** : `docs/glucodyssee/moteur-glycemie.mjs` (JavaScript sans dépendance, à passer en TypeScript dans le projet).
Inspiré du modèle minimal de Bergman et de l'absorption des repas de Dalla Man, très simplifié.

**Ce qu'il simule, minute par minute** (adulte de 70 kg) :
- digestion des repas (estomac → intestin → sang), ralentie par les aGLP-1 ;
- sécrétion d'insuline par les cellules bêta (réponse sigmoïde au glucose, effet incrétine après le repas), insuline injectée (rapide analogue, humaine ordinaire, NPH, mélange 30/70, glargine) ;
- production de glucose par le foie, freinée par l'insuline (le foie voit plus d'insuline endogène que la périphérie), relancée par l'hypoglycémie (contre-régulation sous 0,70 g/L) ;
- captation par le cerveau (sans insuline), par les muscles et la graisse (insuline, saturable, sensibilité réglable), par l'effort ;
- élimination rénale au-dessus du seuil (abaissé par les iSGLT2, plafonnée) ;
- options : effort physique, rein malade (sulfamides et insuline éliminés plus lentement, iSGLT2 moins efficaces sur la glycémie) ;
- statistiques : glycémie à jeun, moyenne, HbA1c estimée (ADAG), temps dans la cible, temps < 0,70 et < 0,54, glucose urinaire ;
- évolution sur 10 ans : perte progressive de la fonction bêta dans le type 2 (≈ 6 %/an), HbA1c par année, indice d'exposition au sucre pour les jauges de complications.

**Résultats de calibration** (type 2 non traité à HbA1c ≈ 8 %) :

| Situation | Résultat du modèle | Repère attendu |
|---|---|---|
| Sujet sain | à jeun 0,90 g/L ; HbA1c 5,0 % ; jamais < 0,70 | normal |
| Prédiabète | à jeun 1,10 g/L | 1,00-1,25 g/L |
| Type 2 | à jeun 1,48 g/L ; HbA1c 8,0 % | diabète |
| Metformine | −0,8 point | ≈ −1 à −1,5 |
| Gliclazide | −1,1 | ≈ −1 à −1,5 |
| iDPP-4 | −0,7 | ≈ −0,5 à −0,8 |
| aGLP-1 | −1,2 | ≈ −1 à −1,5 |
| iSGLT2 | −0,5 ; 80 g de glucose urinaire/j | ≈ −0,5 à −0,8 ; 60-80 g/j |
| Type 1 sans insuline | 3,4 à 8 g/L | hyperglycémie majeure, acidocétose |
| Type 1 glargine 20 U + rapides | 95 % du temps dans la cible | bon équilibre |
| Glibenclamide + déjeuner sauté | plateau à 0,66 g/L | hypoglycémie |
| Gliclazide / iDPP-4, même journée | 0,81 / 1,14 g/L | risque moindre / nul |
| Rein malade + glibenclamide | 0,43 g/L | hypoglycémie profonde |

**Tests** (`node --test docs/glucodyssee/moteur-glycemie.test.mjs`, 10 tests au vert) : sujet sain, prédiabète, type 2,
type 1 avec et sans insuline, fourchette d'effet de chaque classe, additivité, glucose urinaire sous iSGLT2,
ordre du risque d'hypoglycémie (glibenclamide > gliclazide > iDPP-4) au repas sauté et au Ramadan,
rein malade, effort et oubli de bolus en type 1, évolution sur 10 ans.

**Limites à afficher dans l'application** : modèle pédagogique, un seul adulte type de 70 kg, pas de
cinétique des corps cétoniques (l'acidocétose est signalée, pas simulée), HbA1c estimée à partir d'une seule
journée type ; **ne sert jamais à calculer une dose réelle**.

---

## 4. Le parcours, scénarisé étape par étape

Chaque chapitre se joue en **présentation guidée** (voix off, étapes qui attendent la fin de la phrase) ou
**à la main**. Chaque étape : ce qu'on voit (scène, élément mis en évidence) → texte Découvrir → détail
Comprendre/Approfondir → interaction proposée. Les tableaux ci-dessous détaillent les chapitres 1, 3 et 6 ;
les autres suivent le même format.

### Chapitre 1 : le voyage normal du sucre

| Étape | Ce qu'on voit | Texte (Découvrir) | Détail (Comprendre / Approfondir) | Interaction |
|---|---|---|---|---|
| 1 | Assiette, puis intestin qui s'éclaire | Le repas est digéré : les glucides deviennent du glucose. | Amidon → glucose ; vitesse selon le plat (riz blanc rapide, mil plus lent). | Choisir un plat de l'assiette sénégalaise |
| 2 | Particules dorées qui passent dans le sang ; courbe qui monte | Le sucre passe dans le sang : la glycémie monte. | De 0,80-1,00 g/L à jeun vers 1,20-1,40 g/L après le repas. | Curseur « grammes de glucides » |
| 3 | Zoom sur l'îlot de Langerhans | Le pancréas sent le sucre monter. | Cellules bêta : capteur de glucose ; cellules alpha : glucagon. | Toucher une cellule pour son rôle |
| 4 | Petites clés (insuline) qui partent dans le sang | Il libère l'insuline : la clé. | Pic rapide puis sécrétion prolongée ; effet incrétine (GLP-1, GIP) : l'intestin prévient le pancréas. | Montrer la courbe d'insuline |
| 5 | Cellule musculaire : la clé tourne, une porte s'ouvre | La clé ouvre la porte : le sucre entre et donne de l'énergie. | Récepteur de l'insuline → transporteurs GLUT4 à la surface. | Comparer muscle au repos / à l'effort |
| 6 | Foie qui stocke des grains de glycogène | Le foie met le surplus en réserve. | Glycogène ; l'insuline freine aussi la production hépatique. | — |
| 7 | Nuit : le foie relâche du sucre ; courbe plate | Entre les repas et la nuit, le foie libère juste ce qu'il faut. | Glucagon ↑, insuline ↓ ; glycémie stable. | Curseur jour / nuit |
| 8 | Rein : tout le glucose est récupéré | Le rein filtre le sang et garde le sucre. | Réabsorption par SGLT2 jusqu'à ≈ 1,80 g/L. | Faire dépasser le seuil |
| 9 | Courbe 24 h dans la bande verte ; HbA1c 5 % | Toute la journée, la glycémie reste entre 0,70 et 1,80 g/L. | HbA1c : reflet des 3 derniers mois ; temps dans la cible. | « Rejouer avec un diabète » |

### Chapitre 2 : le diabète de type 1
Étapes : attaque auto-immune des cellules bêta → les clés disparaissent → cellules affamées dans un sang
plein de sucre → le foie s'emballe → le rein déborde (soif, urines abondantes, amaigrissement) → corps
cétoniques, acidocétose (urgence) → l'insuline remplace les clés (basal + bolus, ou mélange) → la vie
quotidienne (repas, effort, hypoglycémie, oubli de dose).

### Chapitre 3 : le diabète de type 2, des années de silence

| Étape | Ce qu'on voit | Texte (Découvrir) | Détail | Interaction |
|---|---|---|---|---|
| 1 | Silhouette : tour de taille, sédentarité, hérédité | Le terrain : surpoids au ventre, peu d'activité, famille. | Facteurs de risque ; âge ; Afrique : diagnostic souvent tardif. | Régler le tour de taille et l'activité |
| 2 | Serrures grippées sur les cellules | Les portes répondent mal à la clé : c'est la résistance à l'insuline. | Muscle, foie, graisse. | Curseur « sensibilité » |
| 3 | Le pancréas travaille double ; glycémie encore normale | Le pancréas compense en produisant plus d'insuline. | Hyperinsulinisme ; des années sans symptôme. | Voir la courbe d'insuline monter |
| 4 | Courbe à jeun qui frôle 1,10 | Le prédiabète : le moment idéal pour agir. | Glycémie à jeun 1,00-1,25 g/L (ADA) ; HbA1c 5,7-6,4 %. | Activité physique et perte de poids |
| 5 | Cellules bêta qui s'éteignent une à une | Le pancréas s'épuise peu à peu. | Fonction bêta ≈ −4 à −6 %/an. | Avancer les années |
| 6 | Courbe au-dessus de 1,26 à jeun, pics à 3 g/L | Le diabète s'installe, souvent sans rien sentir. | Critères diagnostiques. | — |
| 7 | Foie qui produit trop la nuit | La glycémie du matin est haute : le foie travaille la nuit. | Production hépatique non freinée. | Comparer avant / après metformine |
| 8 | Jauges yeux, reins, nerfs, cœur qui montent | Sans traitement, les complications arrivent avec les années. | Exposition cumulée ; effet mémoire (UKPDS). | Lien « voir les artères dans Hémodyssée » |
| 9 | Escalier thérapeutique, marche par marche | Le traitement s'ajoute par étapes. | Mesures + metformine → 2e classe → … → insuline. | Ajouter les classes une à une |

### Chapitre 4 : le diagnostic
Critères (tableau du chapitre 2), prédiabète, type 1 ou type 2 (âge, rapidité, amaigrissement, cétose,
anticorps), bilan initial (fonction rénale, albuminurie, lipides, fond d'œil, pieds, PA).

### Chapitre 5 : les traitements, classe par classe
Pour chaque classe : où elle agit (le site s'allume), effet sur la courbe, avantages, effets indésirables,
précautions (rein, Ramadan, hypoglycémie), arrêt. Ordre : mesures hygiéno-diététiques → metformine →
sulfamides (gliclazide de préférence, glibenclamide à éviter chez le sujet âgé, l'insuffisant rénal et au
Ramadan) → iDPP-4 → aGLP-1 → iSGLT2 → insulines (humaines : ordinaire, NPH, mélange 30/70, les plus
disponibles ; analogues : glargine, asparte, lispro). Stratégie type 2 : iSGLT2 ou aGLP-1 en cas de maladie
cardiovasculaire, d'insuffisance cardiaque ou rénale, indépendamment de l'HbA1c (ADA 2025).

### Chapitre 6 : l'hypoglycémie

| Étape | Ce qu'on voit | Texte (Découvrir) | Détail | Interaction |
|---|---|---|---|---|
| 1 | Courbe qui passe sous la ligne rouge | Sous 0,70 g/L, c'est l'hypoglycémie. | Niveaux 1, 2, 3 (ADA). | — |
| 2 | Silhouette : sueurs, tremblements, faim, cœur rapide, confusion | Les signes : sueurs, tremblements, faim, malaise. | Signes adrénergiques puis neuroglucopéniques. | Toucher chaque signe |
| 3 | Scénario « sulfamide + repas sauté » | La cause la plus fréquente : un médicament qui baisse le sucre et un repas sauté. | Sulfamides, insuline, alcool, effort, rein malade. | Comparer glibenclamide / gliclazide / iDPP-4 |
| 4 | 15 g de sucre (3 morceaux, un demi-verre de jus), minuteur 15 min | La règle des 15 : 15 g de sucre, on attend 15 minutes, on recontrôle. | Puis collation ; glucagon si la personne ne peut pas avaler. | Rejouer la remontée sur la courbe |
| 5 | HbA1c « verte » à 4,5 % avec 59 % du temps en hypoglycémie | Attention : une HbA1c trop belle peut cacher des hypoglycémies. | Intérêt du temps dans la cible. | Le piège, en direct |

### Chapitre 7 : les complications
Petits vaisseaux (rétinopathie, néphropathie, neuropathie), gros vaisseaux (infarctus, AVC, artériopathie :
lien Hémodyssée), pied diabétique (prévention, examen des pieds), évolution sur 10 ans sans / avec / arrêt du traitement.

### Chapitre 8 : la vie réelle au Sénégal
- **Ramadan** : sahur et ndogu ; calcul pédagogique du score IDF-DAR ; quand rompre le jeûne (glycémie < 0,70 ou > 3,00 g/L, malaise) ; adaptation des doses.
- **L'assiette sénégalaise** : charge glucidique des plats courants, portions, ordre des aliments, boissons sucrées (bissap, café Touba, sodas) ; ton non culpabilisant ; valeurs sourcées sur la table FAO/INFOODS d'Afrique de l'Ouest.
- **Conservation de l'insuline** : réserve au frais (2-8 °C), flacon en cours à température ambiante, jamais au soleil ni au congélateur ; canari et pochettes : ils rafraîchissent, preuve directe sur la puissance encore manquante.
- **Effort physique**, **voyage**, **fêtes** (Tabaski, Korité), **diabète gestationnel** (bref).

### Chapitre 9 : idées reçues (à valider avec des soignants sénégalais)
« L'insuline rend aveugle ou fait amputer » (ce sont les complications du diabète mal équilibré) ;
« le diabète vient seulement du sucre » ; « on arrête le traitement quand la glycémie est normale » ;
« les tisanes guérissent le diabète » ; « la metformine abîme les reins » ; « un diabétique ne doit plus manger de riz ».
Chaque idée : ce qui est vrai, ce qui est faux, et une démonstration dans le simulateur.

---

## 5. Les scènes

| Vue | Contenu | Interactions |
|---|---|---|
| Corps | intestin, sang, pancréas, foie, muscles, graisse, reins, cerveau ; particules de glucose | toucher un organe pour zoomer |
| Îlot de Langerhans | cellules bêta (insuline) et alpha (glucagon) | curseur « fonction bêta » |
| Cellule | récepteur, porte GLUT4, clé ; serrure grippée en type 2 | effet de la metformine et de l'effort |
| Foie | glycogène, production nocturne | jour / nuit |
| Rein | filtration, SGLT2, seuil, glucose urinaire | effet des iSGLT2, rein malade |
| Courbes | glycémie 24 h avec courbe fantôme, insuline, HbA1c sur 10 ans | repas, doses, injections, effort |

Chaque classe a sa couleur et s'allume à son site d'action (comme dans Hémodyssée).

---

## 6. Contenu à rédiger (`src/content`)
- **Fiches** : type 1, type 2, prédiabète, hypoglycémie, acidocétose, diabète gestationnel, complications (plan des fiches d'Hémodyssée, 3 niveaux).
- **Classes** (7) : nom, DCI, site d'action, mécanisme (3 niveaux), effet visible, effets indésirables, arrêt, précautions (rein, Ramadan, hypoglycémie).
- **Cas cliniques** (8 à 10) : adolescent en cétose ; découverte de type 2 au bilan ; malaise sous glibenclamide ; type 2 avec antécédent d'infarctus ; type 2 et maladie rénale ; Ramadan sous insuline ; diabète gestationnel ; plaie du pied.
- **Présentations guidées** : « Le voyage du sucre », « Le type 1 », « Le type 2 : des années de silence », « L'hypoglycémie », « Ramadan ».
- **Bilan du traitement** : HbA1c (souvent < 7 %, individualisée), glycémie à jeun ≈ 0,80-1,30 g/L, après repas < 1,80 g/L, temps dans la cible > 70 %, aucune hypoglycémie ; rappel PA et LDL (lien Hémodyssée) ; test de cohérence fiche ↔ bilan comme dans Hémodyssée.

---

## 7. Exigences d'ergonomie (leçons d'Hémodyssée, dès le premier jour)
1. Chaque scène tient en entier dans la zone libre dès l'ouverture (360 px, tablette, ordinateur).
2. Mention permanente des gestes possibles + animation à chaque chargement (appareil prêté).
3. Zoom + / −, pincement, plein écran, « Tout voir ».
4. « Tout retirer » visible dès qu'un traitement ou une maladie est appliqué ; « Réinitialiser » avec « Annuler ».
5. Barre de glissement tactile + bouton « Haut » ; signature en fin de panneau sur téléphone.
6. Boutons nommés ; un seul bouton « Capturer ».
7. Cibles tactiles ≥ 44 px ; champs en 16 px.
8. Fluidité adaptative ; mises à jour économes en données.
9. Aide à l'installation selon le navigateur.
10. Contact WhatsApp avec contexte ; mention Bêta ; avertissement ; sources accessibles.
11. Graphiques dessinés à la taille réelle de l'écran (leçon du prototype : textes lisibles sur téléphone).
12. Une HbA1c basse avec hypoglycémies n'est jamais affichée en vert.

---

## 8. Architecture (pour fusionner plus tard avec Hémodyssée)
- Même pile (Vite, React, TypeScript, Tailwind 4), mêmes jetons de couleur et noms de composants.
- Composants à extraire en « noyau commun » à terme : Contact, Installer, Défilement, Scène (zoom, plein écran), voix off, service worker.
- Liens entre les deux : `?patho=diabete` ouvre Hémodyssée avec le diabète ; Glucodyssée renvoie vers les artères.
- Couleur propre : **miel** (le sucre) au lieu du rouge d'Hémodyssée.

---

## 9. Décisions par défaut (proposées par le co-chef de projet, à confirmer)

| Question | Proposition | Pourquoi |
|---|---|---|
| Nom | **Glucodyssée** | Même famille qu'Hémodyssée, le voyage du sucre |
| Classes simulées | les 7 du chapitre 5 ; acarbose, glinides et glitazones cités sans être simulés | Rester lisible ; ce sont les classes majeures |
| DCI mises en avant | metformine, gliclazide, glimépiride, glibenclamide (pour expliquer pourquoi l'éviter), sitagliptine, vildagliptine, dapagliflozine, empagliflozine, liraglutide, dulaglutide, sémaglutide ; insulines humaines (ordinaire, NPH, 30/70) et analogues | Refléter l'usage au Sénégal (à confirmer par le Dr Sow) |
| Référentiels | ADA *Standards of Care* (2025/2026), IDF-DAR 2021, KDIGO 2022, SFD | Les plus utilisés et les plus récents |
| Ramadan | chapitre complet | Enjeu majeur et différenciant |
| Mode labo | non | Pas de gamme commerciale pour l'instant |

---

## 10. Plan de construction

| Lot | Contenu | État / validé quand… |
|---|---|---|
| 0 | Moteur + tests + prototype | **fait** (16/11/2026) |
| 1 | Dépôt `glucodyssee` : base Hémodyssée (build, déploiement, service worker, licences, Contact, installation, signature), moteur passé en TypeScript avec ses tests | le site vide s'installe et fonctionne hors ligne ; 10 tests au vert |
| 2 | Vue Corps + courbes 24 h (reprendre le prototype) + chapitre 1 | le voyage du sucre se joue étape par étape sur 360 px |
| 3 | Vues Îlot, Cellule, Foie, Rein | chaque classe s'allume à son site d'action |
| 4 | Chapitres 2 et 3 + évolution sur 10 ans + jauges | sans / avec / arrêt visibles |
| 5 | Chapitre 5 + panneau des traitements + bilan + test de cohérence | cohérence fiche ↔ bilan au vert |
| 6 | Chapitres 6, 7, 8 (assiette sénégalaise, Ramadan, conservation) | relecture médicale par le Dr Sow |
| 7 | Chapitre 9 (idées reçues), cas cliniques | relecture par des soignants |
| 8 | Présentations guidées, voix off, teaser vidéo | une présentation s'enchaîne seule |
| 9 | Finitions ergonomiques, 5 tailles d'écran, référencement, GoatCounter | aucun chevauchement, aucune erreur |
| 10 | Phase 1 avec médecins et pharmaciens | retours corrigés |

**Pour démarrer le lot 1**, le Dr Sow crée le dépôt vide `glucodyssee` sur GitHub (github.com/new, public,
sans fichier) : la session Claude ne peut pas créer de dépôt elle-même, mais peut ensuite l'ajouter et y travailler.
