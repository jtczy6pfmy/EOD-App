(()=>{
"use strict";

const TARGET=28;
const MILESTONES={
  7:{icon:"🎯",title:"25% COMPLETE!",subtitle:"7 / 28 INSPECTIONS",color:"#22B7F0",highlight:"#A8EEFF"},
  14:{icon:"👽",title:"50% COMPLETE!",subtitle:"14 / 28 INSPECTIONS",color:"#65D64A",highlight:"#C8FFB8"},
  21:{icon:"⚡",title:"75% COMPLETE!",subtitle:"21 / 28 INSPECTIONS",color:"#FF7A35",highlight:"#FFD0A8"},
  28:{icon:"🏆",title:"DAILY TARGET COMPLETE!",subtitle:"28 / 28 INSPECTIONS",color:"#F04B32",highlight:"#FFB0A5"}
};

let lastTotal=null;
let showing=false;
let styleInjected=false;
let savedTerminalNodes=null;

function injectStyles(){
  if(styleInjected)return;
  styleInjected=true;
  const style=document.createElement("style");
  style.textContent=`
    .fill.milestone-pulse{
      position:relative;
      overflow:hidden;
      background-image:linear-gradient(
        110deg,
        var(--milestone-color,#ffc107) 0%,
        var(--milestone-color,#ffc107) 38%,
        var(--milestone-highlight,#ffe47a) 49%,
        var(--milestone-highlight,#ffe47a) 51%,
        var(--milestone-color,#ffc107) 62%,
        var(--milestone-color,#ffc107) 100%
      );
      background-size:220% 100%;
      animation:eodBarHighlight 2.4s linear infinite;
      box-shadow:0 0 8px var(--milestone-glow,#ffc107);
    }

    @keyframes eodBarHighlight{
      from{background-position:200% 0}
      to{background-position:-20% 0}
    }

    .eod-milestone{
      min-height:168px;display:flex;flex-direction:column;align-items:center;
      justify-content:center;text-align:center;border-radius:10px;color:#fff;
      animation:eodMilestoneIn .35s ease-out;
      box-shadow:inset 0 0 0 2px rgba(255,255,255,.2),0 0 18px rgba(34,183,240,.18)
    }
    .eod-milestone-icon{font-size:3.6rem;line-height:1;margin-bottom:8px;animation:eodIconBounce .8s ease-in-out infinite alternate}
    .eod-milestone-title{font-size:1.45rem;font-weight:900;letter-spacing:.7px}
    .eod-milestone-subtitle{margin-top:6px;font-size:.9rem;font-weight:800;letter-spacing:.8px;opacity:.95}
    @keyframes eodMilestoneIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
    @keyframes eodIconBounce{from{transform:translateY(0) scale(1)}to{transform:translateY(-7px) scale(1.08)}}
  `;
  document.head.appendChild(style);
}

function getColor(total){
  if(total>=28)return MILESTONES[28].color;
  if(total>=21)return MILESTONES[21].color;
  if(total>=14)return MILESTONES[14].color;
  if(total>=7)return MILESTONES[7].color;
  return "#ffc107";
}

function getHighlight(total){
  if(total>=28)return MILESTONES[28].highlight;
  if(total>=21)return MILESTONES[21].highlight;
  if(total>=14)return MILESTONES[14].highlight;
  if(total>=7)return MILESTONES[7].highlight;
  return "#FFE47A";
}

function highestReached(total){
  return [7,14,21,28].filter(mark=>total>=mark).pop()||0;
}

function showInTerminal(m){
  if(showing)return;
  const terminal=document.getElementById("terminal");
  const body=terminal?.closest(".card")?.querySelector(".card-body");
  if(!body)return;

  showing=true;
  savedTerminalNodes=Array.from(body.childNodes);

  const panel=document.createElement("div");
  panel.className="eod-milestone";
  panel.style.background=`linear-gradient(135deg,${m.color},#101827 55%,#05070D)`;
  panel.innerHTML=
    `<div class="eod-milestone-icon">${m.icon}</div>`+
    `<div class="eod-milestone-title">${m.title}</div>`+
    `<div class="eod-milestone-subtitle">${m.subtitle}</div>`;
  body.replaceChildren(panel);

  setTimeout(()=>{
    if(savedTerminalNodes)body.replaceChildren(...savedTerminalNodes);
    savedTerminalNodes=null;
    showing=false;
  },2800);
}

function update(total,initial=false){
  injectStyles();
  const count=Number(total)||0;
  const fill=document.getElementById("fill");

  if(fill){
    const color=getColor(count);
    const highlight=getHighlight(count);
    fill.style.setProperty("--milestone-color",color);
    fill.style.setProperty("--milestone-highlight",highlight);
    fill.style.setProperty("--milestone-glow",color);
    fill.style.backgroundColor=color;
    fill.classList.add("milestone-pulse");
  }

  if(initial){
    const reached=highestReached(count);
    if(reached)showInTerminal(MILESTONES[reached]);
  }else if(MILESTONES[count]&&count!==lastTotal){
    showInTerminal(MILESTONES[count]);
  }

  lastTotal=count;
}

function wireEnterToButton(inputId,buttonId){
  const input=document.getElementById(inputId);
  const button=document.getElementById(buttonId);
  if(!input||!button)return;
  input.addEventListener("keydown",event=>{
    if(event.key!=="Enter")return;
    event.preventDefault();
    button.click();
  });
}

function wireInspectionEnter(){
  wireEnterToButton("number","addInspection");
  wireEnterToButton("equipmentNote","addInspection");
  wireEnterToButton("containerNumber","addContainerInspection");
  wireEnterToButton("containerNote","addContainerInspection");
  wireEnterToButton("rackNumber","addRackInspection");
  wireEnterToButton("rackNote","addRackInspection");
  wireEnterToButton("tireAuditTotal","addTireAudits");
}

function watchCount(){
  const count=document.getElementById("count");
  if(!count){requestAnimationFrame(watchCount);return}
  update(Number.parseInt(count.textContent,10)||0,true);
  new MutationObserver(()=>update(Number.parseInt(count.textContent,10)||0,false)).observe(count,{childList:true,characterData:true,subtree:true});
  wireInspectionEnter();
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",watchCount,{once:true});
}else{
  watchCount();
}

window.EODMilestones={update,getColor,getHighlight,TARGET};
})();
