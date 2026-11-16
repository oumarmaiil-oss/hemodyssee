/** Application Hémodyssée : état global, mise en page, en-tête et accueil. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, BookOpen, Briefcase, Compass, Download, HeartPulse, Map, Play, RefreshCw, Share2, Snail, TrendingUp, Volume2, VolumeX, X } from 'lucide-react';
import { IconeContact, partagerApp, Signalement, WHATSAPP, WHATSAPP_AFFICHE } from './Signalement.tsx';
import { calculer, fractionAu, evoluer, TERRAIN_NORMAL } from '../core/engine.ts';
import { Son } from '../core/audio.ts';
import type { ClasseId, Niveau, Traitement } from '../core/types.ts';
import type { ZoneId } from '../content/zones.ts';
import { construireTerrain, PATHO_PAR_ID, type PathoActive } from '../content/pathologies.ts';
import { CLASSE_PAR_ID } from '../content/classes.ts';
import { Stage, zoneEn3D, type Vue } from './Stage.tsx';
import type { Site } from '../render/vaisseau2d.ts';
import { PRESENTATION_PAR_ID } from '../content/presentations.ts';

/** Vaisseau où la maladie se voit le mieux (vue Vaisseau). */
const SITE_PATHO: Record<string, Site> = {
  hta: 'arteriole', htaSys: 'aorte', hvg: 'arteriole', irc: 'arteriole',
  dyslip: 'coronaire', angor: 'coronaire', idm: 'coronaire', athero: 'carotide', avc: 'carotide', aomi: 'jambe', diabete: 'jambe',
};
import { Moniteur } from './widgets.tsx';
import { DETAILS_VISITE, PanneauEvolution, PanneauExplorer, PanneauMaladies, VOYAGE, type VueEvolution } from './panels.tsx';

type Onglet = 'explorer' | 'maladies' | 'evolution';

const PHASES = [
  { mois: 0, nom: 'Avant le traitement' }, { mois: 1, nom: '1 mois de traitement' }, { mois: 6, nom: '6 mois de traitement' },
  { mois: 12, nom: '1 an de traitement' }, { mois: 36, nom: '3 ans de traitement' }, { mois: 60, nom: '5 ans de traitement' },
];

const TOUR = VOYAGE.filter((v) => zoneEn3D(v.z));

const lire = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const ecrire = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };

const NIVEAUX: { n: Niveau; nom: string; pour: string; icone: typeof Compass }[] = [
  { n: 1, nom: 'Découvrir', pour: 'Patients, curieux, lycéens : des mots simples, des images, l\'essentiel.', icone: Compass },
  { n: 2, nom: 'Comprendre', pour: 'Étudiants, délégués médicaux, préparateurs : les mécanismes et les chiffres clés.', icone: BookOpen },
  { n: 3, nom: 'Approfondir', pour: 'Médecins, pharmaciens, internes : pressions, physiopathologie détaillée, toutes les maladies.', icone: HeartPulse },
];

