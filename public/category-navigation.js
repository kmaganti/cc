import {flattenSubcategories,subcategorySlugs} from './category-tree.js';

function submenu(nodes,category,escape) {
 return nodes.map(node=>{
  const href=`/collections/${encodeURIComponent(category)}?sub=${encodeURIComponent(node.slug)}`;
  return node.subcategories?.length?`<details class="nested-category"><summary>${escape(node.name)}<span aria-hidden="true">&#8250;</span></summary><div class="nested-category-links"><a href="${href}">All ${escape(node.name)}</a>${submenu(node.subcategories,category,escape)}</div></details>`:`<a href="${href}">${escape(node.name)}</a>`;
 }).join('');
}

export function categoryNav(category,escape,current) {
 const href='/collections/'+encodeURIComponent(category.slug);
 if(!category.subcategories?.length)return `<a class="category-top-link" href="${href}"${current(category.slug)}>${escape(category.name)}</a>`;
 return `<details class="category-menu" data-root-menu><summary>${escape(category.name)}<span aria-hidden="true">&#8964;</span></summary><div class="category-dropdown"><a href="${href}"${current(category.slug)}>All ${escape(category.name)}</a>${submenu(category.subcategories,category.slug,escape)}</div></details>`;
}

export function shopMenu(categories,escape) {
 return `<details class="category-menu shop-menu" data-root-menu><summary>Shop all<span aria-hidden="true">&#8964;</span></summary><div class="category-dropdown"><a href="/collections/all">All cricket gear</a>${categories.map(category=>{
  const href='/collections/'+encodeURIComponent(category.slug);
  return category.subcategories?.length?`<details class="nested-category"><summary>${escape(category.name)}<span aria-hidden="true">&#8250;</span></summary><div class="nested-category-links"><a href="${href}">All ${escape(category.name)}</a>${submenu(category.subcategories,category.slug,escape)}</div></details>`:`<a href="${href}">${escape(category.name)}</a>`;
 }).join('')}</div></details>`;
}

export function subcategoryFilters(category,selected,products,escape) {
 return `<div class="subcategory-filters">${flattenSubcategories(category.subcategories).map(item=>{
  const ids=subcategorySlugs(category.subcategories,item.slug),count=products.filter(p=>p.category===category.slug&&ids.has(p.subcategory)).length;
  return `<a class="subcategory-link depth-${item.depth} ${selected===item.slug?'active':''}" href="/collections/${encodeURIComponent(category.slug)}?sub=${encodeURIComponent(item.slug)}">${escape(item.path.join(' / '))}<span>${count}</span></a>`;
 }).join('')}</div>`;
}

document.addEventListener('toggle',event=>{
 const menu=event.target;
 if(menu.matches?.('[data-root-menu]')&&menu.open)document.querySelectorAll('[data-root-menu]').forEach(other=>{if(other!==menu)other.open=false;});
},true);
document.addEventListener('click',event=>{
 if(!event.target.closest('.category-menu'))document.querySelectorAll('[data-root-menu]').forEach(menu=>menu.open=false);
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 const menu=event.target.closest('.category-menu');
 if(menu){menu.open=false;menu.querySelector('summary').focus();}
});
