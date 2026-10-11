const VERSAO = 'jogo-madeireiro-v3';
const ARQUIVOS = [
  './',
  'index.html',
  'estilo.css',
  'manifest.webmanifest',
  'icone.svg',
  'js/main.js',
  'js/jogo.js',
  'js/tela.js',
  'js/desenhos.js',
  'js/regras.js',
  'js/estado.js',
  'js/config.js',
  'js/salvar.js',
  'js/formato.js',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(caches.match(ev.request, { ignoreSearch: true }).then((achado) => achado || fetch(ev.request)));
});
