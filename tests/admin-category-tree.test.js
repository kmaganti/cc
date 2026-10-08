import {test} from 'node:test';
import assert from 'node:assert/strict';

globalThis.document={addEventListener(){}};
const {categoryTreeFields,categoryNodeFields,updateCategoryNode}=await import('../public/admin-category-tree.js');
delete globalThis.document;

const nodes=[{slug:'english',name:'English willow',code:'BAT-EW',displayOrder:1,subcategories:[{slug:'grade-1',name:'Grade 1',code:'BAT-G1',displayOrder:1}]},{slug:'kashmir',name:'Kashmir willow',code:'BAT-KW',displayOrder:2}];

test('category editor includes all editable subcategory rows',()=>{
 const html=categoryTreeFields(nodes);
 assert.deepEqual([...html.matchAll(/data-tree-slug="([^"]+)"/g)].map(match=>match[1]),['english','grade-1','kashmir']);
});

test('focused subcategory editor shows selected branch and retains full tree',()=>{
 const html=categoryTreeFields(nodes,'english');
 assert.deepEqual([...html.matchAll(/data-tree-slug="([^"]+)"/g)].map(match=>match[1]),['english','grade-1']);
 assert.match(html,/data-selected="english"/);
 assert.match(html,/data-new-parent[^>]*>[\s\S]*?<option value="english" selected/);
 assert.match(html,/kashmir/);
 for(const field of ['name','code','parent','order'])assert.match(html,new RegExp(`data-tree-${field}`));
});

test('single item editor excludes its own descendants from parent options',()=>{
 const html=categoryNodeFields(nodes,'english');
 assert.match(html,/data-node-name value="English willow"/);
 assert.doesNotMatch(html,/<option value="(?:english|grade-1)"/);
 assert.match(html,/<option value="kashmir"/);
});

test('single item updates preserve children and unrelated categories',()=>{
 const result=updateCategoryNode(nodes,{slug:'english',name:'English bats',code:'BAT-EW',displayOrder:3,parent:'kashmir'});
 assert.equal(result[0].slug,'kashmir');
 assert.equal(result[0].subcategories[0].name,'English bats');
 assert.equal(result[0].subcategories[0].subcategories[0].slug,'grade-1');
 assert.throws(()=>updateCategoryNode(nodes,{slug:'english',name:'English',code:'BAT-EW',displayOrder:1,parent:'grade-1'}),/parent outside/);
});

test('new child defaults to the selected parent and preserves siblings',()=>{
 assert.match(categoryNodeFields(nodes,'','english'),/<option value="english" selected/);
 const result=updateCategoryNode(nodes,{name:'Grade 2',code:'BAT-G2',displayOrder:2,parent:'english'});
 assert.equal(result[0].subcategories.length,2);
 assert.equal(result[1].slug,'kashmir');
});
