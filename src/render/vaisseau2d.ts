/**
 * Vue « vaisseau » : coupe longitudinale d'une artère (intima, média, adventice),
 * globules rouges qui circulent, LDL qui pénètre la paroi, plaque d'athérome,
 * rétrécissement, durcissement (rigidité), caillot.
 */
import { installerZoom2D, type Vue2D } from './zoom2d.ts';
import type { Instant } from '../core/clock.ts';
import type { Etat } from '../core/types.ts';
import { effetsVisibles } from '../core/effets.ts';
import type { ZoneId } from '../content/zones.ts';

export type Site = 'coronaire' | 'carotide' | 'jambe' | 'aorte' | 'arteriole';
export const SITES: { id: Site; nom: string }[] = [
  { id: 'coronaire', nom: 'Coronaire' }, { id: 'carotide', nom: 'Carotide' }, { id: 'aorte', nom: 'Aorte' },
  { id: 'jambe', nom: 'Artère de jambe' }, { id: 'arteriole', nom: 'Artériole' },
];

const W = 1000, H = 600, CY = 300;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Étapes de l'athérosclérose, de l'artère saine au caillot (classification classique de Stary). */
export const ETAPES_ATHERO = [
  { titre: 'Artère saine', texte: 'Paroi souple, endothélium lisse : le sang glisse sans obstacle.', detail: 'Trois couches : intima (avec l\'endothélium), média musculaire, adventice.' },
  { titre: 'Dépôt de LDL (strie lipidique)', texte: 'Le LDL en excès traverse l\'endothélium et s\'accumule dans l\'intima, où il s\'oxyde.', detail: 'Lésion débutante, sans rétrécissement ni symptôme ; elle peut apparaître dès l\'adolescence.' },
  { titre: 'Cellules spumeuses', texte: 'Des macrophages avalent le LDL oxydé et deviennent des cellules spumeuses : le cœur lipidique se forme.', detail: 'L\'inflammation entretient le processus ; le rétrécissement reste modéré.' },
  { titre: 'Plaque d\'athérome', texte: 'Une chape fibreuse recouvre le cœur lipidique : la plaque rétrécit l\'artère.', detail: 'Au-delà d\'environ 70 % de rétrécissement, l\'effort manque d\'oxygène : angor, claudication des jambes.' },
  { titre: 'Rupture et caillot', texte: 'La chape fine se fissure : les plaquettes s\'y collent et un caillot se forme (thrombose).', detail: 'C\'est la cible de l\'aspirine (plaquettes) ; la statine stabilise la plaque.' },
  { titre: 'Occlusion ou embolie', texte: 'Le caillot bouche l\'artère, ou un fragment se détache et va boucher une artère plus loin.', detail: 'Coronaire → infarctus ; carotide → AVC ; jambe → ischémie aiguë du membre.' },
] as const;

export interface Vaisseau2D {
  frame(i: Instant, dt: number): void;
  maj(e: Etat): void;
  focus(z: ZoneId | null): void;
  selection(z: ZoneId | null): void;
  setEtiquettes(on: boolean, noms: Partial<Record<ZoneId, string>>): void;
  setSite(s: Site): void;
  /** Étapes de l'athérosclérose (0 à 5) jouées en démonstration ; null = état du patient. */
  setEtape(n: number | null): void;
  /** Définition imposée pour l'export (pixels par point CSS) ; null = automatique. */
  setDefinition(pr: number | null): void;
  /** Zoom (boutons + / −) : facteur multiplicatif. */
  zoomer(f: number): void;
  dispose(): void;
}

