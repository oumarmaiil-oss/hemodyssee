/** Scène principale : cœur 3D ou voyage du sang 2D, animés par une horloge commune. */
import { useEffect, useRef, useState } from 'react';
import { Box, Camera, Circle, Eye, Layers, RotateCcw, Scissors, Square, Tag } from 'lucide-react';
import { Horloge, NOMS_PHASES, type Phase } from '../core/clock.ts';
import type { Son } from '../core/audio.ts';
import type { Etat, Niveau } from '../core/types.ts';
import { ZONES, type ZoneId } from '../content/zones.ts';
import type { Coeur3D, Coupe } from '../render/heart3d.ts';
import { creerCircuit2D, type Circuit2D } from '../render/circuit2d.ts';
import { creerCorps2D, type Corps2D } from '../render/corps2d.ts';
import { creerVaisseau2D, SITES, type Site, type Vaisseau2D } from '../render/vaisseau2d.ts';

type Rendu = Coeur3D | Circuit2D | Corps2D | Vaisseau2D;
const SITE_DE_ZONE: Partial<Record<ZoneId, Site>> = { coronaires: 'coronaire', carotides: 'carotide', cerveau: 'carotide', membres: 'jambe', aorte: 'aorte', reins: 'arteriole', vg: 'coronaire' };

export type Vue = '3d' | '2d' | 'corps' | 'vaisseau';

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
  legende: string;
}

