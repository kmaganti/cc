import pg from 'pg';
import {readFileSync,existsSync} from 'node:fs';

// Transitional aggregate storage. A transaction lock protects checkout and all
// state changes across processes; sessions and uploaded media live separately.
export async function createStorage(seed) {
 const enabled=process.env.CC_USE_POSTGRES!=='false'&&Boolean(process.env.PGHOST||process.env.DATABASE_URL)&&(process.env.NODE_ENV!=='test'||process.env.CC_TEST_POSTGRES==='true');
 if(!enabled&&process.env.NODE_ENV==='production')throw Error('PostgreSQL configuration is required in production.');
 let tail=Promise.resolve();
 const serial=async fn=>{const prior=tail;let release;tail=new Promise(r=>release=r);await prior;try{return await fn();}finally{release();}};
 if(!enabled)return {kind:'file',run:fn=>serial(()=>fn(null)),health:async()=>true,close:async()=>{}};
 const ssl=process.env.PGSSLMODE==='disable'?false:{rejectUnauthorized:true,...(process.env.PGSSLROOTCERT?{ca:readFileSync(process.env.PGSSLROOTCERT,'utf8')}:{})};
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL||undefined,ssl,connectionTimeoutMillis:8000,max:5,idleTimeoutMillis:30000});
 pool.on('error',()=>console.error('PostgreSQL idle connection error'));
 const c=await pool.connect();
 try {
  await c.query('BEGIN');
  await c.query('SELECT pg_advisory_xact_lock(20260927, 1)');
  await c.query('CREATE TABLE IF NOT EXISTS cc_store (id integer PRIMARY KEY CHECK (id=1), payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
  await c.query('CREATE TABLE IF NOT EXISTS cc_sessions (id text PRIMARY KEY, payload jsonb NOT NULL, expires_at timestamptz NOT NULL)');
  await c.query('CREATE INDEX IF NOT EXISTS cc_sessions_expiry ON cc_sessions(expires_at)');
  await c.query('CREATE TABLE IF NOT EXISTS cc_uploads (name text PRIMARY KEY, mime text NOT NULL, content bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now())');
  // Existing database state always wins. Never overwrite it during deployment.
  await c.query('INSERT INTO cc_store(id,payload) VALUES(1,$1) ON CONFLICT(id) DO NOTHING',[JSON.stringify(seed)]);
  await c.query('COMMIT');
 } catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 return {
  kind:'postgres',pool,
  run:fn=>serial(async()=>{
   const client=await pool.connect();
   try{
    await client.query('BEGIN');await client.query('SET LOCAL lock_timeout = \'10s\'');
    await client.query('SELECT pg_advisory_xact_lock(20260927, 1)');
    const state=(await client.query('SELECT payload FROM cc_store WHERE id=1 FOR UPDATE')).rows[0].payload;
    await client.query('DELETE FROM cc_sessions WHERE expires_at<=now()');
    const rows=(await client.query('SELECT id,payload FROM cc_sessions')).rows;
    const sessions=new Map(rows.map(r=>[r.id,r.payload]));
    const context={state,sessions,client};const result=await fn(context);
    await client.query('UPDATE cc_store SET payload=$1,updated_at=now() WHERE id=1',[JSON.stringify(context.state)]);
    for(const [id,value] of sessions)await client.query('INSERT INTO cc_sessions(id,payload,expires_at) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,expires_at=EXCLUDED.expires_at',[id,JSON.stringify(value),new Date(value.expires)]);
    for(const row of rows)if(!sessions.has(row.id))await client.query('DELETE FROM cc_sessions WHERE id=$1',[row.id]);
    await client.query('COMMIT');return result;
   }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }),
  async putUpload(name,mime,content,client=pool){await client.query('INSERT INTO cc_uploads(name,mime,content) VALUES($1,$2,$3) ON CONFLICT(name) DO NOTHING',[name,mime,content]);},
  async getUpload(name){return (await pool.query('SELECT mime,content FROM cc_uploads WHERE name=$1',[name])).rows[0];},
  async health(){await pool.query('SELECT 1');return true;},close:()=>pool.end()
 };
}
