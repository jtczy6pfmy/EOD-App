(()=>{
  "use strict";
  const GOODYEAR_URL="https://taas.goodyearmobilitycloud.com/";
  const API_URL="https://developer.goodyearsightline.com/tires";
  let pending=null;

  const css=`
  .eod-layout-row{grid-column:1/-1;display:grid;gap:16px}
  .eod-equipment-row{grid-template-columns:repeat(3,minmax(0,1fr))}
  .eod-tpms-row{grid-template-columns:1fr}
  .tpms-card{background:#fff;border:1px solid #d1d9e6;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.05);overflow:hidden}
  .tpms-head{background:linear-gradient(90deg,#001c4d 0%,#002b6d 100%);color:#fff;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .tpms-head h2{margin:0;font-size:1.1rem}.tpms-badge{font-size:.7rem;font-weight:800;padding:5px 8px;border-radius:999px;background:#334155;color:#fff}
  .tpms-body{padding:16px;display:grid;gap:12px}.tpms-actions{display:flex;gap:10px;flex-wrap:wrap}.tpms-actions button{width:auto}.tpms-status{padding:10px 12px;border-radius:8px;background:#f1f5f9;color:#334155;font-size:.85rem;font-weight:700}.tpms-status.ok{background:#dcfce7;color:#166534}.tpms-status.warn{background:#fef3c7;color:#92400e}.tpms-status.error{background:#fee2e2;color:#991b1b}
  .tpms-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.tpms-metric{border:1px solid #dbe3ec;border-radius:8px;padding:10px;background:#f8fafc}.tpms-metric small{display:block;text-transform:uppercase;color:#64748b;font-weight:800;font-size:.65rem}.tpms-metric strong{display:block;margin-top:3px;font-size:1rem}.tpms-defects{border:1px solid #fecaca;background:#fff1f2;border-radius:8px;padding:12px;color:#991b1b;font-weight:800}.tpms-modal-backdrop{position:fixed;inset:0;background:rgba(0,19,56,.58);display:none;align-items:center;justify-content:center;padding:18px;z-index:9999}.tpms-modal-backdrop.show{display:flex}.tpms-modal{width:min(620px,100%);background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden}.tpms-modal-head{background:#001f54;color:#fff;padding:15px 18px}.tpms-modal-head h3{margin:0}.tpms-modal-body{padding:18px}.tpms-modal-actions{display:flex;gap:10px;margin-top:16px}.tpms-modal-actions button{flex:1}.tpms-cancel{background:#e2e8f0!important;color:#1e293b!important}.tpms-primary{background:#ffc107!important;color:#000!important}.tpms-screenshot{border:1px solid #dbe3ec;border-radius:8px;padding:12px;background:#f8fafc;font-size:.8rem;line-height:1.5}.tpms-hidden{display:none!important}
  @media(max-width:768px){.eod-equipment-row{grid-template-columns:1fr}.tpms-grid{grid-template-columns:1fr 1fr}.tpms-modal-actions{flex-direction:column}.tpms-actions button{width:100%}}
  `;
  const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);

  function findCard(title){return [...document.querySelectorAll("main.app section.card")].find(x=>x.querySelector("h2")?.textContent.trim().toLowerCase()===title.toLowerCase())}
  function moveLayout(){
    const app=document.querySelector("main.app");if(!app||app.dataset.tpmsLayout)return;
    const chassis=findCard("Chassis"),containers=findCard("Containers"),racks=findCard("Chassis Racks");
    if(!chassis||!containers||!racks)return;
    const eq=document.createElement("div");eq.className="eod-layout-row eod-equipment-row";eq.dataset.tpmsEquipment="1";
    app.insertBefore(eq,chassis);eq.append(chassis,racks,containers);
    app.dataset.tpmsLayout="1";
  }

  function buildCard(){
    const app=document.querySelector("main.app");if(!app||document.getElementById("tpmsCard"))return;
    const chassis=findCard("Chassis");if(!chassis)return;
    const row=document.createElement("div");row.className="eod-layout-row eod-tpms-row";
    row.innerHTML=`<section class="tpms-card" id="tpmsCard"><div class="tpms-head"><h2>TPMS — Goodyear Mobility Cloud</h2><span class="tpms-badge" id="tpmsBadge">NOT CHECKED</span></div><div class="tpms-body"><div class="tpms-status" id="tpmsStatus">TPMS verification is required before a chassis inspection can be added.</div><div class="tpms-actions"><button id="tpmsLogin">OPEN GOODYEAR MOBILITY CLOUD</button><button id="tpmsRefresh" class="secondary">CHECK TPMS</button><button id="tpmsScreenshot" class="secondary" disabled>CREATE TPMS SCREENSHOT</button></div><div id="tpmsData" class="tpms-hidden"><div class="tpms-grid"><div class="tpms-metric"><small>Chassis</small><strong id="tpmsChassis">—</strong></div><div class="tpms-metric"><small>Pressure</small><strong id="tpmsPressure">—</strong></div><div class="tpms-metric"><small>Temperature</small><strong id="tpmsTemperature">—</strong></div><div class="tpms-metric"><small>Status</small><strong id="tpmsHealth">—</strong></div></div><div id="tpmsDefects" class="tpms-defects tpms-hidden"></div><div class="tpms-screenshot" id="tpmsSnapshotText"></div></div></div></section>`;
    const anchor=app.querySelector(".eod-equipment-row")||chassis;
    app.insertBefore(row,anchor);
    document.getElementById("tpmsLogin").onclick=()=>window.open(GOODYEAR_URL,"_blank","noopener,noreferrer");
    document.getElementById("tpmsRefresh").onclick=checkTPMS;
    document.getElementById("tpmsScreenshot").onclick=createScreenshot;
  }

  function modal(){
    if(document.getElementById("tpmsPrompt"))return document.getElementById("tpmsPrompt");
    const b=document.createElement("div");b.id="tpmsPrompt";b.className="tpms-modal-backdrop";b.innerHTML=`<div class="tpms-modal"><div class="tpms-modal-head"><h3>TPMS Verification Required</h3></div><div class="tpms-modal-body"><p id="tpmsPromptText">Check Goodyear Mobility Cloud for this chassis before adding the inspection?</p><div class="tpms-modal-actions"><button class="tpms-cancel" id="tpmsNo">NO — CANCEL</button><button class="tpms-primary" id="tpmsYes">YES — CHECK TPMS</button></div></div></div>`;document.body.appendChild(b);
    b.querySelector("#tpmsNo").onclick=()=>{pending=null;b.classList.remove("show")};
    b.querySelector("#tpmsYes").onclick=async()=>{b.classList.remove("show");if(pending)await checkTPMS(true)};
    return b;
  }

  function chassisValue(){
    const p=document.getElementById("prefix")?.value||"",n=(document.getElementById("number")?.value||"").trim();
    return p&&/^\d{6}$/.test(n)?p+n:null;
  }
  function setStatus(text,type=""){const el=document.getElementById("tpmsStatus");if(!el)return;el.textContent=text;el.className="tpms-status"+(type?` ${type}`:"")}

  async function checkTPMS(fromPrompt=false){
    const chassis=chassisValue();if(!chassis){setStatus("Enter a valid chassis prefix and 6-digit number first.","warn");return false}
    setStatus(`Checking Goodyear TPMS for ${chassis}…`);document.getElementById("tpmsBadge").textContent="CHECKING";
    try{
      const r=await fetch(`${API_URL}?vehicleId=${encodeURIComponent(chassis)}`,{headers:{Accept:"application/json"},cache:"no-store"});
      if(!r.ok)throw new Error(`Goodyear API returned HTTP ${r.status}`);
      const payload=await r.json();
      renderTPMS(chassis,payload);pending=null;document.getElementById("tpmsBadge").textContent="VERIFIED";setStatus(`TPMS data retrieved for ${chassis}. Review it before adding the inspection.`,"ok");
      document.getElementById("tpmsScreenshot").disabled=false;
      return true;
    }catch(e){
      document.getElementById("tpmsBadge").textContent="ACTION REQUIRED";
      setStatus("TPMS data could not be retrieved. Open Goodyear Mobility Cloud and verify your authorized access/API connection. The inspection was NOT added.","error");
      return false;
    }
  }

  function renderTPMS(chassis,payload){
    const root=payload?.data||payload||{};const tires=Array.isArray(root.tires)?root.tires:[];
    const first=tires[0]||root;
    document.getElementById("tpmsData").classList.remove("tpms-hidden");
    document.getElementById("tpmsChassis").textContent=chassis;
    document.getElementById("tpmsPressure").textContent=first.pressure??first.tirePressure??"—";
    document.getElementById("tpmsTemperature").textContent=first.temperature??first.tireTemperature??"—";
    document.getElementById("tpmsHealth").textContent=first.health??first.status??first.wearState??"—";
    const defects=tires.filter(t=>String(t.status||t.health||"").toLowerCase().includes("alert")||String(t.wearState||"").toLowerCase().includes("fail"));
    const d=document.getElementById("tpmsDefects");if(defects.length){d.classList.remove("tpms-hidden");d.textContent=`TPMS alerts detected: ${defects.length}. Review these results and enter any required defect/job-code information in the work order before submitting.`}else d.classList.add("tpms-hidden");
    document.getElementById("tpmsSnapshotText").textContent=`GOODYEAR TPMS VERIFICATION\nChassis: ${chassis}\nChecked: ${new Date().toLocaleString()}\nPressure: ${document.getElementById("tpmsPressure").textContent}\nTemperature: ${document.getElementById("tpmsTemperature").textContent}\nStatus: ${document.getElementById("tpmsHealth").textContent}`;
    window.EODTPMS={chassis,payload,checkedAt:new Date().toISOString()};
  }

  function createScreenshot(){
    const snap=document.getElementById("tpmsSnapshotText");if(!snap)return;
    const lines=snap.textContent.split("\n");const c=document.createElement("canvas");c.width=1400;c.height=520;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.fillStyle="#001f54";x.fillRect(0,0,c.width,92);x.fillStyle="#fff";x.font="700 34px Arial";x.fillText("GOODYEAR TPMS VERIFICATION",42,58);x.fillStyle="#1e293b";x.font="700 25px Arial";lines.slice(1).forEach((line,i)=>x.fillText(line,42,150+i*58));x.fillStyle="#ffc107";x.fillRect(0,488,c.width,32);const a=document.createElement("a");a.download=`TPMS-${window.EODTPMS?.chassis||"verification"}.png`;a.href=c.toDataURL("image/png");a.click()}

  function interceptAdd(){
    const btn=document.getElementById("addInspection");if(!btn||btn.dataset.tpmsBound)return;btn.dataset.tpmsBound="1";
    btn.addEventListener("click",e=>{
      if(btn.dataset.tpmsBypass==="1"){btn.dataset.tpmsBypass="0";return}
      const chassis=chassisValue();if(!chassis)return;
      e.preventDefault();e.stopImmediatePropagation();pending={chassis};
      document.getElementById("tpmsPromptText").textContent=`Check Goodyear Mobility Cloud for chassis ${chassis} before adding this inspection?`;
      modal().classList.add("show");
    },true);
  }

  function init(){moveLayout();buildCard();interceptAdd();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
  window.addEventListener("load",init,{once:true});
})();
