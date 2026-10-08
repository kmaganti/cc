import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSubcategories,normalizeCategories,flattenSubcategories,findSubcategory,subcategorySlugs} from '../public/category-tree.js';

const tree=normalizeSubcategories([{slug:'english-willow',name:'English willow',subcategories:[{slug:'grade-1',name:'Grade 1',subcategories:[{slug:'pro',name:'Professional'}]}]},{slug:'kashmir',name:'Kashmir willow'}]);
test('nested subcategories preserve URLs and support ancestor filters',()=>{
 assert.equal(findSubcategory(tree,'pro').name,'Professional');
 assert.deepEqual([...subcategorySlugs(tree,'english-willow')],['english-willow','grade-1','pro']);
 assert.deepEqual([...subcategorySlugs(tree,'grade-1')],['grade-1','pro']);
 assert.equal(subcategorySlugs(tree,'missing').size,0);
 assert.deepEqual(flattenSubcategories(tree).find(s=>s.slug==='pro').path,['English willow','Grade 1','Professional']);
});
test('legacy flat category data remains compatible',()=>{
 const legacy=normalizeSubcategories('english|English willow\nKashmir willow',[],'bats');
 assert.deepEqual(legacy.map(({slug,code,displayOrder,parentSlug})=>({slug,code,displayOrder,parentSlug})),[{slug:'english',code:'BATS-ENGLISH',displayOrder:1,parentSlug:'bats'},{slug:'kashmir-willow',code:'BATS-KASHMIR-WILLOW',displayOrder:2,parentSlug:'bats'}]);
 assert.deepEqual(normalizeSubcategories(undefined,tree),tree);
});

test('codes and display order apply at every level with derived parents',()=>{
 const categories=normalizeCategories([{slug:'bats',name:'Bats',code:'bat',displayOrder:2,subcategories:[{slug:'english',name:'English',code:'bat-ew',displayOrder:20,subcategories:[{slug:'grade-2',name:'Grade 2',displayOrder:2},{slug:'grade-1',name:'Grade 1',displayOrder:1}]},{slug:'kashmir',name:'Kashmir',displayOrder:10}]},{slug:'balls',name:'Balls',displayOrder:1}]);
 assert.deepEqual(categories.map(c=>c.slug),['balls','bats']);
 const bats=categories[1];assert.equal(bats.code,'BAT');assert.equal(bats.parentSlug,null);
 assert.deepEqual(bats.subcategories.map(c=>c.slug),['kashmir','english']);
 const english=findSubcategory(bats.subcategories,'english');assert.equal(english.code,'BAT-EW');assert.equal(english.parentSlug,'bats');
 assert.deepEqual(english.subcategories.map(c=>c.slug),['grade-1','grade-2']);
 assert.equal(english.subcategories[0].parentSlug,'english');
});

test('duplicate codes and invalid ordering are rejected',()=>{
 assert.throws(()=>normalizeCategories([{slug:'bats',code:'GEAR',subcategories:[{name:'English',code:'gear'}]}]),/unique/);
 assert.throws(()=>normalizeCategories([{slug:'bats',code:'GEAR'},{slug:'balls',code:'gear'}]),/unique/);
 assert.throws(()=>normalizeSubcategories([{name:'English',displayOrder:1.5}]),/whole number/);
 assert.throws(()=>normalizeSubcategories([{name:'English',code:'has spaces'}]),/Category codes/);
 assert.throws(()=>normalizeSubcategories([{name:'Bats',slug:'bats'}],[],'bats'),/unique/);
});
test('nested trees reject duplicate URLs and excessive depth',()=>{
 assert.throws(()=>normalizeSubcategories([{name:'Same',subcategories:[{name:'Same'}]}]),/unique/);
 let node={name:'Level 9'};for(let i=8;i>0;i--)node={name:`Level ${i}`,subcategories:[node]};
 assert.throws(()=>normalizeSubcategories([node]),/8 levels/);
});
