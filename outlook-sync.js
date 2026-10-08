/* Microsoft Graph Outlook Excel sync. Public SPA: delegated Mail.Read only, no client secret. */
(()=>{
"use strict";
const button=document.getElementById("outlookSyncButton");
const status=document.getElementById("outlookSyncStatus");
const results=document.getElementById("outlookSyncResults");
if(!button||!status||!results)return;
const KEY="eod_outlook_sync_settings_v1";
const config=(()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}})();
const settings=document.createElement("details");
settings.innerHTML='<summary style="cursor:pointer;font-weight:600">Outlook sync settings</summary><div style="display:grid;gap:8px;margin-top:10px"><label>Microsoft Entra application (client) ID<input id="outlookClientId" type="text" autocomplete="off" placeholder="Application client ID"></label><label>Outlook mail folder ID<input id="outlookFolderId" type="text" autocomplete="off" placeholder="Folder ID (leave blank for Inbox)"></label><small>Register this GitHub Pages URL as a Single-page application redirect URI in Microsoft Entra. Grant delegated Mail.Read permission. No client secret is needed or should be entered here.</small></div>';
results.before(settings);
const clientInput=settings.querySelector("#outlookClientId");
const folderInput=settings.querySelector("#outlookFolderId");
clientInput.value=config.clientId||"369f33df-a218-4a36-8e2c-55903325ff90";
folderInput.value=config.folderId||"";
function saveSettings(){localStorage.setItem(KEY,JSON.stringify({clientId:clientInput.value.trim(),folderId:folderInput.value.trim()}))}
clientInput.addEventListener("change",saveSettings);
folderInput.addEventListener("change",saveSettings);
function message(text){status.textContent=text}
function graphError(code,body){const e=new Error("Microsoft Graph request failed ("+code+"): "+String(body).slice(0,220));e.status=code;return e}
async function graph(url,token){
 const response=await fetch(url,{headers:{Authorization:"Bearer "+token}});
 if(!response.ok)throw graphError(response.status,await response.text());
 return response.json();
}
async function allPages(url,token,maxPages=10){
 let data=[],pages=0;
 while(url&&pages++<maxPages){const page=await graph(url,token);data.push(...(page.value||[]));url=page["@odata.nextLink"]||null}
 return data;
}
function binaryFromBase64(value){
 const raw=atob(value);const bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return bytes;
}
function parseWorkbook(bytes){
 const workbook=XLSX.read(bytes,{type:"array",cellDates:true});
 const records=[];
 for(const name of workbook.SheetNames){
  const rows=XLSX.utils.sheet_to_json(workbook.Sheets[name],{defval:"",raw:false});
  for(const row of rows)if(Object.values(row).some(value=>String(value).trim()))records.push(row);
 }
 return records;
}
function tableFor(rows){
 const table=document.createElement("table");
 table.style.cssText="width:100%;border-collapse:collapse;font-size:.8rem";
 const columns=[...new Set(rows.flatMap(r=>Object.keys(r)))].slice(0,25);
 const thead=document.createElement("thead"),header=document.createElement("tr");
 for(const col of ["Source",...columns]){const th=document.createElement("th");th.textContent=col;th.style.cssText="text-align:left;padding:7px;border-bottom:1px solid #cbd5e1";header.append(th)}
 thead.append(header);table.append(thead);
 const body=document.createElement("tbody");
 for(const row of rows.slice(0,500)){
  const tr=document.createElement("tr");
  for(const col of ["Source",...columns]){const td=document.createElement("td");td.textContent=String(row[col]??"");td.style.cssText="padding:7px;border-bottom:1px solid #e2e8f0";tr.append(td)}
  body.append(tr);
 }
 table.append(body);return table;
}
async function run(){
 saveSettings();
 const clientId=clientInput.value.trim(),folderId=folderInput.value.trim();
 if(!clientId){settings.open=true;clientInput.focus();message("Enter your Microsoft application client ID to connect Outlook.");return}
 if(!window.msal||!window.XLSX){message("Microsoft sign-in or Excel parser could not load. Check your internet connection.");return}
 button.disabled=true;button.textContent="Syncing…";message("Signing in to Outlook…");
 try{
  const app=new msal.PublicClientApplication({auth:{clientId,authority:"https://login.microsoftonline.com/22e0df06-ddf6-478c-bc1b-e26c7bfac8ee",redirectUri:location.origin+location.pathname},cache:{cacheLocation:"localStorage"}});
  if(typeof app.initialize==="function")await app.initialize();
  const request={scopes:["Mail.Read"]};
  let account=app.getActiveAccount()||app.getAllAccounts()[0],token;
  if(account){
   app.setActiveAccount(account);
   try{token=(await app.acquireTokenSilent({...request,account})).accessToken}catch(error){
    if(!(error instanceof msal.InteractionRequiredAuthError))throw error;
   }
  }
  // An existing Outlook browser session can often supply a token without a login prompt.
  if(!token){
   try{
    const silent=await app.ssoSilent(request);
    account=silent.account;
    if(account)app.setActiveAccount(account);
    token=silent.accessToken;
   }catch(error){
    // Consent, third-party cookie restrictions, or an unknown account can require interaction.
    if(!(error instanceof msal.InteractionRequiredAuthError)&&
       !["login_required","interaction_required","consent_required","monitor_window_timeout"].includes(error?.errorCode))throw error;
   }
  }
  if(!token){
   message("Microsoft authorization required. Opening sign-in…");
   const login=await app.loginPopup({...request,prompt:"select_account"});
   account=login.account;
   if(account)app.setActiveAccount(account);
   token=login.accessToken||(await app.acquireTokenSilent({...request,account})).accessToken;
  }
  const base="https://graph.microsoft.com/v1.0/me/mailFolders/"+encodeURIComponent(folderId||"inbox");
  message("Reading Outlook folder…");
  const emails=await allPages(base+"/messages?$select=id,subject,receivedDateTime,hasAttachments&$orderby=receivedDateTime%20desc&$top=50",token,5);
  const candidates=emails.filter(x=>x.hasAttachments);
  const found={bad:[],upcoming:[]};let files=0;
  for(const email of candidates){
   const attachments=await allPages("https://graph.microsoft.com/v1.0/me/messages/"+encodeURIComponent(email.id)+"/attachments?$top=100",token,3);
   for(const item of attachments){
    const name=item.name||"";
    if(!/\.xlsx?$/i.test(name)||item["@odata.type"]!=="#microsoft.graph.fileAttachment")continue;
    const label=/bad[ _-]*orders?|bocz/i.test(name+" "+email.subject)?"bad":/upcoming|due|inspection/i.test(name+" "+email.subject)?"upcoming":null;
    if(!label||found[label].length)continue;
    const full=item.contentBytes?item:await graph("https://graph.microsoft.com/v1.0/me/messages/"+encodeURIComponent(email.id)+"/attachments/"+encodeURIComponent(item.id),token);
    if(!full.contentBytes)continue;
    const rows=parseWorkbook(binaryFromBase64(full.contentBytes));
    found[label]=rows.map(r=>({Source:label==="bad"?"Bad Orders":"Upcoming Inspections",...r}));
    files++;
   }
   if(found.bad.length&&found.upcoming.length)break;
  }
  if(!files){message("No matching Excel attachments found.");results.textContent="Check the Outlook folder ID and the attachment filenames. Expected names include Bad Orders and Upcoming/Inspections/Due.";return}
  const merged=[...found.upcoming,...found.bad];
  results.replaceChildren();
  const summary=document.createElement("p");
  summary.textContent=found.upcoming.length+" upcoming inspections · "+found.bad.length+" bad orders"+(merged.length>500?" · showing first 500 rows":"");
  results.append(summary);
  const wrapper=document.createElement("div");wrapper.style.overflowX="auto";wrapper.append(tableFor(merged));results.append(wrapper);
  message("Last synced: "+new Date().toLocaleString()+(files<2?" · One workbook not found":""));
 }catch(error){message("Sync failed: "+(error?.message||String(error)))}
 finally{button.disabled=false;button.textContent="↻ Sync"}
}
button.addEventListener("click",run);
})();
