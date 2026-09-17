(()=>{
  "use strict";
  function wire(){
    const status=document.getElementById("tpmsStatus"),btn=document.getElementById("addInspection");
    if(!status||!btn||status.dataset.flowFix)return false;
    status.dataset.flowFix="1";
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
