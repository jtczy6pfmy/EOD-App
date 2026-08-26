/* Supabase persistence layer for EOD-App. Mirrors the existing localStorage state to Supabase and restores it when available. */
(()=>{
  "use strict";
  const SUPABASE_URL="https://tjhsrydhkigvhlllnstm.supabase.co";
  const SUPABASE_KEY="sb_publishable_nB2sQ-lTf9mJrmb6UWn4vw_gLlsnYbv";
  const TABLE="eod_daily";
  const REST_URL=`${SUPABASE_URL}/rest/v1/${TABLE}`;
  const HEADERS={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"};
  const KEY_PREFIX="eodInspectionReport_v13_";
  function today(){const d=new Date();return(d.getMonth()+1)+"/"+d.getDate()+"/"+String(d.getFullYear()).slice(-2)}
  function isoDate(v){const m=String(v||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);return m?`20${m[3]}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`:null}
  function getLocal(){for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key||!key.startsWith(KEY_PREFIX))continue;try{const state=JSON.parse(localStorage.getItem(key));if(state&&state.date===today()&&state.terminal)return{key,state}}catch(e){}}return null}
  async function cloudRead(state){const iso=isoDate(state.date);if(!iso)return null;const qs=new URLSearchParams({select:"app_state",report_date:`eq.${iso}`,terminal:`eq.${state.terminal}`,limit:"1"});const r=await fetch(`${REST_URL}?${qs.toString()}`,{headers:HEADERS,cache:"no-store"});if(!r.ok)throw Error(`Supabase read ${r.status}`);const rows=await r.json();return rows.length?rows[0].app_state:null}
  async function cloudWrite(state){const iso=isoDate(state.date);if(!iso||!state.terminal)return;const r=await fetch(`${REST_URL}?on_conflict=report_date,terminal`,{method:"POST",headers:{...HEADERS,Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({report_date:iso,terminal:state.terminal,app_state:state})});if(!r.ok){const text=await r.text();throw Error(`Supabase save ${r.status}: ${text}`)}}
  let timer=null,busy=false,lastSent="";
  function schedule(){clearTimeout(timer);timer=setTimeout(sync,50)}
  async function sync(){if(busy)return;const local=getLocal();if(!local)return;const serialized=JSON.stringify(local.state);if(serialized===lastSent)return;busy=true;try{await cloudWrite(local.state);lastSent=serialized;console.log("EOD: Supabase backup saved")}catch(e){console.warn("EOD: Supabase backup failed; local storage remains active.",e)}finally{busy=false}}
  const originalSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){const result=originalSetItem.apply(this,arguments);if(this===localStorage&&String(key).startsWith(KEY_PREFIX))schedule();return result};
  async function startup(){const local=getLocal();if(!local)return;try{const cloud=await cloudRead(local.state);if(cloud){const cloudText=JSON.stringify(cloud);const localText=JSON.stringify(local.state);if(cloudText!==localText){originalSetItem.call(localStorage,local.key,cloudText);location.reload();return}}await sync()}catch(e){console.warn("EOD: Supabase restore unavailable; local storage remains active.",e)}}
  window.addEventListener("online",schedule);
  window.addEventListener("load",()=>setTimeout(startup,500));
})();