export function Stage({ vue, etat, niveau, zone, onZone, son, ralenti, legende }: Props) {
  const hote = useRef<HTMLDivElement>(null);
  const rendu = useRef<Rendu | null>(null);
  const [site, setSite] = useState<Site>('coronaire');
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
  const visible = useRef(true);
  const captureRef = useRef<((src: HTMLCanvasElement) => void) | null>(null);
  const legendeRef = useRef(legende);
  legendeRef.current = legende;
  const [enreg, setEnreg] = useState<{ debut: number; son: boolean } | null>(null);
  const [duree, setDuree] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const onZoneRef = useRef(onZone);
  // Pas de rendu quand la scène est hors de l'écran (défilement sur mobile) : économise batterie et processeur.
  useEffect(() => {
    const io = new IntersectionObserver(([en]) => { visible.current = en.isIntersecting; });
    if (hote.current) io.observe(hote.current);
    return () => io.disconnect();
  }, []);
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
    const monter = (r: Rendu) => {
      if (annule) { r.dispose(); return; }
      rendu.current = r; r.maj(etatRef.current); setPret(true);
    };
    if (vue === '3d') {
      import('../render/heart3d.ts').then((m) => monter(m.creerCoeur3D(el, opts))).catch(() => setErreur3D(true));
    } else if (vue === 'corps') monter(creerCorps2D(el, opts));
    else if (vue === 'vaisseau') monter(creerVaisseau2D(el, opts));
    else monter(creerCircuit2D(el, opts));
    return () => { annule = true; rendu.current?.dispose(); rendu.current = null; };
  }, [vue]);

  // Boucle d'animation unique.
  useEffect(() => {
    let raf = 0, last = performance.now(), dernierePhase: Phase | null = null;
    const boucle = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const i = horloge.current.avancer(dt);
      if (visible.current || captureRef.current) rendu.current?.frame(i, dt);
      if (captureRef.current) { const c = hote.current?.querySelector('canvas'); if (c) captureRef.current(c); }
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
    const r = rendu.current as Coeur3D | null;
    if (r && 'setCoupe' in r) r.setCoupe(coupe, coupePos);
  }, [coupe, coupePos, pret, vue]);
  useEffect(() => { const r = rendu.current as Coeur3D | null; if (pret && r && 'setOpacite' in r) r.setOpacite(opacite); }, [opacite, pret, vue]);
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
    // Cavités : coupe frontale. Valves et nœuds : pas de coupe, les parois autour deviennent transparentes.
    const POS: Partial<Record<ZoneId, number>> = { od: 0, vd: 0.55, og: -0.6, vg: 0.05 };
    if (POS[zone] !== undefined) { setCoupe('frontale'); setCoupePos(POS[zone]!); }
    else setCoupe('aucune');
  }, [zone, vue]);

  useEffect(() => { if (zone && SITE_DE_ZONE[zone]) setSite(SITE_DE_ZONE[zone]!); }, [zone]);
  useEffect(() => { const r = rendu.current as Vaisseau2D | null; if (pret && r && 'setSite' in r) r.setSite(site); }, [site, pret, vue]);

  /** Compose une image : fond, scène, légende et signature discrète. */
  const composer = (src: HTMLCanvasElement, dst: HTMLCanvasElement) => {
    const g = dst.getContext('2d')!;
    const w = dst.width, h = dst.height;
    const fond = g.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    fond.addColorStop(0, '#1b1630'); fond.addColorStop(0.55, '#0b0f1c'); fond.addColorStop(1, '#070a12');
    g.fillStyle = fond; g.fillRect(0, 0, w, h);
    g.drawImage(src, 0, 0, w, h);
    const u = Math.max(12, Math.round(w / 90));
    g.font = `600 ${u}px "Plus Jakarta Sans", system-ui`; g.textBaseline = 'alphabetic';
    if (legendeRef.current) { g.fillStyle = 'rgba(7,10,18,.65)'; const tw = g.measureText(legendeRef.current).width; g.fillRect(u * 0.8, u * 0.8, tw + u * 1.2, u * 1.9); g.fillStyle = '#e9eef8'; g.fillText(legendeRef.current, u * 1.4, u * 2.1); }
    // Signature discrète, en bas à droite.
    g.globalAlpha = 0.3; g.font = `500 ${Math.max(10, Math.round(u * 0.62))}px "Plus Jakarta Sans", system-ui`; g.textAlign = 'right';
    g.fillStyle = '#ffffff'; g.fillText('Hémodyssée · Dr O. Sow', w - u * 0.8, h - u * 0.7); g.textAlign = 'left'; g.globalAlpha = 1;
  };
  const nomFichier = (ext: string) => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `hemodyssee-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`; };
  const telecharger = (blob: Blob, nom: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };

  const photo = () => {
    captureRef.current = (src) => {
      captureRef.current = null;
      const dst = document.createElement('canvas'); dst.width = src.width; dst.height = src.height;
      composer(src, dst);
      dst.toBlob((b) => b && telecharger(b, nomFichier('png')), 'image/png');
    };
  };

  const video = () => {
    if (recorder.current) { recorder.current.stop(); return; }
    const src = hote.current?.querySelector('canvas'); if (!src) return;
    const k = Math.min(1, 1920 / src.width);
    const dst = document.createElement('canvas'); dst.width = Math.round(src.width * k / 2) * 2; dst.height = Math.round(src.height * k / 2) * 2;
    const flux = dst.captureStream(30);
    const audio = son.flux();
    audio?.getAudioTracks().forEach((t) => flux.addTrack(t));
    // MP4 H.264 en priorité (lu partout, WhatsApp compris) ; sinon WebM ; « video/mp4 » seul en dernier (Safari).
    const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    const type = types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
    if (!type) { alert('L\'enregistrement vidéo n\'est pas pris en charge par ce navigateur.'); return; }
    const rec = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 });
    const morceaux: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };
    rec.onstop = () => {
      captureRef.current = null; recorder.current = null; setEnreg(null);
      telecharger(new Blob(morceaux, { type: type.split(';')[0] }), nomFichier(type.includes('mp4') ? 'mp4' : 'webm'));
    };
    captureRef.current = (c) => composer(c, dst);
    rec.start(1000);
    recorder.current = rec;
    setEnreg({ debut: performance.now(), son: !!audio });
  };
  useEffect(() => {
    if (!enreg) return;
    const t = setInterval(() => {
      const s2 = (performance.now() - enreg.debut) / 1000; setDuree(s2);
      if (s2 >= 120) recorder.current?.stop();
    }, 250);
    return () => clearInterval(t);
  }, [enreg]);
  useEffect(() => () => recorder.current?.stop(), []);

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
      {enreg && (
        <div className="absolute top-14 left-3 flex items-center gap-2 rounded-full bg-alert/20 border border-alert/60 px-3 py-1 text-xs font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-alert animate-pulse" /> Enregistrement {Math.floor(duree / 60)}:{String(Math.floor(duree % 60)).padStart(2, '0')} · {enreg.son ? 'avec son' : 'sans son (activez le son en haut)'}
        </div>
      )}
      {nomSurvol && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/85 border border-line px-3 py-1 text-xs font-semibold pointer-events-none">{nomSurvol} · cliquer pour zoomer</div>
      )}

      {/* Outils 3D */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        <div className="flex gap-1.5">
          {vue === '3d' && <button onClick={() => setOutils((v) => !v)} className={`btn-icone ${outils ? 'actif' : ''}`} title="Coupe et transparence" aria-label="Outils de coupe et de transparence"><Scissors size={16} /></button>}
          <button onClick={photo} className="btn-icone" title="Exporter une photo" aria-label="Exporter une photo"><Camera size={16} /></button>
          <button onClick={video} className={`btn-icone ${enreg ? 'actif' : ''}`} title={enreg ? 'Arrêter l\'enregistrement' : 'Enregistrer une vidéo (avec le son s\'il est activé)'} aria-label="Enregistrer une vidéo">{enreg ? <Square size={14} /> : <Circle size={15} />}</button>
          <button onClick={() => setEtiquettes((v) => !v)} className={`btn-icone ${etiquettes ? 'actif' : ''}`} title="Étiquettes" aria-label="Afficher les étiquettes"><Tag size={16} /></button>
          <button onClick={() => { onZone(null); setCoupe('aucune'); const r = rendu.current as Coeur3D | null; if (r && 'vueInitiale' in r) r.vueInitiale(); else rendu.current?.focus(null); }} className="btn-icone" title="Vue d'ensemble" aria-label="Revenir à la vue d'ensemble"><RotateCcw size={16} /></button>
        </div>
        {vue === '3d' && pret && outils && (
          <div className="w-56 rounded-xl bg-ink/80 border border-line p-2.5 space-y-2 text-xs">
            <label className="flex items-center justify-between gap-2 text-muted cursor-pointer">
              <span className="flex items-center gap-1.5"><Scissors size={13} /> Ouvrir le cœur (coupe)</span>
              <input type="checkbox" checked={coupe !== 'aucune'} onChange={(e) => setCoupe(e.target.checked ? 'frontale' : 'aucune')} className="accent-[#e0414e] w-4 h-4" />
            </label>
            {coupe !== 'aucune' && <input type="range" min={-1.2} max={1.2} step={0.02} value={coupePos} onChange={(e) => setCoupePos(+e.target.value)} aria-label="Profondeur de la coupe" />}
            <div className="flex items-center gap-1.5 text-muted pt-1"><Layers size={13} /> Transparence</div>
            <input type="range" min={0.15} max={1} step={0.01} value={opacite} onChange={(e) => setOpacite(+e.target.value)} aria-label="Opacité des parois" />
          </div>
        )}
      </div>

      {vue === 'vaisseau' && pret && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 seg flex-wrap justify-center max-w-[95%]">
          {SITES.map((x) => <button key={x.id} className={site === x.id ? 'actif' : ''} onClick={() => setSite(x.id)}>{x.nom}</button>)}
        </div>
      )}

      {/* Signature discrète dans la scène */}
      <div className="absolute bottom-2 left-3 text-[9.5px] tracking-wide text-white/25 pointer-events-none select-none">Hémodyssée · Dr O. Sow</div>

      {/* Aide */}
      <div className="absolute bottom-3 right-3 text-[11px] text-dim pointer-events-none hidden lg:flex items-center gap-1.5">
        {vue === '3d' ? <><Box size={12} /> Glisser pour tourner · molette pour zoomer · clic sur une zone</> : vue === 'vaisseau' ? null : <><Eye size={12} /> Cliquez sur une zone pour zoomer</>}
      </div>
    </div>
  );
}
