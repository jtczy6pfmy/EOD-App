/* EOD-App cloud backup: localStorage remains the working copy; Supabase is updated from it continuously. */
(()=>{
  "use strict";
  const SUPABASE_URL="https://tjhsrydhkigvhlllnstm.supabase.co";
  const SUPABASE_KEY="sb_publishable_nB2sQ-lTf9mJrmb6UWn4vw_gLlsnYbv";
  const REST_URL=`${SUPABASE_URL}/rest/v1/eod_daily`;
  const HEADERS={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"};
  const PREFIX="eodInspectionReport_v13_";
  let lastSignature="";
  let saving=false;
  let retryTimer=null;
  function dateISO(v){const m=String(v||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);return m?`20${m[3]}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`:null}
  function today(){const d=new Date();return `${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`}
  function getCurrentState(){
    const candidates=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i); if(!key||!key.startsWith(PREFIX))continue;
      try{const state=JSON.parse(localStorage.getItem(key));if(state&&state.date===today()&&state.terminal)candidates.push(state)}catch(e){}
    }
    return candidates.length?candidates[candidates.length-1]:null;
  }
  async function writeCloud(state){
    const report_date=dateISO(state.date); if(!report_date||!state.terminal)return false;
    const response=await fetch(`${REST_URL}?on_conflict=report_date,terminal`,{
      method:"POST",headers:{...HEADERS,Prefer:"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({report_date,terminal:state.terminal,app_state:state}),cache:"no-store",keepalive:true
    });
    if(!response.ok){const text=await response.text().catch(()=>"");throw new Error(`Supabase ${response.status}${text?": "+text.slice(0,200):""}`)}
    return true;
  }
  async function syncNow(){
    if(saving)return;
    const state=getCurrentState(); if(!state)return;
    const signature=JSON.stringify(state); if(signature===lastSignature)return;
    saving=true;
    try{await writeCloud(state);lastSignature=signature;window.dispatchEvent(new CustomEvent("eod-cloud-saved",{detail:{ok:true}}));console.log("EOD: backed up to Supabase")}
    catch(error){console.warn("EOD: Supabase backup failed; retrying",error);clearTimeout(retryTimer);retryTimer=setTimeout(()=>{lastSignature="";syncNow()},3000)}
    finally{saving=false}
  }
  const originalSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    const result=originalSetItem.call(this,key,value);
    if(key&&key.startsWith(PREFIX)){lastSignature="";clearTimeout(retryTimer);retryTimer=setTimeout(syncNow,100)}
    return result;
  };
  setInterval(syncNow,1000);
  window.addEventListener("online",()=>{lastSignature="";syncNow()});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){lastSignature="";syncNow()}});
  window.addEventListener("pagehide",()=>{const state=getCurrentState();if(state)writeCloud(state).catch(()=>{})});
  window.EODCloud={syncNow,backupCurrentState:syncNow};
  setTimeout(syncNow,500);
})();
