/* Outlook integration entry point. No credentials are embedded in this public GitHub Pages app. */
(()=>{
"use strict";
const button=document.getElementById("outlookSyncButton");
const status=document.getElementById("outlookSyncStatus");
const results=document.getElementById("outlookSyncResults");
if(!button||!status||!results)return;
button.addEventListener("click",()=>{
  status.textContent="Outlook not connected · Last synced: Never";
  results.textContent="Outlook authorization is required before this app can read the specified mail folder and merge its Excel attachments. Set up a Microsoft Entra app registration and approved Microsoft Graph Mail.Read access first.";
});
})();
