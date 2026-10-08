import {categorySlug,normalizeSubcategories,flattenSubcategories} from './category-tree.js';
const states=new WeakMap();
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function records(tree,parent=''){return tree.flatMap((item,index)=>[{slug:item.slug,name:item.name,code:item.code||'',displayOrder:item.displayOrder??index+1,parent},...records(item.subcategories||[],item.slug)]);}
function state(box){if(!states.has(box))states.set(box,records(JSON.parse(box.dataset.tree)));return states.get(box);}
function tree(items,parent=''){return items.filter(item=>item.parent===parent).sort((a,b)=>a.displayOrder-b.displayOrder).map(item=>({slug:item.slug,name:item.name,code:item.code,displayOrder:item.displayOrder,subcategories:tree(items,item.slug)}));}
function descendants(items,slug){const result=new Set([slug]);for(const item of items.filter(item=>item.parent===slug))for(const child of descendants(items,item.slug))result.add(child);return result;}
function options(items,selected='',excluded=new Set()) {
 return `<option value="">Main category</option>${flattenSubcategories(tree(items)).filter(item=>!excluded.has(item.slug)).map(item=>`<option value="${escape(item.slug)}" ${item.slug===selected?'selected':''}>${escape(item.path.join(' / '))}</option>`).join('')}`;
}
function rows(items,selected=''){const visible=selected?descendants(items,selected):null;return flattenSubcategories(tree(items)).filter(item=>!visible||visible.has(item.slug)).map(item=>{
 const record=items.find(row=>row.slug===item.slug);
 return `<div class="category-tree-row" data-tree-slug="${escape(item.slug)}"><label>Name<input data-tree-name value="${escape(item.name)}" maxlength="80" required aria-label="Subcategory name: ${escape(item.name)}"></label><label>Code<input data-tree-code value="${escape(item.code)}" maxlength="128" pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,127}" placeholder="Auto-generated" aria-label="Code for ${escape(item.name)}"></label><label>Parent<select data-tree-parent aria-label="Parent of ${escape(item.name)}">${options(items,record.parent,descendants(items,item.slug))}</select></label><label>Display order<input data-tree-order type="number" min="0" max="1000000" step="1" required value="${item.displayOrder}" aria-label="Display order for ${escape(item.name)}"></label><button type="button" data-tree-remove title="Remove subcategory and children" aria-label="Remove ${escape(item.name)}">&times;</button></div>`;
}).join('');}
function render(box){const items=state(box),selected=box.dataset.selected||'';box.querySelector('.category-tree-rows').innerHTML=rows(items,selected);box.querySelector('[data-new-parent]').innerHTML=options(items,items.some(item=>item.slug===selected)?selected:'');}

export function categoryTreeFields(nodes=[],selected='') {
 const items=records(nodes);
 return `<fieldset class="category-tree-editor" data-category-tree data-selected="${escape(selected)}" data-tree="${escape(JSON.stringify(nodes))}"><legend>${selected?'Subcategory and children':'Subcategories'}</legend><div class="category-tree-rows">${rows(items,selected)}</div><div class="category-tree-add"><label>Name<input data-new-name maxlength="80" aria-label="New subcategory name"></label><label>Code<input data-new-code maxlength="128" pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,127}" placeholder="Auto-generated" aria-label="New subcategory code"></label><label>Parent<select data-new-parent aria-label="New subcategory parent">${options(items,selected)}</select></label><label>Display order<input data-new-order type="number" min="0" max="1000000" step="1" placeholder="Next available" aria-label="New subcategory display order"></label><button type="button" data-tree-add aria-label="Add subcategory" title="Add subcategory">+</button></div><p class="tree-error" role="alert"></p></fieldset>`;
}

