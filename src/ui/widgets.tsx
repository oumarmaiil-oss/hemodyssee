/** Petits composants : moniteur, risques, graphique d'évolution. */
import type { Etat, Niveau } from '../core/types.ts';
import type { PointEvolution } from '../core/engine.ts';

const statutPA = (pas: number, pad: number) =>
  pas >= 180 || pad >= 110 ? { t: 'Très élevée', c: 'text-alert' }
    : pas >= 140 || pad >= 90 ? { t: 'Élevée', c: 'text-warn' }
      : pas < 95 ? { t: 'Basse', c: 'text-alert' }
        : pas >= 130 ? { t: 'Normale haute', c: 'text-warn' } : { t: 'Normale', c: 'text-ok' };

function Mesure({ nom, valeur, unite, note, couleur, delta }: { nom: string; valeur: string; unite?: string; note?: string; couleur?: string; delta?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9.5px] sm:text-[10.5px] uppercase tracking-wider text-dim font-semibold truncate leading-tight">{nom}</div>
      <div className="flex flex-nowrap sm:flex-wrap items-baseline gap-x-1 leading-tight">
        <span className={`num text-[15px] sm:text-[19px] font-semibold ${couleur ?? ''}`}>{valeur}</span>
        {unite && <span className="text-[10px] sm:text-[11px] text-dim">{unite}</span>}
        {delta && <span className="num text-[10px] sm:text-[11px] text-ok ml-0.5">{delta}</span>}
      </div>
      {note && <div className={`hidden sm:block text-[11px] font-semibold ${couleur ?? 'text-muted'}`}>{note}</div>}
    </div>
  );
}

export function Moniteur({ e, niveau, ref0, compact }: { e: Etat; niveau: Niveau; ref0?: Etat | null; compact?: boolean }) {
  const pa = statutPA(e.pas, e.pad);
  const d = (a: number, b: number | undefined, f = (x: number) => String(Math.round(x))) => (b !== undefined && Math.round(a) !== Math.round(b) ? `${a - b > 0 ? '+' : ''}${f(a - b)}` : undefined);
  return (
    <div className={`carte px-2.5 py-1.5 sm:p-3 gap-x-3.5 sm:gap-x-4 gap-y-2 flex overflow-x-auto scroll-thin [&>*]:shrink-0 sm:[&>*]:min-w-[86px] sm:grid ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-6'}`} data-testid="moniteur">
      <Mesure nom="Tension" valeur={`${e.pas}/${e.pad}`} unite="mmHg" note={pa.t} couleur={pa.c} delta={d(e.pas, ref0?.pas)} />
      <Mesure nom="Pouls" valeur={String(e.fc)} unite="/min" note={e.terrain.rythme === 'fa' ? 'Irrégulier' : e.terrain.rythme === 'bav3' ? 'Très lent' : undefined} couleur={e.fc < 50 || e.fc > 100 ? 'text-warn' : undefined} delta={d(e.fc, ref0?.fc)} />
      {niveau >= 2 ? (
        <>
          <Mesure nom="Débit" valeur={e.debit.toFixed(1)} unite="L/min" couleur={e.debit < 4 ? 'text-warn' : undefined} />
          <Mesure nom="FE" valeur={String(Math.round(e.fe * 100))} unite="%" couleur={e.fe < 0.4 ? 'text-alert' : e.fe < 0.5 ? 'text-warn' : undefined} />
          <Mesure nom="LDL" valeur={e.ldl.toFixed(1)} unite="mmol/L" note={`${(e.ldl * 0.387).toFixed(2)} g/L`} couleur={e.ldl > 3 ? 'text-warn' : undefined} delta={d(e.ldl, ref0?.ldl, (x) => x.toFixed(1))} />
          <Mesure nom="Post-charge" valeur={`×${e.postcharge.toFixed(2)}`} couleur={e.postcharge > 1.25 ? 'text-warn' : undefined} />
        </>
      ) : (
        <Mesure nom="Le cœur" valeur={e.fe < 0.4 ? 'Faible' : e.perfusion.coeur < 0.8 ? 'Manque d\'O₂' : 'Bien'} couleur={e.fe < 0.4 || e.perfusion.coeur < 0.8 ? 'text-warn' : 'text-ok'} />
      )}
      {niveau >= 3 && (
        <>
          <Mesure nom="P. oreillette G" valeur={String(e.pog)} unite="mmHg" couleur={e.pog >= 18 ? 'text-alert' : undefined} />
          <Mesure nom="PAP systolique" valeur={String(e.paps)} unite="mmHg" couleur={e.paps > 35 ? 'text-warn' : undefined} />
          <Mesure nom="PVC" valeur={String(e.pvc)} unite="mmHg" couleur={e.pvc > 10 ? 'text-warn' : undefined} />
          <Mesure nom="VG systolique" valeur={String(e.pvg)} unite="mmHg" />
          <Mesure nom="Gradient Ao" valeur={String(e.gradientAo)} unite="mmHg" couleur={e.gradientAo >= 40 ? 'text-alert' : undefined} />
          <Mesure nom="VES / VTD" valeur={`${e.ves}/${e.vtd}`} unite="ml" />
        </>
      )}
    </div>
  );
}

