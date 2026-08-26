/* Supabase persistence layer for EOD-App. Direct cloud backup after every add action. */
(()=>{
  "use strict";
  const SUPABASE_URL="https://tjhsrydhkigvhlllnstm.supabase.co";
  const SUPABASE_KEY="sb_publishable_nB2sQ-lTf9mJrmb6UWn4vw_gLlsnYbv";
  const TABLE="eod_daily",REST_URL=`${SUPABASE_URL}/rest/v1/${TABLE}`;
  const HEADERS={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"};
  const appDate=d=>{d=d||new Date();return(d.getMonth()+1)+"/"+d.getDate()+"/"+String(d.getFullYear()).slice(-2)};
  const isoDate=v=>{const m=String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);return m?`20${m[3]}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`:null};
  function findLocal(){const today=appDate();for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key||!key.startsWith("eodInspectionReport_v13_"))continue;try{const state=JSON.parse(localStorage.getItem(key));if(state&&state.date===today&&state.terminal)return{key,state}}catch(e){}}return null}
  async function cloudWrite(state){const date=isoDate(state.date);if(!date||!state.terminal)return false;const r=await fetch(`${REST_URL}?on_conflict=report_date,terminal`,{method:"POST",headers:{...HEADERS,Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({report_date:date,terminal:state.terminal,app_state:state})});if(!r.ok)throw Error("Supabase save "+r.status);return true}

  const pending=new Map(),running=new Set();
  function queueCloudWrite(state){
    const date=isoDate(state.date);if(!date||!state.terminal)return;
    const key=`${date}|${state.terminal}`;pending.set(key,state);if(running.has(key))return;
    running.add(key);
    (async()=>{try{while(pending.has(key)){const next=pending.get(key);pending.delete(key);try{await cloudWrite(next)}catch(e){console.warn("EOD cloud save failed",e);pending.set(key,next);break}}}finally{running.delete(key)}})();
  }

  function backupCurrentState(){const local=findLocal();if(local)queueCloudWrite(local.state)}

  function installSaveHook(){
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      const result=original.call(this,key,value);
      if(key&&key.startsWith("eodInspectionReport_v13_")){try{const state=JSON.parse(value);if(state&&state.date===appDate()&&state.terminal)queueCloudWrite(state)}catch(e){}}
      return result;
    };
  }

  function installDirectAddBackup(){
    const ids=["addInspection","addContainerInspection","addRackInspection","addTireAudits"];
    document.addEventListener("click",event=>{
      const button=event.target.closest("button");
      if(!button||!ids.includes(button.id))return;
      setTimeout(backupCurrentState,50);
    },true);
  }

  function installEnterHandlers(){
    const actions={tireAuditTotal:"addTireAudits",number:"addInspection",containerNumber:"addContainerInspection",rackNumber:"addRackInspection"};
    Object.entries(actions).forEach(([inputId,buttonId])=>{const input=document.getElementById(inputId),button=document.getElementById(buttonId);if(!input||!button)return;input.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();button.click()}})});
  }

  async function startup(){const local=findLocal();if(!local)return;try{queueCloudWrite(local.state)}catch(e){console.warn("EOD startup backup failed",e)}}
  installSaveHook();
  window.addEventListener("load",()=>{installEnterHandlers();installDirectAddBackup();setTimeout(startup,500)});
})();
