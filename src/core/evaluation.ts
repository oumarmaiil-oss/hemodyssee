/**
 * Évaluation du traitement choisi pour chaque maladie simulée :
 * ce qui est réglé, ce qui manque (par exemple une monothérapie là où une
 * bithérapie est attendue) et ce qui a été ajouté sans indication.
 */
import type { ClasseId, Etat, Traitement } from './types.ts';
import { PATHO_PAR_ID, type PathoActive } from '../content/pathologies.ts';
import { CLASSE_PAR_ID } from '../content/classes.ts';

export interface Point { ok: boolean; texte: string }

const on = (tr: Traitement, c: ClasseId) => (tr[c] ?? 0) > 0;
const nom = (c: ClasseId) => CLASSE_PAR_ID[c].court;
const ANTI_HTA: ClasseId[] = ['iec', 'ara2', 'arni', 'ica', 'thiazide', 'bb', 'mra'];
const SRAA: ClasseId[] = ['iec', 'ara2', 'arni'];

/** Objectif de LDL (mmol/L) selon le niveau de risque, d'après les recommandations ESC/EAS 2019. */
export function objectifLdl(actives: PathoActive[]): { cible: number; risque: string } {
  const ids = actives.map((a) => a.id);
  if (ids.some((i) => ['angor', 'idm', 'avc', 'athero', 'aomi'].includes(i))) return { cible: 1.4, risque: 'très haut risque (maladie athéromateuse)' };
  if (ids.includes('diabete') || ids.includes('irc')) return { cible: 1.8, risque: 'haut risque' };
  return { cible: 2.6, risque: 'risque modéré' };
}

