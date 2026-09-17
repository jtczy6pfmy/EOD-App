(()=>{
  "use strict";
  const SOURCE="https://raw.githubusercontent.com/jtczy6pfmy/EOD-App/802834bbbdcf60bdf4e88772e9d20b4d047b16af/tpms-stage1.js";
  fetch(SOURCE).then(r=>r.text()).then(src=>{
    const oldUrl="https://tiretrac.ap.goodyear.com/WebApp/Membership/Login.aspx?ReturnUrl=%2F";
    const newUrl="https://goodyearmobilitycloud.com";
    if(!src.includes(oldUrl)) throw new Error("TPMS source URL not found");
    src=src.replaceAll(oldUrl,newUrl);

    const start=src.indexOf("  function makeTpmsCard(){");
    const end=src.indexOf("  function installTpmsPrompt(){",start);
    if(start<0||end<0) throw new Error("TPMS card function not found");

    const embeddedCard=`  function makeTpmsCard(){
    if(document.getElementById(TPMS_ID))return;

    const card=document.createElement("section");
    card.id=TPMS_ID;
    card.className="card eod-tpms-card";

    card.innerHTML=\`
      <div class="card-header-styled">
        <h2>TPMS / GOODYEAR MOBILITY CLOUD</h2>
        <span class="eod-tpms-badge unlocked">MOBILITY CLOUD</span>
      </div>
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
          <p class="eod-tpms-note" style="margin:0">Log in to Goodyear Mobility Cloud below, pull up the chassis, and review the TPMS information.</p>
          <button type="button" id="tpmsOpenCloud" class="secondary" style="width:auto;min-width:190px">OPEN IN NEW TAB</button>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;background:#fff;min-height:650px">
          <iframe
            id="tpmsMobilityCloudFrame"
            title="Goodyear Mobility Cloud"
            src="${newUrl}"
            style="display:block;width:100%;height:650px;border:0;background:#fff"
            loading="eager"
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>
        <p class="eod-tpms-note" style="margin-top:10px">If Goodyear prevents the Mobility Cloud from being displayed inside EOD, use OPEN IN NEW TAB. The EOD app does not capture, store, or submit your Goodyear credentials.</p>
      </div>\`;

    const app=document.querySelector("main.app");
    const chassis=document.getElementById("addInspection")?.closest("section.card");
    if(app) app.insertBefore(card,chassis?.nextElementSibling||null);

    document.getElementById("tpmsOpenCloud")?.addEventListener("click",()=>
      window.open("${newUrl}","_blank","noopener,noreferrer")
    );
  }\n\n`;

    src=src.slice(0,start)+embeddedCard+src.slice(end);
    (0,eval)(src);
  }).catch(err=>console.error("EOD TPMS module failed to load",err));
})();
