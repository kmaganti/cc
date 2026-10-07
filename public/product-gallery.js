export function productGallery(product, icon, escape) {
 const images=[...new Set([product.image,...(product.images||[])].filter(Boolean))];
 return `<div class="product-gallery" tabindex="0" role="region" aria-label="${escape(product.name)} images" aria-roledescription="carousel">
  <div class="gallery-stage">${images.map((path,index)=>`<img class="gallery-image" src="/assets/${escape(path)}" alt="${escape(product.name)}${images.length>1?` - image ${index+1}`:''}" ${index?'hidden loading="lazy"':'fetchpriority="high"'}>`).join('')}
  ${images.length>1?`<button type="button" class="gallery-arrow previous" data-gallery-step="-1" aria-label="Previous product image" title="Previous image">${icon('arrow')}</button><button type="button" class="gallery-arrow next" data-gallery-step="1" aria-label="Next product image" title="Next image">${icon('arrow')}</button>`:''}</div>
  ${images.length>1?`<div class="gallery-bottom"><span class="gallery-counter" aria-live="polite">1 / ${images.length}</span><div class="gallery-thumbnails">${images.map((path,index)=>`<button type="button" data-gallery-index="${index}" aria-label="Show product image ${index+1}" aria-pressed="${index===0}"><img src="/assets/${escape(path)}" alt="" loading="lazy"></button>`).join('')}</div></div>`:''}
 </div>`;
}

function move(gallery,index) {
 const images=[...gallery.querySelectorAll('.gallery-image')];
 const next=(index+images.length)%images.length;
 images.forEach((image,i)=>image.hidden=i!==next);
 gallery.querySelectorAll('[data-gallery-index]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===next)));
 gallery.dataset.index=String(next);
 const counter=gallery.querySelector('.gallery-counter');
 if(counter)counter.textContent=`${next+1} / ${images.length}`;
}

document.addEventListener('click',event=>{
 const button=event.target.closest('[data-gallery-step],[data-gallery-index]');
 if(!button)return;
 const gallery=button.closest('.product-gallery');
 move(gallery,button.dataset.galleryIndex!==undefined?Number(button.dataset.galleryIndex):Number(gallery.dataset.index||0)+Number(button.dataset.galleryStep));
});
document.addEventListener('keydown',event=>{
 const gallery=event.target.closest('.product-gallery');
 if(!gallery||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();
 const index=Number(gallery.dataset.index||0);
 move(gallery,event.key==='Home'?0:event.key==='End'?-1:index+(event.key==='ArrowLeft'?-1:1));
});
