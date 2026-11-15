/**
 * Moteur physiologique d'Hémodyssée.
 *
 * Modèle « à paramètres localisés » volontairement simple : il ne prétend pas
 * reproduire un patient réel, mais il garde les bons ordres de grandeur et les
 * bons sens de variation. Les effets des traitements sont calés sur des données
 * publiées (références dans src/content/references.ts) :
 *  - une classe d'antihypertenseur à dose standard baisse la PAS d'environ 9 mmHg,
 *    les effets de deux classes s'additionnent (Law et al., BMJ 2009) ;
 *  - une statine à dose standard baisse le LDL d'environ 40 %, chaque doublement
 *    de dose n'ajoute qu'environ 6 % ;
 *  - risque relatif par 10 mmHg de PAS : AVC 0,73 ; coronaire 0,83 ; IC 0,72
 *    (Ettehad et al., Lancet 2016) ; par mmol/L de LDL : 0,78 (CTT, Lancet 2010) ;
 *  - FA : risque d'AVC multiplié par environ 5 ; anticoagulation : environ −64 %.
 */
import type { Alerte, ClasseId, Etat, Terrain, Traitement } from './types.ts';

export const TERRAIN_NORMAL: Terrain = {
  rvs: 1, rigidite: 0.1, volemie: 1, contractilite: 1, hvg: 0, dilatation: 0, ischemie: 0,
  rythme: 'sinus', fcBase: 70, ra: 0, ia: 0, rm: 0, im: 0, it: 0, ldl: 2.6,
  plaqueCoro: 0, plaqueCarotide: 0, plaqueMembres: 0, rein: 1, diabete: 0, avc: 0, occlusion: 0,
};

const R0 = 17.5; // résistance systémique de référence (mmHg·min/L)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Effet relatif d'une dose : demi-dose ≈ 75 %, dose double ≈ 125 % de l'effet standard. */
export function effetDose(d: number | undefined): number {
  if (!d || d <= 0) return 0;
  return clamp(1 + 0.25 * Math.log2(d), 0.5, 1.4);
}

/** Facteur multiplicatif du LDL pour une statine (règle des 6 %). */
export function facteurStatine(d: number | undefined): number {
  if (!d || d <= 0) return 1;
  return 1 - clamp(0.42 + 0.06 * Math.log2(d), 0.3, 0.55);
}

const blocageSRAA = (t: Traitement) => Math.max(effetDose(t.iec), effetDose(t.ara2), effetDose(t.arni));

/** Applique les traitements au terrain : renvoie le terrain effectif. */
export function appliquerTraitement(base: Terrain, tr: Traitement, fraction = 1): Terrain {
  const t = { ...base };
  const e = (c: ClasseId) => effetDose(tr[c]) * fraction;
  let rvs = 1;
  rvs *= 1 - 0.1 * e('iec');
  rvs *= 1 - 0.1 * e('ara2');
  rvs *= 1 - 0.12 * e('arni');
  rvs *= 1 - 0.11 * e('ica');
  rvs *= 1 - 0.065 * e('thiazide');
  rvs *= 1 - 0.04 * e('mra');
  rvs *= 1 + 0.03 * e('bb'); // réflexe : la résistance monte un peu quand le débit baisse
  t.rvs = base.rvs * rvs;
  let vol = 1;
  vol *= 1 - 0.035 * e('thiazide');
  vol *= 1 - 0.07 * e('anse');
  vol *= 1 - 0.025 * e('mra');
  vol *= 1 - 0.02 * e('arni');
  vol *= 1 - 0.06 * e('isglt2');
  // Les diurétiques retirent surtout l'excès d'eau (congestion) ; peu d'effet sous la normale.
  let exces = 1;
  exces *= 1 - 0.45 * e('anse');
  exces *= 1 - 0.15 * e('thiazide');
  exces *= 1 - 0.15 * e('mra');
  exces *= 1 - 0.1 * e('arni');
  exces *= 1 - 0.12 * e('isglt2');
  t.volemie = base.volemie > 1 ? 1 + (base.volemie - 1) * exces - (1 - vol) * 0.4 : base.volemie * (1 - (1 - vol) * 0.7);
  t.contractilite = base.contractilite * (1 - 0.04 * e('bb'));
  const ldlF = fraction >= 1 ? facteurStatine(tr.statine) : 1 - (1 - facteurStatine(tr.statine)) * fraction;
  t.ldl = base.ldl * ldlF * (tr.ezetimibe ? 1 - 0.22 * fraction : 1);
  return t;
}

