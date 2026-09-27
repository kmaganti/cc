import {test} from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {template,parseInventory} from '../server/inventory-excel.js';
const categories=[{slug:'bats',name:'Bats',image:'bat.jpg'}],locations=['22Yards','Rangoli'];
async function workbook(rows){const b=new ExcelJS.Workbook();await b.xlsx.load(await template(categories,locations));rows.forEach(r=>b.getWorksheet('Inventory').addRow(r));return Buffer.from(await b.xlsx.writeBuffer()).toString('base64');}
test('template round trip creates and updates with dollars and location allocations',async()=>{
 const file=await workbook([['CC-1','Test bat','SS','bats',109.99,3,'Overview','Feature','Info','Small|Large','Yes',1,2]]);
 const created=await parseInventory(file,[],categories,locations);assert.deepEqual(created.errors,[]);assert.equal(created.rows[0].fields.price,10999);assert.equal(created.rows[0].fields.isNew,true);assert.equal(created.rows[0].locationStock.Rangoli,2);
 const updated=await parseInventory(file,[{id:'old',sku:'cc-1',price:9999,stock:4}],categories,locations);assert.equal(updated.rows[0].action,'Update');assert.equal(updated.rows[0].id,'old');
});
test('invalid row, duplicated SKU, formula and location mismatch are reported',async()=>{
 const valid=['CC-1','Bat','SS','bats',100,2,'Overview'];
 const parsed=await parseInventory(await workbook([valid,valid,['CC-2','Bat','SS','missing',100,2,'Overview'],['CC-3','Bat','SS','bats',{formula:'10+20',result:30},2,'Overview'],['CC-4','Bat','SS','bats',100,2,'Overview','','','','',1,3]]),[],categories,locations);
 assert.equal(parsed.errors.length,4);
});
test('empty workbook and invalid files fail clearly',async()=>{
 await assert.rejects(parseInventory(await workbook([]),[],categories,locations),/empty/);
 await assert.rejects(parseInventory('invalid',[],categories,locations),/Cannot read/);
});
