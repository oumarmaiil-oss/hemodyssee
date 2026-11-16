/** Scène principale : cœur 3D ou voyage du sang 2D, animés par une horloge commune. */
import { useEffect, useRef, useState } from 'react';
import { Activity, Camera, Circle, Layers, Pause, Speech, Play, RotateCcw, Scissors, SkipBack, SkipForward, Square, Tag, X } from 'lucide-react';
import { Horloge, NOMS_PHASES, type Phase } from '../core/clock.ts';
import type { Son } from '../core/audio.ts';
import type { Etat, Niveau } from '../core/types.ts';
import { ZONES, type ZoneId } from '../content/zones.ts';
import type { Coeur3D, Coupe } from '../render/heart3d.ts';
import { creerCircuit2D, type Circuit2D } from '../render/circuit2d.ts';
import { creerCorps2D, type Corps2D } from '../render/corps2d.ts';
import { creerVaisseau2D, ETAPES_ATHERO, SITES, type Site, type Vaisseau2D } from '../render/vaisseau2d.ts';
import { creerTraces, type ModeTraces, type Traces } from '../render/traces.ts';

type Rendu = Coeur3D | Circuit2D | Corps2D | Vaisseau2D;
const SITE_DE_ZONE: Partial<Record<ZoneId, Site>> = { coronaires: 'coronaire', carotides: 'carotide', cerveau: 'carotide', membres: 'jambe', aorte: 'aorte', reins: 'arteriole', vg: 'coronaire' };

export type Vue = '3d' | 'coeur2d' | '2d' | 'corps' | 'vaisseau';

const ZONES_3D: ZoneId[] = ['od', 'vd', 'og', 'vg', 'valveTri', 'valvePu', 'valveMi', 'valveAo', 'noeudSinusal', 'noeudAV', 'aorte', 'artPulm', 'veinesCaves', 'veinesPulm', 'coronaires', 'carotides'];
export const zoneEn3D = (z: ZoneId) => ZONES_3D.includes(z);

/** Où chaque zone est visible. Sert à proposer la bonne vue au lieu de changer de vue tout seul. */
const ZONES_VUE: Record<Vue, ZoneId[]> = {
  '3d': ZONES_3D,
  coeur2d: ['od', 'vd', 'og', 'vg', 'valveTri', 'valvePu', 'valveMi', 'valveAo', 'noeudSinusal', 'noeudAV', 'aorte', 'artPulm', 'veinesPulm', 'coronaires'],
  '2d': ['od', 'vd', 'og', 'vg', 'valveTri', 'valvePu', 'valveMi', 'valveAo', 'noeudSinusal', 'noeudAV', 'aorte', 'artPulm', 'veinesCaves', 'veinesPulm', 'coronaires', 'poumons', 'cerveau', 'carotides', 'reins', 'membres'],
  corps: ['cerveau', 'carotides', 'vg', 'poumons', 'reins', 'aorte', 'membres', 'veinesCaves'],
  vaisseau: ['coronaires', 'carotides', 'cerveau', 'membres', 'aorte', 'reins'],
};
export const zoneDansVue = (z: ZoneId, v: Vue) => ZONES_VUE[v].includes(z);
export const NOMS_VUES: Record<Vue, string> = { '3d': 'Cœur 3D', coeur2d: 'Cœur 2D', '2d': 'Voyage', corps: 'Corps', vaisseau: 'Vaisseau' };
/** Meilleure vue pour une zone : le cœur pour ses structures, le corps pour les organes. */
export const vuePour = (z: ZoneId): Vue => (zoneEn3D(z) ? '3d' : zoneDansVue(z, 'corps') ? 'corps' : '2d');

const leger = typeof navigator !== 'undefined' && (
  (navigator.hardwareConcurrency ?? 8) <= 4
  || /[?&]leger/.test(location.search)
  || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900)
) && !/[?&]complet/.test(location.search);

