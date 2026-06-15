const CACHE_NAME = 'wc-minigames-v1';
const PRECACHE = [
  '/wc/',
  '/wc/shared/style.css',
  '/wc/manifest.json',
  '/wc/games/penalty-kick-duel/index.html',
  '/wc/games/penalty-kick-duel/game.js',
  '/wc/games/penalty-kick-duel/style.css',
  '/wc/games/var-replay/index.html',
  '/wc/games/var-replay/game.js',
  '/wc/games/var-replay/style.css',
  '/wc/games/kit-designer/index.html',
  '/wc/games/kit-designer/game.js',
  '/wc/games/kit-designer/style.css',
  '/wc/games/penalty-marathon/index.html',
  '/wc/games/penalty-marathon/game.js',
  '/wc/games/penalty-marathon/style.css',
  '/wc/games/formation-tactician/index.html',
  '/wc/games/formation-tactician/game.js',
  '/wc/games/formation-tactician/style.css',
  '/wc/games/goal-celebration/index.html',
  '/wc/games/goal-celebration/game.js',
  '/wc/games/goal-celebration/style.css',
  '/wc/games/bracket-predictor/index.html',
  '/wc/games/bracket-predictor/game.js',
  '/wc/games/bracket-predictor/style.css',
  '/wc/games/ref-simulator/index.html',
  '/wc/games/ref-simulator/game.js',
  '/wc/games/ref-simulator/style.css',
  '/wc/games/crowd-wave/index.html',
  '/wc/games/crowd-wave/game.js',
  '/wc/games/crowd-wave/style.css',
  '/wc/games/stadium-builder/index.html',
  '/wc/games/stadium-builder/game.js',
  '/wc/games/stadium-builder/style.css',
  '/wc/games/jigsaw/index.html',
  '/wc/games/jigsaw/game.js',
  '/wc/games/jigsaw/style.css',
  '/wc/games/maze/index.html',
  '/wc/games/maze/game.js',
  '/wc/games/maze/style.css',
  '/wc/games/sticker-collector/index.html',
  '/wc/games/sticker-collector/game.js',
  '/wc/games/sticker-collector/style.css',
  '/wc/games/penalty-wall/index.html',
  '/wc/games/penalty-wall/game.js',
  '/wc/games/penalty-wall/style.css',
  '/wc/games/typing-race/index.html',
  '/wc/games/typing-race/game.js',
  '/wc/games/typing-race/style.css',
  '/wc/games/draw-play/index.html',
  '/wc/games/draw-play/game.js',
  '/wc/games/draw-play/style.css',
  '/wc/games/soccer-physics/index.html',
  '/wc/games/soccer-physics/game.js',
  '/wc/games/soccer-physics/style.css',
  '/wc/games/hide-seek/index.html',
  '/wc/games/hide-seek/game.js',
  '/wc/games/hide-seek/style.css',
  '/wc/games/photo-album/index.html',
  '/wc/games/photo-album/game.js',
  '/wc/games/photo-album/style.css',
  '/wc/games/foodtruck/index.html',
  '/wc/games/foodtruck/game.js',
  '/wc/games/foodtruck/style.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
