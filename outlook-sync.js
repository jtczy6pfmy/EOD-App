/* Excel attachment import for Gmail-forwarded reports. No mailbox credentials in the browser. */
(()=>{
"use strict";
const button=document.getElementById("outlookSyncButton"),status=document.getElementById("outlookSyncStatus"),results=document.getElementById("outlookSyncResults");
if(!button||!status||!results)return;
const KEY="eod_combined_reports_v1";
const HEADERS=["Lot Loc","Eq Init Nr","Mate Init Nr","Hold List","Hold Category","Dwell DD HH"];
let sortColumn="Lot Loc",sortDirection=1;
const sorter=new Intl.Collator(undefined,{numeric:true,sensitivity:"base"});
const isDcli=row=>/^DCLI/i.test(String(row["Eq Init Nr"]||"").trim())||/^DCLI/i.test(String(row["Mate Init Nr"]||"").trim());
const fileInput=document.createElement("input");
fileInput.type="file";fileInput.accept=".xlsx,.xls";fileInput.multiple=true;fileInput.hidden=true;
const importButton=document.createElement("button");
importButton.type="button";importButton.textContent="Import Excel";
importButton.style.cssText="width:auto;background:#ffc107;color:#001338;padding:8px 12px;margin-left:8px";
button.after(importButton,fileInput);
button.setAttribute("aria-label","Refresh saved Upcoming and Bad Orders");
importButton.addEventListener("click",()=>fileInput.click());
function get(row,...names){
 const entries=Object.entries(row);
 for(const name of names){
  const normalized=name.toUpperCase().replace(/[^A-Z0-9]/g,"");
  const match=entries.find(([key])=>key.toUpperCase().replace(/[^A-Z0-9]/g,"")===normalized);
  if(match)return String(match[1]??"").trim();
 }
 return "";
}
function normalize(row,kind){
 const out={};
 if(kind==="bad"){for(const h of HEADERS)out[h]=get(row,h)}
 else{
  out["Lot Loc"]=get(row,"LOT LOC");
  out["Eq Init Nr"]=get(row,"CHASSIS");
  out["Mate Init Nr"]=get(row,"EQUIPMENT");
  out["Hold List"]="FHWA";
  out["Hold Category"]=[get(row,"FHWA STATUS"),get(row,"FHWA Date")].filter(Boolean).join(" · ");
  out["Dwell DD HH"]=get(row,"DWELL TIME");
 }
 const chassis=out["Eq Init Nr"],equipment=out["Mate Init Nr"];
 if(/^DCLI/i.test(chassis)||/^DCLI/i.test(equipment))return null;
 if(/^(?:NSPZ|NSFZ)(?:\b|(?=\d))/i.test(equipment)){
  out["Eq Init Nr"]=equipment;
  out["Mate Init Nr"]="";
 }
 return out;
}
function kindOf(rows,filename){
 const keys=new Set(rows.flatMap(r=>Object.keys(r).map(k=>k.toUpperCase().replace(/[^A-Z0-9]/g,""))));
 if(keys.has("HOLDLIST")&&keys.has("EQINITNR"))return "bad";
 if(keys.has("FHWASTATUS")&&keys.has("EQUIPMENT"))return "upcoming";
 if(/bad.order|chassis.bad/i.test(filename))return "bad";
 if(/fhwa|upcoming|inventory.due/i.test(filename))return "upcoming";
 return null;
}
function readFile(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error("Unable to read "+file.name));
  reader.onload=()=>{try{
   const workbook=XLSX.read(reader.result,{type:"array",cellDates:true});
   const rows=workbook.SheetNames.flatMap(name=>XLSX.utils.sheet_to_json(workbook.Sheets[name],{defval:"",raw:false}));
   resolve({rows,kind:kindOf(rows,file.name),name:file.name});
  }catch(error){reject(error)}};
  reader.readAsArrayBuffer(file);
 });
}
function render(data){
 results.replaceChildren();
 if(!data){status.textContent="No saved reports yet";results.textContent="Forward the reports to Gmail, save the two Excel attachments, then choose Import Excel. Automatic Gmail retrieval is not connected yet.";return}
 const upcoming=(data.upcoming||[]).filter(row=>!isDcli(row));
 const bad=(data.bad||[]).filter(row=>!isDcli(row));
 const rows=[...upcoming,...bad].sort((a,b)=>sortDirection*sorter.compare(String(a[sortColumn]??""),String(b[sortColumn]??"")));
 const summary=document.createElement("p");
 summary.textContent=upcoming.length+" upcoming inspections · "+bad.length+" bad orders · Tap a column header to sort";
 results.append(summary);
 const wrap=document.createElement("div");wrap.style.overflowX="auto";
 const table=document.createElement("table");table.style.cssText="width:100%;border-collapse:collapse;font-size:.8rem";
 const head=document.createElement("tr");
 for(const h of HEADERS){const th=document.createElement("th");const sortButton=document.createElement("button");sortButton.type="button";sortButton.textContent=h+(sortColumn===h?(sortDirection===1?" ▲":" ▼"):" ⇅");sortButton.setAttribute("aria-label","Sort by "+h);sortButton.setAttribute("aria-pressed",String(sortColumn===h));sortButton.style.cssText="width:auto;background:transparent;color:inherit;border:0;padding:7px 4px;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap";sortButton.addEventListener("click",()=>{if(sortColumn===h)sortDirection*=-1;else{sortColumn=h;sortDirection=1}render(load())});th.append(sortButton);th.style.cssText="text-align:left;padding:2px;border-bottom:1px solid #cbd5e1";head.append(th)}
 const thead=document.createElement("thead");thead.append(head);table.append(thead);
 const tbody=document.createElement("tbody");
 for(const row of rows.slice(0,500)){const tr=document.createElement("tr");for(const h of HEADERS){const td=document.createElement("td");td.textContent=row[h]||"";td.style.cssText="padding:7px;border-bottom:1px solid #e2e8f0";tr.append(td)}tbody.append(tr)}
 table.append(tbody);wrap.append(table);results.append(wrap);
 status.textContent="Saved reports · Updated "+new Date(data.updated).toLocaleString()+(rows.length>500?" · First 500 shown":"");
}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch{return null}}
button.addEventListener("click",()=>render(load()));
fileInput.addEventListener("change",async()=>{
 if(!fileInput.files.length)return;
 if(!window.XLSX){status.textContent="Excel reader unavailable. Check your internet connection.";return}
 importButton.disabled=true;status.textContent="Reading Excel files…";
 try{
  const imported=await Promise.all([...fileInput.files].map(readFile));
  const unknown=imported.filter(f=>!f.kind);
  if(unknown.length)throw new Error("Unrecognized spreadsheet columns: "+unknown.map(f=>f.name).join(", "));
  const existing=load()||{bad:[],upcoming:[]};
  for(const file of imported)existing[file.kind]=file.rows.map(r=>normalize(r,file.kind)).filter(Boolean);
  existing.updated=Date.now();
  localStorage.setItem(KEY,JSON.stringify(existing));
  render(existing);
 }catch(error){status.textContent="Import failed: "+error.message}
 finally{importButton.disabled=false;fileInput.value=""}
});
const cloud=document.createElement("button");
cloud.type="button";cloud.textContent="Connect cloud reports";cloud.style.cssText="width:auto;padding:8px 12px;margin-left:8px";
importButton.after(cloud);
const endpoint="https://tjhsrydhkigvhlllnstm.supabase.co/functions/v1/eod-mail-reports";
async function cloudRefresh(ask=false){
 let token=sessionStorage.getItem("eod_mail_cloud_token");
 if(!token&&ask){token=prompt("Enter your EOD report sync access token (configured in Supabase):")||"";if(token)sessionStorage.setItem("eod_mail_cloud_token",token)}
 if(!token)return;
 try{
  const response=await fetch(endpoint,{headers:{"x-eod-token":token},cache:"no-store"});
  if(!response.ok){if(response.status===401)sessionStorage.removeItem("eod_mail_cloud_token");throw Error("Cloud reports unavailable ("+response.status+")")}
  const payload=await response.json(),reports=payload.reports||[];
  if(!reports.length){status.textContent="Cloud connected · Waiting for emailed reports";return}
  const data=load()||{upcoming:[],bad:[]};
  for(const report of reports)if(report.report_type==="bad"||report.report_type==="upcoming")data[report.report_type]=report.rows.filter(row=>!isDcli(row));
  data.updated=Date.now();localStorage.setItem(KEY,JSON.stringify(data));render(data);
  status.textContent="Cloud reports loaded · "+new Date().toLocaleString();
 }catch(error){status.textContent=error.message}
}
cloud.addEventListener("click",()=>cloudRefresh(true));
button.addEventListener("click",()=>cloudRefresh(false));
cloudRefresh(false);
render(load());
})();
