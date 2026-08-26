const CACHE_NAME="eod-inspection-v17";

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
     const resetHandlerEnd='/* =========================================================\\n   PREFIX DROPDOWN';
     const resetStart=html.indexOf(resetHandlerStart);
     const resetEnd=html.indexOf(resetHandlerEnd,resetStart);
     if(resetStart!==-1 && resetEnd!==-1){
      html=html.slice(0,resetStart)+html.slice(resetEnd);
     }

     // Build the EOD report in the exact requested email format.
     const reportStart=html.indexOf('function buildReportText(){');
     const reportEnd=html.indexOf('function generateEOD(){',reportStart);
     if(reportStart!==-1 && reportEnd!==-1){
      const reportFn=`function buildReportText(){
 const dateObj=new Date();
 const dateText=dateObj.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
 const terminalName=terminal.value || "NOT SPECIFIED";
 let txt=`+"`"+`End of Day Report\\n\\nDate: ${dateText}\\n\\nEnd of Day Report for:\\n\\n${terminalName}\\n\\n\\nCHASSIS\\n\\n`+"`"+`;

 const groups=[
  ["5652","Pre-repair","NO defects"],
  ["5652","Pre-repair","WITH defects"],
  ["5900","Post-repair","NO defects"],
  ["5900","Post-repair","WITH defects"],
  ["5658","Add-on","NO defects"],
  ["5658","Add-on","WITH defects"]
 ];

 function sectionLabel(section){
  if(section==="Pre-repair") return "pre-repair";
  if(section==="Post-repair") return "post repair";
  return "add-on";
 }

 function appendGroup(category,type,section,defectLabel,numberLabel){
  const items=(data[category][type] && data[category][type][section]) || [];
  const filtered=items.filter(item=>defectLabel==="NO defects" ? item[1]==="No Defect" : item[1]==="Defect");
  txt+=`+"`"+`(${filtered.length}) ${sectionLabel(section)} ${defectLabel} - ${type}\\n\\n${numberLabel}\\n\\n`+"`"+`;
  if(filtered.length===0){
   txt+=`+"`"+`1.\\n\\n`+"`"+`;
  }else{
   filtered.forEach((item,index)=>{
    txt+=`+"`+`${index+1}. ${item[0]}\\n\\n`+"`"+`;
   });
  }
 }

 groups.forEach(g=>appendGroup("chassis",g[0],g[1],g[2],"Chassis Numbers:"));

 txt+=`+"`+`\\n\\nCONTAINERS\\n\\n`+"`+`;
 groups.forEach(g=>appendGroup("containers",g[0],g[1],g[2],"Container Numbers:"));

 txt+=`+"`+`\\n\\nCHASSIS RACKS\\n\\n`+"`+`;
 appendGroup("racks","5657","Pre-repair","NO defects","Chassis Rack Numbers:");
 appendGroup("racks","5657","Pre-repair","WITH defects","Chassis Rack Numbers:");

 txt+=`+"`+`\\n\\n(${inspectionTotal()}) TOTAL INSPECTIONS\\n\\nComments or Notes of Interest`+"`"+`;
 if(notes.value.trim()) txt+=`+"`+`\\n${notes.value.trim()}`+"`"+`;
 return txt;
}

`;
      html=html.slice(0,reportStart)+reportFn+html.slice(reportEnd);
     }

     // The only automatic reset is tied to the EOD email action.
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
