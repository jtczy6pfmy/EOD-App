(()=>{
  "use strict";

  // Stage 1 only: visual/layout separation.
  // No Goodyear API, authentication, chassis lookup, or inspection interception is performed here.
  // This module is intentionally isolated from the existing EOD inspection logic.

  const STYLE_ID="eod-tpms-stage1-style";
  const TPMS_ID="eod-tpms-stage1-card";
  const EQUIPMENT_ID="eod-equipment-stage1-row";

  function findCard(title){
    return [...document.querySelectorAll("main.app .card")].find(card=>
      card.querySelector("h2")?.textContent?.trim()===title
    );
  }

  function ensureStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      #${TPMS_ID} .tpms-stage1-body{display:flex;flex-direction:column;gap:12px}
      #${TPMS_ID} .tpms-stage1-status{padding:12px;border:1px solid #d1d9e6;border-radius:8px;background:#f8fafc;font-weight:700;color:#334155}
      #${TPMS_ID} .tpms-stage1-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      #${TPMS_ID} .tpms-stage1-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      #${TPMS_ID} button{width:100%}
      #${EQUIPMENT_ID}{grid-column:span 2;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
      #${EQUIPMENT_ID}>.card{min-width:0}
      @media(max-width:768px){
        #${EQUIPMENT_ID}{grid-column:span 1;grid-template-columns:1fr}
        #${TPMS_ID} .tpms-stage1-grid,#${TPMS_ID} .tpms-stage1-actions{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function buildTpmsCard(){
    if(document.getElementById(TPMS_ID))return document.getElementById(TPMS_ID);
    const card=document.createElement("section");
    card.className="card card-full-width";
    card.id=TPMS_ID;
    card.innerHTML=`
      <div class="card-header-styled"><h2>TPMS</h2></div>
      <div class="card-body tpms-stage1-body">
        <div class="tpms-stage1-grid">
          <div>
            <label>Chassis</label>
            <div id="tpmsStage1Chassis" class="tpms-stage1-status">Enter a chassis in the Chassis section below.</div>
          </div>
          <div>
            <label>Status</label>
            <div id="tpmsStage1Status" class="tpms-stage1-status">NOT CONNECTED</div>
          </div>
        </div>
        <div class="tpms-stage1-status">
          Stage 1 is layout-only. Goodyear Mobility Cloud authentication and TPMS data retrieval will be added separately after the layout is confirmed.
        </div>
        <div class="tpms-stage1-actions">
          <button type="button" id="tpmsStage1Check">CHECK TPMS</button>
          <button type="button" id="tpmsStage1Screenshot" class="secondary">GENERATE TPMS SCREENSHOT</button>
        </div>
      </div>`;
    return card;
  }

  function groupEquipment(){
    const app=document.querySelector("main.app");
    if(!app)return false;
    if(document.getElementById(EQUIPMENT_ID))return true;
    const chassis=findCard("Chassis");
    const racks=findCard("Chassis Racks");
    const containers=findCard("Containers");
    if(!chassis||!racks||!containers)return false;
    const row=document.createElement("div");
    row.id=EQUIPMENT_ID;
    row.append(chassis,racks,containers);
    app.appendChild(row);
    return true;
  }

  function placeTpms(){
    const app=document.querySelector("main.app");
    const tpms=buildTpmsCard();
    if(!app||!tpms)return false;
    if(!document.getElementById(TPMS_ID))app.appendChild(tpms);
    const equipment=document.getElementById(EQUIPMENT_ID);
    if(equipment){
      app.insertBefore(tpms,equipment);
    }else{
      app.appendChild(tpms);
    }
    return true;
  }

  function syncChassis(){
    const prefix=document.getElementById("prefix");
    const number=document.getElementById("number");
    const out=document.getElementById("tpmsStage1Chassis");
    if(!out)return;
    const p=prefix?.value||"";
    const n=(number?.value||"").trim();
    out.textContent=p&&/^\\d{6}$/.test(n)?p+n:"Enter a chassis in the Chassis section below.";
  }

  function wire(){
    ensureStyles();
    if(!groupEquipment())return false;
    if(!document.getElementById(TPMS_ID)){
      const card=buildTpmsCard();
      const app=document.querySelector("main.app");
      const equipment=document.getElementById(EQUIPMENT_ID);
      app.insertBefore(card,equipment||null);
    }
    placeTpms();
    document.getElementById("prefix")?.addEventListener("change",syncChassis);
    document.getElementById("number")?.addEventListener("input",syncChassis);
    document.getElementById("tpmsStage1Check")?.addEventListener("click",()=>{
      const status=document.getElementById("tpmsStage1Status");
      if(status)status.textContent="Stage 1 layout only — Mobility Cloud connection not active yet.";
    });
    document.getElementById("tpmsStage1Screenshot")?.addEventListener("click",()=>{
      alert("TPMS screenshot generation will be enabled after the Mobility Cloud data connection is implemented.");
    });
    syncChassis();
    return true;
  }

  const timer=setInterval(()=>{if(wire())clearInterval(timer)},100);
  setTimeout(()=>clearInterval(timer),30000);
})();
