import {randomBytes, scrypt as derive, timingSafeEqual} from 'node:crypto';
import {smtpConfigured,sendEmail} from './email.js';
import {promisify} from 'node:util';
const scrypt = promisify(derive);
export const statuses = {placed:'Placed', in_progress:'In progress', cancelled:'Cancelled', shipped:'Shipped', delivered:'Delivered'};
export const transitions = {placed:['in_progress','cancelled'], in_progress:['shipped','cancelled'], shipped:['delivered'], cancelled:[], delivered:[]};
export const statusCode = order => order.statusCode || 'placed';
export function publicOrder(order) {
  return {number:order.number, created:order.created, statusCode:statusCode(order), status:statuses[statusCode(order)], paymentStatus:order.paymentStatus, fulfillment:order.fulfillment||{}, total:order.total, subtotal:order.subtotal, shipping:order.shipping, items:order.items, history:(order.history||[{statusCode:'placed',at:order.created}]).map(({statusCode,at})=>({statusCode,at}))};
}
export const publicUser = user => user ? {id:user.id, name:user.name, email:user.email, phone:user.phone, address:user.address, city:user.city, state:user.state, zip:user.zip, savedItems:Array.isArray(user.savedItems)?user.savedItems:[]} : null;
export async function passwordHash(password, salt=randomBytes(16).toString('hex')) {
  return {salt, hash:(await scrypt(password,salt,64)).toString('hex')};
}
export async function verifyPassword(password,user) {
  const {hash}=await passwordHash(password,user?.salt||'missing-user-timing-salt');
  return Boolean(user)&&timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(user.hash,'hex'));
}
export const notificationConfig = () => ({
  enabled: process.env.ORDER_NOTIFICATIONS_ENABLED==='true',
  email: process.env.EMAIL_PROVIDER==='smtp'?smtpConfigured():Boolean(process.env.RESEND_API_KEY&&process.env.ORDER_EMAIL_FROM),
  whatsapp: Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_WHATSAPP_FROM&&process.env.TWILIO_WHATSAPP_CONTENT_SID),
  emailTo:'orders@cricketcentral.us', whatsappTo:'+16142144115'
});
export function queueNotifications(db,order) {
  db.notifications??=[];
  for(const audience of ['team','customer'])db.notifications.push({id:randomBytes(16).toString('hex'),orderNumber:order.number,channel:'email',audience,state:'pending',attempts:0,created:new Date().toISOString()});
  if(process.env.WHATSAPP_ENABLED==='true')db.notifications.push({id:randomBytes(16).toString('hex'),orderNumber:order.number,channel:'whatsapp',state:'pending',attempts:0,created:new Date().toISOString()});
}
export async function sendNotification(job,order,request=fetch) {
  const config=notificationConfig();
  if(!config.enabled||!config[job.channel])return {state:'blocked',error:'Provider not configured or notifications disabled'};
  const total=order?(order.total/100).toFixed(2):'';
  if(job.channel==='email'){
    const message=emailMessage(job,order);
    if(process.env.EMAIL_PROVIDER==='smtp')return sendEmail(message);
  }
  let url,options;
  if(job.channel==='email') {
    url='https://api.resend.com/emails';
    options={headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`order-${job.id}`},body:JSON.stringify({from:process.env.ORDER_EMAIL_FROM,...emailMessage(job,order)})};
  } else {
    url=`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(process.env.TWILIO_ACCOUNT_SID)}/Messages.json`;
    options={headers:{Authorization:'Basic '+Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({To:'whatsapp:'+config.whatsappTo,From:process.env.TWILIO_WHATSAPP_FROM,ContentSid:process.env.TWILIO_WHATSAPP_CONTENT_SID,ContentVariables:JSON.stringify({'1':order.number,'2':`$${total}`,'3':String(order.items.reduce((n,i)=>n+i.quantity,0))})}).toString()};
  }
  try {
    const r=await request(url,{...options,method:'POST',signal:AbortSignal.timeout(15000)});
    if(!r.ok)return {state:r.status>=500?'unknown':'failed',error:`Provider HTTP ${r.status}. Check provider dashboard before retrying.`};
    const result=await r.json();
    return {state:'accepted',providerId:result.id||result.sid,acceptedAt:new Date().toISOString()};
  } catch {return {state:'unknown',error:'Delivery request outcome unknown. Check provider dashboard before retrying.'};}
}

