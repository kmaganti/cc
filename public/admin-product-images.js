const states=new WeakMap();
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function state(box){if(!states.has(box))states.set(box,JSON.parse(box.dataset.images).map(path=>({value:path,src:'/assets/'+path})));return states.get(box);}
function previews(entries){return entries.map((entry,index)=>`<div class="product-image-preview"><img src="${escape(entry.src)}" alt="Product image ${index+1}"><div>${index===0?'<span>Primary</span>':`<button type="button" data-image-primary="${index}" title="Set primary image">Set primary</button>`}<button type="button" data-image-remove="${index}" aria-label="Remove image ${index+1}" title="Remove image">&times;</button></div></div>`).join('');}
function render(box){box.querySelector('.product-image-previews').innerHTML=previews(state(box));box.querySelector('.image-upload-error').textContent='';}

export function productImageFields(product={}) {
 const images=[...new Set([product.image,...(product.images||[])].filter(Boolean))];
 return `<fieldset class="product-image-editor" data-product-images data-images="${escape(JSON.stringify(images))}"><legend>Product images</legend><div class="product-image-previews">${previews(images.map(path=>({src:'/assets/'+path})))}</div><label>Add images<input name="imageFiles" type="file" accept="image/png,image/jpeg,image/webp" multiple></label><p class="image-upload-error error" role="alert"></p></fieldset>`;
}

export function connectProductImages(readFile) {
 document.addEventListener('change',async event=>{
  if(event.target.name!=='imageFiles')return;
  const box=event.target.closest('[data-product-images]');if(!box)return;
  const entries=state(box),files=[...event.target.files];
  const submit=box.closest('form').querySelector('button:not([type])');
  const wasDisabled=submit.disabled;
  submit.disabled=true;box.dataset.loading='true';event.target.disabled=true;
  try{
   if(entries.length+files.length>12)throw Error('Choose up to 12 images per product.');
   const values=await Promise.all(files.map(readFile));
   entries.push(...values.map(value=>({value,src:value})));render(box);
  }catch(error){box.querySelector('.image-upload-error').textContent=error.message;}
  finally{event.target.value='';event.target.disabled=false;delete box.dataset.loading;submit.disabled=wasDisabled;}
 });
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-image-remove],[data-image-primary]');if(!button)return;
  const box=button.closest('[data-product-images]');if(box.dataset.loading)return;
  const entries=state(box);
  if(button.dataset.imageRemove!==undefined)entries.splice(Number(button.dataset.imageRemove),1);
  else entries.unshift(...entries.splice(Number(button.dataset.imagePrimary),1));
  render(box);
 });
}

export function productImageValues(form) {
 const box=form.querySelector('[data-product-images]');
 if(box.dataset.loading)throw Error('Wait for the images to finish loading.');
 const entries=state(box);if(!entries.length)throw Error('Add at least one product image.');
 return entries.map(entry=>entry.value);
}
