/** Application Hémodyssée : état global, mise en page, en-tête et accueil. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, BookOpen, Briefcase, Compass, Download, HeartPulse, Info, Map, MessageCircle, RefreshCw, Snail, TrendingUp, Volume2, VolumeX, X } from 'lucide-react';
import { Signalement, WHATSAPP } from './Signalement.tsx';
import { calculer, fractionAu, evoluer, TERRAIN_NORMAL } from '../core/engine.ts';
import { Son } from '../core/audio.ts';
import type { ClasseId, Niveau, Traitement } from '../core/types.ts';
import type { ZoneId } from '../content/zones.ts';
import { construireTerrain, PATHO_PAR_ID, type PathoActive } from '../content/pathologies.ts';
import { CLASSE_PAR_ID } from '../content/classes.ts';
import { Stage, type Vue } from './Stage.tsx';
import { Moniteur } from './widgets.tsx';
import { PanneauEvolution, PanneauExplorer, PanneauMaladies, type VueEvolution } from './panels.tsx';

type Onglet = 'explorer' | 'maladies' | 'evolution';

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
  const [traitement, setTraitement] = useState<Traitement>({});
  const [vueEvo, setVueEvo] = useState<VueEvolution | null>(null);
  const [sonOn, setSonOn] = useState(false);
  const [ralenti, setRalenti] = useState(false);
  const [labo, setLabo] = useState(() => /[?&]labo/.test(location.search) || lire('hemo.labo') === '1');
  const [apropos, setApropos] = useState(false);
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

  const legende = [
    actives.map((a) => PATHO_PAR_ID[a.id].court).join(' + ') || 'Sujet sain',
    Object.keys(traitement).length ? 'Traitement : ' + (Object.keys(traitement) as ClasseId[]).map((c) => CLASSE_PAR_ID[c].court).join(', ') : '',
    `PA ${etatScene.pas}/${etatScene.pad}`,
  ].filter(Boolean).join(' · ');
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
  const onZone = (z: ZoneId | null) => { setZone(z); if (z) setOnglet('explorer'); };
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
    <div className="min-h-full flex flex-col">
      {/* En-tête */}
      <header className="sticky top-0 z-30 bg-ink/90 backdrop-blur border-b border-line">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 h-14 flex items-center gap-3">
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
            <button className={vue === '3d' ? 'actif' : ''} onClick={() => setVue('3d')} title="Le cœur en 3D"><Box size={14} className="inline -mt-0.5 hidden md:inline" /> Cœur</button>
            <button className={vue === '2d' ? 'actif' : ''} onClick={() => setVue('2d')}>Voyage</button>
            <button className={vue === 'corps' ? 'actif' : ''} onClick={() => setVue('corps')}>Corps</button>
            <button className={vue === 'vaisseau' ? 'actif' : ''} onClick={() => setVue('vaisseau')}>Vaisseau</button>
          </div>
          <button onClick={basculerSon} className={`btn-icone ml-auto lg:ml-0 ${sonOn ? 'actif' : ''}`} title="Bruits du cœur" aria-label="Activer les bruits du cœur">{sonOn ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
          <button onClick={() => setRalenti((v) => !v)} className={`btn-icone hidden sm:grid ${ralenti ? 'actif' : ''}`} title="Ralenti" aria-label="Ralenti"><Snail size={16} /></button>
          <button onClick={() => setLabo((v) => !v)} className={`btn-icone ${labo ? 'actif' : ''}`} title="Mode labo (gamme commerciale)" aria-label="Mode labo"><Briefcase size={16} /></button>
          {installer && <button onClick={() => { void installer.prompt(); setInstaller(null); }} className="btn-icone actif" title="Installer l'application" aria-label="Installer l'application"><Download size={16} /></button>}
          <button onClick={() => setSignaler(true)} className="btn-icone" title="Signaler un problème ou suggérer" aria-label="Signaler"><MessageCircle size={16} /></button>
          <button onClick={() => setApropos(true)} className="btn-icone" title="À propos" aria-label="À propos"><Info size={16} /></button>
        </div>
        <div className="lg:hidden px-3 pb-2 grid sm:grid-cols-2 gap-2">
          <div className="seg w-full justify-between">{NIVEAUX.map((x) => <button key={x.n} className={`flex-1 ${niveau === x.n ? 'actif' : ''}`} onClick={() => choisirNiveau(x.n)}>{x.nom}</button>)}</div>
          <div className="seg w-full justify-between [&>button]:flex-1" role="group" aria-label="Vue">
            <button className={vue === '3d' ? 'actif' : ''} onClick={() => setVue('3d')} title="Le cœur en 3D"><Box size={14} className="inline -mt-0.5 hidden md:inline" /> Cœur</button>
            <button className={vue === '2d' ? 'actif' : ''} onClick={() => setVue('2d')}>Voyage</button>
            <button className={vue === 'corps' ? 'actif' : ''} onClick={() => setVue('corps')}>Corps</button>
            <button className={vue === 'vaisseau' ? 'actif' : ''} onClick={() => setVue('vaisseau')}>Vaisseau</button>
          </div>
        </div>
      </header>

      {/* Corps */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 grid gap-3 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex flex-col gap-3 min-w-0">
          <div className="h-[56vh] min-h-[340px] lg:h-[calc(100vh-190px)] lg:min-h-[520px]">
            <Stage vue={vue} etat={etatScene} niveau={niveau} zone={zone} onZone={onZone} son={son} ralenti={ralenti} legende={legende} onVue={setVue} />
          </div>
          {vueEvo && (
            <div className="rounded-xl border border-warn/40 bg-warn/8 px-3 py-2 text-[13px] flex items-center gap-2">
              <TrendingUp size={15} className="text-warn" />
              La scène montre le patient {vueEvo.scenario === 'sans' ? 'sans traitement' : vueEvo.scenario === 'avec' ? 'avec le traitement suivi' : `après arrêt du traitement (mois ${vueEvo.arret})`}, au bout de {vueEvo.mois} mois.
              <button onClick={() => setVueEvo(null)} className="ml-auto text-xs font-semibold text-txt">Revenir à aujourd'hui</button>
            </div>
          )}
          <Moniteur e={etatScene} niveau={niveau} />
        </section>

        <aside className="min-w-0 lg:h-[calc(100vh-88px)] lg:sticky lg:top-[68px] flex flex-col min-h-0 rounded-2xl border border-line bg-panel">
          <nav className="grid grid-cols-3 gap-1 p-1.5 border-b border-line" role="tablist">
            {ONGLETS.map((o) => (
              <button key={o.id} role="tab" aria-selected={onglet === o.id} onClick={() => setOnglet(o.id)}
                className={`relative rounded-xl py-2 text-[12px] font-semibold flex flex-col items-center gap-0.5 ${onglet === o.id ? 'bg-card2 text-white' : 'text-muted hover:text-txt'}`}>
                <o.icone size={17} />{o.nom}
                {o.badge && <span className="absolute top-1 right-2 min-w-[17px] h-[17px] rounded-full bg-sang text-[10px] grid place-items-center px-1">{o.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto scroll-thin p-3.5" data-testid="panneau">
            {onglet === 'explorer' && <PanneauExplorer zone={zone} niveau={niveau} vue={vue} etat={etatScene} actives={actives} onZone={onZone} onTogglePatho={togglePatho} onVue={setVue} onVoirPatho={(id) => { setFocusPatho(id); }} />}
            {onglet === 'maladies' && <PanneauMaladies niveau={niveau} vue={vue} zone={zone} actives={actives} focus={focusPatho} traitement={traitement} etat={etatAuj} etatSans={etatSans} labo={labo}
              onFocus={setFocusPatho} onToggle={togglePatho} onDose={onDose} onRemplacer={setTraitement}
              onSeverite={(id, s) => setActives((a) => a.map((x) => (x.id === id ? { ...x, s } : x)))} onScenario={(a) => { setActives(a); setTraitement({}); setVueEvo(null); setFocusPatho(null); if (a[0] && ZONE_LESION[a[0].id]) setZone(ZONE_LESION[a[0].id]); }} />}
            {onglet === 'evolution' && <PanneauEvolution terrain={terrain} traitement={traitement} vueEvo={vueEvo} onVueEvo={setVueEvo} onAllerTraitements={() => setOnglet('maladies')} />}
          </div>
          {onglet === 'explorer' && focusPatho && (
            <button onClick={() => setOnglet('maladies')} className="m-2 mt-0 rounded-xl bg-card2 border border-line py-2 text-[13px] font-semibold">Ouvrir la fiche : {PATHO_PAR_ID[focusPatho].nom} →</button>
          )}
        </aside>
      </main>

      <footer className="text-center text-[11px] text-dim pb-4 px-4">Hémodyssée · Outil pédagogique : il ne remplace pas l'avis d'un médecin ni le résumé des caractéristiques des médicaments.</footer>

      {accueil && <Accueil onChoix={choisirNiveau} />}
      {apropos && <APropos onClose={() => setApropos(false)} labo={labo} />}
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

function Accueil({ onChoix }: { onChoix: (n: Niveau) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Bienvenue">
      <div className="max-w-2xl w-full rounded-3xl border border-line bg-panel p-6 sm:p-8 fade-in">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-sang to-[#7a1424] grid place-items-center shadow-[0_0_30px_rgba(224,65,78,.5)]"><HeartPulse size={28} /></div>
          <h1 className="font-display text-3xl sm:text-4xl mt-4">Hémodyssée</h1>
          <p className="text-muted mt-2">Suivez le sang à travers le cœur et les organes, déréglez la machine avec une maladie, puis voyez ce que chaque traitement change, aujourd'hui et dans 5 ans.</p>
        </div>
        <div className="mt-6 grid sm:grid-cols-3 gap-3">
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

function APropos({ onClose, labo }: { onClose: () => void; labo: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-w-xl w-full max-h-[85vh] overflow-y-auto scroll-thin rounded-3xl border border-line bg-panel p-6 space-y-4 text-[13.5px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start"><h2 className="font-display text-2xl">À propos d'Hémodyssée</h2><button className="btn-icone" onClick={onClose} aria-label="Fermer"><X size={15} /></button></div>
        <p>Hémodyssée est un outil visuel pour comprendre et faire comprendre la circulation, les maladies cardiovasculaires (HTA, dyslipidémie, valvulopathies, troubles du rythme, insuffisance cardiaque…) et l'action de chaque classe de médicaments.</p>
        <div><div className="titre-section mb-1">Comment l'utiliser</div>
          <ol className="list-decimal pl-5 space-y-1 text-muted">
            <li><b className="text-txt">Explorer</b> : suivez le voyage du sang et cliquez sur une zone pour zoomer.</li>
            <li><b className="text-txt">Maladies</b> : simulez une ou plusieurs maladies et observez les conséquences.</li>
            <li><b className="text-txt">Traitements</b> : ajoutez une classe à la fois pour voir son effet, ou appliquez le traitement proposé.</li>
            <li><b className="text-txt">Évolution</b> : comparez sans traitement, traitement suivi et traitement arrêté sur 5 ans.</li>
          </ol>
        </div>
        <div><div className="titre-section mb-1">Sur quoi reposent les chiffres</div>
          <ul className="space-y-1 text-muted">
            <li>• Effet d'une classe d'antihypertenseur à dose standard (environ −9 mmHg) et additivité des associations : Law MR et al., BMJ 2009;338:b1665.</li>
            <li>• Risque relatif par 10 mmHg de PAS en moins (AVC 0,73 ; coronaires 0,83 ; IC 0,72) : Ettehad D et al., Lancet 2016;387:957-67.</li>
            <li>• −22 % d'événements vasculaires par mmol/L de LDL en moins : Cholesterol Treatment Trialists' Collaboration, Lancet 2010;376:1670-81.</li>
            <li>• FA : risque d'AVC multiplié par environ 5 (Wolf PA et al., Stroke 1991) ; anticoagulation : environ −64 % (Hart RG et al., Ann Intern Med 2007).</li>
            <li>• Recommandations ESC/ESH (HTA 2023-2024), ESC (dyslipidémies 2019, IC 2021-2023, FA 2024, valvulopathies 2021).</li>
          </ul>
        </div>
        <div><div className="titre-section mb-1">Limites</div><p className="text-muted">C'est un modèle simplifié : il montre les bons sens de variation et les bons ordres de grandeur, pas l'évolution d'un patient réel. Il ne remplace ni l'avis médical ni le RCP des médicaments.</p></div>
        {labo && <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-muted">Le mode labo affiche une gamme commerciale. Il est désactivé par défaut : la version publique reste en DCI.</div>}
        <div><div className="titre-section mb-1">Installer sur téléphone ou ordinateur</div>
          <ul className="space-y-1 text-muted">
            <li>• <b className="text-txt">Android / Chrome</b> : bouton « Installer » en haut, ou menu ⋮ → « Installer l'application ».</li>
            <li>• <b className="text-txt">iPhone / iPad</b> : dans Safari, bouton Partager → « Sur l'écran d'accueil ».</li>
            <li>• Elle fonctionne hors connexion et reste liée au site : chaque nouvelle version s'installe toute seule (un message propose de recharger).</li>
            <li>• Pour la supprimer : appui long sur l'icône → Supprimer, comme n'importe quelle application.</li>
          </ul>
        </div>
        <div><div className="titre-section mb-1">Exporter</div><p className="text-muted">Boutons appareil photo et enregistrement sur la scène : image PNG, ou vidéo (MP4 ou WebM selon le navigateur) avec les bruits du cœur si le son est activé.</p></div>
        <p className="text-dim text-xs flex flex-wrap items-center gap-x-1.5">
          Conçu par le Dr O. Sow · Dakar, Sénégal
          <svg viewBox="0 0 30 20" width="18" height="12" aria-label="Drapeau du Sénégal" role="img" className="inline rounded-[2px]">
            <rect width="10" height="20" fill="#00853F" /><rect x="10" width="10" height="20" fill="#FDEF42" /><rect x="20" width="10" height="20" fill="#E31B23" />
            <polygon fill="#00853F" points="15,6.2 15.95,9.1 19,9.1 16.53,10.9 17.47,13.8 15,12 12.53,13.8 13.47,10.9 11,9.1 14.05,9.1" />
          </svg>
          · WhatsApp @{WHATSAPP} · version {__VERSION__}
        </p>
      </div>
    </div>
  );
}
