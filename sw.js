// Guarda os arquivos do aplicativo para abrir mais rápido e permitir instalar no celular.
// Os dados NUNCA são guardados aqui: vêm sempre do banco, após o login.
const VERSAO = 'v3';
const ARQUIVOS = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/ui.js', 'js/data.js', 'js/forms.js', 'js/views.js', 'js/schema.js', 'js/diagram.js', 'js/listas.js', 'js/acoes.js', 'js/preventiva.js', 'js/causas.js', 'js/metodos.js', 'js/inicio.js', 'js/estatistica.js', 'js/critcalc.js', 'js/config.js', 'vendor/supabase.js', 'icons/logo-claro.png', 'icons/logo-escuro.png', 'icons/favicon.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Rede primeiro (pega sempre a versão nova); se estiver sem internet, usa a cópia guardada.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request)));
});
