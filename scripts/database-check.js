import pg from 'pg';
import {existsSync,readFileSync} from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const client=new pg.Client({connectionString:process.env.DATABASE_URL||undefined,connectionTimeoutMillis:8000,ssl:process.env.PGSSLMODE==='disable'?false:{rejectUnauthorized:true,...(process.env.PGSSLROOTCERT?{ca:readFileSync(process.env.PGSSLROOTCERT,'utf8')}:{})}});
try{await client.connect();console.log((await client.query('SELECT current_database() AS database, current_user AS username')).rows[0]);console.log({tls:Boolean(client.connection.stream.encrypted)});console.log({tables:(await client.query("SELECT tablename FROM pg_tables WHERE schemaname=current_schema() AND tablename LIKE 'cc_%'")).rows.map(r=>r.tablename)});}catch(e){console.error('Database connection failed:',e.code||'',e.message);process.exitCode=1;}finally{await client.end();}