export function emailMessage(job,order){
 if(job.purpose==='recovery')return {to:job.to,subject:'Reset your Cricket Central password',text:`Use this link within 30 minutes to reset your password:\n${job.link}\nIf you did not request this, ignore this email.`,html:`<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#0b2347"><div style="max-width:560px;margin:28px auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden"><div style="background:#0b2347;padding:24px 28px;color:#fff;font-size:22px;font-weight:800">CRICKET <span style="color:#f5b82e">CENTRAL</span></div><div style="padding:28px"><h1 style="font-size:24px">Reset your password</h1><p style="color:#64748b;line-height:1.6">Use the button below within 30 minutes to choose a new password.</p><p><a href="${String(job.link).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" style="display:inline-block;background:#f5b82e;color:#0b2347;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:700">Reset password</a></p><p style="font-size:13px;color:#64748b">If you did not request this, you can safely ignore this email.</p></div></div></body></html>`};
 if(job.purpose==='test')return {to:'orders@cricketcentral.us',subject:'Cricket Central email delivery test',text:'This is a requested setup test. Reply to confirm receipt. No customer order was created.',html:'<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;font-size:16px;line-height:1.5"><div style="max-width:560px;margin:28px auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;color:#0b2347"><h1 style="margin-top:0">Cricket <span style="color:#c99116">Central</span></h1><p>This email confirms that HTML order notifications are configured correctly.</p><p style="color:#64748b">No customer order was created.</p></div></body></html>'};
 const customer=job.audience==='customer';
 const esc=value=>String(value??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
 const base=(process.env.PUBLIC_BASE_URL||'http://localhost:3000').replace(/\/$/,'');
 const trackUrl=`${base}/track-order?order=${encodeURIComponent(order.number)}`;
 const items=order.items.map(i=>`<tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb"><strong>${esc(i.name)}</strong><br><span style="color:#64748b;font-size:13px">SKU ${esc(i.sku||i.id)} · ${esc(i.option||'Standard')} · Qty ${i.quantity}</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #e5e7eb">$${(i.price*i.quantity/100).toFixed(2)}</td></tr>`).join('');
 const text=`Order ${order.number}\nStatus: ${order.status}\n\n${order.items.map(i=>`${i.name} [${i.sku||i.id}] (${i.option||'Standard'}) × ${i.quantity}: $${(i.price*i.quantity/100).toFixed(2)}`).join('\n')}\n\nSubtotal: $${(order.subtotal/100).toFixed(2)}\nShipping: $${(order.shipping/100).toFixed(2)}\nTotal: $${(order.total/100).toFixed(2)}\nPayment: ${order.paymentStatus}\nTrack your order: ${trackUrl}`;
 const html=`<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#0b2347"><div style="max-width:620px;margin:24px auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden"><div style="background:#0b2347;padding:24px 28px;color:#fff"><div style="font-size:24px;font-weight:800;letter-spacing:.04em">CRICKET <span style="color:#f5b82e">CENTRAL</span></div><div style="font-size:12px;letter-spacing:.14em;margin-top:6px;color:#f5b82e">GEAR UP TO PLAY HARD</div></div><div style="padding:28px"><p style="margin-top:0;color:#64748b">${job.event==='status'?'Your order status has been updated.':'Thanks for your order request.'}</p><h1 style="font-size:24px;margin:0 0 6px">Order ${esc(order.number)}</h1><p style="margin:0 0 22px;color:#64748b">Status: <strong style="color:#0b2347">${esc(order.status)}</strong></p><table width="100%" cellspacing="0" cellpadding="0">${items}<tr><td style="padding-top:18px">Subtotal</td><td align="right" style="padding-top:18px">$${(order.subtotal/100).toFixed(2)}</td></tr><tr><td>Shipping</td><td align="right">$${(order.shipping/100).toFixed(2)}</td></tr><tr><td style="font-size:18px;font-weight:700;padding-top:12px">Estimated total</td><td align="right" style="font-size:18px;font-weight:700;padding-top:12px">$${(order.total/100).toFixed(2)}</td></tr></table><p style="margin:24px 0 18px"><a href="${esc(trackUrl)}" style="display:inline-block;background:#f5b82e;color:#0b2347;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:700">Track this order</a></p><p style="font-size:13px;color:#64748b;line-height:1.6">Payment: ${esc(order.paymentStatus)}<br>Delivery: ${esc(order.customer.address)}, ${esc(order.customer.city)}, ${esc(order.customer.state)} ${esc(order.customer.zip)}</p><p style="font-size:13px;color:#64748b">${customer?'Our team will contact you to confirm availability, final charges and payment.':'Reply to this email to contact the Cricket Central team.'}</p></div><div style="padding:18px 28px;background:#f8fafc;color:#64748b;font-size:12px">Cricket Central · Columbus, Ohio</div></div></body></html>`;
 return {to:[customer?order.email:'orders@cricketcentral.us'],...(customer?{}:{replyTo:order.email}),subject:`${job.event==='status'?'Status update for':customer?'Your':'New'} Cricket Central order ${order.number}`,text,html};
}
