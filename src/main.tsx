import { createRoot } from 'react-dom/client';
import App from './ui/App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Hors ligne et installation sur l'écran d'accueil (version publiée seulement).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
