import nodemailer from 'nodemailer';
export function smtpConfigured(){return Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.ORDER_EMAIL_FROM);}
export function smtpTransport(){return nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||465),secure:process.env.SMTP_SECURE!=='false',requireTLS:true,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true});}
export async function sendEmail(message){
 if(!smtpConfigured())return {state:'blocked',error:'SMTP credentials are not configured'};
 try{const result=await smtpTransport().sendMail({...message,from:process.env.ORDER_EMAIL_FROM,disableFileAccess:true,disableUrlAccess:true});return result.accepted?.length?{state:'accepted',providerId:result.messageId,acceptedAt:new Date().toISOString()}:{state:'failed',error:'Recipient was rejected by SMTP server'};}
 catch(e){return {state:['EAUTH','EENVELOPE'].includes(e.code)?'failed':'unknown',error:['EAUTH','EENVELOPE'].includes(e.code)?'SMTP authentication or recipient rejected':'SMTP outcome unknown; inspect mailbox before retrying'};}
}
