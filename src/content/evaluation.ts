/**
 * Bilan d'un traitement face aux maladies simulées : objectifs atteints ou non,
 * ce qui manque (par exemple une monothérapie là où une bithérapie est recommandée),
 * ce qui est en trop ou déconseillé. Repères : recommandations ESC/ESH (HTA 2023-2024),
 * ESC (dyslipidémies 2019, IC 2021-2023, FA 2024).
 */
import type { ClasseId, Etat, Traitement } from '../core/types.ts';
import { CLASSE_PAR_ID } from './classes.ts';
import { PATHO_PAR_ID, type PathoActive } from './pathologies.ts';

/** Pour chaque maladie : groupes de classes requis (une classe du groupe suffit). */
const REQUIS: Record<string, { groupes: ClasseId[][]; pourquoi: string[] }> = {
  hta: { groupes: [['iec', 'ara2', 'arni'], ['ica', 'thiazide']], pourquoi: ['bloquer le système rénine-angiotensine', 'un 2e mécanisme : vasodilatation (inhibiteur calcique) ou élimination du sel (thiazidique)'] },
  htaSys: { groupes: [['ica', 'thiazide', 'iec', 'ara2']], pourquoi: ['baisser la pression systolique'] },
  hvg: { groupes: [['iec', 'ara2', 'arni'], ['ica', 'thiazide']], pourquoi: ['faire régresser l\'hypertrophie (SRAA)', 'contrôler la pression'] },
  dyslip: { groupes: [['statine']], pourquoi: ['baisser le LDL'] },
  athero: { groupes: [['statine'], ['aspirine']], pourquoi: ['stabiliser la plaque', 'éviter le caillot sur la plaque'] },
  aomi: { groupes: [['statine'], ['aspirine']], pourquoi: ['stabiliser les plaques', 'éviter la thrombose'] },
  angor: { groupes: [['bb'], ['statine'], ['aspirine']], pourquoi: ['ralentir le cœur (moins de besoin en O₂)', 'stabiliser la plaque', 'prévenir l\'infarctus'] },
  idm: { groupes: [['aspirine'], ['bb'], ['iec', 'ara2', 'arni'], ['statine']], pourquoi: ['éviter la récidive de caillot', 'protéger le cœur, prévenir les troubles du rythme', 'limiter le remodelage', 'baisser fortement le LDL'] },
  icfer: { groupes: [['arni', 'iec', 'ara2'], ['bb'], ['mra'], ['isglt2']], pourquoi: ['pilier 1 : ARNI (ou IEC/ARA II)', 'pilier 2 : bêtabloquant', 'pilier 3 : antialdostérone', 'pilier 4 : iSGLT2'] },
  icfep: { groupes: [['isglt2']], pourquoi: ['réduire les hospitalisations'] },
  oap: { groupes: [['anse']], pourquoi: ['retirer l\'eau des poumons en urgence'] },
  fa: { groupes: [['aod'], ['bb']], pourquoi: ['prévenir l\'AVC par caillot', 'ralentir la fréquence'] },
  rm: { groupes: [['bb']], pourquoi: ['allonger la diastole pour mieux remplir le ventricule'] },
  it: { groupes: [['anse']], pourquoi: ['réduire la congestion veineuse'] },
  avc: { groupes: [['statine'], ['iec', 'ara2', 'ica', 'thiazide']], pourquoi: ['prévention secondaire : LDL bas', 'contrôle de la pression'] },
  irc: { groupes: [['iec', 'ara2'], ['isglt2']], pourquoi: ['protéger les reins (SRAA)', 'ralentir le déclin rénal'] },
  diabete: { groupes: [['isglt2'], ['statine']], pourquoi: ['protection cœur et reins', 'LDL plus bas chez le diabétique'] },
};

