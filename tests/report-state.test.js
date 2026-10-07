const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../report-state.js');
const draft=()=>({terminal:'HARRISBURG',date:'10/7/26',data:S.emptyData(),notes:''});
const copy=x=>JSON.parse(JSON.stringify(x));
function initial(){const d=draft();d.data.chassis['5652']['Pre-repair'].push(['NSPZ 123456','Defect','original']);d.data.tireAudits=12;return S.save(null,d,'ipad',100);}
test('deletions survive stale cloud and offline recovery',()=>{
 const old=initial(),d=copy(old);d.data.chassis['5652']['Pre-repair']=[];
 const deleted=S.save(old,d,'ipad',200);
 assert.equal(S.flatten(S.merge(old,deleted).data).length,0);
 assert.equal(S.flatten(S.merge(deleted,old).data).length,0);
 assert.equal(Object.values(deleted._sync.records)[0].deleted,true);
});
test('edits retain identity and do not resurrect their previous version',()=>{
 const old=initial(),d=copy(old);d.data.chassis['5652']['Pre-repair'][0][2]='corrected';
 const edited=S.save(old,d,'ipad',200),merged=S.merge(old,edited);
 assert.equal(S.flatten(merged.data).length,1);
 assert.equal(S.flatten(merged.data)[0].note,'corrected');
 assert.equal(S.flatten(merged.data)[0].id,S.flatten(old.data)[0].id);
});
test('audit corrections downward and cleared notes survive a merge',()=>{
 let old=initial(),d=copy(old);d.notes='old notes';old=S.save(old,d,'ipad',200);
 d=copy(old);d.data.tireAudits=3;d.notes='';
 const merged=S.merge(old,S.save(old,d,'ipad',300));
 assert.equal(merged.data.tireAudits,3);assert.equal(merged.notes,'');
});
test('independent offline additions and edit/delete conflicts merge deterministically',()=>{
 const old=initial(),a=copy(old),b=copy(old);
 a.data.containers['5653']['Pre-repair'].push(['ABCD 111111','Defect','']);
 b.data.racks['5657']['Pre-repair'].push(['ZNSU 222222','No Defect','']);
 const left=S.save(old,a,'a',200),right=S.save(old,b,'b',200);
 assert.deepEqual(S.merge(left,right),S.merge(right,left));
 assert.equal(S.flatten(S.merge(left,right).data).length,3);
 const edit=copy(old);edit.data.chassis['5652']['Pre-repair'][0][2]='new';
 const del=copy(old);del.data.chassis['5652']['Pre-repair']=[];
 assert.equal(S.flatten(S.merge(S.save(old,edit,'a',200),S.save(old,del,'b',200)).data).length,0);
});
test('legacy backups get stable IDs and terminal reports cannot be mixed',()=>{
 const old=draft();old.data.chassis['5652']['Pre-repair'].push(['NSPZ 123456','Defect','']);
 assert.deepEqual(S.normalize(old),S.normalize(copy(old)));
 const a=S.normalize(old),b={...a,terminal:'ATLANTA'};
 assert.throws(()=>S.merge(a,b));
});
test('all categories validate duplicates, codes, prefixes and AIMZ length',()=>{
 const records=[{category:'containers',type:'5653',number:'ABCD 123456',id:'one'}];
 assert.match(S.validate('containers','5653','ABCD 123456','HARRISBURG',records),/already/);
 assert.equal(S.validate('containers','5653','ABCD 123456','HARRISBURG',records,'one'),'');
 assert.match(S.validate('racks','5900','ZNSU 123456','HARRISBURG'),/type/);
 assert.match(S.validate('chassis','5652','ABCD 123456','HARRISBURG'),/prefix/);
 assert.equal(S.validate('chassis','5652','AIMZ 12345','HARRISBURG'),'');
 assert.match(S.validate('chassis','5652','AIMZ 123456','HARRISBURG'),/5 digits/);
 assert.match(S.validate('racks','5657','ABCD 123456','HARRISBURG'),/ZNSU/);
});
test('database JSON key reordering does not make a confirmed backup look pending',()=>{
 const state=initial();
 const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,v])=>[key,reorder(v)])):value;
 const cloud=reorder(state);cloud._sync.revision='server-revision';
 assert.equal(S.fingerprint(state),S.fingerprint(cloud));
 assert.equal(S.fingerprint(cloud),S.fingerprint(S.merge(cloud,state)));
});
test('editing legacy duplicates removes every old error version, including after recovery',()=>{
 const legacy=draft();
 legacy.data.chassis['5652']['Pre-repair'].push(['NSPZ 123456','Defect','error'],['NSPZ 123456','No Defect','old correction']);
 const old=S.normalize(legacy),d=copy(old);
 d.data.chassis['5652']['Pre-repair'][0][0]='NSPZ 654321';
 d.data.chassis['5652']['Pre-repair'][0][2]='correct';
 const changed=S.save(old,d,'ipad',200),merged=S.merge(legacy,changed);
 assert.equal(S.flatten(changed.data).length,1);
 assert.equal(S.flatten(merged.data).length,1);
 assert.equal(S.flatten(merged.data)[0].number,'NSPZ 654321');
 assert.equal(Object.values(merged._sync.records).filter(r=>r.deleted).length,1);
});
test('deleting one legacy duplicate retains the other condition',()=>{
 const legacy=draft();legacy.data.chassis['5652']['Pre-repair'].push(['NSPZ 133717','Defect',''],['NSPZ 133717','No Defect','']);
 const old=S.normalize(legacy),d=copy(old);
 d.data.chassis['5652']['Pre-repair']=d.data.chassis['5652']['Pre-repair'].filter(item=>item[1]==='Defect');
 const deleted=S.save(old,d,'ipad',200),merged=S.merge(old,deleted);
 assert.equal(S.flatten(merged.data).length,1);
 assert.equal(S.flatten(merged.data)[0].condition,'Defect');
 assert.equal(S.flatten(S.merge(deleted,old).data).length,1);
});
