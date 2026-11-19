'use strict';
const VERSION="08d7e5e42a802a4a";
const ASSETS=[
  "./index.html",
  "./assets/apple-touch-icon.png?v=08d7e5e42a802a4a",
  "./assets/bottiglia.webp?v=08d7e5e42a802a4a",
  "./assets/cache.js?v=08d7e5e42a802a4a",
  "./assets/config.js?v=08d7e5e42a802a4a",
  "./assets/etichetta.webp?v=08d7e5e42a802a4a",
  "./assets/favicon-96.png?v=08d7e5e42a802a4a",
  "./assets/favicon.svg?v=08d7e5e42a802a4a",
  "./assets/logo.png?v=08d7e5e42a802a4a",
  "./assets/logo.svg?v=08d7e5e42a802a4a",
  "./assets/newsletter.js?v=08d7e5e42a802a4a",
  "./assets/poggio-del-marchese-social.jpg?v=08d7e5e42a802a4a",
  "./assets/poggio-del-marchese.glb?v=08d7e5e42a802a4a",
  "./assets/scene.js?v=08d7e5e42a802a4a",
  "./assets/site.css?v=08d7e5e42a802a4a",
  "./assets/site.js?v=08d7e5e42a802a4a",
  "./assets/vendor/fonts/CormorantGaramond-500.woff2?v=08d7e5e42a802a4a",
  "./assets/vendor/fonts/CormorantGaramond-italic-500.woff2?v=08d7e5e42a802a4a",
  "./assets/vendor/fonts/Jost-400.woff2?v=08d7e5e42a802a4a",
  "./assets/vendor/fonts/OFL-CormorantGaramond.txt?v=08d7e5e42a802a4a",
  "./assets/vendor/fonts/OFL-Jost.txt?v=08d7e5e42a802a4a",
  "./assets/vendor/fonts.css?v=08d7e5e42a802a4a",
  "./assets/vendor/GLTFLoader.js?v=08d7e5e42a802a4a",
  "./assets/vendor/LICENSE-three.txt?v=08d7e5e42a802a4a",
  "./assets/vendor/three.min.js?v=08d7e5e42a802a4a"
];
const PREFIX='poggio-experience:'+new URL(self.registration.scope).pathname+':';
const NAME=PREFIX+VERSION;
const absolute=path=>new URL(path,self.registration.scope).href;
const urls=new Set(ASSETS.map(absolute));
const documentURL=absolute('./index.html');

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    try{
      const cache=await caches.open(NAME);
      // Versioned URLs avoid reusing old browser HTTP responses after an update.
      await cache.addAll(ASSETS.map(path=>new Request(absolute(path),{cache:path==='./index.html'?'reload':'default'})));
      await self.skipWaiting();
    }catch(error){
      await caches.delete(NAME);throw error;
    }
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==NAME).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    // Navigation sees online updates; only a successfully installed snapshot is used offline.
    const url=new URL(request.url),scope=new URL(self.registration.scope);
    if(url.pathname!==scope.pathname&&url.pathname!==new URL(documentURL).pathname)return;
    event.respondWith(fetch(new Request(request,{cache:'no-cache'})).catch(async()=>{
      const cache=await caches.open(NAME),saved=await cache.match(documentURL);
      return saved||Response.error();
    }));
  }else if(urls.has(request.url)){
    event.respondWith((async()=>{
      try{
        const cache=await caches.open(NAME),saved=await cache.match(request);
        if(saved)return saved;
        const response=await fetch(request);
        if(response.ok)await cache.put(request,response.clone()).catch(()=>{});
        return response;
      }catch(_){return fetch(request);}
    })());
  }
});
