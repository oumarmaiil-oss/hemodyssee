/**
 * Cas cliniques d'entraînement : une situation, deux questions (diagnostic puis conduite à tenir),
 * une correction expliquée. Contenu conforme aux recommandations européennes (ESC) en vigueur.
 */
import type { Traitement } from '../core/types.ts';
import type { ZoneId } from './zones.ts';
import type { PathoActive } from './pathologies.ts';

export interface Option { t: string; ok?: boolean; pourquoi: string }
export interface Question { q: string; options: Option[] }
export interface CasClinique {
  id: string;
  accroche: string; // titre neutre, qui ne donne pas la réponse
  vignette: string;
  examen: string[];
  pathos: PathoActive[];
  zone: ZoneId | null;
  questions: [Question, Question];
  traitement?: Traitement; // montré dans la simulation à la fin
  aRetenir: string;
}

export const CAS: CasClinique[] = [
  {
    id: 'hta', accroche: 'Homme de 56 ans, visite pour un certificat',
    vignette: 'M. D., chauffeur, ne se plaint de rien. Il vient pour un certificat d\'aptitude.',
    examen: ['PA 158/98 mmHg au cabinet, confirmée par automesure à domicile (moyenne 148/94)', 'Pouls 72/min, régulier', 'Créatinine normale, pas de protéines dans les urines'],
    pathos: [{ id: 'hta', s: 0.7 }], zone: 'aorte',
    questions: [
      { q: 'Quel est le diagnostic ?', options: [
        { t: 'Hypertension artérielle', ok: true, pourquoi: 'PA ≥ 140/90 au cabinet, confirmée à domicile (≥ 135/85).' },
        { t: 'Simple « effet blouse blanche »', pourquoi: 'Non : l\'automesure à domicile est elle aussi élevée.' },
        { t: 'Tension normale pour son âge', pourquoi: 'Non : le seuil ne change pas avec l\'âge à 56 ans.' },
        { t: 'Insuffisance cardiaque', pourquoi: 'Rien ne l\'évoque : pas d\'essoufflement ni d\'œdèmes.' },
      ] },
      { q: 'Quel traitement de départ ?', options: [
        { t: 'Bithérapie IEC (ou ARA II) + amlodipine, en un seul comprimé', ok: true, pourquoi: 'Les recommandations conseillent d\'emblée deux médicaments associés, idéalement en un comprimé.' },
        { t: 'Bêtabloquant seul', pourquoi: 'Pas en première intention sans raison particulière (angor, infarctus, FA, insuffisance cardiaque).' },
        { t: 'Règles hygiéno-diététiques seules, revoir dans un an', pourquoi: 'Utiles mais insuffisantes ici : l\'HTA est confirmée, il faut traiter sans attendre.' },
        { t: 'Diurétique de l\'anse (furosémide)', pourquoi: 'Réservé à la surcharge en eau (insuffisance cardiaque, rein très altéré).' },
      ] },
    ],
    traitement: { iec: 1, ica: 1 },
    aRetenir: 'HTA confirmée : bithérapie d\'emblée en un comprimé, objectif < 130/80 si bien toléré.',
  },
  {
    id: 'fa', accroche: 'Femme de 74 ans, palpitations depuis 3 jours',
    vignette: 'Mme N., hypertendue, sent son cœur « battre la chamade » depuis trois jours.',
    examen: ['Pouls irrégulier, 118/min', 'ECG : rythme irrégulier, aucune onde P, ligne de base qui tremble', 'PA 142/86 mmHg'],
    pathos: [{ id: 'fa', s: 0.7 }, { id: 'hta', s: 0.4 }], zone: 'og',
    questions: [
      { q: 'Quel est le diagnostic ?', options: [
        { t: 'Fibrillation atriale', ok: true, pourquoi: 'Rythme irrégulier sans onde P : c\'est la signature de la FA.' },
        { t: 'Tachycardie sinusale', pourquoi: 'Non : elle est régulière, avec une onde P avant chaque QRS.' },
        { t: 'Bloc auriculo-ventriculaire complet', pourquoi: 'Non : il donne un pouls lent et régulier.' },
        { t: 'Quelques extrasystoles', pourquoi: 'Non : le rythme est irrégulier en permanence et sans onde P.' },
      ] },
      { q: 'Pour prévenir l\'AVC, que faut-il ?', options: [
        { t: 'Un anticoagulant oral direct', ok: true, pourquoi: 'Score CHA₂DS₂-VA = 2 (âge 65-74 ans, HTA) : anticoagulation recommandée.' },
        { t: 'De l\'aspirine', pourquoi: 'Non : l\'aspirine ne protège pas efficacement de l\'AVC dans la FA.' },
        { t: 'Rien si elle se sent mieux', pourquoi: 'Non : le risque de caillot persiste même sans symptôme.' },
        { t: 'Une statine', pourquoi: 'Elle n\'empêche pas le caillot de l\'oreillette.' },
      ] },
    ],
    traitement: { aod: 1, bb: 1 },
    aRetenir: 'FA : on ralentit le cœur et on anticoagule selon le score CHA₂DS₂-VA.',
  },
  {
    id: 'angor', accroche: 'Homme de 63 ans, gêne dans la poitrine à l\'effort',
    vignette: 'M. F., fumeur et diabétique, ressent un serrement dans la poitrine en montant les escaliers. Il cède en 2-3 minutes au repos.',
    examen: ['ECG de repos normal', 'LDL 3,6 mmol/L', 'PA 136/82 mmHg'],
    pathos: [{ id: 'angor', s: 0.7 }, { id: 'diabete', s: 0.7 }], zone: 'coronaires',
    questions: [
      { q: 'Quel est le diagnostic le plus probable ?', options: [
        { t: 'Angor stable', ok: true, pourquoi: 'Douleur déclenchée par l\'effort, qui cède au repos : la coronaire rétrécie ne suit plus la demande.' },
        { t: 'Infarctus en cours', pourquoi: 'Non : la douleur cède vite au repos et l\'ECG est normal.' },
        { t: 'Reflux gastrique', pourquoi: 'Peu probable : le lien avec l\'effort oriente vers le cœur.' },
        { t: 'Douleur musculaire', pourquoi: 'Non : elle ne cède pas en quelques minutes de repos.' },
      ] },
      { q: 'Quel traitement ?', options: [
        { t: 'Aspirine + statine forte dose + anti-angineux (bêtabloquant), dérivé nitré en cas de crise', ok: true, pourquoi: 'On prévient le caillot, on stabilise la plaque et on réduit le besoin en oxygène du cœur. Arrêt du tabac.' },
        { t: 'Un antalgique simple', pourquoi: 'Il masque la douleur sans traiter la cause.' },
        { t: 'Un anticoagulant oral seul', pourquoi: 'Non : sur une plaque, c\'est l\'antiagrégant qui est indiqué.' },
        { t: 'Rien, c\'est l\'âge', pourquoi: 'Non : risque d\'infarctus si la plaque se rompt.' },
      ] },
    ],
    traitement: { aspirine: 1, statine: 2, bb: 1 },
    aRetenir: 'Angor stable : aspirine, statine, anti-angineux, et contrôle des facteurs de risque.',
  },
  {
    id: 'idm', accroche: 'Homme de 58 ans, douleur thoracique depuis 40 minutes',
    vignette: 'M. S. a une douleur intense au milieu de la poitrine, au repos, depuis 40 minutes, avec des sueurs. Elle irradie vers le bras gauche.',
    examen: ['ECG : sus-décalage du segment ST en territoire antérieur', 'PA 105/70 mmHg, FC 96/min'],
    pathos: [{ id: 'idm', s: 0.7 }], zone: 'coronaires',
    questions: [
      { q: 'Quel est le diagnostic ?', options: [
        { t: 'Infarctus du myocarde avec sus-décalage du ST', ok: true, pourquoi: 'Douleur prolongée au repos et sus-décalage du ST : une coronaire est bouchée.' },
        { t: 'Angor stable', pourquoi: 'Non : la douleur dure plus de 20 minutes, au repos.' },
        { t: 'Crise d\'angoisse', pourquoi: 'Non : l\'ECG est clairement anormal.' },
        { t: 'Douleur de la paroi thoracique', pourquoi: 'Non : elle ne modifie pas l\'ECG.' },
      ] },
      { q: 'Que faire ?', options: [
        { t: 'Appeler les urgences : aspirine, puis déboucher l\'artère au plus vite (angioplastie)', ok: true, pourquoi: 'Chaque minute compte : le muscle meurt tant que l\'artère reste bouchée.' },
        { t: 'Attendre que la douleur passe', pourquoi: 'Non : la nécrose s\'étend pendant l\'attente.' },
        { t: 'Antalgique et contrôle demain', pourquoi: 'Non : c\'est une urgence absolue.' },
        { t: 'Une statine seule', pourquoi: 'Elle fait partie du traitement après, mais ne débouche pas l\'artère.' },
      ] },
    ],
    traitement: { aspirine: 1, statine: 2, bb: 1, iec: 1 },
    aRetenir: 'Infarctus avec sus-décalage du ST : désobstruction en urgence, puis aspirine, statine, bêtabloquant, IEC.',
  },
  {
    id: 'aomi', accroche: 'Homme de 67 ans, douleur au mollet en marchant',
    vignette: 'M. B., fumeur, a mal au mollet droit après 200 mètres de marche. La douleur disparaît quand il s\'arrête.',
    examen: ['Pouls du pied faibles à droite', 'Index de pression systolique (IPS) : 0,65 (normal 1,0 à 1,4)'],
    pathos: [{ id: 'aomi', s: 0.7 }], zone: 'membres',
    questions: [
      { q: 'Quel est le diagnostic ?', options: [
        { t: 'Artériopathie des membres inférieurs (claudication)', ok: true, pourquoi: 'Douleur à la marche qui cède à l\'arrêt, avec un IPS < 0,9 : les artères de la jambe sont rétrécies.' },
        { t: 'Sciatique', pourquoi: 'Non : elle ne disparaît pas aussi vite à l\'arrêt et l\'IPS serait normal.' },
        { t: 'Phlébite', pourquoi: 'Non : la jambe serait gonflée, douloureuse au repos.' },
        { t: 'Simple crampe', pourquoi: 'Non : l\'IPS bas montre une atteinte artérielle.' },
      ] },
      { q: 'Quelle prise en charge ?', options: [
        { t: 'Arrêt du tabac, marche régulière, statine + antiagrégant', ok: true, pourquoi: 'La marche développe la circulation de secours ; statine et antiagrégant protègent aussi le cœur et le cerveau.' },
        { t: 'Repos strict', pourquoi: 'Non : la marche encadrée est au contraire le traitement.' },
        { t: 'Un anticoagulant seul', pourquoi: 'Non : l\'antiagrégant est le traitement de référence.' },
        { t: 'Un anti-inflammatoire', pourquoi: 'Non : ce n\'est pas une inflammation.' },
      ] },
    ],
    traitement: { statine: 1, aspirine: 1 },
    aRetenir: 'AOMI : un marqueur d\'athérome diffus ; arrêt du tabac, marche, statine, antiagrégant.',
  },
  {
    id: 'icfer', accroche: 'Femme de 68 ans, essoufflée au moindre effort',
    vignette: 'Mme K., ancien infarctus, s\'essouffle en marchant dans la maison. Ses chevilles gonflent et elle dort avec trois oreillers.',
    examen: ['Crépitants aux deux bases pulmonaires', 'Échographie : fraction d\'éjection 30 %', 'PA 118/74 mmHg, FC 92/min'],
    pathos: [{ id: 'icfer', s: 0.7 }], zone: 'vg',
    questions: [
      { q: 'Quel est le diagnostic ?', options: [
        { t: 'Insuffisance cardiaque à fraction d\'éjection réduite', ok: true, pourquoi: 'Essoufflement, œdèmes, crépitants et FE ≤ 40 % : le cœur pompe mal.' },
        { t: 'Asthme', pourquoi: 'Non : il ne donne ni œdèmes des chevilles ni FE basse.' },
        { t: 'Hypertension artérielle', pourquoi: 'Non : la PA est normale ici.' },
        { t: 'Simple fatigue', pourquoi: 'Non : les signes de congestion sont nets.' },
      ] },
      { q: 'Quel traitement de fond ?', options: [
        { t: 'Les quatre piliers : IEC/ARNI, bêtabloquant, antialdostérone, iSGLT2 (+ diurétique si congestion)', ok: true, pourquoi: 'Ensemble, ils réduisent fortement les décès et les hospitalisations.' },
        { t: 'Un diurétique seul', pourquoi: 'Il soulage la congestion mais ne protège pas le cœur à long terme.' },
        { t: 'Vérapamil (inhibiteur calcique)', pourquoi: 'À éviter : il affaiblit encore la contraction.' },
        { t: 'Repos, sans médicament', pourquoi: 'Non : le pronostic sans traitement est sévère.' },
      ] },
    ],
    traitement: { arni: 1, bb: 1, mra: 1, isglt2: 1, anse: 1 },
    aRetenir: 'IC à FE réduite : les quatre piliers, introduits rapidement, plus un diurétique si besoin.',
  },
  {
    id: 'ra', accroche: 'Homme de 79 ans, malaise en marchant vite',
    vignette: 'M. G. a fait un malaise en pressant le pas. Il s\'essouffle et sent une oppression dans la poitrine à l\'effort.',
    examen: ['Souffle systolique rude au foyer aortique, qui irradie vers le cou', 'Échographie : valve aortique calcifiée, très rétrécie'],
    pathos: [{ id: 'ra', s: 1 }], zone: 'valveAo',
    questions: [
      { q: 'Quel est le diagnostic ?', options: [
        { t: 'Rétrécissement aortique serré', ok: true, pourquoi: 'Souffle systolique irradiant au cou, valve calcifiée : le ventricule pousse contre un obstacle.' },
        { t: 'Insuffisance mitrale', pourquoi: 'Non : son souffle siège à la pointe et irradie vers l\'aisselle.' },
        { t: 'Angor simple', pourquoi: 'L\'oppression existe, mais le souffle et l\'échographie montrent la valve.' },
        { t: 'Anémie', pourquoi: 'Non : l\'échographie montre la cause.' },
      ] },
      { q: 'Quel traitement ?', options: [
        { t: 'Remplacer la valve (chirurgie ou TAVI)', ok: true, pourquoi: 'Rétrécissement serré avec symptômes : aucun médicament ne lève l\'obstacle.' },
        { t: 'Un vasodilatateur puissant', pourquoi: 'Dangereux : la PA peut s\'effondrer, le débit ne pouvant pas augmenter.' },
        { t: 'Une statine pour faire régresser la valve', pourquoi: 'Non : les essais n\'ont montré aucun effet sur la valve.' },
        { t: 'Simple surveillance', pourquoi: 'Non : une fois les symptômes apparus, le pronostic se dégrade vite sans intervention.' },
      ] },
    ],
    aRetenir: 'Rétrécissement aortique serré symptomatique : remplacement valvulaire.',
  },
  {
    id: 'bav', accroche: 'Femme de 81 ans, pertes de connaissance brèves',
    vignette: 'Mme T. est tombée deux fois cette semaine, avec une perte de connaissance de quelques secondes.',
    examen: ['Pouls lent et régulier, 36/min', 'ECG : ondes P régulières, sans lien avec des QRS larges et lents'],
    pathos: [{ id: 'bav', s: 0.7 }], zone: 'noeudAV',
    questions: [
      { q: 'Quel est le diagnostic ?', options: [
        { t: 'Bloc auriculo-ventriculaire complet', ok: true, pourquoi: 'Les oreillettes et les ventricules battent chacun à leur rythme : le signal ne passe plus.' },
        { t: 'Fibrillation atriale lente', pourquoi: 'Non : le rythme est régulier et les ondes P sont visibles.' },
        { t: 'Bradycardie du sportif', pourquoi: 'Non : à 81 ans avec malaises et dissociation P-QRS, c\'est un bloc.' },
        { t: 'Hypoglycémie', pourquoi: 'Elle n\'explique pas l\'ECG.' },
      ] },
      { q: 'Quel traitement ?', options: [
        { t: 'Un stimulateur cardiaque (pacemaker)', ok: true, pourquoi: 'Il remplace le signal qui ne passe plus.' },
        { t: 'Un bêtabloquant', pourquoi: 'Dangereux : il ralentit encore le cœur.' },
        { t: 'Un anticoagulant', pourquoi: 'Ce n\'est pas un problème de caillot.' },
        { t: 'Rien', pourquoi: 'Non : risque de mort subite.' },
      ] },
    ],
    aRetenir: 'BAV complet avec malaises : pacemaker ; arrêter tout médicament qui ralentit le cœur.',
  },
  {
    id: 'ldl', accroche: 'Homme de 45 ans, bilan de routine',
    vignette: 'M. A. n\'a aucun symptôme. Son père a fait un infarctus à 50 ans.',
    examen: ['LDL 4,9 mmol/L (1,9 g/L)', 'PA 128/80 mmHg, non fumeur'],
    pathos: [{ id: 'dyslip', s: 1 }], zone: 'coronaires',
    questions: [
      { q: 'Quel est le principal danger ?', options: [
        { t: 'Des plaques d\'athérome : infarctus, AVC', ok: true, pourquoi: 'Le LDL en excès se dépose dans les artères ; le risque dépend de l\'exposition cumulée.' },
        { t: 'Une insuffisance rénale aiguë', pourquoi: 'Non : ce n\'est pas l\'effet du LDL.' },
        { t: 'Un diabète', pourquoi: 'Non : ce sont deux facteurs de risque distincts.' },
        { t: 'Aucun, puisqu\'il n\'a pas de symptôme', pourquoi: 'Non : l\'athérome se construit en silence pendant des années.' },
      ] },
      { q: 'Que proposer ?', options: [
        { t: 'Mesures hygiéno-diététiques et statine', ok: true, pourquoi: 'LDL ≥ 4,9 mmol/L et antécédent familial : une statine est justifiée.' },
        { t: 'Rien, à revoir dans 10 ans', pourquoi: 'Non : chaque année d\'exposition compte.' },
        { t: 'De l\'aspirine', pourquoi: 'Non : sans maladie vasculaire, elle n\'est pas recommandée en prévention.' },
        { t: 'Un anticoagulant', pourquoi: 'Non : sans rapport avec le cholestérol.' },
      ] },
    ],
    traitement: { statine: 1 },
    aRetenir: 'LDL élevé : le risque dépend de l\'exposition cumulée ; −1 mmol/L ≈ −22 % d\'événements.',
  },
];
