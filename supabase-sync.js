/* Supabase persistence layer for EOD-App. The existing app keeps localStorage as its offline cache; this script mirrors the current day's state to Supabase. */
(()=>{
  "use strict";
  const SUPABASE_URL="https://tjhsrydhkigvhlllnstm.supabase.co";
  const SUPABASE_KEY="sb_publishable_nB2sQ-lTf9mJrmb6UWn4vw_gLlsnYbv";
  const TABLE="eod_daily",SYNC_INTERVAL=1000,REST_URL=`${SUPABASE_URL}/rest/v1/${TABLE}`;
  const HEADERS={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"};
  function currentAppDate(){const d=new Date();return(d.getMonth()+1)+"/"+d.getDate()+"/"+String(d.getFullYear()).slice(-2)}
  function isoDate(v){const m=String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);return m?`20${m[3]}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`:null}
  function localState(){const terminal=document.getElementById("terminal");if(!terminal||!terminal.value)return null;for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&key.startsWith("eodInspectionReport_v13_")){try{const state=JSON.parse(localStorage.getItem(key));if(state&&state.date===currentAppDate())return{key,state}}catch(e){}}}return null}
  async function readCloud(iso,terminal){const qs=new URLSearchParams({select:"app_state",report_date:`eq.${iso}`,terminal:`eq.${terminal}`,limit:"1"});const r=await fetch(`${REST_URL}?${qs}`,{headers:HEADERS,cache:"no-store"});if(!r.ok)throw Error(`Supabase read ${r.status}`);const rows=await r.json();return rows.length?rows[0].app_state:null}
  async function writeCloud(state){const iso=isoDate(state.date);if(!iso||!state.terminal)return;const r=await fetch(`${REST_URL}?on_conflict=report_date,terminal`,{method:"POST",headers:{...HEADERS,Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({report_date:iso,terminal:state.terminal,app_state:state})});if(!r.ok)throw Error(`Supabase save ${r.status}`)}
  let lastLocal="",busy=false;
  async function startup(){const local=localState();if(!local)return;const iso=isoDate(local.state.date);if(!iso)return;const flag=`eodSupabaseRestored_${iso}_${local.state.terminal}`;if(sessionStorage.getItem(flag)==="1")return;try{const cloud=await readCloud(iso,local.state.terminal);if(cloud&&JSON.stringify(cloud)!==JSON.stringify(local.state)){localStorage.setItem(local.key,JSON.stringify(cloud));sessionStorage.setItem(flag,"1");location.reload();return}if(cloud)sessionStorage.setItem(flag,"1");await writeCloud(local.state);lastLocal=JSON.stringify(local.state)}catch(e){console.warn("EOD Supabase sync unavailable; local storage remains active.",e)}}
  async function sync(){if(busy)return;const local=localState();if(!local)return;const s=JSON.stringify(local.state);if(s===lastLocal)return;busy=true;try{await writeCloud(local.state);lastLocal=s}catch(e){console.warn("EOD Supabase sync failed; retrying.",e)}finally{busy=false}}
  window.addEventListener("online",sync);window.addEventListener("load",()=>{setTimeout(startup,300);setInterval(sync,SYNC_INTERVAL)});
})();
