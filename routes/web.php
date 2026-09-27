<?php use Illuminate\Support\Facades\Route; use App\Http\Controllers\{StoreController,PageController};
Route::get('/',[StoreController::class,'home'])->name('home');
Route::get('/collections/{slug?}',[StoreController::class,'collection'])->name('collection'); Route::get('/products/{slug}',[StoreController::class,'product'])->name('product'); Route::get('/search',[StoreController::class,'search'])->name('search');
Route::get('/cart',[StoreController::class,'cart'])->name('cart'); Route::post('/cart/{slug}',[StoreController::class,'addCart'])->name('cart.add')->middleware('throttle:60,1'); Route::patch('/cart',[StoreController::class,'updateCart'])->name('cart.update');
Route::get('/checkout',[StoreController::class,'checkout'])->name('checkout'); Route::post('/checkout',[StoreController::class,'placeOrder'])->name('checkout.place')->middleware('throttle:10,1'); Route::get('/order/{number}/confirmation',[StoreController::class,'confirmation'])->name('order.confirmation'); Route::match(['get','post'],'/track-order',[StoreController::class,'track'])->name('track');
Route::get('/pages/{page}',[PageController::class,'show'])->name('page');
