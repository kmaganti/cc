import {existsSync} from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const {smtpConfigured,smtpTransport,sendEmail}=await import('../server/email.js');
if(!smtpConfigured()){console.error('Set SMTP_HOST, SMTP_USER, SMTP_PASS and ORDER_EMAIL_FROM privately before verification.');process.exitCode=1;}
else{try{const transport=smtpTransport();await transport.verify();console.log('SMTP connection and authentication verified.');transport.close();if(process.argv.includes('--send')){const result=await sendEmail({to:'orders@cricketcentral.us',subject:'Cricket Central delivery verification',text:'Requested setup verification for Cricket Central. No order was created. Confirm receipt of this email to complete the delivery check.'});console.log(result);if(result.state!=='accepted')process.exitCode=1;}}catch(e){console.error('SMTP verification failed:',e.code||'connection_error');process.exitCode=1;}}