export interface OptionsCalcul {
  /** Fraction de l'effet des traitements (montée en charge ou dissipation après arrêt). */
  fraction?: number;
  /** Rebond adrénergique après arrêt brutal d'un bêtabloquant (0..1). */
  rebondBB?: number;
}

/** Calcule l'état hémodynamique stable pour un terrain et un traitement. */
export function calculer(base: Terrain, tr: Traitement = {}, opt: OptionsCalcul = {}): Etat {
  const fraction = opt.fraction ?? 1;
  const t = appliquerTraitement(base, tr, fraction);
  const eBB = effetDose(tr.bb) * fraction;
  const Rt = R0 * t.rvs;
  const contr = clamp(t.contractilite * (1 - 0.6 * t.ischemie) * (1 - 0.5 * t.occlusion), 0.15, 1.3);

  // Fréquence : rythme sinusal régulé par le baroréflexe ; FA rapide ; BAV complet lent.
  let fc = t.fcBase;
  const fcOreillettes = t.rythme === 'fa' ? 400 : t.fcBase;
  let pam = 93;
  let ves = 70, vesTotal = 70, vtd = 120, fe = 0.6, debit = 5;
  for (let i = 0; i < 16; i++) {
    let cible: number;
    if (t.rythme === 'bav3') cible = 38;
    else if (t.rythme === 'fa') cible = 112 * (1 - 0.22 * eBB) * (1 + 0.15 * clamp((90 - pam) / 90, -0.5, 0.6));
    else cible = t.fcBase * (1 - 0.1 * eBB) * (1 + 0.3 * clamp((93 - pam) / 93, -0.4, 0.8));
    cible *= 1 + 0.18 * (opt.rebondBB ?? 0);
    fc = i === 0 ? cible : fc + 0.5 * (cible - fc);
    fc = clamp(fc, 30, 165);

    // Remplissage : volume, sténose mitrale, compliance (HVG), perte du coup de piston auriculaire en FA.
    const tachy = clamp(1 - 0.006 * Math.max(0, fc - 75) * (1 + 1.5 * t.rm), 0.5, 1);
    vtd = 120 * Math.pow(t.volemie, 0.6) * (1 - 0.32 * t.rm) * (1 - 0.12 * t.hvg)
      * (1 + 0.6 * t.dilatation + 0.35 * t.ia + 0.25 * t.im) * (t.rythme === 'fa' ? 0.8 : 1) * tachy
      * (t.rythme === 'bav3' ? 1.25 : 1);
    // Fraction d'éjection : contractilité, gênée par la post-charge quand le cœur est faible.
    const post = t.rvs * (1 + 1.6 * t.ra * t.ra);
    fe = 0.62 * Math.pow(contr, 0.85) / (1 + 0.22 * Math.max(0, post - 1) * (1.25 - Math.min(contr, 1.1)));
    fe *= 1 - 0.35 * t.dilatation * (1 - t.contractilite + 0.3);
    fe = clamp(fe + 0.06 * t.im, 0.12, 0.78);
    vesTotal = vtd * fe * (1 - 0.3 * t.ra * t.ra * t.ra);
    ves = vesTotal * (1 - 0.5 * t.im - 0.42 * t.ia);
    debit = (ves * fc) / 1000;
    const pamNew = debit * Rt + 4;
    pam = i === 0 ? pamNew : pam + 0.6 * (pamNew - pam);
  }

  // Pression pulsée : volume éjecté / compliance aortique (rigidité, pression élevée).
  const compliance = 1.75 * (1 - 0.62 * t.rigidite) * (1 - 0.12 * clamp((pam - 93) / 40, -0.5, 1.2));
  const pp = vesTotal / compliance;
  let pas = pam + 0.6 * pp;
  let pad = pam - 0.4 * pp;
  pad -= 16 * t.ia;
  pas += 4 * t.ia;
  pas = clamp(pas, 55, 260);
  pad = clamp(pad, 25, 150);

  const gradientAo = 70 * t.ra * t.ra;
  const pvg = pas + gradientAo * 1.35;
  const ic = clamp((0.5 - fe) / 0.3, 0, 1);
  const pog = clamp(7 + 17 * t.rm * (1 + 0.6 * (fc - 70) / 70) + 12 * t.im + 14 * ic + 5 * t.hvg + 40 * Math.max(0, t.volemie - 1)
    + (t.rythme === 'fa' ? 2 : 0) + 5 * t.ia * ic + 8 * t.occlusion, 4, 40);
  const paps = 22 + 0.95 * Math.max(0, pog - 10);
  const pvc = clamp(3 + 0.15 * Math.max(0, paps - 30) + 9 * t.it + 8 * Math.max(0, t.volemie - 1.05), 1, 25);

  // Perfusion des organes.
  const autoregCerveau = pam < 60 ? pam / 60 : 1;
  const cerveau = clamp(autoregCerveau * (1 - 0.9 * Math.pow(t.plaqueCarotide, 3)) * (1 - 0.6 * t.avc), 0, 1);
  const apport = clamp((pad - pog + 5) / 65, 0, 1.5) * (1 - 0.95 * Math.pow(t.plaqueCoro, 2.2)) * (1 - 0.9 * t.occlusion);
  const besoin = (fc * pvg) / (70 * 122) * (1 + 0.5 * t.hvg) * (1 + 0.3 * t.dilatation);
  const coeur = clamp(apport / Math.max(0.3, besoin), 0, 1.6);
  const reins = clamp(Math.pow(debit / 5, 0.5) * (pam < 70 ? pam / 70 : 1) * (0.35 + 0.65 * t.rein), 0, 1.2);
  const membres = clamp(Math.pow(debit / 5, 0.7) * (1 - 0.85 * Math.pow(t.plaqueMembres, 2)), 0, 1.2);
  const poumons = clamp(1 - Math.max(0, pog - 15) / 18, 0, 1);

  // Risques relatifs (personne de référence : PAS 120, LDL 2,6, rythme sinusal).
  const dPas = (Math.max(pas, 115) - 120) / 10;
  const faRisque = t.rythme === 'fa' || t.rm > 0.5 ? (tr.aod && fraction > 0.5 ? 5 * 0.36 : 5) : 1;
  const avc = Math.pow(1 / 0.73, dPas) * faRisque * (1 + 1.5 * t.plaqueCarotide) * (1 + 0.5 * t.diabete)
    * (tr.aspirine && fraction > 0.5 && t.rythme !== 'fa' ? 0.85 : 1);
  const coronaire = Math.pow(1 / 0.83, dPas) * Math.pow(1 / 0.78, t.ldl - 2.6) * (1 + 1.8 * t.plaqueCoro)
    * (1 + 1 * t.diabete) * (tr.aspirine && fraction > 0.5 && t.plaqueCoro > 0.3 ? 0.8 : 1);
  const icRisque = Math.pow(1 / 0.72, dPas) * (1 + 2.5 * ic) * (1 + t.hvg) * (1 + 0.6 * t.diabete)
    * (tr.isglt2 && fraction > 0.5 && ic > 0.2 ? 0.75 : 1);
  const rein = Math.pow(1.25, dPas) * (1 + 1.2 * t.diabete) * (1 + 1.5 * (1 - t.rein))
    * (blocageSRAA(tr) > 0 && fraction > 0.5 ? 0.75 : 1) * (tr.isglt2 && fraction > 0.5 ? 0.7 : 1);

  const { effets, alertes } = surveiller(base, tr, { fc, pas, pad, pog, fe, pam }, fraction);
  const thrombusOG = (t.rythme === 'fa' || t.rm > 0.6) && !(tr.aod && fraction > 0.5);
  // Œdèmes des jambes : congestion veineuse (pression veineuse, excès d'eau) ou effet de l'amlodipine,
  // atténué par un bloqueur du SRAA.
  const eIca = effetDose(tr.ica) * fraction;
  const oedIca = eIca > 0 ? (0.12 + 0.18 * Math.max(0, eIca - 1) * 4) * (blocageSRAA(tr) > 0 && fraction > 0.5 ? 0.4 : 1) : 0;
  const oedemes = clamp(Math.max(0, (pvc - 7) / 10) + Math.min(0.45, Math.max(0, t.volemie - 1.03) * 5) + oedIca, 0, 1);

  return {
    fc: Math.round(fc), fcOreillettes, pas: Math.round(pas), pad: Math.round(pad), pam: Math.round(pam),
    ves: Math.round(ves), vesTotal: Math.round(vesTotal), vtd: Math.round(vtd), fe, debit,
    pvg: Math.round(pvg), gradientAo: Math.round(gradientAo), pog: Math.round(pog), paps: Math.round(paps),
    pvc: Math.round(pvc), postcharge: t.rvs * (1 + 1.6 * t.ra * t.ra), ldl: t.ldl,
    perfusion: { cerveau, coeur, reins, membres, poumons },
    risques: { avc, coronaire, ic: icRisque, rein },
    effets, alertes, terrain: t, thrombusOG, oedemes,
  };
}

