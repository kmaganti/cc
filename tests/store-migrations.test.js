import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNotifications} from '../server/store-migrations.js';
test('stores created before notifications initialize an empty queue',()=>{
 assert.deepEqual(normalizeNotifications(undefined),[]);
 assert.deepEqual(normalizeNotifications(null),[]);
});
test('legacy keyed notification lists preserve records',()=>{
 const job={id:'one',state:'accepted',providerId:'provider-1'};
 assert.deepEqual(normalizeNotifications({one:job}),[job]);
 const jobs=[job];assert.equal(normalizeNotifications(jobs),jobs);
 assert.deepEqual(normalizeNotifications({}),[]);
});
test('malformed notification data is not silently erased',()=>{
 for(const value of ['invalid',1,[null],{one:'bad'}])assert.throws(()=>normalizeNotifications(value),/not been overwritten/);
});
