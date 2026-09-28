import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.NODE_ENV='test';process.env.DATA_DIR=mkdtempSync(join(tmpdir(),'cc-test-'));
const {server}=await import('../server/index.js');let base;
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(r=>server.close(r));rmSync(process.env.DATA_DIR,{recursive:true,force:true});});
async function client(){const r=await fetch(base+'/api/store');const state=await r.json();const cookie=r.headers.get('set-cookie').split(';')[0];return {state,cookie,async request(path,method='GET',body,csrf=state.csrf){const res=await fetch(base+'/api/'+path,{method,headers:{cookie,'content-type':'application/json','x-csrf-token':csrf},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()};}};}
test('Excel import requires admin, previews without saving, commits once',async()=>{
 const c=await client();assert.equal((await fetch(base+'/api/admin/inventory/template',{headers:{cookie:c.cookie}})).status,401);
 assert.equal((await c.request('admin/login','POST',{username:'admin',password:'Cricket@2026'})).status,200);
 const response=await fetch(base+'/api/admin/inventory/template',{headers:{cookie:c.cookie}});assert.equal(response.status,200);
 const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(await response.arrayBuffer()));
 const p=c.state.products[0];book.getWorksheet('Inventory').addRow([p.sku,p.name,p.brand,p.category,p.price/100,p.stock,p.description,'Imported feature','','','Yes']);
 const file=Buffer.from(await book.xlsx.writeBuffer()).toString('base64');const preview=await c.request('admin/inventory/import-preview','POST',{file});assert.equal(preview.status,200);assert.equal(preview.data.errors.length,0);
 assert.notEqual((await c.request('store')).data.products[0].keyFeatures,'Imported feature');
 const confirm=await c.request('admin/inventory/import-confirm','POST',{token:preview.data.token});assert.equal(confirm.status,200);
 assert.equal((await c.request('store')).data.products[0].keyFeatures,'Imported feature');
 assert.equal((await c.request('admin/inventory/import-confirm','POST',{token:preview.data.token})).status,409);
});

