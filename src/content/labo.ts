/**
 * Mode labo : gamme de marques affichée seulement quand le mode est activé
 * (bouton « Mode labo » ou adresse terminée par ?labo). La version publique reste
 * en DCI, ce qui est plus crédible et évite toute promotion auprès du grand public.
 *
 * Pour modifier la gamme : éditer uniquement ce fichier.
 * Les entrées marquées « aVerifier » attendent la confirmation de la composition exacte.
 */
import type { Traitement } from '../core/types.ts';

export interface Presentation { id: string; nom: string; doses: Traitement }

export interface Marque {
  id: string;
  nom: string;
  composition: string;
  classe: string;
  presentations: Presentation[];
  aVerifier?: string;
}

export const LABO = { nom: 'GHPL', sousTitre: 'Gamme cardio-métabolique' };

export const MARQUES: Marque[] = [
  {
    id: 'amloperin', nom: 'Amloperin®', composition: 'Amlodipine + Périndopril', classe: 'Bithérapie antihypertensive (inhibiteur calcique + IEC)',
    presentations: [
      { id: '5-5', nom: 'Amlodipine 5 mg + Périndopril 5 mg', doses: { ica: 1, iec: 1 } },
      { id: '10-5', nom: 'Amlodipine 10 mg + Périndopril 5 mg', doses: { ica: 2, iec: 1 } },
      { id: '5-10', nom: 'Amlodipine 5 mg + Périndopril 10 mg', doses: { ica: 1, iec: 2 } },
      { id: '10-10', nom: 'Amlodipine 10 mg + Périndopril 10 mg', doses: { ica: 2, iec: 2 } },
    ],
  },
  {
    id: 'tensoplus', nom: 'Tensoplus®', composition: 'Périndopril + Indapamide + Amlodipine', classe: 'Trithérapie antihypertensive (IEC + diurétique + inhibiteur calcique)',
    presentations: [
      { id: '5-1.25-5', nom: 'Périndopril 5 + Indapamide 1,25 + Amlodipine 5 mg', doses: { iec: 1, thiazide: 1, ica: 1 } },
      { id: '5-1.25-10', nom: 'Périndopril 5 + Indapamide 1,25 + Amlodipine 10 mg', doses: { iec: 1, thiazide: 1, ica: 2 } },
      { id: '10-2.5-5', nom: 'Périndopril 10 + Indapamide 2,5 + Amlodipine 5 mg', doses: { iec: 2, thiazide: 2, ica: 1 } },
      { id: '10-2.5-10', nom: 'Périndopril 10 + Indapamide 2,5 + Amlodipine 10 mg', doses: { iec: 2, thiazide: 2, ica: 2 } },
    ],
  },
  {
    id: 'genvas', nom: 'Genvas®', composition: 'Statine', classe: 'Hypolipémiant',
    presentations: [{ id: 'std', nom: 'Dose standard', doses: { statine: 1 } }, { id: 'forte', nom: 'Dose forte', doses: { statine: 2 } }],
    aVerifier: 'Molécule et dosages exacts à confirmer.',
  },
  {
    id: 'rixa', nom: 'Rixa GH®', composition: 'Anticoagulant oral direct (AOD)', classe: 'Prévention des AVC dans la fibrillation atriale',
    presentations: [{ id: 'std', nom: 'Dose standard', doses: { aod: 1 } }],
    aVerifier: 'Molécule et dosages exacts à confirmer.',
  },
  {
    id: 'dapagen', nom: 'Dapagen®', composition: 'Dapagliflozine', classe: 'iSGLT2 (protection cœur et reins)',
    presentations: [{ id: '10', nom: 'Dapagliflozine 10 mg', doses: { isglt2: 1 } }],
    aVerifier: 'Orthographe exacte du nom à confirmer.',
  },
];
