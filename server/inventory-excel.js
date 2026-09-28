import ExcelJS from 'exceljs';
import {randomUUID} from 'node:crypto';
export const headers=['SKU','Product Name','Brand','Category Slug','Price USD','Stock','Product Overview','Key Features','Additional Information','Options','New Product'];
export async function template(categories,locations){
 const book=new ExcelJS.Workbook();
 const sheet=book.addWorksheet('Inventory');
 sheet.addRow([...headers,...locations.map(l=>'Location: '+l)]);
 sheet.views=[{state:'frozen',ySplit:1}];
 sheet.columns.forEach((c,i)=>{c.width=i===1||i>=6&&i<=8?36:22;});
 sheet.getRow(1).height=32;sheet.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF06224B'}};c.alignment={wrapText:true};});
 sheet.getColumn(5).numFmt='0.00';sheet.getColumn(1).numFmt='@';
 const help=book.addWorksheet('Instructions');help.columns=[{width:28},{width:110}];
 [['Inventory import','Fill the Inventory sheet, one product per row. Maximum 500 rows, .xlsx files only (5MB).'],['Required columns','SKU, Product Name, Brand, Category Slug, Price USD, Stock, Product Overview.'],['Create or update','SKU matches ignoring case. Existing SKUs update; new SKUs create products. No products are deleted.'],['Stock','Absolute whole quantity, not an addition to existing stock. Price USD is dollars, with up to two decimals.'],['Optional fields','Blank optional cells preserve existing values on updates. Options are separated with |. New Product is Yes or No.'],['Locations','Leave all location cells blank to preserve allocations. To replace allocations, enter a quantity for every location. Their sum must equal Stock.'],['Images','Existing images are preserved. New products use the category image. Upload product photos in the editor.'],['Preview','Upload, review all changes, then confirm. Any validation error blocks the entire import.'],['Example (do not import)','CC-NEW-001 / Practice Ball / Cricket Central / balls / 12.50 / 10 / Practice cricket ball']].forEach(r=>help.addRow(r));
 help.eachRow(r=>{r.height=42;r.alignment={wrapText:true,vertical:'middle'};});
 const cats=book.addWorksheet('Categories');cats.addRow(['Category Slug','Name']);categories.forEach(c=>cats.addRow([c.slug,c.name]));cats.columns=[{width:28},{width:40}];
 return book.xlsx.writeBuffer();
}
export async function parseInventory(encoded,products,categories,locations){
 if(typeof encoded!=='string'||encoded.length>7*1024*1024||! /^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw Error('Upload an .xlsx file up to 5MB.');
 const bytes=Buffer.from(encoded,'base64');if(bytes.length>5*1024*1024)throw Error('File exceeds 5MB.');
 const book=new ExcelJS.Workbook();try{await book.xlsx.load(bytes);}catch{throw Error('Cannot read this workbook. Save it as .xlsx and try again.');}
 const sheet=book.getWorksheet('Inventory');if(!sheet)throw Error('The workbook needs an Inventory sheet. Download the template.');
 if(sheet.rowCount>501)throw Error('Import at most 500 rows at a time.');
 const columns={};sheet.getRow(1).eachCell((c,i)=>{if(typeof c.value==='string'){if(columns[c.value.trim()])throw Error('Duplicate column: '+c.value);columns[c.value.trim()]=i;}});
 for(const h of headers.slice(0,7))if(!columns[h])throw Error('Missing column: '+h);
 const rows=[],errors=[],seen=new Set();
 for(let r=2;r<=sheet.rowCount;r++){
  const row=sheet.getRow(r);if(!row.values.some(v=>v!==null&&v!==undefined&&v!==''))continue;
  try{
   const get=h=>{const v=columns[h]?row.getCell(columns[h]).value:null;if(v!==null&&typeof v==='object')throw Error('Use plain values, not formulas or links: '+h);return v===null||v===undefined?'':String(v).trim();};
   const required=h=>{const v=get(h);if(!v)throw Error(h+' is required');return v;};
   const sku=required('SKU').toUpperCase();if(!/^[A-Z0-9_-]{1,64}$/.test(sku))throw Error('Invalid SKU');if(seen.has(sku))throw Error('Duplicate SKU in workbook');seen.add(sku);
   const matches=products.filter(p=>p.sku?.toUpperCase()===sku);if(matches.length>1)throw Error('SKU is duplicated in existing inventory');const old=matches[0];
   const name=required('Product Name'),brand=required('Brand'),category=required('Category Slug'),overview=required('Product Overview');
   if(name.length>190||brand.length>100||overview.length>6000)throw Error('Product text is too long');
   if(!categories.some(c=>c.slug===category))throw Error('Unknown category slug: '+category);
   const priceText=required('Price USD');if(!/^\d+(\.\d{1,2})?$/.test(priceText))throw Error('Price USD needs a positive dollar amount, up to two decimals');const price=Math.round(Number(priceText)*100);if(price<1||price>10000000)throw Error('Price is out of range');
   const integer=v=>/^\d+$/.test(v)&&Number(v)<=100000;if(!integer(required('Stock')))throw Error('Stock must be a whole number from 0 to 100000');const stock=Number(get('Stock'));
   const fields={sku,name,brand,category,description:overview,overview,price};
   for(const [h,k] of [['Key Features','keyFeatures'],['Additional Information','additionalInformation']]){const v=get(h);if(v.length>6000)throw Error(h+' is too long');if(v)fields[k]=v;}
   if(get('Options'))fields.options=get('Options').split('|').map(v=>v.trim()).filter(Boolean);
   if(get('New Product')){if(!/^(yes|no)$/i.test(get('New Product')))throw Error('New Product must be Yes or No');fields.isNew=get('New Product').toLowerCase()==='yes';}
   const allocation=locations.map(l=>get('Location: '+l));let locationStock=null;
   if(allocation.some(Boolean)){if(!allocation.every(integer))throw Error('Enter whole quantities for every location');if(allocation.reduce((n,v)=>n+Number(v),0)!==stock)throw Error('Location quantities must total Stock');locationStock=Object.fromEntries(locations.map((l,i)=>[l,Number(allocation[i])]));}
   else if(old&&Object.values(old.locations||{}).reduce((n,v)=>n+v,0)>stock)throw Error('Existing location stock exceeds the new total; update allocations');
   if(old?.discountType){if(old.onSale&&price!==old.price)throw Error('Change sale pricing in the product editor before importing a different price');if(!old.onSale)fields.regularPrice=price;}
   if(old?.compareAtPrice&&old.compareAtPrice<=price)throw Error('Price must remain below the original comparison price; edit that price in admin first');
   rows.push({row:r,id:old?.id||'import-'+randomUUID(),action:old?'Update':'Create',fields,stock,locationStock,oldStock:old?.stock||0,oldPrice:old?.price||0});
  }catch(e){errors.push({row:r,message:e.message});}
 }
 if(!rows.length&&!errors.length)throw Error('The Inventory sheet is empty.');
 return {rows,errors};
}
