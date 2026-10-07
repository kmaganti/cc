export const categories = [
 ['bats','Cricket bats','category-cricket-bats.png'],['gloves','Batting gloves','gloves-sg.jpg'],['pads','Batting pads','pads-mrf.jpg'],['protection','Helmets & protection','helmet-shrey.jpg'],['shoes','Cricket shoes','shoes-asics.jpg'],['bags','Kit bags','bag-dsc.jpg'],['balls','Cricket balls','ball.jpg'],['apparel','Clothing','apparel.jpg'],['training','Training','training.jpg'],['juniors','Junior cricket','junior.jpg']
].map(([slug,name,image])=>({slug,name,image}));
const rows = [
 ['ss-ton-reserve','SS TON Reserve Edition','SS','bats',44999,'Grade 1 English willow. A generous sweet spot and balanced pickup for confident stroke play.'],
 ['sf-storm-bat','SF Storm Pro Cricket Bat','SF','bats',27999,'Balanced English willow profile with a clean pickup for club and academy cricket.'],
 ['sg-player-ultimate','SG RP Ultimate','SG','bats',32999,'English willow with a traditional profile, designed for all-round stroke play.'],
 ['mrf-genius-grand','MRF Genius Grand Edition','MRF','bats',37999,'A full blade profile and comfortable handle for powerful, controlled shots.'],
 ['gm-diamond-dxm','GM Diamond DXM','GM','bats',29999,'A balanced English willow bat for players who value timing and control.'],
 ['sg-test-white-gloves','SG Test White Batting Gloves','SG','gloves',12999,'Multi-section finger protection with a supple palm and adjustable wrist closure.'],
 ['ss-pro-gloves','SS Pro Batting Gloves','SS','gloves',11999,'Lightweight protection and a flexible fit for long innings.'],
 ['mrf-genius-pads','MRF Genius Batting Pads','MRF','pads',15999,'Traditional batting pads with a padded knee roll and secure straps.'],
 ['sg-test-pads','SG Test Batting Pads','SG','pads',14999,'Comfortable leg protection with a classic white finish.'],
 ['shrey-masterclass','Shrey Masterclass Helmet','Shrey','protection',14999,'Adjustable cricket helmet. Check the fit and manufacturer safety information before play.'],
 ['masuri-t-line','Masuri T-Line Helmet','Masuri','protection',18999,'A cricket helmet designed for comfort at the crease. Confirm fit before use.'],
 ['asics-gel-peake-2','ASICS Gel-Peake 2','ASICS','shoes',11999,'Cushioned cricket footwear designed for training and match-day movement.'],
 ['adidas-22yards','Adidas 22Yards','Adidas','shoes',10999,'Supportive cricket shoes for quick movement around the ground.'],
 ['dsc-condor-wheelie','DSC Condor Wheelie Bag','DSC','bags',18999,'Room for your match-day essentials, with wheels for easy transport.'],
 ['ss-duffle-kitbag','SS Duffle Kit Bag','SS','bags',12999,'A versatile kit bag with comfortable carry straps.'],
 ['kookaburra-turf-ball','Kookaburra Turf Cricket Ball','Kookaburra','balls',2499,'A traditional red leather cricket ball for your next session.'],
 ['sg-test-ball','SG Test Cricket Ball','SG','balls',2999,'A red leather cricket ball with a pronounced seam.'],
 ['cc-performance-shirt','Central Performance Shirt','Cricket Central','apparel',3999,'A lightweight training shirt for practice days and warm-ups.'],
 ['cc-training-net','Central Training Net','Cricket Central','training',19999,'Build your practice setup with a dedicated cricket training net.'],
 ['sidearm-thrower','Sidearm Thrower','Sidearm','training',4999,'Bring variety to batting practice with a handheld ball thrower.'],
 ['junior-starter-kit','Junior Starter Cricket Kit','Cricket Central','juniors',19999,'A starting point for young cricketers building their first kit.']
];
export const products = rows.map(([slug,name,brand,category,price,description],i)=>({id:slug,slug,name,brand,category,price,description,image:category==='bats'?'bat-ss.jpg':categories.find(c=>c.slug===category).image,stock:25,sku:`CC-${String(i+1).padStart(4,'0')}`,featured:[0,4,8,10].includes(i),options:category==='bats'?['Short handle','Long handle']:['gloves','pads'].includes(category)?['Adult right hand','Adult left hand']:category==='shoes'?['US 8','US 9','US 10','US 11','US 12']:['protection','apparel'].includes(category)?['Small','Medium','Large']:category==='juniors'?['Size 4','Size 5','Size 6']:['Standard']}));