export function creerVaisseau2D(conteneur: HTMLElement, opt: { leger?: boolean } = {}): Vaisseau2D {
  const cv = document.createElement('canvas');
  cv.style.cssText = 'display:block;width:100%;height:100%';
  conteneur.appendChild(cv);
  const g = cv.getContext('2d')!;
  let dpr = 1, cw = 1, ch = 1;
  let defImposee: number | null = null;
  const redim = () => {
    cw = conteneur.clientWidth; ch = conteneur.clientHeight;
    dpr = defImposee ?? Math.min(window.devicePixelRatio || 1, opt.leger ? 1.25 : 2);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  };
  const ro = new ResizeObserver(redim);
  ro.observe(conteneur);

  let etat: Etat | null = null;
  let site: Site = 'coronaire';
  let labels = true;
  let temps = 0;
  let pouls = 0;
  let etape: number | null = null, tEtape = 0;
  const STEN_ETAPE = [0, 0.07, 0.32, 0.66, 0.66, 0.66];
  const plaquettes = Array.from({ length: 26 }, (_, k) => ({ a: (k * 2.39) % 6.28, r: 6 + ((k * 7) % 30) }));
  const N = opt.leger ? 70 : 130;
  const gr = Array.from({ length: N }, () => ({ x: Math.random() * W, y: (Math.random() * 2 - 1), r: 0.7 + Math.random() * 0.5, a: Math.random() * 6 }));
  const ldl = Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * 2 - 1, dans: 0 }));
  // Points de calcium (fixes).
  const calc = Array.from({ length: 26 }, () => ({ x: Math.random() * W, f: Math.random(), haut: Math.random() < 0.5 }));

  function params() {
    const e = etat; const t = e?.terrain;
    const sten = !t ? 0 : site === 'coronaire' ? t.plaqueCoro : site === 'carotide' ? t.plaqueCarotide : site === 'jambe' ? t.plaqueMembres : site === 'aorte' ? Math.max(t.plaqueCoro, t.plaqueCarotide) * 0.35 : 0;
    const rigid = t ? (site === 'aorte' || site === 'carotide' ? t.rigidite : t.rigidite * 0.6) : 0.1;
    const rvs = t?.rvs ?? 1;
    const base = site === 'aorte' ? 118 : site === 'arteriole' ? 70 : 92; // rayon de la lumière
    const constr = site === 'arteriole' ? clamp(1 / Math.pow(rvs, 1.1), 0.45, 1.1) : 1;
    const media = (site === 'aorte' ? 30 : site === 'arteriole' ? 30 : 22) * (1 + 0.6 * Math.max(0, rvs - 1)) * (1 + 0.4 * rigid);
    const occl = !!t && site === 'coronaire' && (t.occlusion > 0.3 || (t.ischemie > 0.2 && t.plaqueCoro > 0.85));
    if (etape !== null) {
      // Démonstration : la plaque grandit d'une étape à l'autre (transition douce sur ~1,2 s).
      const k = Math.min(1, tEtape / 1.2), cible = STEN_ETAPE[etape], avant = STEN_ETAPE[Math.max(0, etape - 1)];
      return { sten: lerp(avant, cible, k * k * (3 - 2 * k)), rigid: 0.12, rayon: 92, media: 22, occl: etape === 5, ldl: etape === 0 ? 2 : 4.8, debit: 1, rayonAvant: 0 };
    }
    // Calibre de l'artériole avant traitement (pour montrer ce que le traitement a rouvert).
    const rayonAvant = site === 'arteriole' && e?.base ? base * clamp(1 / Math.pow(e.base.rvs, 1.1), 0.45, 1.1) : 0;
    return { sten, rigid, rayon: base * constr, media, occl, ldl: e?.ldl ?? 2.6, debit: (e?.debit ?? 5) / 5, rayonAvant };
  }

  /** Demi-hauteur de la lumière à l'abscisse x (rétrécissement centré en x = 500). */
  function lumiere(x: number, p: ReturnType<typeof params>, haut: boolean) {
    const d = (x - 500) / 170;
    const bosse = Math.exp(-d * d);
    const r = p.rayon * (1 + 0.06 * (1 - p.rigid) * pouls);
    const plaque = p.sten * p.rayon * 0.92 * bosse * (haut ? 0.35 : 1);
    return r - plaque;
  }

  // Zoom et déplacement (cadrage de départ : tout le vaisseau).
  const VUE0: Vue2D = { s: 1, cx: W / 2, cy: H / 2 };
  const vue: Vue2D = { ...VUE0 };
  let anim: { t: number; de: Vue2D; a: Vue2D } | null = null;
  const zoom = installerZoom2D(cv, { vue, vue0: VUE0, sMax: 4, W, H, taille: () => [cw, ch], k0: () => Math.min(cw / W, ch / H), animer: (a) => { anim = { t: 0, de: { ...vue }, a }; }, arreterAnim: () => { anim = null; } });

  let fz = 1; // grossissement des textes sur petit écran
  function texte(t: string, x: number, y: number, taille0 = 13, coul = '#e9eef8', align: CanvasTextAlign = 'center') {
    const taille = taille0 * fz;
    g.font = `600 ${taille}px "Plus Jakarta Sans", system-ui`; g.textAlign = align; g.textBaseline = 'middle';
    const w = g.measureText(t).width;
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    g.fillStyle = 'rgba(7,10,18,.75)'; g.beginPath(); g.roundRect(x0 - 7, y - taille * 0.8, w + 14, taille * 1.6, 8); g.fill();
    g.fillStyle = coul; g.fillText(t, x, y);
  }

  function dessiner(i: Instant, dt: number) {
    const p = params();
    if (anim) {
      anim.t = Math.min(1, anim.t + dt / 0.5); const a = anim.t * anim.t * (3 - 2 * anim.t);
      vue.s = lerp(anim.de.s, anim.a.s, a); vue.cx = lerp(anim.de.cx, anim.a.cx, a); vue.cy = lerp(anim.de.cy, anim.a.cy, a);
      if (anim.t >= 1) anim = null;
    }
    const k0 = Math.min(cw / W, ch / H), k = k0 * vue.s;
    const ox = cw / 2 - vue.cx * k, oy = ch / 2 - vue.cy * k;
    fz = clamp(0.6 / k0, 1, 1.8);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cw, ch);
    g.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);

    // Pulsation : la paroi se dilate en systole, d'autant moins qu'elle est rigide.
    pouls = lerp(pouls, i.ouvertureSig > 0.2 ? 1 : 0, Math.min(1, dt * 9));

    const pas = 4;
    const bordHaut: [number, number][] = [], bordBas: [number, number][] = [];
    for (let x = 0; x <= W; x += pas) { bordHaut.push([x, CY - lumiere(x, p, true)]); bordBas.push([x, CY + lumiere(x, p, false)]); }

    // Couches de la paroi (de l'extérieur vers l'intérieur), de chaque côté.
    const couleurMedia = `rgb(${lerp(196, 214, p.rigid) | 0},${lerp(84, 196, p.rigid) | 0},${lerp(96, 170, p.rigid) | 0})`;
    for (const signe of [-1, 1]) {
      const bord = signe < 0 ? bordHaut : bordBas;
      const r0 = p.rayon * (1 + 0.06 * (1 - p.rigid) * pouls);
      const couche = (ep0: number, ep1: number, coul: string) => {
        g.fillStyle = coul; g.beginPath();
        g.moveTo(0, CY + signe * (r0 + ep0));
        for (let x = 0; x <= W; x += pas) g.lineTo(x, CY + signe * (r0 + ep0));
        for (let x = W; x >= 0; x -= pas) g.lineTo(x, CY + signe * (r0 + ep1));
        g.closePath(); g.fill();
      };
      couche(p.media + 6, p.media + 34, '#e8c9a8');
      couche(6, p.media + 6, couleurMedia);
      // Intima : suit le bord de la lumière (donc la plaque).
      g.fillStyle = '#f3e3d3'; g.beginPath();
      g.moveTo(0, CY + signe * (r0 + 6));
      for (let x = 0; x <= W; x += pas) g.lineTo(x, CY + signe * (r0 + 6));
      for (let k2 = bord.length - 1; k2 >= 0; k2--) g.lineTo(bord[k2][0], bord[k2][1]);
      g.closePath(); g.fill();
      // Fibres musculaires de la média.
      g.strokeStyle = 'rgba(120,30,40,.25)'; g.lineWidth = 1.2;
      for (let x = 10; x < W; x += 22) { g.beginPath(); g.moveTo(x, CY + signe * (r0 + 10)); g.lineTo(x + 12, CY + signe * (r0 + p.media)); g.stroke(); }
    }
    // Calcifications quand la paroi durcit.
    if (p.rigid > 0.35) {
      g.fillStyle = 'rgba(250,245,230,.9)';
      const n = Math.round(calc.length * clamp((p.rigid - 0.35) / 0.6, 0, 1));
      const r0 = p.rayon;
      for (let k2 = 0; k2 < n; k2++) { const c = calc[k2]; const y = CY + (c.haut ? -1 : 1) * (r0 + 8 + c.f * p.media); g.beginPath(); g.ellipse(c.x, y, 6, 3, 0.3, 0, 7); g.fill(); }
    }

    // Plaque d'athérome : cœur lipidique jaune et chape fibreuse.
    if (p.sten > 0.04) {
      const fx = etape === null ? effetsVisibles(etat) : null;
      const chape = etape !== null ? (etape >= 4 ? 0.15 : etape === 3 ? 0.9 : 0.4) : fx?.statine ? 1 : clamp(1 - (p.ldl - 1.8) / 3, 0.25, 1);
      for (const haut of [false, true]) {
        const s = haut ? -1 : 1;
        // Sous statine, le cœur lipidique s'appauvrit : la plaque devient plus fibreuse (plus pâle).
        g.fillStyle = fx?.statine ? '#ead9a6' : '#f2c94c'; g.beginPath();
        for (let x = 230; x <= 770; x += pas) { const y = CY + s * lumiere(x, p, haut); x === 230 ? g.moveTo(x, y) : g.lineTo(x, y); }
        for (let x = 770; x >= 230; x -= pas) g.lineTo(x, CY + s * (p.rayon + 4));
        g.closePath(); g.fill();
        g.strokeStyle = '#fff2dd'; g.lineWidth = 2 + 6 * chape; g.beginPath();
        for (let x = 340; x <= 660; x += pas) { const y = CY + s * (lumiere(x, p, haut) + 2 + 3 * chape); x === 340 ? g.moveTo(x, y) : g.lineTo(x, y); }
        g.stroke();
        // Cellules spumeuses.
        g.fillStyle = 'rgba(255,240,200,.85)';
        const nSp = etape !== null && etape >= 2 ? (haut ? 6 : 14) : 10 * p.sten;
        for (let k2 = 0; k2 < nSp; k2++) { const x = 400 + ((k2 * 61) % 200); const yb = CY + s * (p.rayon - 8 - ((k2 * 17) % Math.max(6, p.sten * 60))); g.beginPath(); g.arc(x, yb, 5, 0, 7); g.fill(); }
      }
    }
    // Démonstration : fissure de la chape, plaquettes, caillot qui grossit, fragment qui part.
    if (etape !== null && etape >= 4) {
      const yB = CY + lumiere(500, p, false);
      g.fillStyle = '#5a0a10'; g.beginPath(); g.moveTo(488, yB - 2); g.lineTo(512, yB - 2); g.lineTo(503, yB + 26); g.lineTo(497, yB + 26); g.closePath(); g.fill();
      if (etape === 4) {
        const grow = Math.min(1, tEtape / 2.5);
        g.fillStyle = '#9b1622'; g.beginPath(); g.ellipse(500, yB - 4 - 14 * grow, 30 + 30 * grow, 6 + 20 * grow, 0, Math.PI, 0); g.fill();
        g.fillStyle = 'rgba(245,225,235,.95)';
        for (const q of plaquettes) { const r = q.r * (0.4 + 0.6 * grow); g.beginPath(); g.ellipse(500 + Math.cos(q.a) * r * 1.8, yB - 8 - Math.abs(Math.sin(q.a)) * r * 0.8, 3.2, 1.8, q.a, 0, 7); g.fill(); }
      }
    }
    // Caillot sur plaque rompue.
    if (p.occl) {
      g.fillStyle = '#7a0f18'; g.beginPath(); g.ellipse(500, CY, 70, lumiere(500, p, false) + 4, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; for (let k2 = 0; k2 < 30; k2++) { g.fillRect(450 + ((k2 * 37) % 100), CY - 20 + ((k2 * 13) % 40), 8, 1.5); }
    }

    if (p.rayonAvant && p.rayon - p.rayonAvant > 3) {
      g.setLineDash([10, 8]); g.strokeStyle = 'rgba(251,191,36,.85)'; g.lineWidth = 2.5;
      for (const sgn of [-1, 1]) { g.beginPath(); g.moveTo(0, CY + sgn * p.rayonAvant); g.lineTo(W, CY + sgn * p.rayonAvant); g.stroke(); }
      g.setLineDash([]);
    }
    if (etape === 5) {
      const cyc = (tEtape % 3.2) / 3.2;
      const fx = 560 + cyc * 460, fy = CY + 20 * Math.sin(cyc * 6);
      g.fillStyle = '#7a0f18'; g.strokeStyle = '#ff8d99'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(fx, fy, 18, 11, 0.3, 0, 7); g.fill(); g.stroke();
      if (fx < 930) texte('Fragment → plus loin', fx, fy - 30, 12, '#ffb3bd');
    }
    // Globules rouges : vitesse inversement proportionnelle à la section (continuité).
    const vBase = 160 * clamp(p.debit, 0.4, 1.6) * (0.45 + 0.9 * pouls);
    for (const c of gr) {
      const hH = lumiere(c.x, p, true), hB = lumiere(c.x, p, false);
      const larg = Math.max(4, hH + hB);
      const occlu = p.occl && c.x > 430 && c.x < 570;
      const v = occlu ? 0 : vBase * (p.rayon * 2) / larg;
      c.x += v * dt * (p.occl && c.x > 570 ? 0.08 : 1);
      if (c.x > W + 10) { c.x = -10; c.y = Math.random() * 2 - 1; }
      if (p.occl && c.x > 420 && c.x < 432) c.x = 420 + Math.random() * 10;
      const yc = CY + (c.y >= 0 ? c.y * hB : c.y * hH) * 0.82;
      c.a += dt * 3;
      g.fillStyle = '#d8323f'; g.strokeStyle = '#8f1622'; g.lineWidth = 1;
      g.beginPath(); g.ellipse(c.x, yc, 11 * c.r, 6 * c.r * (0.7 + 0.3 * Math.abs(Math.sin(c.a))), 0.2, 0, 7); g.fill(); g.stroke();
    }
    // LDL : nombre selon le taux ; une partie pénètre la paroi au niveau de la plaque.
    const nL = Math.round(clamp((p.ldl - 1) / 4, 0.05, 1) * ldl.length);
    for (let k2 = 0; k2 < nL; k2++) {
      const l = ldl[k2];
      if (l.dans > 0) { l.dans -= dt; g.fillStyle = 'rgba(255,216,74,.9)'; g.beginPath(); g.arc(l.x, CY + p.rayon - 2 - l.dans * 4, 4, 0, 7); g.fill(); if (l.dans <= 0) { l.x = -10; } continue; }
      l.x += vBase * 0.9 * dt;
      if (l.x > W + 10) { l.x = -10; l.y = Math.random() * 2 - 1; }
      const pen = etape !== null ? (etape >= 1 && etape <= 3 ? 0.08 : 0) : 0.02;
      if (p.ldl > 2.6 && l.x > 420 && l.x < 580 && l.y > 0.6 && Math.random() < pen) l.dans = 3;
      const hH = lumiere(l.x, p, true), hB = lumiere(l.x, p, false);
      const yc = CY + (l.y >= 0 ? l.y * hB : l.y * hH) * 0.8;
      g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(l.x, yc, 4, 0, 7); g.fill();
    }

    // Étiquettes et mesures.
    const pct = Math.round(p.sten * 92 * (p.occl ? 0 : 1) + (p.occl ? 100 : 0));
    const r0 = p.rayon;
    if (labels) {
      texte('Adventice', 90, CY - r0 - p.media - 22, 12, '#f5dcc0');
      texte(p.rigid > 0.4 ? 'Média durcie (rigide)' : 'Média (muscle)', 120, CY - r0 - p.media / 2 - 6, 12, '#ffd0d6');
      if (fz < 1.3) texte('Intima', 90, CY - r0 - 1, 11, '#fff'); // trop serré sur téléphone
      texte('Lumière : le sang circule', 150, CY + 4, 12);
      if (etape !== null) {
        const nom = ['Endothélium lisse', 'LDL sous l\'endothélium', 'Cellules spumeuses', 'Cœur lipidique + chape fibreuse', 'Fissure → plaquettes → caillot', 'Caillot : artère bouchée'][etape];
        texte(nom, 500, CY + r0 + 52, 13, etape >= 4 ? '#ffb3bd' : '#ffe08a');
        if (etape >= 1 && etape <= 3) texte('LDL qui entre dans la paroi', 800, CY + r0 + 52, 12, '#ffe08a');
      } else {
        if (p.sten > 0.04) texte(p.occl ? 'Caillot : artère bouchée' : 'Plaque d\'athérome', 500, CY + r0 + 52, 13, p.occl ? '#ffb3bd' : '#ffe08a');
        if (p.ldl > 2.6) texte('LDL qui entre dans la paroi', 800, CY + r0 + 52, 12, '#ffe08a');
        const t = etat?.terrain;
        if (t && site === 'carotide' && t.avc > 0.3 && t.plaqueCarotide < 0.3) texte('Carotide saine : le caillot de cet AVC vient d\'ailleurs (souvent du cœur, en FA)', W / 2, 76, 12, '#a4b1c7');
        const fx2 = effetsVisibles(etat);
        const verts: string[] = [];
        if (fx2.statine && p.sten > 0.04) verts.push('Statine : plaque stabilisée (chape épaisse, moins de lipides)');
        if (fx2.antiagregant && p.sten > 0.3) verts.push('Aspirine : les plaquettes ne forment plus de caillot');
        if (p.rayonAvant && p.rayon - p.rayonAvant > 3) verts.push('Traitement : l\'artériole se relâche (pointillés = avant)');
        verts.forEach((v, k) => texte(v, W / 2, H - 86 - k * 30, 12.5, '#6ee7b7'));
        if (etat?.embolieCarotide && site === 'carotide') texte('Plaque serrée : un fragment peut partir vers le cerveau (AVC)', W / 2, 76, 12, '#ffb3bd');
      }
    }
    const nomSite = etape !== null ? `Étape ${etape + 1}/${ETAPES_ATHERO.length + 1} · ${ETAPES_ATHERO[etape].titre}` : SITES.find((s) => s.id === site)!.nom;
    if (site === 'arteriole' && etape === null) {
      // Artériole : pas de plaque, c'est le muscle qui se contracte et réduit le calibre (HTA).
      const red = Math.max(0, Math.round((1 - p.rayon / 70) * 100));
      texte(`${nomSite} · calibre réduit de ${red} %`, W / 2, 40, 16, red >= 15 ? '#fbbf24' : '#e9eef8');
    } else texte(`${nomSite} · rétrécissement ${pct} %`, W / 2, 40, 16, pct >= 70 ? '#fb7185' : pct >= 40 ? '#fbbf24' : '#e9eef8');
    if (etape !== null) { /* le bandeau de lecture explique l'étape */ }
    else if (site === 'arteriole' && p.rayonAvant && p.rayon - p.rayonAvant > 3) { /* l'étiquette verte explique l'effet du traitement */ }
    else if (site === 'arteriole') texte(`Artériole ${p.rayon < 62 ? 'resserrée (HTA) : la résistance augmente' : 'normale'}`, W / 2, H - 40, 13, p.rayon < 62 ? '#fbbf24' : '#a4b1c7');
    else if (p.rigid > 0.35) texte('Paroi durcie : elle se dilate moins à chaque battement', W / 2, H - 40, 13, '#fbbf24');
    if (etat && etape === null) texte(`PA ${etat.pas}/${etat.pad} mmHg · LDL ${etat.ldl.toFixed(1)} mmol/L`, W - 20, H - 40, 12, '#a4b1c7', 'right');
  }

  return {
    frame(i, dt) { temps += dt; tEtape += dt; dessiner(i, dt); },
    maj(e) { etat = e; },
    focus() { anim = { t: 0, de: { ...vue }, a: { ...VUE0 } }; }, // « Tout voir » : retour au cadrage de départ
    selection() {},
    setEtiquettes() { labels = true; },
    setSite(s) { site = s; },
    setEtape(n) { if (n !== etape) { etape = n; tEtape = 0; } },
    setDefinition(pr) { defImposee = pr; redim(); },
    zoomer: (f) => zoom.zoomer(f),
    dispose() { zoom.dispose(); ro.disconnect(); cv.remove(); },
  };
}
