/**
 * Vue « corps humain » : le cœur dans le thorax, l'arbre artériel (carotides, aorte,
 * artères rénales, artères des jambes) et le retour veineux. Les lésions apparaissent
 * à leur place : plaque carotidienne, artères des jambes, AVC, reins, poumons.
 */
import type { Instant } from '../core/clock.ts';
import type { Etat } from '../core/types.ts';
import { effetsVisibles } from '../core/effets.ts';
import type { ZoneId } from '../content/zones.ts';

type Pt = [number, number];
const W = 600, H = 920;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Chemin { pts: Pt[]; cum: number[]; len: number; poids: number; organe: 'cerveau' | 'reins' | 'membres' | 'bras' | 'coeur' }
function chemin(pts: Pt[], poids: number, organe: Chemin['organe']): Chemin {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1], poids, organe };
}
function at(c: Chemin, s: number): Pt {
  const d = s * c.len; let i = 1;
  while (i < c.cum.length - 1 && c.cum[i] < d) i++;
  const t = (d - c.cum[i - 1]) / (c.cum[i] - c.cum[i - 1] || 1);
  return [lerp(c.pts[i - 1][0], c.pts[i][0], t), lerp(c.pts[i - 1][1], c.pts[i][1], t)];
}

const COEUR: Pt = [318, 300];
const ARCHE: Pt[] = [[322, 282], [312, 228], [330, 218], [348, 236], [330, 262]];
const AORTE_DESC: Pt[] = [[330, 262], [318, 400], [304, 520]];
const ART: Chemin[] = [
  chemin([...ARCHE.slice(0, 2), [292, 214], [286, 150], [288, 92]], 0.12, 'cerveau'),
  chemin([...ARCHE.slice(0, 3), [312, 150], [312, 92]], 0.12, 'cerveau'),
  chemin([...ARCHE.slice(0, 2), [292, 214], [200, 204], [160, 330], [148, 500]], 0.07, 'bras'),
  chemin([...ARCHE.slice(0, 4), [410, 206], [446, 330], [456, 500]], 0.07, 'bras'),
  chemin([...ARCHE, [322, 405], [262, 408]], 0.1, 'reins'),
  chemin([...ARCHE, [322, 405], [362, 408]], 0.1, 'reins'),
  chemin([...ARCHE, ...AORTE_DESC.slice(1), [258, 566], [250, 700], [246, 860]], 0.19, 'membres'),
  chemin([...ARCHE, ...AORTE_DESC.slice(1), [346, 566], [352, 700], [356, 860]], 0.19, 'membres'),
  chemin([[322, 284], [340, 296], [348, 318], [332, 336]], 0.04, 'coeur'),
];
const VEI: Chemin[] = [
  chemin([[278, 92], [272, 150], [286, 232], [300, 292]], 0.24, 'cerveau'),
  chemin([[138, 500], [150, 330], [196, 218], [280, 228], [300, 292]], 0.14, 'bras'),
  chemin([[466, 500], [456, 330], [404, 218], [300, 238], [300, 292]], 0.14, 'bras'),
  chemin([[234, 860], [238, 700], [248, 566], [292, 524], [296, 330], [302, 312]], 0.24, 'membres'),
  chemin([[366, 860], [362, 700], [354, 566], [306, 526], [298, 330], [302, 312]], 0.24, 'membres'),
];

interface Region { z: ZoneId; x: number; y: number; w: number; h: number }
const REGIONS: Region[] = [
  { z: 'cerveau', x: 250, y: 30, w: 100, h: 82 }, { z: 'carotides', x: 270, y: 116, w: 60, h: 80 },
  { z: 'vg', x: 285, y: 270, w: 70, h: 70 }, { z: 'poumons', x: 200, y: 190, w: 200, h: 150 },
  { z: 'reins', x: 230, y: 388, w: 160, h: 40 }, { z: 'aorte', x: 300, y: 340, w: 40, h: 180 },
  { z: 'membres', x: 210, y: 560, w: 180, h: 340 },
];

export interface Corps2D {
  frame(i: Instant, dt: number): void;
  maj(e: Etat): void;
  focus(z: ZoneId | null): void;
  selection(z: ZoneId | null): void;
  setEtiquettes(on: boolean, noms: Partial<Record<ZoneId, string>>): void;
  /** Démonstration : un fragment de plaque carotidienne part vers le cerveau (AVC). */
  embolie(on: boolean): void;
  dispose(): void;
}

