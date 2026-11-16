/**
 * Installation sur l'écran d'accueil : bandeau discret + fenêtre d'aide adaptée au navigateur.
 * Hémodyssée s'installe sans magasin d'applications (application web progressive).
 */
import { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

type Invite = (Event & { prompt: () => Promise<void> }) | null;

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
/** Déjà installée (ouverte depuis l'icône de l'écran d'accueil) ? */
export const estInstallee = () =>
  typeof window !== 'undefined' && (matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

function plateforme() {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  const android = /Android/.test(ua);
  const integre = /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|; wv\)|Snapchat|TikTok/.test(ua);
  const brave = typeof (navigator as Navigator & { brave?: unknown }).brave !== 'undefined';
  const navigateur = brave ? 'Brave' : /EdgiOS|EdgA|Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) && !/OPR|SamsungBrowser/.test(ua) ? 'Chrome'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'votre navigateur';
  return { ios, android, integre, navigateur };
}

export function BandeauInstaller({ onOuvrir }: { onOuvrir: () => void }) {
  const [masque, setMasque] = useState(() => { try { return localStorage.getItem('hemo.bandeau-installer') === '1'; } catch { return false; } });
  if (masque || estInstallee()) return null;
  const fermer = () => { setMasque(true); try { localStorage.setItem('hemo.bandeau-installer', '1'); } catch { /* stockage indisponible */ } };
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-line bg-accent/8 text-[12px]">
      <Smartphone size={14} className="text-accent shrink-0" />
      <button onClick={onOuvrir} className="flex-1 min-w-0 text-left truncate"><b className="text-txt">Installer Hémodyssée</b> <span className="text-muted">sur votre téléphone, sans magasin d'applications</span></button>
      <button onClick={onOuvrir} className="shrink-0 rounded-lg border border-accent/50 bg-accent/15 text-white font-semibold px-2.5 py-1 active:scale-95 transition-transform">Comment ?</button>
      <button onClick={fermer} className="shrink-0 text-dim hover:text-txt p-1" aria-label="Masquer ce bandeau"><X size={14} /></button>
    </div>
  );
}

export function FenetreInstaller({ invite, onInstalle, onClose }: { invite: Invite; onInstalle: () => void; onClose: () => void }) {
  const p = plateforme();
  const installer = async () => { if (!invite) return; await invite.prompt(); onInstalle(); onClose(); };
  const Etape = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <li className="flex gap-2.5"><span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold grid place-items-center shrink-0">{n}</span><span className="pt-0.5">{children}</span></li>
  );
  return (
    <div className="fixed inset-0 z-50 bg-ink/90 sm:bg-ink/80 sm:backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Installer Hémodyssée" onClick={onClose}>
      <div className="max-w-md w-full max-h-[90dvh] overflow-y-auto rounded-3xl border border-line bg-panel p-5 space-y-3.5 text-[14px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-2">
          <h2 className="font-display text-2xl">Installer Hémodyssée</h2>
          <button className="btn-icone !w-11 !h-11 -mt-1 -mr-1" onClick={onClose} aria-label="Fermer"><X size={15} /></button>
        </div>
        <p className="text-muted text-[13px]">Gratuit, sans App Store ni Play Store. Une icône apparaît sur l'écran d'accueil ; l'application fonctionne ensuite hors connexion et se met à jour toute seule.</p>

        {estInstallee() ? (
          <p className="rounded-xl bg-ok/10 border border-ok/40 p-3">✅ Hémodyssée est déjà installée sur cet appareil.</p>
        ) : invite ? (
          <button onClick={installer} className="w-full min-h-12 rounded-xl bg-accent text-ink font-bold inline-flex items-center justify-center gap-2"><Download size={17} /> Installer maintenant</button>
        ) : p.integre ? (
          <ol className="space-y-2.5">
            <Etape n={1}>Vous êtes dans le navigateur intégré d'une application (Facebook, WhatsApp, Instagram…) : il ne permet pas l'installation.</Etape>
            <Etape n={2}>Touchez le menu <b>« ··· »</b> ou <b>⋮</b> en haut, puis <b>« Ouvrir dans le navigateur »</b>{p.ios ? ' (Safari)' : ' (Chrome ou Brave)'}.</Etape>
            <Etape n={3}>Revenez ici : les instructions d'installation s'afficheront.</Etape>
          </ol>
        ) : p.ios ? (
          <ol className="space-y-2.5">
            <Etape n={1}>Touchez le bouton <b>Partager</b> <span className="text-muted">(carré avec une flèche vers le haut{p.navigateur === 'Safari' ? ', en bas de l\'écran' : ''})</span>{p.navigateur !== 'Safari' ? <> dans {p.navigateur}</> : null}.</Etape>
            <Etape n={2}>Faites défiler et choisissez <b>« Sur l'écran d'accueil »</b>.</Etape>
            <Etape n={3}>Touchez <b>« Ajouter »</b>.</Etape>
            {p.navigateur !== 'Safari' && <li className="text-[12px] text-dim">Si l'option n'apparaît pas dans {p.navigateur}, ouvrez le site dans <b>Safari</b> (iPhone avec iOS 16.4 ou plus récent requis pour les autres navigateurs).</li>}
          </ol>
        ) : p.android ? (
          <ol className="space-y-2.5">
            <Etape n={1}>Dans {p.navigateur}, touchez le menu <b>⋮</b>{p.navigateur === 'Brave' ? ' (en bas ou en haut à droite)' : ' en haut à droite'}.</Etape>
            <Etape n={2}>Choisissez <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.</Etape>
            <Etape n={3}>Confirmez avec <b>« Installer »</b>.</Etape>
          </ol>
        ) : (
          <ol className="space-y-2.5">
            <Etape n={1}>Sur ordinateur (Chrome, Edge, Brave) : cliquez sur l'icône d'installation <b>⊕</b> à droite de la barre d'adresse.</Etape>
            <Etape n={2}>Ou menu <b>⋮</b> → <b>« Installer Hémodyssée »</b>.</Etape>
            <Etape n={3}>Sur téléphone, ouvrez ce même lien : les instructions s'adapteront.</Etape>
          </ol>
        )}
        <p className="text-[11px] text-dim">Navigateur détecté : {p.integre ? 'navigateur intégré' : p.navigateur}{p.ios ? ' · iPhone/iPad' : p.android ? ' · Android' : ''}.</p>
      </div>
    </div>
  );
}
