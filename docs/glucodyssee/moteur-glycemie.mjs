/**
 * Moteur de glycémie (prototype pour Glucodyssée) : modèle physiologique simplifié, sans interface.
 * Pas de temps : 1 minute. Glycémie interne en mg/dL (affichage en g/L = mg/dL ÷ 100).
 * Inspiré des modèles de référence (modèle minimal de Bergman, absorption des repas de Dalla Man),
 * fortement simplifié et calibré sur des repères cliniques (voir les tests).
 *
 * Flux en mg/kg/min ; adulte de 70 kg.
 *   dG/dt = (PGE + Ra − Ucerveau − Uinsuline − Urein − Ueffort) / Vg
 *   PGE  : production de glucose par le foie, freinée par l'insuline (portale), relancée par l'hypoglycémie
 *   Ra   : apparition du glucose des repas (estomac → intestin → sang)
 *   Uinsuline : captation par les muscles et la graisse, proportionnelle à l'insuline active × sensibilité
 *   Urein : glucose dans les urines au-dessus du seuil rénal (abaissé par les iSGLT2)
 */

export const VG = 1.7;          // dL/kg : volume de distribution du glucose
const PGE_B = 2.0;              // mg/kg/min : production hépatique basale du sujet sain
const N_INS = 0.1;              // /min : élimination de l'insuline plasmatique
const VI_ML = 10000;            // mL : volume de distribution de l'insuline
const BIO_SC = 0.8;             // biodisponibilité de l'insuline sous-cutanée
const FACT_PORTE = 2.0;         // le foie voit 2 × plus d'insuline endogène que la périphérie
const KH = 0.035;               // sensibilité du foie à l'insuline
const KU = 0.1124;              // captation insulino-dépendante (maximale), saturable
const K50 = 80;                 // µU/mL : insuline donnant la moitié de l'effet maximal
const SG = 0.003;               // « efficacité du glucose » : captation sans insuline, proportionnelle à la glycémie
const SMAX = 17.0;              // sécrétion maximale (µU/mL/min) pour une fonction bêta = 1
const HILL_N = 5, HILL_K = 164; // réponse des cellules bêta au glucose (sigmoïde)
const INC = 1.5;                // effet incrétine (GLP-1, GIP) lié au repas
const K_VIDANGE = 0.018, K_ABS = 0.03, F_ABS = 0.9; // absorption des repas
const SEUIL_REIN = 180, K_REIN = 0.012;               // seuil rénal du glucose

/** Profils de patients (fonction bêta, sensibilité périphérique et hépatique, effet incrétine). */
export const PROFILS = {
  sain:        { nom: 'Sujet sain',            beta: 1.0,  si: 1.0,  sl: 1.0,  inc: 1.0 },
  prediabete:  { nom: 'Prédiabète',            beta: 0.6,  si: 0.55, sl: 0.6,  inc: 0.8 },
  t2leger:     { nom: 'Diabète de type 2 (début)',   beta: 0.42, si: 0.45, sl: 0.5,  inc: 0.6 },
  t2:          { nom: 'Diabète de type 2',     beta: 0.24, si: 0.36, sl: 0.42, inc: 0.5 },
  t2evolue:    { nom: 'Diabète de type 2 évolué (pancréas épuisé)', beta: 0.12, si: 0.35, sl: 0.4, inc: 0.4 },
  t1:          { nom: 'Diabète de type 1',     beta: 0.0,  si: 1.0,  sl: 1.0,  inc: 0.0 },
};

/** Insulines : constante d'absorption sous-cutanée (pic ≈ 1/k minutes) ou débit continu (analogue lent). */
export const INSULINES = {
  rapideAnalogue: { nom: 'Analogue rapide (aspart, lispro)', k: 1 / 55 },
  rapideHumaine:  { nom: 'Insuline humaine rapide (ordinaire)', k: 1 / 120 },
  nph:            { nom: 'Insuline humaine intermédiaire (NPH)', k: 1 / 300 },
  premix30:       { nom: 'Insuline humaine mélange 30/70', melange: [['rapideHumaine', 0.3], ['nph', 0.7]] },
  glargine:       { nom: 'Analogue lent (glargine)', continu: true },
};

/** Effet d'une dose relative (0,5 = demi-dose, 1 = standard, 2 = forte) : rendement décroissant. */
const eff = (d) => (!d ? 0 : d <= 1 ? d : 1 + 0.35 * (d - 1));

