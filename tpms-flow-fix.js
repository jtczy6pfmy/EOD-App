(()=>{
  "use strict";
  function wire(){
    const status=document.getElementById("tpmsStatus"),btn=document.getElementById("addInspection"),prefix=document.getElementById("prefix"),number=document.getElementById("number");
    if(!status||!btn||status.dataset.flowFix)return false;
    status.dataset.flowFix="1";
    const chassis=()=>{const p=prefix?.value||"",n=(number?.value||"").trim();return p&&/^\d{6}$/.test(n)?p+n:null};
    const clearIfChanged=()=>{if(btn.dataset.tpmsVerifiedFor&&btn.dataset.tpmsVerifiedFor!==chassis()){btn.dataset.tpmsVerifiedFor="";btn.dataset.tpmsBypass="0";window.EODTPMS=null;status.className="tpms-status warn";status.textContent="Chassis changed. TPMS verification is required again before adding the inspection.";document.getElementById("tpmsBadge")&&(document.getElementById("tpmsBadge").textContent="NOT CHECKED")}};
    prefix?.addEventListener("change",clearIfChanged);number?.addEventListener("input",clearIfChanged);
    const mark=()=>{
      if(status.classList.contains("ok")&&window.EODTPMS?.chassis){
        btn.dataset.tpmsVerifiedFor=window.EODTPMS.chassis;
        btn.dataset.tpmsBypass="1";
        btn.title="TPMS verified. Click ADD INSPECTION to continue.";
      }
    };
    new MutationObserver(mark).observe(status,{attributes:true,childList:true,subtree:true});
    mark();
    return true;
  }
  const timer=setInterval(()=>{if(wire())clearInterval(timer)},100);
  setTimeout(()=>clearInterval(timer),30000);
})();
