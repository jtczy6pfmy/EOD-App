/* EOD-App durable cloud backup / recovery.
   LocalStorage is the fast working copy; Supabase is the durable source of truth.
   The app's session-specific localStorage key is intentionally supported so an
   iOS Safari/Home Screen restart can recover the same day's EOD into a new key.
*/
(()=>{
  "use strict";

  const SUPABASE_URL="https://tjhsrydhkigvhlllnstm.supabase.co";
  const SUPABASE_KEY="sb_publishable_nB2sQ-lTf9mJrmb6UWn4vw_gLlsnYbv";
  const REST_URL=`${SUPABASE_URL}/rest/v1/eod_daily`;
  const HEADERS={
    apikey:SUPABASE_KEY,
    Authorization:`Bearer ${SUPABASE_KEY}`,
    "Content-Type":"application/json"
  };
  const PREFIX="eodInspectionReport_v13_";
  const TODAY=(()=>{const d=new Date();return `${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`})();
  const ISO_TODAY=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`})();

  let syncing=false;
  let lastUploadedSignature="";
  let retryTimer=null;

  function getKeys(){
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key && key.startsWith(PREFIX)) keys.push(key);
    }
    return keys;
  }

  function readKey(key){
    try{
      const value=localStorage.getItem(key);
      return value?JSON.parse(value):null;
    }catch(e){return null;}
  }

  function currentTerminal(){
    const el=document.getElementById("terminal");
    return el?.value || null;
  }

  function findLocalState(){
    const terminal=currentTerminal();
    const states=getKeys().map(key=>({key,state:readKey(key)}))
      .filter(x=>x.state && x.state.date===TODAY && x.state.terminal && (!terminal || x.state.terminal===terminal));
    if(!states.length)return null;
    states.sort((a,b)=>a.key.localeCompare(b.key));
    return states[states.length-1].state;
  }

  function findCurrentKey(){
    const terminal=currentTerminal();
    const states=getKeys().map(key=>({key,state:readKey(key)}))
      .filter(x=>x.state && x.state.date===TODAY && x.state.terminal && (!terminal || x.state.terminal===terminal));
    if(states.length)return states[states.length-1].key;
    return getKeys()[getKeys().length-1] || null;
  }

  function writeLocal(state){
    if(!state || state.date!==TODAY || !state.terminal)return false;
    let key=findCurrentKey();
    if(!key){
      const instanceId=sessionStorage.getItem("instance_id") || ("instance_"+Date.now());
      sessionStorage.setItem("instance_id",instanceId);
      key=`${PREFIX}${instanceId}`;
    }
    try{
      localStorage.setItem(key,JSON.stringify(state));
      return true;
    }catch(e){
      console.warn("EOD: local recovery write failed",e);
      return false;
    }
  }

  function dateISO(v){
    const m=String(v||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    return m?`20${m[3]}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`:null;
  }

  async function fetchCloud(){
    const terminal=currentTerminal() || "HARRISBURG";
    const url=`${REST_URL}?report_date=eq.${encodeURIComponent(ISO_TODAY)}&terminal=eq.${encodeURIComponent(terminal)}&select=app_state,updated_at`;
    const response=await fetch(url,{method:"GET",headers:HEADERS,cache:"no-store"});
    if(!response.ok)throw new Error(`Supabase GET ${response.status}`);
    const rows=await response.json();
    return rows.length ? rows[0].app_state : null;
  }

  async function upload(state){
    const report_date=dateISO(state.date);
    if(!report_date || !state.terminal)return false;
    const response=await fetch(`${REST_URL}?on_conflict=report_date,terminal`,{
      method:"POST",
      headers:{...HEADERS,Prefer:"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({report_date,terminal:state.terminal,app_state:state}),
      cache:"no-store",
      keepalive:true
    });
    if(!response.ok){
      const text=await response.text().catch(()=>"");
      throw new Error(`Supabase POST ${response.status}${text?": "+text.slice(0,200):""}`);
    }
    return true;
  }

  async function recoverThenSync(){
    if(syncing)return;
    syncing=true;
    try{
      // FIRST recover today's cloud record. This prevents a fresh iOS instance
      // from uploading an empty local copy over the real day's EOD.
      const cloud=await fetchCloud();
      const local=findLocalState();

      if(cloud){
        const cloudSig=JSON.stringify(cloud);
        const localSig=local?JSON.stringify(local):"";
        if(!local || cloudSig!==localSig){
          writeLocal(cloud);
          // Let the main app render the recovered state if it exposes its normal loader.
          window.dispatchEvent(new CustomEvent("eod-cloud-restored",{detail:{state:cloud}}));
          setTimeout(()=>window.location.reload(),50);
          return;
        }
      }else if(local){
        // No cloud record exists yet, so safely establish today's record.
        await upload(local);
        lastUploadedSignature=JSON.stringify(local);
        return;
      }

      const state=findLocalState();
      if(state){
        const sig=JSON.stringify(state);
        if(sig!==lastUploadedSignature){
          await upload(state);
          lastUploadedSignature=sig;
          console.log("EOD: backed up to Supabase");
        }
      }
    }catch(error){
      console.warn("EOD: cloud recovery/sync failed; will retry",error);
      clearTimeout(retryTimer);
      retryTimer=setTimeout(()=>{lastUploadedSignature="";recoverThenSync()},5000);
    }finally{
      syncing=false;
    }
  }

  // Capture every app save, regardless of which iOS/Safari instance key it uses.
  const originalSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    const result=originalSetItem.call(this,key,value);
    if(key && key.startsWith(PREFIX)){
      clearTimeout(retryTimer);
      retryTimer=setTimeout(()=>{
        const state=readKey(key);
        if(state && state.date===TODAY && state.terminal){
          upload(state).then(()=>{
            lastUploadedSignature=JSON.stringify(state);
            console.log("EOD: save synced to Supabase");
          }).catch(error=>console.warn("EOD: save sync failed; retrying",error));
        }
      },250);
    }
    return result;
  };

  window.addEventListener("online",()=>{lastUploadedSignature="";recoverThenSync()});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){lastUploadedSignature="";recoverThenSync()}});
  window.addEventListener("pagehide",()=>{
    const state=findLocalState();
    if(state)upload(state).catch(()=>{});
  });

  window.EODCloud={syncNow:recoverThenSync,backupCurrentState:recoverThenSync};

  // Recovery happens before normal periodic backup.
  setTimeout(recoverThenSync,300);
  setInterval(recoverThenSync,3000);
})();
