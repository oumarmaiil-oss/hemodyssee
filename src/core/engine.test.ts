import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculer, evoluer, TERRAIN_NORMAL } from './engine.ts';
import { construireTerrain, PATHOLOGIES } from '../content/pathologies.ts';
import { CLASSES } from '../content/classes.ts';
import { MARQUES } from '../content/labo.ts';
import { ZONES } from '../content/zones.ts';

const hta = construireTerrain(TERRAIN_NORMAL, [{ id: 'hta', s: 0.7 }]);

test('sujet sain : valeurs physiologiques', () => {
  const e = calculer(TERRAIN_NORMAL);
  assert.ok(e.pas >= 110 && e.pas <= 130, `PAS ${e.pas}`);
  assert.ok(e.pad >= 65 && e.pad <= 85, `PAD ${e.pad}`);
  assert.ok(e.debit > 4.5 && e.debit < 6, `débit ${e.debit}`);
  assert.ok(e.fe > 0.55 && e.fe < 0.7);
  assert.equal(e.alertes.filter((a) => a.niveau === 'danger').length, 0);
});

test('HTA modérée : PA de grade 2', () => {
  const e = calculer(hta);
  assert.ok(e.pas >= 145 && e.pas <= 165, `PAS ${e.pas}`);
});

test('une classe seule baisse la PAS de 5 à 12 mmHg, deux classes s\'additionnent', () => {
  const ref = calculer(hta).pas;
  for (const c of ['iec', 'ara2', 'ica', 'thiazide', 'bb'] as const) {
    const d = ref - calculer(hta, { [c]: 1 }).pas;
    assert.ok(d >= 5 && d <= 12, `${c} : −${d}`);
  }
  const bi = ref - calculer(hta, { iec: 1, ica: 1 }).pas;
  const tri = ref - calculer(hta, { iec: 1, ica: 1, thiazide: 1 }).pas;
  assert.ok(bi > 12 && tri > bi, `bi −${bi}, tri −${tri}`);
});

test('la dose double fait plus que la dose standard, mais pas deux fois plus', () => {
  const ref = calculer(hta).pas;
  const d1 = ref - calculer(hta, { ica: 1 }).pas;
  const d2 = ref - calculer(hta, { ica: 2 }).pas;
  assert.ok(d2 > d1 && d2 < 2 * d1);
});

test('statine : environ −40 % de LDL, ézétimibe en plus', () => {
  const t = construireTerrain(TERRAIN_NORMAL, [{ id: 'dyslip', s: 0.7 }]);
  const l0 = calculer(t).ldl;
  const l1 = calculer(t, { statine: 1 }).ldl;
  const l2 = calculer(t, { statine: 1, ezetimibe: 1 }).ldl;
  assert.ok(l1 / l0 > 0.55 && l1 / l0 < 0.65);
  assert.ok(l2 < l1);
});

test('FA : risque d\'AVC élevé, AOD le réduit et supprime le caillot', () => {
  const t = construireTerrain(TERRAIN_NORMAL, [{ id: 'fa', s: 0.7 }]);
  const sans = calculer(t);
  const avec = calculer(t, { aod: 1 });
  assert.ok(sans.thrombusOG && !avec.thrombusOG);
  assert.ok(avec.risques.avc < sans.risques.avc * 0.5);
  assert.ok(sans.fc > 95);
});

test('OAP : le diurétique de l\'anse fait baisser la pression de l\'oreillette gauche', () => {
  const t = construireTerrain(TERRAIN_NORMAL, [{ id: 'oap', s: 0.7 }]);
  const a = calculer(t), b = calculer(t, { anse: 2 });
  assert.ok(a.pog >= 24, `POG ${a.pog}`);
  assert.ok(b.pog < a.pog - 6);
});

test('alertes : BB dans le BAV complet, AOD dans le RM serré, IEC + ARA II', () => {
  const bav = construireTerrain(TERRAIN_NORMAL, [{ id: 'bav', s: 0.7 }]);
  assert.ok(calculer(bav, { bb: 1 }).alertes.some((a) => a.niveau === 'danger'));
  const rm = construireTerrain(TERRAIN_NORMAL, [{ id: 'rm', s: 0.7 }]);
  assert.ok(calculer(rm, { aod: 1 }).alertes.some((a) => a.texte.includes('AVK')));
  assert.ok(calculer(hta, { iec: 1, ara2: 1 }).alertes.some((a) => a.texte.includes('double blocage')));
});

