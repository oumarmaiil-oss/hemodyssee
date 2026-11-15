/**
 * Tracés qui défilent sous la scène : ECG, et au besoin les pressions (diagramme
 * de Wiggers simplifié : pression du ventricule gauche, de l'aorte et de l'oreillette
 * gauche, plus le volume du ventricule).
 *
 * L'ECG suit les conventions habituelles : onde P (oreillettes), complexe QRS
 * (ventricules), onde T (repolarisation), vitesse de 25 mm/s et 10 mm/mV.
 */
import type { Instant } from '../core/clock.ts';
import type { Etat } from '../core/types.ts';

export type ModeTraces = 'aucun' | 'ecg' | 'tout';

const MM = 4.2; // pixels par millimètre de papier
const VITESSE = 25 * MM; // 25 mm/s
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const bosse = (x: number, c: number, l: number) => Math.exp(-(((x - c) / l) ** 2));

/** Valeur de l'ECG (en mV) à un instant du cycle. */
function ecgAt(i: Instant, e: Etat): number {
  const t = e.terrain;
  let v = 0;
  // Onde P : dépolarisation des oreillettes. Absente en fibrillation.
  if (!i.fibrillation) v += 0.14 * (1 + 0.6 * Math.min(1, Math.max(t.rm, t.im))) * bosse(i.uA, 0.035, 0.022);
  else v += 0.035 * Math.sin(i.u * 420) * Math.sin(i.u * 137); // trémulation de la ligne de base
  // QRS : dépolarisation des ventricules. Plus ample si le muscle est épaissi, plus large en bloc.
  const large = t.rythme === 'bav3' ? 1.9 : 1;
  const r = 1.05 + 0.75 * t.hvg - 0.3 * t.ischemie;
  v -= 0.1 * bosse(i.u, 0.118, 0.006 * large);
  v += r * bosse(i.u, 0.135, 0.009 * large);
  v -= 0.16 * bosse(i.u, 0.158, 0.008 * large);
  // Segment ST : sus-décalé en cas d'infarctus en cours, sous-décalé si le muscle manque d'oxygène.
  const st = t.occlusion > 0.2 || t.ischemie > 0.15 ? 0.22 : e.perfusion.coeur < 0.8 ? -0.12 : 0;
  if (i.u > 0.16 && i.u < 0.3) v += st * clamp((i.u - 0.16) / 0.04, 0, 1);
  // Onde T : repolarisation. Négative dans les territoires ischémiques.
  const t0 = t.ischemie > 0.15 ? -0.2 : t.hvg > 0.45 ? -0.12 : 0.3;
  v += t0 * bosse(i.u, 0.33, 0.055) + st * 0.5 * bosse(i.u, 0.33, 0.055);
  return v;
}

export interface Traces {
  frame(i: Instant, dt: number, e: Etat): void;
  setMode(m: ModeTraces): void;
  dispose(): void;
}

export function creerTraces(cv: HTMLCanvasElement): Traces {
  const g = cv.getContext('2d')!;
  let dpr = 1, cw = 1, ch = 1, mode: ModeTraces = 'ecg';
  const ro = new ResizeObserver(() => {
    cw = cv.clientWidth; ch = cv.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(cw * dpr)); cv.height = Math.max(1, Math.round(ch * dpr));
  });
  ro.observe(cv);

  // Échantillons : [ecg, pVG, pAo, pOG, volume]
  const buf: number[][] = [];
  let x = 0;

  function frame(i: Instant, dt: number, e: Etat) {
    if (mode === 'aucun' || !cw) return;
    x += VITESSE * dt;
    const pas = 1; // un échantillon par pixel
    while (x >= pas) {
      x -= pas;
      const pvg = i.phase === 'ejection' ? e.pvg * (0.75 + 0.25 * i.contractionV)
        : i.phase === 'isoContraction' ? e.pog + (e.pvg - e.pog) * i.contractionV
          : i.phase === 'isoRelaxation' ? e.pas * (0.35 + 0.5 * i.contractionV) : e.pog + 2 * i.contractionV;
      const pao = e.pad + (e.pas - e.pad) * (i.phase === 'ejection' ? 0.35 + 0.65 * i.ouvertureSig : Math.max(0, 1 - (i.u - 0.46) * 1.6));
      const pog = e.pog + 3 * i.contractionA;
      const vol = e.vtd - (e.vtd - (e.vtd - e.vesTotal)) * i.contractionV;
      buf.push([ecgAt(i, e), pvg, pao, pog, vol]);
      if (buf.length > cw + 4) buf.shift();
    }

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cw, ch);
    const lignes = mode === 'tout' ? 2 : 1;
    const hL = ch / lignes;

    // Papier millimétré.
    g.strokeStyle = 'rgba(224,65,78,.13)'; g.lineWidth = 1;
    g.beginPath();
    for (let px = cw % (5 * MM); px < cw; px += 5 * MM) { g.moveTo(px, 0); g.lineTo(px, ch); }
    for (let py = 0; py < ch; py += 5 * MM) { g.moveTo(0, py); g.lineTo(cw, py); }
    g.stroke();

    const trace = (idx: number, y0: number, h: number, coul: string, min: number, max: number, larg = 1.8) => {
      g.strokeStyle = coul; g.lineWidth = larg; g.lineJoin = 'round'; g.beginPath();
      const n = buf.length;
      for (let k = 0; k < n; k++) {
        const px = cw - (n - k);
        const y = y0 + h - ((buf[k][idx] - min) / (max - min)) * h;
        k === 0 ? g.moveTo(px, y) : g.lineTo(px, y);
      }
      g.stroke();
    };

    // ECG : 10 mm/mV, ligne de base aux deux tiers.
    const hEcg = hL;
    g.strokeStyle = 'rgba(148,163,184,.22)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, hEcg * 0.68); g.lineTo(cw, hEcg * 0.68); g.stroke();
    trace(0, 0, hEcg, '#5ef08a', -0.5, 1.6, 2);
    g.font = '600 10px "Plus Jakarta Sans", system-ui'; g.fillStyle = 'rgba(94,240,138,.8)'; g.textAlign = 'left';
    g.fillText('ECG · D2', 6, 12);

    if (mode === 'tout') {
      const y0 = hL;
      g.strokeStyle = 'rgba(148,163,184,.18)'; g.beginPath(); g.moveTo(0, y0); g.lineTo(cw, y0); g.stroke();
      const maxP = Math.max(140, e.pvg + 15);
      trace(2, y0 + 2, hL - 4, '#ff6b78', 0, maxP);      // aorte
      trace(1, y0 + 2, hL - 4, '#ffd84a', 0, maxP);      // ventricule gauche
      trace(3, y0 + 2, hL - 4, '#7dd3fc', 0, maxP);      // oreillette gauche
      g.fillStyle = 'rgba(233,238,248,.75)';
      g.fillText('Pressions  ', 6, y0 + 12);
      const leg: [string, string][] = [['VG', '#ffd84a'], ['Aorte', '#ff6b78'], ['OG', '#7dd3fc']];
      let lx = 62;
      for (const [nom, c] of leg) { g.fillStyle = c; g.fillText(nom, lx, y0 + 12); lx += g.measureText(nom).width + 12; }
      g.fillStyle = 'rgba(148,163,184,.7)'; g.textAlign = 'right'; g.fillText(`${Math.round(maxP)} mmHg`, cw - 6, y0 + 12);
    }
  }

  return { frame, setMode(m) { mode = m; buf.length = 0; }, dispose() { ro.disconnect(); } };
}
