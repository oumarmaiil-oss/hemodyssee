/**
 * Le voyage du sang en 2D : petite circulation (poumons) et grande circulation
 * (cerveau, cœur, reins, jambes) branchées en parallèle. Le sang change de couleur
 * dans les capillaires ; les lésions et la perfusion des organes sont visibles.
 * Un clic sur une zone zoome dessus.
 */
import type { Instant } from '../core/clock.ts';
import type { Etat } from '../core/types.ts';
import { effetsVisibles } from '../core/effets.ts';
import type { ZoneId } from '../content/zones.ts';

type Pt = [number, number];
const W = 1000, H = 770;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Circuit { pts: Pt[]; cum: number[]; len: number; sAV: number[]; sSig: number[]; capP: [number, number]; capO: [number, number]; organe: string }

function circuit(pts: Pt[], iAV: number[], iSig: number[], capP: [number, number], capO: [number, number], organe: string): Circuit {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  return { pts, cum, len, sAV: iAV.map((k) => cum[k] / len), sSig: iSig.map((k) => cum[k] / len), capP: [cum[capP[0]] / len, cum[capP[1]] / len], capO: [cum[capO[0]] / len, cum[capO[1]] / len], organe };
}
function pointAt(c: Circuit, s: number): Pt {
  const d = s * c.len;
  let i = 1;
  while (i < c.cum.length - 1 && c.cum[i] < d) i++;
  const t = (d - c.cum[i - 1]) / (c.cum[i] - c.cum[i - 1] || 1);
  return [lerp(c.pts[i - 1][0], c.pts[i][0], t), lerp(c.pts[i - 1][1], c.pts[i][1], t)];
}

// Repères.
const OD: Pt = [405, 345], OG: Pt = [595, 345], TRI: Pt = [410, 398], MI: Pt = [592, 398], PU: Pt = [482, 392], AO: Pt = [520, 392];
const VD: Pt = [430, 470], VG: Pt = [580, 485];
const COEUR_DEBUT: Pt[] = [OD, TRI, VD, [470, 455], PU, [482, 270]];
const POUMON_G: Pt[] = [[430, 228], [385, 200], [362, 168], [410, 148], [458, 182], [530, 250], [578, 300], OG];
const POUMON_D: Pt[] = [[545, 232], [605, 212], [650, 186], [636, 148], [588, 152], [560, 196], [580, 292], OG];
const COEUR_GAUCHE: Pt[] = [MI, VG, [540, 462], AO, [520, 282], [600, 262], [720, 262], [780, 300]];
const ORGANES: Record<string, Pt[]> = {
  cerveau: [[780, 60], [640, 56], [585, 48], [530, 66], [470, 46], [415, 60], [370, 56], [220, 60], [220, 300], [360, 326], OD],
  reins: [[780, 632], [610, 632], [560, 618], [520, 640], [480, 620], [440, 640], [390, 632], [220, 632], [220, 400], [360, 370], OD],
  membres: [[780, 708], [610, 708], [565, 690], [520, 728], [480, 690], [435, 728], [390, 708], [220, 708], [220, 400], [360, 370], OD],
};
const CORO: Pt[] = [[535, 378], [600, 418], [648, 478], [612, 556], [520, 576], [420, 548], [375, 392], OD];

function construireCircuits(): Circuit[] {
  const out: Circuit[] = [];
  for (const [nomP, poumon] of [['g', POUMON_G], ['d', POUMON_D]] as const) {
    const debut = [...COEUR_DEBUT, ...poumon];
    const iOG = debut.length - 1;
    for (const [org, pts] of Object.entries(ORGANES)) {
      const all = [...debut, ...COEUR_GAUCHE, ...pts];
      const o0 = iOG + COEUR_GAUCHE.length + 1;
      out.push(circuit(all, [1, iOG + 1], [4, iOG + 4], [6, 10], [o0 + 1, o0 + 6], org + nomP));
    }
    const coro = [...debut, MI, VG, [540, 462] as Pt, AO, ...CORO];
    out.push(circuit(coro, [1, iOG + 1], [4, iOG + 4], [6, 10], [iOG + 5, iOG + 8], 'coeur' + nomP));
  }
  return out;
}

