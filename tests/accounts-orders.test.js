import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
process.env.NODE_ENV='test';process.env.DATA_DIR=mkdtempSync(join(tmpdir(),'cc-account-test-'));
const {server}=await import('../server/index.js');
const {sendNotification}=await import('../server/commerce.js');
let base;
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(r=>server.close(r));rmSync(process.env.DATA_DIR,{recursive:true,force:true});});
async function client(){const r=await fetch(base+'/api/store'),state=await r.json(),cookie=r.headers.get('set-cookie').split(';')[0];return {async request(path,method='GET',body){const r=await fetch(base+'/api/'+path,{method,headers:{cookie,'Content-Type':'application/json','X-CSRF-Token':state.csrf},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}};}
const address={email:'guest@example.com',phone:'6145550123',firstName:'Sample',lastName:'Player',address:'1 Test St',city:'Columbus',state:'OH',zip:'43215'};
async function order(c,extra={}){assert.equal((await c.request('cart','POST',{id:'sg-test-ball',option:'Standard',quantity:1})).status,200);const input={...address,requestId:randomUUID(),...extra};return {result:await c.request('orders','POST',input),input};}
const read=()=>JSON.parse(readFileSync(join(process.env.DATA_DIR,'store.json'),'utf8'));
test('accounts use hashed passwords, isolate order lists, and survive a fresh session',async()=>{
 const a=await client();assert.equal((await a.request('account/orders')).status,401);
 assert.equal((await a.request('account/register','POST',{name:'Player A',email:'a@example.com',password:'tiny'})).status,400);
 const registered=await a.request('account/register','POST',{name:'Player A',email:'A@example.com',password:'long-test-password',phone:'+16142144115',address:'1 Main St',city:'Columbus',state:'OH',zip:'43215'});assert.equal(registered.status,200);assert.equal(registered.data.user.hash,undefined);assert.equal(registered.data.user.phone,'+16142144115');
 const updated=await a.request('account','PATCH',{name:'Player A Updated',phone:'+16145551212',address:'2 Main St',city:'Dublin',state:'OH',zip:'43017'});assert.equal(updated.status,200);assert.equal(updated.data.user.city,'Dublin');
 const {result,input}=await order(a,{email:'spoof@example.com'});assert.equal(result.status,201);
 let list=await a.request('account/orders');assert.equal(list.data.orders.length,1);assert.equal(list.data.orders[0].statusCode,'placed');
 assert.equal(read().orders[0].email,'a@example.com');assert.notEqual(read().users[0].hash,'long-test-password');assert.equal(read().users[0].password,undefined);
 const replay=await a.request('orders','POST',input);assert.equal(replay.data.number,result.data.number);assert.equal(read().notifications.length,2);
 const b=await client();await b.request('account/register','POST',{name:'Player B',email:'b@example.com',password:'long-test-password',phone:'+16142140000',address:'3 Main St',city:'Columbus',state:'OH',zip:'43215'});assert.equal((await b.request('account/orders')).data.orders.length,0);assert.equal((await b.request('orders/'+result.data.number)).status,404);
 await a.request('account/logout','POST',{});assert.equal((await a.request('account/orders')).status,401);assert.equal((await a.request('orders/'+result.data.number)).status,404);
 const fresh=await client();assert.equal((await fresh.request('account/login','POST',{email:'a@example.com',password:'wrong'})).status,401);assert.equal((await fresh.request('account/login','POST',{email:'a@example.com',password:'long-test-password'})).status,200);assert.equal((await fresh.request('account/orders')).data.orders.length,1);
});
test('guest checkout and tracking work; guest orders need their number to be attached',async()=>{
 const guest=await client(),{result}=await order(guest);assert.equal(result.status,201);const number=result.data.number;
 assert.equal((await guest.request('track','POST',{number,email:'wrong@example.com'})).status,404);
 assert.equal((await guest.request('track','POST',{number,email:address.email})).data.status,'Placed');
 await guest.request('account/register','POST',{name:'Guest',email:address.email,password:'guest-test-password',phone:'+16142141115',address:'1 Test St',city:'Columbus',state:'OH',zip:'43215'});
 assert.equal((await guest.request('account/orders')).data.orders.length,0);
 assert.equal((await guest.request('account/claim','POST',{number:'CC-INVALID'})).status,404);
 assert.equal((await guest.request('account/claim','POST',{number})).status,200);assert.equal((await guest.request('account/orders')).data.orders.length,1);
});
test('admin fulfillment state machine, order privacy, cancellation and history',async()=>{
 const guest=await client(),{result}=await order(guest),number=result.data.number;
 assert.equal((await guest.request('admin/orders')).status,401);assert.equal((await guest.request('admin/orders','PATCH',{number,statusCode:'cancelled',previousStatus:'placed'})).status,401);
 const admin=await client();await admin.request('admin/login','POST',{username:'admin',password:'Cricket@2026'});
 const update=(previousStatus,statusCode)=>admin.request('admin/orders','PATCH',{number,previousStatus,statusCode});
 assert.equal((await update('placed','delivered')).status,400);assert.equal((await update('placed','in_progress')).status,200);assert.equal((await update('placed','cancelled')).status,409);
 const stockBefore=read().stock['sg-test-ball'];assert.equal((await update('in_progress','cancelled')).status,200);assert.equal(read().stock['sg-test-ball'],stockBefore+1);assert.equal((await update('cancelled','placed')).status,400);assert.equal(read().stock['sg-test-ball'],stockBefore+1);
 const tracked=await guest.request('track','POST',{number,email:address.email});assert.equal(tracked.data.status,'Cancelled');assert.equal(tracked.data.history.length,3);assert.equal(tracked.data.customer,undefined);
 const second=await order(guest),n=second.result.data.number;
 for(const [from,to] of [['placed','in_progress'],['in_progress','shipped'],['shipped','delivered']])assert.equal((await admin.request('admin/orders','PATCH',{number:n,previousStatus:from,statusCode:to})).status,200);
 assert.equal((await guest.request('track','POST',{number:n,email:address.email})).data.status,'Delivered');
});
test('notification adapters target configured owner with safe failure reporting',async()=>{
 const job={id:'unique-notification',channel:'email'},o=read().orders[0];
 assert.equal((await sendNotification(job,o,()=>{throw Error('must not send');})).state,'blocked');
 const config={ORDER_NOTIFICATIONS_ENABLED:'true',RESEND_API_KEY:'fake-key',ORDER_EMAIL_FROM:'Store <orders@example.com>',TWILIO_ACCOUNT_SID:'ACtest',TWILIO_AUTH_TOKEN:'fake-token',TWILIO_WHATSAPP_FROM:'whatsapp:+15555550100',TWILIO_WHATSAPP_CONTENT_SID:'HXtest'};
 const previous=Object.fromEntries(Object.keys(config).map(k=>[k,process.env[k]]));Object.assign(process.env,config);
 try{
 let captured;const request=async(url,options)=>{captured={url,options};return {ok:true,json:async()=>({id:'provider-id'})};};
 assert.equal((await sendNotification(job,o,request)).state,'accepted');assert.equal(JSON.parse(captured.options.body).to[0],'orders@cricketcentral.us');assert.equal(captured.options.headers['Idempotency-Key'],'order-unique-notification');
 assert.equal((await sendNotification({...job,channel:'whatsapp'},o,request)).state,'accepted');const body=new URLSearchParams(captured.options.body);assert.equal(body.get('To'),'whatsapp:+16142144115');assert.equal(body.get('ContentSid'),'HXtest');
 assert.equal((await sendNotification(job,o,async()=>{throw Error('timeout');})).state,'unknown');assert.equal((await sendNotification(job,o,async()=>({ok:false,status:401}))).state,'failed');
 }finally{for(const k of Object.keys(config))if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}
});
