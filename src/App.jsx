import React, { useEffect, useState } from 'react';
import Storefront from './components/Storefront.jsx';
import Admin from './components/Admin.jsx';
import Checkout from './components/Checkout.jsx';
import { apiUrl } from './api.js';

function CollectionPage({ path }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
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
  return <main className="collection-page"><button className="back-button" onClick={() => { location.hash = ''; }}>← Back to store</button><h1>{path === '#new-arrivals' ? 'New Arrivals' : decodeURIComponent(path.split('/').pop())}</h1>{loading ? <p>Loading products...</p> : products.length ? <div className="product-grid collection-grid">{products.map((product) => <article className="product-card" key={product._id}><div className="product-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.name}/> : <strong>{product.name}</strong>}</div><div className="product-info"><p>{product.name}</p><strong>${Number(product.weightPrices?.[0]?.price ?? product.price).toFixed(2)}</strong></div></article>)}</div> : <div className="empty-state">No published products found.</div>}</main>;
}

function ProductPage({ id, setCart }) {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    fetch(apiUrl(`/api/products/${id}`)).then(async (response) => {
      if (!response.ok) throw new Error('Product not found');
      const data = await response.json();
      setProduct(data);
      setSelectedWeight(data.weightOptions?.[0] || '');
    }).catch((err) => setError(err.message));
  }, [id]);
  if (error) return <main className="collection-page"><div className="empty-state">{error}</div></main>;
  if (!product) return <main className="collection-page"><p>Loading product...</p></main>;

  function addToCart() {
    if (product.weightOptions?.length && !selectedWeight) return;
    setCart((current) => current + quantity);
    window.dispatchEvent(new CustomEvent('bowlerx-cart-add', { detail: { productId: product._id, name: product.name, price: selectedPrice, weight: selectedWeight, quantity } }));
  }
  const selectedPrice = product.weightPrices?.find((item) => item.weight === selectedWeight)?.price ?? product.price;

  return <main className="product-detail"><button className="back-button" onClick={() => { location.hash = ''; }}>← Back to store</button><div className="detail-gallery">{(product.images?.length ? product.images : product.imageUrl ? [{url:product.imageUrl}] : []).map((image,index)=><img key={image.url || index} src={image.url} alt={`${product.name} ${index+1}`} />)}</div><div className="detail-copy"><span>{product.brandName}</span><h1>{product.name}</h1><strong>${Number(selectedPrice).toFixed(2)}</strong><p>{product.description || 'No description available.'}</p>
    {product.weightOptions?.length > 0 && <label className="weight-field">Weight<select required value={selectedWeight} onChange={(event) => setSelectedWeight(event.target.value)}><option value="" disabled>Select a weight</option>{product.weightOptions.map((weight)=><option key={weight} value={weight}>{weight} lb</option>)}</select></label>}
    <label className="quantity-field">Quantity<input type="number" min="1" max={product.stock || 99} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}/></label>
    {product.weightOptions?.length > 0 && <p className="selected-weight">Selected weight: {selectedWeight ? `${selectedWeight} lb` : 'Please select a weight'}</p>}
    <button disabled={product.availability === 'out_of_stock' || (product.weightOptions?.length > 0 && !selectedWeight)} onClick={addToCart}>{product.availability === 'out_of_stock' ? 'OUT OF STOCK' : 'ADD TO CART'}</button></div></main>;
}

export default function App() {
  const [hash, setHash] = useState(location.hash);
  const [cart, setCart] = useState(() => Number(sessionStorage.getItem('bowlerx-cart-count') || 0));
  const [cartItems, setCartItems] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('bowlerx-cart-items') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    const onHash = () => setHash(location.hash);
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
    if (sessionStorage.getItem('bowlerx-admin-token')) return <Admin />;
    return <Storefront setCart={setCart} cartCount={cart} />;
  }
  if (hash.startsWith('#product/')) return <ProductPage id={hash.slice(9)} setCart={setCart} />;
  if (hash.startsWith('#brand/') || hash.startsWith('#category/') || hash === '#new-arrivals') return <CollectionPage path={hash} />;
  if (hash === '#checkout' || hash === '#cart') return <Checkout cartItems={cartItems} setCartItems={setCartItems} setCart={setCart} />;
  return <Storefront setCart={setCart} cartCount={cart} />;
}