export interface Objectif { nom: string; atteint: boolean; valeur: string }
export interface Bilan {
  objectifs: Objectif[];
  manquants: { patho: string; texte: string; classes: ClasseId[] }[];
  enTrop: { classe: ClasseId; texte: string }[];
  remarques: string[];
  score: 'bon' | 'partiel' | 'insuffisant' | 'aucun';
}

const ANTIHTA: ClasseId[] = ['iec', 'ara2', 'arni', 'ica', 'thiazide'];
const nomsGroupe = (g: ClasseId[]) => g.map((c) => CLASSE_PAR_ID[c].court).join(' ou ');

export function bilan(actives: PathoActive[], tr: Traitement, e: Etat): Bilan {
  const ids = actives.map((a) => a.id);
  const has = (c: ClasseId) => (tr[c] ?? 0) > 0;
  const objectifs: Objectif[] = [];
  const remarques: string[] = [];

  const tension = ids.some((i) => ['hta', 'htaSys', 'hvg', 'irc', 'avc', 'diabete', 'icfep'].includes(i));
  if (tension) {
    objectifs.push({ nom: 'PA < 140/90 mmHg', atteint: e.pas < 140 && e.pad < 90, valeur: `${e.pas}/${e.pad}` });
    objectifs.push({ nom: 'Idéal : systolique 120-129 si bien tolérée', atteint: e.pas >= 115 && e.pas < 130, valeur: `${e.pas}` });
  }
  const tresHaut = ids.some((i) => ['athero', 'aomi', 'angor', 'idm', 'avc'].includes(i));
  const lipides = tresHaut || ids.some((i) => ['dyslip', 'diabete'].includes(i));
  if (lipides) {
    const cible = tresHaut ? 1.4 : ids.includes('diabete') ? 1.8 : 2.6;
    objectifs.push({ nom: `LDL < ${String(cible).replace('.', ',')} mmol/L${tresHaut ? ' (risque très élevé)' : ids.includes('diabete') ? ' (risque élevé)' : ''}`, atteint: e.ldl < cible, valeur: e.ldl.toFixed(1).replace('.', ',') });
  }
  if (ids.includes('fa')) {
    objectifs.push({ nom: 'Anticoagulation (prévention de l\'AVC)', atteint: has('aod'), valeur: has('aod') ? 'oui' : 'non' });
    objectifs.push({ nom: 'Fréquence de repos < 110/min', atteint: e.fc < 110, valeur: `${e.fc}` });
  }
  if (ids.includes('angor')) objectifs.push({ nom: 'Pas d\'ischémie (apport ≥ besoin du myocarde)', atteint: e.perfusion.coeur >= 0.85, valeur: `${Math.round(e.perfusion.coeur * 100)} %` });
  if (ids.some((i) => ['icfer', 'oap', 'icfep', 'rm'].includes(i))) objectifs.push({ nom: 'Poumons secs (P. oreillette G < 18)', atteint: e.pog < 18, valeur: `${e.pog} mmHg` });

  // Ce qui manque.
  const manquants: Bilan['manquants'] = [];
  const indiques = new Set<ClasseId>();
  for (const id of ids) {
    const r = REQUIS[id];
    if (!r) continue;
    r.groupes.forEach((g, k) => {
      g.forEach((c) => indiques.add(c));
      if (!g.some(has)) manquants.push({ patho: PATHO_PAR_ID[id].court, texte: `${nomsGroupe(g)} : ${r.pourquoi[k]}`, classes: g });
    });
  }
  // Classes proposées par les fiches sans être obligatoires : jamais jugées « en trop ».
  if (ids.some((i) => ['icfer', 'icfep', 'oap', 'rm', 'it'].includes(i))) indiques.add('anse'); // congestion
  if (ids.includes('ia')) ['iec', 'ara2', 'ica'].forEach((c) => indiques.add(c as ClasseId)); // vasodilatateur en attendant la chirurgie
  if (ids.includes('avc')) indiques.add('aspirine'); // AVC athéromateux (AOD si FA)
  if (ids.includes('icfep')) ['iec', 'ara2'].forEach((c) => indiques.add(c as ClasseId)); // contrôle de la PA
  if (ids.includes('dyslip') || tresHaut) indiques.add('ezetimibe');
  if (tension) ['ica', 'thiazide', 'iec', 'ara2', 'mra'].forEach((c) => indiques.add(c as ClasseId));

  // Monothérapie au lieu d'une bithérapie.
  const nbAntiHta = ANTIHTA.filter(has).length;
  if (ids.includes('hta') && nbAntiHta === 1) {
    remarques.push('Monothérapie : la PA baisse d\'environ 8 à 10 mmHg, souvent insuffisant pour atteindre l\'objectif. Ajouter une 2e classe baisse environ deux fois plus que doubler la dose de la première (effets additifs, moins d\'effets indésirables). C\'est pourquoi les recommandations proposent une bithérapie d\'emblée, de préférence en un seul comprimé.');
  }
  if (has('ica') && (tr.ica ?? 0) >= 2 && !(has('iec') || has('ara2') || has('arni'))) remarques.push('Amlodipine à forte dose sans IEC/ARA II : les œdèmes des chevilles sont fréquents. L\'association avec un IEC les réduit.');
  if (ids.includes('angor') && has('bb') && e.perfusion.coeur < 0.85) remarques.push('Ischémie persistante malgré le traitement médical : la sténose est serrée. On discute une revascularisation (angioplastie avec stent, ou pontage).');
  if (ids.includes('rm') && e.pog >= 18) remarques.push('Rétrécissement mitral serré : la congestion persiste sous traitement médical, car l\'obstacle est mécanique. Traitement de référence : dilatation de la valve au ballon (commissurotomie) ou chirurgie.');
  if (has('statine') && has('ezetimibe') && tresHaut && e.ldl >= 1.4) remarques.push('LDL encore un peu au-dessus de l\'objectif sous statine forte + ézétimibe : c\'est fréquent. Étape suivante possible : inhibiteur de PCSK9 (non simulé ici).');
  if (has('statine') && lipides && e.ldl >= (tresHaut ? 1.4 : 1.8) && !has('ezetimibe')) remarques.push('Objectif de LDL non atteint sous statine : on augmente l\'intensité de la statine (chaque doublement n\'ajoute qu\'environ 6 %), puis on ajoute l\'ézétimibe (environ −20 % de plus).');

  // Ce qui est en trop ou déconseillé.
  const enTrop: Bilan['enTrop'] = [];
  for (const c of Object.keys(tr) as ClasseId[]) {
    if (!has(c) || indiques.has(c)) continue;
    const cl = CLASSE_PAR_ID[c];
    enTrop.push({ classe: c, texte: `${cl.court} : pas d'indication démontrée pour ${ids.length > 1 ? 'ces maladies' : 'cette maladie'}. Il ajoute ses effets indésirables (${cl.indesirables[0].toLowerCase()}) sans bénéfice attendu ici.` });
  }
  if (ids.includes('hta') && has('bb') && !ids.some((i) => ['angor', 'idm', 'icfer', 'fa'].includes(i))) {
    enTrop.push({ classe: 'bb', texte: 'Bêtabloquant : il baisse la PA, mais il n\'est pas un premier choix dans l\'HTA sans angor, infarctus, insuffisance cardiaque ou FA.' });
  }

  const nbTr = Object.values(tr).filter((d) => d && d > 0).length;
  const ok = objectifs.filter((o) => o.atteint && !o.nom.startsWith('Idéal')).length;
  const tot = objectifs.filter((o) => !o.nom.startsWith('Idéal')).length;
  const score: Bilan['score'] = nbTr === 0 ? 'aucun' : manquants.length === 0 && ok === tot ? 'bon' : ok > 0 || manquants.length < 2 ? 'partiel' : 'insuffisant';
  return { objectifs, manquants, enTrop, remarques, score };
}
