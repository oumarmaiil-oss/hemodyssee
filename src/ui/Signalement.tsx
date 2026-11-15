/** Signalement pré-rempli (WhatsApp ou copie) avec le contexte de la simulation. */
import { useState } from 'react';
import { Copy, MessageCircle, X } from 'lucide-react';

export const WHATSAPP = 'drSOWOUMAR';

const TYPES = ['Bug', 'Erreur médicale', 'Suggestion', 'Autre'] as const;

export function Signalement({ contexte, onClose }: { contexte: string; onClose: () => void }) {
  const [type, setType] = useState<(typeof TYPES)[number]>('Bug');
  const [msg, setMsg] = useState('');
  const [copie, setCopie] = useState(false);
  const texte = `Hémodyssée — ${type}\n\n${msg || '(décrivez ici ce que vous avez constaté)'}\n\n— Contexte —\n${contexte}`;
  const lien = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texte)}`;
  const copier = async () => { try { await navigator.clipboard.writeText(texte); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* presse-papiers indisponible */ } };
  return (
    <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Signaler" onClick={onClose}>
      <div className="max-w-lg w-full rounded-3xl border border-line bg-panel p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start"><h2 className="font-display text-2xl">Signaler ou suggérer</h2><button className="btn-icone" onClick={onClose} aria-label="Fermer"><X size={15} /></button></div>
        <div className="seg flex-wrap">{TYPES.map((t) => <button key={t} className={type === t ? 'actif' : ''} onClick={() => setType(t)}>{t}</button>)}</div>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="Ce que vous avez vu, ce qui devrait se passer…" className="w-full rounded-xl bg-card border border-line p-3 text-sm outline-none focus:border-accent/60" />
        <details className="text-xs text-dim"><summary className="cursor-pointer">Contexte joint automatiquement</summary><pre className="whitespace-pre-wrap mt-1.5 font-mono text-[11px]">{contexte}</pre></details>
        <div className="flex flex-wrap gap-2">
          <a href={lien} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-xl bg-[#25d366] text-[#062b14] font-bold text-sm py-2.5 inline-flex items-center justify-center gap-2"><MessageCircle size={16} /> Envoyer sur WhatsApp</a>
          <button onClick={copier} className="rounded-xl border border-line px-4 text-sm font-semibold inline-flex items-center gap-2"><Copy size={15} /> {copie ? 'Copié' : 'Copier'}</button>
        </div>
        <p className="text-[11px] text-dim">Envoyé au Dr Oumar Sow (WhatsApp @{WHATSAPP}).</p>
      </div>
    </div>
  );
}
