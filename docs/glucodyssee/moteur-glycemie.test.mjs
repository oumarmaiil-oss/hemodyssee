// Tests de calibration du moteur de glycémie : repères cliniques que le modèle doit respecter.
// Lancer : node --test docs/glucodyssee/moteur-glycemie.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simuler, evolution } from './moteur-glycemie.mjs';

const gl = (mg) => mg / 100; // mg/dL → g/L
const SANS_DEJ = [{ h: 7.5, g: 50 }, { h: 20.5, g: 70 }];
const RAMADAN = [{ h: 5, g: 70 }, { h: 19.5, g: 90 }, { h: 22, g: 40 }];
const T1_BB = [{ h: 21, type: 'glargine', u: 20 }, { h: 7.4, type: 'rapideAnalogue', u: 4 }, { h: 13.4, type: 'rapideAnalogue', u: 8 }, { h: 20.4, type: 'rapideAnalogue', u: 6 }];

test('sujet sain : glycémie normale à jeun et après les repas, HbA1c normale', () => {
  const s = simuler({ profil: 'sain' }).stats;
  assert.ok(gl(s.aJeun) >= 0.8 && gl(s.aJeun) <= 1.0, `à jeun ${gl(s.aJeun)}`);
  assert.ok(gl(s.max) < 1.9, `pic ${gl(s.max)}`);
  assert.ok(s.hba1c >= 4.6 && s.hba1c < 5.7, `HbA1c ${s.hba1c}`);
  assert.equal(s.tbr70, 0);
});

test('prédiabète : glycémie à jeun 1,00-1,25 g/L', () => {
  const s = simuler({ profil: 'prediabete' }).stats;
  assert.ok(gl(s.aJeun) >= 1.0 && gl(s.aJeun) < 1.26, `à jeun ${gl(s.aJeun)}`);
});

test('diabète de type 2 non traité : à jeun ≥ 1,26 g/L, HbA1c 7,5-9 %', () => {
  const s = simuler({ profil: 't2' }).stats;
  assert.ok(gl(s.aJeun) >= 1.26, `à jeun ${gl(s.aJeun)}`);
  assert.ok(s.hba1c >= 7.5 && s.hba1c <= 9, `HbA1c ${s.hba1c}`);
});

test('type 1 sans insuline : hyperglycémie majeure ; avec un schéma basal-bolus : équilibre sans hypoglycémie sévère', () => {
  assert.ok(gl(simuler({ profil: 't1' }).stats.aJeun) > 2.5);
  const s = simuler({ profil: 't1', injections: T1_BB }).stats;
  assert.ok(s.tir > 0.7, `temps dans la cible ${s.tir}`);
  assert.ok(gl(s.min) > 0.6, `min ${gl(s.min)}`);
});

test('chaque classe baisse l\'HbA1c dans sa fourchette (type 2 à HbA1c ≈ 8 %)', () => {
  const ref = simuler({ profil: 't2' }).stats.hba1c;
  const baisse = (tr) => ref - simuler({ profil: 't2', traitements: tr }).stats.hba1c;
  const cas = [['metformine', { metformine: 1 }, 0.5, 1.5], ['sulfamide', { sulfamide: 1 }, 0.8, 1.6], ['iDPP-4', { idpp4: 1 }, 0.4, 0.9], ['aGLP-1', { aglp1: 1 }, 0.9, 1.8], ['iSGLT2', { isglt2: 1 }, 0.3, 0.9]];
  for (const [nom, tr, min, max] of cas) { const b = baisse(tr); assert.ok(b >= min && b <= max, `${nom} : −${b.toFixed(2)}`); }
  assert.ok(baisse({ metformine: 1, aglp1: 1 }) > baisse({ metformine: 1 }), 'une 2e classe ajoute son effet');
});

test('iSGLT2 : environ 50 à 110 g de glucose dans les urines par jour ; moins efficace si le rein est malade', () => {
  const r = simuler({ profil: 't2', traitements: { isglt2: 1 } });
  assert.ok(r.urine >= 50 && r.urine <= 110, `${r.urine} g`);
  assert.ok(simuler({ profil: 't2', traitements: { isglt2: 1 }, insuffisanceRenale: true }).urine < r.urine);
});

test('risque d\'hypoglycémie : glibenclamide > gliclazide > iDPP-4 (repas sauté et Ramadan)', () => {
  for (const repas of [SANS_DEJ, RAMADAN]) {
    const glib = simuler({ profil: 't2leger', traitements: { sulfamide: 1, glibenclamide: true }, repas }).stats.min;
    const glic = simuler({ profil: 't2leger', traitements: { sulfamide: 1 }, repas }).stats.min;
    const dpp4 = simuler({ profil: 't2leger', traitements: { idpp4: 1 }, repas }).stats.min;
    assert.ok(gl(glib) < 0.7, `glibenclamide ${gl(glib)}`);
    assert.ok(glib < glic && glic < dpp4, `${glib} < ${glic} < ${dpp4}`);
    assert.ok(gl(dpp4) > 0.9, `iDPP-4 ${gl(dpp4)}`);
  }
});

test('insuffisance rénale : le sulfamide expose à une hypoglycémie plus profonde', () => {
  const o = { profil: 't2leger', traitements: { sulfamide: 1, glibenclamide: true }, repas: SANS_DEJ };
  assert.ok(simuler({ ...o, insuffisanceRenale: true }).stats.min < simuler(o).stats.min);
});

test('type 1 : l\'effort fait baisser la glycémie ; l\'oubli du bolus la fait monter', () => {
  const ref = simuler({ profil: 't1', injections: T1_BB }).stats;
  assert.ok(simuler({ profil: 't1', injections: T1_BB, efforts: [{ h: 16, duree: 45, intensite: 0.7 }] }).stats.min < ref.min);
  assert.ok(simuler({ profil: 't1', injections: T1_BB.filter((i) => i.h !== 13.4) }).stats.max > ref.max + 100);
});

test('évolution sur 10 ans : l\'HbA1c monte sans traitement ; le traitement réduit l\'exposition au sucre', () => {
  const sans = evolution({ profil: 't2leger', annees: 10 });
  const avec = evolution({ profil: 't2leger', annees: 10, traitements: { metformine: 1 } });
  assert.ok(sans.at(-1).hba1c > sans[0].hba1c + 0.5, `${sans[0].hba1c} → ${sans.at(-1).hba1c}`);
  assert.ok(avec.at(-1).exposition < sans.at(-1).exposition);
});
