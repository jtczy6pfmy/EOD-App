const CACHE_NAME="eod-inspection-v16";

self.addEventListener("install",event=>{
 event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate",event=>{
 event.waitUntil(
  caches.keys().then(keys=>
   Promise.all(
    keys
     .filter(key=>key!==CACHE_NAME)
     .map(key=>caches.delete(key))
   )
  ).then(()=>self.clients.claim())
 );
});

self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;

 const url=new URL(event.request.url);
 const isNavigation=
  event.request.mode==="navigate" ||
  url.pathname.endsWith("/index.html");

 if(isNavigation){
  event.respondWith(
   fetch(event.request,{cache:"no-store"})
    .then(async response=>{
     if(!response || !response.ok) return response;

     const contentType=response.headers.get("content-type")||"";
     if(!contentType.includes("text/html")) return response;

     let html=await response.text();

     // Prevent accidental app resets from browser hard-refresh shortcuts.
     const resetHandlerStart='// Global keydown handler for Ctrl + F5';
     const resetHandlerEnd='/* =========================================================\n   PREFIX DROPDOWN';
     const resetStart=html.indexOf(resetHandlerStart);
     const resetEnd=html.indexOf(resetHandlerEnd,resetStart);
     if(resetStart!==-1 && resetEnd!==-1){
      html=html.slice(0,resetStart)+html.slice(resetEnd);
     }

     // The only automatic reset is now tied to the EOD email action.
     html=html.replace(
      " window.location.href = mailtoUrl;",
      " window.location.href = mailtoUrl;\n setTimeout(()=>performHardReset(),1500);"
     );

     const headers=new Headers(response.headers);
     headers.set("Cache-Control","no-store");
     return new Response(html,{status:response.status,statusText:response.statusText,headers});
    })
    .catch(()=>caches.match(event.request))
  );
  return;
 }

 event.respondWith(
  fetch(event.request,{cache:"no-store"})
   .then(response=>{
    if(response&&response.ok&&url.origin===self.location.origin){
     const copy=response.clone();
     caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
    }
    return response;
   })
   .catch(()=>caches.match(event.request))
 );
});
