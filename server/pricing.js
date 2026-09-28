export function salePricing({regularPrice,onSale,discountType,discountValue}) {
 const invalid=message=>{throw Object.assign(new Error(message),{status:400});};
 if(!Number.isInteger(regularPrice)||regularPrice<1||regularPrice>10000000)invalid('Regular price must be between $0.01 and $100,000.');
 if(typeof onSale!=='boolean')invalid('Sale flag must be true or false.');
 if(!['percent','fixed'].includes(discountType))invalid('Choose percentage or fixed amount.');
 if(typeof discountValue!=='number'||!Number.isFinite(discountValue)||discountValue<0)invalid('Enter a valid discount.');
 if(discountType==='fixed'&&!Number.isInteger(discountValue))invalid('Fixed discounts must use whole cents.');
 if(discountType==='percent'&&(discountValue>=100||Math.abs(discountValue*100-Math.round(discountValue*100))>0.000001))invalid('Percentage must be below 100 with at most two decimals.');
 const reduction=discountType==='percent'?Math.round(regularPrice*discountValue/100):discountValue;
 if(onSale&&(reduction<1||reduction>=regularPrice))invalid('Discount must reduce the price by at least $0.01 and leave a positive sale price.');
 return {regularPrice,onSale,discountType,discountValue,price:onSale?regularPrice-reduction:regularPrice,compareAtPrice:onSale?regularPrice:0};
}