/** Repas par défaut : rythme sénégalais (repas principal à midi). Heures en heures décimales, glucides en g. */
export const REPAS_DEFAUT = [
  { h: 7.5, g: 50, nom: 'Petit-déjeuner (pain, café au lait)' },
  { h: 13.5, g: 100, nom: 'Déjeuner (thiéboudienne)' },
  { h: 20.5, g: 70, nom: 'Dîner' },
];

/**
 * Simule `jours` journées identiques (la dernière sert aux résultats : régime établi).
 * traitements : { metformine, sulfamide, glibenclamide (booléen : sulfamide ancien plus puissant et plus long), idpp4, aglp1, isglt2 } en doses relatives
 * injections  : [{ h, type, u }] (u = unités) ; une insuline lente « glargine » s'injecte une fois par jour
 * efforts     : [{ h, duree (min), intensite (0-1) }]
 */
export function simuler({ profil = 'sain', repas = REPAS_DEFAUT, traitements = {}, injections = [], efforts = [], jours = 2, poids = 70, insuffisanceRenale = false } = {}) {
  const p = typeof profil === 'string' ? PROFILS[profil] : profil;
  const tr = traitements;
  const metf = 1 - 0.35 * eff(tr.metformine);                 // ↓ production hépatique
  const metfSi = 1 + 0.25 * eff(tr.metformine);               // ↑ la sensibilité musculaire
  const ir = insuffisanceRenale;   // rein malade : sulfamides et insuline éliminés plus lentement, iSGLT2 moins efficaces sur la glycémie
  const su = eff(tr.sulfamide) * (tr.glibenclamide ? 1.4 : 1) * (ir ? 1.3 : 1);   // sécrétion forcée, indépendante du glucose (glibenclamide : plus forte et plus longue)
  const dpp4 = eff(tr.idpp4), glp1 = eff(tr.aglp1), sglt2 = eff(tr.isglt2);
  const kVid = K_VIDANGE * (1 - 0.35 * Math.min(1, glp1));        // aGLP-1 : vidange gastrique ralentie
  const seuil = sglt2 ? SEUIL_REIN - 110 * Math.min(1, sglt2) - 10 * Math.max(0, sglt2 - 1) : SEUIL_REIN;
  const kRein = (sglt2 ? 0.008 : K_REIN) * (ir ? 0.4 : 1);
  const nIns = N_INS * (ir ? 0.75 : 1);
  const glucagonFrein = 1 - 0.15 * Math.min(1, glp1) - 0.1 * Math.min(1, dpp4); // moins de glucagon (si glycémie > 0,90)

  const N = jours * 1440;
  let G = 90, Ien = 8, Iex = 0, Ieff = 8, Ih = 16, Qsto = 0, Qgut = 0;
  const depots = [];              // dépôts sous-cutanés [d1, d2, k]
  let continuLente = 0;           // débit continu d'analogue lent (U/min), régime établi
  for (const inj of injections) if (INSULINES[inj.type]?.continu) continuLente += inj.u / 1440;
  const sortie = { t: [], G: [], I: [], Ra: [], urine: 0, effortActif: [] };
  const debutJour = (jours - 1) * 1440;
  let rein = 0;

  for (let m = 0; m < N; m++) {
    const hm = (m % 1440) / 60;
    // Repas et injections programmés à cette minute
    for (const r of repas) if (Math.round(r.h * 60) === m % 1440) Qsto += (r.g * 1000) / poids;
    for (const inj of injections) {
      if (Math.round(inj.h * 60) !== m % 1440) continue;
      const def = INSULINES[inj.type];
      if (!def || def.continu) continue;
      const parts = def.melange ?? [[inj.type, 1]];
      for (const [t, frac] of parts) depots.push([inj.u * frac, 0, INSULINES[t].k]);
    }
    // Absorption digestive
    const vid = kVid * Qsto, abs = K_ABS * Qgut;
    Qsto -= vid; Qgut += vid - abs;
    const Ra = F_ABS * abs;
    // Insuline sous-cutanée → plasma
    let entreeEx = continuLente * BIO_SC * 1e6 / VI_ML;
    for (const d of depots) {
      const a = d[2] * d[0], b = d[2] * d[1];
      d[0] -= a; d[1] += a - b;
      entreeEx += b * BIO_SC * 1e6 / VI_ML;
    }
    // Effort physique
    let effort = 0;
    for (const e of efforts) { const t0 = Math.round(e.h * 60); const mm = m % 1440; if (mm >= t0 && mm < t0 + e.duree) effort = Math.max(effort, e.intensite ?? 0.6); }
    const apresEffort = efforts.some((e) => { const t0 = Math.round(e.h * 60); const mm = m % 1440; return mm >= t0 && mm < t0 + e.duree + 180; });
    const si = p.si * metfSi * (apresEffort ? 1.25 : 1);
    // Sécrétion d'insuline endogène
    const hill = G ** HILL_N / (G ** HILL_N + HILL_K ** HILL_N);
    const incretine = INC * p.inc * (Ra / (Ra + 3)) * (1 + 1.2 * dpp4) + 0.5 * dpp4 * p.inc + 1.2 * glp1;
    // Sulfamide : sécrétion forcée même quand la glycémie est basse (d'où le risque d'hypoglycémie)
    let S = p.beta * SMAX * hill * (1 + incretine) * (1 + 0.5 * su) + p.beta * SMAX * 0.22 * su;
    if (S < 0) S = 0;
    // Insuline plasmatique, active (périphérie) et hépatique
    Ien += S - nIns * Ien;
    Iex += entreeEx - nIns * Iex;
    const Iper = Ien + Iex;
    Ieff += (Iper - Ieff) / 25;
    Ih += (FACT_PORTE * Ien + Iex - Ih) / 15;
    // Flux de glucose (mg/kg/min)
    const contre = 1 + 1.8 * Math.max(0, (70 - G) / 70);          // contre-régulation (glucagon, adrénaline) sous 0,70 g/L
    const frein = G > 90 ? glucagonFrein : 1;
    const PGE = PGE_B * metf * 1.75 * Math.exp(-KH * p.sl * Ih) * contre * frein;
    const Ucerveau = 0.9 * G / (G + 10);           // cerveau, globules rouges : sans insuline
    const Ueff = SG * G;
    const Uins = KU * si * (Ieff / (Ieff + K50)) * G;
    const Ueffort = effort * 2.0 * G / (G + 20);
    const Urein = Math.min(3.0, Math.max(0, G - seuil) * kRein); // plafond : capacité de filtration
    G += (PGE + Ra - Ucerveau - Ueff - Uins - Urein - Ueffort) / VG;
    if (G < 20) G = 20;
    if (m >= debutJour) {
      sortie.t.push((m - debutJour) / 60); sortie.G.push(G); sortie.I.push(Iper); sortie.Ra.push(Ra);
      rein += Urein * poids;      // mg/min
    }
  }
  sortie.urine = rein / 1000;    // g/jour
  sortie.stats = statistiques(sortie.G);
  return sortie;
}

