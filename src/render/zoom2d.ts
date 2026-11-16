/**
 * Zoom et déplacement des scènes 2D : molette, pincement à deux doigts, glisser quand on a zoomé,
 * et boutons +/− (animés). Un glisser ou un pincement n'est pas pris pour un clic sur une zone.
 */
export interface Vue2D { s: number; cx: number; cy: number }

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function installerZoom2D(cv: HTMLCanvasElement, o: {
  vue: Vue2D;
  /** Cadrage de départ (sert de zoom minimal et de retour « Tout voir »). */
  vue0: Vue2D;
  sMax: number;
  W: number; H: number;
  taille: () => [number, number];
  /** Facteur d'échelle de base (pixels par unité du dessin, sans zoom). */
  k0: () => number;
  animer: (a: Vue2D) => void;
  arreterAnim: () => void;
}) {
  const { vue } = o;
  const sMin = o.vue0.s * 0.9;
  const pts = new Map<number, { x: number; y: number }>();
  let deplace = false, distance0 = 0, s0 = 1, parcours = 0;

  const borner = () => {
    vue.s = clamp(vue.s, sMin, o.sMax);
    vue.cx = clamp(vue.cx, 0, o.W); vue.cy = clamp(vue.cy, 0, o.H);
  };
  /** Zoom de facteur f en gardant fixe le point (px, py) de l'écran. */
  const zoomAutour = (px: number, py: number, s1: number) => {
    const [cw, ch] = o.taille();
    const k = o.k0() * vue.s;
    const wx = vue.cx + (px - cw / 2) / k, wy = vue.cy + (py - ch / 2) / k;
    vue.s = clamp(s1, sMin, o.sMax);
    const k1 = o.k0() * vue.s;
    vue.cx = wx - (px - cw / 2) / k1; vue.cy = wy - (py - ch / 2) / k1;
    borner();
  };
  const local = (ev: PointerEvent | WheelEvent) => { const r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };

  const down = (ev: PointerEvent) => {
    pts.set(ev.pointerId, local(ev));
    if (pts.size === 1) { deplace = false; parcours = 0; }
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      distance0 = Math.hypot(a.x - b.x, a.y - b.y) || 1; s0 = vue.s; deplace = true; o.arreterAnim();
    }
  };
  const move = (ev: PointerEvent) => {
    const avant = pts.get(ev.pointerId);
    if (!avant) return;
    const p = local(ev);
    pts.set(ev.pointerId, p);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAutour((a.x + b.x) / 2, (a.y + b.y) / 2, s0 * (d / distance0));
    } else if (pts.size === 1 && vue.s > o.vue0.s * 1.02) {
      const dx = p.x - avant.x, dy = p.y - avant.y;
      parcours += Math.abs(dx) + Math.abs(dy);
      if (parcours > 6) { deplace = true; o.arreterAnim(); }
      if (deplace) { const k = o.k0() * vue.s; vue.cx -= dx / k; vue.cy -= dy / k; borner(); }
    }
  };
  const up = (ev: PointerEvent) => { pts.delete(ev.pointerId); };
  const wheel = (ev: WheelEvent) => {
    ev.preventDefault(); o.arreterAnim();
    const p = local(ev);
    zoomAutour(p.x, p.y, vue.s * Math.exp(-ev.deltaY * 0.0015));
  };
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', wheel, { passive: false });
  cv.style.touchAction = 'none';

  return {
    /** Vrai si le dernier geste était un glisser ou un pincement (pas un clic). */
    aDeplace: () => deplace,
    zoomer(f: number) {
      const s = clamp(vue.s * f, sMin, o.sMax);
      o.animer({ s, cx: vue.cx, cy: vue.cy });
    },
    dispose() {
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up);
      cv.removeEventListener('wheel', wheel);
    },
  };
}