test('évolution : sans traitement les lésions progressent, l\'arrêt fait perdre le bénéfice', () => {
  const t = construireTerrain(TERRAIN_NORMAL, [{ id: 'hta', s: 0.7 }, { id: 'dyslip', s: 0.7 }]);
  const tr = { iec: 1, ica: 1, statine: 1 };
  const sans = evoluer(t, tr, 'sans').points;
  const avec = evoluer(t, tr, 'avec').points;
  const arret = evoluer(t, tr, 'arret', 24).points;
  assert.ok(sans[60].hvg > sans[0].hvg + 0.1);
  assert.ok(avec[60].hvg < sans[60].hvg && avec[60].plaque < sans[60].plaque);
  assert.ok(arret[30].pas > avec[30].pas + 15);
  assert.ok(arret[60].plaque > avec[60].plaque);
});

test('IC à FE réduite : les piliers améliorent la FE au fil des mois', () => {
  const t = construireTerrain(TERRAIN_NORMAL, [{ id: 'icfer', s: 0.7 }]);
  const avec = evoluer(t, { arni: 0.5, bb: 0.5, mra: 1, isglt2: 1 }, 'avec').points;
  const sans = evoluer(t, {}, 'sans').points;
  assert.ok(avec[24].fe > avec[0].fe + 0.04 && sans[24].fe < sans[0].fe);
});

test('contenu complet et cohérent', () => {
  for (const p of PATHOLOGIES) {
    assert.ok(p.texte[1] && p.texte[2] && p.texte[3], p.id);
    for (const z of p.zones) assert.ok(ZONES[z], `${p.id} → zone ${z}`);
    const e = calculer(construireTerrain(TERRAIN_NORMAL, [{ id: p.id, s: 1 }]));
    assert.ok(Number.isFinite(e.pas) && Number.isFinite(e.debit), p.id);
  }
  assert.equal(CLASSES.length, 13);
  for (const m of MARQUES) assert.ok(m.presentations.length > 0);
});

import { evaluerPathologie, classesEnPlus } from './evaluation.ts';

test('évaluation : monothérapie insuffisante dans l\'HTA, bithérapie qui contrôle', () => {
  const act = [{ id: 'hta', s: 0.7 }];
  const t = construireTerrain(TERRAIN_NORMAL, act);
  const mono = evaluerPathologie('hta', act, calculer(t, { ica: 1 }), { ica: 1 });
  assert.ok(mono.some((p) => !p.ok && p.texte.includes('Monothérapie')));
  const bi = evaluerPathologie('hta', act, calculer(t, { ica: 1, iec: 1 }), { ica: 1, iec: 1 });
  assert.ok(bi.every((p) => p.ok));
});

test('évaluation : IC à FE réduite compte les piliers, classes ajoutées sans indication', () => {
  const act = [{ id: 'icfer', s: 0.7 }];
  const t = construireTerrain(TERRAIN_NORMAL, act);
  const tr = { bb: 0.5, arni: 0.5 };
  assert.ok(evaluerPathologie('icfer', act, calculer(t, tr), tr).some((p) => p.texte.startsWith('2 piliers')));
  assert.deepEqual(classesEnPlus([{ id: 'dyslip', s: 0.7 }], { statine: 1, aod: 1 }), ['aod']);
});

test('présentation « HTA non contrôlée » : mono et bithérapie insuffisantes, trithérapie sous 140/90', () => {
  const t = construireTerrain(TERRAIN_NORMAL, [{ id: 'hta', s: 1 }]);
  const mono = calculer(t, { ica: 1 }), bi = calculer(t, { iec: 1, ica: 1 }), tri = calculer(t, { iec: 1, thiazide: 1, ica: 1 });
  assert.ok(mono.pas >= 140, `mono ${mono.pas}`);
  assert.ok(bi.pas >= 140 || bi.pad >= 90, `bi ${bi.pas}/${bi.pad}`);
  assert.ok(tri.pas < 140 && tri.pad < 90, `tri ${tri.pas}/${tri.pad}`);
});

test('cohérence fiche ↔ bilan : le traitement proposé n\'est jamais jugé incomplet ni « en trop »', async () => {
  const { bilan } = await import('../content/evaluation.ts');
  for (const p of PATHOLOGIES) {
    const a = [{ id: p.id, s: 0.7 }];
    const e = calculer(construireTerrain(TERRAIN_NORMAL, a), p.traitement.propose);
    const b = bilan(a, p.traitement.propose, e);
    assert.equal(b.manquants.length, 0, `${p.id} : manque ${b.manquants.map((m) => m.texte).join(', ')}`);
    assert.equal(b.enTrop.length, 0, `${p.id} : en trop ${b.enTrop.map((x) => x.classe).join(', ')}`);
  }
});
