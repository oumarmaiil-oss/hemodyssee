/**
 * Aides au défilement du panneau sur écran tactile :
 * - une barre de glissement à droite, que l'on peut attraper au doigt pour aller vite ;
 * - un bouton « Haut » qui apparaît dès qu'on est descendu.
 * Sur ordinateur (souris), la barre native suffit : seul le bouton « Haut » est affiché.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { ArrowUp } from 'lucide-react';

const tactile = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export function AidesDefilement({ cible, cle }: { cible: RefObject<HTMLDivElement | null>; cle: string }) {
  const [etat, setEtat] = useState({ haut: 0, taille: 0, deborde: false, descendu: false });
  const piste = useRef<HTMLDivElement>(null);
  const glisse = useRef<{ y0: number; s0: number } | null>(null);

  useEffect(() => {
    const el = cible.current;
    if (!el) return;
    const maj = () => {
      const { scrollTop: st, scrollHeight: sh, clientHeight: ch } = el;
      const hPiste = piste.current?.clientHeight ?? ch;
      const taille = Math.max(36, (ch / sh) * hPiste);
      const haut = sh > ch ? (st / (sh - ch)) * (hPiste - taille) : 0;
      setEtat({ haut, taille, deborde: sh > ch + 40, descendu: st > 320 });
    };
    maj();
    el.addEventListener('scroll', maj, { passive: true });
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    const mo = new MutationObserver(maj);
    mo.observe(el, { childList: true, subtree: true });
    return () => { el.removeEventListener('scroll', maj); ro.disconnect(); mo.disconnect(); };
  }, [cible, cle]);

  // Changement d'onglet : on repart du haut.
  useEffect(() => { cible.current?.scrollTo({ top: 0 }); }, [cle, cible]);

  const versHaut = () => cible.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const debut = (e: React.PointerEvent) => {
    const el = cible.current; if (!el) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    glisse.current = { y0: e.clientY, s0: el.scrollTop };
  };
  const bouge = (e: React.PointerEvent) => {
    const el = cible.current, g = glisse.current, p = piste.current;
    if (!el || !g || !p) return;
    const course = p.clientHeight - etat.taille;
    if (course <= 0) return;
    el.scrollTop = g.s0 + ((e.clientY - g.y0) / course) * (el.scrollHeight - el.clientHeight);
  };
  const fin = () => { glisse.current = null; };
  // Toucher la piste (hors poignée) : saut à cet endroit.
  const sauter = (e: React.PointerEvent) => {
    const el = cible.current, p = piste.current;
    if (!el || !p || e.target !== p) return;
    const r = p.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (e.clientY - r.top - etat.taille / 2) / (r.height - etat.taille)));
    el.scrollTo({ top: k * (el.scrollHeight - el.clientHeight), behavior: 'smooth' });
  };

  return (
    <>
      {tactile && etat.deborde && (
        <div ref={piste} onPointerDown={sauter} className="absolute top-2 bottom-2 right-0 w-5 z-10 touch-none" aria-hidden="true">
          <div
            onPointerDown={debut} onPointerMove={bouge} onPointerUp={fin} onPointerCancel={fin}
            className="absolute right-0.5 w-4 flex justify-center touch-none cursor-grab active:cursor-grabbing"
            style={{ top: etat.haut, height: etat.taille }}
          >
            <div className="w-1.5 h-full rounded-full bg-muted/45 active:bg-accent" />
          </div>
        </div>
      )}
      {etat.descendu && (
        <button onClick={versHaut} className="absolute z-20 bottom-3 right-6 rounded-full bg-card2/95 border border-line shadow-lg px-3 h-9 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-txt active:scale-95 transition-transform fade-in" aria-label="Revenir en haut du panneau">
          <ArrowUp size={15} /> Haut
        </button>
      )}
    </>
  );
}