export function evaluerPathologie(id: string, actives: PathoActive[], e: Etat, tr: Traitement): Point[] {
  const P: Point[] = [];
  const nbHta = ANTI_HTA.filter((c) => on(tr, c)).length;
  const pa = (seuil = 140) => {
    if (e.pas < seuil) P.push({ ok: true, texte: `Tension contrôlée : ${e.pas}/${e.pad} mmHg (objectif < ${seuil}/90, idéalement 120-129 de systolique).` });
    else if (nbHta === 0) P.push({ ok: false, texte: `Tension à ${e.pas}/${e.pad} mmHg sans traitement : la plupart des patients ont besoin d'une bithérapie d'emblée.` });
    else if (nbHta === 1) P.push({ ok: false, texte: `Monothérapie : la PA baisse d'environ 8 à 10 mmHg mais reste à ${e.pas}/${e.pad}. Il manque une 2e classe (bithérapie IEC ou ARA II + inhibiteur calcique ou thiazidique).` });
    else if (nbHta === 2) P.push({ ok: false, texte: `Bithérapie insuffisante (${e.pas}/${e.pad}) : passer à la trithérapie IEC/ARA II + inhibiteur calcique + thiazidique, ou augmenter les doses.` });
    else P.push({ ok: false, texte: `PA encore à ${e.pas}/${e.pad} malgré ${nbHta} classes : HTA résistante, penser à l'antialdostérone et vérifier l'observance.` });
  };
  const ldl = () => {
    const { cible, risque } = objectifLdl(actives);
    const v = e.ldl.toFixed(1);
    if (e.ldl <= cible) P.push({ ok: true, texte: `LDL à ${v} mmol/L : objectif < ${cible} atteint (${risque}).` });
    else if (!on(tr, 'statine')) P.push({ ok: false, texte: `LDL à ${v} mmol/L, objectif < ${cible} (${risque}) : il manque une statine.` });
    else if ((tr.statine ?? 0) < 2) P.push({ ok: false, texte: `LDL à ${v} mmol/L, objectif < ${cible} : augmenter la statine (forte intensité) ou ajouter l'ézétimibe.` });
    else if (!on(tr, 'ezetimibe')) P.push({ ok: false, texte: `LDL à ${v} mmol/L sous statine forte : ajouter l'ézétimibe (environ −20 %).` });
    else P.push({ ok: false, texte: `LDL à ${v} mmol/L malgré statine + ézétimibe : discuter un anti-PCSK9.` });
  };
  const antiag = () => {
    const fa = actives.some((a) => a.id === 'fa');
    if (fa) return;
    P.push(on(tr, 'aspirine') ? { ok: true, texte: 'Antiagrégant présent : il prévient le caillot sur la plaque.' } : { ok: false, texte: 'Il manque un antiagrégant (aspirine faible dose) : prévention du caillot sur la plaque.' });
  };
  const besoin = (c: ClasseId, pourquoi: string) => P.push(on(tr, c) ? { ok: true, texte: `${nom(c)} : ${pourquoi}.` } : { ok: false, texte: `Il manque : ${nom(c)} (${pourquoi}).` });

  switch (id) {
    case 'hta': case 'htaSys': pa(); break;
    case 'hvg': pa(130); P.push(SRAA.some((c) => on(tr, c)) ? { ok: true, texte: 'Bloqueur du SRAA : meilleure régression de l\'hypertrophie.' } : { ok: false, texte: 'Un IEC ou un ARA II ferait mieux régresser l\'hypertrophie.' }); break;
    case 'irc': pa(130); P.push(SRAA.some((c) => on(tr, c)) ? { ok: true, texte: 'IEC/ARA II : protège la filtration du rein.' } : { ok: false, texte: 'Il manque un IEC ou un ARA II (protection rénale).' }); besoin('isglt2', 'ralentit le déclin rénal'); break;
    case 'diabete': besoin('isglt2', 'protection du cœur et des reins'); ldl(); break;
    case 'dyslip': ldl(); break;
    case 'athero': case 'aomi': ldl(); antiag(); break;
    case 'angor': besoin('bb', 'ralentit le cœur et réduit le besoin en oxygène'); ldl(); antiag();
      P.push(e.perfusion.coeur >= 0.8 ? { ok: true, texte: 'Apport et besoin en oxygène du cœur à nouveau équilibrés.' } : { ok: false, texte: 'Le cœur manque encore d\'oxygène : ralentir davantage ou envisager une angioplastie.' }); break;
    case 'idm': antiag(); besoin('bb', 'protège après l\'infarctus'); P.push(SRAA.some((c) => on(tr, c)) ? { ok: true, texte: 'IEC : limite le remodelage du ventricule.' } : { ok: false, texte: 'Il manque un IEC (remodelage du ventricule).' }); ldl();
      if (e.pas < 90) P.push({ ok: false, texte: `Tension trop basse (${e.pas} mmHg) : réduire les doses.` }); break;
    case 'icfer': {
      const piliers = [SRAA.some((c) => on(tr, c)), on(tr, 'bb'), on(tr, 'mra'), on(tr, 'isglt2')];
      const n = piliers.filter(Boolean).length;
      P.push({ ok: n === 4, texte: `${n} pilier${n > 1 ? 's' : ''} sur 4 (ARNI/IEC, bêtabloquant, antialdostérone, iSGLT2)${n < 4 ? ' : chacun réduit la mortalité, l\'objectif est d\'avoir les quatre.' : '.'}` });
      P.push(e.pog < 18 ? { ok: true, texte: 'Pas de congestion pulmonaire.' } : { ok: false, texte: `Congestion (pression de l'oreillette gauche ${e.pog} mmHg) : il faut un diurétique de l'anse.` });
      break;
    }
    case 'icfep': besoin('isglt2', 'réduit les hospitalisations'); P.push(e.pog < 18 ? { ok: true, texte: 'Pas de congestion.' } : { ok: false, texte: 'Congestion : ajouter un diurétique de l\'anse.' }); pa(130); break;
    case 'oap': P.push(e.pog < 18 ? { ok: true, texte: `Œdème levé : pression de l'oreillette gauche ${e.pog} mmHg.` } : { ok: false, texte: `Œdème persistant (${e.pog} mmHg) : diurétique de l'anse à dose plus forte.` }); break;
    case 'fa': {
      const rm = actives.some((a) => a.id === 'rm');
      if (rm) P.push({ ok: false, texte: 'Avec un rétrécissement mitral serré, l\'anticoagulation se fait par AVK, pas par AOD.' });
      else besoin('aod', 'supprime le caillot de l\'oreillette et réduit d\'environ deux tiers le risque d\'AVC');
      P.push(e.fc <= 110 ? { ok: true, texte: `Fréquence contrôlée : ${e.fc}/min (objectif < 110 au repos).` } : { ok: false, texte: `Cœur trop rapide (${e.fc}/min) : ajouter ou augmenter le bêtabloquant.` });
      break;
    }
    case 'bav': P.push({ ok: false, texte: 'Aucun médicament ne corrige un BAV complet : il faut un stimulateur cardiaque.' }); if (on(tr, 'bb')) P.push({ ok: false, texte: 'Arrêter le bêtabloquant : il ralentit encore le cœur.' }); break;
    case 'ra': case 'im': P.push({ ok: false, texte: 'Aucun médicament ne répare la valve : réparation ou remplacement (chirurgie, ou TAVI pour l\'aorte).' }); break;
    case 'ia': P.push({ ok: on(tr, 'iec') || on(tr, 'ica') || on(tr, 'ara2'), texte: 'Un vasodilatateur soulage en attendant la chirurgie ; seule la chirurgie corrige la fuite.' }); break;
    case 'rm': besoin('bb', 'allonge la diastole et laisse le sang passer'); P.push(e.pog < 18 ? { ok: true, texte: 'Congestion contrôlée.' } : { ok: false, texte: 'Congestion persistante : diurétique ; la valve devra être dilatée ou remplacée.' }); break;
    case 'it': besoin('anse', 'réduit la congestion veineuse'); break;
    case 'avc': pa(130); ldl(); if (!actives.some((a) => a.id === 'fa')) antiag(); break;
  }
  return P;
}

/** Classes ajoutées sans indication parmi les maladies simulées. */
export function classesEnPlus(actives: PathoActive[], tr: Traitement): ClasseId[] {
  const utiles = new Set<ClasseId>();
  for (const a of actives) for (const c of Object.keys(PATHO_PAR_ID[a.id].traitement.propose) as ClasseId[]) utiles.add(c);
  const hta = actives.some((a) => ['hta', 'htaSys', 'hvg', 'irc', 'icfep', 'avc'].includes(a.id));
  if (hta) ANTI_HTA.forEach((c) => utiles.add(c));
  if (actives.some((a) => ['dyslip', 'athero', 'aomi', 'angor', 'idm', 'avc', 'diabete'].includes(a.id))) { utiles.add('statine'); utiles.add('ezetimibe'); }
  if (actives.some((a) => ['icfer', 'icfep', 'oap', 'it', 'rm'].includes(a.id))) utiles.add('anse');
  return (Object.keys(tr) as ClasseId[]).filter((c) => on(tr, c) && !utiles.has(c));
}
