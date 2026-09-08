(()=>{
"use strict";

const STORAGE_KEY="eodInspectionReport_v9";
const RELOAD_RESET_FLAG="eodInspectionReloadResetDone";

const navigationEntry=performance.getEntriesByType("navigation")[0];
const isReload=navigationEntry?.type==="reload";

if(isReload&&sessionStorage.getItem(RELOAD_RESET_FLAG)!=="1"){
 localStorage.removeItem(STORAGE_KEY);
 sessionStorage.setItem(RELOAD_RESET_FLAG,"1");
 window.location.reload();
 return;
}

sessionStorage.removeItem(RELOAD_RESET_FLAG);

// Dynamically compute milestone steps based on the current target
function getTarget() {
 const terminalSelect = document.getElementById("terminal");
 const val = terminalSelect ? terminalSelect.value : "";
 if(val === "HARRISBURG") return 30;
 if(["CHGO 63RD","CHICAGO 47TH","CALUMET","LANDERS"].includes(val)) return 26;
 return 28;
}

function getMilestones() {
 const target = getTarget();
 const m1 = Math.round(target * 0.25);
 const m2 = Math.round(target * 0.50);
 const m3 = Math.round(target * 0.75);
 const m4 = target;

 const milestones = {};
 milestones[m1] = { icon: "🎯", title: "25% COMPLETE!", subtitle: `${m1} / ${target} INSPECTIONS`, color: "#22B7F0" };
 milestones[m2] = { icon: "👽", title: "50% COMPLETE!", subtitle: `${m2} / ${target} INSPECTIONS`, color: "#65D64A" };
 milestones[m3] = { icon: "⚡", title: "75% COMPLETE!", subtitle: `${m3} / ${target} INSPECTIONS`, color: "#FF7A35" };
 milestones[m4] = { icon: "🏆", title: "DAILY TARGET COMPLETE!", subtitle: `${m4} / ${target} INSPECTIONS`, color: "#F04B32" };
 return milestones;
}

let lastTotal=null;
let showing=false;
let styleInjected=false;
let savedTerminalNodes=null;

function injectStyles(){
 if(styleInjected)return;
 styleInjected=true;
 const style=document.createElement("style");
 style.textContent=`
  .fill{
   transition:
    width .6s cubic-bezier(.22,1,.36,1),
    background-color .55s ease!important;
  }
  .fill.milestone-pulse{
   animation:eodPulse .75s ease 2;
  }
  .eod-milestone{
   min-height:168px;
   display:flex;
   flex-direction:column;
   align-items:center;
   justify-content:center;
   text-align:center;
   border-radius:10px;
   color:#fff;
   animation:eodMilestoneIn .35s ease-out;
   box-shadow:
    inset 0 0 0 2px rgba(255,255,255,.2),
    0 0 18px rgba(34,183,240,.18);
  }
  .eod-milestone-icon{
   font-size:3.6rem;
   line-height:1;
   margin-bottom:8px;
   animation:eodIconBounce .8s ease-in-out infinite alternate;
  }
  .eod-milestone-title{
   font-size:1.45rem;
   font-weight:900;
   letter-spacing:.7px;
  }
  .eod-milestone-subtitle{
   margin-top:6px;
   font-size:.9rem;
   font-weight:800;
   letter-spacing:.8px;
   opacity:.95;
  }
  @keyframes eodPulse{
   50%{
    transform:scaleY(1.55);
    filter:brightness(1.25);
   }
  }
  @keyframes eodMilestoneIn{
   from{
    opacity:0;
    transform:scale(.88);
   }
   to{
    opacity:1;
    transform:scale(1);
   }
  }
  @keyframes eodIconBounce{
   from{
    transform:translateY(0) scale(1);
   }
   to{
    transform:translateY(-7px) scale(1.08);
   }
  }
 `;
 document.head.appendChild(style);
}

function getColor(n){
 const MILESTONES = getMilestones();
 const keys = Object.keys(MILESTONES).map(Number).sort((a,b)=>a-b);
 if(n>=keys[3])return MILESTONES[keys[3]].color;
 if(n>=keys[2])return MILESTONES[keys[2]].color;
 if(n>=keys[1])return MILESTONES[keys[1]].color;
 if(n>=keys[0])return MILESTONES[keys[0]].color;
 return "#22B7F0";
}

function highestReached(total){
 const MILESTONES = getMilestones();
 return [...Object.keys(MILESTONES).map(Number)]
  .filter(mark=>total>=mark)
  .pop()||0;
}

function showInTerminal(m){
 if(showing)return;
 const terminalCard=
  document.getElementById("terminal")?.closest(".card");
 const body=
  terminalCard?.querySelector(".card-body");
 if(!body)return;
 showing=true;
 savedTerminalNodes=
  Array.from(body.childNodes);
 const panel=document.createElement("div");
 panel.className="eod-milestone";
 panel.style.background=
  `linear-gradient(
   135deg,
   ${m.color},
   #101827 55%,
   #05070D
  )`;
 panel.innerHTML=
  `<div class="eod-milestone-icon">${m.icon}</div>`+
  `<div class="eod-milestone-title">${m.title}</div>`+
  `<div class="eod-milestone-subtitle">${m.subtitle}</div>`;
 body.replaceChildren(panel);
 setTimeout(()=>{
  if(savedTerminalNodes)
   body.replaceChildren(...savedTerminalNodes);
  savedTerminalNodes=null;
  showing=false;
 },2800);
}

function update(n,initial=false){
 injectStyles();
 const total=Number(n)||0;
 const fill=
  document.getElementById("fill");
 const MILESTONES = getMilestones();

 if(fill){
  fill.style.backgroundColor=getColor(total);
  fill.classList.remove("milestone-pulse");
  void fill.offsetWidth;
  if(MILESTONES[total])
   fill.classList.add("milestone-pulse");
 }

 if(initial){
  const reached=highestReached(total);
  if(reached)
   showInTerminal(MILESTONES[reached]);
 }else if(
  MILESTONES[total]&&
  total!==lastTotal
 ){
  showInTerminal(MILESTONES[total]);
 }
 lastTotal=total;
}

function watchCount(){
 const count=
  document.getElementById("count");
 if(!count){
  requestAnimationFrame(watchCount);
  return;
 }
 const initialTotal=
  Number.parseInt(count.textContent,10)||0;
 update(initialTotal,true);
 new MutationObserver(()=>{
  update(
   Number.parseInt(
    count.textContent,
    10
   )||0,
   false
  );
 }).observe(count,{
  childList:true,
  characterData:true,
  subtree:true
 });
}

if(document.readyState==="loading"){
 document.addEventListener(
  "DOMContentLoaded",
  watchCount,
  {once:true}
 );
}else{
 watchCount();
}

window.EODMilestones={
 update,
 getColor
};

})();
