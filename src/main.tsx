import { createRoot } from 'react-dom/client';
import App from './ui/App.tsx';
import { Secours } from './ui/Secours.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<Secours><App /></Secours>);

// Hors ligne et installation sur l'écran d'accueil (version publiée seulement).
// Signature.
console.info('%cHémodyssée%c — conçu par le Dr O. Sow · version ' + __VERSION__, 'color:#e0414e;font-weight:700;font-size:14px', 'color:inherit');

// Les mises à jour arrivent toutes seules : à chaque nouvelle version publiée, l'application
// (installée ou non) la récupère et propose de recharger.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const avaitControleur = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (avaitControleur) window.dispatchEvent(new Event('hemo-maj')); });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((reg) => {
      const verifier = () => reg.update().catch(() => {});
      setInterval(verifier, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verifier(); });
    }).catch(() => {});
  });
}
