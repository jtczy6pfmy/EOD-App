(()=>{
  "use strict";
  const SOURCE="https://raw.githubusercontent.com/jtczy6pfmy/EOD-App/802834bbbdcf60bdf4e88772e9d20b4d047b16af/tpms-stage1.js";
  fetch(SOURCE).then(r=>r.text()).then(src=>{
    const oldUrl="https://tiretrac.ap.goodyear.com/WebApp/Membership/Login.aspx?ReturnUrl=%2F";
    const newUrl="https://goodyearmobilecloud.com";
    if(!src.includes(oldUrl)) throw new Error("TPMS source URL not found");
    (0,eval)(src.replace(oldUrl,newUrl));
  }).catch(err=>console.error("EOD TPMS module failed to load",err));
})();
