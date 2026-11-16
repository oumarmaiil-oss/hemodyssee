/** Zones anatomiques cliquables (en 3D et/ou dans le voyage du sang en 2D). */
import type { Niveau } from '../core/types.ts';

export type ZoneId =
  | 'od' | 'vd' | 'og' | 'vg'
  | 'valveTri' | 'valvePu' | 'valveMi' | 'valveAo'
  | 'noeudSinusal' | 'noeudAV'
  | 'aorte' | 'artPulm' | 'veinesCaves' | 'veinesPulm' | 'coronaires'
  | 'poumons' | 'cerveau' | 'carotides' | 'reins' | 'membres';

export interface Zone {
  id: ZoneId;
  nom: string;
  sang: 'rouge' | 'bleu' | 'mixte' | 'aucun';
  role: Record<Niveau, string>;
  chiffres?: string; // valeurs normales (niveau 2-3)
}

export const ZONES: Record<ZoneId, Zone> = {
  veinesCaves: {
    id: 'veinesCaves', nom: 'Veines caves', sang: 'bleu',
    role: {
      1: 'Le sang qui a nourri tout le corps revient au cœur par deux grosses veines. Il est pauvre en oxygène : on le dessine en bleu.',
      2: 'La veine cave supérieure (tête, bras) et la veine cave inférieure (abdomen, jambes) ramènent le sang désoxygéné vers l\'oreillette droite.',
      3: 'Le retour veineux dépend du gradient entre la pression systémique moyenne de remplissage et la pression de l\'oreillette droite (PVC) ; c\'est la précharge du cœur droit.',
    },
    chiffres: 'PVC normale : 2 à 8 mmHg',
  },
  od: {
    id: 'od', nom: 'Oreillette droite', sang: 'bleu',
    role: {
      1: 'C\'est la salle d\'attente du cœur droit : elle reçoit le sang bleu du corps et le pousse vers le ventricule droit.',
      2: 'Chambre à basse pression qui reçoit le retour veineux systémique. Sa contraction en fin de diastole complète le remplissage du ventricule droit.',
      3: 'Elle contient le nœud sinusal (paroi haute, près de la veine cave supérieure) et le nœud auriculo-ventriculaire (près du sinus coronaire).',
    },
  },
  valveTri: {
    id: 'valveTri', nom: 'Valve tricuspide', sang: 'bleu',
    role: {
      1: 'Une porte à trois battants entre l\'oreillette et le ventricule droits. Elle s\'ouvre pour laisser entrer le sang et se ferme quand le ventricule pousse.',
      2: 'Trois valvules retenues par des cordages. Sa fermeture, en même temps que la mitrale, produit le premier bruit du cœur (B1).',
      3: 'Valve auriculo-ventriculaire droite ; une fuite (insuffisance tricuspide) est le plus souvent fonctionnelle, liée à une dilatation de l\'anneau.',
    },
  },
  vd: {
    id: 'vd', nom: 'Ventricule droit', sang: 'bleu',
    role: {
      1: 'Il envoie le sang bleu vers les poumons pour qu\'il se recharge en oxygène. Il pousse doucement, car les poumons sont tout près.',
      2: 'Paroi fine en forme de croissant, adaptée à la basse pression pulmonaire (environ 25 mmHg en systole contre 120 à gauche).',
      3: 'Très sensible à la post-charge : une hypertension pulmonaire aiguë (embolie) peut le faire défaillir.',
    },
    chiffres: 'Pression systolique : 15 à 30 mmHg',
  },
  valvePu: {
    id: 'valvePu', nom: 'Valve pulmonaire', sang: 'bleu',
    role: {
      1: 'La porte de sortie du cœur droit, vers l\'artère des poumons. Elle empêche le sang de revenir en arrière.',
      2: 'Valve sigmoïde à trois valvules ; sa fermeture participe au deuxième bruit (B2).',
      3: 'La composante pulmonaire de B2 (P2) se renforce en cas d\'hypertension pulmonaire.',
    },
  },
  artPulm: {
    id: 'artPulm', nom: 'Artère pulmonaire', sang: 'bleu',
    role: {
      1: 'C\'est la seule artère qui transporte du sang pauvre en oxygène : elle l\'emmène vers les poumons.',
      2: 'Elle se divise en deux branches, droite et gauche, vers chaque poumon.',
      3: 'PAP systolique normale < 30 mmHg ; elle s\'élève de façon passive quand la pression de l\'oreillette gauche monte (cardiopathie gauche).',
    },
    chiffres: 'PAP systolique normale : 15 à 30 mmHg',
  },
  poumons: {
    id: 'poumons', nom: 'Poumons', sang: 'mixte',
    role: {
      1: 'Dans les poumons, le sang se débarrasse du gaz carbonique et se recharge en oxygène : il repart rouge vif.',
      2: 'Les échanges gazeux se font dans les capillaires autour des alvéoles. Si la pression monte trop en amont du cœur gauche, l\'eau passe dans les alvéoles (œdème pulmonaire).',
      3: 'Pression capillaire pulmonaire ≈ pression de l\'oreillette gauche ; au-delà d\'environ 18 mmHg apparaît la congestion, au-delà de 25 l\'œdème alvéolaire.',
    },
  },
  veinesPulm: {
    id: 'veinesPulm', nom: 'Veines pulmonaires', sang: 'rouge',
    role: {
      1: 'Quatre veines ramènent le sang rouge, riche en oxygène, des poumons vers le cœur gauche.',
      2: 'Seules veines transportant du sang oxygéné ; elles s\'abouchent dans l\'oreillette gauche.',
      3: 'Leur abouchement est le point de départ habituel des foyers de fibrillation atriale (cible de l\'ablation par isolation des veines pulmonaires).',
    },
  },
  og: {
    id: 'og', nom: 'Oreillette gauche', sang: 'rouge',
    role: {
      1: 'Elle reçoit le sang rouge venant des poumons et le pousse vers le ventricule gauche.',
      2: 'Elle se dilate quand la pression monte en aval (valve mitrale malade, ventricule rigide). Son auricule est le lieu où se forment les caillots en cas de fibrillation atriale.',
      3: 'Sa taille reflète la pression de remplissage chronique du ventricule gauche ; la dilatation favorise la FA, et la FA dilate à son tour l\'oreillette.',
    },
    chiffres: 'Pression normale : 6 à 12 mmHg',
  },
  valveMi: {
    id: 'valveMi', nom: 'Valve mitrale', sang: 'rouge',
    role: {
      1: 'La porte à deux battants du cœur gauche. Elle laisse passer le sang de l\'oreillette au ventricule puis se ferme fort quand le ventricule pousse.',
      2: 'Deux valves (grande et petite) tenues par des cordages et des piliers. Elle subit la forte pression du ventricule gauche à chaque battement.',
      3: 'Surface normale 4 à 6 cm². Le rhumatisme articulaire aigu, encore fréquent en Afrique, est la première cause de rétrécissement mitral.',
    },
  },
  vg: {
    id: 'vg', nom: 'Ventricule gauche', sang: 'rouge',
    role: {
      1: 'C\'est la pompe principale : il envoie le sang rouge dans tout le corps. Sa paroi est épaisse car il doit pousser fort.',
      2: 'À chaque battement il éjecte environ 70 ml, soit à peu près 60 % de son contenu (fraction d\'éjection). Il travaille contre la pression artérielle : c\'est la post-charge.',
      3: 'Débit = volume d\'éjection × fréquence. Le volume d\'éjection dépend de la précharge, de la contractilité et de la post-charge (contrainte pariétale, loi de Laplace : σ = P·r / 2e).',
    },
    chiffres: 'Pression systolique : environ 120 mmHg · FE normale ≥ 50 %',
  },
  valveAo: {
    id: 'valveAo', nom: 'Valve aortique', sang: 'rouge',
    role: {
      1: 'La porte de sortie du cœur gauche vers l\'aorte. Elle s\'ouvre pour laisser partir le sang puis se ferme pour qu\'il ne revienne pas.',
      2: 'Trois valvules sigmoïdes ; leur fermeture produit le deuxième bruit (B2). Avec l\'âge, elles peuvent se calcifier (rétrécissement aortique).',
      3: 'Surface normale 3 à 4 cm² ; rétrécissement serré < 1 cm². Les ostia des coronaires naissent juste au-dessus, dans les sinus de Valsalva.',
    },
  },
  aorte: {
    id: 'aorte', nom: 'Aorte', sang: 'rouge',
    role: {
      1: 'La plus grosse artère du corps. Elle est élastique : elle se gonfle à chaque battement puis se resserre pour pousser le sang en continu.',
      2: 'Son élasticité amortit l\'éjection (effet « Windkessel ») et maintient la pression pendant la diastole. Elle se rigidifie avec l\'âge et l\'hypertension.',
      3: 'La compliance aortique détermine la pression pulsée ; la rigidité se mesure par la vitesse de l\'onde de pouls (VOP > 10 m/s = atteinte d\'organe).',
    },
    chiffres: 'HTA si PA ≥ 140/90 mmHg au cabinet · cible souvent 120-129 de systolique si bien tolérée',
  },
  coronaires: {
    id: 'coronaires', nom: 'Artères coronaires', sang: 'rouge',
    role: {
      1: 'De petites artères en couronne autour du cœur. Elles nourrissent le muscle cardiaque lui-même.',
      2: 'La coronaire droite et le tronc commun gauche (interventriculaire antérieure et circonflexe). Elles se remplissent surtout pendant la diastole.',
      3: 'Perfusion coronaire ≈ pression aortique diastolique − pression télédiastolique du VG, pendant la durée de la diastole ; la tachycardie raccourcit la diastole et réduit l\'apport.',
    },
  },
  carotides: {
    id: 'carotides', nom: 'Carotides', sang: 'rouge',
    role: {
      1: 'Les artères du cou qui apportent le sang au cerveau.',
      2: 'Elles portent les barorécepteurs, capteurs de pression qui régulent la fréquence cardiaque et le tonus des vaisseaux à chaque instant.',
      3: 'Leur bifurcation est un site privilégié d\'athérome ; une sténose symptomatique ≥ 50 % (surtout ≥ 70 %) fait discuter une chirurgie ou un stent.',
    },
  },
  cerveau: {
    id: 'cerveau', nom: 'Cerveau', sang: 'rouge',
    role: {
      1: 'Le cerveau reçoit environ 15 % du sang. Il ne supporte pas d\'en manquer plus de quelques minutes.',
      2: 'Il ajuste lui-même son débit sur une large plage de pression (autorégulation), mais l\'HTA chronique, les embolies et les plaques le menacent.',
      3: 'Autorégulation entre environ 60 et 150 mmHg de PAM, décalée vers le haut chez l\'hypertendu chronique (prudence lors des baisses brutales de PA).',
    },
  },
  reins: {
    id: 'reins', nom: 'Reins', sang: 'rouge',
    role: {
      1: 'Les reins filtrent le sang et règlent la quantité d\'eau et de sel du corps, donc la tension.',
      2: 'Ils reçoivent environ 20 % du débit cardiaque. Quand ils sont moins perfusés, ils sécrètent la rénine qui fait monter la pression (système rénine-angiotensine).',
      3: 'La cascade rénine → angiotensine II → aldostérone est la cible des IEC, ARA II, ARNI et antialdostérones ; les iSGLT2 agissent sur le tubule proximal.',
    },
  },
  membres: {
    id: 'membres', nom: 'Jambes', sang: 'rouge',
    role: {
      1: 'Les muscles des jambes ont besoin de beaucoup plus de sang quand on marche.',
      2: 'À l\'effort, le débit dans les jambes peut être multiplié par 10 ; une artère rétrécie limite cette augmentation (claudication).',
      3: 'Index de pression systolique cheville/bras normal : 1,0 à 1,4.',
    },
  },
  noeudSinusal: {
    id: 'noeudSinusal', nom: 'Nœud sinusal', sang: 'aucun',
    role: {
      1: 'Le chef d\'orchestre du cœur : il envoie un petit signal électrique environ 70 fois par minute, ce qui déclenche chaque battement.',
      2: 'Pacemaker naturel situé dans l\'oreillette droite. Le système nerveux autonome règle sa fréquence (sympathique : accélère ; vague : ralentit).',
      3: 'Dépolarisation diastolique spontanée (courant If) ; cible de l\'ivabradine. En FA, son activité est noyée dans une activité auriculaire chaotique.',
    },
  },
  noeudAV: {
    id: 'noeudAV', nom: 'Nœud auriculo-ventriculaire', sang: 'aucun',
    role: {
      1: 'Le relais électrique entre oreillettes et ventricules. Il retarde un peu le signal pour laisser les ventricules se remplir.',
      2: 'Il ralentit la conduction (intervalle PR), puis le signal descend par le faisceau de His et le réseau de Purkinje. En FA, il filtre les impulsions trop rapides.',
      3: 'Cible des bêtabloquants, de la digoxine et des inhibiteurs calciques non dihydropyridiniques pour contrôler la fréquence en FA.',
    },
  },
};
