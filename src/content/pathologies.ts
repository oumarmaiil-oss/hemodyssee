/**
 * Catalogue des pathologies. Chaque fiche suit le même plan :
 * ce qui se passe → ce qu'on voit → les conséquences → le traitement proposé → l'arrêt.
 * Les textes existent en trois niveaux : 1 Découvrir, 2 Comprendre, 3 Approfondir.
 */
import type { Niveau, Terrain, Traitement } from '../core/types.ts';
import type { ZoneId } from './zones.ts';

export type Famille = 'valves' | 'myocarde' | 'coronaires' | 'rythme' | 'arteres' | 'lipides' | 'organes';

export const FAMILLES: Record<Famille, string> = {
  valves: 'Valves',
  myocarde: 'Muscle cardiaque',
  coronaires: 'Artères du cœur',
  rythme: 'Rythme et conduction',
  arteres: 'Hypertension et artères',
  lipides: 'Cholestérol et athérome',
  organes: 'Organes et complications',
};

export interface Pathologie {
  id: string;
  nom: string;
  court: string; // nom court pour les puces
  famille: Famille;
  zones: ZoneId[]; // zones anatomiques où elle apparaît
  niveauMin: Niveau;
  appliquer: (t: Terrain, s: number) => void; // s = sévérité 0,4 / 0,7 / 1
  texte: Record<Niveau, string>; // ce qui se passe
  voir: string; // ce qu'on voit dans la simulation
  consequences: string[];
  traitement: { propose: Traitement; texte: string; nonMedicamenteux?: string };
  arret?: string; // ce qui se passe à l'arrêt du traitement
}

const add = (v: number, d: number, max = 1) => Math.min(max, v + d);

