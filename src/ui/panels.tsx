/** Panneaux latéraux : Explorer, Maladies, Traitements, Évolution. */
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, Ear, Info, Pill, Play, Plus, Sparkles, Stethoscope, X } from 'lucide-react';
import type { ClasseId, Etat, Niveau, Terrain, Traitement } from '../core/types.ts';
import { evoluer, type Scenario } from '../core/engine.ts';
import { ausculter } from '../core/audio.ts';
import { ZONES, type ZoneId } from '../content/zones.ts';
import { FAMILLES, PATHOLOGIES, PATHO_PAR_ID, SEVERITES, type Famille, type PathoActive, type Pathologie } from '../content/pathologies.ts';
import { classesEnPlus, evaluerPathologie } from '../core/evaluation.ts';
import { CLASSES, CLASSE_PAR_ID, DOSES, type Classe } from '../content/classes.ts';
import { LABO, MARQUES } from '../content/labo.ts';
import { GraphiqueEvolution, LEGENDE_SCENARIOS, Moniteur, Risques } from './widgets.tsx';
import { NOMS_VUES, vuePour, zoneDansVue, type Vue } from './Stage.tsx';

const NIVEAUX_NOMS: Record<Niveau, string> = { 1: 'Découvrir', 2: 'Comprendre', 3: 'Approfondir' };

export const VOYAGE: { z: ZoneId; etape: string }[] = [
  { z: 'veinesCaves', etape: 'Le sang pauvre en oxygène revient du corps' },
  { z: 'od', etape: 'Il entre dans l\'oreillette droite' },
  { z: 'valveTri', etape: 'Il franchit la valve tricuspide' },
  { z: 'vd', etape: 'Le ventricule droit le pousse vers les poumons' },
  { z: 'valvePu', etape: 'Il passe la valve pulmonaire' },
  { z: 'artPulm', etape: 'L\'artère pulmonaire l\'emmène aux poumons' },
  { z: 'poumons', etape: 'Il se recharge en oxygène et devient rouge' },
  { z: 'veinesPulm', etape: 'Il revient au cœur gauche' },
  { z: 'og', etape: 'Il entre dans l\'oreillette gauche' },
  { z: 'valveMi', etape: 'Il franchit la valve mitrale' },
  { z: 'vg', etape: 'Le ventricule gauche, la pompe principale, l\'éjecte' },
  { z: 'valveAo', etape: 'Il passe la valve aortique' },
  { z: 'aorte', etape: 'L\'aorte le distribue à tout le corps' },
  { z: 'coronaires', etape: 'Une partie nourrit le cœur lui-même' },
  { z: 'cerveau', etape: 'Le cerveau en reçoit environ 15 %' },
  { z: 'reins', etape: 'Les reins le filtrent et règlent la tension' },
  { z: 'membres', etape: 'Les muscles prennent l\'oxygène, puis le sang repart vers le cœur' },
];

/** Détails affichés pendant la visite guidée : [niveau Découvrir, niveaux Comprendre/Approfondir]. Valeurs de repos de l'adulte. */
export const DETAILS_VISITE: Partial<Record<ZoneId, [string, string]>> = {
  veinesCaves: ['Le sang est bleu : il a donné son oxygène aux organes.', 'Saturation veineuse en oxygène ≈ 70-75 % · pression 2 à 8 mmHg'],
  od: ['Une chambre d\'attente à basse pression.', 'Pression moyenne 2 à 8 mmHg · contient le nœud sinusal, le chef d\'orchestre électrique'],
  valveTri: ['La porte s\'ouvre quand le ventricule se relâche.', '3 valvules · ouverte en diastole · sa fermeture participe au 1er bruit (B1)'],
  vd: ['Il pousse doucement : les poumons sont tout près.', 'Pression 15-30 / 2-8 mmHg · paroi 3 à 5 mm, en forme de croissant'],
  valvePu: ['La porte de sortie vers les poumons.', 'Ouverte pendant l\'éjection · sa fermeture donne la composante P2 du 2e bruit'],
  artPulm: ['Direction les poumons, pour se recharger en oxygène.', 'Pression 15-30 / 4-12 mmHg · dans les poumons, la saturation remonte à ≈ 98 %'],
  veinesPulm: ['Le sang revient rouge, riche en oxygène.', 'Saturation ≈ 98 % · 4 veines s\'abouchent dans l\'oreillette gauche'],
  og: ['La salle d\'attente du cœur gauche.', 'Pression moyenne 6 à 12 mmHg · son auricule est le lieu des caillots en FA'],
  valveMi: ['La porte à deux battants du cœur gauche.', '2 valves · surface 4 à 6 cm² · sa fermeture donne la composante M1 du 1er bruit'],
  vg: ['La pompe principale envoie le sang dans tout le corps.', 'Pression 100-140 / 3-12 mmHg · éjecte ≈ 70 ml par battement (FE ≥ 50 %)'],
  valveAo: ['La porte s\'ouvre et le sang part vers le corps.', 'S\'ouvre quand la pression du VG dépasse celle de l\'aorte (≈ 80 mmHg) · fermeture = A2 du 2e bruit'],
  aorte: ['La grande artère amortit chaque battement.', 'PA ≈ 120/80 mmHg · son élasticité (effet Windkessel) maintient le débit en diastole'],
  coronaires: ['Le cœur se nourrit lui-même par ces petites artères.', 'Remplissage surtout en diastole · ≈ 5 % du débit cardiaque au repos'],
};

