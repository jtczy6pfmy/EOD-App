/* Supabase persistence layer for EOD-App. Cloud persistence is serialized so rapid local saves cannot overwrite newer state. */
(()=>{
  "use strict";
  const SUPABASE_URL="https://tjhsrydhkigvhlllnstm.supabase.co";
  const SUPABASE_KEY="sb_publishable_nB2sQ-lTf9mJrmb6UWn4vw_gLlsnYbv";
  const TABLE="eod_daily",REST_URL=`${SUPABASE_URL}/rest/v1/${TABLE}`;
  const HEADERS={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"};
  const appDate=d=>{d=d||new Date();return(d.getMonth()+1)+"/"+d.getDate()+"/"+String(d.getFullYear()).slice(-2)};
  const isoDate=v=>{const m=String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);return m?`20${m[3]}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`:null};
  function findLocal(){const today=appDate();for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key||!key.startsWith("eodInspectionReport_v13_"))continue;try{const state=JSON.parse(localStorage.getItem(key));if(state&&state.date===today&&state.terminal)return{key,state}}catch(e){}}return null}
  async function cloudRead(date,terminal){const q=new URLSearchParams({select:"app_state",report_date:`eq.${date}`,terminal:`eq.${terminal}`,limit:"1"});const r=await fetch(`${REST_URL}?${q}`,{headers:HEADERS,cache:"no-store"});if(!r.ok)throw Error("Supabase read "+r.status);const rows=await r.json();return rows[0]?.app_state||null}
  async function cloudWrite(state){const date=isoDate(state.date);if(!date||!state.terminal)return;const r=await fetch(`${REST_URL}?on_conflict=report_date,terminal`,{method:"POST",headers:{...HEADERS,Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({report_date:date,terminal:state.terminal,app_state:state})});if(!r.ok)throw Error("Supabase save "+r.status)}

  // Serialize writes per report key. Each new local save supersedes an older queued state.
  const pending=new Map(),running=new Set();
  function queueCloudWrite(state){
    const date=isoDate(state.date); if(!date||!state.terminal)return;
    const key=`${date}|${state.terminal}`;
    pending.set(key,state);
    if(running.has(key))return;
    running.add(key);
    (async()=>{try{while(pending.has(key)){const next=pending.get(key);pending.delete(key);try{await cloudWrite(next)}catch(e){console.warn("EOD cloud save failed",e);pending.set(key,next);break}}}finally{running.delete(key)}})();
  }
  function installSaveHook(){
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      const result=original.call(this,key,value);
      if(key&&key.startsWith("eodInspectionReport_v13_")){try{const state=JSON.parse(value);if(state&&state.date===appDate()&&state.terminal)queueCloudWrite(state)}catch(e){}}
      return result;
    };
  }
  function installEnterHandlers(){
    const actions={tireAuditTotal:"addTireAudits",number:"addInspection",containerNumber:"addContainerInspection",rackNumber:"addRackInspection"};
    Object.entries(actions).forEach(([inputId,buttonId])=>{const input=document.getElementById(inputId),button=document.getElementById(buttonId);if(!input||!button)return;input.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();button.click()}})});
  }
  async function startup(){
    const local=findLocal();if(!local)return;const date=isoDate(local.state.date);if(!date)return;
    try{
      const cloud=await cloudRead(date,local.state.terminal);
      // Never replace local state with cloud state at startup. Local state may contain newer unsynced entries.
      // Push the local state after the read so the current device remains authoritative for today's session.
      if(cloud) queueCloudWrite(local.state); else queueCloudWrite(local.state);
    }catch(e){console.warn("EOD Supabase unavailable; local cache remains active",e)}
  }
  installSaveHook();
  window.addEventListener("load",()=>{installEnterHandlers();setTimeout(startup,500)});
})();
