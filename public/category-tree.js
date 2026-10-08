export const categorySlug=value=>String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const invalid=message=>{throw Object.assign(Error(message),{status:400});};
export function categoryCode(value,fallback){
 const code=String(value===undefined||value===''?fallback:value).trim().toUpperCase();
 if(!/^[A-Z0-9][A-Z0-9_-]{0,127}$/.test(code))invalid('Category codes need 1 to 128 letters, numbers, hyphens or underscores.');
 return code;
}
export function categoryOrder(value,fallback){
 if(value===undefined)return fallback;
 if(!Number.isSafeInteger(value)||value<0||value>1000000)invalid('Display order must be a whole number from 0 to 1000000.');
 return value;
}

export function normalizeSubcategories(value,current=[],rootSlug='') {
 const rows=value===undefined?current:typeof value==='string'?value.split(/\n+/).filter(line=>line.trim()):value;
 const seen=new Set(rootSlug?[rootSlug]:[]),codes=new Set();let count=0;
 function normalize(items,depth,parentSlug){
  if(!Array.isArray(items))invalid('Subcategories must be a list.');
  if(depth>8&&items.length)invalid('Subcategories can have up to 8 levels.');
  return items.map((row,index)=>{
   const parts=typeof row==='string'?row.split('|'):[];
   const name=String(typeof row==='string'?(parts[1]||parts[0]):row?.name||'').trim();
   const slug=categorySlug(typeof row==='string'?(parts[1]?parts[0]:name):row?.slug||name);
   if(!name||name.length>80||!slug)invalid('Enter a subcategory name up to 80 characters.');
   if(seen.has(slug))invalid('Subcategory slugs must be unique within a category.');
   const object=typeof row==='object'?row:{},prefix=rootSlug?rootSlug.slice(0,32)+'-':'';
   const code=categoryCode(object.code,(prefix+slug).toUpperCase());
   if(codes.has(code))invalid('Category codes must be unique.');
   codes.add(code);seen.add(slug);if(++count>200)invalid('A category can contain up to 200 subcategories.');
   return {slug,name,code,displayOrder:categoryOrder(object.displayOrder,index+1),parentSlug:parentSlug||null,subcategories:normalize(object.subcategories||[],depth+1,slug)};
  }).sort((a,b)=>a.displayOrder-b.displayOrder);
 }
 return normalize(rows,1,rootSlug);
}

export function normalizeCategories(categories){
 const codes=new Set();
 const rows=categories.map((category,index)=>{
  const node={...category,code:categoryCode(category.code,category.slug.toUpperCase()),displayOrder:categoryOrder(category.displayOrder,index+1),parentSlug:null,subcategories:normalizeSubcategories(category.subcategories||[],[],category.slug)};
  for(const item of [node,...flattenSubcategories(node.subcategories)]){
   if(codes.has(item.code))invalid('Category codes must be unique across all categories.');
   codes.add(item.code);
  }
  return node;
 });
 return rows.sort((a,b)=>a.displayOrder-b.displayOrder);
}

export function flattenSubcategories(items,path=[]) {
 return (items||[]).flatMap(item=>{
  const names=[...path,item.name];
  return [{...item,path:names,depth:path.length},...flattenSubcategories(item.subcategories,names)];
 });
}

export function findSubcategory(items,slug) {
 for(const item of items||[]){if(item.slug===slug)return item;const child=findSubcategory(item.subcategories,slug);if(child)return child;}
 return null;
}

export function subcategorySlugs(items,slug) {
 const node=findSubcategory(items,slug);
 return new Set(node?flattenSubcategories([node]).map(item=>item.slug):[]);
}
