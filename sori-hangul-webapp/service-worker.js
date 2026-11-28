const CACHE_NAME='sori-hangul-rpg-v4';
const audio=[];
for(let i=1;i<=6;i++)audio.push(`q${i}.mp3`);
for(let i=0;i<9;i++)audio.push(`letter_${i}.mp3`);
audio.push('letter_yang.mp3','word_apple.mp3','word_banana.mp3','word_cat.mp3','country_0_6.mp3','country_0_7.mp3');
for(let country=1;country<5;country++)for(let i=0;i<8;i++)audio.push(`country_${country}_${i}.mp3`);
for(let country=0;country<5;country++)for(let i=0;i<6;i++)audio.push(`extra_${country}_${i}.mp3`);
const CORE=['./rpg/','./rpg/index.html','./rpg/progress.js?v=4','./rpg/hangul_voice/extra_questions.js','./manifest.webmanifest','./icon-192.png','./icon-512.png',...audio.map(x=>'./rpg/hangul_voice/'+x)];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sori-hangul-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // The separate math game must not fall back to the Korean RPG when offline.
 if(url.pathname.includes('/math/'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(async()=>{
   if(!url.pathname.includes('/rpg/'))return Response.redirect(new URL('./rpg/',self.registration.scope).href,302);
   return (await caches.match(new URL('./rpg/',self.registration.scope).href))||Response.error();
  }));return;
 }
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
