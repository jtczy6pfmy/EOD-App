/* EOD-App durable cloud backup / recovery.
   Supabase is the durable source of truth; the browser local copy is shared
   across Safari/Home Screen instances for the current EOD day.
*/
(()=>{
  "use strict";
  const SUPABASE_URL="https://tjhsrydhkigvhlllnstm.supabase.co";
  const SUPABASE_KEY="sb_publishable_nB2sQ-lTf9mJrmb6UWn4vw_gLlsnYbv";
  const REST_URL=`${SUPABASE_URL}/rest/v1/eod_daily`;
  const HEADERS={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"};
  const PREFIX="eodInspectionReport_v13_";
  const d=new Date();
  const ISO_TODAY=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const SHARED_INSTANCE=`shared_${ISO_TODAY}`;
  // IMPORTANT: index.html runs after this file and uses instance_id to build
  // STORAGE_KEY. Keeping this ID stable makes a reopened iOS instance use the
  // same daily local record instead of creating a new one.
  try{sessionStorage.setItem("instance_id",SHARED_INSTANCE)}catch(e){}

  let syncing=false,queued=false,retryTimer=null,lastUploadedSignature="";
  const sharedKey=()=>PREFIX+SHARED_INSTANCE;
  const readLocal=()=>{try{const v=localStorage.getItem(sharedKey());return v?JSON.parse(v):null}catch(e){return null}};
  const terminal=()=>document.getElementById("terminal")?.value||"HARRISBURG";
  const dateISO=v=>{const m=String(v||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);return m?`20${m[3]}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`:null};

  function merge(a,b){
    if(a==null)return b;if(b==null)return a;
    if(Array.isArray(a)&&Array.isArray(b)){
      const out=a.slice(),seen=new Set(out.map(x=>JSON.stringify(x)));
      for(const x of b){const s=JSON.stringify(x);if(!seen.has(s)){seen.add(s);out.push(x)}}return out;
    }
    if(typeof a==="number"&&typeof b==="number")return Math.max(a,b);
    if(typeof a==="object"&&typeof b==="object"){
      const out={...a};for(const k of Object.keys(b))out[k]=k in out?merge(out[k],b[k]):b[k];return out;
    }
    return b||a;
  }
  const mergeStates=(cloud,local)=>!cloud?local:!local?cloud:{...merge(cloud,local),terminal:local.terminal||cloud.terminal,date:local.date||cloud.date};
  function writeLocal(state){try{localStorage.setItem(sharedKey(),JSON.stringify(state));return true}catch(e){console.warn("EOD local write failed",e);return false}}

  async function fetchCloud(){
    const url=`${REST_URL}?report_date=eq.${encodeURIComponent(ISO_TODAY)}&terminal=eq.${encodeURIComponent(terminal())}&select=app_state`;
    const r=await fetch(url,{headers:HEADERS,cache:"no-store"});
    if(!r.ok)throw new Error(`Supabase GET ${r.status}`);
    const rows=await r.json();return rows.length?rows[0].app_state:null;
  }
  async function upload(state){
    const report_date=dateISO(state.date);if(!report_date||!state.terminal)return false;
    const r=await fetch(`${REST_URL}?on_conflict=report_date,terminal`,{method:"POST",headers:{...HEADERS,Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({report_date,terminal:state.terminal,app_state:state}),cache:"no-store",keepalive:true});
    if(!r.ok){const t=await r.text().catch(()=>"");throw new Error(`Supabase POST ${r.status}${t?": "+t.slice(0,200):"}`)}
    return true;
  }
  async function syncNow(){
    if(syncing){queued=true;return}syncing=true;
    try{
      const cloud=await fetchCloud(),local=readLocal(),combined=mergeStates(cloud,local);
      if(!combined)return;
      writeLocal(combined);
      const sig=JSON.stringify(combined);
      if(sig!==JSON.stringify(cloud)||sig!==lastUploadedSignature){await upload(combined);lastUploadedSignature=sig;console.log("EOD: daily state backed up")}
    }catch(e){
      console.warn("EOD cloud sync failed; retrying",e);clearTimeout(retryTimer);retryTimer=setTimeout(()=>{lastUploadedSignature="";syncNow()},5000);
    }finally{syncing=false;if(queued){queued=false;setTimeout(syncNow,50)}}
  }

  const originalSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    const result=originalSetItem.call(this,key,value);
    if(key?.startsWith(PREFIX)){clearTimeout(retryTimer);retryTimer=setTimeout(syncNow,250)}
    return result;
  };
  window.addEventListener("online",()=>{lastUploadedSignature="";syncNow()});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){lastUploadedSignature="";syncNow()}});
  window.addEventListener("pagehide",()=>{const s=readLocal();if(s)upload(s).catch(()=>{})});
  window.EODCloud={syncNow,backupCurrentState:syncNow};
  setTimeout(syncNow,500);setInterval(syncNow,3000);
})();
