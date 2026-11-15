/** Cas cliniques d'entraînement : diagnostic, conduite à tenir, correction, simulation. */
import { useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Play, RotateCcw, X } from 'lucide-react';
import { CAS, type CasClinique } from '../content/cas.ts';
import type { PathoActive } from '../content/pathologies.ts';
import type { ZoneId } from '../content/zones.ts';
import type { Traitement } from '../core/types.ts';

const lire = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const ecrire = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };

export function Quiz({ onFermer, onSimuler, onEffet }: {
  onFermer: () => void;
  /** Affiche le patient dans la scène (après la première réponse, pour ne pas souffler le diagnostic). */
  onSimuler: (actives: PathoActive[], traitement: Traitement, zone: ZoneId | null) => void;
  /** Lance « Effet dans le temps » avec le traitement du cas. */
  onEffet: () => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>(() => { try { return JSON.parse(lire('hemo.cas') || '{}'); } catch { return {}; } });
  const [cas, setCas] = useState<CasClinique | null>(null);
  const [reps, setReps] = useState<(number | null)[]>([null, null]);

  const ouvrir = (c: CasClinique) => { setCas(c); setReps([null, null]); };
  const repondre = (q: 0 | 1, k: number) => {
    if (!cas || reps[q] !== null) return;
    const n = [...reps]; n[q] = k; setReps(n);
    if (q === 0) onSimuler(cas.pathos, {}, cas.zone);
    if (q === 1) {
      const pts = n.filter((r, i) => r !== null && cas.questions[i].options[r].ok).length;
      const s = { ...scores, [cas.id]: pts }; setScores(s); ecrire('hemo.cas', JSON.stringify(s));
    }
  };
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  if (!cas) return (
    <div className="space-y-3 fade-in">
      <button onClick={onFermer} className="text-xs text-muted inline-flex items-center gap-1 hover:text-txt"><ArrowLeft size={13} /> Maladies et traitements</button>
      <div className="flex items-end justify-between gap-2">
        <h3 className="font-display text-2xl">Cas cliniques</h3>
        <span className="text-xs text-muted">{total} / {CAS.length * 2} bonnes réponses</span>
      </div>
      <p className="text-[13px] text-muted">Une situation, deux questions. Le patient apparaît dans la scène après votre première réponse.</p>
      <div className="space-y-1.5">
        {CAS.map((c, i) => {
          const s = scores[c.id];
          return (
            <button key={c.id} onClick={() => ouvrir(c)} className="w-full carte p-2.5 flex items-center gap-2 text-left hover:border-sang/40">
              <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold shrink-0 ${s === undefined ? 'bg-card2 text-muted' : s === 2 ? 'bg-ok/20 text-ok' : 'bg-warn/20 text-warn'}`}>{s === undefined ? i + 1 : `${s}/2`}</span>
              <span className="flex-1 text-[13.5px]">{c.accroche}</span>
              <ChevronRight size={14} className="text-dim" />
            </button>
          );
        })}
      </div>
      {total > 0 && <button onClick={() => { setScores({}); ecrire('hemo.cas', '{}'); }} className="text-xs text-dim inline-flex items-center gap-1"><RotateCcw size={12} /> Remettre les scores à zéro</button>}
    </div>
  );

  const fini = reps[1] !== null;
  const idx = CAS.indexOf(cas);
  return (
    <article className="space-y-3 fade-in" key={cas.id}>
      <button onClick={() => setCas(null)} className="text-xs text-muted inline-flex items-center gap-1 hover:text-txt"><ArrowLeft size={13} /> Tous les cas</button>
      <h3 className="font-display text-xl leading-tight">{cas.accroche}</h3>
      <section className="carte p-3.5 space-y-2">
        <p className="text-[14px]">{cas.vignette}</p>
        <ul className="text-[13px] text-muted space-y-0.5">{cas.examen.map((x) => <li key={x}>• {x}</li>)}</ul>
      </section>
      {cas.questions.map((q, qi) => (qi === 0 || reps[0] !== null) && (
        <section key={qi} className="space-y-1.5 fade-in">
          <div className="titre-section">{qi + 1}. {q.q}</div>
          {q.options.map((o, k) => {
            const choisi = reps[qi] === k, repondu = reps[qi] !== null;
            const etat = !repondu ? '' : o.ok ? 'border-ok/60 bg-ok/10' : choisi ? 'border-alert/60 bg-alert/10' : 'opacity-60';
            return (
              <button key={k} onClick={() => repondre(qi as 0 | 1, k)} disabled={repondu} className={`w-full carte p-2.5 text-left text-[13.5px] ${etat}`}>
                <div className="flex items-start gap-2">
                  {repondu && (o.ok ? <Check size={15} className="text-ok shrink-0 mt-0.5" /> : choisi ? <X size={15} className="text-alert shrink-0 mt-0.5" /> : <span className="w-[15px] shrink-0" />)}
                  <span>{o.t}</span>
                </div>
                {repondu && (o.ok || choisi) && <div className="text-[12.5px] text-muted mt-1 pl-6">{o.pourquoi}</div>}
              </button>
            );
          })}
        </section>
      ))}
      {fini && (
        <section className="rounded-xl bg-ok/8 border border-ok/30 p-3 space-y-2 fade-in">
          <div className="titre-section text-ok/90">À retenir</div>
          <p className="text-[13.5px]">{cas.aRetenir}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {cas.traitement && <button onClick={() => { onSimuler(cas.pathos, cas.traitement!, cas.zone); setTimeout(onEffet, 60); }} className="rounded-lg bg-ok text-ink font-bold text-[12.5px] px-3 py-1.5 inline-flex items-center gap-1.5"><Play size={12} fill="currentColor" /> Voir l'effet du traitement</button>}
            {idx < CAS.length - 1 && <button onClick={() => ouvrir(CAS[idx + 1])} className="rounded-lg bg-card2 border border-line text-[12.5px] font-semibold px-3 py-1.5 inline-flex items-center gap-1">Cas suivant <ChevronRight size={13} /></button>}
          </div>
        </section>
      )}
    </article>
  );
}
