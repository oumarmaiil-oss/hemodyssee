/** Scène principale : cœur 3D ou voyage du sang 2D, animés par une horloge commune. */
import { useEffect, useRef, useState } from 'react';
import { Box, Eye, Layers, RotateCcw, Scissors, Tag } from 'lucide-react';
import { Horloge, NOMS_PHASES, type Phase } from '../core/clock.ts';
import type { Son } from '../core/audio.ts';
import type { Etat, Niveau } from '../core/types.ts';
import { ZONES, type ZoneId } from '../content/zones.ts';
import type { Coeur3D, Coupe } from '../render/heart3d.ts';
import { creerCircuit2D, type Circuit2D } from '../render/circuit2d.ts';

export type Vue = '3d' | '2d';

const ZONES_3D: ZoneId[] = ['od', 'vd', 'og', 'vg', 'valveTri', 'valvePu', 'valveMi', 'valveAo', 'noeudSinusal', 'noeudAV', 'aorte', 'artPulm', 'veinesCaves', 'veinesPulm', 'coronaires', 'carotides'];
export const zoneEn3D = (z: ZoneId) => ZONES_3D.includes(z);

const leger = typeof navigator !== 'undefined' && ((navigator.hardwareConcurrency ?? 8) <= 4 || /[?&]leger/.test(location.search));

interface Props {
  vue: Vue;
  etat: Etat;
  niveau: Niveau;
  zone: ZoneId | null;
  onZone: (z: ZoneId | null) => void;
  son: Son;
  ralenti: boolean;
}