export function creerCorps2D(conteneur: HTMLElement, opt: { onPick?: (z: ZoneId | null) => void; onHover?: (z: ZoneId | null) => void; leger?: boolean } = {}): Corps2D {
  const cv = document.createElement('canvas');
  cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation';
  conteneur.appendChild(cv);
  const g = cv.getContext('2d')!;
  let dpr = 1, cw = 1, ch = 1;
  const ro = new ResizeObserver(() => {
    cw = conteneur.clientWidth; ch = conteneur.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, opt.leger ? 1.25 : 2);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  });
  ro.observe(conteneur);

  const tire = (liste: Chemin[]) => { const r = Math.random(); let a = 0; for (const c of liste) { a += c.poids; if (r <= a) return c; } return liste[liste.length - 1]; };
  const N = opt.leger ? 180 : 340;
  const pa = Array.from({ length: N }, () => ({ c: tire(ART), s: Math.random(), o: Math.random() - 0.5 }));
  const pv = Array.from({ length: Math.round(N * 0.7) }, () => ({ c: tire(VEI), s: Math.random(), o: Math.random() - 0.5 }));
  // Caillot qui voyage : depuis le cœur (FA) ou depuis une plaque carotidienne.
  let embole: { s: number; arret: number; src: 'coeur' | 'carotide' } | null = null, prochain = 5, demo = false;
  /** Abscisse curviligne de la plaque carotidienne sur le trajet vers le cerveau. */
  const S_CAROTIDE = (() => { const c = ART[0]; let best = 0, d = 1e9; for (let s = 0; s <= 1; s += 0.01) { const [, y] = at(c, s); if (Math.abs(y - 162) < d) { d = Math.abs(y - 162); best = s; } } return best; })();

  let etat: Etat | null = null;
  let choisi: ZoneId | null = null, survol: ZoneId | null = null;
  let labels = false;
  const vue = { s: 1, cx: W / 2, cy: H / 2 };
  let anim: { t: number; de: typeof vue; a: typeof vue } | null = null;
  let temps = 0;

  const base = () => { const k = Math.min(cw / W, ch / H) * vue.s; return { k, ox: cw / 2 - vue.cx * k, oy: ch / 2 - vue.cy * k }; };
  const monde = (ev: PointerEvent): Pt => { const r = cv.getBoundingClientRect(); const b = base(); return [(ev.clientX - r.left - b.ox) / b.k, (ev.clientY - r.top - b.oy) / b.k]; };
  const zoneEn = ([x, y]: Pt) => REGIONS.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)?.z ?? null;
  const onMove = (ev: PointerEvent) => { if (ev.pointerType !== 'mouse') return; const z = zoneEn(monde(ev)); if (z !== survol) { survol = z; cv.style.cursor = z ? 'pointer' : 'default'; opt.onHover?.(z); } };
  const onUp = (ev: PointerEvent) => opt.onPick?.(zoneEn(monde(ev)));
  cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp);

  function ligne(pts: Pt[], l: number, c: string) {
    g.strokeStyle = c; g.lineWidth = l; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke();
  }
  function texte(t: string, x: number, y: number, coul = '#e9eef8') {
    const taille = 12.5 / Math.sqrt(vue.s);
    g.font = `600 ${taille}px "Plus Jakarta Sans", system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(t).width;
    g.fillStyle = 'rgba(7,10,18,.75)'; g.beginPath(); g.roundRect(x - w / 2 - 6, y - taille * 0.8, w + 12, taille * 1.6, 7); g.fill();
    g.fillStyle = coul; g.fillText(t, x, y);
  }
  const mix = (a: number[], b: number[], t: number) => `rgb(${lerp(a[0], b[0], t) | 0},${lerp(a[1], b[1], t) | 0},${lerp(a[2], b[2], t) | 0})`;

  function dessiner(i: Instant) {
    const e = etat; const t = e?.terrain;
    const perf = e?.perfusion ?? { cerveau: 1, coeur: 1, reins: 1, membres: 1, poumons: 1 };
    const b = base();
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cw, ch);
    g.setTransform(dpr * b.k, 0, 0, dpr * b.k, dpr * b.ox, dpr * b.oy);

    // Silhouette.
    g.fillStyle = 'rgba(160,175,205,.07)'; g.strokeStyle = 'rgba(180,195,225,.28)'; g.lineWidth = 2;
    g.beginPath();
    g.ellipse(300, 76, 54, 62, 0, 0, Math.PI * 2);
    g.moveTo(276, 132); g.lineTo(272, 168); g.lineTo(190, 186); g.quadraticCurveTo(160, 196, 152, 240); g.lineTo(122, 520); g.lineTo(152, 524); g.lineTo(184, 300);
    g.lineTo(200, 470); g.lineTo(196, 560); g.lineTo(214, 900); g.lineTo(276, 900); g.lineTo(298, 600); g.lineTo(302, 600); g.lineTo(324, 900); g.lineTo(386, 900);
    g.lineTo(404, 560); g.lineTo(400, 470); g.lineTo(416, 300); g.lineTo(448, 524); g.lineTo(478, 520); g.lineTo(448, 240); g.quadraticCurveTo(440, 196, 410, 186); g.lineTo(328, 168); g.lineTo(324, 132); g.closePath();
    g.fill(); g.stroke();

    // Organes.
    const cer = clamp(perf.cerveau, 0, 1);
    g.fillStyle = mix([96, 100, 120], [236, 150, 170], cer); g.globalAlpha = 0.55;
    g.beginPath(); g.ellipse(300, 68, 40, 32, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.2;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(300 + (k - 2) * 14, 68, 12, 0.3, 2.6); g.stroke(); }
    if ((t?.avc ?? 0) > 0.05) { g.fillStyle = `rgba(25,20,35,${0.55 + 0.4 * t!.avc})`; g.beginPath(); g.ellipse(318, 60, 12 + 10 * t!.avc, 9 + 6 * t!.avc, 0.4, 0, 7); g.fill(); }
    for (const x of [252, 348]) {
      g.fillStyle = 'rgba(250,170,180,.16)'; g.strokeStyle = 'rgba(250,190,200,.4)';
      g.beginPath(); g.ellipse(x, 262, 46, 72, x < 300 ? 0.08 : -0.08, 0, 7); g.fill(); g.stroke();
      if (perf.poumons < 0.95) { g.fillStyle = `rgba(90,140,255,${0.6 * (1 - perf.poumons)})`; g.beginPath(); g.ellipse(x, 296, 40, 36, 0, 0, Math.PI); g.fill(); }
    }
    const rein = clamp(perf.reins * (t?.rein ?? 1), 0, 1);
    for (const x of [252, 368]) { g.fillStyle = mix([150, 110, 110], [210, 85, 95], rein); g.beginPath(); g.ellipse(x, 408, 16, 24, 0, 0, 7); g.fill(); }
    const mem = clamp(perf.membres, 0, 1);
    g.fillStyle = mix([90, 100, 130], [220, 130, 140], mem); g.globalAlpha = 0.18;
    g.fillRect(222, 600, 52, 290); g.fillRect(326, 600, 52, 290); g.globalAlpha = 1;
    // Mollets : ils manquent d'oxygène à la marche quand les artères sont rétrécies (claudication).
    const claudication = mem < 0.85;
    for (const x of [248, 352]) {
      g.fillStyle = claudication ? `rgba(160,90,220,${0.35 + 0.3 * Math.abs(Math.sin(temps * 2.5))})` : 'rgba(225,140,150,.22)';
      g.beginPath(); g.ellipse(x, 765, 15, 36, 0, 0, 7); g.fill();
    }
    // Pieds : pâles puis sombres au stade d'ischémie critique.
    const pied = mem < 0.6 ? mix([40, 30, 45], [200, 190, 200], clamp((mem - 0.3) / 0.3, 0, 1)) : 'rgba(200,175,185,.35)';
    for (const [x, sx] of [[236, -1], [364, 1]] as const) { g.fillStyle = pied; g.beginPath(); g.ellipse(x + sx * 6, 906, 28, 10, 0, 0, 7); g.fill(); }

    // Vaisseaux : la paroi pâlit et durcit avec la rigidité.
    const rig = t?.rigidite ?? 0.1;
    const rouge = mix([214, 66, 76], [226, 206, 170], clamp((rig - 0.2) / 0.7, 0, 1));
    const lv = 1 + 0.12 * (1 - rig) * i.ouvertureSig;
    for (const c of VEI) ligne(c.pts, 6, '#4a6bd0');
    for (const c of ART) ligne(c.pts, (c.organe === 'coeur' ? 3 : 6) * lv, rouge);
    // Bifurcation au genou : artères tibiales jusqu'au pied.
    for (const [x0, dx] of [[250, -1], [352, 1]] as const) {
      ligne([[x0, 700], [x0 - 10 * dx * -1, 780], [x0 - 16 * dx * -1, 900]], 3.5 * lv, rouge);
      ligne([[x0, 700], [x0 + 10 * dx * -1, 780], [x0 + 14 * dx * -1, 900]], 3.5 * lv, rouge);
    }
    ligne([[322, 282], ...ARCHE.slice(1), ...AORTE_DESC.slice(1)], 11 * lv, rouge);
    ligne([[300, 292], [292, 260], [252, 250]], 5, '#4a6bd0'); ligne([[312, 290], [348, 262]], 5, '#4a6bd0');
    ligne([[252, 275], [300, 300]], 4, '#e04a58'); ligne([[348, 275], [325, 300]], 4, '#e04a58');
    // Plaques.
    const plaque = (x: number, y: number, s: number, rot = 0) => { if (s < 0.08) return; g.fillStyle = '#f2c94c'; g.beginPath(); g.ellipse(x, y, 5 + 5 * s, 11, rot, 0, 7); g.fill(); };
    plaque(287, 160, demo ? Math.max(0.66, t?.plaqueCarotide ?? 0) : t?.plaqueCarotide ?? 0); plaque(312, 160, (t?.plaqueCarotide ?? 0) * 0.7);
    plaque(250, 680, t?.plaqueMembres ?? 0); plaque(352, 680, t?.plaqueMembres ?? 0);

    // Cœur.
    const cV = i.contractionV, sv = 1 - 0.1 * cV * ((e?.fe ?? 0.62) / 0.62);
    const taille = 1 + 0.25 * (t?.dilatation ?? 0) + 0.12 * (t?.hvg ?? 0);
    const jit = i.fibrillation ? Math.sin(temps * 70) * 1.2 : 0;
    g.save(); g.translate(COEUR[0] + jit, COEUR[1]); g.rotate(-0.5); g.scale(sv * taille, sv * taille);
    const grad = g.createRadialGradient(-6, -8, 4, 0, 0, 40);
    grad.addColorStop(0, '#e05a62'); grad.addColorStop(1, '#8e1f2a');
    g.fillStyle = grad; g.strokeStyle = '#5a1018'; g.lineWidth = 2 + 6 * (t?.hvg ?? 0);
    g.beginPath(); g.moveTo(0, 30); g.bezierCurveTo(-40, 6, -36, -26, -14, -28); g.bezierCurveTo(-4, -30, 0, -20, 0, -16);
    g.bezierCurveTo(0, -20, 4, -30, 14, -28); g.bezierCurveTo(36, -26, 40, 6, 0, 30); g.fill(); g.stroke();
    const isch = Math.max(t?.ischemie ?? 0, t?.occlusion ?? 0);
    if (isch > 0.05) { g.fillStyle = `rgba(60,55,85,${0.5 + 0.4 * isch})`; g.beginPath(); g.ellipse(10, 12, 10 + 8 * isch, 8 + 6 * isch, 0, 0, 7); g.fill(); }
    else if (perf.coeur < 0.85) { g.fillStyle = `rgba(150,90,210,${0.3 + 0.3 * Math.abs(Math.sin(temps * 3))})`; g.beginPath(); g.ellipse(10, 12, 12, 9, 0, 0, 7); g.fill(); }
    g.restore();
    if (e?.thrombusOG) { g.fillStyle = '#3a0509'; g.strokeStyle = '#ff7080'; g.lineWidth = 1.5; g.beginPath(); g.arc(336, 282, 5, 0, 7); g.fill(); g.stroke(); }

    // Particules.
    for (const p of pa) { const [x, y] = at(p.c, p.s); g.fillStyle = '#ff3b4a'; g.beginPath(); g.arc(x + p.o * 3, y, 2.3, 0, 7); g.fill(); }
    for (const p of pv) { const [x, y] = at(p.c, p.s); g.fillStyle = '#5b86ff'; g.beginPath(); g.arc(x + p.o * 3, y, 2.1, 0, 7); g.fill(); }
    const nL = t ? Math.round(clamp((t.ldl - 2.2) / 2.8, 0, 1) * 30) : 0;
    g.fillStyle = '#ffd84a';
    for (let k = 0; k < nL; k++) { const p = pa[(k * 11) % pa.length]; const [x, y] = at(p.c, (p.s + 0.02) % 1); g.beginPath(); g.arc(x - p.o * 3, y, 1.8, 0, 7); g.fill(); }
    if (embole) { const [x, y] = at(ART[0], embole.s); const re = demo ? 8 : 5; g.fillStyle = 'rgba(255,96,112,.25)'; g.beginPath(); g.arc(x, y, re + 6, 0, 7); g.fill(); g.fillStyle = '#2a0508'; g.strokeStyle = '#ff6070'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, re, 0, 7); g.fill(); g.stroke(); if (embole.arret > 0) { texte(embole.src === 'coeur' ? 'Caillot du cœur → AVC' : 'Fragment de plaque → AVC', x + 70, y); g.fillStyle = 'rgba(25,20,35,.75)'; g.beginPath(); g.ellipse(296, 66, 16, 11, 0.4, 0, 7); g.fill(); } }

    // Œdèmes : l'eau monte dans les jambes comme dans un verre.
    const oed = e?.oedemes ?? 0;
    if (oed > 0.03) {
      const niveauEau = 916 - oed * 320;
      g.save(); g.beginPath();
      g.moveTo(198, 600); g.lineTo(214, 900); g.lineTo(276, 900); g.lineTo(298, 600); g.closePath();
      g.moveTo(302, 600); g.lineTo(324, 900); g.lineTo(386, 900); g.lineTo(402, 600); g.closePath();
      g.ellipse(230, 906, 28, 10, 0, 0, 7); g.ellipse(370, 906, 28, 10, 0, 0, 7);
      g.clip();
      const eau = g.createLinearGradient(0, niveauEau, 0, 916);
      eau.addColorStop(0, 'rgba(110,170,255,.30)'); eau.addColorStop(1, 'rgba(70,130,255,.55)');
      g.fillStyle = eau; g.beginPath(); g.moveTo(190, 920);
      for (let x = 190; x <= 410; x += 6) g.lineTo(x, niveauEau + Math.sin(x * 0.08 + temps * 2.2) * 3);
      g.lineTo(410, 920); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(180,215,255,.8)'; g.lineWidth = 1.5; g.beginPath();
      for (let x = 190; x <= 410; x += 6) { const y = niveauEau + Math.sin(x * 0.08 + temps * 2.2) * 3; x === 190 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke(); g.restore();
      texte(oed > 0.55 ? 'Œdèmes importants : l\'eau monte dans les jambes' : oed > 0.25 ? 'Œdèmes des jambes' : 'Œdèmes des chevilles', 300, Math.max(600, niveauEau - 16), '#a9c8ff');
    }
    if ((t?.plaqueMembres ?? 0) > 0.1) {
      const ips = 1.15 * (1 - 0.9 * (t!.plaqueMembres ** 2));
      texte(`IPS ${ips.toFixed(2).replace('.', ',')} (normal 1,0 à 1,4)`, 520, 870, ips < 0.9 ? '#fbbf24' : '#e9eef8');
    }
    if (claudication) texte('Mollet : manque d\'oxygène à la marche', 520, 765, '#d6b4ff');
    if (mem < 0.6) texte('Ischémie du pied', 520, 905, '#fb7185');
    // Lésions des organes, cohérentes avec les vues Cœur et Vaisseau.
    {
      const isch = Math.max(t?.ischemie ?? 0, t?.occlusion ?? 0);
      if (isch > 0.05) texte('Infarctus : coronaire bouchée', 500, 338, '#fb7185');
      else if (perf.coeur < 0.85) texte('Angor : le cœur manque d\'oxygène', 500, 338, '#d6b4ff');
      if (demo) texte('Plaque carotidienne serrée', 420, 186, '#ffe08a');
      else if ((t?.plaqueCarotide ?? 0) > 0.15) texte(`Plaque carotidienne ${Math.round((t!.plaqueCarotide) * 92)} %`, 420, 186, '#ffe08a');
      if ((t?.avc ?? 0) > 0.05) texte('AVC : zone du cerveau privée de sang', 300, 128, '#fb7185');
      // Effets des traitements (en vert).
      const fx = effetsVisibles(e);
      if (fx.anticoagulant) texte('Anticoagulant : plus de caillot dans le cœur', 470, 366, '#6ee7b7');
      if (fx.antiagregant && (t?.plaqueCarotide ?? 0) > 0.3) texte('Aspirine : pas de caillot sur la plaque', 420, 212, '#6ee7b7');
      if (fx.diuretique) texte('Diurétique : l\'excès d\'eau s\'élimine', 520, 640, '#6ee7b7');
      if (fx.bradycardie) texte(`Bêtabloquant : cœur ralenti (${e!.fc}/min)`, 470, 394, '#6ee7b7');
      if (fx.vasodilatation) texte('Artérioles relâchées : la tension baisse', 300, 548, '#6ee7b7');
    }

    for (const r of REGIONS) if (r.z === choisi || r.z === survol) {
      g.strokeStyle = r.z === choisi ? 'rgba(125,211,252,.95)' : 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.setLineDash([6, 4]);
      g.beginPath(); g.roundRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 10); g.stroke(); g.setLineDash([]);
    }
    if (labels) {
      texte('Cerveau', 300, 20); texte('Carotides', 360, 150); texte('Poumons', 180, 262); texte('Cœur', 380, 312);
      texte('Aorte', 360, 460); texte('Reins', 440, 408); texte('Artères des jambes', 300, 740);
      texte('Veines caves', 210, 560, '#9ab0ff');
      texte('A. iliaque', 172, 590); texte('A. fémorale', 168, 660); texte('A. poplitée', 172, 710); texte('A. tibiales', 172, 820);
      texte('A. rénale', 198, 440); texte('A. sous-clavière', 116, 250);
    }
  }

  function avancer(i: Instant, dt: number) {
    const e = etat;
    const v = 170 * clamp((e?.debit ?? 5) / 5, 0.35, 1.6);
    const f = { cerveau: e?.perfusion.cerveau ?? 1, reins: e?.perfusion.reins ?? 1, membres: e?.perfusion.membres ?? 1, bras: 1, coeur: Math.min(1, e?.perfusion.coeur ?? 1) };
    for (const p of pa) { p.s += (v * (0.4 + 1.2 * i.ouvertureSig) * (p.s > 0.6 ? 0.5 + 0.5 * f[p.c.organe] : 1) * dt) / p.c.len; if (p.s >= 1) p.s -= 1; }
    for (const p of pv) { p.s += (v * 0.55 * dt) / p.c.len; if (p.s >= 1) p.s -= 1; }
    const srcEmb = e?.thrombusOG ? 'coeur' : demo || e?.embolieCarotide ? 'carotide' : null;
    if (srcEmb) {
      prochain -= dt;
      if (!embole && prochain <= 0) { embole = { s: srcEmb === 'coeur' ? 0 : S_CAROTIDE, arret: 0, src: srcEmb }; prochain = demo ? 2 : 8; }
    } else embole = null;
    if (embole) {
      if (embole.arret > 0) { embole.arret -= dt; if (embole.arret <= 0) embole = null; }
      else { embole.s += (v * (embole.src === 'carotide' ? 0.35 : 0.7) * dt) / ART[0].len; if (embole.s >= 0.97) { embole.s = 0.97; embole.arret = demo ? 3.5 : 2.5; } }
    }
  }

  return {
    frame(i, dt) {
      temps += dt;
      if (anim) {
        anim.t = Math.min(1, anim.t + dt / 0.7); const k = anim.t * anim.t * (3 - 2 * anim.t);
        vue.s = lerp(anim.de.s, anim.a.s, k); vue.cx = lerp(anim.de.cx, anim.a.cx, k); vue.cy = lerp(anim.de.cy, anim.a.cy, k);
        if (anim.t >= 1) anim = null;
      }
      avancer(i, dt); dessiner(i);
    },
    maj(e) { etat = e; },
    focus(z) {
      const r = z ? REGIONS.find((x) => x.z === z) ?? (['od', 'og', 'vd', 'coronaires', 'valveAo', 'valveMi', 'valveTri', 'valvePu', 'noeudSinusal', 'noeudAV'].includes(z) ? REGIONS[2] : null) : null;
      const a = r ? { s: clamp(Math.min(W / (r.w + 200), H / (r.h + 260)), 1, 2.6), cx: r.x + r.w / 2, cy: r.y + r.h / 2 } : { s: 1, cx: W / 2, cy: H / 2 };
      anim = { t: 0, de: { ...vue }, a };
    },
    selection(z) { choisi = z; },
    setEtiquettes(on) { labels = on; },
    embolie(on) { demo = on; if (on) { embole = null; prochain = 0.4; } },
    dispose() { ro.disconnect(); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.remove(); },
  };
}