/** Statistiques de la journée : moyenne, HbA1c estimée (formule ADAG), temps dans la cible, hypoglycémies. */
export function statistiques(Gs) {
  const n = Gs.length;
  const moy = Gs.reduce((a, b) => a + b, 0) / n;
  const dans = Gs.filter((g) => g >= 70 && g <= 180).length / n;
  const sous70 = Gs.filter((g) => g < 70).length / n, sous54 = Gs.filter((g) => g < 54).length / n;
  const sur180 = Gs.filter((g) => g > 180).length / n;
  const aJeun = Gs[Math.round(7.25 * 60)] ?? Gs[0];
  return { moyenne: moy, hba1c: (moy + 46.7) / 28.7, tir: dans, tbr70: sous70, tbr54: sous54, tar180: sur180, min: Math.min(...Gs), max: Math.max(...Gs), aJeun };
}

/**
 * Évolution sur plusieurs années (vue « années ») : dans le type 2, la fonction des cellules bêta baisse
 * d'environ 4 à 6 % par an (ordre de grandeur de l'étude UKPDS ; 6 % par défaut pour rendre l'évolution lisible) ; l'HbA1c de chaque année est celle d'une journée type.
 * Retourne aussi un indice d'exposition au sucre (somme des années × excès d'HbA1c au-dessus de 6 %),
 * qui sert à faire progresser les jauges de complications (yeux, reins, nerfs, cœur).
 */
export function evolution({ profil = 't2', traitements = {}, injections = [], repas = REPAS_DEFAUT, annees = 10, perteBeta = 0.06 } = {}) {
  const base = typeof profil === 'string' ? PROFILS[profil] : profil;
  const res = []; let exposition = 0;
  for (let a = 0; a <= annees; a++) {
    const p = { ...base, beta: base.beta * Math.pow(1 - (base.beta > 0 && base.beta < 1 ? perteBeta : 0), a) };
    const s = simuler({ profil: p, traitements, injections, repas }).stats;
    if (a > 0) exposition += Math.max(0, s.hba1c - 6);
    res.push({ annee: a, hba1c: s.hba1c, aJeun: s.aJeun, exposition });
  }
  return res;
}
