/** Signalement pré-rempli (WhatsApp ou copie) avec le contexte de la simulation. */
import { useState } from 'react';
import { Copy, MessageCircle, X, type LucideProps } from 'lucide-react';

/** Numéro au format international sans « + » (requis par les liens wa.me). */
export const WHATSAPP = '221774144799';
export const WHATSAPP_AFFICHE = '+221 77 414 47 99';

/** Pictogramme « contacter » : bulle de discussion avec un cœur. */
export function IconeContact({ size = 16, ...p }: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path d="M12 15.5s-3.5-2.1-3.5-4.4A1.9 1.9 0 0 1 12 10a1.9 1.9 0 0 1 3.5 1.1c0 2.3-3.5 4.4-3.5 4.4Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Illustration d'en-tête : deux bulles (question, réponse) et un cœur. */
function Illustration() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-auto max-h-24" role="img" aria-label="Illustration : échanger avec l'auteur">
      <defs><linearGradient id="sg-v" x1="0" x2="1"><stop offset="0" stopColor="#25d366" /><stop offset="1" stopColor="#128c7e" /></linearGradient></defs>
      <circle cx="80" cy="45" r="40" fill="#25d366" opacity=".07" />
      <g transform="translate(26 14)">
        <rect width="62" height="36" rx="12" fill="#1b2336" stroke="#2a344b" />
        <path d="M14 36 l-4 10 l12 -10Z" fill="#1b2336" stroke="#2a344b" strokeLinejoin="round" />
        <path d="M14 36 h8" stroke="#1b2336" strokeWidth="2" />
        <circle cx="19" cy="18" r="3.2" fill="#94a3b8" /><circle cx="31" cy="18" r="3.2" fill="#94a3b8" /><circle cx="43" cy="18" r="3.2" fill="#94a3b8" />
      </g>
      <g transform="translate(74 38)">
        <rect width="60" height="34" rx="12" fill="url(#sg-v)" />
        <path d="M46 34 l6 10 l-14 -10Z" fill="#128c7e" />
        <path d="M30 26s-9-5.4-9-11.2A4.8 4.8 0 0 1 30 12a4.8 4.8 0 0 1 9 2.8C39 20.6 30 26 30 26Z" fill="#fff" />
      </g>
    </svg>
  );
}

const TYPES = ['Bug', 'Erreur médicale', 'Suggestion', 'Autre'] as const;

export function Signalement({ contexte, onClose }: { contexte: string; onClose: () => void }) {
  const [type, setType] = useState<(typeof TYPES)[number]>('Bug');
  const [msg, setMsg] = useState('');
  const [copie, setCopie] = useState(false);
  const texte = `Hémodyssée — ${type}\n\n${msg || '(décrivez ici ce que vous avez constaté)'}\n\n— Contexte —\n${contexte}`;
  const lien = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texte)}`;
  const copier = async () => { try { await navigator.clipboard.writeText(texte); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* presse-papiers indisponible */ } };
  return (
    <div className="fixed inset-0 z-50 bg-ink/90 sm:bg-ink/80 sm:backdrop-blur-sm grid place-items-center p-4 overscroll-contain" role="dialog" aria-modal="true" aria-label="Signaler" onClick={onClose}>
      <div className="max-w-lg w-full max-h-[90dvh] overflow-y-auto rounded-3xl border border-line bg-panel p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start"><h2 className="font-display text-2xl">Contacter ou signaler</h2><button className="btn-icone !w-11 !h-11 -mt-1 -mr-1 active:scale-95 transition-transform" onClick={onClose} aria-label="Fermer"><X size={15} /></button></div>
        <Illustration />
        <p className="text-sm text-muted -mt-1">Une question, une erreur, une idée ? Écrivez directement au Dr Oumar Sow.</p>
        <div className="seg !grid grid-cols-2 sm:grid-cols-4 w-full" role="radiogroup" aria-label="Type">{TYPES.map((t) => <button key={t} role="radio" aria-checked={type === t} className={`min-h-10 touch-manipulation transition-colors active:bg-card2 ${type === t ? 'actif' : ''}`} onClick={() => setType(t)}>{t}</button>)}</div>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="Ce que vous avez vu, ce qui devrait se passer…" className="w-full rounded-xl bg-card border border-line p-3 text-base sm:text-sm outline-none focus:border-accent/60" />
        <details className="text-xs text-dim"><summary className="cursor-pointer py-2 -my-1">Contexte joint automatiquement</summary><pre className="whitespace-pre-wrap mt-1.5 font-mono text-[11px]">{contexte}</pre></details>
        <div className="flex flex-wrap gap-2">
          <a href={lien} target="_blank" rel="noopener noreferrer" className="flex-1 min-h-12 rounded-xl bg-[#25d366] text-[#062b14] font-bold text-sm py-2.5 inline-flex items-center justify-center gap-2 touch-manipulation transition-transform active:scale-[.97] active:brightness-95"><MessageCircle size={16} /> Envoyer sur WhatsApp</a>
          <button onClick={copier} className="min-h-12 rounded-xl border border-line px-4 text-sm font-semibold inline-flex items-center gap-2 touch-manipulation transition-transform active:scale-[.97] active:bg-card"><Copy size={15} /> {copie ? 'Copié' : 'Copier'}</button>
        </div>
        <p className="text-[11px] text-dim">Envoyé sur WhatsApp au {WHATSAPP_AFFICHE}.</p>
      </div>
    </div>
  );
}
