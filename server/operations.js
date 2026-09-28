import {randomBytes,createHash} from 'node:crypto';
import {passwordHash,notificationConfig} from './commerce.js';
import {roles,staffPublic} from './permissions.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const hash=v=>createHash('sha256').update(v).digest('hex');
const now=()=>new Date().toISOString();
const text=(v,max=500)=>typeof v==='string'?v.trim().slice(0,max):'';
const result=data=>({status:200,data});
export async function operations({path,method,b,db,save,sessions,session,staff,storage}){
 if(path==='/api/account/forgot-password'&&method==='POST'){
  if(!process.env.PUBLIC_BASE_URL)fail('Account recovery is not configured yet.',503);
  const email=text(b.email,190).toLowerCase(),account=db.users.find(u=>u.email===email);
  if(account&&(!account.recovery||account.recovery.expires<Date.now()+1740000)){const next=structuredClone(db),u=next.users.find(u=>u.id===account.id),token=randomBytes(32).toString('hex');u.recovery={hash:hash(token),expires:Date.now()+1800000};
   const base=process.env.PUBLIC_BASE_URL;
   next.notifications.push({id:randomBytes(16).toString('hex'),channel:'email',purpose:'recovery',to:email,link:new URL('/account/reset-password?token='+token,base).href,state:'pending',attempts:0,created:now()});save(next);
  }
  return result({message:'If this email has an account, a password reset link will be sent.'});
 }
 if(path==='/api/account/reset-password'&&method==='POST'){
  if(typeof b.token!=='string'||! /^[a-f0-9]{64}$/.test(b.token)||typeof b.password!=='string'||b.password.length<12||b.password.length>128)fail('Enter a valid reset link and password of 12–128 characters.');
  const user=db.users.find(u=>u.recovery?.hash===hash(b.token)&&u.recovery.expires>Date.now());if(!user)fail('Reset link is invalid or expired.');
  const next=structuredClone(db),u=next.users.find(u=>u.id===user.id);Object.assign(u,await passwordHash(b.password));delete u.recovery;save(next);
  for(const s of sessions.values())if(s.userId===u.id)delete s.userId;
  return result({message:'Password reset. Sign in with your new password.'});
 }
 if(!path.startsWith('/api/admin/'))return null;
 if(path==='/api/admin/staff'){
  if(method==='GET')return result({staff:(db.staff||[]).map(staffPublic),roles:Object.keys(roles)});
  if(method==='POST'){
   const username=text(b.username,80).toLowerCase(),name=text(b.name,100);if(!/^[a-z0-9@._-]{3,80}$/.test(username)||!name||!roles[b.role])fail('Enter a valid username, name and role.');
   if(db.staff.some(u=>u.username===username))fail('Username already exists.',409);
   if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)fail('Staff passwords must contain 12–128 characters.');
   const next=structuredClone(db);next.staff.push({id:randomBytes(16).toString('hex'),username,name,role:b.role,active:true,...await passwordHash(b.password),created:now()});save(next);return result({ok:true});
  }
  if(method==='PATCH'){
   if(b.id===staff.id)fail('Use another owner account to change your own access.');
   const next=structuredClone(db),u=next.staff.find(u=>u.id===b.id);if(!u)fail('Staff member not found.',404);
   if(!roles[b.role]||typeof b.active!=='boolean')fail('Choose a role and active status.');
   Object.assign(u,{role:b.role,active:b.active});if(!next.staff.some(u=>u.active&&u.role==='owner'))fail('Keep at least one active owner.');
   if(b.password){if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)fail('Use a password of 12–128 characters.');Object.assign(u,await passwordHash(b.password));}
   save(next);for(const s of sessions.values())if(s.staffId===u.id){delete s.staffId;s.adminUntil=0;}return result({ok:true});
  }
 }
 if(path==='/api/admin/monitoring'&&method==='GET'){
  const counts={};for(const j of db.notifications)counts[j.state]=(counts[j.state]||0)+1;
  return result({storage:storage.kind,email:notificationConfig(),notificationCounts:counts,uptime:Math.floor(process.uptime()),orders:db.orders.length,customers:db.users.length,sessions:sessions.size,unpaid:db.orders.filter(o=>!['cancelled'].includes(o.statusCode)&&o.paymentStatus!=='paid').length,issues:db.notifications.filter(j=>['failed','unknown','blocked'].includes(j.state)).slice(-25).map(({id,orderNumber,state,error,created})=>({id,orderNumber,state,error,created}))});
 }
 if(path==='/api/admin/email-test'&&method==='POST'){
  if(!notificationConfig().enabled||!notificationConfig().email)fail('Configure SMTP credentials and enable notifications first.',503);
  const next=structuredClone(db),id=randomBytes(16).toString('hex');next.notifications.push({id,channel:'email',purpose:'test',state:'pending',attempts:0,created:now()});save(next);return result({id,message:'Test email queued to orders@cricketcentral.us. Check monitoring and confirm inbox receipt.'});
 }
 if(path==='/api/admin/payments'&&method==='POST'){
  const next=structuredClone(db),o=next.orders.find(o=>o.number===b.number);if(!o)fail('Order not found.',404);
  if(!['received','refunded'].includes(b.type)||!Number.isInteger(b.amount)||b.amount<=0||!text(b.reference)||! /^[a-zA-Z0-9-]{16,60}$/.test(b.requestId||''))fail('Enter payment amount, type and a reference.');
  o.payments??=[];if(o.payments.some(p=>p.requestId===b.requestId))return result({ok:true});
  const balance=o.payments.reduce((n,p)=>n+(p.type==='received'?p.amount:-p.amount),0);
  if(b.type==='refunded'&&b.amount>balance)fail('Refund cannot exceed recorded payments.');
  if(b.type==='received'&&(o.statusCode==='cancelled'||balance+b.amount>o.total))fail('Payment cannot exceed the order balance or apply to a cancelled order.');
  o.payments.push({type:b.type,amount:b.amount,reference:text(b.reference),requestId:b.requestId,staff:staff.username,at:now()});const paid=balance+(b.type==='received'?b.amount:-b.amount);
  o.paymentStatus=paid>=o.total?'paid':paid>0?'partially_paid':b.type==='refunded'?'refunded':'unpaid';save(next);return result({ok:true});
 }
 if(path==='/api/admin/orders/manage'&&method==='PATCH'){
  const next=structuredClone(db),o=next.orders.find(o=>o.number===b.number);if(!o)fail('Order not found.',404);
  if(b.assignedTo&&!db.staff.some(s=>s.id===b.assignedTo&&s.active))fail('Choose an active staff member.');
  o.assignedTo=b.assignedTo||null;
  o.fulfillment={carrier:text(b.carrier,100),trackingNumber:text(b.trackingNumber,150)};
  if(text(b.note)){o.internalNotes??=[];o.internalNotes.push({text:text(b.note,2000),staff:staff.username,at:now()});}
  save(next);return result({ok:true});
 }
 if(path==='/api/admin/marketing'){
  if(method==='GET')return result({promotions:db.promotions||[],subscribers:db.subscribers.length});
  if(method==='POST'){
   const code=text(b.code,30).toUpperCase();if(!/^[A-Z0-9_-]{3,30}$/.test(code)||!['percent','fixed'].includes(b.type)||!Number.isInteger(b.value)||b.value<=0||(b.type==='percent'&&b.value>=100)||!Number.isInteger(b.maxUses)||b.maxUses<1)fail('Enter a valid code, discount and usage limit.');
   if(!b.endsAt||!Number.isFinite(Date.parse(b.endsAt))||Date.parse(b.endsAt)<=Date.now())fail('Choose a future expiration date.');
   const next=structuredClone(db);next.promotions??=[];if(next.promotions.some(p=>p.code===code))fail('Code already exists.',409);
   next.promotions.push({code,type:b.type,value:b.value,maxUses:b.maxUses,uses:0,endsAt:new Date(b.endsAt).toISOString(),active:true});save(next);return result({ok:true});
  }
  if(method==='PATCH'){const next=structuredClone(db),p=next.promotions?.find(p=>p.code===b.code);if(!p)fail('Promotion not found.',404);if(typeof b.active!=='boolean')fail('Choose active status.');p.active=b.active;save(next);return result({ok:true});}
 }
 return null;
}
