import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.NODE_ENV='test';process.env.DATA_DIR=mkdtempSync(join(tmpdir(),'cc-test-'));
const {server}=await import('../server/index.js');let base;
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(r=>server.close(r));rmSync(process.env.DATA_DIR,{recursive:true,force:true});});
async function client(){const r=await fetch(base+'/api/store');const state=await r.json();const cookie=r.headers.get('set-cookie').split(';')[0];return {state,cookie,async request(path,method='GET',body,csrf=state.csrf){const res=await fetch(base+'/api/'+path,{method,headers:{cookie,'content-type':'application/json','x-csrf-token':csrf},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()};}};}
const add={id:'ss-ton-reserve',option:'Short handle',quantity:1};
const customer={email:'test@example.com',firstName:'Test',lastName:'Player',address:'1 Example Street',city:'Testville',state:'OH',zip:'43215',requestId:'12345678-1234-4321-1234-123456789abc'};
test('catalog, asset serving and private filesystem protection',async()=>{const c=await client();assert.equal(c.state.products.length,21);assert.equal(c.state.categories.length,10);const css=await fetch(base+'/styles.css');assert.match(css.headers.get('content-type'),/text\/css/);const env=await fetch(base+'/.env');assert.doesNotMatch(await env.text(),/DB_PASSWORD/);const asset=await fetch(base+'/assets/bat-ss.jpg');assert.equal(asset.status,200);});
test('CSRF, product options and quantities are checked on the server',async()=>{const c=await client();assert.equal((await c.request('cart','POST',add,'wrong')).status,403);assert.equal((await c.request('cart','POST',{...add,option:'Fake'})).status,400);assert.equal((await c.request('cart','POST',{...add,quantity:-1})).status,400);assert.equal((await c.request('cart','POST',{...add,quantity:1.2})).status,400);assert.equal((await c.request('cart','POST',{...add,quantity:26})).status,400);});
test('server prices, aggregate variant stock, shipping and cart removal',async()=>{const c=await client();let r=await c.request('cart','POST',{...add,price:1,quantity:20});assert.equal(r.data.subtotal,44999*20);assert.equal(r.data.shipping,0);assert.equal((await c.request('cart','POST',{...add,option:'Long handle',quantity:6})).status,400);r=await c.request('cart','PATCH',{key:add.id+'|'+add.option,quantity:0});assert.equal(r.data.count,0);r=await c.request('cart','POST',{id:'sg-test-ball',option:'Standard',quantity:1});assert.equal(r.data.total,2999+999);});
test('checkout validates, persists, decrements inventory, and is idempotent',async()=>{const c=await client();await c.request('cart','POST',add);assert.equal((await c.request('orders','POST',{...customer,email:'invalid'})).status,400);const first=await c.request('orders','POST',{...customer,total:1});assert.equal(first.status,201);const retry=await c.request('orders','POST',customer);assert.equal(retry.data.number,first.data.number);const order=await c.request('orders/'+first.data.number);assert.equal(order.data.total,44999);assert.equal(order.data.email,undefined);assert.equal(order.data.customer,undefined);const fresh=await c.request('store');assert.equal(fresh.data.cart.count,0);assert.equal(fresh.data.products.find(p=>p.id===add.id).stock,24);const stranger=await client();assert.equal((await stranger.request('orders/'+first.data.number)).status,404);assert.equal((await stranger.request('track','POST',{number:first.data.number,email:'wrong@example.com'})).status,404);assert.equal((await stranger.request('track','POST',{number:first.data.number,email:customer.email})).status,200);assert.equal(JSON.parse(readFileSync(join(process.env.DATA_DIR,'store.json'))).orders.length,1);});
test('competing checkouts cannot oversell stock',async()=>{const a=await client(),b=await client();const item={id:'sg-player-ultimate',option:'Short handle',quantity:20};await a.request('cart','POST',item);await b.request('cart','POST',item);const results=await Promise.all([a.request('orders','POST',{...customer,requestId:'22345678-1234-4321-1234-123456789abc'}),b.request('orders','POST',{...customer,requestId:'32345678-1234-4321-1234-123456789abc'})]);assert.deepEqual(results.map(r=>r.status).sort(),[201,400]);});
test('newsletter validates and deduplicates addresses',async()=>{const c=await client();assert.equal((await c.request('newsletter','POST',{email:'bad'})).status,400);await c.request('newsletter','POST',{email:'player@example.com'});await c.request('newsletter','POST',{email:'PLAYER@example.com'});assert.equal(JSON.parse(readFileSync(join(process.env.DATA_DIR,'store.json'))).subscribers.length,1);});

test('admin updates persist and reach storefront; invalid and stale edits are rejected',async()=>{
 const c=await client();let r=await c.request('admin/session');assert.equal(r.data.authorized,false);await c.request('admin/login','POST',{username:'admin',password:'Cricket@2026'});
 const p=c.state.products.find(p=>p.id==='sidearm-thrower');const edit={id:p.id,stock:4,price:5999,previousStock:p.stock,previousPrice:p.price,note:'Inventory test'};
 assert.equal((await c.request('admin/inventory','PATCH',edit,'bad')).status,403);
 assert.equal((await c.request('admin/inventory','PATCH',{...edit,stock:-1})).status,400);
 assert.equal((await c.request('admin/inventory','PATCH',{...edit,price:0})).status,400);
 assert.equal((await c.request('admin/inventory','PATCH',{...edit,note:''})).status,400);
 assert.equal((await c.request('admin/inventory','PATCH',edit)).status,200);
 assert.equal((await c.request('admin/inventory','PATCH',edit)).status,409);
 const fresh=await c.request('store');const updated=fresh.data.products.find(x=>x.id===p.id);assert.equal(updated.stock,4);assert.equal(updated.price,5999);
 const persisted=JSON.parse(readFileSync(join(process.env.DATA_DIR,'store.json')));assert.equal(persisted.stock[p.id],4);assert.equal(persisted.inventory[p.id].price,5999);assert.equal(persisted.activity.at(-1).note,'Inventory test');
});
test('configured admin requires login and logout revokes access',async()=>{
 process.env.ADMIN_PASSWORD='test-only-password-123';
 try{const c=await client();assert.equal((await c.request('admin/session')).data.authorized,false);assert.equal((await c.request('admin/inventory')).status,401);assert.equal((await c.request('admin/inventory','PATCH',{})).status,401);assert.equal((await c.request('admin/login','POST',{password:'wrong'})).status,401);assert.equal((await c.request('admin/login','POST',{username:'admin',password:process.env.ADMIN_PASSWORD})).status,200);assert.equal((await c.request('admin/inventory')).status,200);await c.request('admin/logout','POST',{});assert.equal((await c.request('admin/inventory')).status,401);}finally{delete process.env.ADMIN_PASSWORD;}
});

test('admin pages redirect until username and password are verified',async()=>{
 const c=await client();
 for(const path of ['/admin','/admin/inventory','/admin/history']){const r=await fetch(base+path,{redirect:'manual'});assert.equal(r.status,302);assert.equal(r.headers.get('location'),'/admin/login');}
 assert.equal((await c.request('admin/login','POST',{username:'wrong',password:'admin'})).status,401);
 assert.equal((await c.request('admin/login','POST',{username:'admin',password:'Cricket@2026'})).status,200);
 const r=await fetch(base+'/admin',{headers:{cookie:c.cookie},redirect:'manual'});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
 await c.request('admin/logout','POST',{});
 assert.equal((await fetch(base+'/admin',{headers:{cookie:c.cookie},redirect:'manual'})).status,302);
});