export function Stage({ vue, etat, niveau, zone, onZone, son, ralenti }: Props) {
  const hote = useRef<HTMLDivElement>(null);
  const rendu = useRef<Coeur3D | Circuit2D | null>(null);
  const horloge = useRef(new Horloge());
  const etatRef = useRef(etat);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const [survol, setSurvol] = useState<ZoneId | null>(null);
  const [pret, setPret] = useState(false);
  const [erreur3D, setErreur3D] = useState(false);
  const [coupe, setCoupe] = useState<Coupe>('aucune');
  const [coupePos, setCoupePos] = useState(0);
  const [opacite, setOpacite] = useState(1);
  const [etiquettes, setEtiquettes] = useState(niveau === 1);
  const [outils, setOutils] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 900);
  const onZoneRef = useRef(onZone);
  onZoneRef.current = onZone;

  etatRef.current = etat;
  useEffect(() => { horloge.current.regler(etat.fc, etat.terrain.rythme, etat.fcOreillettes === 400 ? etat.fc : 75); rendu.current?.maj(etat); }, [etat]);
  useEffect(() => { horloge.current.vitesse = ralenti ? 0.35 : 1; }, [ralenti]);
  useEffect(() => { setEtiquettes(niveau === 1); }, [niveau]);

  // Création du rendu (3D chargée à la demande).
  useEffect(() => {
    const el = hote.current!;
    let annule = false;
    setPret(false);
    const opts = { onPick: (z: ZoneId | null) => onZoneRef.current(z), onHover: setSurvol, leger };
    const monter = (r: Coeur3D | Circuit2D) => {
      if (annule) { r.dispose(); return; }
      rendu.current = r; r.maj(etatRef.current); setPret(true);
    };
    if (vue === '3d') {
      import('../render/heart3d.ts').then((m) => monter(m.creerCoeur3D(el, opts))).catch(() => setErreur3D(true));
    } else monter(creerCircuit2D(el, opts));
    return () => { annule = true; rendu.current?.dispose(); rendu.current = null; };
  }, [vue]);

  // Boucle d'animation unique.
  useEffect(() => {
    let raf = 0, last = performance.now(), dernierePhase: Phase | null = null;
    const boucle = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const i = horloge.current.avancer(dt);
      rendu.current?.frame(i, dt);
      son.tick(i, etatRef.current);
      if (i.phase !== dernierePhase && phaseRef.current) { dernierePhase = i.phase; phaseRef.current.textContent = NOMS_PHASES[i.phase]; }
      raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(raf);
  }, [son]);

  useEffect(() => { if (!pret) return; rendu.current?.selection(zone); rendu.current?.focus(zone); }, [zone, pret]);
  useEffect(() => {
    if (!pret || vue !== '3d') return;
    const r = rendu.current as Coeur3D;
    r.setCoupe(coupe, coupePos);
  }, [coupe, coupePos, pret, vue]);
  useEffect(() => { if (pret && vue === '3d') (rendu.current as Coeur3D).setOpacite(opacite); }, [opacite, pret, vue]);
  useEffect(() => {
    if (!pret) return;
    const PRINCIPALES: ZoneId[] = ['od', 'vd', 'og', 'vg', 'aorte', 'artPulm', 'veinesCaves', 'veinesPulm', 'coronaires', 'poumons', 'cerveau', 'reins', 'membres', 'carotides'];
    const noms = Object.fromEntries(PRINCIPALES.map((z) => [z, ZONES[z].nom.replace('Artères coronaires', 'Coronaires')]));
    if (zone && !PRINCIPALES.includes(zone)) noms[zone] = ZONES[zone].nom;
    rendu.current?.setEtiquettes(etiquettes, noms);
  }, [etiquettes, pret, vue, zone]);

  // Zoom automatique : coupe frontale quand on entre dans une structure interne en 3D.
  useEffect(() => {
    if (vue !== '3d' || !zone) return;
    if (['od', 'vd', 'og', 'vg', 'valveTri', 'valvePu', 'valveMi', 'valveAo', 'noeudAV'].includes(zone)) {
      const POS: Partial<Record<ZoneId, number>> = { od: 0, vd: 0.55, og: -0.6, vg: 0.05, valveTri: 0.2, valvePu: 0.5, valveMi: -0.42, valveAo: -0.12, noeudAV: 0.12 };
      setCoupe('frontale');
      setCoupePos(POS[zone] ?? 0);
    }
  }, [zone, vue]);

  const nomSurvol = survol ? ZONES[survol].nom : null;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl border border-line bg-[radial-gradient(ellipse_at_50%_35%,#1b1630_0%,#0b0f1c_55%,#070a12_100%)]" data-testid="scene">
      <div ref={hote} className="absolute inset-0" />
      {!pret && !erreur3D && <div className="absolute inset-0 grid place-items-center text-muted text-sm">Préparation de la scène…</div>}
      {erreur3D && <div className="absolute inset-0 grid place-items-center text-center p-6 text-muted text-sm">La 3D n'est pas disponible sur cet appareil.<br />Utilisez la vue 2D.</div>}

      {/* Phase du cycle */}
      {niveau >= 2 && (
        <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-ink/75 border border-line px-3 py-1 text-xs text-muted pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-sang animate-pulse" />
          <span ref={phaseRef}>—</span>
        </div>
      )}
      {nomSurvol && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/85 border border-line px-3 py-1 text-xs font-semibold pointer-events-none">{nomSurvol} · cliquer pour zoomer</div>
      )}

      {/* Outils 3D */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        <div className="flex gap-1.5">
          {vue === '3d' && <button onClick={() => setOutils((v) => !v)} className={`btn-icone ${outils ? 'actif' : ''}`} title="Coupe et transparence" aria-label="Outils de coupe et de transparence"><Scissors size={16} /></button>}
          <button onClick={() => setEtiquettes((v) => !v)} className={`btn-icone ${etiquettes ? 'actif' : ''}`} title="Étiquettes" aria-label="Afficher les étiquettes"><Tag size={16} /></button>
          <button onClick={() => { onZone(null); setCoupe('aucune'); if (vue === '3d') (rendu.current as Coeur3D | null)?.vueInitiale(); else rendu.current?.focus(null); }} className="btn-icone" title="Vue d'ensemble" aria-label="Revenir à la vue d'ensemble"><RotateCcw size={16} /></button>
        </div>
        {vue === '3d' && pret && outils && (
          <div className="w-52 rounded-xl bg-ink/80 border border-line p-2.5 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted"><Scissors size={13} /> Coupe</div>
            <div className="grid grid-cols-4 gap-1">
              {(['aucune', 'frontale', 'sagittale', 'transversale'] as Coupe[]).map((c) => (
                <button key={c} onClick={() => setCoupe(c)} className={`rounded-md py-1 text-[10.5px] border ${coupe === c ? 'bg-sang/25 border-sang/60 text-txt' : 'border-line text-muted hover:text-txt'}`}>
                  {c === 'aucune' ? 'Non' : c === 'frontale' ? '4 cav.' : c === 'sagittale' ? 'Sagit.' : 'Transv.'}
                </button>
              ))}
            </div>
            {coupe !== 'aucune' && <input type="range" min={-1.2} max={1.2} step={0.02} value={coupePos} onChange={(e) => setCoupePos(+e.target.value)} aria-label="Position de la coupe" />}
            <div className="flex items-center gap-1.5 text-muted pt-1"><Layers size={13} /> Transparence</div>
            <input type="range" min={0.15} max={1} step={0.01} value={opacite} onChange={(e) => setOpacite(+e.target.value)} aria-label="Opacité des parois" />
          </div>
        )}
      </div>

      {/* Aide */}
      <div className="absolute bottom-3 right-3 text-[11px] text-dim pointer-events-none hidden sm:flex items-center gap-1.5">
        {vue === '3d' ? <><Box size={12} /> Glisser pour tourner · molette pour zoomer · clic sur une zone</> : <><Eye size={12} /> Cliquez sur un organe ou une valve pour zoomer</>}
      </div>
    </div>
  );
}
