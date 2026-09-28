import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStorage} from '../server/storage.js';
test('PostgreSQL serializes instances, rolls back failed work, persists sessions and uploads', {skip:process.env.CC_TEST_POSTGRES!=='true'},async()=>{
 assert.ok(['127.0.0.1','localhost'].includes(process.env.PGHOST),'Integration test requires a local test database');
 const a=await createStorage({counter:0}),b=await createStorage({counter:99});
 try{
  const original=await a.run(async ctx=>ctx.state.counter||0);
  await Promise.all([a.run(async ctx=>{ctx.state.counter=(ctx.state.counter||0)+1;await new Promise(r=>setTimeout(r,30));}),b.run(async ctx=>{ctx.state.counter=(ctx.state.counter||0)+1;})]);
  assert.equal(await b.run(async ctx=>ctx.state.counter),original+2);
  await assert.rejects(a.run(async ctx=>{ctx.state.counter=999;throw Error('rollback');}));
  assert.equal(await b.run(async ctx=>ctx.state.counter),original+2);
  await a.run(async ctx=>{ctx.sessions.set('integration-session',{cart:[{id:'test',quantity:1}],expires:Date.now()+60000});await a.putUpload('integration-test.png','image/png',Buffer.from('test bytes'),ctx.client);});
  await a.close();
  const reopened=await createStorage({counter:-1});try{
   assert.equal(await reopened.run(async ctx=>ctx.sessions.get('integration-session').cart[0].quantity),1);
   assert.equal((await reopened.getUpload('integration-test.png')).content.toString(),'test bytes');
  }finally{await reopened.close();}
 }finally{await b.close();if(!a.pool.ended)await a.close();}
});
