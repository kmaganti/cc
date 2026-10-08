import express from 'express';
import {createStorage} from './storage.js';
import {allocations,reserveLocations,restoreLocations} from './inventory.js';
import {operations} from './operations.js';
import {roles,staffPublic,permissionFor} from './permissions.js';
import {salePricing} from './pricing.js';
import {template,parseInventory} from './inventory-excel.js';
import {normalizeNotifications} from './store-migrations.js';
import http from 'node:http';
import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {products,categories} from './catalog.js';
import {saveProductImages} from './product-images.js';
import {normalizeSubcategories,normalizeCategories,categoryCode,categoryOrder as categoryDisplayOrder,findSubcategory,flattenSubcategories} from '../public/category-tree.js';
import {statuses,transitions,statusCode,publicOrder,publicUser,passwordHash,verifyPassword,queueNotifications,notificationConfig,sendNotification} from './commerce.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(process.env.NODE_ENV!=='test'&&existsSync(resolve(root,'.env.local')))process.loadEnvFile(resolve(root,'.env.local'));
const dataDir=process.env.DATA_DIR||resolve(root,'storage/node'); mkdirSync(dataDir,{recursive:true,mode:0o700});
const dataFile=resolve(dataDir,'store.json');
const uploadDir=resolve(root,'public/assets/uploads'); mkdirSync(uploadDir,{recursive:true});
let db=existsSync(dataFile)?JSON.parse(readFileSync(dataFile,'utf8')):{stock:{},orders:[],subscribers:[]};
db.users??=[]; db.notifications=normalizeNotifications(db.notifications); db.categories??=structuredClone(categories); db.locations??=['22Yards','Rangoli','Venu House','Babu House','589 Park']; db.locationStock??={};
const storage=await createStorage(db);let storageContext;
function save(next){if(storage.kind==='file'){writeFileSync(dataFile+'.tmp',JSON.stringify(next),{mode:0o600});renameSync(dataFile+'.tmp',dataFile);}db=next;if(storageContext)storageContext.state=next;}
let sessions=new Map(),limits=new Map();
async function transaction(fn){return storage.run(async context=>{if(context){db=context.state;sessions=context.sessions;limits=new Map(db.rateLimits||[]);}storageContext=context;try{return await fn();}finally{if(context){context.state.rateLimits=[...limits];}storageContext=null;}});}
if(storage.kind==='postgres')for(const name of readdirSync(uploadDir)){if(/\.(png|jpg|jpeg|webp)$/i.test(name))await storage.putUpload(name,name.endsWith('.webp')?'image/webp':name.endsWith('.png')?'image/png':'image/jpeg',readFileSync(resolve(uploadDir,name)));}
const token=()=>randomBytes(24).toString('hex');
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function slugify(value){return String(value||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function parseSubcategories(value,current=[],rootSlug=''){return normalizeSubcategories(value,Array.isArray(current)?current:[],rootSlug);}
const categoryImages={
 bats:{original:'bat-ss.jpg',image:'category-cricket-bats.png'},
 gloves:{original:'gloves-sg.jpg',image:'category-batting-gloves.png'},
 pads:{original:'pads-mrf.jpg',image:'category-batting-pads.png'},
 protection:{original:'helmet-shrey.jpg',image:'category-protection.png'},
 shoes:{original:'shoes-asics.jpg',image:'category-shoes.png'},
 bags:{original:'bag-dsc.jpg',image:'category-bags.png'},
 balls:{original:'ball.jpg',image:'category-balls.png'},
 apparel:{original:'apparel.jpg',image:'category-apparel.png'},
 training:{original:'training.jpg',image:'category-training.png'},
 juniors:{original:'junior.jpg',image:'category-juniors.png'},
 'cricket-kits':{original:'uploads/category-55a47e795dac8c9b9dfbd599d8d2bb27172d5b4fd53b90fe.webp',image:'category-cricket-kits.png'}
};
function categoryList(){return normalizeCategories(db.categories??categories).map(c=>({...c,image:categoryImages[c.slug]?.original===c.image?categoryImages[c.slug].image:c.image}));}

function productSubcategory(category,subcategory,current=''){const value=subcategory===undefined?current:String(subcategory||'').trim();if(!value)return '';const cat=categoryList().find(c=>c.slug===category);if(!findSubcategory(cat?.subcategories,value))fail('Choose an existing subcategory for this category.');return value;}
function inventoryFingerprint(){return JSON.stringify({inventory:db.inventory,stock:db.stock,deleted:db.deletedProducts,categories:db.categories,locations:db.locations,locationStock:db.locationStock});}
function catalog(){const custom=Object.entries(db.inventory||{}).filter(([id])=>!products.some(p=>p.id===id)).map(([id,p])=>({id,slug:id,options:['Standard'],featured:false,...p,stock:db.stock[id]??0}));return [...products,...custom].filter(p=>!db.deletedProducts?.includes(p.id)).map(p=>({...p,...db.inventory?.[p.id],stock:db.stock[p.id]??p.stock,locations:db.locationStock[p.id]??{}}));}
function productDetails(b,current={}){
 const result={};
 for(const key of ['purchaseCost','purchaseShipping','importDuty']){const value=b[key]===undefined?(current[key]??null):b[key];if(value!==null&&(!Number.isSafeInteger(value)||value<0||value>100000000))fail('Purchase costs must be non-negative USD amounts up to $1,000,000.');result[key]=value;}
 const date=b.purchaseDate===undefined?(current.purchaseDate||''):b.purchaseDate;
 if(typeof date!=='string'||(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)))fail('Enter a valid purchase date.');result.purchaseDate=date;
 const supplier=b.supplier===undefined?(current.supplier||''):b.supplier;if(typeof supplier!=='string'||supplier.length>200)fail('Supplier must be at most 200 characters.');result.supplier=supplier.trim();
 for(const key of ['overview','keyFeatures','additionalInformation']){
  const value=b[key]??current[key]??(key==='overview'?current.description||b.description||'':'');
  if(typeof value!=='string'||value.length>6000)fail('Product sections must be text of at most 6,000 characters.');
  result[key]=value.trim();
 }
 let sku=b.sku??current.sku;
 if(sku!==undefined&&typeof sku!=='string')fail('Enter a valid SKU.');
 sku=sku?.trim().toUpperCase();
 if(!sku){const used=new Set(catalog().map(p=>p.sku?.toUpperCase()));let n=1;do{sku='CC-'+String(n++).padStart(4,'0');}while(used.has(sku));}
 if(!/^[A-Z0-9_-]{1,64}$/.test(sku))fail('SKU must use letters, numbers, hyphens or underscores (maximum 64 characters).');
 if(catalog().some(p=>p.id!==current.id&&p.sku?.toUpperCase()===sku))fail('This SKU is already assigned to another product.',409);
 const isNew=b.isNew??current.isNew??false;
 if(typeof isNew!=='boolean')fail('New product flag must be true or false.');
 if(b.discountType!==undefined||current.discountType){
  const pricing=salePricing({regularPrice:b.regularPrice??current.regularPrice??b.price,onSale:b.onSale??current.onSale??false,discountType:b.discountType??current.discountType,discountValue:b.discountValue??current.discountValue??0});
  return {...result,sku,isNew,...pricing};
 }
 const compareAtPrice=b.compareAtPrice??current.compareAtPrice??0;
 if(!Number.isInteger(compareAtPrice)||compareAtPrice<0||compareAtPrice>10000000)fail('Enter a valid original price.');
 if(compareAtPrice>0&&compareAtPrice<=(b.price??current.price))fail('Original price must be higher than selling price, or blank.');
 const onSale=b.onSale??current.onSale??(compareAtPrice>(b.price??current.price));
 if(typeof onSale!=='boolean')fail('Sale flag must be true or false.');
 return {...result,sku,isNew,onSale,compareAtPrice};
}
function storefrontProduct(p){const {purchaseDate,purchaseCost,purchaseShipping,importDuty,supplier,...publicFields}=p;return publicFields;}
function cartView(s){
 s.cart=s.cart.filter(i=>catalog().some(p=>p.id===i.id));
 const items=s.cart.map(i=>({...storefrontProduct(catalog().find(p=>p.id===i.id)),option:i.option,quantity:i.quantity,key:i.id+'|'+i.option}));
 const subtotal=items.reduce((n,i)=>n+i.price*i.quantity,0);
 const promo=db.promotions?.find(p=>p.code===s.promotion&&p.active&&p.uses<p.maxUses&&Date.parse(p.endsAt)>Date.now());
 const discount=promo?Math.min(subtotal, promo.type==='percent'?Math.round(subtotal*promo.value/100):promo.value):0;
 const shipping=items.length&&subtotal-discount<9900?999:0;
 return {items,subtotal,discount,promotion:promo?.code||null,shipping,total:subtotal-discount+shipping,count:items.reduce((n,i)=>n+i.quantity,0)};
}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>9000000)fail('Request is too large.',413);}try{return JSON.parse(text||'{}');}catch{fail('Invalid JSON.');}}
async function saveImage(data,prefix){if(typeof data!=='string'||!data.startsWith('data:image/'))return null;const m=data.match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/i);if(!m)fail('Upload a PNG, JPG, or WebP image.',415);const bytes=Buffer.from(m[2],'base64');if(bytes.length>5*1024*1024)fail('Images must be 5MB or smaller.',413);const name=`${prefix}-${token()}.${m[1].toLowerCase().replace('jpeg','jpg')}`;if(storage.kind==='postgres')await storage.putUpload(name,m[1].toLowerCase()==='png'?'image/png':m[1].toLowerCase()==='webp'?'image/webp':'image/jpeg',bytes,storageContext.client);else writeFileSync(resolve(uploadDir,name),bytes,{mode:0o644});return `uploads/${name}`;}
function safeEqual(a,b){return typeof a==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
const app=express();
app.disable('x-powered-by');
app.set('trust proxy',Number(process.env.TRUST_PROXY_HOPS||0));
export const server=http.createServer(app);
async function handleRequest(req,res){
 const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
 try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/health'){try{await storage.health();return send(200,{status:'ok'});}catch{return send(503,{status:'unavailable'});}}
 if(url.pathname.startsWith('/assets/uploads/')&&storage.kind==='postgres'){const asset=await storage.getUpload(decodeURIComponent(url.pathname.slice('/assets/uploads/'.length)));if(!asset)return send(404,{error:'Not found.'});res.writeHead(200,{'Content-Type':asset.mime,'Cache-Control':'public, max-age=3600'});return res.end(asset.content);}
 if(url.pathname.startsWith('/api/')){
 let sid=(req.headers.cookie||'').split('; ').find(c=>c.startsWith('cc_session='))?.slice(11),s=sessions.get(sid);
 if(!s){sid=token();s={csrf:token(),cart:[],orders:[],expires:Date.now()+86400000};sessions.set(sid,s);res.setHeader('Set-Cookie',`cc_session=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${process.env.NODE_ENV==='production'?'; Secure':''}`);}
 if(s.expires<Date.now()){sessions.delete(sid);fail('Your session expired. Please refresh.',401);}
 const mutating=!['GET','HEAD'].includes(req.method);
 if(mutating&&!safeEqual(req.headers['x-csrf-token'],s.csrf))fail('Session verification failed. Refresh and try again.',403);
 if(mutating){const key=req.ip;let l=limits.get(key);if(!l||l.until<Date.now()){l={count:0,until:Date.now()+60000};limits.set(key,l);}if(++l.count>80)fail('Too many requests. Please wait a minute.',429);}
 const b=mutating?await body(req):{};
 const user=()=>db.users.find(u=>u.id===s.userId);
 if(['/api/account/forgot-password','/api/account/reset-password'].includes(url.pathname)){const operation=await operations({path:url.pathname,method:req.method,b,db,save,sessions,session:s,storage});if(operation)return send(operation.status,operation.data);}
 if(url.pathname.startsWith('/api/account')){
 if(url.pathname==='/api/account/saved-items'){
  if(!user())fail('Please sign in to save your favorite items.',401);
  if(req.method==='GET')return send(200,{savedItems:publicUser(user()).savedItems});
  if(req.method==='PUT'||req.method==='DELETE'){
   if(typeof b.productId!=='string'||!b.productId)fail('Choose a valid product.');
   if(req.method==='PUT'&&!catalog().some(p=>p.id===b.productId))fail('Product not found.',404);
   const next=structuredClone(db),account=next.users.find(u=>u.id===s.userId);
   const ids=new Set(publicUser(account).savedItems);
   if(req.method==='PUT')ids.add(b.productId);else ids.delete(b.productId);
   account.savedItems=[...ids];save(next);
   return send(200,{savedItems:account.savedItems});
  }
  return send(405,{error:'Method not allowed.'});
 }
 if(req.method==='GET'&&url.pathname==='/api/account')return send(200,{user:publicUser(user())});
 if(req.method==='PATCH'&&url.pathname==='/api/account'){
  if(!user())fail('Please sign in to edit your profile.',401);
  for(const key of ['name','phone','address','city','state','zip'])if(typeof b[key]!=='string'||!b[key].trim()||b[key].length>190)fail('Complete every profile field.');
  if(!/^\+?[0-9 ()-]{7,25}$/.test(b.phone.trim()))fail('Enter a valid phone number.');
  if(!/^\d{5}(-\d{4})?$/.test(b.zip.trim()))fail('Enter a valid US ZIP code.');
  const next=structuredClone(db),account=next.users.find(u=>u.id===s.userId);Object.assign(account,{name:b.name.trim(),phone:b.phone.trim(),address:b.address.trim(),city:b.city.trim(),state:b.state.trim(),zip:b.zip.trim()});save(next);return send(200,{user:publicUser(account)});
 }
 if(req.method==='POST'&&['/api/account/register','/api/account/login'].includes(url.pathname)){
 const key='customer-auth:'+req.ip;let attempts=limits.get(key);if(!attempts||attempts.until<Date.now()){attempts={count:0,until:Date.now()+900000};limits.set(key,attempts);}if(++attempts.count>15)fail('Too many attempts. Try again in 15 minutes.',429);
 const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
 if(email.length>190||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof b.password!=='string'||b.password.length>128)fail('Enter a valid email and password.');
 if(url.pathname.endsWith('/register')){
 if(typeof b.name!=='string'||!b.name.trim()||b.name.length>100||b.password.length<8)fail('Enter your name and a password with at least 8 characters.');
  for(const key of ['phone','address','city','state','zip'])if(typeof b[key]!=='string'||!b[key].trim()||b[key].length>190)fail('Complete every profile field.');
  if(!/^\+?[0-9 ()-]{7,25}$/.test(b.phone.trim())||!/^\d{5}(-\d{4})?$/.test(b.zip.trim()))fail('Enter a valid phone number and US ZIP code.');
  const credentials=await passwordHash(b.password);
 if(db.users.some(u=>u.email===email))fail('Unable to register this email. Try signing in.',409);
 const next=structuredClone(db),account={id:token(),name:b.name.trim(),email,phone:b.phone.trim(),address:b.address.trim(),city:b.city.trim(),state:b.state.trim(),zip:b.zip.trim(),...credentials,created:new Date().toISOString()};next.users.push(account);save(next);s.userId=account.id;
 }else{const account=db.users.find(u=>u.email===email);if(!await verifyPassword(b.password,account))fail('Incorrect email or password.',401);s.userId=account.id;}
 return send(200,{user:publicUser(user())});
 }
 if(req.method==='POST'&&url.pathname==='/api/account/logout'){delete s.userId;return send(200,{ok:true});}
 if(!user())fail('Please sign in to view your orders.',401);
 if(req.method==='GET'&&url.pathname==='/api/account/orders')return send(200,{orders:db.orders.filter(o=>o.userId===s.userId).map(publicOrder).reverse()});
 if(req.method==='POST'&&url.pathname==='/api/account/claim'){
 const order=db.orders.find(o=>o.number===String(b.number).trim().toUpperCase()&&o.email===user().email);
 if(!order||(order.userId&&order.userId!==s.userId))fail('No matching guest order for your account email and order number.',404);
 const next=structuredClone(db);next.orders.find(o=>o.number===order.number).userId=s.userId;save(next);return send(200,{ok:true});
 }
 return send(404,{error:'Not found.'});
 }
 if(url.pathname.startsWith('/api/admin/')){
 const staff=db.staff?.find(u=>u.id===s.staffId&&u.active),authorized=Boolean(staff&&s.adminUntil>Date.now());
 if(url.pathname==='/api/admin/session'&&req.method==='GET')return send(200,{csrf:s.csrf,authorized,local:false,configured:!!(process.env.ADMIN_PASSWORD||db.staff?.length||process.env.NODE_ENV!=='production'),staff:staff?staffPublic(staff):null});
 if(url.pathname==='/api/admin/login'&&req.method==='POST'){
 const key='admin:'+req.ip;let attempts=limits.get(key);if(!attempts||attempts.until<Date.now()){attempts={count:0,until:Date.now()+900000};limits.set(key,attempts);}if(++attempts.count>5)fail('Too many sign-in attempts. Try again in 15 minutes.',429);
 if(typeof b.username!=='string'||typeof b.password!=='string'||b.password.length>128)fail('Incorrect username or password.',401);
 if(!db.staff?.length){const password=process.env.ADMIN_PASSWORD||(process.env.NODE_ENV!=='production'?'Cricket@2026':null);if(!password)fail('Configure the initial admin credentials.',503);const next=structuredClone(db);next.staff=[{id:token(),username:process.env.ADMIN_USERNAME||'admin',name:'Store owner',role:'owner',active:true,...await passwordHash(password)}];save(next);}
 const account=db.staff.find(u=>u.username===b.username.trim().toLowerCase()&&u.active);
 if(!await verifyPassword(b.password,account))fail('Incorrect username or password.',401);
 s.staffId=account.id;s.adminUntil=Date.now()+3600000;return send(200,{authorized:true,staff:staffPublic(account)});
 }
 if(!authorized)fail('Admin sign-in required.',401);
 if(!url.pathname.endsWith('/logout')&&!roles[staff.role]?.includes(permissionFor(url.pathname)))fail('Your staff role does not have permission for this action.',403);
 const operation=await operations({path:url.pathname,method:req.method,b,db,save,sessions,session:s,staff,storage});if(operation)return send(operation.status,operation.data);
 if(url.pathname==='/api/admin/inventory/template'&&req.method==='GET'){
  const content=await template(categoryList(),db.locations);res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="cricket-central-inventory-template.xlsx"'});return res.end(Buffer.from(content));
 }
 if(url.pathname==='/api/admin/inventory/import-preview'&&req.method==='POST'){
  const baseline=inventoryFingerprint();let parsed;try{parsed=await parseInventory(b.file,catalog(),categoryList(),db.locations);}catch(e){fail(e.message);}
  if(parsed.errors.length){delete s.inventoryImport;return send(200,{errors:parsed.errors,rows:[]});}
  const importToken=token();s.inventoryImport={token:importToken,rows:parsed.rows,baseline,expires:Date.now()+600000};
  return send(200,{token:importToken,errors:[],rows:parsed.rows.map(r=>({row:r.row,action:r.action,sku:r.fields.sku,name:r.fields.name,stock:r.stock,price:r.fields.price,oldStock:r.oldStock,oldPrice:r.oldPrice}))});
 }
 if(url.pathname==='/api/admin/inventory/import-confirm'&&req.method==='POST'){
  const pending=s.inventoryImport;if(!pending||!safeEqual(b.token,pending.token)||pending.expires<Date.now())fail('Preview expired. Upload the workbook again.',409);
  if(pending.baseline!==inventoryFingerprint())fail('Inventory changed after preview. Upload again to review current values.',409);
  const next=structuredClone(db);next.inventory??={};next.locationStock??={};next.activity??=[];
  for(const row of pending.rows){const old=catalog().find(p=>p.id===row.id);next.inventory[row.id]={...(next.inventory[row.id]||{}),...(old?{}:{slug:row.id,image:categoryList().find(c=>c.slug===row.fields.category).image,options:['Standard']}),...row.fields};next.stock[row.id]=row.stock;if(row.locationStock)next.locationStock[row.id]=row.locationStock;next.activity.push({id:token(),product:row.fields.name,sku:row.fields.sku,oldStock:row.oldStock,stock:row.stock,oldPrice:row.oldPrice,price:row.fields.price,note:'Excel inventory import',at:new Date().toISOString()});}
  next.activity=next.activity.slice(-500);save(next);delete s.inventoryImport;return send(200,{count:pending.rows.length});
 }
 if(url.pathname==='/api/admin/orders'&&req.method==='GET')return send(200,{orders:db.orders.map(o=>({...publicOrder(o),email:o.email,customer:o.customer,registered:Boolean(o.userId),allowedTransitions:transitions[statusCode(o)],payments:o.payments||[],internalNotes:o.internalNotes||[],assignedTo:o.assignedTo||null,notifications:db.notifications.filter(j=>j.orderNumber===o.number)})).reverse(),staff:(db.staff||[]).filter(u=>u.active).map(staffPublic),statuses,notifications:notificationConfig()});
 if(url.pathname==='/api/admin/orders'&&req.method==='PATCH'){
 const o=db.orders.find(o=>o.number===b.number);if(!o)fail('Order not found.',404);
 if(b.previousStatus!==statusCode(o))fail('Order changed. Refresh and try again.',409);
 if(!transitions[statusCode(o)].includes(b.statusCode))fail('This status transition is not allowed.');
 const next=structuredClone(db),order=next.orders.find(x=>x.number===o.number);
 order.history??=[{statusCode:statusCode(o),at:o.created}];order.statusCode=b.statusCode;order.status=statuses[b.statusCode];order.history.push({statusCode:b.statusCode,at:new Date().toISOString()});
 if(b.statusCode==='cancelled'){for(const item of order.items){next.stock[item.id]=(next.stock[item.id]??products.find(p=>p.id===item.id)?.stock??0)+item.quantity;restoreLocations(next,item);}}
 next.notifications.push({id:token(),orderNumber:order.number,channel:'email',audience:'customer',event:'status',state:'pending',attempts:0,created:new Date().toISOString()});save(next);return send(200,{order:publicOrder(order)});
 }
 if(url.pathname==='/api/admin/notifications/retry'&&req.method==='POST'){
 const next=structuredClone(db),job=next.notifications.find(j=>j.id===b.id);if(!job)fail('Notification not found.',404);
 if(!['blocked','failed','unknown'].includes(job.state))fail('This notification cannot be retried.');
 if(job.state==='unknown'&&b.confirmed!==true)fail('Confirm you checked the provider for duplicates before retrying.');
 job.state='pending';delete job.error;save(next);void processNotifications();return send(200,{ok:true});
 }
 if(url.pathname==='/api/admin/logout'&&req.method==='POST'){s.adminUntil=0;delete s.staffId;return send(200,{ok:true});}
 if(url.pathname==='/api/admin/inventory'&&req.method==='GET')return send(200,{products:catalog(),categories:categoryList(),locations:db.locations,activity:(db.activity||[]).slice(-30).reverse()});
 if(url.pathname==='/api/admin/reports'&&req.method==='GET'){
  const from=url.searchParams.get('from'),to=url.searchParams.get('to');
  if((from&&!/^\d{4}-\d{2}-\d{2}$/.test(from))||(to&&!/^\d{4}-\d{2}-\d{2}$/.test(to)))fail('Use YYYY-MM-DD report dates.');
  const orders=(db.orders||[]).filter(o=>(!from||o.created.slice(0,10)>=from)&&(!to||o.created.slice(0,10)<=to)), revenue=orders.filter(o=>o.statusCode!=='cancelled').reduce((n,o)=>n+(o.total||0),0), sold=orders.filter(o=>o.statusCode!=='cancelled').reduce((n,o)=>n+(o.items||[]).reduce((q,i)=>q+i.quantity,0),0);
  const productSales={}; for(const o of orders.filter(o=>o.statusCode!=='cancelled'))for(const i of (o.items||[]))productSales[i.id]=(productSales[i.id]||0)+i.quantity;
  const byLocation=db.locations.map(location=>({location,units:catalog().reduce((n,p)=>n+(p.locations?.[location]||0),0),value:catalog().reduce((n,p)=>n+(p.locations?.[location]||0)*p.price,0)}));
  return send(200,{revenue,orders:orders.length,sold,collected:orders.reduce((n,o)=>n+(o.payments||[]).reduce((s,p)=>s+(p.type==='received'?p.amount:-p.amount),0),0),refunded:orders.reduce((n,o)=>n+(o.payments||[]).filter(p=>p.type==='refunded').reduce((s,p)=>s+p.amount,0),0),averageOrder:orders.filter(o=>o.statusCode!=='cancelled').length?Math.round(revenue/orders.filter(o=>o.statusCode!=='cancelled').length):0,byLocation,topProducts:catalog().map(p=>({...p,sold:productSales[p.id]||0})).sort((a,b)=>b.sold-a.sold).slice(0,8)});
 }
 if(url.pathname==='/api/admin/categories'&&req.method==='POST'){
  if(typeof b.name!=='string'||!b.name.trim()||b.name.length>80)fail('Enter a category name.');
  const slug=slugify(b.slug||b.name); if(!slug||['all','sale'].includes(slug))fail('Choose a category slug other than all or sale.');
  if(categoryList().some(c=>c.slug===slug))fail('That category already exists.',409);
  const next=structuredClone(db);next.categories.push({slug,code:categoryCode(b.code,slug.toUpperCase()),displayOrder:categoryDisplayOrder(b.displayOrder,Math.max(0,...categoryList().map(c=>c.displayOrder))+1),name:b.name.trim(),subcategories:parseSubcategories(b.subcategories,[],slug),image:await saveImage(b.imageData,'category')||(typeof b.image==='string'&&b.image.trim()?b.image.trim():'training.jpg')});next.categories=normalizeCategories(next.categories);save(next);return send(201,{categories:categoryList()});
 }
 if(url.pathname.startsWith('/api/admin/categories/')&&req.method==='PATCH'){
  const slug=url.pathname.split('/').pop(), old=categoryList().find(c=>c.slug===slug);if(!old)fail('Category not found.',404);
  if(typeof b.name!=='string'||!b.name.trim()||b.name.length>80)fail('Enter a category name.'); const next=structuredClone(db),item=next.categories.find(c=>c.slug===slug);const subcategories=parseSubcategories(b.subcategories,old.subcategories||[],slug),valid=new Set(flattenSubcategories(subcategories).map(s=>s.slug));if(catalog().some(p=>p.category===slug&&p.subcategory&&!valid.has(p.subcategory)))fail('Move products out of removed subcategories before saving.');Object.assign(item,{code:categoryCode(b.code,old.code),displayOrder:categoryDisplayOrder(b.displayOrder,old.displayOrder),name:b.name.trim(),subcategories,image:await saveImage(b.imageData,'category')||(typeof b.image==='string'&&b.image.trim()?b.image.trim():item.image)});next.categories=normalizeCategories(next.categories);save(next);return send(200,{category:categoryList().find(c=>c.slug===slug)});
 }
 if(url.pathname.startsWith('/api/admin/categories/')&&req.method==='DELETE'){
  const slug=url.pathname.split('/').pop();if(catalog().some(p=>p.category===slug))fail('Move products out of this category before deleting it.'); const next=structuredClone(db);next.categories=next.categories.filter(c=>c.slug!==slug);if(next.categories.length===categoryList().length)fail('Category not found.',404);save(next);return send(200,{categories:categoryList()});
 }
 if(url.pathname==='/api/admin/locations'&&req.method==='POST'){
  if(typeof b.name!=='string'||!b.name.trim()||b.name.length>80)fail('Enter a location name.'); const name=b.name.trim();if(db.locations.includes(name))fail('That location already exists.',409);const next=structuredClone(db);next.locations.push(name);save(next);return send(201,{locations:next.locations});
 }
 if(url.pathname.startsWith('/api/admin/locations/')&&req.method==='DELETE'){
  const name=decodeURIComponent(url.pathname.split('/').pop());if(!db.locations.includes(name))fail('Location not found.',404);if(Object.values(db.locationStock).some(m=>(m[name]||0)>0)||db.orders.some(o=>!['cancelled','delivered'].includes(statusCode(o))&&o.items.some(i=>i.fulfillmentLocations?.[name]>0)))fail('Transfer stock and finish allocated orders before deleting this location.');const next=structuredClone(db);next.locations=next.locations.filter(x=>x!==name);for(const map of Object.values(next.locationStock||{}))delete map[name];save(next);return send(200,{locations:next.locations});
 }
 if(url.pathname==='/api/admin/inventory'&&req.method==='POST'){
  for(const key of ['name','brand','category','description'])if(typeof b[key]!=='string'||!b[key].trim())fail('Complete every product field.');
  if(categoryList().every(c=>c.slug!==b.category))fail('Choose an existing category.'); if(!Number.isInteger(b.price)||b.price<1)fail('Price must be valid.');
  const id=slugify(b.id||b.name);if(catalog().some(p=>p.id===id))fail('A product with that name already exists.',409);
  const gallery=await saveProductImages(b,null,saveImage,fail);
  const category=b.category.trim();const next=structuredClone(db);next.inventory??={};next.inventory[id]={slug:id,name:b.name.trim(),brand:b.brand.trim(),category,subcategory:productSubcategory(category,b.subcategory),description:b.description.trim(),price:b.price,image:gallery?.image||await saveImage(b.imageData,'product')||b.image||categoryList().find(c=>c.slug===b.category)?.image||'training.jpg',images:gallery?.images||[],...productDetails(b),options:Array.isArray(b.options)&&b.options.length?b.options:['Standard']};next.stock[id]=Number.isInteger(b.stock)&&b.stock>=0?b.stock:0;next.locationStock[id]=allocations(b.locations||{},next.locations,next.stock[id]);save(next);return send(201,{product:catalog().find(p=>p.id===id)});
 }
 if(url.pathname==='/api/admin/inventory'&&req.method==='DELETE'){
  const ids=Array.isArray(b.ids)?b.ids:(b.id?[b.id]:[]);
  if(!ids.length)fail('Choose at least one item to delete.');
  if(ids.length>500)fail('Delete 500 items at a time or fewer.');
  if(ids.some(id=>typeof id!=='string'||!id.trim()))fail('Choose valid items.');
  const available=new Set(catalog().map(p=>p.id)),missing=ids.filter(id=>!available.has(id));
  if(missing.length)fail(`${missing.length} item${missing.length===1?'':'s'} not found.`,404);
  const next=structuredClone(db);next.deletedProducts=[...new Set([...(next.deletedProducts||[]),...ids])];save(next);return send(200,{ok:true,count:ids.length});
 }
 if(url.pathname==='/api/admin/inventory'&&req.method==='PATCH'){
 const p=catalog().find(p=>p.id===b.id);if(!p)fail('Product not found.',404);
 if(!Number.isInteger(b.stock)||b.stock<0||b.stock>100000)fail('Stock must be a whole number between 0 and 100,000.');
 if(!Number.isInteger(b.price)||b.price<1||b.price>10000000)fail('Price must be between $0.01 and $100,000.');
 if(typeof b.note!=='string'||!b.note.trim()||b.note.length>200)fail('Add a reason for this adjustment (up to 200 characters).');
 if(b.previousStock!==p.stock||b.previousPrice!==p.price)fail('This product changed since you opened it. Refresh inventory and try again.',409);
 const gallery=await saveProductImages(b,p,saveImage,fail);
 const next=structuredClone(db);next.stock[p.id]=b.stock;next.inventory??={};next.inventory[p.id]={...(next.inventory[p.id]||{}),price:b.price,subcategory:productSubcategory(p.category,b.subcategory,p.subcategory||''),...productDetails(b,p)};if(gallery)Object.assign(next.inventory[p.id],gallery);else if(b.imageData)next.inventory[p.id].image=await saveImage(b.imageData,'product');next.locationStock??={};next.locationStock[p.id]=allocations(b.locations??next.locationStock[p.id]??{},next.locations,b.stock);next.activity??=[];next.activity.push({id:token(),product:p.name,sku:p.sku,oldStock:p.stock,stock:b.stock,oldPrice:p.price,price:next.inventory[p.id].price,note:b.note.trim(),at:new Date().toISOString()});next.activity=next.activity.slice(-500);save(next);
 return send(200,{product:catalog().find(x=>x.id===p.id)});
 }
 return send(404,{error:'Not found.'});
 }

 if(req.method==='GET'&&url.pathname==='/api/store')return send(200,{products:catalog().map(storefrontProduct),categories:categoryList(),cart:cartView(s),csrf:s.csrf,mode:'manual',user:publicUser(user())});
 if(url.pathname==='/api/cart/promotion'&&req.method==='POST'){const code=String(b.code||'').trim().toUpperCase();const promo=db.promotions?.find(p=>p.code===code&&p.active&&p.uses<p.maxUses&&Date.parse(p.endsAt)>Date.now());if(code&&!promo)fail('This offer is invalid or expired.');s.promotion=code;return send(200,cartView(s));}
 if(url.pathname==='/api/cart'&&req.method==='POST'){
 const p=catalog().find(p=>p.id===b.id);if(!p)fail('Product not found.',404);
 if(!p.options.includes(b.option))fail('Choose an available size or option.');
 if(!Number.isInteger(b.quantity)||b.quantity<1||b.quantity>25)fail('Choose a quantity between 1 and 25.');
 const used=s.cart.filter(i=>i.id===p.id).reduce((n,i)=>n+i.quantity,0);if(used+b.quantity>p.stock)fail('There is not enough stock for that quantity.');
 const row=s.cart.find(i=>i.id===p.id&&i.option===b.option);if(row)row.quantity+=b.quantity;else s.cart.push({id:p.id,option:b.option,quantity:b.quantity});return send(200,cartView(s));
 }
 if(url.pathname==='/api/cart'&&req.method==='PATCH'){
 const row=s.cart.find(i=>i.id+'|'+i.option===b.key);if(!row)fail('Cart item not found.',404);
 if(!Number.isInteger(b.quantity)||b.quantity<0||b.quantity>25)fail('Invalid quantity.');
 const p=catalog().find(p=>p.id===row.id),others=s.cart.filter(i=>i.id===row.id&&i!==row).reduce((n,i)=>n+i.quantity,0);
 if(b.quantity+others>p.stock)fail('There is not enough stock for that quantity.');
 row.quantity=b.quantity;s.cart=s.cart.filter(i=>i.quantity);return send(200,cartView(s));
 }
 if(url.pathname==='/api/orders'&&req.method==='POST'){
 if(typeof b.requestId!=='string'||! /^[a-f0-9-]{20,50}$/.test(b.requestId))fail('Invalid checkout request.');
 const prior=db.orders.find(o=>o.requestId===b.requestId&&o.session===sid);if(prior)return send(200,{number:prior.number});
 for(const key of ['email','phone','firstName','lastName','address','city','state','zip'])if(typeof b[key]!=='string'||!b[key].trim()||b[key].length>190)fail('Please complete every required address field.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email))fail('Enter a valid email address.');
 if(!/^\d{5}(-\d{4})?$/.test(b.zip))fail('Enter a valid US ZIP code.');
 if(!/^\+?[0-9 ()-]{7,25}$/.test(b.phone))fail('Enter a valid phone number.');
 if(user())b.email=user().email;
 const cart=cartView(s);if(!cart.items.length)fail('Your bag is empty.');
 const next=structuredClone(db);
 for(const item of cart.items){const available=next.stock[item.id]??item.stock;if(available<item.quantity)fail(`${item.name} has insufficient stock. Update your bag.`);next.stock[item.id]=available-item.quantity;reserveLocations(next,item);}
 const order={number:'CC-'+randomBytes(6).toString('hex').toUpperCase(),created:new Date().toISOString(),session:sid,requestId:b.requestId,email:b.email.trim().toLowerCase(),customer:{phone:b.phone.trim(),firstName:b.firstName.trim(),lastName:b.lastName.trim(),address:b.address.trim(),city:b.city.trim(),state:b.state.trim(),zip:b.zip},...cart,userId:s.userId||null,statusCode:'placed',history:[{statusCode:'placed',at:new Date().toISOString()}],status:'Placed',paymentStatus:'unpaid',payments:[],internalNotes:[],fulfillment:{}};
 if(cart.promotion){const promo=next.promotions.find(p=>p.code===cart.promotion);promo.uses++;}next.orders.push(order);queueNotifications(next,order);save(next);void processNotifications();s.cart=[];delete s.promotion;s.orders.push(order.number);return send(201,{number:order.number});
 }
 if(url.pathname.startsWith('/api/orders/')&&req.method==='GET'){
 const order=db.orders.find(o=>o.number===url.pathname.split('/').pop()&&((!o.userId&&o.session===sid)||(s.userId&&o.userId===s.userId)));if(!order)fail('Order not found for this session.',404);return send(200,publicOrder(order));
 }
 if(url.pathname==='/api/track'&&req.method==='POST'){
 const order=db.orders.find(o=>o.number===String(b.number).trim().toUpperCase()&&o.email===String(b.email).trim().toLowerCase());if(!order)fail('No matching order. Check your order number and email.',404);return send(200,publicOrder(order));
 }
 if(url.pathname==='/api/newsletter'&&req.method==='POST'){
 if(typeof b.email!=='string'||b.email.length>190||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email))fail('Enter a valid email address.');
 const email=b.email.trim().toLowerCase();if(!db.subscribers.includes(email)){const next=structuredClone(db);next.subscribers.push(email);save(next);}return send(200,{message:'You’re on the list. Thanks for joining the club!'});
 }
 return send(404,{error:'Not found.'});
 }
 if(!['GET','HEAD'].includes(req.method))return send(405,{error:'Method not allowed.'});
 const pathname=decodeURIComponent(url.pathname);
 const adminPath=pathname==='/admin'||pathname.startsWith('/admin/');
 if(adminPath){
 const sid=(req.headers.cookie||'').split('; ').find(c=>c.startsWith('cc_session='))?.slice(11);
 const current=sessions.get(sid),authorized=current?.expires>Date.now()&&current?.adminUntil>Date.now()&&db.staff?.some(u=>u.id===current.staffId&&u.active);
 res.setHeader('Cache-Control','no-store');
 if(pathname!=='/admin/login'&&!authorized){res.writeHead(302,{Location:'/admin/login'});return res.end();}
 if(pathname==='/admin/login'&&authorized){res.writeHead(302,{Location:'/admin'});return res.end();}
 }

 const allowed=pathname.startsWith('/assets/')||['/styles.css','/app.js','/product-gallery.js','/category-tree.js','/category-navigation.js','/admin-category-tree.js','/favicon.svg','/admin.css','/admin.js','/admin-product-images.js','/admin-operations.js','/inventory-import.js'].includes(pathname);
 const file=allowed?resolve(root,'public','.'+pathname):resolve(root,adminPath?'public/admin.html':'public/index.html');
 if(!file.startsWith(resolve(root,'public')+'/'))return send(404,{error:'Not found.'});
 const content=readFileSync(file),mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream';
 res.writeHead(200,{'Content-Type':mime,'Cache-Control':adminPath?'no-store':pathname.startsWith('/assets/')?'public, max-age=3600':'no-cache'});res.end(req.method==='HEAD'?undefined:content);
 }catch(e){send(e.status||(e.code==='ENOENT'?404:500),{error:e.status?e.message:e.code==='ENOENT'?'Not found.':'Something went wrong. Please try again.'});if(!e.status&&e.code!=='ENOENT')console.error(e);}
}
app.use(async(req,res)=>{
 if(!req.url.startsWith('/api/')&&!req.url.startsWith('/admin'))return handleRequest(req,res);
 const head=res.writeHead.bind(res),end=res.end.bind(res);let status=200,headers={},content;
 res.writeHead=(code,h)=>{status=code;headers=h||{};return res;};res.end=chunk=>{content=chunk;return res;};
 try{await transaction(()=>handleRequest(req,res));res.writeHead=head;res.end=end;head(status,headers);end(content);}catch(e){res.writeHead=head;res.end=end;console.error('Request transaction failed:',e.code||'storage_error');res.statusCode=503;res.setHeader('Content-Type','application/json');end(JSON.stringify({error:'Service temporarily unavailable. Please try again.'}));}
});
server.on('close',()=>{void storage.close();});
const cleanup=setInterval(()=>{for(const [k,v] of sessions)if(v.expires<Date.now())sessions.delete(k);for(const [k,v] of limits)if(v.until<Date.now())limits.delete(k);},60000);cleanup.unref();
if(process.env.NODE_ENV!=='test')server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log(`Cricket Central: http://localhost:${process.env.PORT||3000}`));

