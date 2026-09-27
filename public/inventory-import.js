export function showImport({dialog,api,escape,money,onSaved}){
 let token=null;
 dialog.innerHTML=`<div class="dialog-heading"><h2 id="editor-title">Import inventory</h2><button type="button" data-close aria-label="Close">×</button></div><p>Download the template, fill the Inventory sheet, then preview your changes. Existing SKUs update; new SKUs create products.</p><p><a class="secondary" href="/api/admin/inventory/template">Download Excel template</a></p><label>Excel workbook (.xlsx, up to 5MB)<input type="file" id="inventory-workbook" accept=".xlsx"></label><p><button type="button" id="inventory-preview" class="primary">Preview import</button></p><p id="import-message" role="status"></p><div id="import-preview"></div><button type="button" id="inventory-confirm" class="primary" hidden>Confirm import</button>`;
 dialog.classList.add('import-dialog');dialog.addEventListener('close',()=>dialog.classList.remove('import-dialog'),{once:true});dialog.showModal();
 const q=s=>dialog.querySelector(s),message=q('#import-message'),preview=q('#import-preview'),confirm=q('#inventory-confirm'),button=q('#inventory-preview');
 q('[data-close]').onclick=()=>dialog.close();
 q('#inventory-workbook').onchange=()=>{token=null;confirm.hidden=true;preview.innerHTML='';message.textContent='';};
 button.onclick=async()=>{
  token=null;confirm.hidden=true;preview.innerHTML='';button.disabled=true;
  try{const file=q('#inventory-workbook').files[0];if(!file||!/\.xlsx$/i.test(file.name))throw Error('Choose an .xlsx workbook.');if(file.size>5*1024*1024)throw Error('File must be 5MB or smaller.');
   message.textContent='Validating workbook…';const encoded=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Could not read file'));reader.readAsDataURL(file);});
   const result=await api('inventory/import-preview','POST',{file:encoded});
   if(result.errors.length){message.textContent='Nothing saved. Correct these rows and upload again.';preview.innerHTML='<ul>'+result.errors.map(e=>`<li>Row ${e.row}: ${escape(e.message)}</li>`).join('')+'</ul>';return;}
   token=result.token;message.textContent=`${result.rows.filter(r=>r.action==='Create').length} products to create, ${result.rows.filter(r=>r.action==='Update').length} to update. Stock quantities replace current quantities.`;
   preview.innerHTML=`<div class="table-scroll"><table><thead><tr><th>Action</th><th>SKU / Product</th><th>Stock</th><th>Price</th></tr></thead><tbody>${result.rows.map(r=>`<tr><td>${r.action}</td><td>${escape(r.sku)}<small>${escape(r.name)}</small></td><td>${r.oldStock} → ${r.stock}</td><td>${money(r.oldPrice)} → ${money(r.price)}</td></tr>`).join('')}</tbody></table></div>`;confirm.hidden=false;
  }catch(e){message.textContent=e.message;}finally{button.disabled=false;}
 };
 confirm.onclick=async()=>{confirm.disabled=true;button.disabled=true;try{const result=await api('inventory/import-confirm','POST',{token});token=null;dialog.close();await onSaved(result.count);}catch(e){message.textContent=e.message;confirm.hidden=true;}finally{confirm.disabled=false;button.disabled=false;}};
}
