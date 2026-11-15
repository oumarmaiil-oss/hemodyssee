/**
 * Horloge du cycle cardiaque : phases, ouverture des valves, contraction des cavités.
 * En FA, les oreillettes fibrillent et les intervalles entre battements varient ;
 * en BAV complet, oreillettes et ventricules battent chacun à leur rythme.
 */
import type { Rythme } from './types.ts';

export type Phase = 'auriculaire' | 'isoContraction' | 'ejection' | 'isoRelaxation' | 'remplissage';

export const NOMS_PHASES: Record<Phase, string> = {
  auriculaire: 'Contraction des oreillettes',
  isoContraction: 'Contraction isovolumique',
  ejection: 'Éjection',
  isoRelaxation: 'Relaxation isovolumique',
  remplissage: 'Remplissage des ventricules',
};

export interface Instant {
  phase: Phase;
  u: number; // position dans le cycle ventriculaire 0..1
  contractionV: number; // 0 (relâché) → 1 (contraction maximale)
  contractionA: number; // contraction des oreillettes 0..1
  ouvertureAV: number; // valves mitrale et tricuspide 0..1
  ouvertureSig: number; // valves aortique et pulmonaire 0..1
  b1: boolean; // vrai à l'instant du 1er bruit
  b2: boolean;
  onde: number; // progression de l'onde électrique 0..1 (sinus → NAV → ventricules), −1 si aucune
  fibrillation: boolean;
}

// Bornes des phases dans le cycle ventriculaire (fraction de la période).
const P = { a: 0.11, ic: 0.16, ej: 0.46, ir: 0.53 };

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export class Horloge {
  private uV = 0;
  private uA = 0;
  private periodeV = 60 / 70;
  private prevPhase: Phase = 'remplissage';
  fc = 70;
  fcA = 70;
  rythme: Rythme = 'sinus';
  vitesse = 1; // ralenti pédagogique

  regler(fc: number, rythme: Rythme, fcOreillettes = fc) {
    this.fc = Math.max(20, fc);
    this.fcA = rythme === 'bav3' ? Math.max(60, fcOreillettes) : this.fc;
    this.rythme = rythme;
  }

  avancer(dt: number): Instant {
    dt *= this.vitesse;
    const nominal = 60 / this.fc;
    this.uV += dt / this.periodeV;
    if (this.uV >= 1) {
      this.uV -= 1;
      // FA : intervalle irrégulier à chaque battement.
      this.periodeV = this.rythme === 'fa' ? nominal * (0.65 + Math.random() * 0.7) : nominal;
    }
    this.uA = this.rythme === 'bav3' ? (this.uA + dt * this.fcA / 60) % 1 : this.uV;
    const u = this.uV;

    let phase: Phase;
    if (this.rythme === 'bav3') phase = u < P.ic - P.a ? 'isoContraction' : u < P.ej - P.a ? 'ejection' : u < P.ir - P.a ? 'isoRelaxation' : 'remplissage';
    else phase = u < P.a ? 'auriculaire' : u < P.ic ? 'isoContraction' : u < P.ej ? 'ejection' : u < P.ir ? 'isoRelaxation' : 'remplissage';

    // Contraction ventriculaire : montée pendant l'éjection, relâchement ensuite.
    const decal = this.rythme === 'bav3' ? P.a : 0;
    const uv = (u + decal) % 1;
    let cV = 0;
    if (uv >= P.a && uv < P.ej) cV = smooth((uv - P.a) / (P.ej - P.a - 0.08));
    else if (uv >= P.ej && uv < P.ir + 0.06) cV = 1 - smooth((uv - P.ej) / (P.ir + 0.06 - P.ej));
    const ua = this.uA;
    const cA = this.rythme === 'fa' ? 0 : ua < P.a ? Math.sin((ua / P.a) * Math.PI) : 0;

    const ouvertureAV = phase === 'remplissage' || phase === 'auriculaire' ? 1 : phase === 'isoRelaxation' ? 0.2 : 0;
    const ouvertureSig = phase === 'ejection' ? smooth(Math.min(1, ((uv - P.ic) / 0.05))) * (1 - smooth((uv - (P.ej - 0.04)) / 0.04)) : 0;

    const b1 = phase === 'isoContraction' && this.prevPhase !== 'isoContraction';
    const b2 = phase === 'isoRelaxation' && this.prevPhase !== 'isoRelaxation';
    this.prevPhase = phase;

    // Onde électrique : nœud sinusal (0) → NAV (0,4) → ventricules (1).
    let onde = -1;
    if (this.rythme === 'sinus') onde = u < 0.2 ? u / 0.2 : -1;
    else if (this.rythme === 'bav3') onde = ua < 0.08 ? (ua / 0.08) * 0.4 : -1;
    else onde = uv < 0.06 ? 0.4 + (uv / 0.06) * 0.6 : -1;

    return { phase, u, contractionV: cV, contractionA: cA, ouvertureAV, ouvertureSig, b1, b2, onde, fibrillation: this.rythme === 'fa' };
  }
}
