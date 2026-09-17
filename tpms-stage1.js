(()=>{
  "use strict";
  const SOURCE="https://raw.githubusercontent.com/jtczy6pfmy/EOD-App/802834bbbdcf60bdf4e88772e9d20b4d047b16af/tpms-stage1.js";
  fetch(SOURCE).then(r=>r.text()).then(src=>{
    const oldUrl="https://tiretrac.ap.goodyear.com/WebApp/Membership/Login.aspx?ReturnUrl=%2F";
    const newUrl="https://keycloak.goodyearmobilitycloud.com/realms/naps/protocol/openid-connect/auth?client_id=frontend-client-gmc&redirect_uri=https%3A%2F%2Fwww.goodyearmobilitycloud.com%2Fauth%2Fcallback&state=4fb6335c-7f24-404b-98ae-8a770c543a91&response_mode=fragment&response_type=code&scope=openid&nonce=0b99e527-6dff-49a5-8ea4-e68b099d727e&ui_locales=en-US&code_challenge=4MXgDo6jJJV23l-sptRKF-XgY5ZVB_R4wRVX2rGowhY&code_challenge_method=S256";
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