function Texte3({ textes, niveau }: { textes: Record<Niveau, string>; niveau: Niveau }) {
  const [plus, setPlus] = useState(false);
  return (
    <div className="space-y-2">
      <p className="text-[14px] leading-relaxed">{textes[niveau]}</p>
      {niveau < 3 && (
        <>
          <button onClick={() => setPlus((v) => !v)} className="text-xs text-accent font-semibold inline-flex items-center gap-1">
            <ChevronDown size={14} className={plus ? 'rotate-180 transition' : 'transition'} /> {plus ? 'Moins' : `Aller plus loin (${NIVEAUX_NOMS[(niveau + 1) as Niveau]})`}
          </button>
          {plus && <p className="text-[13px] leading-relaxed text-muted border-l-2 border-accent/40 pl-3 fade-in">{textes[(niveau + 1) as Niveau]}</p>}
        </>
      )}
    </div>
  );
}

// ─────────────────────────── Explorer ───────────────────────────

export function PanneauExplorer({ zone, niveau, vue, etat, actives, onZone, onTogglePatho, onVue, onVoirPatho }: {
  zone: ZoneId | null; niveau: Niveau; vue: Vue; etat: Etat; actives: PathoActive[];
  onZone: (z: ZoneId | null) => void; onTogglePatho: (id: string) => void; onVue: (v: Vue) => void; onVoirPatho: (id: string) => void;
}) {
  if (!zone) {
    return (
      <div className="space-y-4 fade-in">
        <div>
          <h2 className="font-display text-xl">Le voyage du sang</h2>
          <p className="text-sm text-muted mt-1">Suivez une goutte de sang pendant un tour complet. Touchez une étape, ou cliquez directement sur le cœur ou sur un organe.</p>
        </div>
        <ol className="relative border-l border-line ml-2 space-y-1">
          {VOYAGE.map((v, k) => {
            const rouge = k >= 7 && k <= 15;
            return (
              <li key={v.z} className="pl-4 relative">
                <span className={`absolute -left-[5px] top-2.5 w-2.5 h-2.5 rounded-full ${k === 6 || k === 16 ? 'bg-gradient-to-b from-veine to-sang' : rouge ? 'bg-sang' : 'bg-veine'}`} />
                <button onClick={() => onZone(v.z)} className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-card">
                  <div className="text-[13.5px] font-semibold">{ZONES[v.z].nom}</div>
                  <div className="text-xs text-muted">{v.etape}</div>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="carte p-3">
          <div className="titre-section mb-2">Le chef d'orchestre électrique</div>
          <div className="flex gap-2 flex-wrap">
            <button className="puce" onClick={() => onZone('noeudSinusal')}>Nœud sinusal</button>
            <button className="puce" onClick={() => onZone('noeudAV')}>Nœud auriculo-ventriculaire</button>
          </div>
        </div>
      </div>
    );
  }
  const z = ZONES[zone];
  const idx = VOYAGE.findIndex((v) => v.z === zone);
  const pathos = PATHOLOGIES.filter((p) => p.zones.includes(zone));
  const estValve = zone.startsWith('valve');
  const aus = ausculter(etat);
  const pasDansVue = !zoneDansVue(zone, vue);
  return (
    <div className="space-y-4 fade-in" key={zone}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <button onClick={() => onZone(null)} className="text-xs text-muted inline-flex items-center gap-1 hover:text-txt"><ArrowLeft size={13} /> Le voyage</button>
          <h2 className="font-display text-2xl mt-1 flex items-center gap-2">
            {z.sang !== 'aucun' && <span className={`w-3 h-3 rounded-full ${z.sang === 'rouge' ? 'bg-sang' : z.sang === 'bleu' ? 'bg-veine' : 'bg-gradient-to-r from-veine to-sang'}`} />}
            {z.nom}
          </h2>
        </div>
        {idx >= 0 && (
          <div className="flex gap-1 shrink-0 mt-5">
            <button className="btn-icone" disabled={idx === 0} onClick={() => onZone(VOYAGE[idx - 1].z)} aria-label="Étape précédente"><ArrowLeft size={15} /></button>
            <button className="btn-icone" disabled={idx === VOYAGE.length - 1} onClick={() => onZone(VOYAGE[idx + 1].z)} aria-label="Étape suivante"><ArrowRight size={15} /></button>
          </div>
        )}
      </div>
      {pasDansVue && (
        <button onClick={() => onVue(vuePour(zone))} className="w-full carte p-2.5 text-sm text-accent font-semibold text-left">Cette zone se voit dans la vue {NOMS_VUES[vuePour(zone)]} : l'afficher →</button>
      )}
      {['coronaires', 'carotides', 'membres', 'aorte'].includes(zone) && vue !== 'vaisseau' && (
        <button onClick={() => onVue('vaisseau')} className="w-full carte p-2.5 text-[13px] text-left"><span className="text-accent font-semibold">Voir la paroi de l'artère en coupe →</span> <span className="text-muted">plaque, rétrécissement, durcissement (vue Vaisseau)</span></button>
      )}
      {(zone === 'noeudSinusal' || zone === 'noeudAV') && (
        <p className="text-[12.5px] text-muted carte p-2.5">L'<b className="text-txt">ECG</b> s'affiche sous la scène : chaque onde correspond à une étape électrique (P : oreillettes, QRS : ventricules, T : récupération).</p>
      )}
      <div className="carte p-3.5">
        <div className="titre-section mb-1.5">Comment ça marche</div>
        <Texte3 textes={z.role} niveau={niveau} />
        {niveau >= 2 && z.chiffres && <div className="mt-2.5 text-xs text-muted flex items-center gap-1.5"><Info size={13} /> {z.chiffres}</div>}
      </div>
      {estValve && (
        <div className="carte p-3.5">
          <div className="titre-section mb-1.5 flex items-center gap-1.5"><Stethoscope size={13} /> À l'auscultation</div>
          <ul className="text-[13px] space-y-1">
            <li>B1 (« toum ») : fermeture des valves mitrale et tricuspide · B2 (« ta ») : fermeture des valves aortique et pulmonaire.</li>
            {aus.souffles.map((s) => <li key={s} className="text-warn">• {s}</li>)}
            {aus.b3 && <li className="text-warn">• B3 : remplissage rapide d'un ventricule surchargé</li>}
            {aus.b4 && <li className="text-warn">• B4 : l'oreillette pousse contre un ventricule rigide</li>}
            {!aus.souffles.length && !aus.b3 && !aus.b4 && <li className="text-ok">Pas de souffle : les valves fonctionnent bien.</li>}
          </ul>
          <p className="text-[11px] text-dim mt-2 flex items-center gap-1"><Ear size={12} /> Activez le son (en haut) et mettez un casque pour écouter.</p>
        </div>
      )}
      {pathos.length > 0 && (
        <div>
          <div className="titre-section mb-2">Maladies de cette zone — touchez pour simuler</div>
          <div className="flex flex-wrap gap-1.5">
            {pathos.map((p) => {
              const on = actives.some((a) => a.id === p.id);
              return (
                <button key={p.id} className={`puce ${on ? 'actif' : ''}`} onClick={() => { onTogglePatho(p.id); onVoirPatho(p.id); }}>
                  {on ? <Check size={13} /> : <Plus size={13} />} {p.nom}
                </button>
              );
            })}
          </div>
          {actives.filter((a) => pathos.some((p) => p.id === a.id)).map((a) => {
            const p = PATHO_PAR_ID[a.id];
            return (
              <div key={a.id} className="carte p-3 mt-2.5 border-sang/30 fade-in">
                <div className="text-sm font-semibold">{p.nom}</div>
                <p className="text-[13px] text-muted mt-1"><span className="text-txt font-semibold">Ce qu'on voit : </span>{p.voir}</p>
                <button onClick={() => onVoirPatho(p.id)} className="text-xs text-accent font-semibold mt-2">Fiche complète et traitement →</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Maladies ───────────────────────────

export const SCENARIOS_RAPIDES: { nom: string; actives: PathoActive[] }[] = [
  { nom: 'Patient hypertendu', actives: [{ id: 'hta', s: 0.7 }] },
  { nom: 'HTA + cholestérol', actives: [{ id: 'hta', s: 0.7 }, { id: 'dyslip', s: 0.7 }] },
  { nom: 'HTA + diabète + cholestérol', actives: [{ id: 'hta', s: 0.7 }, { id: 'diabete', s: 0.7 }, { id: 'dyslip', s: 0.7 }] },
  { nom: 'Fibrillation atriale', actives: [{ id: 'fa', s: 0.7 }, { id: 'hta', s: 0.4 }] },
  { nom: 'Après un infarctus', actives: [{ id: 'idm', s: 0.7 }, { id: 'dyslip', s: 0.7 }] },
  { nom: 'Insuffisance cardiaque', actives: [{ id: 'icfer', s: 0.7 }] },
];

/** Ordre des familles selon ce qu'on regarde : on montre d'abord les maladies de la vue. */
function ordreFamilles(vue: Vue, zone: ZoneId | null): Famille[] {
  const tout: Famille[] = ['valves', 'myocarde', 'coronaires', 'rythme', 'arteres', 'lipides', 'organes'];
  let tete: Famille[] = [];
  if (vue === 'vaisseau') tete = ['lipides', 'arteres', 'coronaires'];
  else if (vue === 'corps') tete = ['organes', 'arteres', 'lipides'];
  else if (vue === '2d') tete = ['arteres', 'lipides', 'coronaires'];
  else if (vue === 'coeur2d') tete = ['valves', 'myocarde', 'rythme'];
  if (zone?.startsWith('valve')) tete = ['valves', ...tete];
  else if (zone === 'noeudSinusal' || zone === 'noeudAV') tete = ['rythme', ...tete];
  else if (zone === 'coronaires') tete = ['coronaires', ...tete];
  else if (zone === 'vg' || zone === 'vd') tete = ['myocarde', ...tete];
  else if (zone && ['cerveau', 'reins', 'poumons', 'membres'].includes(zone)) tete = ['organes', ...tete];
  return [...new Set([...tete, ...tout])];
}

const NOM_VUE: Record<Vue, string> = { '3d': 'le cœur', coeur2d: 'le cœur', '2d': 'le voyage du sang', corps: 'le corps', vaisseau: 'le vaisseau' };

export function PanneauMaladies(props: {
  niveau: Niveau; vue: Vue; zone: ZoneId | null; actives: PathoActive[]; focus: string | null; traitement: Traitement;
  etat: Etat; etatSans: Etat; labo: boolean;
  onFocus: (id: string | null) => void; onToggle: (id: string) => void; onSeverite: (id: string, s: number) => void;
  onScenario: (a: PathoActive[]) => void; onDose: (c: ClasseId, d: number) => void; onRemplacer: (t: Traitement) => void;
  onSequence: () => void; onComparer: () => void;
}) {
  const { niveau, vue, zone, actives, focus, onFocus, onToggle, onSeverite, onScenario } = props;
  const f = focus ? PATHO_PAR_ID[focus] : null;
  const familles = ordreFamilles(vue, zone);
  const dansZone = zone ? PATHOLOGIES.filter((p) => p.zones.includes(zone)) : [];
  const puce = (p: Pathologie) => {
    const on = actives.some((a) => a.id === p.id);
    return <button key={p.id} className={`puce ${on ? 'actif' : ''} ${focus === p.id ? 'ring-1 ring-accent/60' : ''}`} onClick={() => { if (!on) onToggle(p.id); onFocus(p.id); }}>{on && <Check size={13} />}{niveau === 1 ? p.court : p.nom}</button>;
  };
  return (
    <div className="space-y-4 fade-in">
      {f ? (
        <article className="space-y-3 fade-in" key={f.id}>
          <button onClick={() => onFocus(null)} className="text-xs text-muted inline-flex items-center gap-1 hover:text-txt"><ArrowLeft size={13} /> Toutes les maladies</button>
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-display text-2xl">{f.nom}</h3>
            {actives.some((a) => a.id === f.id)
              ? <button className="puce" onClick={() => onToggle(f.id)}><X size={13} /> Retirer</button>
              : <button onClick={() => onToggle(f.id)} className="rounded-lg bg-sang text-white font-bold text-[13px] px-3 py-1.5 shrink-0">Simuler</button>}
          </div>
          {actives.some((a) => a.id === f.id) && !['fa', 'bav', 'diabete'].includes(f.id) && (
            <div className="seg">{SEVERITES.map((x) => <button key={x.v} className={actives.find((a) => a.id === f.id)?.s === x.v ? 'actif' : ''} onClick={() => onSeverite(f.id, x.v)}>{x.nom}</button>)}</div>
          )}
          <section className="carte p-3.5"><div className="titre-section mb-1">Ce qui se passe</div><Texte3 textes={f.texte} niveau={niveau} /></section>
          <section className="carte p-3.5"><div className="titre-section mb-1">Ce qu'on voit</div><p className="text-[13.5px] text-muted">{f.voir}</p>
            <div className="titre-section mt-3 mb-1">Conséquences</div><ul className="text-[13.5px] space-y-0.5">{f.consequences.map((c) => <li key={c}>• {c}</li>)}</ul></section>
          <BlocTraitement {...props} patho={f} />
          {f.arret && <section className="rounded-xl bg-warn/8 border border-warn/25 p-3"><div className="titre-section mb-1 text-warn/90">Si on arrête le traitement</div><p className="text-[13.5px]">{f.arret}</p></section>}
        </article>
      ) : (
        <>
          <div>
            <div className="titre-section mb-2">Cas prêts à présenter</div>
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS_RAPIDES.map((s) => <button key={s.nom} className="puce" onClick={() => onScenario(s.actives)}><Sparkles size={13} /> {s.nom}</button>)}
              {actives.length > 0 && <button className="puce" onClick={() => onScenario([])}><X size={13} /> Sujet sain</button>}
            </div>
          </div>
          {actives.length > 0 && (
            <div className="space-y-1.5">
              <div className="titre-section">Simulées en ce moment — touchez pour traiter</div>
              {actives.map((a) => {
                const p = PATHO_PAR_ID[a.id];
                const pts = evaluerPathologie(a.id, actives, props.etat, props.traitement);
                const ok = pts.length > 0 && pts.every((x) => x.ok);
                return (
                  <button key={a.id} onClick={() => onFocus(a.id)} className="w-full carte p-2.5 flex items-center gap-2 text-left hover:border-sang/40">
                    <span className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-ok' : 'bg-warn'}`} />
                    <span className="flex-1 text-[13.5px] font-semibold">{p.nom}</span>
                    <span className={`text-[11.5px] ${ok ? 'text-ok' : 'text-warn'}`}>{ok ? 'Contrôlée' : 'À traiter'}</span>
                    <ArrowRight size={14} className="text-dim" />
                  </button>
                );
              })}
            </div>
          )}
          {dansZone.length > 0 && (
            <div className="rounded-xl border border-accent/25 bg-accent/5 p-3">
              <div className="titre-section mb-1.5">Zone sélectionnée : {ZONES[zone!].nom}</div>
              <div className="flex flex-wrap gap-1.5">{dansZone.map(puce)}</div>
            </div>
          )}
          <p className="text-xs text-dim">Classées selon ce que vous regardez : {NOM_VUE[vue]}.</p>
          {familles.map((fam) => {
            const liste = PATHOLOGIES.filter((p) => p.famille === fam && p.niveauMin <= Math.max(niveau, 2));
            if (!liste.length) return null;
            return <div key={fam}><div className="titre-section mb-1.5">{FAMILLES[fam]}</div><div className="flex flex-wrap gap-1.5">{liste.map(puce)}</div></div>;
          })}
        </>
      )}
    </div>
  );
}

// ─────────────────────────── Traitement intégré à la fiche ───────────────────────────

function BlocTraitement({ patho, niveau, actives, etat, etatSans, traitement, labo, onDose, onRemplacer, onSequence, onComparer }: {
  patho: Pathologie; niveau: Niveau; actives: PathoActive[]; etat: Etat; etatSans: Etat; traitement: Traitement; labo: boolean;
  onDose: (c: ClasseId, d: number) => void; onRemplacer: (t: Traitement) => void; onSequence: () => void; onComparer: () => void;
}) {
  const [ouverte, setOuverte] = useState<ClasseId | null>(null);
  const [autres, setAutres] = useState(false);
  const simulee = actives.some((a) => a.id === patho.id);
  const propose = patho.traitement.propose;
  const proposees = Object.keys(propose) as ClasseId[];
  const groupesUtiles = new Set(proposees.map((c) => CLASSE_PAR_ID[c].groupe));
  const principales = CLASSES.filter((c) => proposees.includes(c.id) || (groupesUtiles.has(c.groupe) && c.groupe !== 'coeur'));
  const secondaires = CLASSES.filter((c) => !principales.includes(c));
  const actif = Object.values(traitement).some((d) => d && d > 0);
  const points = simulee ? evaluerPathologie(patho.id, actives, etat, traitement) : [];
  const enPlus = classesEnPlus(actives, traitement);
  const marques = MARQUES.filter((m) => m.presentations.some((p) => Object.keys(p.doses).some((c) => proposees.includes(c as ClasseId))));

  const ligneClasse = (c: Classe) => {
    const d = traitement[c.id] ?? 0;
    const open = ouverte === c.id;
    return (
      <div key={c.id} className={`carte ${d ? 'border-ok/40' : ''}`}>
        <div className="flex items-center gap-2 p-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.couleur }} />
          <button className="flex-1 text-left min-w-0" onClick={() => setOuverte(open ? null : c.id)}>
            <div className="text-[13px] font-semibold truncate">{niveau === 1 ? c.court : c.nom}{proposees.includes(c.id) && <span className="ml-1.5 text-[10px] text-ok font-bold">PROPOSÉ</span>}</div>
            <div className="text-[11px] text-dim truncate">{c.exemples}</div>
          </button>
          <div className="seg shrink-0">
            <button className={d === 0 ? 'actif' : ''} onClick={() => onDose(c.id, 0)} aria-label={`Sans ${c.court}`}>0</button>
            {DOSES.map((x) => <button key={x.v} className={d === x.v ? 'actif' : ''} onClick={() => onDose(c.id, x.v)} aria-label={`${c.court} ${x.nom}`}>{x.v === 0.5 ? '½' : x.v === 1 ? '1' : '2'}</button>)}
          </div>
        </div>
        {open && (
          <div className="px-3 pb-3 space-y-2 text-[13px] fade-in">
            <div className="text-[11.5px] text-dim">Agit sur : {c.cible}</div>
            <Texte3 textes={c.mecanisme} niveau={niveau} />
            <p><span className="font-semibold">Ce qu'on voit : </span><span className="text-muted">{c.effetVisible}</span></p>
            <div><span className="font-semibold">Effets indésirables : </span><span className="text-muted">{c.indesirables.join(' · ')}</span></div>
            <div className="rounded-lg bg-warn/8 border border-warn/25 p-2"><span className="font-semibold text-warn">À l'arrêt : </span>{c.arret}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-ok/25 bg-ok/[0.04] p-3.5 space-y-3">
      <div className="flex items-center gap-2"><Pill size={16} className="text-ok" /><span className="font-bold">Traiter</span></div>
      <p className="text-[13.5px]">{patho.traitement.texte}</p>
      {patho.traitement.nonMedicamenteux && <p className="text-[12.5px] text-muted">Hygiène de vie : {patho.traitement.nonMedicamenteux}</p>}
      {proposees.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {proposees.map((c) => <span key={c} className={`puce trt ${traitement[c] ? 'actif' : ''}`}>{CLASSE_PAR_ID[c].court}{propose[c] !== 1 ? ` ${propose[c] === 0.5 ? '½' : '×2'}` : ''}</span>)}
          <button onClick={() => { onRemplacer({ ...traitement, ...propose }); if (simulee) setTimeout(onSequence, 50); }} className="ml-auto rounded-lg bg-ok text-ink font-bold text-[13px] px-3 py-1.5 inline-flex items-center gap-1.5"><Pill size={14} /> Appliquer le traitement proposé</button>
        </div>
      )}
      {simulee && actif && (
        <>
          <div className="titre-section">Résultat (écart par rapport à sans traitement)</div>
          <Moniteur e={etat} niveau={Math.min(niveau, 2) as Niveau} ref0={etatSans} compact />
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={onSequence} className="rounded-lg bg-card2 border border-line py-2 text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5"><Play size={13} fill="currentColor" /> Effet dans le temps</button>
            <button onClick={onComparer} className="rounded-lg bg-card2 border border-line py-2 text-[12.5px] font-semibold">Comparer sans / avec</button>
          </div>
        </>
      )}
      {points.length > 0 && (
        <ul className="space-y-1.5">
          {points.map((p) => (
            <li key={p.texte} className={`flex gap-2 text-[13px] rounded-lg p-2 ${p.ok ? 'bg-ok/10' : 'bg-warn/10'}`}>
              {p.ok ? <Check size={15} className="text-ok shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="text-warn shrink-0 mt-0.5" />}<span>{p.texte}</span>
            </li>
          ))}
        </ul>
      )}
      {enPlus.length > 0 && (
        <div className="rounded-lg border border-line p-2.5 text-[13px] space-y-1">
          <div className="titre-section">Ajouté sans indication ici</div>
          {enPlus.map((c) => <div key={c}><b>{CLASSE_PAR_ID[c].court}</b> <span className="text-muted">— pas utile pour les maladies simulées ; il apporte surtout ses effets indésirables : {CLASSE_PAR_ID[c].indesirables[0].toLowerCase()}.</span></div>)}
        </div>
      )}
      {etat.alertes.map((a) => (
        <div key={a.texte} className={`rounded-xl border p-2.5 text-[13px] flex gap-2 ${a.niveau === 'danger' ? 'border-alert/50 bg-alert/10' : 'border-warn/40 bg-warn/8'}`}>
          <AlertTriangle size={15} className={`shrink-0 mt-0.5 ${a.niveau === 'danger' ? 'text-alert' : 'text-warn'}`} /> {a.texte}
        </div>
      ))}
      {etat.effets.length > 0 && <div className="text-[12.5px] text-muted"><span className="font-semibold text-txt">À surveiller : </span>{etat.effets.join(' · ')}</div>}

      {labo && marques.length > 0 && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-3 space-y-2.5">
          <div className="flex items-baseline justify-between"><div className="font-display text-lg">{LABO.nom}</div><div className="text-xs text-muted">{LABO.sousTitre}</div></div>
          {marques.map((m) => (
            <div key={m.id} className="carte p-2.5">
              <div className="flex items-baseline justify-between gap-2"><span className="font-bold">{m.nom}</span><span className="text-[11px] text-muted text-right">{m.composition}</span></div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {m.presentations.map((p) => {
                  const on = Object.entries(p.doses).every(([k, v]) => traitement[k as ClasseId] === v);
                  return <button key={p.id} className={`puce trt ${on ? 'actif' : ''}`} style={{ fontSize: 11.5 }} onClick={() => onRemplacer(on ? Object.fromEntries(Object.entries(traitement).filter(([k]) => !(k in p.doses))) : { ...traitement, ...p.doses })}>{p.nom}</button>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between"><div className="titre-section">Ajuster classe par classe</div>{actif && <button onClick={() => onRemplacer({})} className="text-xs text-muted hover:text-txt">Tout retirer</button>}</div>
        {principales.map(ligneClasse)}
        <button onClick={() => setAutres((v) => !v)} className="text-xs text-accent font-semibold inline-flex items-center gap-1"><ChevronDown size={14} className={autres ? 'rotate-180' : ''} /> {autres ? 'Masquer les autres classes' : `Essayer une autre classe (${secondaires.length})`}</button>
        {autres && secondaires.map(ligneClasse)}
      </div>
      {simulee && <div className="carte p-3"><div className="titre-section mb-2">Risques</div><Risques e={etat} ref0={actif ? etatSans : null} /></div>}
    </section>
  );
}

// ─────────────────────────── Évolution ───────────────────────────

export interface VueEvolution { scenario: Scenario; mois: number; arret: number }

export function PanneauEvolution({ terrain, traitement, vueEvo, onVueEvo, onAllerTraitements }: {
  terrain: Terrain; traitement: Traitement; vueEvo: VueEvolution | null; onVueEvo: (v: VueEvolution | null) => void; onAllerTraitements: () => void;
}) {
  const [mois, setMois] = useState(vueEvo?.mois ?? 36);
  const [arret, setArret] = useState(vueEvo?.arret ?? 24);
  const actif = Object.values(traitement).some((d) => d && d > 0);
  const series = useMemo(() => ({
    sans: evoluer(terrain, traitement, 'sans').points,
    ...(actif ? { avec: evoluer(terrain, traitement, 'avec').points, arret: evoluer(terrain, traitement, 'arret', arret).points } : {}),
  }), [terrain, traitement, arret, actif]);
  const maj = (m: number, a = arret) => { setMois(m); if (vueEvo) onVueEvo({ ...vueEvo, mois: m, arret: a }); };
  const p = (k: keyof typeof series) => series[k]?.[mois];
  const ic = terrain.contractilite < 0.9;
  return (
    <div className="space-y-4 fade-in">
      <div>
        <h2 className="font-display text-xl">Et dans 5 ans ?</h2>
        <p className="text-sm text-muted mt-1">Trois histoires pour le même patient : sans traitement, avec le traitement suivi, ou traitement arrêté en cours de route.</p>
      </div>
      {!actif && (
        <button onClick={onAllerTraitements} className="w-full carte p-3 text-left text-sm"><span className="text-accent font-semibold">Choisissez d'abord un traitement</span> <span className="text-muted">(onglet Maladies : ouvrez une fiche puis « Traiter ») pour comparer les trois scénarios.</span></button>
      )}
      <div className="flex flex-wrap gap-3 text-xs">
        {LEGENDE_SCENARIOS.filter((l) => l.k === 'sans' || actif).map((l) => <span key={l.k} className="inline-flex items-center gap-1.5"><span className="w-3 h-1 rounded" style={{ background: l.c }} />{l.nom}</span>)}
      </div>
      <div className="carte p-3 space-y-2">
        <label className="text-xs text-muted flex justify-between"><span>Moment observé</span><span className="num text-txt">{mois < 12 ? `${mois} mois` : `${(mois / 12).toFixed(mois % 12 ? 1 : 0).replace('.', ',')} an${mois >= 24 ? 's' : ''}`}</span></label>
        <input type="range" min={0} max={60} value={mois} onChange={(e) => maj(+e.target.value)} aria-label="Moment observé" />
        {actif && (
          <>
            <label className="text-xs text-muted flex justify-between pt-1"><span>Arrêt du traitement au</span><span className="num text-warn">{arret} mois</span></label>
            <input type="range" min={3} max={54} value={arret} onChange={(e) => { setArret(+e.target.value); if (vueEvo) onVueEvo({ ...vueEvo, arret: +e.target.value }); }} aria-label="Mois d'arrêt du traitement" />
          </>
        )}
        <div className="pt-1">
          <div className="text-xs text-muted mb-1.5">Montrer dans la scène :</div>
          <div className="seg flex-wrap">
            <button className={!vueEvo ? 'actif' : ''} onClick={() => onVueEvo(null)}>Aujourd'hui</button>
            {LEGENDE_SCENARIOS.filter((l) => l.k === 'sans' || actif).map((l) => (
              <button key={l.k} className={vueEvo?.scenario === l.k ? 'actif' : ''} onClick={() => onVueEvo({ scenario: l.k, mois, arret })}>{l.nom.replace('Traitement ', '')}</button>
            ))}
          </div>
        </div>
      </div>
      <GraphiqueEvolution series={series} cle="pas" titre="Tension systolique" unite="mmHg" mois={mois} arret={arret} />
      {terrain.ldl > 3 && <GraphiqueEvolution series={series} cle="ldl" titre="LDL-cholestérol" unite="mmol/L" mois={mois} arret={arret} format={(v) => v.toFixed(1)} />}
      <GraphiqueEvolution series={series} cle={terrain.ldl > 3 || terrain.plaqueCoro > 0.05 ? 'plaque' : 'hvg'} titre={terrain.ldl > 3 || terrain.plaqueCoro > 0.05 ? 'Plaque d\'athérome' : 'Épaississement du cœur (HVG)'} unite="0 à 100 %" mois={mois} arret={arret} format={(v) => `${Math.round(v * 100)}`} />
      {ic && <GraphiqueEvolution series={series} cle="fe" titre="Fraction d'éjection" unite="%" mois={mois} arret={arret} format={(v) => `${Math.round(v * 100)}`} />}
      <GraphiqueEvolution series={series} cle="risqueAvc" titre="Risque relatif d'AVC" unite="×" mois={mois} arret={arret} format={(v) => v.toFixed(1)} />
      <GraphiqueEvolution series={series} cle="risqueCoro" titre="Risque relatif d'infarctus" unite="×" mois={mois} arret={arret} format={(v) => v.toFixed(1)} />
      <div className="carte p-3 text-[13px] space-y-1">
        <div className="titre-section mb-1">Au moment observé</div>
        {(['sans', 'avec', 'arret'] as const).filter((k) => series[k]).map((k) => {
          const q = p(k)!; const l = LEGENDE_SCENARIOS.find((x) => x.k === k)!;
          return <div key={k} className="flex justify-between gap-2"><span style={{ color: l.c }}>{l.nom}</span><span className="num text-muted">PA {q.pas} · AVC ×{q.risqueAvc.toFixed(1)} · IDM ×{q.risqueCoro.toFixed(1)}</span></div>;
        })}
      </div>
      <p className="text-[11px] text-dim">Modèle pédagogique : les vitesses de progression sont des ordres de grandeur pour montrer les tendances, pas des prédictions pour un patient.</p>
    </div>
  );
}
