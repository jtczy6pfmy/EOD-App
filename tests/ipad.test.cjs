const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.EOD_PLAYWRIGHT_MODULE||'playwright');
const S=require('../report-state.js');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
// PostgreSQL JSONB does not preserve JavaScript property insertion order.
const databaseJSON=value=>Array.isArray(value)?value.map(databaseJSON):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.length-b.length||a.localeCompare(b)).map(([key,v])=>[key,databaseJSON(v)])):value;
let browser,server;
(async()=>{
 const errors=[],alerts=[],cloud=new Map();let delayedWrite=false,injectConflict=false;
 server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.PNG')||file.endsWith('.png')?'image/png':'text/plain');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,...(process.env.EOD_BROWSER_CHANNEL?{channel:process.env.EOD_BROWSER_CHANNEL}:{})});
 const context=await browser.newContext({viewport:{width:1024,height:1366},deviceScaleFactor:1,hasTouch:true});
 await context.route('https://*.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()==='GET'){
   const terminal=url.searchParams.get('terminal')?.slice(3),row=cloud.get(terminal);
   await route.fulfill({json:row?[{app_state:databaseJSON(row)}]:[]});return;
  }
  const body=request.postDataJSON(),terminal=request.method()==='POST'?body.terminal:url.searchParams.get('terminal').slice(3);
  if(delayedWrite){delayedWrite=false;await new Promise(resolve=>setTimeout(resolve,700));}
  if(request.method()==='PATCH'){
   if(injectConflict){
    injectConflict=false;const old=cloud.get(terminal),draft=copy(old);
    draft.data.racks['5657']['Pre-repair'].push(['ZNSU 444444','Defect','Added by another device']);
    const remote=S.save(old,draft,'other-device');remote._sync.revision='competing-revision';cloud.set(terminal,remote);
   }
   const current=cloud.get(terminal),filter=url.searchParams.get('app_state->_sync->>revision');
   if(filter!==(current?._sync?.revision?'eq.'+current._sync.revision:'is.null')){await route.fulfill({json:[]});return;}
  }else if(cloud.has(terminal)){await route.fulfill({status:409,json:{}});return;}
  cloud.set(terminal,databaseJSON(body.app_state));await route.fulfill({json:[{app_state:databaseJSON(body.app_state)}]});
 });
 const page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 page.on('dialog',async dialog=>{alerts.push(dialog.message());await dialog.accept();});
 const base=`http://127.0.0.1:${server.address().port}/index.html`;
 const saved=()=>page.waitForFunction(()=>document.getElementById('cloudStatus').dataset.state==='saved');
 await page.goto(base);
 await page.locator('#terminal').selectOption('HARRISBURG');
 await page.locator('#number').fill('123456');await page.locator('#addInspection').click();await saved();
 assert.equal(cloud.get('HARRISBURG').data.chassis['5652']['Pre-repair'].length,1);
 assert.equal(await page.locator('#cloudStatus').evaluate(el=>getComputedStyle(el).color),'rgb(74, 222, 128)');
 assert.equal(await page.locator('.cloud-check').evaluate(el=>getComputedStyle(el).display),'block');
 await page.locator('#tab-containers').click();assert.equal(await page.locator('#panel-chassis').isVisible(),false);
 await page.locator('#containerPrefix').fill('ABCD');await page.locator('#containerNumber').fill('111111');await page.locator('#addContainerInspection').click();await saved();
 assert.equal(await page.locator('#container5653Defects').textContent(),'1');
 assert.equal(await page.locator('#container5653NoDefects').textContent(),'0');
 await page.locator('#containerPrefix').fill('ABCD');await page.locator('#containerNumber').fill('111111');await page.locator('#addContainerInspection').click();
 assert.match(alerts.at(-1),/already/);
 await page.locator('.inspection-row').filter({hasText:'ABCD 111111'}).locator('button').click();
 const options=await page.locator('.inspection-edit select').first().locator('option').evaluateAll(items=>items.map(x=>x.value));
 assert.deepEqual(options,['5653','5900','5658']);
 await page.locator('.inspection-edit select').last().selectOption('No Defect');
 await page.locator('.inspection-edit input').last().fill('<img src=x onerror="window.bad=true">');
 await page.getByRole('button',{name:'Save',exact:true}).click();await saved();
 assert.equal(await page.evaluate(()=>window.bad),undefined);
 assert.equal(S.flatten(cloud.get('HARRISBURG').data).filter(x=>x.number==='ABCD 111111').length,1);
 assert.equal(await page.locator('#container5653Defects').textContent(),'0');
 assert.equal(await page.locator('#container5653NoDefects').textContent(),'1');
 await page.locator('.inspection-row').filter({hasText:'ABCD 111111'}).locator('button').click();
 await page.getByRole('button',{name:'Delete inspection',exact:true}).click();await saved();
 await page.reload();await saved();assert.equal(await page.locator('.inspection-row').count(),1);
 assert.equal(await page.locator('#container5653NoDefects').textContent(),'0');
 await page.locator('#tireAuditTotal').fill('6');await page.locator('#addTireAudits').click();await saved();
 await page.locator('#tireAuditTotal').fill('3');await page.locator('#addTireAudits').click();await saved();
 assert.equal(cloud.get('HARRISBURG').data.tireAudits,3);
 // Offline entries survive reload and reconnect; the check mark is removed.
 await context.setOffline(true);
 await page.locator('#number').fill('222222');await page.locator('#addInspection').click();
 await page.waitForFunction(()=>document.getElementById('cloudStatus').dataset.state==='offline');
 assert.equal(await page.locator('.cloud-check').evaluate(el=>getComputedStyle(el).display),'none');
 await context.setOffline(false);await saved();
 await page.reload();await saved();assert.equal(await page.locator('.inspection-row').count(),2);
 // Edits made during a pending upload must also reach the cloud.
 delayedWrite=true;
 await page.locator('#notes').fill('first');
 await page.waitForTimeout(400);
 await page.locator('#notes').fill('latest');await saved();assert.equal(cloud.get('HARRISBURG').notes,'latest');
 // A conditional write conflict merges another device's addition.
 injectConflict=true;await page.locator('#notes').fill('merged');await saved();
 assert.equal(S.flatten(cloud.get('HARRISBURG').data).length,3);
 assert.equal(cloud.get('HARRISBURG').notes,'merged');
 assert.equal(await page.locator('#rack5657Defects').textContent(),'1');
 assert.equal(await page.locator('#rack5657NoDefects').textContent(),'0');
 // A cloud recovery must preserve an unsaved inspection edit.
 await page.locator('.inspection-row').filter({hasText:'NSPZ 123456'}).locator('button').click();
 await page.locator('.inspection-edit input').last().fill('still typing');
 await page.evaluate(()=>{
  const state=window.EODCloud.read('HARRISBURG'),draft=JSON.parse(JSON.stringify(state));
  draft.data.racks['5657']['Pre-repair'].push(['ZNSU 555555','Defect','recovery']);
  const recovered=window.EODState.save(state,draft,'recovery');
  window.dispatchEvent(new CustomEvent('eod:recovered',{detail:recovered}));
 });
 assert.equal(await page.locator('.inspection-edit input').last().inputValue(),'still typing');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.locator('#terminal').selectOption('ATLANTA');assert.equal(await page.locator('.inspection-row').count(),0);
 await page.locator('#number').fill('333333');await page.locator('#addInspection').click();await saved();
 assert.equal(S.flatten(cloud.get('ATLANTA').data).length,1);
 await page.locator('#terminal').selectOption('HARRISBURG');await saved();assert.equal(await page.locator('.inspection-row').count(),3);
 await page.locator('#tab-racks').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#tab-chassis').getAttribute('aria-selected'),'true');
 // iPad portrait, landscape, and narrow split-screen have no horizontal overflow.
 for(const [width,height] of [[1024,1366],[1366,1024],[768,1024],[507,1024]]){
  await page.setViewportSize({width,height});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,`overflow at ${width}`);
 }
 await page.setViewportSize({width:1024,height:1366});await page.locator('#tab-chassis').click();
 if(process.env.EOD_SCREENSHOT)await page.screenshot({path:process.env.EOD_SCREENSHOT,fullPage:true});
 // Repairing an old duplicated entry must leave only the corrected row.
 const legacy={terminal:'BETHLEHEM',date:cloud.get('HARRISBURG').date,data:S.emptyData(),notes:''};
 legacy.data.chassis['5652']['Pre-repair'].push(['NSPZ 666666','Defect','error'],['NSPZ 666666','No Defect','earlier correction']);
 cloud.set('BETHLEHEM',legacy);
 await page.locator('#terminal').selectOption('BETHLEHEM');await saved();
 assert.equal(await page.locator('.inspection-row').count(),2);
 await page.locator('.inspection-row').filter({hasText:'NSPZ 666666'}).first().locator('button').click();
 await page.locator('.inspection-edit input').last().fill('final correction');
 await page.getByRole('button',{name:'Save',exact:true}).click();await saved();
 assert.equal(await page.locator('.inspection-row').count(),1);
 await page.reload();await saved();assert.equal(await page.locator('.inspection-row').count(),1);
 assert.match(await page.locator('.inspection-row').textContent(),/final correction/);
 // Storage failure must never be reported as a successful local save.
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('quota exceeded')};});
 await page.locator('#notes').fill('storage failure');
 assert.equal(await page.locator('#cloudStatus').getAttribute('data-state'),'error');
 assert.match(await page.locator('#cloudStatusText').textContent(),/storage unavailable/);
 assert.deepEqual(errors,[]);
 console.log('PASS: iPad tabs/layout, edits/deletes, duplicates, cloud indicator, offline recovery, pending writes, conflicting writes and terminal isolation.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
