(()=>{
  "use strict";
  const SOURCE="https://raw.githubusercontent.com/jtczy6pfmy/EOD-App/802834bbbdcf60bdf4e88772e9d20b4d047b16af/tpms-stage1.js";
  fetch(SOURCE).then(r=>r.text()).then(src=>{
    const oldUrl="https://tiretrac.ap.goodyear.com/WebApp/Membership/Login.aspx?ReturnUrl=%2F";
    const newUrl="https://goodyearmobilitycloud.com";
    if(!src.includes(oldUrl)) throw new Error("TPMS source URL not found");
    src=src.replace(oldUrl,newUrl);
    src=src.replace(
      /document\.getElementById\("tpmsLoginButton"\)\?\.addEventListener\("click",\(\)=>\{[\s\S]*?\n    \}\);\n\n    document\.getElementById\("tpmsOpenCloud"\)/,
      `document.getElementById("tpmsLoginButton")?.addEventListener("click",()=>{
      window.open("${newUrl}","_blank","noopener,noreferrer");
      sessionStorage.setItem("eod_tpms_unlocked","1");
      document.getElementById("tpmsLoginArea").style.display="none";
      document.getElementById("tpmsUnlockedArea").classList.add("show");
      const badge=document.getElementById("tpmsBadge");
      badge.textContent="TPMS LOGIN OPEN";
      badge.classList.add("unlocked");
    });

    document.getElementById("tpmsOpenCloud")`
    );
    (0,eval)(src);
  }).catch(err=>console.error("EOD TPMS module failed to load",err));
})();
