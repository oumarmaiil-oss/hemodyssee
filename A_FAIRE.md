# Hémodyssée : reste à faire

Mis à jour le 16 novembre 2026.

## En attente du Dr Sow
- [ ] **Fusionner la pull request n° 1** vers `main` (sinon le site en ligne ne change pas) :
      https://github.com/oumarmaiil-oss/hemodyssee/pull/1
- [x] **GoatCounter** installé (tableau de bord : https://marsow.goatcounter.com).
- [ ] **Adresse mail** à afficher dans la signature (pied de page de `src/ui/App.tsx`) et dans `LICENSE`.
- [ ] **Essai sur un vrai téléphone Android d'entrée de gamme** : fluidité du cœur 3D, ouverture
      de la fenêtre Contact, présentation « HTA non contrôlée ». Les tests ont été faits sur
      téléphone émulé, sans carte graphique : la fluidité réelle n'a pas pu être mesurée.

## Idées à valider
- [ ] **Version wolof** du niveau « Découvrir » (patients). Nécessite une traduction et une
      relecture par un locuteur natif, de préférence un soignant : pas de texte médical en wolof
      sans relecture humaine.
- [ ] **Mode labo** (accès : ouvrir une fois le site avec `?labo` à la fin de l'adresse) : vérifier les dosages et noms de la gamme GHPL dans `src/content/labo.ts`
      (Amloperin®, Tensoplus®, Genvas®, Rixa GH®, Dapagen®) avant usage en visite.
- [ ] **Présentation « HTA non contrôlée »** : relire les textes (`src/content/presentations.ts`,
      id `visite`) avant de la montrer à des médecins.

## Fait le 16 novembre 2026 (suite)
- Son et ralenti déplacés sur la scène (coin haut gauche) ; bouton « Contact » nommé dans l'en-tête.
- Barre d'outils de la scène en icônes sur mobile : tient sur un écran de 360 px.
- Voix off : meilleure voix française de l'appareil (voix « naturelles » en priorité), lecture
  de l'explication de chaque étape, chiffres et unités prononçables (« 152 sur 100 »,
  « moins 52 pour cent »…), l'étape suivante attend la fin de la phrase.
- Mises à jour économes : seuls les fichiers modifiés sont retéléchargés ; polices inutiles retirées.

## Fait le 16 novembre 2026
- Contact par numéro WhatsApp (+221 77 414 47 99) ; le lien par nom d'utilisateur ne fonctionnait pas.
- Bouton « i » et écran À propos supprimés ; signature en bas de page, sources repliables.
- Bouton Contact vert avec pictogramme ; illustration dans la fenêtre Contact.
- Fenêtre Contact adaptée au toucher (texte 16 px, cibles de 40 à 48 px, retour visuel).
- Bandeau des mesures compact sur mobile (83 px → 45 px).
- Zone de toucher de 44 px autour de tous les petits boutons ronds sur écran tactile.
- Qualité adaptative : si le téléphone peine, la scène est redessinée une image sur deux.
- Bouton « Partager l'application » (en haut et dans la signature) : WhatsApp ou partage du téléphone.
- Nouvelle présentation guidée « HTA non contrôlée » : monothérapie → bithérapie → trithérapie
  (marques GHPL en mode labo, DCI sinon), avec un test qui vérifie la cohérence des chiffres.
- Chargement mesuré en 3G simulée : le cœur 3D est déjà préchargé pendant l'écran de bienvenue
  (scène prête 0,3 s après le choix du niveau). Pas de changement nécessaire.
