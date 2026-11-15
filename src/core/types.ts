/** Types partagés par le moteur, le contenu et les rendus. */

export type Niveau = 1 | 2 | 3;
export type Rythme = 'sinus' | 'fa' | 'bav3';

/** Le « terrain » : l'état du patient avant traitement (maladies appliquées). */
export interface Terrain {
  rvs: number; // résistance vasculaire systémique relative (1 = normale)
  rigidite: number; // rigidité aortique 0..1
  volemie: number; // volume sanguin relatif (1 = normal)
  contractilite: number; // force du myocarde (1 = normale)
  hvg: number; // hypertrophie du ventricule gauche 0..1
  dilatation: number; // dilatation du ventricule gauche 0..1
  ischemie: number; // part du myocarde nécrosé (infarctus) 0..1
  rythme: Rythme;
  fcBase: number; // fréquence cardiaque de repos (sinus)
  ra: number; // rétrécissement aortique 0..1
  ia: number; // insuffisance aortique 0..1
  rm: number; // rétrécissement mitral 0..1
  im: number; // insuffisance mitrale 0..1
  it: number; // insuffisance tricuspide 0..1
  ldl: number; // LDL-cholestérol (mmol/L)
  plaqueCoro: number; // sténose coronaire 0..1
  plaqueCarotide: number; // sténose carotidienne 0..1
  plaqueMembres: number; // sténose des artères des jambes 0..1
  rein: number; // fonction rénale relative (1 = normale)
  diabete: number; // 0 ou 1
  avc: number; // séquelle d'AVC 0..1 (visuel cerveau)
  occlusion: number; // occlusion coronaire aiguë 0..1 (infarctus en cours)
}

export type ClasseId =
  | 'iec' | 'ara2' | 'arni' | 'ica' | 'thiazide' | 'anse' | 'mra' | 'bb'
  | 'isglt2' | 'statine' | 'ezetimibe' | 'aod' | 'aspirine';

/** Doses par classe : 0 = absent, 0,5 = demi-dose, 1 = dose standard, 2 = dose double. */
export type Traitement = Partial<Record<ClasseId, number>>;

export interface Perfusion {
  cerveau: number; // 0..1 (1 = normale)
  coeur: number; // rapport apport/besoin du myocarde
  reins: number;
  membres: number;
  poumons: number; // 1 = sec ; < 1 = congestion
}

export interface Risques {
  avc: number; // risque relatif vs personne de référence
  coronaire: number;
  ic: number;
  rein: number;
}

export interface Alerte { niveau: 'info' | 'attention' | 'danger'; texte: string }

/** Résultat du moteur à un instant donné. */
export interface Etat {
  fc: number; // battements/min (ventricules)
  fcOreillettes: number;
  pas: number; // PA systolique
  pad: number;
  pam: number;
  ves: number; // volume d'éjection antérograde (ml)
  vesTotal: number;
  vtd: number; // volume télédiastolique (ml)
  fe: number; // fraction d'éjection 0..1
  debit: number; // L/min
  pvg: number; // pression systolique dans le VG
  gradientAo: number; // gradient moyen VG-aorte
  pog: number; // pression dans l'oreillette gauche
  paps: number; // PA pulmonaire systolique
  pvc: number; // pression veineuse centrale
  postcharge: number; // relative (1 = normale)
  ldl: number;
  perfusion: Perfusion;
  risques: Risques;
  effets: string[]; // effets indésirables visibles
  alertes: Alerte[];
  terrain: Terrain; // terrain effectif (après traitement)
  thrombusOG: boolean; // caillot dans l'auricule gauche (FA non anticoagulée)
  embolieCarotide: boolean; // plaque carotidienne serrée non protégée : un fragment peut partir vers le cerveau
  oedemes: number; // œdèmes des jambes 0..1 (congestion veineuse ou inhibiteur calcique)
}