export const PATHOLOGIES: Pathologie[] = [
  // ── Hypertension et artères ──
  {
    id: 'hta', nom: 'Hypertension artérielle', court: 'HTA', famille: 'arteres', zones: ['aorte', 'vg', 'reins', 'cerveau'], niveauMin: 1,
    appliquer: (t, s) => { t.rvs *= 1 + 0.65 * s; t.rigidite = add(t.rigidite, 0.15 * s); t.hvg = add(t.hvg, 0.15 * s); },
    texte: {
      1: 'Les petites artères se resserrent : le cœur doit pousser plus fort pour faire passer le même sang. La pression monte dans tous les vaisseaux.',
      2: 'La résistance des artérioles augmente : la post-charge du ventricule gauche s\'élève. Pour vaincre cette résistance, le muscle s\'épaissit (hypertrophie) et les artères se rigidifient avec le temps.',
      3: 'Élévation des résistances vasculaires systémiques (PAM = débit × RVS). La contrainte pariétale systolique augmente (loi de Laplace) et déclenche une hypertrophie concentrique ; la rigidité aortique élargit la pression pulsée par retour précoce des ondes réfléchies.',
    },
    voir: 'Les artérioles se resserrent, l\'aorte devient plus rigide (couleur plus pâle), le ventricule gauche s\'épaissit au fil des mois.',
    consequences: ['Hypertrophie du ventricule gauche puis insuffisance cardiaque', 'AVC (première cause évitable)', 'Infarctus du myocarde', 'Maladie rénale chronique', 'Atteinte des yeux (rétinopathie)'],
    traitement: {
      propose: { iec: 1, ica: 1 },
      texte: 'Bithérapie d\'emblée en un seul comprimé chez la plupart des patients : bloqueur du système rénine-angiotensine (IEC ou ARA II) + inhibiteur calcique ou diurétique thiazidique. Si la PA n\'est pas contrôlée : trithérapie IEC/ARA II + inhibiteur calcique + thiazidique.',
      nonMedicamenteux: 'Moins de sel, activité physique, perte de poids, moins d\'alcool, arrêt du tabac.',
    },
    arret: 'La pression remonte en quelques jours à quelques semaines : l\'HTA se contrôle, elle ne se guérit pas. Les lésions (cœur, reins, artères) reprennent leur progression.',
  },
  {
    id: 'htaSys', nom: 'HTA systolique du sujet âgé (artères rigides)', court: 'Artères rigides', famille: 'arteres', zones: ['aorte'], niveauMin: 2,
    appliquer: (t, s) => { t.rigidite = add(t.rigidite, 0.75 * s); t.rvs *= 1 + 0.08 * s; },
    texte: {
      1: 'Avec l\'âge, les grosses artères perdent leur souplesse : comme un tuyau dur, elles n\'amortissent plus chaque battement. La pression « du haut » monte, celle « du bas » baisse.',
      2: 'L\'aorte rigide n\'amortit plus l\'éjection : la PA systolique s\'élève et la diastolique baisse, d\'où une pression pulsée large. Le cœur travaille plus, les coronaires sont moins bien remplies en diastole.',
      3: 'Baisse de la compliance aortique (fibres élastiques remplacées par du collagène, calcifications) : l\'onde réfléchie revient en systole, augmente la PAS et la post-charge, et réduit la pression de perfusion coronaire diastolique.',
    },
    voir: 'L\'aorte pâlit et ne se dilate presque plus à chaque battement ; l\'écart entre les deux chiffres de tension s\'agrandit.',
    consequences: ['Augmentation du travail du cœur', 'Moins bonne perfusion des coronaires', 'AVC et démence vasculaire'],
    traitement: { propose: { ica: 1, thiazide: 1 }, texte: 'Inhibiteur calcique et/ou diurétique thiazidique, ou IEC/ARA II ; augmenter les doses progressivement chez le sujet âgé (risque d\'hypotension orthostatique).' },
    arret: 'La pression systolique remonte en quelques semaines.',
  },
  // ── Cholestérol et athérome ──
  {
    id: 'dyslip', nom: 'Hypercholestérolémie (LDL élevé)', court: 'LDL élevé', famille: 'lipides', zones: ['coronaires', 'aorte', 'carotides'], niveauMin: 1,
    appliquer: (t, s) => { t.ldl = Math.max(t.ldl, 2.6 + 2.4 * s); t.plaqueCoro = Math.max(t.plaqueCoro, 0.15 + 0.2 * s); t.plaqueCarotide = Math.max(t.plaqueCarotide, 0.12 + 0.18 * s); t.plaqueMembres = Math.max(t.plaqueMembres, 0.08 + 0.12 * s); },
    texte: {
      1: 'Le « mauvais » cholestérol (LDL) circule en excès. Il se dépose dans la paroi des artères et forme peu à peu une plaque qui rétrécit le passage du sang.',
      2: 'Le LDL en excès pénètre dans la paroi artérielle, s\'oxyde et attire des cellules inflammatoires : une plaque d\'athérome se forme et grossit, surtout dans les coronaires et les carotides. Elle peut se rompre et provoquer un caillot.',
      3: 'Rétention sous-endothéliale des LDL, oxydation, recrutement de monocytes devenant cellules spumeuses, chape fibreuse. Le risque d\'événement dépend de l\'exposition cumulée au LDL : chaque baisse de 1 mmol/L réduit d\'environ 22 % les événements vasculaires majeurs.',
    },
    voir: 'Vue Vaisseau : les particules jaunes de LDL entrent dans la paroi et une plaque jaune rétrécit l\'artère (bouton « Étapes de la plaque » : du dépôt de LDL jusqu\'au caillot). Vue Corps : plaques sur les carotides et les jambes. Vue Cœur : plaque sur l\'artère coronaire.',
    consequences: ['Angor et infarctus du myocarde', 'AVC (plaque carotidienne)', 'Artériopathie des jambes'],
    traitement: { propose: { statine: 1 }, texte: 'Statine en première intention ; ajout d\'ézétimibe si l\'objectif de LDL n\'est pas atteint. L\'objectif dépend du risque (par exemple < 1,4 mmol/L, soit 0,55 g/L, chez le patient à très haut risque).', nonMedicamenteux: 'Moins de graisses saturées, activité physique, arrêt du tabac.' },
    arret: 'Le LDL revient à son niveau initial en quelques semaines ; la plaque reprend sa croissance et le bénéfice sur le risque disparaît.',
  },
  {
    id: 'athero', nom: 'Athérosclérose carotidienne', court: 'Plaque carotide', famille: 'lipides', zones: ['carotides', 'cerveau'], niveauMin: 2,
    appliquer: (t, s) => { t.plaqueCarotide = Math.max(t.plaqueCarotide, 0.45 + 0.4 * s); t.ldl = Math.max(t.ldl, 3.4); },
    texte: {
      1: 'Une plaque rétrécit l\'artère du cou qui irrigue le cerveau. Un morceau peut se détacher et boucher une artère du cerveau.',
      2: 'La sténose carotidienne réduit le débit cérébral quand elle devient serrée, mais le danger principal est l\'embole : un fragment de plaque ou de caillot migre vers le cerveau et provoque un AVC.',
      3: 'Sténose de la bifurcation carotidienne ; le risque d\'AVC dépend du degré de sténose, des symptômes et de l\'instabilité de la plaque. Revascularisation discutée pour les sténoses symptomatiques ≥ 50-70 %.',
    },
    voir: 'Vue Vaisseau (carotide) : plaque jaune qui rétrécit l\'artère. Vue Corps : plaque au cou ; quand elle est serrée et sans antiagrégant, un fragment part vers le cerveau (AVC). Vue Cœur : carotide rétrécie au-dessus du cœur.',
    consequences: ['AVC ischémique', 'Accident ischémique transitoire (AIT)'],
    traitement: { propose: { statine: 1, aspirine: 1 }, texte: 'Statine à forte intensité + antiagrégant plaquettaire, contrôle de la PA ; chirurgie ou stent pour certaines sténoses serrées.' },
    arret: 'Sans statine, la plaque redevient instable ; sans antiagrégant, le risque de caillot sur la plaque remonte.',
  },
  {
    id: 'aomi', nom: 'Artériopathie des membres inférieurs', court: 'Artères des jambes', famille: 'lipides', zones: ['membres'], niveauMin: 2,
    appliquer: (t, s) => { t.plaqueMembres = Math.max(t.plaqueMembres, 0.45 + 0.45 * s); t.ldl = Math.max(t.ldl, 3.4); },
    texte: {
      1: 'Les artères des jambes sont bouchées en partie : en marchant, les muscles manquent de sang et font mal, ce qui oblige à s\'arrêter.',
      2: 'Les sténoses des artères iliaques et fémorales limitent l\'augmentation du débit à l\'effort : c\'est la claudication intermittente. C\'est aussi un marqueur d\'athérome diffus (cœur, cerveau).',
      3: 'Index de pression systolique cheville/bras < 0,90. Risque cardiovasculaire global très élevé ; ischémie critique possible aux stades avancés.',
    },
    voir: 'Vue Vaisseau (artère de jambe) : plaque qui rétrécit l\'artère. Vue Corps : mollets qui manquent d\'oxygène à la marche (claudication), pied pâle puis sombre au stade critique, IPS abaissé.',
    consequences: ['Douleur à la marche', 'Plaies qui ne guérissent pas, amputation au stade critique', 'Infarctus et AVC associés'],
    traitement: { propose: { statine: 1, aspirine: 1 }, texte: 'Statine + antiagrégant, marche régulière, arrêt du tabac ; revascularisation si nécessaire.' },
  },
  // ── Coronaires ──
  {
    id: 'angor', nom: 'Angor stable (rétrécissement coronaire)', court: 'Angor', famille: 'coronaires', zones: ['coronaires', 'vg'], niveauMin: 1,
    appliquer: (t, s) => { t.plaqueCoro = Math.max(t.plaqueCoro, 0.5 + 0.3 * s); t.ldl = Math.max(t.ldl, 3.6); },
    texte: {
      1: 'Une artère du cœur est rétrécie. Au repos, ça passe ; à l\'effort, le muscle cardiaque manque d\'oxygène et cela fait mal à la poitrine.',
      2: 'La plaque coronaire limite l\'apport en oxygène. Quand le besoin augmente (effort, tachycardie, hypertension), l\'apport ne suit plus : c\'est l\'ischémie, ressentie comme une douleur thoracique.',
      3: 'Déséquilibre apport/besoin myocardique : le besoin dépend de la FC, de la contrainte pariétale et de la contractilité ; l\'apport, de la pression diastolique, de la durée de la diastole et du diamètre coronaire.',
    },
    voir: 'Vue Cœur : plaque jaune sur l\'artère interventriculaire antérieure ; le muscle qu\'elle nourrit devient pâle et violacé (il manque d\'oxygène, mais vit). Vue Vaisseau (coronaire) : rétrécissement d\'environ 70 %. Vue Corps : « angor » au niveau du cœur.',
    consequences: ['Douleur thoracique à l\'effort', 'Risque d\'infarctus si la plaque se rompt'],
    traitement: { propose: { bb: 1, statine: 1, aspirine: 1 }, texte: 'Bêtabloquant (ralentit le cœur, baisse le besoin en oxygène) + statine + aspirine ; dérivé nitré en cas de crise ; angioplastie si les symptômes persistent.' },
    arret: 'L\'arrêt brutal d\'un bêtabloquant peut provoquer un rebond de tachycardie et des crises d\'angor, voire un infarctus : on diminue toujours progressivement.',
  },
  {
    id: 'idm', nom: 'Infarctus du myocarde', court: 'Infarctus', famille: 'coronaires', zones: ['coronaires', 'vg'], niveauMin: 1,
    appliquer: (t, s) => { t.plaqueCoro = Math.max(t.plaqueCoro, 0.9); t.ischemie = add(t.ischemie, 0.3 + 0.2 * s); t.ldl = Math.max(t.ldl, 3.6); t.fcBase += 12 * s; },
    texte: {
      1: 'Un caillot bouche complètement une artère du cœur. La partie du muscle qu\'elle nourrit ne reçoit plus d\'oxygène et meurt si on ne débouche pas vite.',
      2: 'La rupture d\'une plaque déclenche un caillot qui occlut la coronaire. Le territoire en aval se nécrose en quelques heures : cette zone ne se contracte plus, la fraction d\'éjection baisse.',
      3: 'Occlusion coronaire aiguë → nécrose transmurale progressant de l\'endocarde vers l\'épicarde (« time is muscle »). Zone akinétique, remodelage ventriculaire, risque d\'insuffisance cardiaque et de troubles du rythme.',
    },
    voir: 'Vue Cœur : la paroi antérieure et la pointe du ventricule gauche deviennent gris violacé (muscle mort) et ne bougent plus ; le cœur bat plus vite, l\'ECG montre un sus-décalage du segment ST. Vue Vaisseau (coronaire) : caillot qui bouche l\'artère. Vue Corps : infarctus signalé au cœur.',
    consequences: ['Insuffisance cardiaque', 'Troubles du rythme graves', 'Récidive d\'infarctus'],
    traitement: { propose: { aspirine: 1, bb: 0.5, iec: 0.5, statine: 2 }, texte: 'Urgence : désobstruer l\'artère (angioplastie). Ensuite : double antiagrégation, bêtabloquant, IEC, statine à forte dose ; antialdostérone et iSGLT2 si la fraction d\'éjection reste basse.' },
    arret: 'Arrêter les antiagrégants trop tôt expose à la thrombose du stent ; arrêter la statine fait remonter le risque de récidive.',
  },
  // ── Muscle cardiaque ──
  {
    id: 'hvg', nom: 'Cardiopathie hypertensive (cœur épaissi)', court: 'Cœur épaissi', famille: 'myocarde', zones: ['vg'], niveauMin: 2,
    appliquer: (t, s) => { t.hvg = add(t.hvg, 0.55 * s); t.rvs *= 1 + 0.2 * s; },
    texte: {
      1: 'À force de pousser contre une pression trop haute, le muscle du cœur s\'épaissit, comme un muscle qu\'on entraîne trop. Mais un cœur trop épais se remplit mal.',
      2: 'L\'hypertrophie concentrique normalise la contrainte pariétale mais rend le ventricule rigide : le remplissage diastolique devient difficile et la pression monte dans l\'oreillette gauche.',
      3: 'Hypertrophie concentrique (épaississement des parois, cavité normale ou petite), dysfonction diastolique, fibrose interstitielle et réserve coronaire diminuée. Régression possible sous traitement, plus marquée avec les bloqueurs du SRAA.',
    },
    voir: 'La paroi du ventricule gauche s\'épaissit et la cavité se rétrécit (visible en coupe).',
    consequences: ['Insuffisance cardiaque à fraction d\'éjection préservée', 'Fibrillation atriale', 'Ischémie même sans plaque'],
    traitement: { propose: { iec: 1, ica: 1 }, texte: 'Contrôler la pression : IEC ou ARA II (meilleure régression de l\'hypertrophie) + inhibiteur calcique ou thiazidique.' },
  },
  {
    id: 'icfer', nom: 'Insuffisance cardiaque à fraction d\'éjection réduite', court: 'IC (FE basse)', famille: 'myocarde', zones: ['vg', 'poumons'], niveauMin: 1,
    appliquer: (t, s) => { t.contractilite *= 1 - 0.5 * s; t.dilatation = add(t.dilatation, 0.6 * s); t.volemie *= 1 + 0.12 * s; t.fcBase += 12 * s; t.rvs *= 1 + 0.1 * s; },
    texte: {
      1: 'Le cœur est devenu faible et dilaté : il n\'envoie plus assez de sang. L\'eau s\'accumule dans les poumons et les jambes, la personne s\'essouffle.',
      2: 'La contraction est faible (FE < 40 %). Le corps compense en retenant l\'eau et le sel et en accélérant le cœur, mais ces compensations aggravent la maladie à long terme.',
      3: 'Dysfonction systolique avec remodelage excentrique. Activation neuro-hormonale (SRAA, système sympathique) délétère au long cours : c\'est la cible des quatre piliers du traitement.',
    },
    voir: 'Le ventricule gauche est grand et bat faiblement ; le sang circule lentement, les poumons se chargent d\'eau.',
    consequences: ['Essoufflement, œdèmes', 'Hospitalisations répétées', 'Mort subite'],
    traitement: { propose: { arni: 0.5, bb: 0.5, mra: 1, isglt2: 1, anse: 1 }, texte: 'Les quatre piliers : ARNI (ou IEC/ARA II) + bêtabloquant + antialdostérone + iSGLT2 (dapagliflozine) ; diurétique de l\'anse pour retirer l\'eau en excès.' },
    arret: 'Arrêter le diurétique fait revenir la congestion en quelques jours ; arrêter les piliers fait perdre leur bénéfice sur la survie.',
  },
  {
    id: 'icfep', nom: 'Insuffisance cardiaque à fraction d\'éjection préservée', court: 'IC (FE préservée)', famille: 'myocarde', zones: ['vg', 'og', 'poumons'], niveauMin: 3,
    appliquer: (t, s) => { t.hvg = add(t.hvg, 0.55 * s); t.rigidite = add(t.rigidite, 0.3 * s); t.volemie *= 1 + 0.1 * s; t.rvs *= 1 + 0.12 * s; },
    texte: {
      1: 'Le cœur pompe correctement mais il est raide : il se remplit mal, la pression remonte vers les poumons.',
      2: 'La contraction est conservée mais le remplissage est gêné (ventricule rigide, souvent après des années d\'HTA, de diabète, d\'obésité). La pression de l\'oreillette gauche monte à l\'effort.',
      3: 'Dysfonction diastolique, rigidité ventriculo-artérielle couplée, comorbidités fréquentes. Les iSGLT2 réduisent les hospitalisations ; le contrôle de la PA et de la congestion reste central.',
    },
    voir: 'Paroi épaisse, cavité petite, oreillette gauche dilatée, poumons congestionnés.',
    consequences: ['Essoufflement à l\'effort', 'Fibrillation atriale', 'Hospitalisations'],
    traitement: { propose: { isglt2: 1, anse: 0.5, iec: 1 }, texte: 'iSGLT2 + diurétique si congestion + contrôle de la PA et des facteurs de risque.' },
  },
  {
    id: 'oap', nom: 'Œdème aigu du poumon', court: 'OAP', famille: 'organes', zones: ['poumons', 'og'], niveauMin: 2,
    appliquer: (t, s) => { t.volemie *= 1 + 0.55 * s; t.contractilite *= 1 - 0.45 * s; t.rvs *= 1 + 0.3 * s; t.fcBase += 25 * s; },
    texte: {
      1: 'Le sang reflue vers les poumons et l\'eau passe dans les alvéoles : la personne étouffe. C\'est une urgence.',
      2: 'La pression dans l\'oreillette gauche et les capillaires pulmonaires dépasse environ 25 mmHg : le liquide sort des capillaires et inonde les alvéoles.',
      3: 'Hyperpression capillaire pulmonaire (> 25 mmHg) dépassant la pression oncotique : œdème interstitiel puis alvéolaire. Déclencheurs : poussée hypertensive, ischémie, FA rapide, écart de régime ou arrêt du traitement.',
    },
    voir: 'Les poumons se remplissent d\'eau (zones bleutées) ; la pression de l\'oreillette gauche s\'envole.',
    consequences: ['Détresse respiratoire', 'Décès sans traitement rapide'],
    traitement: { propose: { anse: 2 }, texte: 'Urgence : diurétique de l\'anse par voie veineuse, dérivés nitrés, oxygène, traitement de la cause.' },
  },
  // ── Valves ──
  {
    id: 'ra', nom: 'Rétrécissement aortique', court: 'Rétréc. aortique', famille: 'valves', zones: ['valveAo', 'vg', 'aorte'], niveauMin: 1,
    appliquer: (t, s) => { t.ra = Math.max(t.ra, 0.45 + 0.5 * s); t.hvg = add(t.hvg, 0.4 * s); },
    texte: {
      1: 'La valve à la sortie du cœur gauche est calcifiée et s\'ouvre mal. Le cœur doit forcer pour faire passer le sang par un orifice étroit.',
      2: 'La valve aortique calcifiée réduit l\'orifice d\'éjection. Il apparaît une différence de pression entre le ventricule et l\'aorte (gradient). Le ventricule s\'épaissit pour compenser, jusqu\'à s\'épuiser.',
      3: 'Rétrécissement serré si surface < 1 cm², gradient moyen ≥ 40 mmHg ou vitesse ≥ 4 m/s. Triade d\'alerte : angor, syncope d\'effort, dyspnée. Aucun médicament ne ralentit la maladie : remplacement valvulaire (chirurgie ou TAVI).',
    },
    voir: 'Les valvules jaunes, épaissies, s\'ouvrent à peine ; le jet de sang accélère dans l\'aorte, la pression monte dans le ventricule.',
    consequences: ['Angor, malaise ou syncope à l\'effort', 'Insuffisance cardiaque', 'Mort subite au stade serré symptomatique'],
    traitement: { propose: {}, texte: 'Pas de traitement médicamenteux efficace sur la valve : remplacement valvulaire (chirurgie ou TAVI) quand le rétrécissement est serré et symptomatique. Prudence avec les vasodilatateurs.' },
  },
  {
    id: 'ia', nom: 'Insuffisance aortique', court: 'Fuite aortique', famille: 'valves', zones: ['valveAo', 'vg'], niveauMin: 2,
    appliquer: (t, s) => { t.ia = Math.max(t.ia, 0.4 + 0.5 * s); t.dilatation = add(t.dilatation, 0.35 * s); },
    texte: {
      1: 'La valve aortique ne ferme plus bien : une partie du sang éjecté revient dans le cœur. Le cœur doit pomper plus pour compenser et il se dilate.',
      2: 'Le reflux diastolique fait chuter la pression diastolique et surcharge le ventricule en volume : dilatation progressive, pression pulsée large.',
      3: 'Surcharge mixte volume-pression, pression pulsée élargie (pouls bondissant), dilatation excentrique ; chirurgie si symptômes, FE ≤ 55 % ou dilatation importante.',
    },
    voir: 'Pendant la diastole, un jet repart de l\'aorte vers le ventricule ; le ventricule gauche grossit.',
    consequences: ['Dilatation puis insuffisance cardiaque'],
    traitement: { propose: { iec: 1 }, texte: 'Vasodilatateur (IEC, ARA II ou inhibiteur calcique) si HTA ou symptômes en attendant la chirurgie ; remplacement valvulaire au bon moment.' },
  },
  {
    id: 'rm', nom: 'Rétrécissement mitral', court: 'Rétréc. mitral', famille: 'valves', zones: ['valveMi', 'og', 'poumons'], niveauMin: 2,
    appliquer: (t, s) => { t.rm = Math.max(t.rm, 0.45 + 0.5 * s); },
    texte: {
      1: 'La valve entre l\'oreillette et le ventricule gauches est rétrécie, souvent après un rhumatisme articulaire. Le sang a du mal à passer et s\'accumule en amont, vers les poumons.',
      2: 'Le gradient oreillette-ventricule élève la pression de l\'oreillette gauche qui se dilate : congestion pulmonaire, fibrillation atriale et caillots fréquents.',
      3: 'Le plus souvent d\'origine rhumatismale (fréquente en Afrique subsaharienne). Serré si surface < 1,5 cm². La tachycardie raccourcit la diastole et aggrave le gradient. Anticoagulation par AVK si FA (les AOD ne sont pas recommandés).',
    },
    voir: 'La valve mitrale épaissie s\'ouvre en « bouche de poisson », l\'oreillette gauche se dilate, les poumons se congestionnent.',
    consequences: ['Essoufflement, OAP', 'Fibrillation atriale', 'AVC par caillot de l\'oreillette'],
    traitement: { propose: { bb: 0.5, anse: 0.5 }, texte: 'Bêtabloquant (allonge la diastole), diurétique ; anticoagulant AVK si FA ; dilatation de la valve au ballon ou chirurgie.' },
  },
  {
    id: 'im', nom: 'Insuffisance mitrale', court: 'Fuite mitrale', famille: 'valves', zones: ['valveMi', 'og', 'vg'], niveauMin: 2,
    appliquer: (t, s) => { t.im = Math.max(t.im, 0.35 + 0.5 * s); t.dilatation = add(t.dilatation, 0.3 * s); },
    texte: {
      1: 'La valve mitrale fuit : à chaque battement, une partie du sang repart en arrière vers l\'oreillette et les poumons au lieu d\'aller vers le corps.',
      2: 'La régurgitation systolique vers l\'oreillette gauche réduit le volume éjecté vers l\'aorte et surcharge oreillette et ventricule en volume.',
      3: 'Primaire (prolapsus, rhumatisme) ou secondaire (dilatation ventriculaire). La FE surestime la fonction réelle car le ventricule éjecte aussi dans l\'oreillette, une chambre à basse pression.',
    },
    voir: 'Pendant la systole, un jet repart du ventricule vers l\'oreillette gauche, qui grossit.',
    consequences: ['Insuffisance cardiaque', 'Fibrillation atriale'],
    traitement: { propose: {}, texte: 'Réparation ou remplacement de la valve ; traitement de l\'insuffisance cardiaque si la fuite est secondaire.' },
  },
  {
    id: 'it', nom: 'Insuffisance tricuspide', court: 'Fuite tricuspide', famille: 'valves', zones: ['valveTri', 'od'], niveauMin: 3,
    appliquer: (t, s) => { t.it = Math.max(t.it, 0.4 + 0.5 * s); },
    texte: {
      1: 'La valve du cœur droit fuit : le sang reflue vers les veines, qui gonflent (cou, foie, jambes).',
      2: 'Le reflux systolique vers l\'oreillette droite élève la pression veineuse : turgescence jugulaire, gros foie, œdèmes.',
      3: 'Le plus souvent fonctionnelle, secondaire à une hypertension pulmonaire ou à une dilatation du ventricule droit.',
    },
    voir: 'Un jet repart du ventricule droit vers l\'oreillette droite ; la pression veineuse monte.',
    consequences: ['Œdèmes des jambes', 'Foie cardiaque'],
    traitement: { propose: { anse: 1 }, texte: 'Diurétique, traitement de la cause ; chirurgie dans certains cas.' },
  },
  // ── Rythme ──
  {
    id: 'fa', nom: 'Fibrillation atriale', court: 'Fibrillation atriale', famille: 'rythme', zones: ['og', 'od', 'noeudSinusal', 'cerveau'], niveauMin: 1,
    appliquer: (t) => { t.rythme = 'fa'; },
    texte: {
      1: 'Les oreillettes ne battent plus : elles tremblent de façon désordonnée. Le cœur bat vite et irrégulièrement, et un caillot peut se former dans l\'oreillette puis partir vers le cerveau.',
      2: 'Une activité électrique anarchique (400 à 600 par minute) remplace le nœud sinusal. Le nœud auriculo-ventriculaire filtre ces impulsions : les ventricules battent vite et de façon irrégulière. Le sang stagne dans l\'auricule gauche et peut y coaguler.',
      3: 'Perte de la systole auriculaire (environ 15-20 % du remplissage), rythme ventriculaire irrégulier. Le risque d\'AVC (multiplié par environ 5) s\'évalue par le score CHA₂DS₂-VA ; l\'anticoagulation réduit ce risque d\'environ deux tiers.',
    },
    voir: 'Les oreillettes tremblent, l\'activité électrique devient chaotique, les battements sont irréguliers ; sans anticoagulant, un caillot apparaît dans l\'auricule gauche.',
    consequences: ['AVC par embolie (le plus grave)', 'Palpitations, fatigue', 'Insuffisance cardiaque si le cœur reste trop rapide'],
    traitement: { propose: { aod: 1, bb: 1 }, texte: 'Anticoagulant oral direct (AOD) selon le score de risque + contrôle de la fréquence (bêtabloquant) ; retour au rythme normal dans certains cas.' },
    arret: 'Sans anticoagulant, le risque de caillot revient en 1 à 2 jours, car les AOD agissent peu de temps : ne jamais sauter de prises.',
  },
  {
    id: 'bav', nom: 'Bloc auriculo-ventriculaire complet', court: 'BAV complet', famille: 'rythme', zones: ['noeudAV'], niveauMin: 2,
    appliquer: (t) => { t.rythme = 'bav3'; },
    texte: {
      1: 'Le signal électrique ne passe plus des oreillettes aux ventricules. Les ventricules battent seuls, très lentement : fatigue, malaises, perte de connaissance.',
      2: 'La conduction est interrompue au niveau du nœud auriculo-ventriculaire ou du faisceau de His. Un foyer de secours ventriculaire prend le relais à 30-40 battements par minute, sans lien avec les oreillettes.',
      3: 'Dissociation auriculo-ventriculaire complète ; échappement jonctionnel (QRS fins, 40-60/min) ou ventriculaire (QRS larges, 20-40/min). Indication de stimulateur cardiaque.',
    },
    voir: 'Le signal électrique s\'arrête au nœud AV (croix rouge) ; les oreillettes battent normalement, les ventricules lentement et à leur propre rythme.',
    consequences: ['Syncope (malaise d\'Adams-Stokes)', 'Insuffisance cardiaque', 'Mort subite'],
    traitement: { propose: {}, texte: 'Stimulateur cardiaque (pacemaker). Arrêter les médicaments qui ralentissent le cœur (bêtabloquants…).' },
  },
  // ── Organes ──
  {
    id: 'avc', nom: 'AVC ischémique', court: 'AVC', famille: 'organes', zones: ['cerveau', 'carotides'], niveauMin: 1,
    appliquer: (t, s) => { t.avc = Math.max(t.avc, 0.5 + 0.4 * s); },
    texte: {
      1: 'Une artère du cerveau est bouchée par un caillot venu du cœur ou d\'une plaque : une partie du cerveau ne reçoit plus de sang.',
      2: 'L\'occlusion d\'une artère cérébrale prive un territoire de sang. L\'origine est souvent un caillot venu de l\'oreillette (FA) ou une plaque de la carotide, avec l\'HTA comme premier facteur de risque.',
      3: 'Zone de nécrose centrale entourée d\'une pénombre récupérable si la reperfusion est rapide (thrombolyse, thrombectomie). La prévention secondaire dépend du mécanisme : AOD si FA, antiagrégant et statine si athérome.',
    },
    voir: 'Vue Corps : une zone du cerveau devient sombre, elle ne reçoit plus de sang. Le caillot vient soit d\'une plaque carotidienne (vue Vaisseau, carotide), soit du cœur en fibrillation atriale.',
    consequences: ['Paralysie, troubles de la parole', 'Handicap, démence', 'Récidive'],
    traitement: { propose: { statine: 2, aspirine: 1, iec: 1, thiazide: 1 }, texte: 'Urgence : appeler le 15/SAMU (thrombolyse, thrombectomie). Prévention : contrôle de la PA, statine, antiagrégant, ou AOD si l\'AVC vient d\'une FA.' },
  },
  {
    id: 'irc', nom: 'Maladie rénale chronique', court: 'Reins', famille: 'organes', zones: ['reins'], niveauMin: 2,
    appliquer: (t, s) => { t.rein = Math.min(t.rein, 1 - 0.6 * s); t.rvs *= 1 + 0.12 * s; t.volemie *= 1 + 0.05 * s; },
    texte: {
      1: 'Les reins filtrent moins bien le sang. Ils retiennent l\'eau et le sel, ce qui fait monter la tension, et la tension abîme encore plus les reins : c\'est un cercle vicieux.',
      2: 'La baisse de la filtration glomérulaire entraîne une rétention hydrosodée et une activation du système rénine-angiotensine : HTA et risque cardiovasculaire augmentent.',
      3: 'DFG < 60 mL/min/1,73 m² et/ou albuminurie. Les bloqueurs du SRAA et les iSGLT2 ralentissent la progression ; surveiller la kaliémie et la créatinine.',
    },
    voir: 'Les reins pâlissent et filtrent moins ; la pression monte.',
    consequences: ['HTA difficile à contrôler', 'Dialyse au stade terminal', 'Risque cardiovasculaire élevé'],
    traitement: { propose: { iec: 1, isglt2: 1 }, texte: 'IEC ou ARA II + iSGLT2 (dapagliflozine), contrôle de la PA, statine selon le risque.' },
  },
  {
    id: 'diabete', nom: 'Diabète de type 2', court: 'Diabète', famille: 'organes', zones: ['reins', 'coronaires'], niveauMin: 2,
    appliquer: (t, s) => { t.diabete = 1; t.plaqueCoro = Math.max(t.plaqueCoro, 0.1 + 0.15 * s); t.plaqueMembres = Math.max(t.plaqueMembres, 0.12 + 0.2 * s); t.rein = Math.min(t.rein, 1 - 0.15 * s); },
    texte: {
      1: 'Trop de sucre dans le sang abîme peu à peu les artères, les reins, les yeux et les nerfs. Il double le risque d\'infarctus.',
      2: 'L\'hyperglycémie chronique accélère l\'athérosclérose et la néphropathie. Le diabète multiplie l\'effet des autres facteurs de risque (HTA, LDL).',
      3: 'Atteinte micro et macrovasculaire. Les iSGLT2 apportent un bénéfice cardio-rénal indépendant de la baisse de la glycémie ; l\'objectif de LDL est plus strict.',
    },
    voir: 'Vue Vaisseau : plaques débutantes (coronaires, jambes). Vue Corps : reins un peu moins rouges, artères des jambes touchées. Au fil des mois, plaques et reins se dégradent plus vite.',
    consequences: ['Infarctus, AVC', 'Insuffisance rénale', 'Rétinopathie, neuropathie'],
    traitement: { propose: { isglt2: 1, statine: 1 }, texte: 'iSGLT2 pour la protection du cœur et des reins, statine, contrôle de la PA (IEC/ARA II), plus le traitement de la glycémie (metformine…).' },
  },
];

export const PATHO_PAR_ID = Object.fromEntries(PATHOLOGIES.map((p) => [p.id, p])) as Record<string, Pathologie>;

export const SEVERITES = [
  { v: 0.4, nom: 'Légère' },
  { v: 0.7, nom: 'Modérée' },
  { v: 1, nom: 'Sévère' },
] as const;

export interface PathoActive { id: string; s: number }

/** Construit le terrain à partir d'une liste de pathologies actives. */
export function construireTerrain(base: Terrain, actives: PathoActive[]): Terrain {
  const t = { ...base };
  for (const a of actives) PATHO_PAR_ID[a.id]?.appliquer(t, a.s);
  return t;
}
