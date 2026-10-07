export async function saveProductImages(body,current,saveImage,fail) {
 let entries=body.imageEntries;
 if(entries===undefined&&body.imageDataList!==undefined)entries=body.imageDataList;
 if(entries===undefined)return null;
 if(!Array.isArray(entries)||entries.length<1||entries.length>12)fail('Choose between 1 and 12 product images.');
 const existing=new Set([current?.image,...(current?.images||[])].filter(Boolean));
 for(const entry of entries){
  if(typeof entry!=='string'||(!entry.startsWith('data:image/')&&!existing.has(entry)))fail('Choose uploaded images belonging to this product.');
 }
 const saved=[];
 for(const entry of entries){
  const image=entry.startsWith('data:image/')?await saveImage(entry,'product'):entry;
  if(!image)fail('Choose a PNG, JPG, or WebP image.');
  if(!saved.includes(image))saved.push(image);
 }
 return {image:saved[0],images:saved};
}
