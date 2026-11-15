/**
 * Présentations guidées de 2 à 3 minutes, qui s'enchaînent seules : pour un délégué en visite,
 * un enseignant ou un exposé. En mode labo, les marques de la gamme remplacent les DCI.
 */
import type { Etat, Traitement } from '../core/types.ts';
import type { ZoneId } from './zones.ts';
import type { PathoActive } from './pathologies.ts';

type VueScene = '3d' | 'corps' | 'vaisseau';
type Site = 'coronaire' | 'carotide' | 'jambe' | 'aorte' | 'arteriole';

export interface EtapePresentation {
  texte: (labo: boolean) => string;
  detail?: (e: Etat, sans: Etat, labo: boolean) => string;
  vue: VueScene;
  zone?: ZoneId | null;
  site?: Site;
  actives: PathoActive[];
  traitement: Traitement;
  /** Évolution : scénario et mois montrés (sinon, aujourd'hui). */
  evo?: { scenario: 'sans' | 'avec'; mois: number };
  duree?: number; // ms
}

export interface PresentationGuidee { id: string; titre: string; pour: string; etapes: EtapePresentation[] }

const pa = (e: Etat) => `PA ${e.pas}/${e.pad} mmHg`;
const pct = (avant: number, apres: number) => Math.round((1 - apres / avant) * 100);

const HTA: PathoActive[] = [{ id: 'hta', s: 0.7 }];
const LDL: PathoActive[] = [{ id: 'dyslip', s: 1 }];
const FA: PathoActive[] = [{ id: 'fa', s: 0.7 }];
const BITHERAPIE: Traitement = { iec: 1, ica: 1 };

