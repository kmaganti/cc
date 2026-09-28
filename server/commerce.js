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
 if(job.purpose==='recovery')return {to:job.to,subject:'Reset your Cricket Central password',text:`Use this link within 30 minutes to reset your password:\n${job.link}\nIf you did not request this, ignore this email.`};
 if(job.purpose==='test')return {to:'orders@cricketcentral.us',subject:'Cricket Central email delivery test',text:'This is a requested setup test. Reply to confirm receipt. No customer order was created.'};
 const customer=job.audience==='customer';
 return {to:[customer?order.email:'orders@cricketcentral.us'],...(customer?{}:{replyTo:order.email}),subject:`${job.event==='status'?'Status update for':customer?'Your':'New'} Cricket Central order ${order.number}`,text:`Order ${order.number}\nPlaced: ${order.created}\nStatus: ${order.status}\nCustomer: ${order.customer.firstName} ${order.customer.lastName}\nEmail: ${order.email}\nPhone: ${order.customer.phone||'Not provided'}\n\n${order.items.map(i=>`${i.name} [${i.sku||i.id}] (${i.option}) × ${i.quantity}: $${(i.price*i.quantity/100).toFixed(2)}`).join('\n')}\n\nSubtotal: $${(order.subtotal/100).toFixed(2)}\nShipping estimate: $${(order.shipping/100).toFixed(2)}\nEstimated total: $${(order.total/100).toFixed(2)}\nDelivery: ${order.customer.address}, ${order.customer.city}, ${order.customer.state} ${order.customer.zip}\nPayment: ${order.paymentStatus}\n${customer?'Thank you. Our team will contact you to confirm availability, final charges and payment.':'Contact this customer to confirm the order and arrange payment.'}\n${order.fulfillment?.trackingNumber?'Tracking: '+order.fulfillment.carrier+' '+order.fulfillment.trackingNumber:''}`};
}
