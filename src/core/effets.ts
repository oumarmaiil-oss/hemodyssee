/**
 * Effets des traitements qu'on peut montrer dans la scène (étiquettes vertes).
 * Chaque effet n'apparaît que s'il agit vraiment sur ce que la maladie a abîmé.
 */
import type { Etat } from './types.ts';

export interface EffetsVisibles {
  statine: boolean; // plaque stabilisée : chape fibreuse épaisse, cœur lipidique réduit
  antiagregant: boolean; // les plaquettes n'adhèrent plus sur la plaque
  anticoagulant: boolean; // plus de caillot dans l'oreillette (FA)
  vasodilatation: boolean; // les artérioles se relâchent, la résistance baisse
  diuretique: boolean; // l'excès d'eau s'élimine
  bradycardie: boolean; // le bêtabloquant ralentit le cœur
}

export function effetsVisibles(e: Etat | null | undefined): EffetsVisibles {
  const aucun = { statine: false, antiagregant: false, anticoagulant: false, vasodilatation: false, diuretique: false, bradycardie: false };
  if (!e?.base || !e.traitement) return aucun;
  const { base: b, traitement: tr, terrain: t } = e;
  const actif = e.fraction > 0.5;
  if (!actif) return aucun;
  const plaque = Math.max(b.plaqueCoro, b.plaqueCarotide, b.plaqueMembres);
  return {
    statine: !!tr.statine && plaque > 0.1,
    antiagregant: !!tr.aspirine && plaque > 0.3,
    anticoagulant: !!tr.aod && (b.rythme === 'fa' || b.rm > 0.6),
    vasodilatation: b.rvs / t.rvs > 1.08 && b.rvs > 1.1,
    diuretique: !!(tr.anse || tr.thiazide || tr.mra) && b.volemie > 1.03,
    bradycardie: !!tr.bb && e.fc < 75,
  };
}
