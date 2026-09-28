import {test} from 'node:test';
import assert from 'node:assert/strict';
import {salePricing} from '../server/pricing.js';
test('percentage and fixed discounts round to cents and restore regular price',()=>{
 const base={regularPrice:9999,onSale:true,discountType:'percent',discountValue:15};
 assert.equal(salePricing(base).price,8499);
 assert.equal(salePricing({...base,discountType:'fixed',discountValue:1500}).price,8499);
 assert.equal(salePricing({...base,onSale:false}).price,9999);
 assert.equal(salePricing({...base,onSale:false}).compareAtPrice,0);
 for(const discountValue of [-1,0,100,NaN,Infinity,0.001])assert.throws(()=>salePricing({...base,discountValue}));
 assert.throws(()=>salePricing({...base,discountType:'fixed',discountValue:9999}));
 assert.throws(()=>salePricing({...base,discountType:'fixed',discountValue:1.2}));
});
