import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveProductImages} from '../server/product-images.js';
const fail=message=>{throw Error(message);};

test('gallery preserves existing images, appends uploads and allows changing primary',async()=>{
 const current={image:'uploads/front.jpg',images:['uploads/front.jpg','uploads/back.jpg']};
 let uploads=0;
 const save=async()=>{uploads++;return 'uploads/side.jpg';};
 const result=await saveProductImages({imageEntries:['uploads/back.jpg','data:image/png;base64,AA==','uploads/front.jpg']},current,save,fail);
 assert.deepEqual(result,{image:'uploads/back.jpg',images:['uploads/back.jpg','uploads/side.jpg','uploads/front.jpg']});
 assert.equal(uploads,1);
 const removed=await saveProductImages({imageEntries:['uploads/side.jpg']},result,save,fail);
 assert.deepEqual(removed,{image:'uploads/side.jpg',images:['uploads/side.jpg']});
});

test('gallery rejects unrelated paths and invalid counts before uploading',async()=>{
 const save=()=>{throw Error('Should not upload');};
 await assert.rejects(saveProductImages({imageEntries:['uploads/another-product.jpg']},{image:'uploads/front.jpg'},save,fail),/belonging/);
 await assert.rejects(saveProductImages({imageEntries:[]},null,save,fail),/between 1 and 12/);
 await assert.rejects(saveProductImages({imageEntries:Array(13).fill('data:image/png;base64,AA==')},null,save,fail),/between 1 and 12/);
});

test('legacy upload list creates a single primary without duplicate copies',async()=>{
 let uploads=0;
 const result=await saveProductImages({imageDataList:['data:image/png;base64,AA==','data:image/png;base64,BB==']},null,async()=>`uploads/${++uploads}.png`,fail);
 assert.deepEqual(result,{image:'uploads/1.png',images:['uploads/1.png','uploads/2.png']});
 assert.equal(await saveProductImages({},result,()=>{},fail),null);
});
