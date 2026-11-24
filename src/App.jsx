import React, { useEffect, useRef, useState } from 'react';
import Storefront, { ProductCard, QuickBuyBar, ProductInfoModal, isBowlingBall, productWeightOptions } from './components/Storefront.jsx';
import Admin from './components/Admin.jsx';
import Checkout from './components/Checkout.jsx';
import { apiUrl } from './api.js';

function CollectionPage({ path, setCart, quickBuySelection, onQuickBuyToggle, onQuickBuyWeightChange, onQuickBuy, onClearQuickBuy }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [infoProductId, setInfoProductId] = useState('');
  useEffect(() => {
    let query = '';
    if (path.startsWith('#brand/')) query = `brand=${encodeURIComponent(decodeURIComponent(path.slice(7)))}`;
    else if (path.startsWith('#category/')) {
      const parts = path.slice(10).split('/').map((part) => decodeURIComponent(part));
      query = `category=${encodeURIComponent(parts[0])}`;
      if (parts[1]) query += `&subcategory=${encodeURIComponent(parts[1])}`;
    } else if (path === '#new-arrivals') query = 'newArrival=true';
    fetch(apiUrl(`/api/catalog${query ? `?${query}` : ''}`)).then((response) => response.ok ? response.json() : []).then(setProducts).finally(() => setLoading(false));
  }, [path]);
  return <><main className="collection-page"><button className="back-button" onClick={() => { location.hash = ''; }}>← Back to store</button><h1>{path === '#new-arrivals' ? 'New Arrivals' : decodeURIComponent(path.split('/').pop())}</h1>{loading ? <p>Loading products...</p> : products.length ? <div className="product-grid collection-grid">{products.map((product) => <ProductCard key={product._id} product={product} add={() => setCart((value) => value + 1)} quickBuyItem={quickBuySelection[product._id]} onQuickBuyToggle={onQuickBuyToggle} onQuickBuyWeightChange={onQuickBuyWeightChange} onMoreInfo={(item) => setInfoProductId(item._id)} />)}</div> : <div className="empty-state">No published products found.</div>}</main><QuickBuyBar selection={quickBuySelection} onBuy={onQuickBuy} onClear={onClearQuickBuy} />{infoProductId && <ProductInfoModal productId={infoProductId} onClose={() => setInfoProductId('')} />}</>;
}

function ProductPage({ id, setCart, quickBuySelection, onQuickBuyToggle, onQuickBuyWeightChange, onQuickBuy, onClearQuickBuy }) {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [localSelectedWeight, setSelectedWeight] = useState('');
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    fetch(apiUrl(`/api/products/${id}`)).then(async (response) => {
      if (!response.ok) throw new Error('Product not found');
      const data = await response.json();
      setProduct(data);
      setSelectedWeight(isBowlingBall(data) ? '' : data.weightOptions?.[0] || '');
    }).catch((err) => setError(err.message));
  }, [id]);
  if (error) return <main className="collection-page"><div className="empty-state">{error}</div></main>;
  if (!product) return <main className="collection-page"><p>Loading product...</p></main>;

  const quickBuyItem = quickBuySelection[product._id];
  const selectedWeight = quickBuyItem?.weight ?? localSelectedWeight;
  const weightOptions = productWeightOptions(product);
  const selectedPrice = product.weightPrices?.find((item) => String(item.weight) === String(selectedWeight))?.price ?? product.price;
  function updateWeight(weight) {
    setSelectedWeight(weight);
    onQuickBuyWeightChange(product, weight);
  }

  function addToCart() {
    if (weightOptions.length && !selectedWeight) return;
    setCart((current) => current + quantity);
    window.dispatchEvent(new CustomEvent('bowlerx-cart-add', { detail: { productId: product._id, name: product.name, price: selectedPrice, weight: selectedWeight, quantity } }));
  }

  const comparePrice = Number(product.compareAtPrice || 0);
  const hasPromo = !!(product.sale && comparePrice > Number(selectedPrice || 0));
  return <><main className="product-detail"><button className="back-button" onClick={() => { location.hash = ''; }}>← Back to store</button><div className="detail-gallery">{(product.images?.length ? product.images : product.imageUrl ? [{url:product.imageUrl}] : []).map((image,index)=><img key={image.url || index} src={image.url} alt={`${product.name} ${index+1}`} />)}</div><div className="detail-copy"><span>{product.brandName}</span><h1>{product.name}</h1><div className="price-row detail-price-row"><strong className="current-price">${Number(selectedPrice).toFixed(2)}</strong>{hasPromo && <del className="original-price">${comparePrice.toFixed(2)}</del>}</div>{hasPromo && <p className="promo-note">Promo price applied. Main price shown struck through.</p>}<p>{product.description || 'No description available.'}</p>
    {weightOptions.length > 0 && <label className="weight-field">Weight<select required value={selectedWeight} onChange={(event) => updateWeight(event.target.value)}><option value="" disabled>Select a weight</option>{weightOptions.map((weight)=><option key={weight} value={weight}>{weight} lb</option>)}</select></label>}
    <label className="quantity-field">Quantity<input type="number" min="1" max={product.stock || 99} value={quantity} onChange={(event) => { const nextQuantity = Math.min(product.stock || 99, Math.max(1, Number(event.target.value) || 1)); setQuantity(nextQuantity); if (quickBuyItem) onQuickBuyToggle(product, selectedWeight, true, nextQuantity); }}/></label>
    {weightOptions.length > 0 && <p className="selected-weight">Selected weight: {selectedWeight ? `${selectedWeight} lb` : 'Please select a weight'}</p>}
    <label className="quick-buy-detail"><input type="checkbox" checked={!!quickBuyItem} disabled={product.availability === 'out_of_stock'} onChange={(event) => onQuickBuyToggle(product, selectedWeight, event.target.checked, quantity)} /> Select for Quick Buy</label>
    <button disabled={product.availability === 'out_of_stock' || (weightOptions.length > 0 && !selectedWeight)} onClick={addToCart}>{product.availability === 'out_of_stock' ? 'OUT OF STOCK' : 'ADD TO CART'}</button></div></main><QuickBuyBar selection={quickBuySelection} onBuy={onQuickBuy} onClear={onClearQuickBuy} /></>;
}