interface Region { z: ZoneId; x: number; y: number; w: number; h: number }
const REGIONS: Region[] = [
  { z: 'valveTri', x: 392, y: 386, w: 38, h: 24 }, { z: 'valveMi', x: 573, y: 386, w: 38, h: 24 },
  { z: 'valvePu', x: 470, y: 378, w: 24, h: 26 }, { z: 'valveAo', x: 508, y: 378, w: 24, h: 26 },
  { z: 'noeudSinusal', x: 352, y: 300, w: 28, h: 26 }, { z: 'noeudAV', x: 478, y: 404, w: 44, h: 22 },
  { z: 'coronaires', x: 620, y: 440, w: 44, h: 90 },
  { z: 'od', x: 350, y: 300, w: 128, h: 86 }, { z: 'og', x: 522, y: 300, w: 128, h: 86 },
  { z: 'vd', x: 352, y: 404, w: 140, h: 140 }, { z: 'vg', x: 500, y: 404, w: 160, h: 170 },
  { z: 'artPulm', x: 468, y: 240, w: 30, h: 136 }, { z: 'aorte', x: 506, y: 250, w: 290, h: 34 },
  { z: 'veinesPulm', x: 520, y: 240, w: 70, h: 56 }, { z: 'veinesCaves', x: 200, y: 60, w: 40, h: 660 },
  { z: 'poumons', x: 330, y: 120, w: 340, h: 120 }, { z: 'cerveau', x: 360, y: 10, w: 280, h: 90 },
  { z: 'carotides', x: 640, y: 40, w: 150, h: 34 }, { z: 'reins', x: 380, y: 596, w: 240, h: 72 },
  { z: 'membres', x: 380, y: 676, w: 240, h: 90 },
];

export interface Circuit2D {
  frame(i: Instant, dt: number): void;
  maj(e: Etat): void;
  focus(z: ZoneId | null): void;
  selection(z: ZoneId | null): void;
  setEtiquettes(on: boolean, noms: Partial<Record<ZoneId, string>>): void;
  /** Définition imposée pour l'export (pixels par point CSS) ; null = automatique. */
  setDefinition(pr: number | null): void;
  dispose(): void;
}

