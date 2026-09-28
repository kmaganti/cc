const fail=message=>{throw Object.assign(new Error(message),{status:400});};
export function allocations(input,locations,stock) {
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Enter valid location quantities.');
 if(Object.keys(input).some(l=>!locations.includes(l)))fail('Choose an existing stock location.');
 const result={};let total=0;
 for(const l of locations){const n=input[l]??0;if(!Number.isInteger(n)||n<0)fail('Location quantities must be non-negative whole numbers.');result[l]=n;total+=n;}
 if(total>stock)fail('Location quantities cannot exceed total stock. Remaining stock is unassigned.');
 return result;
}
export function reserveLocations(db,item){
 const map=db.locationStock[item.id]||{},allocation={};let remaining=item.quantity;
 for(const l of db.locations){const take=Math.min(map[l]||0,remaining);if(take){map[l]-=take;allocation[l]=take;remaining-=take;}}
 item.fulfillmentLocations=allocation;item.unassignedQuantity=remaining;
}
export function restoreLocations(db,item){
 db.locationStock[item.id]??={};
 for(const [l,n] of Object.entries(item.fulfillmentLocations||{})){if(db.locations.includes(l))db.locationStock[item.id][l]=(db.locationStock[item.id][l]||0)+n;}
}