interface Mesures { fc: number; pas: number; pad: number; pog: number; fe: number; pam: number }

/** Effets indésirables visibles, associations à éviter et signaux d'alerte. */
function surveiller(t: Terrain, tr: Traitement, m: Mesures, fraction: number): { effets: string[]; alertes: Alerte[] } {
  const effets: string[] = [];
  const alertes: Alerte[] = [];
  const on = (c: ClasseId) => (tr[c] ?? 0) > 0 && fraction > 0.3;
  if (on('ica')) {
    const protege = on('iec') || on('ara2') || on('arni');
    if ((tr.ica ?? 0) >= 2 || !protege) effets.push(protege ? 'Œdèmes des chevilles (dose forte d\'amlodipine)' : 'Œdèmes des chevilles possibles (l\'IEC ou l\'ARA II les réduit)');
  }
  if (on('iec')) effets.push('Toux sèche possible (IEC)');
  if ((on('iec') || on('ara2') || on('arni')) && on('mra')) alertes.push({ niveau: 'attention', texte: 'Bloqueur du SRAA + antialdostérone : surveiller le potassium et la créatinine.' });
  if (on('thiazide') || on('anse')) effets.push('Perte de potassium et de sodium : bilan sanguin à surveiller');
  if (on('bb') && m.fc < 55) effets.push('Bradycardie (pouls lent) sous bêtabloquant');
  if (on('statine') && (tr.statine ?? 0) >= 2) effets.push('Douleurs musculaires possibles (statine à forte dose)');
  if (on('isglt2')) effets.push('Infections génitales mycosiques possibles (iSGLT2)');
  if (on('aod') || on('aspirine')) effets.push(on('aod') && on('aspirine') ? 'Risque hémorragique nettement augmenté (AOD + aspirine)' : 'Risque de saignement à surveiller');
  if (on('iec') && on('ara2')) alertes.push({ niveau: 'danger', texte: 'IEC + ARA II : double blocage du SRAA déconseillé (reins, potassium).' });
  if (on('arni') && on('iec')) alertes.push({ niveau: 'danger', texte: 'ARNI + IEC : association contre-indiquée (risque d\'angio-œdème). Arrêter l\'IEC 36 h avant.' });
  if (on('bb') && t.rythme === 'bav3') alertes.push({ niveau: 'danger', texte: 'Bêtabloquant contre-indiqué dans le BAV complet : il ralentit encore le cœur. Le traitement est le stimulateur cardiaque.' });
  if (on('aod') && t.rm > 0.5) alertes.push({ niveau: 'danger', texte: 'Rétrécissement mitral serré : les AOD ne sont pas recommandés, on utilise un AVK.' });
  if (t.ra > 0.6 && (on('ica') || on('iec') || on('arni')) && m.pas < 105) alertes.push({ niveau: 'attention', texte: 'Rétrécissement aortique serré : les vasodilatateurs peuvent faire chuter la tension.' });
  if (m.pas < 95) alertes.push({ niveau: 'danger', texte: `Hypotension (${Math.round(m.pas)} mmHg) : malaise, chute, reins moins perfusés.` });
  else if (m.pas >= 180) alertes.push({ niveau: 'danger', texte: `PA très élevée (${Math.round(m.pas)} mmHg) : risque d'AVC et d'OAP.` });
  if (m.pog >= 25) alertes.push({ niveau: 'danger', texte: 'Pression très élevée dans l\'oreillette gauche : œdème pulmonaire (essoufflement).' });
  else if (m.pog >= 18) alertes.push({ niveau: 'attention', texte: 'Congestion pulmonaire débutante : essoufflement à l\'effort.' });
  if (m.fe < 0.4) alertes.push({ niveau: 'attention', texte: `Fraction d'éjection basse (${Math.round(m.fe * 100)} %) : le cœur pompe mal.` });
  return { effets, alertes };
}