export const PRESENTATIONS: PresentationGuidee[] = [
  {
    id: 'hta', titre: 'Hypertension', pour: 'Des artérioles au comprimé unique',
    etapes: [
      { vue: 'corps', zone: null, actives: HTA, traitement: {}, texte: () => 'Voici un patient hypertendu.', detail: (e) => `${pa(e)} : au-dessus de 140/90, mesurée à plusieurs reprises. Souvent aucun symptôme.` },
      { vue: 'vaisseau', site: 'arteriole', actives: HTA, traitement: {}, texte: () => 'Ses artérioles sont resserrées : la résistance augmente.', detail: () => 'C\'est cette résistance qui fait monter la pression dans tout le réseau.' },
      { vue: '3d', zone: 'aorte', actives: HTA, traitement: {}, texte: () => 'Le cœur doit pousser plus fort contre cette résistance.', detail: (e) => `Post-charge ×${e.postcharge.toFixed(2)} : le ventricule gauche travaille davantage.` },
      { vue: '3d', zone: 'vg', actives: HTA, traitement: {}, evo: { scenario: 'sans', mois: 36 }, texte: () => 'Sans traitement, en 3 ans, sa paroi s\'épaissit.', detail: () => 'Hypertrophie du ventricule gauche : premier pas vers l\'insuffisance cardiaque.' },
      { vue: 'vaisseau', site: 'arteriole', actives: HTA, traitement: BITHERAPIE, texte: (l) => l ? 'Amloperin® : périndopril + amlodipine dans un seul comprimé.' : 'Bithérapie en un seul comprimé : IEC + amlodipine.', detail: () => 'Les recommandations européennes conseillent d\'emblée deux médicaments associés chez la plupart des hypertendus.' },
      { vue: 'vaisseau', site: 'arteriole', actives: HTA, traitement: BITHERAPIE, texte: () => 'L\'artériole se relâche : les pointillés montrent l\'avant.', detail: (e, s) => `${pa(s)} → ${pa(e)}.` },
      { vue: '3d', zone: 'aorte', actives: HTA, traitement: BITHERAPIE, texte: () => 'Le cœur force moins.', detail: (e) => `Post-charge ×${e.postcharge.toFixed(2)} ; avec le temps, l'épaississement régresse.` },
      { vue: 'corps', zone: null, actives: HTA, traitement: BITHERAPIE, evo: { scenario: 'avec', mois: 60 }, texte: () => 'Sur 5 ans : moins d\'AVC, d\'infarctus et d\'insuffisance cardiaque.', detail: (e, s) => `Risque d'AVC −${pct(s.risques.avc, e.risques.avc)} %, risque coronaire −${pct(s.risques.coronaire, e.risques.coronaire)} % (environ −27 % d'AVC par 10 mmHg de systolique en moins).` },
    ],
  },
  {
    id: 'ldl', titre: 'Cholestérol', pour: 'Du LDL à la plaque stabilisée',
    etapes: [
      { vue: 'vaisseau', site: 'coronaire', actives: LDL, traitement: {}, texte: () => 'Le LDL, le « mauvais » cholestérol, est trop élevé.', detail: (e) => `LDL ${e.ldl.toFixed(1)} mmol/L (${(e.ldl * 0.387).toFixed(2)} g/L). Les particules jaunes entrent dans la paroi.` },
      { vue: 'vaisseau', site: 'coronaire', actives: LDL, traitement: {}, evo: { scenario: 'sans', mois: 60 }, texte: () => 'Sans traitement, la plaque grossit en 5 ans.', detail: () => 'Elle rétrécit l\'artère et peut se rompre : caillot, infarctus.' },
      { vue: 'corps', zone: null, actives: LDL, traitement: {}, evo: { scenario: 'sans', mois: 60 }, texte: () => 'Les plaques touchent le cœur, le cou et les jambes.', detail: () => 'Coronaires → infarctus ; carotides → AVC ; jambes → douleur à la marche.' },
      { vue: 'vaisseau', site: 'coronaire', actives: LDL, traitement: { statine: 1 }, texte: (l) => l ? 'Genvas® : une statine.' : 'Une statine.', detail: (e, s) => `LDL ${s.ldl.toFixed(1)} → ${e.ldl.toFixed(1)} mmol/L (−${pct(s.ldl, e.ldl)} %).` },
      { vue: 'vaisseau', site: 'coronaire', actives: LDL, traitement: { statine: 1 }, texte: () => 'La plaque se stabilise : chape épaisse, moins de lipides.', detail: () => 'Une plaque stable se rompt beaucoup moins : c\'est elle qui protège du caillot.' },
      { vue: 'corps', zone: null, actives: LDL, traitement: { statine: 1 }, evo: { scenario: 'avec', mois: 60 }, texte: () => 'Sur 5 ans : moins d\'infarctus et d\'AVC.', detail: (e, s) => `Environ −22 % d'événements par mmol/L de LDL en moins ; ici, risque coronaire −${pct(s.risques.coronaire, e.risques.coronaire)} %.` },
    ],
  },
  {
    id: 'fa', titre: 'Fibrillation atriale', pour: 'Du caillot à l\'anticoagulant',
    etapes: [
      { vue: '3d', zone: 'og', actives: FA, traitement: {}, texte: () => 'Fibrillation atriale : les oreillettes tremblent au lieu de se contracter.', detail: (e) => `Pouls irrégulier et rapide, ${e.fc}/min. L'ECG n'a plus d'onde P.` },
      { vue: '3d', zone: 'og', actives: FA, traitement: {}, texte: () => 'Le sang stagne : un caillot se forme dans l\'auricule gauche.', detail: () => 'C\'est la principale source d\'AVC d\'origine cardiaque.' },
      { vue: 'corps', zone: null, actives: FA, traitement: {}, duree: 8000, texte: () => 'Le caillot part vers le cerveau : c\'est l\'AVC.', detail: () => 'La fibrillation atriale multiplie le risque d\'AVC par environ 5.' },
      { vue: '3d', zone: 'og', actives: FA, traitement: { aod: 1, bb: 1 }, texte: (l) => l ? 'Rixa GH® (anticoagulant oral direct) + un bêtabloquant.' : 'Anticoagulant oral direct + un bêtabloquant.', detail: (e) => `Le caillot ne se forme plus ; le cœur ralentit à ${e.fc}/min.` },
      { vue: 'corps', zone: null, actives: FA, traitement: { aod: 1, bb: 1 }, texte: () => 'Plus de caillot qui part : le cerveau est protégé.', detail: (e, s) => `Risque d'AVC −${pct(s.risques.avc, e.risques.avc)} % (anticoagulation : environ deux AVC sur trois évités).` },
    ],
  },
];

export const PRESENTATION_PAR_ID = Object.fromEntries(PRESENTATIONS.map((p) => [p.id, p])) as Record<string, PresentationGuidee>;
