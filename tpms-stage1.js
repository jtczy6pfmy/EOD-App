(()=>{
  "use strict";

  const GOODYEAR_TPMS_URL="https://tiretrac.ap.goodyear.com/WebApp/Membership/Login.aspx?ReturnUrl=%2F";
  const STYLE_ID="eod-tpms-stage1-style";
  const TPMS_ID="eodTpmsCard";

  function ensureStyles(){
    if(document.getElementById(STYLE_ID))return;

    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      /* =========================================================
         EOD WIRE LAYOUT
         Row 1: Terminal | Chassis
         Row 2: Tire Audits | Chassis
         Rows 3-5: TPMS | TPMS
         Row 6: Containers | Chassis Racks
         Row 7: Comments / Notes
         Row 8: Inspection List
         Row 9: Preview
         ========================================================= */
      main.app{
        width:min(1000px,100%)!important;
        margin:auto!important;
        display:grid!important;
        grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
        grid-template-areas:
          "terminal chassis"
          "tires chassis"
          "tpms tpms"
          "tpms tpms"
          "tpms tpms"
          "containers racks"
          "notes notes"
          "list list"
          "preview preview";
        gap:16px!important;
        padding-bottom:40px!important;
      }

      main.app>.sidebar-stack{display:contents!important}
      main.app>.sidebar-stack>section:nth-child(1){grid-area:terminal!important}
      main.app>.sidebar-stack>section:nth-child(2){grid-area:tires!important}

      main.app>.eod-layout-chassis{grid-area:chassis!important}
      main.app>.eod-tpms-card{grid-area:tpms!important}
      main.app>.eod-layout-containers{grid-area:containers!important}
      main.app>.eod-layout-racks{grid-area:racks!important}
      main.app>.eod-layout-notes{grid-area:notes!important}
      main.app>.eod-layout-list{grid-area:list!important}
      main.app>#previewCard{grid-area:preview!important}

      .eod-tpms-card .card-header-styled{display:flex;align-items:center;justify-content:space-between}
      .eod-tpms-badge{font-size:.68rem;font-weight:900;letter-spacing:.6px;padding:5px 8px;border-radius:999px;background:#334155;color:#fff}
      .eod-tpms-badge.unlocked{background:#198754}
      .eod-tpms-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .eod-tpms-actions{display:flex;gap:10px;align-items:end}
      .eod-tpms-actions button{width:auto;min-width:150px}
      .eod-tpms-status{display:none;padding:10px 12px;border-radius:8px;font-weight:800;font-size:.82rem}
      .eod-tpms-status.show{display:block;background:#ecfdf3;color:#166534;border:1px solid #bbf7d0}
      .eod-tpms-lock{font-size:.78rem;color:#64748b;margin-top:-3px}
      .eod-tpms-open{display:none}
      .eod-tpms-open.show{display:block}
      .eod-tpms-note{margin:0;font-size:.78rem;color:#64748b;line-height:1.45}
      .eod-tpms-modal{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(0,13,38,.58);padding:18px}
      .eod-tpms-modal.show{display:flex}
      .eod-tpms-dialog{width:min(500px,100%);background:#fff;border-radius:12px;box-shadow:0 18px 55px rgba(0,0,0,.3);overflow:hidden}
      .eod-tpms-dialog-head{background:linear-gradient(90deg,#001f54,#002b6d);color:#fff;padding:14px 16px;font-weight:900}
      .eod-tpms-dialog-body{padding:18px}
      .eod-tpms-dialog-body p{margin:0 0 14px;line-height:1.5;color:#334155}
      .eod-tpms-dialog-actions{display:flex;gap:10px;margin-top:16px}
      .eod-tpms-dialog-actions button{flex:1}
      .eod-tpms-cancel{background:#e2e8f0!important;color:#1e293b!important}
      .eod-tpms-confirm{background:#198754!important;color:#fff!important}
      .eod-tpms-warning{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:9px 11px;border-radius:8px;font-size:.78rem;font-weight:700;margin-top:10px}

      @media(max-width:768px){
        main.app{
          grid-template-columns:1fr!important;
          grid-template-areas:
            "terminal"
            "tires"
            "chassis"
            "tpms"
            "containers"
            "racks"
            "notes"
            "list"
            "preview";
        }
        .eod-tpms-grid{grid-template-columns:1fr}
        .eod-tpms-actions{flex-direction:column;align-items:stretch}
        .eod-tpms-actions button{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function removeOldStaticTpms(){
    /* The old hard-coded TPMS display in index.html is not live TPMS data.
       Remove it so the login-gated TPMS card is the single TPMS section. */
    document.querySelectorAll("main.app .tpms-section").forEach(el=>el.remove());
  }

  function findCardByTitle(title){
    return [...document.querySelectorAll("main.app>section.card")].find(section=>
      section.querySelector("h2")?.textContent.trim().toLowerCase()===title.toLowerCase()
    );
  }

  function applyWireLayout(){
    const app=document.querySelector("main.app");
    if(!app)return;

    const chassis=document.getElementById("addInspection")?.closest("section.card");
    const containers=findCardByTitle("Containers");
    const racks=findCardByTitle("Chassis Racks");
    const notes=findCardByTitle("Comments / Notes")||findCardByTitle("Notes");
    const list=findCardByTitle("Inspection List");

    chassis?.classList.add("eod-layout-chassis");
    containers?.classList.add("eod-layout-containers");
    racks?.classList.add("eod-layout-racks");
    notes?.classList.add("eod-layout-notes");
    list?.classList.add("eod-layout-list");
  }

  function makeTpmsCard(){
    if(document.getElementById(TPMS_ID))return;

    const card=document.createElement("section");
    card.id=TPMS_ID;
    card.className="card eod-tpms-card";

    card.innerHTML=`
      <div class="card-header-styled">
        <h2>TPMS</h2>
        <span class="eod-tpms-badge" id="tpmsBadge">LOCKED</span>
      </div>
      <div class="card-body">
        <div id="tpmsLoginArea">
          <div class="eod-tpms-grid">
            <div>
              <label>TPMS Username</label>
              <input id="tpmsUsername" autocomplete="username" placeholder="Enter TPMS username">
            </div>
            <div>
              <label>TPMS Password</label>
              <input id="tpmsPassword" type="password" autocomplete="current-password" placeholder="Enter TPMS password">
            </div>
          </div>
          <div class="eod-tpms-actions" style="margin-top:12px">
            <button id="tpmsLoginButton">UNLOCK TPMS</button>
          </div>
          <div class="eod-tpms-lock">Credentials are kept only for this browser session and are not saved by this enhancement.</div>
        </div>

        <div id="tpmsUnlockedArea" class="eod-tpms-open">
          <div class="eod-tpms-status show">✓ TPMS access unlocked for this session.</div>
          <div class="eod-tpms-actions" style="margin-top:12px">
            <button id="tpmsOpenCloud">OPEN GOODYEAR TPMS</button>
            <button id="tpmsLockButton" class="secondary">LOCK TPMS</button>
          </div>
          <p class="eod-tpms-note">Use the TPMS cloud to pull the chassis data and capture the required screenshot for the work order. The EOD app does not automatically submit or change TPMS information.</p>
        </div>
      </div>`;

    const app=document.querySelector("main.app");
    const chassis=document.getElementById("addInspection")?.closest("section.card");

    if(app){
      app.insertBefore(card,chassis?.nextElementSibling||null);
    }

    document.getElementById("tpmsLoginButton")?.addEventListener("click",()=>{
      const u=document.getElementById("tpmsUsername").value.trim();
      const p=document.getElementById("tpmsPassword").value;

      if(!u||!p){
        alert("Enter your TPMS username and password first.");
        return;
      }

      sessionStorage.setItem("eod_tpms_unlocked","1");
      document.getElementById("tpmsLoginArea").style.display="none";
      document.getElementById("tpmsUnlockedArea").classList.add("show");

      const badge=document.getElementById("tpmsBadge");
      badge.textContent="UNLOCKED";
      badge.classList.add("unlocked");
    });

    document.getElementById("tpmsOpenCloud")?.addEventListener("click",()=>
      window.open(GOODYEAR_TPMS_URL,"_blank","noopener,noreferrer")
    );

    document.getElementById("tpmsLockButton")?.addEventListener("click",()=>{
      sessionStorage.removeItem("eod_tpms_unlocked");
      document.getElementById("tpmsUnlockedArea").classList.remove("show");
      document.getElementById("tpmsLoginArea").style.display="block";
      document.getElementById("tpmsUsername").value="";
      document.getElementById("tpmsPassword").value="";

      const badge=document.getElementById("tpmsBadge");
      badge.textContent="LOCKED";
      badge.classList.remove("unlocked");
    });

    if(sessionStorage.getItem("eod_tpms_unlocked")==="1"){
      document.getElementById("tpmsLoginArea").style.display="none";
      document.getElementById("tpmsUnlockedArea").classList.add("show");
      document.getElementById("tpmsBadge").textContent="UNLOCKED";
      document.getElementById("tpmsBadge").classList.add("unlocked");
    }
  }

  function installTpmsPrompt(){
    const btn=document.getElementById("addInspection");
    if(!btn||btn.dataset.tpmsGuardInstalled)return;

    btn.dataset.tpmsGuardInstalled="1";
    let allowOnce=false;

    const modal=document.createElement("div");
    modal.className="eod-tpms-modal";
    modal.id="eodTpmsPrompt";

    modal.innerHTML=`
      <div class="eod-tpms-dialog" role="dialog" aria-modal="true">
        <div class="eod-tpms-dialog-head">TPMS CHECK REQUIRED</div>
        <div class="eod-tpms-dialog-body">
          <p>Before adding this chassis inspection, confirm that the TPMS information has been checked for this chassis.</p>
          <div class="eod-tpms-warning">No TPMS information will be submitted or changed automatically. This is only a confirmation step.</div>
          <div class="eod-tpms-dialog-actions">
            <button class="eod-tpms-cancel" id="tpmsPromptCancel">NOT YET</button>
            <button class="eod-tpms-confirm" id="tpmsPromptConfirm">YES — TPMS CHECKED</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);

    const close=()=>modal.classList.remove("show");

    modal.querySelector("#tpmsPromptCancel").addEventListener("click",close);

    modal.querySelector("#tpmsPromptConfirm").addEventListener("click",()=>{
      allowOnce=true;
      close();
      btn.click();
    });

    btn.addEventListener("click",e=>{
      if(allowOnce){
        allowOnce=false;
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();
      modal.classList.add("show");
    },true);
  }

  function init(){
    ensureStyles();
    removeOldStaticTpms();
    makeTpmsCard();
    applyWireLayout();
    installTpmsPrompt();
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init,{once:true});
  }else{
    init();
  }
})();