// ─────────────────────────── Évolution dans le temps ───────────────────────────

export type Scenario = 'sans' | 'avec' | 'arret';

export interface PointEvolution {
  mois: number;
  pas: number;
  ldl: number;
  hvg: number;
  plaque: number;
  rein: number;
  risqueAvc: number;
  risqueCoro: number;
  fc: number;
  fe: number;
}

/** Fraction de l'effet du traitement au mois m (montée sur ~1 mois, dissipation sur ~1 mois). */
export function fractionAu(m: number, scenario: Scenario, arret: number): number {
  if (scenario === 'sans') return 0;
  const montee = clamp(m / 1, 0, 1);
  if (scenario === 'avec' || m < arret) return montee;
  return montee * clamp(1 - (m - arret) / 1, 0, 1);
}

/**
 * Simule l'évolution mois par mois (5 ans par défaut) : l'HVG, la rigidité,
 * la plaque d'athérome et la fonction rénale progressent selon la PA et le LDL.
 */
export function evoluer(base: Terrain, tr: Traitement, scenario: Scenario, arret = 24, duree = 60): { points: PointEvolution[]; terrains: Terrain[] } {
  const points: PointEvolution[] = [];
  const terrains: Terrain[] = [];
  let t: Terrain = { ...base };
  const sraa = blocageSRAA(tr);
  for (let m = 0; m <= duree; m++) {
    const f = fractionAu(m, scenario, arret);
    const rebond = scenario === 'arret' && tr.bb && m >= arret && m < arret + 1 ? 1 : 0;
    const e = calculer(t, tr, { fraction: f, rebondBB: rebond });
    terrains.push({ ...t });
    points.push({
      mois: m, pas: e.pas, ldl: e.ldl, hvg: t.hvg, plaque: Math.max(t.plaqueCoro, t.plaqueCarotide),
      rein: t.rein, risqueAvc: e.risques.avc, risqueCoro: e.risques.coronaire, fc: e.fc, fe: e.fe,
    });
    // Progression du mois suivant.
    const exces = (e.pas - 135) / 20;
    const protegeSraa = f > 0.5 ? sraa : 0;
    let dHvg = exces > 0 ? 0.0045 * exces : 0.012 * exces * t.hvg * (1 + 0.5 * protegeSraa);
    if (base.ra > 0.3) dHvg = Math.max(dHvg, 0.004 * base.ra * (1 - t.hvg));
    const dRig = exces > 0 ? 0.002 * exces : 0;
    const ldlEx = e.ldl - 1.8;
    const dPlaque = ldlEx > 0 ? 0.0028 * ldlEx * (1 + 0.5 * t.diabete) * (1 + Math.max(0, exces) * 0.3) : 0.0006 * ldlEx;
    const dRein = -0.0012 * Math.max(0, exces + 0.3) * (1 + t.diabete) * (f > 0.5 && (sraa > 0 || tr.isglt2) ? 0.6 : 1);
    // Insuffisance cardiaque à FE réduite : remodelage inverse sous les « piliers », aggravation sinon.
    let dContr = 0, dDil = 0;
    if (base.contractilite < 0.9) {
      const piliers = f > 0.5 ? (sraa > 0 ? 1 : 0) + (tr.bb ? 1 : 0) + (tr.mra ? 1 : 0) + (tr.isglt2 ? 1 : 0) : 0;
      dContr = piliers > 0 ? 0.0035 * piliers * (base.contractilite + 0.3 - t.contractilite) : -0.002;
      dDil = piliers > 0 ? -0.003 * piliers * t.dilatation : 0.002;
    }
    t = {
      ...t,
      contractilite: clamp(t.contractilite + dContr, 0.25, 1),
      dilatation: clamp(t.dilatation + dDil, 0, 1),
      hvg: clamp(t.hvg + dHvg, 0, 1),
      rigidite: clamp(t.rigidite + dRig, 0, 1),
      plaqueCoro: t.plaqueCoro > 0 || base.ldl > 3 ? clamp(t.plaqueCoro + dPlaque, 0, 0.95) : t.plaqueCoro,
      plaqueCarotide: t.plaqueCarotide > 0 || base.ldl > 3 ? clamp(t.plaqueCarotide + dPlaque * 0.8, 0, 0.95) : t.plaqueCarotide,
      rein: clamp(t.rein + dRein, 0.15, 1),
    };
  }
  return { points, terrains };
}