export function creerCircuit2D(conteneur: HTMLElement, opt: { onPick?: (z: ZoneId | null) => void; onHover?: (z: ZoneId | null) => void; leger?: boolean; coeur?: boolean } = {}): Circuit2D {
  // Mode « cœur en 2D » : même schéma, cadré sur le cœur.
  const VUE0 = opt.coeur ? { s: 2.15, cx: 505, cy: 440 } : { s: 1, cx: W / 2, cy: H / 2 };
  const cv = document.createElement('canvas');
  cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation';
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

  const circuits = construireCircuits();
  const poids: Record<string, number> = { cerveau: 0.24, reins: 0.27, membres: 0.37, coeur: 0.12 };
  const N = opt.leger ? 320 : 700;
  const parts = Array.from({ length: N }, () => {
    const r = Math.random();
    let acc = 0, org = 'membres';
    for (const [k, w] of Object.entries(poids)) { acc += w; if (r <= acc) { org = k; break; } }
    const cand = circuits.filter((c) => c.organe.startsWith(org));
    return { c: cand[Math.floor(Math.random() * cand.length)], s: Math.random(), o: (Math.random() - 0.5) * 2 };
  });
  const emboles: { c: Circuit; s: number; arret: number }[] = [];
  let prochainEmbole = 4;
  const jets: { x: number; y: number; vx: number; vy: number; vie: number; c: string }[] = [];

  let etat: Etat | null = null;
  let choisi: ZoneId | null = null, survol: ZoneId | null = null;
  let labels = false, noms: Partial<Record<ZoneId, string>> = {};
  const vue = { ...VUE0 };
  let anim: { t: number; de: typeof vue; a: typeof vue } | null = null;
  let temps = 0;

  function base() {
    const k = Math.min(cw / W, ch / H) * vue.s;
    return { k, ox: cw / 2 - vue.cx * k, oy: ch / 2 - vue.cy * k };
  }
  function versMonde(px: number, py: number): Pt { const b = base(); return [(px - b.ox) / b.k, (py - b.oy) / b.k]; }
  function zoneEn(x: number, y: number): ZoneId | null {
    for (const r of REGIONS) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.z;
    return null;
  }
  const evPos = (ev: PointerEvent) => { const r = cv.getBoundingClientRect(); return versMonde(ev.clientX - r.left, ev.clientY - r.top); };
  const onMove = (ev: PointerEvent) => { if (ev.pointerType !== 'mouse') return; const z = zoneEn(...evPos(ev)); if (z !== survol) { survol = z; cv.style.cursor = z ? 'pointer' : 'default'; opt.onHover?.(z); } };
  const onClick = (ev: PointerEvent) => opt.onPick?.(zoneEn(...evPos(ev)));
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onClick);

  // ── Dessin ──
  const couleurSang = (c: Circuit, s: number): [number, number, number] => {
    const rouge: [number, number, number] = [235, 58, 72], bleu: [number, number, number] = [80, 120, 235];
    const mix = (t: number): [number, number, number] => [lerp(bleu[0], rouge[0], t), lerp(bleu[1], rouge[1], t), lerp(bleu[2], rouge[2], t)];
    if (s < c.capP[0]) return bleu;
    if (s < c.capP[1]) return mix((s - c.capP[0]) / (c.capP[1] - c.capP[0]));
    if (s < c.capO[0]) return rouge;
    if (s < c.capO[1]) return mix(1 - (s - c.capO[0]) / (c.capO[1] - c.capO[0]));
    return bleu;
  };
  function ligne(pts: Pt[], larg: number, coul: string, alpha = 1) {
    g.globalAlpha = alpha; g.strokeStyle = coul; g.lineWidth = larg; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); g.globalAlpha = 1;
  }
  function capillaires(cx: number, cy: number, w: number, h: number, a: string, b: string) {
    const gr = g.createLinearGradient(cx + w / 2, 0, cx - w / 2, 0);
    gr.addColorStop(0, a); gr.addColorStop(1, b);
    g.strokeStyle = gr; g.lineWidth = 1.6; g.globalAlpha = 0.75;
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      for (let x = -w / 2; x <= w / 2; x += 6) { const y = cy + k * (h / 6) + Math.sin(x * 0.18 + k) * 3; x === -w / 2 ? g.moveTo(cx + x, y) : g.lineTo(cx + x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  const rgb = (c: [number, number, number], a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mixC = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const ISCH: [number, number, number] = [96, 100, 120];

  function texte(t: string, x: number, y: number, taille = 13, coul = '#e9eef8', centre = true) {
    g.font = `600 ${taille}px "Plus Jakarta Sans", system-ui`;
    g.textAlign = centre ? 'center' : 'left'; g.textBaseline = 'middle';
    const w = g.measureText(t).width;
    g.fillStyle = 'rgba(7,10,18,.72)';
    g.beginPath(); g.roundRect((centre ? x - w / 2 : x) - 6, y - taille * 0.75, w + 12, taille * 1.5, 7); g.fill();
    g.fillStyle = coul; g.fillText(t, x, y);
  }

  function valve2d(c: Pt, horiz: boolean, ouv: number, sten: number, fuite: number) {
    const r = horiz ? 17 : 11;
    const max = (Math.PI / 2.3) * (1 - 0.75 * sten), min = 0.45 * fuite;
    const a = min + (max - min) * ouv;
    const coul = sten > 0.3 ? '#f0cf6a' : fuite > 0.3 ? '#f4a3b6' : '#f6e1d8';
    g.strokeStyle = coul; g.lineWidth = 3 + 4 * sten; g.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      g.beginPath();
      if (horiz) { const x0 = c[0] + sgn * r; g.moveTo(x0, c[1]); g.lineTo(x0 - sgn * Math.cos(a) * r, c[1] + Math.sin(a) * r); }
      else { const y0 = c[1] + sgn * r; g.moveTo(c[0], y0); g.lineTo(c[0] - Math.sin(a) * r * 0.2, y0 - sgn * Math.cos(a) * r); }
      g.stroke();
    }
  }

  function chambre(x: number, y: number, w: number, h: number, coul: string, paroi: number, rayon = 26) {
    g.fillStyle = coul; g.strokeStyle = '#7d2630'; g.lineWidth = paroi;
    g.beginPath(); g.roundRect(x, y, w, h, rayon); g.fill(); g.stroke();
  }

  function dessiner(i: Instant) {
    const e = etat; const t = e?.terrain;
    const b = base();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cw, ch);
    g.setTransform(dpr * b.k, 0, 0, dpr * b.k, dpr * b.ox, dpr * b.oy);

    const rvs = t?.rvs ?? 1;
    const constr = clamp(1 / Math.pow(rvs, 1.6), 0.35, 1.2);
    const perf = e?.perfusion ?? { cerveau: 1, coeur: 1, reins: 1, membres: 1, poumons: 1 };

    // Vaisseaux de la grande circulation.
    const rig = t?.rigidite ?? 0.1;
    const coulAo = rgb(mixC([214, 66, 76], [226, 206, 170], clamp((rig - 0.2) / 0.7, 0, 1)));
    ligne([AO, [520, 282], [600, 262], [720, 262], [780, 300], [780, 708]], 15, coulAo);
    ligne([[780, 300], [780, 60]], 11, coulAo);
    ligne([[220, 60], [220, 708]], 13, '#4a6bd0');
    ligne([[220, 300], [360, 326]], 12, '#4a6bd0');
    ligne([[220, 400], [360, 370]], 13, '#4a6bd0');
    // Artères des organes (artérioles resserrées en cas d'HTA).
    const plC = t?.plaqueCarotide ?? 0, plM = t?.plaqueMembres ?? 0;
    ligne([[780, 60], [640, 56]], 8 * (1 - 0.6 * plC), '#e04a58');
    ligne([[780, 632], [610, 632]], 8, '#e04a58');
    ligne([[780, 708], [610, 708]], 8 * (1 - 0.6 * plM), '#e04a58');
    for (const [x, y] of [[640, 56], [610, 632], [610, 708]] as Pt[]) ligne([[x, y], [x - 26, y]], 7 * constr, '#e04a58');
    ligne([[370, 56], [220, 60]], 9, '#4a6bd0');
    ligne([[390, 632], [220, 632]], 9, '#4a6bd0');
    ligne([[390, 708], [220, 708]], 9, '#4a6bd0');
    if (plC > 0.1) { g.fillStyle = '#f2c94c'; g.beginPath(); g.ellipse(700, 52, 16, 5 * plC + 2, 0, 0, 7); g.fill(); }
    if (plM > 0.1) { g.fillStyle = '#f2c94c'; g.beginPath(); g.ellipse(700, 703, 16, 5 * plM + 2, 0, 0, 7); g.fill(); }

    // Petite circulation.
    ligne([PU, [482, 262]], 13, '#4a6bd0');
    ligne([[482, 262], [430, 228], [395, 205]], 10, '#4a6bd0');
    ligne([[482, 262], [545, 232], [600, 214]], 10, '#4a6bd0');
    ligne([[458, 182], [530, 250], [578, 300], OG], 8, '#e04a58');
    ligne([[560, 196], [580, 292], OG], 8, '#e04a58');

    // Poumons.
    for (const [cx, cy] of [[405, 182], [598, 182]] as Pt[]) {
      g.fillStyle = 'rgba(250,170,180,0.16)'; g.strokeStyle = 'rgba(250,190,200,0.45)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(cx, cy, 72, 56, 0, 0, 7); g.fill(); g.stroke();
      capillaires(cx, cy, 104, 56, '#e04a58', '#5b7fd6');
      if (perf.poumons < 0.95) {
        g.fillStyle = `rgba(90,140,255,${0.55 * (1 - perf.poumons)})`;
        g.beginPath(); g.ellipse(cx, cy + 16, 66, 38, 0, 0, Math.PI); g.fill();
        for (let k = 0; k < 8 * (1 - perf.poumons); k++) { g.fillStyle = 'rgba(150,190,255,.8)'; g.beginPath(); g.arc(cx - 40 + ((k * 23) % 80), cy + 20 + ((k * 13) % 18), 3, 0, 7); g.fill(); }
      }
    }

    // Cerveau.
    const cCer = mixC(ISCH, [236, 150, 170], clamp(perf.cerveau, 0, 1));
    g.fillStyle = rgb(cCer, 0.35); g.strokeStyle = rgb(cCer, 0.9); g.lineWidth = 2;
    g.beginPath(); g.ellipse(500, 54, 118, 42, 0, 0, 7); g.fill(); g.stroke();
    capillaires(500, 56, 200, 50, '#e04a58', '#5b7fd6');
    const avc = t?.avc ?? 0;
    if (avc > 0.05) { g.fillStyle = `rgba(30,24,40,${0.5 + 0.4 * avc})`; g.beginPath(); g.ellipse(555, 46, 34 * avc + 10, 18 * avc + 6, 0.3, 0, 7); g.fill(); }

    // Reins.
    const cRein = mixC([150, 110, 110], [215, 90, 100], clamp(perf.reins * (t?.rein ?? 1), 0, 1));
    for (const x of [455, 545]) { g.fillStyle = rgb(cRein, 0.55); g.beginPath(); g.ellipse(x, 632, 42, 26, 0, 0, 7); g.fill(); }
    capillaires(500, 632, 200, 40, '#e04a58', '#5b7fd6');
    // Jambes.
    const cJ = mixC(ISCH, [225, 140, 150], clamp(perf.membres, 0, 1));
    for (const x of [470, 530]) {
      g.fillStyle = rgb(cJ, 0.35); g.beginPath(); g.roundRect(x - 24, 680, 48, 84, 18); g.fill();
      const oed = e?.oedemes ?? 0;
      if (oed > 0.03) {
        const yE = 764 - oed * 80;
        g.save(); g.beginPath(); g.roundRect(x - 24, 680, 48, 84, 18); g.clip();
        g.fillStyle = 'rgba(90,150,255,.45)'; g.fillRect(x - 24, yE + Math.sin(temps * 2 + x) * 2, 48, 90); g.restore();
      }
    }
    capillaires(500, 708, 200, 48, '#e04a58', '#5b7fd6');

    // ── Cœur ──
    const hvg = t?.hvg ?? 0, dil = t?.dilatation ?? 0;
    const cA = i.contractionA, cV = i.contractionV;
    const fe = e?.fe ?? 0.62;
    const sv = 1 - 0.1 * cV * (fe / 0.62);
    const dOG = 1 + 0.35 * Math.max(t?.rm ?? 0, (t?.im ?? 0) * 0.9, t?.rythme === 'fa' ? 0.25 : 0);
    const dOD = 1 + 0.35 * (t?.it ?? 0);
    const jit = i.fibrillation ? Math.sin(temps * 70) * 1.6 : 0;
    g.save();
    // Oreillettes.
    const sa = 1 - 0.08 * cA;
    g.save(); g.translate(414, 343); g.scale(sa * dOD, sa * dOD); g.translate(jit, 0); chambre(-64, -43, 128, 86, '#3d5cb8', 3); g.restore();
    g.save(); g.translate(586, 343); g.scale(sa * dOG, sa * dOG); g.translate(-jit, 0); chambre(-64, -43, 128, 86, '#b8343f', 3); g.restore();
    // Ventricules.
    g.save(); g.translate(424, 404); g.scale(sv, sv); chambre(-72, 0, 140, 140, '#3d5cb8', 4, 40); g.restore();
    g.save(); g.translate(500, 404); const sG = (1 + 0.25 * dil) * sv; g.scale(sG, sG);
    chambre(0, 0, 160, 170 * (1 + 0.1 * dil), '#b8343f', 6 + 22 * hvg, 46);
    // Zone d'infarctus / ischémie.
    const isch = Math.max(t?.ischemie ?? 0, t?.occlusion ?? 0);
    if (isch > 0.05) { g.fillStyle = `rgba(70,60,90,${0.4 + 0.5 * isch})`; g.beginPath(); g.ellipse(110, 120, 40 * isch + 14, 34 * isch + 10, 0.4, 0, 7); g.fill(); }
    else if (perf.coeur < 0.85) { g.fillStyle = `rgba(140,90,200,${0.25 + 0.3 * Math.abs(Math.sin(temps * 3))})`; g.beginPath(); g.ellipse(110, 120, 30, 26, 0.4, 0, 7); g.fill(); }
    g.restore();
    g.restore();
    // Thrombus dans l'auricule gauche.
    if (e?.thrombusOG) { g.fillStyle = '#4a0d12'; g.beginPath(); g.arc(636, 318, 10, 0, 7); g.fill(); g.strokeStyle = '#ff8090'; g.lineWidth = 1.5; g.stroke(); }
    // Coronaire.
    const plCo = t?.plaqueCoro ?? 0;
    ligne(CORO.slice(0, 4), 5 * (1 - 0.5 * plCo), '#ff6a74');
    if (plCo > 0.08) { g.fillStyle = '#f2c94c'; g.beginPath(); g.ellipse(590, 412, 12, 3 + 6 * plCo, 0.6, 0, 7); g.fill(); }
    if ((t?.occlusion ?? 0) > 0.3 || ((t?.ischemie ?? 0) > 0.2 && plCo > 0.85)) { g.fillStyle = '#5a0a10'; g.beginPath(); g.arc(600, 418, 7, 0, 7); g.fill(); }
    // Valves.
    valve2d(TRI, true, i.ouvertureAV, 0, t?.it ?? 0);
    valve2d(MI, true, i.ouvertureAV, t?.rm ?? 0, t?.im ?? 0);
    valve2d(PU, false, i.ouvertureSig, 0, 0);
    valve2d(AO, false, i.ouvertureSig, t?.ra ?? 0, t?.ia ?? 0);
    // Conduction.
    const bav = t?.rythme === 'bav3';
    g.strokeStyle = 'rgba(255,214,110,.6)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(366, 312); g.lineTo(498, 412); g.lineTo(500, 520); g.lineTo(470, 560); g.moveTo(500, 520); g.lineTo(560, 570); g.stroke();
    const flash = i.onde >= 0 ? 1 : 0.35;
    g.fillStyle = `rgba(255,214,110,${flash})`; g.beginPath(); g.arc(366, 312, 7, 0, 7); g.fill();
    g.beginPath(); g.arc(498, 412, 6, 0, 7); g.fill();
    if (i.onde >= 0) {
      const u = bav ? Math.min(i.onde, 0.4) : i.onde;
      const p: Pt = u < 0.4 ? [lerp(366, 498, u / 0.4), lerp(312, 412, u / 0.4)] : [lerp(498, 500, (u - 0.4) / 0.6), lerp(412, 540, (u - 0.4) / 0.6)];
      g.fillStyle = '#fff6c0'; g.shadowColor = '#ffd36a'; g.shadowBlur = 14; g.beginPath(); g.arc(p[0], p[1], 6, 0, 7); g.fill(); g.shadowBlur = 0;
    }
    if (bav) { g.strokeStyle = '#ff3344'; g.lineWidth = 4; g.beginPath(); g.moveTo(488, 402); g.lineTo(508, 422); g.moveTo(508, 402); g.lineTo(488, 422); g.stroke(); }
    if (i.fibrillation) {
      g.strokeStyle = 'rgba(255,220,120,.8)'; g.lineWidth = 1.4;
      for (let k = 0; k < 6; k++) {
        const cx = (k % 2 ? 586 : 414) + (Math.random() - 0.5) * 80, cy = 343 + (Math.random() - 0.5) * 50;
        g.beginPath(); g.moveTo(cx, cy); for (let s = 0; s < 4; s++) g.lineTo(cx + (Math.random() - 0.5) * 22, cy + (Math.random() - 0.5) * 22); g.stroke();
      }
    }

    // Particules de sang.
    for (const p of parts) {
      const [x, y] = pointAt(p.c, p.s);
      const col = couleurSang(p.c, p.s);
      g.fillStyle = rgb(col);
      g.beginPath(); g.arc(x + p.o * 3, y + p.o * 2, 3.1, 0, 7); g.fill();
    }
    // LDL.
    const nLdl = t ? Math.round(clamp((t.ldl - 2.2) / 2.8, 0, 1) * 40) : 0;
    g.fillStyle = '#ffd84a';
    for (let k = 0; k < nLdl; k++) { const p = parts[k * 7 % parts.length]; if (p.s > p.c.capP[1] && p.s < p.c.capO[0]) { const [x, y] = pointAt(p.c, (p.s + 0.01) % 1); g.beginPath(); g.arc(x - p.o * 3, y - p.o * 3, 2.1, 0, 7); g.fill(); } }
    // Jets.
    for (const j of jets) { g.globalAlpha = clamp(j.vie * 2.5, 0, 1); g.fillStyle = j.c; g.beginPath(); g.arc(j.x, j.y, 2.4, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    // Emboles.
    for (const em of emboles) {
      const [x, y] = pointAt(em.c, em.s);
      g.fillStyle = '#2a0508'; g.strokeStyle = '#ff6070'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke();
      if (em.arret > 0) texte('Caillot → AVC', x, y - 18, 12.5 / Math.sqrt(vue.s), '#ffb3bd');
    }

    // Étiquettes des atteintes (toujours visibles).
    if (t && e) {
      const tags: [string, number, number, string][] = [];
      const valve = (st: number, fu: number) => (st > 0.25 && fu > 0.25 ? 'Rétrécie et fuit' : st > 0.25 ? 'Valve rétrécie' : 'Valve qui fuit');
      if (t.ra > 0.25 || t.ia > 0.25) tags.push([valve(t.ra, t.ia), 560, 372, '#ffb03a']);
      if (t.rm > 0.25 || t.im > 0.25) tags.push([valve(t.rm, t.im), 640, 398, '#ffb03a']);
      if (t.it > 0.25) tags.push(['Valve qui fuit', 360, 398, '#ffb03a']);
      if (t.ischemie > 0.1) tags.push(['Nécrose', 610, 525, '#ff6b78']);
      else if (e.fe < 0.42) tags.push(['Contraction faible', 610, 525, '#8fb8ff']);
      if (t.hvg > 0.35) tags.push(['Paroi épaissie', 580, 588, '#c9a7ff']);
      if (e.postcharge > 1.25) tags.push(['Post-charge ↑', 700, 245, '#ffb03a']);
      if (t.rythme === 'bav3') tags.push(['Bloc : rythme lent', 498, 432, '#ff6b78']);
      if (t.rythme === 'fa') tags.push(['Fibrillation', 500, 300, '#ffe066']);
      if (e.perfusion.poumons < 0.8) tags.push(['Poumons noyés', 500, 250, '#8fb8ff']);
      const fx = effetsVisibles(e);
      if (fx.anticoagulant) tags.push(['Anticoagulant : plus de caillot', 640, 300, '#6ee7b7']);
      if (fx.bradycardie) tags.push([`Bêtabloquant : ${e.fc}/min`, 430, 300, '#6ee7b7']);
      if (fx.vasodilatation && e.postcharge <= 1.25) tags.push(['Post-charge ↓', 700, 245, '#6ee7b7']);
      const k = 11.5 / Math.sqrt(vue.s);
      for (const [tx, x, y, c] of tags) {
        g.font = `700 ${k}px "Plus Jakarta Sans", system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const w = g.measureText(tx).width;
        g.fillStyle = c; g.beginPath(); g.roundRect(x - w / 2 - 6, y - k * 0.8, w + 12, k * 1.6, 8); g.fill();
        g.fillStyle = '#1a0d06'; g.fillText(tx, x, y);
      }
    }

    // Étiquettes et surbrillance.
    for (const r of REGIONS) {
      if (r.z === choisi || r.z === survol) {
        g.strokeStyle = r.z === choisi ? 'rgba(125,211,252,.95)' : 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.setLineDash([6, 4]);
        g.beginPath(); g.roundRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 10); g.stroke(); g.setLineDash([]);
      }
    }
    if (labels) {
      const pos: Partial<Record<ZoneId, Pt>> = {
        od: [414, 330], og: [586, 330], vd: [424, 480], vg: [580, 500], aorte: [660, 248], artPulm: [440, 262], poumons: [500, 128],
        cerveau: [500, 22], reins: [500, 660], membres: [620, 750], veinesCaves: [190, 520], veinesPulm: [560, 280], coronaires: [670, 470], carotides: [720, 30],
      };
      for (const [z, p] of Object.entries(pos) as [ZoneId, Pt][]) if (noms[z]) texte(noms[z]!, p[0], p[1], 12.5 / Math.sqrt(vue.s));
    }
  }

  function avancer(i: Instant, dt: number) {
    const e = etat; const t = e?.terrain;
    const vit = 230 * clamp((e?.debit ?? 5) / 5, 0.35, 1.6);
    const facteurOrg: Record<string, number> = {
      cerveau: e?.perfusion.cerveau ?? 1, reins: e?.perfusion.reins ?? 1, membres: e?.perfusion.membres ?? 1, coeur: Math.min(1, e?.perfusion.coeur ?? 1),
    };
    for (const p of parts) {
      const c = p.c;
      let v = vit;
      for (const a of c.sAV) if (p.s < a && p.s > a - 0.015 && i.ouvertureAV < 0.5) v *= 0.03;
      for (const a of c.sSig) {
        if (p.s < a && p.s > a - 0.015 && i.ouvertureSig < 0.3) v *= 0.03;
        if (p.s > a && p.s < a + 0.06) v *= 0.5 + 1.5 * i.ouvertureSig;
      }
      if (p.s > c.capO[0] - 0.08 && p.s < c.capO[1]) v *= 0.35 + 0.65 * facteurOrg[c.organe.slice(0, -1)];
      if (p.s > c.capP[0] && p.s < c.capP[1]) v *= 0.7;
      p.s += (v * dt) / c.len;
      if (p.s >= 1) p.s -= 1;
    }
    // Jets.
    if (t) {
      const systole = i.contractionV > 0.25 && i.phase !== 'remplissage';
      const diastole = i.phase === 'remplissage' || i.phase === 'isoRelaxation';
      const jet = (o: Pt, vx: number, vy: number, s: number, c: string) => { if (Math.random() < s * 2.5) jets.push({ x: o[0], y: o[1], vx: vx * (0.8 + Math.random() * 0.4) + (Math.random() - 0.5) * 30, vy: vy * (0.8 + Math.random() * 0.4) + (Math.random() - 0.5) * 30, vie: 0.5, c }); };
      if (t.im > 0.15 && systole) jet(MI, 0, -170, t.im, '#ff9a4a');
      if (t.it > 0.15 && systole) jet(TRI, 0, -150, t.it, '#9ab0ff');
      if (t.ia > 0.15 && diastole) jet(AO, 30, 160, t.ia, '#ff9a4a');
      if (t.ra > 0.25 && i.ouvertureSig > 0.3) jet(AO, 0, -320, t.ra, '#fff0a0');
      if (t.rm > 0.25 && i.ouvertureAV > 0.5) jet(MI, -10, 260, t.rm, '#fff0a0');
    }
    for (let k = jets.length - 1; k >= 0; k--) { const j = jets[k]; j.vie -= dt; j.x += j.vx * dt; j.y += j.vy * dt; if (j.vie <= 0) jets.splice(k, 1); }
    // Emboles (FA sans anticoagulant).
    if (e?.thrombusOG) {
      prochainEmbole -= dt;
      if (prochainEmbole <= 0 && emboles.length < 2) {
        prochainEmbole = 7 + Math.random() * 4;
        const c = circuits.find((x) => x.organe === 'cerveaug')!;
        const sOG = c.cum[COEUR_DEBUT.length + POUMON_G.length - 1] / c.len;
        emboles.push({ c, s: sOG, arret: 0 });
      }
    } else emboles.length = 0;
    for (let k = emboles.length - 1; k >= 0; k--) {
      const em = emboles[k];
      if (em.arret > 0) { em.arret -= dt; if (em.arret <= 0) emboles.splice(k, 1); continue; }
      em.s += (vit * 0.9 * dt) / em.c.len;
      if (em.s >= em.c.capO[0] + 0.01) { em.arret = 2.5; }
    }
  }

  function frame(i: Instant, dt: number) {
    temps += dt;
    if (anim) {
      anim.t = Math.min(1, anim.t + dt / 0.7);
      const k = anim.t * anim.t * (3 - 2 * anim.t);
      vue.s = lerp(anim.de.s, anim.a.s, k); vue.cx = lerp(anim.de.cx, anim.a.cx, k); vue.cy = lerp(anim.de.cy, anim.a.cy, k);
      if (anim.t >= 1) anim = null;
    }
    avancer(i, dt);
    dessiner(i);
  }

  return {
    frame,
    maj(e) { etat = e; },
    focus(z) {
      const r = z ? REGIONS.find((x) => x.z === z) : null;
      const a = r ? { s: clamp(Math.min(W / (r.w + 280), H / (r.h + 260)), opt.coeur ? 2.15 : 1, opt.coeur ? 3.4 : 2.4), cx: r.x + r.w / 2, cy: r.y + r.h / 2 } : { ...VUE0 };
      anim = { t: 0, de: { ...vue }, a };
    },
    selection(z) { choisi = z; },
    setEtiquettes(on, n) { labels = on; noms = n; },
    setDefinition(pr) { defImposee = pr; redim(); },
    dispose() { ro.disconnect(); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onClick); cv.remove(); },
  };
}
