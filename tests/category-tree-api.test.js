import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.NODE_ENV='test';process.env.DATA_DIR=mkdtempSync(join(tmpdir(),'cc-category-test-'));
const {server}=await import('../server/index.js');let base;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(process.env.DATA_DIR,{recursive:true,force:true});});

test('admin saves nested categories, assigns leaf products and protects assigned nodes',async()=>{
 const response=await fetch(base+'/api/store'),store=await response.json(),cookie=response.headers.get('set-cookie').split(';')[0];
 async function request(path,method='GET',body){const r=await fetch(base+'/api/'+path,{method,headers:{cookie,'content-type':'application/json','x-csrf-token':store.csrf},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
 assert.equal((await request('admin/login','POST',{username:'admin',password:'Cricket@2026'})).status,200);
 const subcategories=[{name:'English willow',slug:'english',code:'BAT-EW',displayOrder:20,subcategories:[{name:'Grade 1',slug:'grade-1',code:'BAT-EW-G1',displayOrder:1}]},{name:'Kashmir willow',slug:'kashmir',code:'BAT-KW',displayOrder:10}];
 assert.equal((await request('admin/categories/bats','PATCH',{name:'Cricket bats',code:'BAT',displayOrder:5,subcategories})).status,200);
 const p=store.products.find(p=>p.category==='bats'),edit={id:p.id,stock:p.stock,price:p.price,previousStock:p.stock,previousPrice:p.price,note:'Assign nested subcategory',subcategory:'grade-1'};
 assert.equal((await request('admin/inventory','PATCH',edit)).status,200);
 const fresh=(await request('store')).data;
 assert.equal(fresh.products.find(item=>item.id===p.id).subcategory,'grade-1');
 const bats=fresh.categories.find(c=>c.slug==='bats');
 assert.equal(bats.code,'BAT');assert.equal(bats.displayOrder,5);assert.equal(bats.parentSlug,null);
 assert.deepEqual(bats.subcategories.map(c=>c.slug),['kashmir','english']);
 const leaf=bats.subcategories[1].subcategories[0];
 assert.equal(leaf.slug,'grade-1');assert.equal(leaf.code,'BAT-EW-G1');assert.equal(leaf.displayOrder,1);assert.equal(leaf.parentSlug,'english');
 assert.equal((await request('admin/categories/gloves','PATCH',{name:'Batting gloves',code:'BAT-EW-G1'})).status,400);
 const stored=(await request('store')).data.categories.find(c=>c.slug==='bats');assert.equal(stored.code,'BAT');
 assert.equal((await request('admin/categories/bats','PATCH',{name:'Cricket bats',subcategories:[]})).status,400);
 assert.equal((await request('admin/inventory','PATCH',{...edit,subcategory:'unknown'})).status,400);
 for(const path of ['category-tree.js','category-navigation.js','admin-category-tree.js']){
  const asset=await fetch(base+'/'+path);assert.match(asset.headers.get('content-type'),/javascript/);
 }
});
