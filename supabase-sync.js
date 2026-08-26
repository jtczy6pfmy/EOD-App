/* EOD-App durable backup / recovery.
   One stable browser key per report day. Supabase is the durable source of truth.
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
  const SHARED_KEY=PREFIX+SHARED_INSTANCE;
  try{sessionStorage.setItem("instance_id",SHARED_INSTANCE)}catch(e){}

  let syncing=false,queued=false,retryTimer=null,lastUploadedSignature="";
  const terminal=()=>document.getElementById("terminal")?.value||"HARRISBURG";
  const readLocal=()=>{try{const v=localStorage.getItem(SHARED_KEY);return v?JSON.parse(v):null}catch(e){return null}};
  const writeLocal=state=>{try{localStorage.setItem(SHARED_KEY,JSON.stringify(state));return true}catch(e){return false}};
  const dateISO=v=>{const m=String(v||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);return m?`20${m[3]}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`:null};

  function merge(a,b){
    if(a==null)return b;if(b==null)return a;
    if(Array.isArray(a)&&Array.isArray(b)){
      const out=a.slice(),seen=new Set(out.map(x=>JSON.stringify(x)));
      for(const x of b){const s=JSON.stringify(x);if(!seen.has(s)){seen.add(s);out.push(x)}}
      return out;
    }
    if(typeof a==="number"&&typeof b==="number")return Math.max(a,b);
    if(typeof a==="object"&&typeof b==="object"){
      const out={...a};for(const k of Object.keys(b))out[k]=k in out?merge(out[k],b[k]):b[k];return out;
    }
    return b??a;
  }
  const mergeStates=(cloud,local)=>!cloud?local:!local?cloud:{...merge(cloud,local),terminal:local.terminal||cloud.terminal,date:local.date||cloud.date};

  async function fetchCloud(){
    const url=`${REST_URL}?report_date=eq.${encodeURIComponent(ISO_TODAY)}&terminal=eq.${encodeURIComponent(terminal())}&select=app_state`;
    const r=await fetch(url,{headers:HEADERS,cache:"no-store"});
    if(!r.ok)throw new Error(`Supabase GET ${r.status}`);
    const rows=await r.json();return rows.length?rows[0].app_state:null;
  }
  async function upload(state){
    const report_date=dateISO(state?.date);if(!report_date||!state?.terminal)return false;
    const r=await fetch(`${REST_URL}?on_conflict=report_date,terminal`,{method:"POST",headers:{...HEADERS,Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({report_date,terminal:state.terminal,app_state:state}),cache:"no-store",keepalive:true});
    if(!r.ok)throw new Error(`Supabase POST ${r.status}`);return true;
  }

  async function recoverAndSync(){
    if(syncing){queued=true;return}syncing=true;
    try{
      const cloud=await fetchCloud();
      const local=readLocal();
      const combined=mergeStates(cloud,local);
      if(!combined)return;
      const before=local?JSON.stringify(local):"";
      const after=JSON.stringify(combined);
      writeLocal(combined);

      // index.html may already have rendered before the async cloud request
      // completed. Reload exactly once after recovery so its normal load()
      // reads the recovered daily record and renders the real inspection list.
      if(after!==before && cloud && !sessionStorage.getItem("eod_recovered_once")){
        sessionStorage.setItem("eod_recovered_once","1");
        window.location.reload();
        return;
      }

      if(after!==JSON.stringify(cloud)||after!==lastUploadedSignature){
        await upload(combined);
        lastUploadedSignature=after;
      }
    }catch(e){
      console.warn("EOD cloud sync failed; retrying",e);
      clearTimeout(retryTimer);retryTimer=setTimeout(()=>{lastUploadedSignature="";recoverAndSync()},5000);
    }finally{
      syncing=false;if(queued){queued=false;setTimeout(recoverAndSync,50)}
    }
  }

  const originalSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    const result=originalSetItem.call(this,key,value);
    if(key?.startsWith(PREFIX)){clearTimeout(retryTimer);retryTimer=setTimeout(recoverAndSync,250)}
    return result;
  };
  window.addEventListener("online",()=>{lastUploadedSignature="";recoverAndSync()});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){lastUploadedSignature="";recoverAndSync()}});
  window.addEventListener("pagehide",()=>{const s=readLocal();if(s)upload(s).catch(()=>{})});
  window.EODCloud={syncNow:recoverAndSync,backupCurrentState:recoverAndSync};
  setTimeout(recoverAndSync,300);
  setInterval(recoverAndSync,5000);
})();