export default function App() {
  const [hash, setHash] = useState(location.hash);
  const [cart, setCart] = useState(() => Number(sessionStorage.getItem('bowlerx-cart-count') || 0));
  const [cartItems, setCartItems] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('bowlerx-cart-items') || '[]'); } catch { return []; }
  });
  const [quickBuySelection, setQuickBuySelection] = useState({});
  const [directCheckoutItems, setDirectCheckoutItems] = useState(null);
  const previousHash = useRef(location.hash);
  function toggleQuickBuy(product, weight, selected, quantity = 1) {
    setQuickBuySelection((current) => {
      const next = { ...current };
      if (selected) next[product._id] = { product, weight, quantity };
      else delete next[product._id];
      return next;
    });
  }
  function updateQuickBuyWeight(product, weight) {
    setQuickBuySelection((current) => current[product._id]
      ? { ...current, [product._id]: { ...current[product._id], weight } }
      : current);
  }
  function startQuickBuy() {
    const items = Object.values(quickBuySelection).map(({ product, weight, quantity }) => ({
      productId: product._id,
      name: product.name,
      price: product.weightPrices?.find((option) => String(option.weight) === String(weight))?.price ?? product.price,
      weight,
      quantity: quantity || 1,
    }));
    if (!items.length) return;
    setDirectCheckoutItems(items);
    setQuickBuySelection({});
    location.hash = '#checkout';
  }
  useEffect(() => {
    const onHash = () => {
      const nextHash = location.hash;
      if (previousHash.current === '#checkout' && nextHash !== '#checkout') setDirectCheckoutItems(null);
      previousHash.current = nextHash;
      setHash(nextHash);
    };
    const onCartAdd = (event) => setCartItems((items) => [...items, event.detail]);
    addEventListener('hashchange', onHash);
    addEventListener('bowlerx-cart-add', onCartAdd);
    return () => {
      removeEventListener('hashchange', onHash);
      removeEventListener('bowlerx-cart-add', onCartAdd);
    };
  }, []);
  useEffect(() => {
    let sessionId = sessionStorage.getItem('bowlerx-visitor-session');
    if (!sessionId) {
      sessionId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      sessionStorage.setItem('bowlerx-visitor-session', sessionId);
    }

    const recordVisit = (path) => {
      if (path === '#admin') return;
      fetch(apiUrl('/api/analytics/visit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, path: path || '/', referrer: document.referrer || '' }),
      }).catch(() => {});
    };

    recordVisit(location.hash);
    const onVisit = () => recordVisit(location.hash);
    addEventListener('hashchange', onVisit);
    return () => removeEventListener('hashchange', onVisit);
  }, []);
  useEffect(() => {
    sessionStorage.setItem('bowlerx-cart-items', JSON.stringify(cartItems));
  }, [cartItems]);
  useEffect(() => {
    sessionStorage.setItem('bowlerx-cart-count', String(cart));
  }, [cart]);
  if (hash === '#admin') {
    return <Admin />;
  }
  if (hash.startsWith('#product/')) return <ProductPage id={hash.slice(9)} setCart={setCart} quickBuySelection={quickBuySelection} onQuickBuyToggle={toggleQuickBuy} onQuickBuyWeightChange={updateQuickBuyWeight} onQuickBuy={startQuickBuy} onClearQuickBuy={() => setQuickBuySelection({})} />;
  if (hash.startsWith('#brand/') || hash.startsWith('#category/') || hash === '#new-arrivals') return <CollectionPage path={hash} setCart={setCart} quickBuySelection={quickBuySelection} onQuickBuyToggle={toggleQuickBuy} onQuickBuyWeightChange={updateQuickBuyWeight} onQuickBuy={startQuickBuy} onClearQuickBuy={() => setQuickBuySelection({})} />;
  if (hash === '#checkout' || hash === '#cart') return <Checkout cartItems={cartItems} setCartItems={setCartItems} setCart={setCart} directItems={directCheckoutItems} setDirectItems={setDirectCheckoutItems} />;
  return <Storefront setCart={setCart} cartCount={cart} quickBuySelection={quickBuySelection} onQuickBuyToggle={toggleQuickBuy} onQuickBuyWeightChange={updateQuickBuyWeight} onQuickBuy={startQuickBuy} onClearQuickBuy={() => setQuickBuySelection({})} />;
}
