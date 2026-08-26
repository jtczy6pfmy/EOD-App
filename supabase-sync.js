/* EOD-App durable cloud backup / recovery.
   LocalStorage is the fast working copy; Supabase is the durable source of truth.
   Data from a newly-created iOS Safari/Home Screen instance is MERGED with the
   cloud copy before anything is uploaded, so local entries are never discarded.
*/
(()=>{
  "use strict";
  const SUPABASE_URL="https://tjhsrydhkigvhlllnstm.supabase.co";
  const SUPABASE_KEY="sb_publishable_nB2sQ-lTf9mJrmb6UWn4vw_gLlsnYbv";
  const REST_URL=`${SUPABASE_URL}/rest/v1/eod_daily`;
  const HEADERS={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"};
  const PREFIX="eodInspectionReport_v13_";
  const d=new Date();
  const TODAY=`${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
  const ISO_TODAY=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  let syncing=false,lastUploadedSignature="",retryTimer=null;

  function getKeys(){
    const a=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(PREFIX))a.push(k)}return a;
  }
  function readKey(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}}
  function terminal(){return document.getElementById("terminal")?.value||"HARRISBURG"}
  function localStates(){return getKeys().map(k=>({k,s:readKey(k)})).filter(x=>x.s&&x.s.date===TODAY&&x.s.terminal===terminal())}
  function localState(){const a=localStates();return a.length?a[a.length-1].s:null}
  function currentKey(){const a=localStates();return a.length?a[a.length-1].k:getKeys()[getKeys().length-1]||null}

  // Merge without losing entries. Arrays are treated as sets of inspection objects;
  // primitive numbers (such as tire audit counts) use the larger known value.
  function merge(a,b){
    if(a==null)return b;
    if(b==null)return a;
    if(Array.isArray(a)&&Array.isArray(b)){
      const out=a.slice(),seen=new Set(out.map(x=>JSON.stringify(x)));
      for(const x of b){const k=JSON.stringify(x);if(!seen.has(k)){seen.add(k);out.push(x)}}
      return out;
    }
    if(typeof a==="number"&&typeof b==="number")return Math.max(a,b);
    if(typeof a==="object"&&typeof b==="object"){
      const out={...a};for(const k of Object.keys(b))out[k]=k in out?merge(out[k],b[k]):b[k];return out;
    }
    return b||a;
  }
  function mergeStates(cloud,local){
    if(!cloud)return local;
    if(!local)return cloud;
    return {...merge(cloud,local),terminal:local.terminal||cloud.terminal,date:TODAY};
  }

  function writeLocal(state){
    if(!state||state.date!==TODAY||!state.terminal)return false;
    let k=currentKey();
    if(!k){const id=sessionStorage.getItem("instance_id")||("instance_"+Date.now());sessionStorage.setItem("instance_id",id);k=PREFIX+id}
    try{localStorage.setItem(k,JSON.stringify(state));return true}catch(e){console.warn("EOD local write failed",e);return false}
  }
  function dateISO(v){const m=String(v||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);return m?`20${m[3]}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`:null}

  async function fetchCloud(){
    const url=`${REST_URL}?report_date=eq.${encodeURIComponent(ISO_TODAY)}&terminal=eq.${encodeURIComponent(terminal())}&select=app_state,updated_at`;
    const r=await fetch(url,{headers:HEADERS,cache:"no-store"});
    if(!r.ok)throw new Error(`Supabase GET ${r.status}`);
    const rows=await r.json();return rows.length?rows[0].app_state:null;
  }
  async function upload(state){
    const report_date=dateISO(state.date);if(!report_date||!state.terminal)return false;
    const r=await fetch(`${REST_URL}?on_conflict=report_date,terminal`,{
      method:"POST",headers:{...HEADERS,Prefer:"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({report_date,terminal:state.terminal,app_state:state}),cache:"no-store",keepalive:true
    });
    if(!r.ok){const t=await r.text().catch(()=>"");throw new Error(`Supabase POST ${r.status}${t?": "+t.slice(0,200):"}`)}
    return true;
  }

  async function syncNow(){
    if(syncing)return;syncing=true;
    try{
      const cloud=await fetchCloud();
      const local=localState();
      const combined=mergeStates(cloud,local);
      if(!combined)return;
      const sig=JSON.stringify(combined);
      // Always write the merged result when local data differs, which recovers a
      // fresh iOS instance and also pushes any entries that were entered offline.
      if(sig!==JSON.stringify(cloud)||sig!==lastUploadedSignature){
        writeLocal(combined);
        await upload(combined);
        lastUploadedSignature=sig;
        console.log("EOD: merged and backed up to Supabase");
      }
    }catch(e){
      console.warn("EOD cloud sync failed; retrying",e);
      clearTimeout(retryTimer);retryTimer=setTimeout(()=>{lastUploadedSignature="";syncNow()},5000);
    }finally{syncing=false}
  }

  const originalSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    const result=originalSetItem.call(this,key,value);
    if(key&&key.startsWith(PREFIX)){
      clearTimeout(retryTimer);
      retryTimer=setTimeout(()=>{
        const state=readKey(key);
        if(state&&state.date===TODAY&&state.terminal){
          upload(state).then(()=>{lastUploadedSignature=JSON.stringify(state);console.log("EOD: save synced")}).catch(e=>console.warn("EOD: save sync failed",e));
        }
      },300);
    }
    return result;
  };

  window.addEventListener("online",()=>{lastUploadedSignature="";syncNow()});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){lastUploadedSignature="";syncNow()}});
  window.addEventListener("pagehide",()=>{const s=localState();if(s)upload(s).catch(()=>{})});
  window.EODCloud={syncNow,backupCurrentState:syncNow};
  setTimeout(syncNow,500);
  setInterval(syncNow,3000);
})();