export default function App() {
  const [niveau, setNiveau] = useState<Niveau>(() => (Number(lire('hemo.niveau')) as Niveau) || 2);
  const [accueil, setAccueil] = useState(() => !lire('hemo.niveau'));
  const [vue, setVue] = useState<Vue>('3d');
  const [onglet, setOnglet] = useState<Onglet>('explorer');
  const [zone, setZone] = useState<ZoneId | null>(null);
  const [actives, setActives] = useState<PathoActive[]>([]);
  const [focusPatho, setFocusPatho] = useState<string | null>(null);
  const [lectLoc, setLectLoc] = useState(false);
  const [demandeEtapes, setDemandeEtapes] = useState(0);
  const [traitement, setTraitement] = useState<Traitement>({});
  const [vueEvo, setVueEvo] = useState<VueEvolution | null>(null);
  const [sonOn, setSonOn] = useState(false);
  const [ralenti, setRalenti] = useState(false);
  const [labo, setLabo] = useState(() => /[?&]labo/.test(location.search) || lire('hemo.labo') === '1');
  const son = useRef(new Son()).current;
  const [signaler, setSignaler] = useState(false);
  const [maj, setMaj] = useState(false);
  const [installer, setInstaller] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  useEffect(() => {
    const surMaj = () => setMaj(true);
    const surInstall = (e: Event) => { e.preventDefault(); setInstaller(e as Event & { prompt: () => Promise<void> }); };
    window.addEventListener('hemo-maj', surMaj);
    window.addEventListener('beforeinstallprompt', surInstall);
    window.addEventListener('appinstalled', () => setInstaller(null));
    return () => { window.removeEventListener('hemo-maj', surMaj); window.removeEventListener('beforeinstallprompt', surInstall); };
  }, []);

  useEffect(() => { ecrire('hemo.labo', labo ? '1' : '0'); }, [labo]);

  const terrain = useMemo(() => construireTerrain(TERRAIN_NORMAL, actives), [actives]);
  const etatSans = useMemo(() => calculer(terrain, {}), [terrain]);
  const etatAuj = useMemo(() => calculer(terrain, traitement), [terrain, traitement]);
  const etatScene = useMemo(() => {
    if (!vueEvo) return etatAuj;
    const { terrains } = evoluer(terrain, traitement, vueEvo.scenario, vueEvo.arret);
    const f = fractionAu(vueEvo.mois, vueEvo.scenario, vueEvo.arret);
    return calculer(terrains[vueEvo.mois], traitement, { fraction: f });
  }, [vueEvo, etatAuj, terrain, traitement]);

  const etatSansMois = useMemo(() => {
    if (!vueEvo) return null;
    const { terrains } = evoluer(terrain, traitement, 'sans');
    return calculer(terrains[vueEvo.mois], {}, {});
  }, [vueEvo, terrain, traitement]);
  const legende = [
    actives.map((a) => PATHO_PAR_ID[a.id].court).join(' + ') || 'Sujet sain',
    Object.keys(traitement).length ? 'Traitement : ' + (Object.keys(traitement) as ClasseId[]).map((c) => CLASSE_PAR_ID[c].court).join(', ') : '',
    `PA ${etatScene.pas}/${etatScene.pad}`,
  ].filter(Boolean).join(' · ');
  // Visite guidée : la caméra suit le sang étape par étape dans le cœur en 3D.
  const [tour, setTour] = useState<number | null>(null);
  const [tourPause, setTourPause] = useState(false);
  useEffect(() => {
    if (tour === null) return;
    setZone(TOUR[tour].z);
    if (tourPause) return;
    const t = setTimeout(() => setTour((k) => (k === null || k >= TOUR.length - 1 ? null : k + 1)), 5200);
    return () => clearTimeout(t);
  }, [tour, tourPause]);
  useEffect(() => { if (vue !== '3d') setTour(null); }, [vue]);
  useEffect(() => { if (tour === null) setTourPause(false); }, [tour]);

  // Effet du traitement dans le temps : la scène rejoue le patient avant, puis à 1 mois, 6 mois, 1 an, 3 ans, 5 ans.
  const [seq, setSeq] = useState<number | null>(null);
  const [seqPause, setSeqPause] = useState(false);
  useEffect(() => {
    if (seq === null) return;
    setVueEvo({ scenario: 'avec', mois: PHASES[seq].mois, arret: 24 });
    if (seqPause) return;
    const t = setTimeout(() => setSeq((k) => (k === null || k >= PHASES.length - 1 ? null : k + 1)), 2600);
    return () => clearTimeout(t);
  }, [seq, seqPause]);
  useEffect(() => { if (seq === null) setSeqPause(false); }, [seq]);
  // Présentations guidées (délégué, enseignant) : la scène s'enchaîne seule ; à l'arrêt, on retrouve l'état d'avant.
  const [pres, setPres] = useState<{ id: string; i: number; pause: boolean } | null>(null);
  const avantPres = useRef<{ actives: PathoActive[]; traitement: Traitement; vue: Vue; zone: ZoneId | null; vueEvo: VueEvolution | null } | null>(null);
  const etapePres = pres ? PRESENTATION_PAR_ID[pres.id].etapes[pres.i] : null;
  const lancerPresentation = (id: string) => {
    if (!pres) avantPres.current = { actives, traitement, vue, zone, vueEvo };
    setTour(null); setSeq(null); setFocusPatho(null); setPres({ id, i: 0, pause: false });
  };
  const arreterPresentation = () => {
    const a = avantPres.current; setPres(null); avantPres.current = null;
    if (a) { setActives(a.actives); setTraitement(a.traitement); setVue(a.vue); setZone(a.zone); setVueEvo(a.vueEvo); }
  };
  useEffect(() => {
    if (!pres || !etapePres) return;
    setActives(etapePres.actives); setTraitement(etapePres.traitement);
    setVueEvo(etapePres.evo ? { scenario: etapePres.evo.scenario, mois: etapePres.evo.mois, arret: 24 } : null);
    setVue(etapePres.vue); setZone(etapePres.zone ?? null);
  }, [pres?.id, pres?.i]);
  useEffect(() => {
    if (!pres || pres.pause || !etapePres) return;
    const n = PRESENTATION_PAR_ID[pres.id].etapes.length;
    if (pres.i >= n - 1) return;
    const t = setTimeout(() => setPres((p) => (p ? { ...p, i: Math.min(n - 1, p.i + 1) } : p)), etapePres.duree ?? 6500);
    return () => clearTimeout(t);
  }, [pres]);
  // Un changement de vue fait à la main met fin à la présentation (sans revenir en arrière).
  useEffect(() => { if (pres && etapePres && vue !== etapePres.vue) { setPres(null); avantPres.current = null; } }, [vue]);

  const lancerSequence = () => { setTour(null); setPres(null); setSeq(0); };
  const comparer = () => { setSeq(null); setVueEvo({ scenario: 'sans', mois: 12, arret: 24 }); };

  // Historique des zones visitées, pour le bouton « Retour ».
  const [histo, setHisto] = useState<ZoneId[]>([]);
  // Le bouton « Cœur » se souvient du dernier mode (2D ou 3D).
  const [modeCoeur, setModeCoeur] = useState<'3d' | 'coeur2d'>('3d');
  useEffect(() => { if (vue === '3d' || vue === 'coeur2d') setModeCoeur(vue); }, [vue]);
  const choisirNiveau = (n: Niveau) => { setNiveau(n); ecrire('hemo.niveau', String(n)); setAccueil(false); };
  // Quand une maladie est ajoutée, la scène va directement sur la zone atteinte.
  const ZONE_LESION: Record<string, ZoneId> = { hta: 'aorte', htaSys: 'aorte', dyslip: 'coronaires', athero: 'carotides', aomi: 'membres', angor: 'coronaires', idm: 'coronaires', hvg: 'vg', icfer: 'vg', icfep: 'vg', oap: 'poumons', ra: 'valveAo', ia: 'valveAo', rm: 'valveMi', im: 'valveMi', it: 'valveTri', fa: 'og', bav: 'noeudAV', avc: 'cerveau', irc: 'reins', diabete: 'reins' };
  const togglePatho = (id: string) => {
    if (!actives.some((x) => x.id === id)) {
      const z = ZONE_LESION[id];
      // On va sur la zone atteinte, sans changer de vue : si elle ne s'y voit pas, la scène propose la bonne vue.
      if (z) setZone(z);
    }
    setActives((a) => {
      if (a.some((x) => x.id === id)) return a.filter((x) => x.id !== id);
      // Un seul trouble du rythme à la fois.
      const sansConflit = ['fa', 'bav'].includes(id) ? a.filter((x) => !['fa', 'bav'].includes(x.id)) : a;
      return [...sansConflit, { id, s: 0.7 }];
    });
    setVueEvo(null);
  };
  const onDose = (c: ClasseId, d: number) => { setTraitement((t) => { const n = { ...t }; if (d) n[c] = d; else delete n[c]; return n; }); };
  const onZone = (z: ZoneId | null) => {
    if (zone && z !== zone) setHisto((h) => [...h.slice(-19), zone]);
    setZone(z); if (z) setOnglet('explorer');
  };
  const retour = () => { setHisto((h) => { const p = h[h.length - 1] ?? null; setZone(p); return h.slice(0, -1); }); };
  const basculerSon = () => {
    if (sonOn) { son.couper(); setSonOn(false); }
    else if (son.activer()) setSonOn(true);
  };

  const ONGLETS: { id: Onglet; nom: string; icone: typeof Map; badge?: number }[] = [
    { id: 'explorer', nom: 'Explorer', icone: Map },
    { id: 'maladies', nom: 'Maladies et traitements', icone: HeartPulse, badge: actives.length || undefined },
    { id: 'evolution', nom: 'Évolution', icone: TrendingUp },
  ];

  return (
    <div className="h-[100dvh] lg:h-auto lg:min-h-full flex flex-col overflow-hidden lg:overflow-visible">
      {/* En-tête */}
      <header className="sticky top-0 z-30 bg-ink/90 backdrop-blur border-b border-line">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 h-12 lg:h-14 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-sang to-[#7a1424] grid place-items-center shadow-[0_0_18px_rgba(224,65,78,.45)]"><HeartPulse size={16} /></span>
            <div className="leading-tight min-w-0">
              <div className="font-display text-[17px] sm:text-[19px] font-bold">Hémodyssée</div>
              <div className="text-[10.5px] text-dim hidden md:block">Le voyage du sang, du cœur aux organes</div>
            </div>
          </div>
          <div className="seg ml-auto hidden lg:inline-flex" role="group" aria-label="Niveau">
            {NIVEAUX.map((x) => <button key={x.n} className={niveau === x.n ? 'actif' : ''} onClick={() => choisirNiveau(x.n)}>{x.nom}</button>)}
          </div>

          <div className="seg hidden lg:inline-flex" role="group" aria-label="Vue">
            <button className={vue === '3d' || vue === 'coeur2d' ? 'actif' : ''} onClick={() => setVue(modeCoeur)} title="Le cœur en 2D et en 3D"><Box size={14} className="inline -mt-0.5 hidden md:inline" /> Cœur</button>
            <button className={vue === '2d' ? 'actif' : ''} onClick={() => setVue('2d')}>Voyage</button>
            <button className={vue === 'corps' ? 'actif' : ''} onClick={() => setVue('corps')}>Corps</button>
            <button className={vue === 'vaisseau' ? 'actif' : ''} onClick={() => setVue('vaisseau')}>Vaisseau</button>
          </div>
          <button onClick={basculerSon} className={`btn-icone ml-auto lg:ml-0 ${sonOn ? 'actif' : ''}`} title="Bruits du cœur" aria-label="Activer les bruits du cœur">{sonOn ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
          <button onClick={() => setRalenti((v) => !v)} className={`btn-icone hidden sm:grid ${ralenti ? 'actif' : ''}`} title="Ralenti" aria-label="Ralenti"><Snail size={16} /></button>
          <button onClick={() => setLabo((v) => !v)} className={`btn-icone ${labo ? 'actif' : ''}`} title="Mode labo (gamme commerciale)" aria-label="Mode labo"><Briefcase size={16} /></button>
          {installer && <button onClick={() => { void installer.prompt(); setInstaller(null); }} className="btn-icone actif" title="Installer l'application" aria-label="Installer l'application"><Download size={16} /></button>}
          <button onClick={() => void partagerApp()} className="btn-icone" title="Partager l'application" aria-label="Partager l'application"><Share2 size={16} /></button>
          <button onClick={() => setSignaler(true)} className="btn-icone !text-[#25d366] !border-[#25d366]/40 !bg-[#25d366]/10" title="Contacter l'auteur, signaler un problème ou suggérer" aria-label="Contacter ou signaler"><IconeContact size={17} /></button>
        </div>
        <div className="lg:hidden px-2 pb-1.5 grid sm:grid-cols-2 gap-1.5">
          <div className="seg w-full justify-between">{NIVEAUX.map((x) => <button key={x.n} className={`flex-1 ${niveau === x.n ? 'actif' : ''}`} onClick={() => choisirNiveau(x.n)}>{x.nom}</button>)}</div>
          <div className="seg w-full justify-between [&>button]:flex-1" role="group" aria-label="Vue">
            <button className={vue === '3d' || vue === 'coeur2d' ? 'actif' : ''} onClick={() => setVue(modeCoeur)} title="Le cœur en 2D et en 3D"><Box size={14} className="inline -mt-0.5 hidden md:inline" /> Cœur</button>
            <button className={vue === '2d' ? 'actif' : ''} onClick={() => setVue('2d')}>Voyage</button>
            <button className={vue === 'corps' ? 'actif' : ''} onClick={() => setVue('corps')}>Corps</button>
            <button className={vue === 'vaisseau' ? 'actif' : ''} onClick={() => setVue('vaisseau')}>Vaisseau</button>
          </div>
        </div>
      </header>

      {/* Corps */}
      <main className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto p-2 sm:p-4 grid gap-2 lg:gap-3 grid-rows-[auto_minmax(0,1fr)] grid-cols-[minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex flex-col gap-2 lg:gap-3 min-w-0">
          <div className={`${tour !== null || seq !== null || pres || lectLoc ? 'h-[50dvh]' : 'h-[34dvh]'} transition-[height] duration-300 min-h-[220px] lg:min-h-[480px] ${vueEvo && seq === null ? 'lg:h-[calc(100vh-246px)]' : 'lg:h-[calc(100vh-190px)]'}`}>
            <Stage vue={vue} etat={etatScene} niveau={niveau} zone={zone} onZone={onZone} son={son} ralenti={ralenti} legende={legende} onVue={setVue}
              onVoyage3D={() => { setSeq(null); setPres(null); setVue('3d'); setTourPause(false); setTour(0); }}
              tourActif={tour !== null}
              lecture={tour !== null ? { titre: 'Voyage du sang', texte: TOUR[tour].etape, detail: DETAILS_VISITE[TOUR[tour].z]?.[niveau === 1 ? 0 : 1], index: tour, total: TOUR.length, pause: tourPause }
                : pres && etapePres ? { titre: PRESENTATION_PAR_ID[pres.id].titre, texte: etapePres.texte(labo), detail: etapePres.detail?.(etatScene, etatSansMois ?? etatSans, labo), index: pres.i, total: PRESENTATION_PAR_ID[pres.id].etapes.length, pause: pres.pause }
                : seq !== null ? { titre: 'Effet du traitement', texte: PHASES[seq].nom, detail: `PA ${etatScene.pas}/${etatScene.pad} · LDL ${etatScene.ldl.toFixed(1)} · risque d'AVC ×${etatScene.risques.avc.toFixed(1)}`, index: seq, total: PHASES.length, pause: seqPause } : null}
              onLectureLocale={setLectLoc}
              sitePatho={etapePres?.site ?? (focusPatho ? SITE_PATHO[focusPatho] ?? null : null)}
              demandeEtapes={demandeEtapes}
              onLecture={(a) => {
                if (tour !== null) {
                  if (a === 'pause') setTourPause((p) => !p);
                  else if (a === 'prev') setTour((k) => Math.max(0, (k ?? 0) - 1));
                  else if (a === 'next') setTour((k) => Math.min(TOUR.length - 1, (k ?? 0) + 1));
                  else if (a === 'restart') { setTourPause(false); setTour(0); }
                  else { setTour(null); setZone(null); }
                } else if (pres) {
                  const n = PRESENTATION_PAR_ID[pres.id].etapes.length;
                  if (a === 'pause') setPres({ ...pres, pause: !pres.pause });
                  else if (a === 'prev') setPres({ ...pres, i: Math.max(0, pres.i - 1) });
                  else if (a === 'next') setPres({ ...pres, i: Math.min(n - 1, pres.i + 1) });
                  else if (a === 'restart') setPres({ ...pres, i: 0, pause: false });
                  else arreterPresentation();
                } else if (seq !== null) {
                  if (a === 'pause') setSeqPause((p) => !p);
                  else if (a === 'prev') setSeq((k) => Math.max(0, (k ?? 0) - 1));
                  else if (a === 'next') setSeq((k) => Math.min(PHASES.length - 1, (k ?? 0) + 1));
                  else if (a === 'restart') { setSeqPause(false); setSeq(0); }
                  else setSeq(null);
                }
              }}
              peutRetour={histo.length > 0} onRetour={retour} />
          </div>
          {vueEvo && seq === null && (
            <div className="rounded-xl border border-warn/40 bg-warn/8 px-2.5 py-1.5 text-[12.5px] flex flex-wrap items-center gap-2">
              <TrendingUp size={15} className="text-warn shrink-0" />
              <span>Au bout de <b>{vueEvo.mois < 12 ? `${vueEvo.mois} mois` : `${vueEvo.mois / 12} an${vueEvo.mois >= 24 ? 's' : ''}`}</b> :</span>
              <div className="seg">
                {(['sans', 'avec', 'arret'] as const).filter((k) => k === 'sans' || Object.keys(traitement).length).map((k) => (
                  <button key={k} className={vueEvo.scenario === k ? 'actif' : ''} onClick={() => setVueEvo({ ...vueEvo, scenario: k })}>{k === 'sans' ? 'Sans traitement' : k === 'avec' ? 'Avec' : 'Arrêté'}</button>
                ))}
              </div>
              <button onClick={() => setVueEvo(null)} className="ml-auto text-xs font-semibold text-txt">Revenir à aujourd'hui</button>
            </div>
          )}
          <Moniteur e={etatScene} niveau={niveau} ref0={vueEvo && vueEvo.scenario !== 'sans' ? etatSansMois : null} />
        </section>

        <aside className="min-w-0 min-h-0 lg:h-[calc(100vh-88px)] lg:sticky lg:top-[68px] flex flex-col rounded-2xl border border-line bg-panel overflow-hidden">
          <nav className="grid grid-cols-3 gap-1 p-1.5 border-b border-line" role="tablist">
            {ONGLETS.map((o) => (
              <button key={o.id} role="tab" aria-selected={onglet === o.id} onClick={() => setOnglet(o.id)}
                className={`relative rounded-xl py-2 text-[11.5px] sm:text-[12px] font-semibold flex flex-row sm:flex-col items-center justify-center gap-1 sm:gap-0.5 ${onglet === o.id ? 'bg-card2 text-white' : 'text-muted hover:text-txt'}`}>
                <o.icone size={16} className="shrink-0" /><span className="truncate">{o.nom}</span>
                {o.badge && <span className="absolute top-1 right-2 min-w-[17px] h-[17px] rounded-full bg-sang text-[10px] grid place-items-center px-1">{o.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto scroll-thin p-3.5" data-testid="panneau">
            {onglet === 'explorer' && <PanneauExplorer zone={zone} niveau={niveau} vue={vue} etat={etatScene} actives={actives} onZone={onZone} onTogglePatho={togglePatho} onVue={setVue} onVoirPatho={(id) => { setFocusPatho(id); }} />}
            {onglet === 'maladies' && <PanneauMaladies niveau={niveau} vue={vue} zone={zone} actives={actives} focus={focusPatho} traitement={traitement} etat={etatAuj} etatSans={etatSans} labo={labo}
              onFocus={setFocusPatho} onToggle={togglePatho} onDose={onDose} onRemplacer={setTraitement} onSequence={lancerSequence} onComparer={comparer}
              onVoir={(v) => { setTour(null); setSeq(null); setVue(v === 'coeur' ? modeCoeur : v); }}
              onPresentation={lancerPresentation}
              onCas={(a, t, z) => { setPres(null); setSeq(null); setTour(null); setActives(a); setTraitement(t); setVueEvo(null); setZone(z); }}
              onEtapes={() => { setTour(null); setSeq(null); setVue('vaisseau'); setDemandeEtapes((n) => n + 1); }}
              onSeverite={(id, s) => setActives((a) => a.map((x) => (x.id === id ? { ...x, s } : x)))} onScenario={(a) => { setActives(a); setTraitement({}); setVueEvo(null); setFocusPatho(null); if (a[0] && ZONE_LESION[a[0].id]) setZone(ZONE_LESION[a[0].id]); }} />}
            {onglet === 'evolution' && <PanneauEvolution terrain={terrain} traitement={traitement} vueEvo={vueEvo} onVueEvo={setVueEvo} onAllerTraitements={() => setOnglet('maladies')} />}
          </div>
          {onglet === 'explorer' && focusPatho && (
            <button onClick={() => setOnglet('maladies')} className="m-2 mt-0 rounded-xl bg-card2 border border-line py-2 text-[13px] font-semibold">Ouvrir la fiche : {PATHO_PAR_ID[focusPatho].nom} →</button>
          )}
        </aside>
      </main>

      <footer className="text-center text-[11px] text-dim pb-4 pt-1 px-4 space-y-1">
        <p>Outil pédagogique : il ne remplace pas l'avis d'un médecin ni le résumé des caractéristiques des médicaments. Tous droits réservés.</p>
        <p className="flex flex-wrap items-center justify-center gap-x-1.5">
          © 2026 Hémodyssée · Dr Oumar Sow · Dakar
          <svg viewBox="0 0 30 20" width="18" height="12" aria-label="Drapeau du Sénégal" role="img" className="inline rounded-[2px]">
            <rect width="10" height="20" fill="#00853F" /><rect x="10" width="10" height="20" fill="#FDEF42" /><rect x="20" width="10" height="20" fill="#E31B23" />
            <polygon fill="#00853F" points="15,6.2 15.95,9.1 19,9.1 16.53,10.9 17.47,13.8 15,12 12.53,13.8 13.47,10.9 11,9.1 14.05,9.1" />
          </svg>
          · <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-txt">WhatsApp {WHATSAPP_AFFICHE}</a>
          · v{__VERSION__}
          · <button onClick={() => void partagerApp()} className="underline decoration-dotted hover:text-txt">Partager l'application</button>
        </p>
        <details className="max-w-xl mx-auto text-left">
          <summary className="cursor-pointer text-center py-1 hover:text-txt">Sources des chiffres</summary>
          <ul className="space-y-1 mt-1 leading-snug">
            <li>• Effet d'une classe d'antihypertenseur à dose standard (environ −9 mmHg) et additivité des associations : Law MR et al., BMJ 2009;338:b1665.</li>
            <li>• Risque relatif par 10 mmHg de PAS en moins (AVC 0,73 ; coronaires 0,83 ; IC 0,72) : Ettehad D et al., Lancet 2016;387:957-67.</li>
            <li>• −22 % d'événements vasculaires par mmol/L de LDL en moins : Cholesterol Treatment Trialists' Collaboration, Lancet 2010;376:1670-81.</li>
            <li>• FA : risque d'AVC multiplié par environ 5 (Wolf PA et al., Stroke 1991) ; anticoagulation : environ −64 % (Hart RG et al., Ann Intern Med 2007).</li>
            <li>• Recommandations ESC/ESH (HTA 2023-2024), ESC (dyslipidémies 2019, IC 2021-2023, FA 2024, valvulopathies 2021).</li>
            <li>• Modèle simplifié : bons sens de variation et bons ordres de grandeur, pas l'évolution d'un patient réel.</li>
          </ul>
        </details>
      </footer>

      {accueil && <Accueil onChoix={choisirNiveau} onDemo={() => { choisirNiveau(1); setOnglet('maladies'); lancerPresentation('hta'); }} />}
      {signaler && <Signalement onClose={() => setSignaler(false)} contexte={[
        `Version : ${__VERSION__}`, `Vue : ${vue} · niveau ${niveau}${zone ? ` · zone ${zone}` : ''}`,
        `Maladies : ${actives.map((a) => `${PATHO_PAR_ID[a.id].court} (${a.s})`).join(', ') || 'aucune'}`,
        `Traitement : ${Object.entries(traitement).map(([c, d]) => `${CLASSE_PAR_ID[c as ClasseId].court} ×${d}`).join(', ') || 'aucun'}`,
        `PA ${etatScene.pas}/${etatScene.pad} · FC ${etatScene.fc} · FE ${Math.round(etatScene.fe * 100)} %`,
        `Appareil : ${navigator.userAgent}`, `Écran : ${window.innerWidth}×${window.innerHeight}`,
      ].join('\n')} />}
      {maj && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-accent/40 bg-panel shadow-2xl px-4 py-3 flex items-center gap-3 text-sm fade-in">
          <RefreshCw size={16} className="text-accent" /> Nouvelle version d'Hémodyssée installée.
          <button onClick={() => location.reload()} className="rounded-lg bg-accent text-ink font-bold px-3 py-1">Recharger</button>
          <button onClick={() => setMaj(false)} className="text-muted" aria-label="Plus tard"><X size={15} /></button>
        </div>
      )}
    </div>
  );
}

function Accueil({ onChoix, onDemo }: { onChoix: (n: Niveau) => void; onDemo: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Bienvenue">
      <div className="max-w-2xl w-full rounded-3xl border border-line bg-panel p-6 sm:p-8 fade-in">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-sang to-[#7a1424] grid place-items-center shadow-[0_0_30px_rgba(224,65,78,.5)]"><HeartPulse size={28} /></div>
          <h1 className="font-display text-3xl sm:text-4xl mt-4">Hémodyssée</h1>
          <p className="text-muted mt-2">Suivez le sang à travers le cœur et les organes, déréglez la machine avec une maladie, puis voyez ce que chaque traitement change, aujourd'hui et dans 5 ans.</p>
        </div>
        <button onClick={onDemo} className="mt-6 w-full rounded-2xl bg-sang hover:brightness-110 text-white font-bold py-3.5 inline-flex items-center justify-center gap-2 shadow-[0_6px_24px_rgba(224,65,78,.45)]">
          <Play size={16} fill="currentColor" /> Première visite ? Regardez la démo (1 min)
        </button>
        <p className="text-[12px] text-muted text-center mt-4">ou choisissez votre niveau :</p>
        <div className="mt-2 grid sm:grid-cols-3 gap-3">
          {NIVEAUX.map((x) => (
            <button key={x.n} onClick={() => onChoix(x.n)} className="text-left carte p-4 hover:border-sang/60 hover:bg-card2 transition">
              <x.icone size={22} className="text-sang" />
              <div className="font-bold mt-2">{x.nom}</div>
              <div className="text-[12.5px] text-muted mt-1 leading-snug">{x.pour}</div>
            </button>
          ))}
        </div>
        <p className="text-[11.5px] text-dim text-center mt-5">Vous pourrez changer de niveau à tout moment, en haut de l'écran.</p>
      </div>
    </div>
  );
}
