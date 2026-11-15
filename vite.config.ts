import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Génère sw.js à la compilation avec la liste exacte des fichiers produits :
 * toute l'application (3D comprise) est mis en cache dès la première visite et
 * fonctionne ensuite hors connexion. La version change à chaque compilation,
 * ce qui remplace proprement l'ancien cache.
 */
function serviceWorker(): Plugin {
  return {
    name: 'hemodyssee-service-worker',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'sw.js');
      const statics = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
      const version = Date.now().toString(36);
      const source = `/* Généré à la compilation — ne pas modifier. */
const CACHE = 'hemodyssee-${version}';
const PRECACHE = ${JSON.stringify(['./', ...statics, ...files])};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hemodyssee-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Page : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./', { ignoreVary: true }))
    );
    return;
  }
  // Polices Google : servies depuis le cache, rafraîchies en arrière-plan.
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req, { ignoreVary: true }).then((hit) => {
          const net = fetch(req).then((res) => { c.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  // Fichiers de l'application (noms versionnés) : cache d'abord. ignoreVary : les scripts
  // « module » envoient un en-tête Origin absent lors de la mise en cache.
  e.respondWith(
    caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/hemodyssee/',
    plugins: [react(), tailwindcss(), serviceWorker()],
    build: {
      // three.js est isolé dans un fichier chargé à la demande (vues 3D).
      chunkSizeWarningLimit: 700,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
