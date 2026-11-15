/**
 * Fiche récapitulative à imprimer ou enregistrer en PDF (impression du navigateur) :
 * maladies simulées, traitement, chiffres sans / avec traitement, points de l'évaluation.
 */
import { createPortal } from 'react-dom';
import type { ClasseId, Etat, Traitement } from '../core/types.ts';
import { PATHO_PAR_ID, SEVERITES, type PathoActive } from '../content/pathologies.ts';
import { CLASSE_PAR_ID } from '../content/classes.ts';
import { MARQUES } from '../content/labo.ts';
import { evaluerPathologie } from '../core/evaluation.ts';

export function imprimerFiche() { window.print(); }
const v1 = (x: number) => x.toFixed(1).replace('.', ',');

export function FicheImpression({ actives, traitement, etat, sans, labo }: { actives: PathoActive[]; traitement: Traitement; etat: Etat; sans: Etat; labo: boolean }) {
  const classes = (Object.keys(traitement) as ClasseId[]).filter((c) => (traitement[c] ?? 0) > 0);
  const marques = labo ? MARQUES.filter((m) => m.presentations.some((p) => (Object.keys(p.doses) as ClasseId[]).every((c) => classes.includes(c)))) : [];
  const ligne = (nom: string, a: string, b: string) => <tr><td>{nom}</td><td>{a}</td><td>{b}</td></tr>;
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return createPortal(
    <div id="fiche-impression">
      <h1>Hémodyssée · fiche de simulation</h1>
      <p className="sous">{date}</p>
      <h2>Maladies simulées</h2>
      <ul>{actives.map((a) => <li key={a.id}>{PATHO_PAR_ID[a.id].nom}{!['fa', 'bav', 'diabete'].includes(a.id) ? ` (${SEVERITES.find((s) => s.v === a.s)?.nom.toLowerCase() ?? ''})` : ''}</li>)}</ul>
      <h2>Traitement</h2>
      {classes.length ? <ul>{classes.map((c) => <li key={c}>{CLASSE_PAR_ID[c].nom} : {CLASSE_PAR_ID[c].exemples}{traitement[c] !== 1 ? ` (dose ×${traitement[c]})` : ''}</li>)}</ul> : <p>Aucun traitement.</p>}
      {marques.length > 0 && <p>Gamme correspondante : {marques.map((m) => `${m.nom} (${m.composition})`).join(' ; ')}.</p>}
      <h2>Chiffres simulés</h2>
      <table>
        <thead><tr><th></th><th>Sans traitement</th><th>Avec traitement</th></tr></thead>
        <tbody>
          {ligne('Pression artérielle', `${sans.pas}/${sans.pad} mmHg`, `${etat.pas}/${etat.pad} mmHg`)}
          {ligne('Fréquence cardiaque', `${sans.fc}/min`, `${etat.fc}/min`)}
          {ligne('LDL', `${v1(sans.ldl)} mmol/L`, `${v1(etat.ldl)} mmol/L`)}
          {ligne('Fraction d\'éjection', `${Math.round(sans.fe * 100)} %`, `${Math.round(etat.fe * 100)} %`)}
          {ligne('Risque d\'AVC (×, sujet sain = 1)', `×${v1(sans.risques.avc)}`, `×${v1(etat.risques.avc)}`)}
          {ligne('Risque coronaire (×)', `×${v1(sans.risques.coronaire)}`, `×${v1(etat.risques.coronaire)}`)}
        </tbody>
      </table>
      <h2>Évaluation du traitement</h2>
      {actives.map((a) => (
        <div key={a.id}>
          <h3>{PATHO_PAR_ID[a.id].nom}</h3>
          <ul>{evaluerPathologie(a.id, actives, etat, traitement).map((p) => <li key={p.texte}>{p.ok ? '✓' : '✗'} {p.texte}</li>)}</ul>
        </div>
      ))}
      <p className="pied">Support pédagogique : simulation simplifiée à partir des grands essais, qui ne remplace pas un avis médical. Hémodyssée · Dr O. Sow · oumarmaiil-oss.github.io/hemodyssee</p>
    </div>,
    document.body,
  );
}