interface Props {
  vue: Vue;
  etat: Etat;
  niveau: Niveau;
  zone: ZoneId | null;
  onZone: (z: ZoneId | null) => void;
  son: Son;
  ralenti: boolean;
  legende: string;
  onVue: (v: Vue) => void;
  onVoyage3D: () => void;
  tourActif: boolean;
  /** Lecture en cours (visite guidée ou effet du traitement dans le temps). */
  lecture: Lecture | null;
  onLecture: (a: 'prev' | 'next' | 'pause' | 'restart' | 'stop') => void;
  /** Signale qu'une démonstration propre à la scène (étapes de la plaque) est en cours. */
  onLectureLocale?: (on: boolean) => void;
  /** Vaisseau le plus parlant pour la maladie ouverte (artériole pour l'HTA, jambe pour l'artériopathie…). */
  sitePatho?: Site | null;
  /** Incrémenté pour lancer la démonstration des étapes de la plaque. */
  demandeEtapes?: number;
  peutRetour: boolean;
  onRetour: () => void;
}

export interface Lecture { titre: string; texte: string; detail?: string; index: number; total: number; pause: boolean }

export function Stage({ vue, etat, niveau, zone, onZone, son, ralenti, legende, onVue, onVoyage3D, tourActif, lecture: lectureApp, onLecture: onLectureApp, onLectureLocale, sitePatho, demandeEtapes = 0, peutRetour, onRetour }: Props) {
  const hote = useRef<HTMLDivElement>(null);
  const rendu = useRef<Rendu | null>(null);
  const [site, setSite] = useState<Site>('coronaire');
  const petitEcran = typeof window !== 'undefined' && window.innerWidth < 700;
  const [traces, setTraces] = useState<ModeTraces>(() => (petitEcran || niveau === 1 ? 'aucun' : 'ecg'));
  const avecTraces = vue === '3d' || vue === 'coeur2d' || vue === '2d';
  const cvTraces = useRef<HTMLCanvasElement>(null);
  const moteurTraces = useRef<Traces | null>(null);
  const horloge = useRef(new Horloge());
  const etatRef = useRef(etat);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const [survol, setSurvol] = useState<ZoneId | null>(null);
  // Le nom survolé disparaît quand on change de vue ou que le pointeur quitte la scène.
  useEffect(() => { setSurvol(null); }, [vue]);
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
  // Fichier prêt : sur téléphone (et dans les navigateurs intégrés), le téléchargement direct échoue souvent ;
  // on propose alors « Partager » (WhatsApp, Photos…) et « Enregistrer », deux gestes de l'utilisateur.
  const [fichier, setFichier] = useState<{ blob: Blob; nom: string; video: boolean } | null>(null);
  const tactile = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
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
    else monter(creerCircuit2D(el, { ...opts, coeur: vue === 'coeur2d' }));
    return () => { annule = true; rendu.current?.dispose(); rendu.current = null; };
  }, [vue]);

  // Boucle d'animation unique.
  useEffect(() => {
    let raf = 0, last = performance.now(), dernierePhase: Phase | null = null;
    const boucle = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const i = horloge.current.avancer(dt);
      if (visible.current || captureRef.current) rendu.current?.frame(i, dt);
      if (visible.current) moteurTraces.current?.frame(i, dt, etatRef.current);
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
    if (tourActif) return;
    // Cavités : coupe frontale. Valves et nœuds : pas de coupe, les parois autour deviennent transparentes.
    const POS: Partial<Record<ZoneId, number>> = { od: 0, vd: 0.55, og: -0.6, vg: 0.05 };
    if (POS[zone] !== undefined) { setCoupe('frontale'); setCoupePos(POS[zone]!); }
    else setCoupe('aucune');
  }, [zone, vue, tourActif]);

  useEffect(() => {
    if (!cvTraces.current) return;
    const t = creerTraces(cvTraces.current);
    moteurTraces.current = t;
    return () => { t.dispose(); moteurTraces.current = null; };
  }, [traces !== 'aucun' && avecTraces]);
  useEffect(() => { moteurTraces.current?.setMode(traces); }, [traces]);
  useEffect(() => { if (niveau === 1 && traces === 'tout') setTraces('ecg'); }, [niveau, traces]);
  useEffect(() => {
    if (!zone || !avecTraces) return;
    if (zone === 'noeudSinusal' || zone === 'noeudAV') setTraces((m) => (m === 'aucun' ? 'ecg' : m));
    else if (niveau >= 2 && ['valveMi', 'valveAo', 'vg', 'og'].includes(zone) && !petitEcran) setTraces('tout');
  }, [zone]);
  useEffect(() => { if (zone && SITE_DE_ZONE[zone]) setSite(SITE_DE_ZONE[zone]!); }, [zone]);
  // Déclaré après : quand une maladie est ouverte, son vaisseau l'emporte sur celui de la zone.
  useEffect(() => { if (sitePatho) setSite(sitePatho); }, [sitePatho]);
  // Pendant la visite guidée, la caméra se déplace lentement d'une étape à l'autre, sans à-coups.
  useEffect(() => {
    const r = rendu.current as Coeur3D | null;
    if (!pret || !r || !('setDureeTween' in r)) return;
    r.setDureeTween(tourActif ? 4.2 : 0.9);
    r.setInteraction(!tourActif);
  }, [tourActif, pret, vue]);
  // Pendant la visite, le cœur reste ouvert et à demi transparent : on voit le sang passer.
  useEffect(() => { if (vue !== '3d' || !tourActif) return; setCoupe('frontale'); setCoupePos(0.1); setOpacite(0.42); return () => setOpacite(1); }, [tourActif, vue]);
  useEffect(() => { const r = rendu.current as Vaisseau2D | null; if (pret && r && 'setSite' in r) r.setSite(site); }, [site, pret, vue]);

  // Démonstration « Étapes de la plaque » : 6 étapes dans le vaisseau, puis le caillot qui voyage dans le corps.
  const [ath, setAth] = useState<{ i: number; pause: boolean } | null>(null);
  const N_ATH = ETAPES_ATHERO.length + 1;
  const vueAth = (i: number): Vue => (i < ETAPES_ATHERO.length ? 'vaisseau' : 'corps');
  const allerAth = (i: number, pause?: boolean) => {
    setAth((a) => ({ i, pause: pause ?? a?.pause ?? false }));
    if (vueAth(i) !== vue) onVue(vueAth(i));
  };
  useEffect(() => {
    if (!ath || ath.pause || ath.i >= N_ATH - 1) return;
    const id = setTimeout(() => allerAth(ath.i + 1), 5200);
    return () => clearTimeout(id);
  }, [ath, vue]);
  // Un changement de vue fait à la main, ou une autre lecture, arrête la démonstration.
  useEffect(() => { if (ath && vue !== vueAth(ath.i)) setAth(null); }, [vue]);
  useEffect(() => { if (lectureApp) setAth(null); }, [lectureApp]);
  useEffect(() => { onLectureLocale?.(!!ath); }, [!!ath]);
  // Démarrage demandé depuis une fiche : on attend que la vue Vaisseau soit prête.
  const etapesEnAttente = useRef(0);
  useEffect(() => {
    if (demandeEtapes > etapesEnAttente.current && vue === 'vaisseau' && pret && !lectureApp) { etapesEnAttente.current = demandeEtapes; allerAth(0, false); }
  }, [demandeEtapes, vue, pret]);
  useEffect(() => {
    const r = rendu.current;
    if (!pret || !r) return;
    if ('setEtape' in r) r.setEtape(ath && ath.i < ETAPES_ATHERO.length ? ath.i : null);
    if ('embolie' in r) { const on = !!ath && ath.i === ETAPES_ATHERO.length; r.embolie(on); if (on) r.focus('carotides'); }
  }, [ath, pret, vue]);
  const lecture: Lecture | null = lectureApp ?? (ath ? {
    titre: 'Plaque d\'athérome',
    ...(ath.i < ETAPES_ATHERO.length
      ? { texte: `${ETAPES_ATHERO[ath.i].titre} : ${ETAPES_ATHERO[ath.i].texte}`, detail: ETAPES_ATHERO[ath.i].detail }
      : { texte: 'Le caillot voyage : un fragment parti d\'une plaque carotidienne bouche une artère du cerveau (AVC ischémique).', detail: 'Sur une plaque coronaire, le caillot provoque l\'infarctus ; dans une artère de jambe, l\'ischémie aiguë du membre.' }),
    index: ath.i, total: N_ATH, pause: ath.pause,
  } : null);
  // Voix off : lit chaque étape à voix haute (voix française de l'appareil, si elle existe).
  const voixDispo = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [voix, setVoix] = useState(() => { try { return localStorage.getItem('hemo.voix') === '1'; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem('hemo.voix', voix ? '1' : '0'); } catch { /* stockage indisponible */ } }, [voix]);
  const texteLu = lecture && !lecture.pause ? lecture.texte : null;
  useEffect(() => {
    if (!voixDispo) return;
    speechSynthesis.cancel();
    if (!voix || !texteLu) return;
    const u = new SpeechSynthesisUtterance(texteLu.replace(/®/g, ''));
    u.lang = 'fr-FR'; u.rate = 1.02;
    const fr = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('fr'));
    if (fr) u.voice = fr;
    speechSynthesis.speak(u);
  }, [voix, texteLu]);
  useEffect(() => () => { if (voixDispo) speechSynthesis.cancel(); }, []);

  const onLecture = (a: 'prev' | 'next' | 'pause' | 'restart' | 'stop') => {
    if (lectureApp || !ath) { onLectureApp(a); return; }
    if (a === 'prev') allerAth(Math.max(0, ath.i - 1));
    else if (a === 'next') allerAth(Math.min(N_ATH - 1, ath.i + 1));
    else if (a === 'pause') setAth({ ...ath, pause: !ath.pause });
    else if (a === 'restart') allerAth(0, false);
    else { setAth(null); if (vue !== 'vaisseau') onVue('vaisseau'); }
  };

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
  const telecharger = (blob: Blob, nom: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); };
  const peutPartager = (f: File) => { try { return !!navigator.canShare?.({ files: [f] }); } catch { return false; } };
  const partager = async () => {
    if (!fichier) return;
    const f = new File([fichier.blob], fichier.nom, { type: fichier.blob.type });
    try { await navigator.share({ files: [f], title: 'Hémodyssée' }); } catch { /* partage annulé */ }
  };

  // Export en haute définition : la scène est redessinée plus finement le temps de la capture.
  const definir = (on: boolean) => {
    const r = rendu.current as { setDefinition?: (pr: number | null) => void } | null;
    const w = hote.current?.clientWidth || 800;
    r?.setDefinition?.(on ? Math.min(2.5, Math.max(window.devicePixelRatio || 1, 1600 / w)) : null);
  };
  const photo = () => {
    definir(true);
    captureRef.current = (src) => {
      captureRef.current = null;
      setTimeout(() => definir(false), 0);
      const dst = document.createElement('canvas'); dst.width = src.width; dst.height = src.height;
      composer(src, dst);
      dst.toBlob((b) => { if (!b) return; if (tactile) setFichier({ blob: b, nom: nomFichier('png'), video: false }); else telecharger(b, nomFichier('png')); }, 'image/png');
    };
  };

  const video = () => {
    if (recorder.current) { recorder.current.stop(); return; }
    definir(true);
    const src = hote.current?.querySelector('canvas'); if (!src) return;
    const k = Math.min(1, 1920 / src.width);
    const dst = document.createElement('canvas'); dst.width = Math.round(src.width * k / 2) * 2; dst.height = Math.round(src.height * k / 2) * 2;
    const flux = dst.captureStream(30);
    const audio = son.flux();
    audio?.getAudioTracks().forEach((t) => flux.addTrack(t));
    // MP4 H.264 en priorité (lu partout, WhatsApp compris) ; sinon WebM ; « video/mp4 » seul en dernier (Safari).
    const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    const type = types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
    if (!type) { alert('L\'enregistrement vidéo n\'est pas pris en charge par ce navigateur.'); return; }
    const rec = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 });
    const morceaux: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };
    rec.onstop = () => {
      captureRef.current = null; recorder.current = null; setEnreg(null); definir(false);
      const blob = new Blob(morceaux, { type: type.split(';')[0] }), nom = nomFichier(type.includes('mp4') ? 'mp4' : 'webm');
      if (!blob.size) { alert('La vidéo est vide : la scène n\'a pas pu être filmée. Réessayez en laissant la scène visible.'); return; }
      setFichier({ blob, nom, video: true });
      if (!tactile) telecharger(blob, nom);
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
      {/* Sur téléphone, la scène s'arrête au-dessus du bandeau de lecture : rien n'est caché dessous. */}
      <div ref={hote} onPointerLeave={() => setSurvol(null)} className={`absolute inset-x-0 top-0 ${lecture ? 'bottom-[92px] lg:bottom-0' : 'bottom-0'}`} />
      {!pret && !erreur3D && <div className="absolute inset-0 grid place-items-center text-muted text-sm">Préparation de la scène…</div>}
      {erreur3D && <div className="absolute inset-0 grid place-items-center text-center p-6 text-muted text-sm">La 3D n'est pas disponible sur cet appareil.<br />Utilisez la vue 2D.</div>}

      {/* Phase du cycle */}
      {niveau >= 2 && (
        <div className="absolute bottom-2.5 left-2 lg:bottom-auto lg:top-14 flex items-center gap-1.5 rounded-full bg-ink/75 border border-line px-2 py-0.5 text-[10.5px] lg:text-xs text-muted pointer-events-none max-w-[38%] lg:max-w-[60%] truncate">
          <span className="w-2 h-2 rounded-full bg-sang animate-pulse" />
          <span ref={phaseRef}>—</span>
        </div>
      )}
      {fichier && (
        <div className="absolute z-30 left-1/2 -translate-x-1/2 bottom-3 w-[min(94%,420px)] rounded-2xl border border-ok/40 bg-ink/95 p-3 shadow-xl fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold">{fichier.video ? 'Vidéo prête' : 'Image prête'} <span className="text-dim font-normal">· {(fichier.blob.size / 1e6).toFixed(1)} Mo{fichier.nom.endsWith('webm') ? ' · WebM' : ''}</span></div>
            <button onClick={() => setFichier(null)} className="btn-icone w-7 h-7" aria-label="Fermer"><X size={13} /></button>
          </div>
          <div className="flex gap-2 mt-2">
            {peutPartager(new File([fichier.blob], fichier.nom, { type: fichier.blob.type })) && <button onClick={partager} className="flex-1 rounded-lg bg-ok text-ink font-bold text-[13px] py-2">Partager</button>}
            <button onClick={() => telecharger(fichier.blob, fichier.nom)} className="flex-1 rounded-lg bg-card2 border border-line font-semibold text-[13px] py-2">{tactile ? 'Enregistrer' : 'Télécharger à nouveau'}</button>
          </div>
          {fichier.nom.endsWith('webm') && <p className="text-[11px] text-dim mt-1.5">Ce navigateur enregistre en WebM : pour WhatsApp, préférez Chrome récent ou Safari (MP4).</p>}
        </div>
      )}
      {enreg && (
        <div className="absolute top-12 left-2 flex items-center gap-2 rounded-full bg-alert/20 border border-alert/60 px-3 py-1 text-xs font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-alert animate-pulse" /> Enregistrement {Math.floor(duree / 60)}:{String(Math.floor(duree % 60)).padStart(2, '0')} · {enreg.son ? 'avec son' : 'sans son (activez le son en haut)'}
        </div>
      )}
      {zone && !zoneDansVue(zone, vue) && !nomSurvol && !lecture && (
        <div className="absolute top-12 lg:top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-ink/90 border border-accent/40 px-3 py-1 text-xs">
          <span className="text-muted">{ZONES[zone].nom} se voit dans la vue</span>
          <button onClick={() => onVue(vuePour(zone))} className="font-semibold text-accent">{NOMS_VUES[vuePour(zone)]} →</button>
        </div>
      )}
      {nomSurvol && (
        <div className="absolute top-12 lg:top-14 left-1/2 -translate-x-1/2 rounded-full bg-ink/85 border border-line px-3 py-1 text-xs font-semibold pointer-events-none">{nomSurvol} · cliquer pour zoomer</div>
      )}

      {/* Barre d'outils : une seule ligne, qui défile horizontalement sur téléphone */}
      <div className="absolute z-20 top-2 left-2 right-2 flex gap-1.5 overflow-x-auto scroll-thin lg:justify-end lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {(vue === '3d' || vue === 'coeur2d') && (
          <div className="seg shrink-0">
            <button className={vue === 'coeur2d' ? 'actif' : ''} onClick={() => onVue('coeur2d')}>2D</button>
            <button className={vue === '3d' ? 'actif' : ''} onClick={() => onVue('3d')}>3D</button>
          </div>
        )}
        {vue === '3d' && !tourActif && (
          <button onClick={() => setOutils((v) => !v)} className={`btn-outil shrink-0 ${outils ? 'actif' : ''}`} aria-label="Ouvrir le cœur et régler la transparence"><Scissors size={14} /> Ouvrir</button>
        )}
        {peutRetour && <button onClick={onRetour} className="btn-outil shrink-0" aria-label="Revenir à la zone précédente">← Retour</button>}
        {avecTraces && <button onClick={() => setTraces((m) => (m === 'aucun' ? 'ecg' : m === 'ecg' && niveau >= 2 ? 'tout' : 'aucun'))} className={`btn-outil shrink-0 ${traces !== 'aucun' ? 'actif' : ''}`} aria-label="Afficher l'ECG et les pressions"><Activity size={14} /> {traces === 'tout' ? 'ECG + pressions' : 'ECG'}</button>}
        <button onClick={() => setEtiquettes((v) => !v)} className={`btn-outil shrink-0 ${etiquettes ? 'actif' : ''}`} aria-label="Afficher les noms des structures"><Tag size={14} /> Noms</button>
        <button onClick={photo} className="btn-outil shrink-0" aria-label="Exporter une photo"><Camera size={14} /> Photo</button>
        <button onClick={video} className={`btn-outil shrink-0 ${enreg ? 'actif' : ''}`} aria-label="Enregistrer une vidéo">{enreg ? <Square size={13} /> : <Circle size={14} />} {enreg ? 'Stop' : 'Vidéo'}</button>
        <button onClick={() => { onZone(null); setCoupe('aucune'); const r = rendu.current as Coeur3D | null; if (r && 'vueInitiale' in r) r.vueInitiale(); else rendu.current?.focus(null); }} className="btn-outil shrink-0" aria-label="Revenir à la vue d'ensemble"><RotateCcw size={14} /> Tout voir</button>
      </div>
      {vue === '3d' && pret && outils && !tourActif && (
        <div className="absolute z-20 top-12 right-2 w-52 rounded-xl bg-ink/90 border border-line p-2.5 space-y-2 text-xs fade-in">
          <label className="flex items-center justify-between gap-2 text-muted cursor-pointer">
            <span className="flex items-center gap-1.5"><Scissors size={13} /> Couper le cœur en deux</span>
            <input type="checkbox" checked={coupe !== 'aucune'} onChange={(e) => setCoupe(e.target.checked ? 'frontale' : 'aucune')} className="accent-[#e0414e] w-4 h-4" />
          </label>
          {coupe !== 'aucune' && <input type="range" min={-1.2} max={1.2} step={0.02} value={coupePos} onChange={(e) => setCoupePos(+e.target.value)} aria-label="Profondeur de la coupe" />}
          <div className="flex items-center gap-1.5 text-muted pt-1"><Layers size={13} /> Transparence</div>
          <input type="range" min={0.15} max={1} step={0.01} value={opacite} onChange={(e) => setOpacite(+e.target.value)} aria-label="Opacité des parois" />
        </div>
      )}

      {vue === 'vaisseau' && pret && !lecture && (
        <button onClick={() => allerAth(0, false)} className="absolute z-20 top-12 right-2 rounded-full bg-sang hover:brightness-110 text-white text-[12px] font-bold pl-2.5 pr-3.5 py-1.5 inline-flex items-center gap-1.5 shadow-[0_4px_18px_rgba(224,65,78,.45)]">
          <Play size={13} fill="currentColor" /> Étapes de la plaque
        </button>
      )}
      {vue === 'vaisseau' && pret && !lecture && (
        <div className="absolute bottom-7 lg:bottom-3 left-1/2 -translate-x-1/2 seg flex-wrap justify-center max-w-[95%] text-[11px]">
          {SITES.map((x) => <button key={x.id} className={site === x.id ? 'actif' : ''} onClick={() => setSite(x.id)}>{x.nom}</button>)}
        </div>
      )}

      {/* Visite guidée du voyage du sang */}
      {lecture ? (
        <div className="absolute z-20 bottom-2 left-1/2 -translate-x-1/2 w-[96%] max-w-lg rounded-2xl bg-ink/92 border border-sang/50 overflow-hidden fade-in" role="status" aria-live="polite">
          <div className="flex gap-0.5 p-0.5">
            {Array.from({ length: lecture.total }, (_, k) => (
              <div key={k} className="h-1 flex-1 rounded-full bg-card2 overflow-hidden"><div className={`h-full bg-sang ${k < lecture.index ? 'w-full' : k === lecture.index ? (lecture.pause ? 'w-1/2' : 'w-full transition-[width] duration-[4000ms] ease-linear') : 'w-0'}`} key={`${k}-${lecture.index}`} /></div>
            ))}
          </div>
          <div className="px-2.5 pb-1.5 pt-0.5 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${lecture.pause ? 'bg-muted' : 'bg-sang animate-pulse'}`} />
            <div className="min-w-0 flex-1">
              <div className="text-[9.5px] uppercase tracking-wider text-dim truncate">{lecture.pause ? 'En pause' : 'Lecture en cours'} · {lecture.titre} · {lecture.index + 1}/{lecture.total}</div>
              <div className="text-[12.5px] font-semibold leading-tight">{lecture.texte}</div>
              {lecture.detail && <div className="text-[11px] text-muted leading-tight mt-0.5 truncate sm:whitespace-normal">{lecture.detail}</div>}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => onLecture('prev')} disabled={lecture.index === 0} className="btn-icone w-8 h-8 disabled:opacity-35" aria-label="Étape précédente"><SkipBack size={14} /></button>
              <button onClick={() => onLecture('pause')} className="btn-icone w-8 h-8" aria-label={lecture.pause ? 'Reprendre' : 'Mettre en pause'}>{lecture.pause ? <Play size={14} fill="currentColor" /> : <Pause size={14} />}</button>
              <button onClick={() => onLecture('next')} disabled={lecture.index >= lecture.total - 1} className="btn-icone w-8 h-8 disabled:opacity-35" aria-label="Étape suivante"><SkipForward size={14} /></button>
              <button onClick={() => onLecture('restart')} className="btn-icone w-8 h-8 hidden sm:grid" aria-label="Revoir depuis le début"><RotateCcw size={14} /></button>
              {voixDispo && <button onClick={() => setVoix((v) => !v)} className={`btn-icone w-8 h-8 ${voix ? 'text-ok border-ok/50' : ''}`} aria-label={voix ? 'Couper la voix off' : 'Activer la voix off'} title="Voix off"><Speech size={14} /></button>}
              <button onClick={() => onLecture('stop')} className="btn-icone w-8 h-8" aria-label="Arrêter la lecture"><X size={14} /></button>
            </div>
          </div>
        </div>
      ) : (vue === '3d' || vue === '2d') && pret && (
        <button onClick={onVoyage3D} className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-sang hover:brightness-110 text-white text-[12px] font-bold pl-2.5 pr-3.5 py-1.5 inline-flex items-center gap-1.5 shadow-[0_4px_18px_rgba(224,65,78,.45)]">
          <Play size={13} fill="currentColor" /> Voir le voyage du sang
        </button>
      )}

      {/* Tracés : ECG, et les pressions au besoin */}
      {traces !== 'aucun' && avecTraces && (
        <canvas ref={cvTraces} className={`absolute left-0 right-0 ${lecture ? 'bottom-[74px]' : 'bottom-10'} w-full ${traces === 'tout' ? 'h-[124px]' : 'h-[58px]'} pointer-events-none bg-gradient-to-b from-ink/30 to-ink/75`} />
      )}

      {/* Signature discrète dans la scène */}
      <div className="absolute bottom-0.5 right-2 text-[9px] tracking-wide text-white/25 pointer-events-none select-none">Hémodyssée · Dr O. Sow</div>

    </div>
  );
}