const NOMS_RISQUES: Record<keyof Etat['risques'], string> = { avc: 'AVC', coronaire: 'Infarctus', ic: 'Insuff. cardiaque', rein: 'Atteinte rénale' };

export function Risques({ e, ref0 }: { e: Etat; ref0?: Etat | null }) {
  return (
    <div className="space-y-1.5">
      {(Object.keys(NOMS_RISQUES) as (keyof Etat['risques'])[]).map((k) => {
        const v = e.risques[k];
        const w = Math.min(100, (Math.log(Math.max(v, 0.5)) / Math.log(12)) * 100 + 8);
        const c = v >= 3 ? 'bg-alert' : v >= 1.6 ? 'bg-warn' : 'bg-ok';
        return (
          <div key={k} className="flex items-center gap-2 text-xs">
            <span className="w-28 text-muted shrink-0">{NOMS_RISQUES[k]}</span>
            <div className="flex-1 h-2 rounded-full bg-card2 overflow-hidden"><div className={`h-full ${c} transition-all duration-500`} style={{ width: `${w}%` }} /></div>
            <span className="num w-20 text-right">×{v.toFixed(1)}{ref0 && Math.abs(ref0.risques[k] - v) > 0.05 && <span className="text-dim"> ({ref0.risques[k].toFixed(1)})</span>}</span>
          </div>
        );
      })}
      <p className="text-[11px] text-dim leading-snug">Risque relatif par rapport à une personne de même âge avec une PA à 120 mmHg, un LDL à 2,6 mmol/L et un rythme normal. Ordres de grandeur issus des grandes méta-analyses, pas une prédiction individuelle.</p>
    </div>
  );
}

const COULEURS = { sans: '#fb7185', avec: '#34d399', arret: '#fbbf24' } as const;

export function GraphiqueEvolution({ series, cle, titre, unite, mois, arret, format = (v: number) => v.toFixed(0) }: {
  series: Partial<Record<keyof typeof COULEURS, PointEvolution[]>>; cle: keyof PointEvolution; titre: string; unite?: string; mois: number; arret?: number; format?: (v: number) => string;
}) {
  const W = 320, H = 120, m = { l: 34, r: 16, t: 10, b: 18 };
  const toutes = Object.values(series).flatMap((s) => s!.map((p) => p[cle] as number));
  let min = Math.min(...toutes), max = Math.max(...toutes);
  if (max - min < 1e-6) { max += 1; min -= 1; }
  const pad = (max - min) * 0.1; min -= pad; max += pad;
  const n = Object.values(series)[0]?.length ?? 61;
  const x = (i: number) => m.l + (i / (n - 1)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - min) / (max - min)) * (H - m.t - m.b);
  return (
    <figure className="carte p-2.5">
      <figcaption className="flex justify-between text-xs mb-1"><span className="font-semibold">{titre}</span>{unite && <span className="text-dim">{unite}</span>}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={titre}>
        {[0, 0.5, 1].map((f) => { const v = min + (max - min) * f; return <g key={f}><line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="rgba(148,163,184,.14)" /><text x={m.l - 4} y={y(v) + 3} fontSize="9" fill="#7f8ba3" textAnchor="end">{format(v)}</text></g>; })}
        {[0, 12, 24, 36, 48, 60].filter((k) => k < n).map((k) => <text key={k} x={x(k)} y={H - 4} fontSize="9" fill="#7f8ba3" textAnchor="middle">{k === 0 ? '0' : `${k / 12} an${k > 12 ? 's' : ''}`}</text>)}
        {arret !== undefined && series.arret && <line x1={x(arret)} x2={x(arret)} y1={m.t} y2={H - m.b} stroke="#fbbf24" strokeDasharray="3 3" opacity={0.6} />}
        {(Object.entries(series) as [keyof typeof COULEURS, PointEvolution[]][]).map(([k, s]) => (
          <polyline key={k} fill="none" stroke={COULEURS[k]} strokeWidth={2} strokeLinejoin="round" points={s.map((p, i) => `${x(i)},${y(p[cle] as number)}`).join(' ')} />
        ))}
        <line x1={x(mois)} x2={x(mois)} y1={m.t} y2={H - m.b} stroke="#e9eef8" strokeWidth={1} opacity={0.5} />
      </svg>
    </figure>
  );
}

export const LEGENDE_SCENARIOS = [
  { k: 'sans', nom: 'Sans traitement', c: COULEURS.sans },
  { k: 'avec', nom: 'Traitement suivi', c: COULEURS.avec },
  { k: 'arret', nom: 'Traitement arrêté', c: COULEURS.arret },
] as const;
