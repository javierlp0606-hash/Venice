const V='mop4-v1';
const SHELL=['./','./index.html','./style.css','./core.js','./data/providers.json','./data/games.json',
  './pages/home.js','./pages/web.js','./pages/movies.js','./pages/anime.js','./pages/games.js','./pages/ai.js',
  './pages/settings.js','./pages/profile.js'];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(V).then(c=>Promise.allSettled(SHELL.map(u=>c.add(u)))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  if(r.mode==='navigate'){e.respondWith(fetch(r).catch(()=>caches.match('./index.html')));return}
  if(u.origin!==location.origin)return;
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{
    const cl=res.clone();caches.open(V).then(c=>c.put(r,cl));return res}).catch(()=>hit)));
});
