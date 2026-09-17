(()=>{
  "use strict";

  const GOODYEAR_TPMS_URL="https://tiretrac.ap.goodyear.com/WebApp/Membership/Login.aspx?ReturnUrl=%2F";

  const css=`
    :root{
      --eod-navy:#001f54;
      --eod-navy-2:#002b6d;
      --eod-yellow:#ffc107;
      --eod-bg:#eef2f7;
      --eod-border:#d1d9e6;
      --eod-muted:#64748b;
      --eod-green:#198754;
      --eod-red:#c83c36;
    }
    body{padding:14px;background:var(--eod-bg)}
    header{max-width:1100px;margin:0 auto 14px;border-radius:10px}
    main.app{
      width:min(1100px,100%);
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      grid-template-areas:
        "terminal terminal"
        "chassis chassis"
        "tires tires"
        "tpms tpms"
        "containers racks"
        "notes notes"
        "list list"
        "preview preview";
      gap:14px!important;
      padding-bottom:24px;
    }
    main.app>.sidebar-stack{display:contents!important}
    main.app>.sidebar-stack>section:nth-child(1){grid-area:terminal}
    main.app>.sidebar-stack>section:nth-child(2){grid-area:tires}
    main.app>section:nth-of-type(1){grid-area:chassis}
    main.app>section:nth-of-type(2){grid-area:containers}
    main.app>section:nth-of-type(3){grid-area:racks}
    main.app>section:nth-of-type(4){grid-area:notes}
    main.app>section:nth-of-type(5){grid-area:list}
    main.app>section:nth-of-type(6){grid-area:preview}
    .eod-tpms-card{grid-area:tpms}
    main.app .card{border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,.055)}
    main.app .card-header-styled{padding:11px 16px}
    main.app .card-body{padding:15px}
    .eod-tpms-card .card-header-styled{display:flex;align-items:center;justify-content:space-between}
    .eod-tpms-badge{font-size:.68rem;font-weight:900;letter-spacing:.6px;padding:5px 8px;border-radius:999px;background:#334155;color:#fff}
    .eod-tpms-badge.unlocked{background:var(--eod-green)}
    .eod-tpms-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .eod-tpms-actions{display:flex;gap:10px;align-items:end}
    .eod-tpms-actions button{width:auto;min-width:150px}
    .eod-tpms-status{display:none;padding:10px 12px;border-radius:8px;font-weight:800;font-size:.82rem}
    .eod-tpms-status.show{display:block;background:#ecfdf3;color:#166534;border:1px solid #bbf7d0}
    .eod-tpms-lock{font-size:.78rem;color:var(--eod-muted);margin-top:-3px}
    .eod-tpms-open{display:none}
    .eod-tpms-open.show{display:block}
    .eod-tpms-note{margin:0;font-size:.78rem;color:var(--eod-muted);line-height:1.45}
    .eod-tpms-modal{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(0,13,38,.58);padding:18px}
    .eod-tpms-modal.show{display:flex}
    .eod-tpms-dialog{width:min(500px,100%);background:#fff;border-radius:12px;box-shadow:0 18px 55px rgba(0,0,0,.3);overflow:hidden}
    .eod-tpms-dialog-head{background:linear-gradient(90deg,var(--eod-navy),var(--eod-navy-2));color:#fff;padding:14px 16px;font-weight:900}
    .eod-tpms-dialog-body{padding:18px}
    .eod-tpms-dialog-body p{margin:0 0 14px;line-height:1.5;color:#334155}
    .eod-tpms-dialog-actions{display:flex;gap:10px;margin-top:16px}
    .eod-tpms-dialog-actions button{flex:1}
    .eod-tpms-cancel{background:#e2e8f0!important;color:#1e293b!important}
    .eod-tpms-confirm{background:var(--eod-green)!important;color:#fff!important}
    .eod-tpms-warning{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:9px 11px;border-radius:8px;font-size:.78rem;font-weight:700;margin-top:10px}
    @media(max-width:768px){
      main.app{grid-template-columns:1fr!important;grid-template-areas:"terminal" "chassis" "tires" "tpms" "containers" "racks" "notes" "list" "preview"}
      .eod-tpms-grid{grid-template-columns:1fr}
      .eod-tpms-actions{flex-direction:column;align-items:stretch}
      .eod-tpms-actions button{width:100%}
    }
  `;
  const style=document.createElement("style");style.id="eod-layout-tpms-style";style.textContent=css;document.head.appendChild(style);

  function makeTpmsCard(){
    if(document.getElementById("eodTpmsCard"))return;
    const card=document.createElement("section");
    card.id="eodTpmsCard";card.className="card eod-tpms-card";
    card.innerHTML=`
      <div class="card-header-styled">
        <h2>TPMS</h2>
        <span class="eod-tpms-badge" id="tpmsBadge">LOCKED</span>
      </div>
      <div class="card-body">
        <div id="tpmsLoginArea">
          <div class="eod-tpms-grid">
            <div><label>TPMS Username</label><input id="tpmsUsername" autocomplete="username" placeholder="Enter TPMS username"></div>
            <div><label>TPMS Password</label><input id="tpmsPassword" type="password" autocomplete="current-password" placeholder="Enter TPMS password"></div>
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
    if(app) app.insertBefore(card,chassis?.nextElementSibling||null);

    document.getElementById("tpmsLoginButton")?.addEventListener("click",()=>{
      const u=document.getElementById("tpmsUsername").value.trim();
      const p=document.getElementById("tpmsPassword").value;
      if(!u||!p){alert("Enter your TPMS username and password first.");return}
      sessionStorage.setItem("eod_tpms_unlocked","1");
      document.getElementById("tpmsLoginArea").style.display="none";
      document.getElementById("tpmsUnlockedArea").classList.add("show");
      const badge=document.getElementById("tpmsBadge");badge.textContent="UNLOCKED";badge.classList.add("unlocked");
    });
    document.getElementById("tpmsOpenCloud")?.addEventListener("click",()=>window.open(GOODYEAR_TPMS_URL,"_blank","noopener,noreferrer"));
    document.getElementById("tpmsLockButton")?.addEventListener("click",()=>{
      sessionStorage.removeItem("eod_tpms_unlocked");
      document.getElementById("tpmsUnlockedArea").classList.remove("show");
      document.getElementById("tpmsLoginArea").style.display="block";
      document.getElementById("tpmsUsername").value="";document.getElementById("tpmsPassword").value="";
      const badge=document.getElementById("tpmsBadge");badge.textContent="LOCKED";badge.classList.remove("unlocked");
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
    modal.className="eod-tpms-modal";modal.id="eodTpmsPrompt";
    modal.innerHTML=`<div class="eod-tpms-dialog" role="dialog" aria-modal="true">
      <div class="eod-tpms-dialog-head">TPMS CHECK REQUIRED</div>
      <div class="eod-tpms-dialog-body">
        <p>Before adding this chassis inspection, confirm that the TPMS information has been checked for this chassis.</p>
        <div class="eod-tpms-warning">No TPMS information will be submitted or changed automatically. This is only a confirmation step.</div>
        <div class="eod-tpms-dialog-actions"><button class="eod-tpms-cancel" id="tpmsPromptCancel">NOT YET</button><button class="eod-tpms-confirm" id="tpmsPromptConfirm">YES — TPMS CHECKED</button></div>
      </div></div>`;
    document.body.appendChild(modal);

    const close=()=>modal.classList.remove("show");
    modal.querySelector("#tpmsPromptCancel").addEventListener("click",close);
    modal.querySelector("#tpmsPromptConfirm").addEventListener("click",()=>{
      allowOnce=true;close();btn.click();
    });

    btn.addEventListener("click",e=>{
      if(allowOnce){allowOnce=false;return;}
      e.preventDefault();e.stopImmediatePropagation();
      modal.classList.add("show");
    },true);
  }

  const init=()=>{makeTpmsCard();installTpmsPrompt();};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
