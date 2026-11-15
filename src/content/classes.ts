/** Classes thérapeutiques : mécanisme, effet visible, effets indésirables, arrêt. */
import type { ClasseId, Niveau } from '../core/types.ts';

export type GroupeClasse = 'tension' | 'coeur' | 'lipides' | 'sang';

export const GROUPES: Record<GroupeClasse, string> = {
  tension: 'Antihypertenseurs',
  coeur: 'Cœur et congestion',
  lipides: 'Lipides',
  sang: 'Anticoagulants et antiagrégants',
};

export interface Classe {
  id: ClasseId;
  nom: string;
  court: string;
  exemples: string; // DCI (dénominations communes)
  groupe: GroupeClasse;
  couleur: string;
  cible: string; // où elle agit (affiché sur le schéma)
  mecanisme: Record<Niveau, string>;
  effetVisible: string;
  indesirables: string[];
  arret: string;
}

export const CLASSES: Classe[] = [
  {
    id: 'iec', nom: 'Inhibiteur de l\'enzyme de conversion (IEC)', court: 'IEC', exemples: 'périndopril, ramipril, énalapril', groupe: 'tension', couleur: '#60a5fa', cible: 'Reins et vaisseaux',
    mecanisme: {
      1: 'Il empêche la fabrication d\'une hormone qui resserre les vaisseaux : les artères se relâchent, la tension baisse.',
      2: 'Il bloque la transformation de l\'angiotensine I en angiotensine II (vasoconstrictrice) et réduit l\'aldostérone (rétention de sel). Il protège aussi le cœur et les reins.',
      3: 'Inhibition de l\'ECA : baisse de l\'angiotensine II et de l\'aldostérone, accumulation de bradykinine (vasodilatation, mais aussi toux et angio-œdème). Régression de l\'HVG, effet antiprotéinurique.',
    },
    effetVisible: 'Les artérioles se relâchent : la résistance et la pression baissent ; avec le temps, le cœur épaissi s\'affine.',
    indesirables: ['Toux sèche (environ 10 % des patients)', 'Hyperkaliémie, hausse de la créatinine', 'Angio-œdème (rare mais grave)', 'Contre-indiqué pendant la grossesse'],
    arret: 'La pression remonte en quelques jours à quelques semaines ; la protection du cœur et des reins disparaît.',
  },
  {
    id: 'ara2', nom: 'Antagoniste des récepteurs de l\'angiotensine II (ARA II)', court: 'ARA II', exemples: 'losartan, valsartan, telmisartan', groupe: 'tension', couleur: '#818cf8', cible: 'Vaisseaux',
    mecanisme: {
      1: 'Il empêche l\'hormone qui resserre les vaisseaux d\'agir : les artères se relâchent.',
      2: 'Il bloque le récepteur AT1 de l\'angiotensine II. L\'effet est proche de celui des IEC, sans la toux.',
      3: 'Blocage AT1 sans accumulation de bradykinine. Alternative en cas de toux sous IEC. Ne pas associer à un IEC (double blocage).',
    },
    effetVisible: 'Les artérioles se relâchent, la pression baisse.',
    indesirables: ['Hyperkaliémie, hausse de la créatinine', 'Vertiges en début de traitement', 'Contre-indiqué pendant la grossesse'],
    arret: 'La pression remonte en quelques semaines.',
  },
  {
    id: 'arni', nom: 'Sacubitril/valsartan (ARNI)', court: 'ARNI', exemples: 'sacubitril/valsartan', groupe: 'coeur', couleur: '#a78bfa', cible: 'Vaisseaux et cœur',
    mecanisme: {
      1: 'Il relâche les vaisseaux et aide le corps à éliminer l\'eau en trop : le cœur fatigué travaille moins.',
      2: 'Il associe un ARA II (valsartan) et un inhibiteur de la néprilysine (sacubitril) qui augmente les peptides natriurétiques, des hormones protectrices.',
      3: 'Supérieur à l\'énalapril dans l\'IC à FE réduite (étude PARADIGM-HF). Respecter 36 h d\'arrêt de l\'IEC avant de le débuter.',
    },
    effetVisible: 'Baisse de la post-charge et de la congestion.',
    indesirables: ['Hypotension', 'Hyperkaliémie', 'Angio-œdème (contre-indiqué avec un IEC)'],
    arret: 'La congestion et la pression remontent ; le bénéfice sur la survie disparaît.',
  },
  {
    id: 'ica', nom: 'Inhibiteur calcique (dihydropyridine)', court: 'Inhib. calcique', exemples: 'amlodipine, nifédipine LP', groupe: 'tension', couleur: '#22d3ee', cible: 'Paroi des artères',
    mecanisme: {
      1: 'Il empêche les muscles des artères de se contracter : les artères s\'élargissent et la tension baisse.',
      2: 'Il bloque l\'entrée du calcium dans les cellules musculaires des artérioles : vasodilatation artérielle puissante, sans ralentir le cœur.',
      3: 'Blocage des canaux calciques L vasculaires. L\'amlodipine a une longue demi-vie (35-50 h), ce qui donne un effet stable sur 24 h. Les œdèmes viennent d\'une dilatation artériolaire sans dilatation veineuse ; un IEC ou un ARA II les réduit.',
    },
    effetVisible: 'Les artérioles s\'élargissent nettement : la résistance et la pression baissent.',
    indesirables: ['Œdèmes des chevilles (liés à la dose)', 'Bouffées de chaleur, maux de tête', 'Hypertrophie des gencives (rare)'],
    arret: 'La pression remonte progressivement (sur plusieurs jours, grâce à la longue durée d\'action de l\'amlodipine).',
  },
  {
    id: 'thiazide', nom: 'Diurétique thiazidique ou apparenté', court: 'Thiazidique', exemples: 'indapamide, hydrochlorothiazide, chlortalidone', groupe: 'tension', couleur: '#34d399', cible: 'Reins',
    mecanisme: {
      1: 'Il fait éliminer un peu plus de sel et d\'eau par les urines : il y a moins de liquide dans les vaisseaux et la tension baisse.',
      2: 'Il bloque la réabsorption du sodium dans le tube contourné distal. Au long cours, il relâche aussi les vaisseaux.',
      3: 'Inhibition du cotransporteur Na-Cl distal. L\'indapamide et la chlortalidone ont les meilleures preuves de prévention des AVC.',
    },
    effetVisible: 'Le volume de sang diminue un peu, la résistance baisse ; la pression descend.',
    indesirables: ['Hypokaliémie, hyponatrémie', 'Hausse de l\'acide urique (goutte)', 'Hausse modérée de la glycémie'],
    arret: 'Le volume et la pression remontent en quelques semaines.',
  },
  {
    id: 'anse', nom: 'Diurétique de l\'anse', court: 'Diur. de l\'anse', exemples: 'furosémide, bumétanide', groupe: 'coeur', couleur: '#2dd4bf', cible: 'Reins',
    mecanisme: {
      1: 'Un diurétique puissant : il fait uriner beaucoup et retire l\'eau qui noie les poumons et gonfle les jambes.',
      2: 'Il bloque la réabsorption du sodium dans l\'anse de Henlé. C\'est le traitement de la congestion (OAP, insuffisance cardiaque), pas un antihypertenseur de fond.',
      3: 'Inhibition du cotransporteur Na-K-2Cl ; effet rapide (IV : quelques minutes), courbe dose-réponse à seuil.',
    },
    effetVisible: 'L\'excès d\'eau diminue : la pression de l\'oreillette gauche baisse, les poumons s\'assèchent.',
    indesirables: ['Déshydratation, hypotension', 'Hypokaliémie', 'Insuffisance rénale fonctionnelle'],
    arret: 'La congestion revient en quelques jours si le cœur reste défaillant.',
  },
  {
    id: 'mra', nom: 'Antialdostérone (ARM)', court: 'Antialdostérone', exemples: 'spironolactone, éplérénone', groupe: 'coeur', couleur: '#f472b6', cible: 'Reins et cœur',
    mecanisme: {
      1: 'Il bloque une hormone qui fait retenir le sel et qui abîme le cœur.',
      2: 'Antagoniste de l\'aldostérone : diurétique épargneur de potassium, anti-fibrosant. C\'est un pilier de l\'IC à FE réduite et un recours dans l\'HTA résistante.',
      3: 'Blocage du récepteur des minéralocorticoïdes : réduit fibrose et remodelage. Surveiller la kaliémie, surtout avec un IEC, un ARA II ou un ARNI.',
    },
    effetVisible: 'Moins de rétention d\'eau, légère baisse de la pression.',
    indesirables: ['Hyperkaliémie', 'Gynécomastie (spironolactone)', 'Hausse de la créatinine'],
    arret: 'La rétention d\'eau reprend, le bénéfice sur le remodelage disparaît.',
  },
  {
    id: 'bb', nom: 'Bêtabloquant', court: 'Bêtabloquant', exemples: 'bisoprolol, nébivolol, métoprolol, carvédilol', groupe: 'coeur', couleur: '#fbbf24', cible: 'Nœud sinusal et cœur',
    mecanisme: {
      1: 'Il calme le cœur : il bat moins vite et moins fort, il consomme moins d\'oxygène.',
      2: 'Il bloque les récepteurs bêta-1 de l\'adrénaline sur le cœur : baisse de la fréquence et de la contractilité, baisse de la rénine. Il est indispensable après un infarctus, dans l\'IC et pour ralentir une FA.',
      3: 'Allonge la diastole (meilleure perfusion coronaire et meilleur remplissage dans le rétrécissement mitral). En HTA isolée, ce n\'est pas toujours le premier choix. Contre-indiqué dans le BAV de haut degré et l\'asthme sévère.',
    },
    effetVisible: 'Le cœur ralentit ; le besoin en oxygène baisse. En FA, la fréquence ventriculaire diminue.',
    indesirables: ['Bradycardie, fatigue', 'Bronchospasme chez l\'asthmatique', 'Extrémités froides, troubles de l\'érection'],
    arret: 'Ne jamais arrêter brutalement : rebond de tachycardie, d\'HTA et de crises d\'angor. On diminue sur 1 à 2 semaines.',
  },
  {
    id: 'isglt2', nom: 'Inhibiteur du SGLT2 (gliflozine)', court: 'iSGLT2', exemples: 'dapagliflozine, empagliflozine', groupe: 'coeur', couleur: '#fb923c', cible: 'Reins',
    mecanisme: {
      1: 'Il fait éliminer du sucre et un peu de sel par les urines. Il protège le cœur et les reins, même chez les non-diabétiques.',
      2: 'Il bloque la réabsorption du glucose et du sodium dans le tube proximal : légère diurèse, baisse de la PA de 3 à 5 mmHg, protection rénale. Il réduit les hospitalisations pour insuffisance cardiaque.',
      3: 'Bénéfice démontré dans l\'IC (DAPA-HF, DELIVER) et la maladie rénale chronique (DAPA-CKD), indépendant du diabète. Restaure le rétrocontrôle tubulo-glomérulaire.',
    },
    effetVisible: 'Légère baisse du volume et de la pression, protection des reins au fil des mois.',
    indesirables: ['Infections génitales mycosiques', 'Déshydratation', 'Acidocétose (rare) chez le diabétique'],
    arret: 'La protection cardio-rénale disparaît.',
  },
  {
    id: 'statine', nom: 'Statine', court: 'Statine', exemples: 'atorvastatine, rosuvastatine, simvastatine', groupe: 'lipides', couleur: '#facc15', cible: 'Foie',
    mecanisme: {
      1: 'Elle freine la fabrication du cholestérol par le foie : le « mauvais » cholestérol baisse et les plaques arrêtent de grossir.',
      2: 'Elle bloque l\'HMG-CoA réductase : le foie capte davantage de LDL dans le sang. Elle stabilise aussi les plaques et réduit l\'inflammation.',
      3: 'Dose standard : environ −40 % de LDL ; chaque doublement de dose n\'ajoute qu\'environ 6 %. Bénéfice proportionnel à la baisse absolue du LDL (−22 % d\'événements par mmol/L).',
    },
    effetVisible: 'Les particules de LDL deviennent rares ; la plaque cesse de grossir.',
    indesirables: ['Douleurs musculaires', 'Hausse des transaminases', 'Rhabdomyolyse (très rare)'],
    arret: 'Le LDL revient à son niveau de départ en 2 à 4 semaines ; la plaque reprend sa croissance.',
  },
  {
    id: 'ezetimibe', nom: 'Ézétimibe', court: 'Ézétimibe', exemples: 'ézétimibe', groupe: 'lipides', couleur: '#fde047', cible: 'Intestin',
    mecanisme: {
      1: 'Il empêche l\'intestin d\'absorber le cholestérol des aliments.',
      2: 'Il inhibe la protéine NPC1L1 de l\'intestin : environ −20 % de LDL, en complément d\'une statine.',
      3: 'Ajout recommandé si l\'objectif de LDL n\'est pas atteint sous statine à dose maximale tolérée (étude IMPROVE-IT).',
    },
    effetVisible: 'Baisse supplémentaire du LDL.',
    indesirables: ['Troubles digestifs'],
    arret: 'Le LDL remonte.',
  },
  {
    id: 'aod', nom: 'Anticoagulant oral direct (AOD)', court: 'AOD', exemples: 'apixaban, rivaroxaban, dabigatran, édoxaban', groupe: 'sang', couleur: '#f87171', cible: 'Coagulation',
    mecanisme: {
      1: 'Il rend le sang moins prompt à coaguler : les caillots ne se forment plus dans l\'oreillette qui tremble.',
      2: 'Il bloque directement un facteur de la coagulation (facteur Xa ou thrombine). Dans la FA, il réduit d\'environ deux tiers le risque d\'AVC.',
      3: 'Anti-Xa (apixaban, rivaroxaban, édoxaban) ou anti-IIa (dabigatran) ; demi-vie courte (environ 12 h) : l\'oubli d\'une prise fait vite perdre la protection. Pas d\'AOD dans le rétrécissement mitral serré ni avec une valve mécanique.',
    },
    effetVisible: 'Le caillot de l\'auricule gauche ne se forme plus ; le risque d\'AVC chute.',
    indesirables: ['Saignements (digestifs, nez, gencives)', 'Ajustement de dose selon la fonction rénale'],
    arret: 'La protection disparaît en 24 à 48 h : risque immédiat d\'AVC en FA.',
  },
  {
    id: 'aspirine', nom: 'Antiagrégant plaquettaire (aspirine)', court: 'Aspirine', exemples: 'aspirine faible dose, clopidogrel', groupe: 'sang', couleur: '#fca5a5', cible: 'Plaquettes',
    mecanisme: {
      1: 'Elle empêche les plaquettes de s\'agglutiner sur une plaque abîmée : elle prévient le caillot dans les artères.',
      2: 'Elle bloque la cyclo-oxygénase des plaquettes de façon irréversible (durée de vie d\'une plaquette : 7 à 10 jours). Utile après un infarctus, un AVC athéromateux ou en cas d\'artériopathie.',
      3: 'En prévention primaire, le bénéfice est faible face au risque de saignement. Dans la FA, elle ne remplace pas un anticoagulant.',
    },
    effetVisible: 'Moins de risque de caillot sur les plaques artérielles.',
    indesirables: ['Saignements, ulcère gastrique', 'Allergie'],
    arret: 'Après un stent ou un infarctus, l\'arrêt prématuré expose à une thrombose grave.',
  },
];

export const CLASSE_PAR_ID = Object.fromEntries(CLASSES.map((c) => [c.id, c])) as Record<ClasseId, Classe>;

export const DOSES = [
  { v: 0.5, nom: '½ dose' },
  { v: 1, nom: 'Standard' },
  { v: 2, nom: 'Double' },
] as const;