export function updateCategoryNode(nodes,{slug='',name,code,displayOrder,parent=''},rootSlug=''){
 const items=records(nodes),existing=items.find(item=>item.slug===slug);
 if(existing){if(descendants(items,slug).has(parent))throw Error('Choose a parent outside this category branch.');Object.assign(existing,{name,code,displayOrder,parent});}
 else{const newSlug=categorySlug(name);if(!newSlug||items.some(item=>item.slug===newSlug))throw Error('Enter a unique subcategory name.');items.push({slug:newSlug,name,code,displayOrder,parent});}
 if(parent&&!items.some(item=>item.slug===parent))throw Error('Choose an existing parent category.');
 return normalizeSubcategories(tree(items),[],rootSlug);
}
export function categoryNodeFields(nodes,slug='',parent=''){
 const items=records(nodes),item=items.find(item=>item.slug===slug),selected=item?.parent??parent;
 return `<div data-node-editor data-node-slug="${escape(slug)}" data-tree="${escape(JSON.stringify(nodes))}"><label>Name<input data-node-name value="${escape(item?.name||'')}" maxlength="80" required></label><label>Parent<select data-node-parent>${options(items,selected,slug?descendants(items,slug):new Set())}</select></label><label>Display order<input data-node-order type="number" min="0" max="1000000" step="1" value="${item?.displayOrder??Math.max(0,...items.filter(row=>row.parent===selected).map(row=>row.displayOrder))+1}" required></label><label>Code<input data-node-code value="${escape(item?.code||'')}" maxlength="128" pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,127}" placeholder="Auto-generated"></label></div>`;
}
export function categoryTreeValues(form){const rootSlug=form.dataset.slug||categorySlug(form.elements.slug?.value||form.elements.name.value),node=form.querySelector('[data-node-editor]');if(node)return normalizeSubcategories(updateCategoryNode(JSON.parse(node.dataset.tree),{slug:node.dataset.nodeSlug,name:node.querySelector('[data-node-name]').value,code:node.querySelector('[data-node-code]').value,displayOrder:Number(node.querySelector('[data-node-order]').value),parent:node.querySelector('[data-node-parent]').value},rootSlug),[],rootSlug);const saved=form.querySelector('[data-saved-tree]');if(saved)return normalizeSubcategories(JSON.parse(saved.dataset.savedTree),[],rootSlug);return normalizeSubcategories(tree(state(form.querySelector('[data-category-tree]'))),[],rootSlug);}

document.addEventListener('input',event=>{
 if(!event.target.matches('[data-tree-name],[data-tree-code],[data-tree-order]'))return;
 const box=event.target.closest('[data-category-tree]'),slug=event.target.closest('[data-tree-slug]').dataset.treeSlug;
 const item=state(box).find(item=>item.slug===slug),key=event.target.hasAttribute('data-tree-name')?'name':event.target.hasAttribute('data-tree-code')?'code':'displayOrder';
 item[key]=key==='displayOrder'?(event.target.value===''?NaN:Number(event.target.value)):event.target.value;
});
document.addEventListener('change',event=>{
 if(!event.target.matches('[data-tree-parent]'))return;
 const box=event.target.closest('[data-category-tree]'),items=state(box),row=items.find(item=>item.slug===event.target.closest('[data-tree-slug]').dataset.treeSlug),previous=row.parent;
 row.parent=event.target.value;
 try{normalizeSubcategories(tree(items));render(box);box.querySelector('.tree-error').textContent='';}
 catch(error){row.parent=previous;event.target.value=previous;box.querySelector('.tree-error').textContent=error.message;}
});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-tree-add],[data-tree-remove]');if(!button)return;
 const box=button.closest('[data-category-tree]'),items=state(box);
 try{
  if(button.hasAttribute('data-tree-add')){
   const name=box.querySelector('[data-new-name]').value.trim(),slug=categorySlug(name);
   if(!name||!slug)throw Error('Enter a subcategory name.');
   if(items.some(item=>item.slug===slug))throw Error('That subcategory already exists.');
   const parent=box.querySelector('[data-new-parent]').value,order=box.querySelector('[data-new-order]').value,code=box.querySelector('[data-new-code]').value.trim();
   items.push({slug,name,parent,code,displayOrder:order===''?Math.max(0,...items.filter(item=>item.parent===parent).map(item=>item.displayOrder))+1:Number(order)});
   try{normalizeSubcategories(tree(items));}catch(error){items.pop();throw error;}
   box.querySelector('[data-new-name]').value='';box.querySelector('[data-new-code]').value='';box.querySelector('[data-new-order]').value='';
  }else{
   const removed=descendants(items,button.closest('[data-tree-slug]').dataset.treeSlug);
   states.set(box,items.filter(item=>!removed.has(item.slug)));
  }
  render(box);box.querySelector('.tree-error').textContent='';
 }catch(error){box.querySelector('.tree-error').textContent=error.message;}
});