let notificationBusy=false;
export async function processNotifications(){
 if(notificationBusy||process.env.NODE_ENV==='test')return;
 notificationBusy=true;
 try{
  for(let count=0;count<20;count++){
   const claimed=await transaction(async()=>{
    const next=structuredClone(db),config=notificationConfig();
    for(const job of next.notifications)if(job.state==='sending'&&Date.now()-Date.parse(job.startedAt||job.created)>120000){job.state='unknown';job.error='Delivery interrupted; verify before retrying.';}
    const job=next.notifications.find(j=>(j.state==='pending'||j.state==='blocked')&&config.enabled&&config[j.channel]);
    if(!job){save(next);return null;}job.state='sending';job.startedAt=new Date().toISOString();job.attempts++;save(next);
    return {job:structuredClone(job),order:structuredClone(db.orders.find(o=>o.number===job.orderNumber))};
   });
   if(!claimed)break;
   const result=await sendNotification(claimed.job,claimed.order);
   await transaction(async()=>{const next=structuredClone(db);Object.assign(next.notifications.find(j=>j.id===claimed.job.id),result);save(next);});
  }
 }catch(e){console.error('Notification worker failed:',e.code||e.message);}finally{notificationBusy=false;}
}
const notificationTimer=setInterval(()=>void processNotifications(),30000);notificationTimer.unref();
if(process.env.NODE_ENV!=='test')void processNotifications();
