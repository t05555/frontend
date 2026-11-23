import React, { useEffect, useState } from 'react';
import { Search, ShoppingCart, Menu, X, ChevronRight, ChevronLeft, Star, Truck, ShieldCheck, Phone, Mail, MapPin } from 'lucide-react';
import SiteLogo from './SiteLogo.jsx';
import '../contact.css';
import { apiUrl } from '../api.js';

const formatPrice = (price) => `$${Number(price || 0).toFixed(2)}`;
const bowlingBallWeights = ['10', '11', '12', '13', '14', '15', '16'];

export function isBowlingBall(product) {
  return [product.categoryName, product.subcategoryName, product.category?.name, product.subcategory?.name]
    .some((name) => String(name || '').toLowerCase().includes('ball'));
}

export function productWeightOptions(product) {
  return isBowlingBall(product) ? bowlingBallWeights : product.weightOptions || [];
}

function Header({ cart, onSearch, search, settings }) {
  const [open, setOpen] = useState(false);
  return <>
    {(settings.phone || settings.email || settings.address) && <div className="store-contact-bar">
      {settings.phone && <a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}><Phone/> {settings.phone}</a>}
      {settings.email && <a href={`mailto:${settings.email}`}><Mail/> {settings.email}</a>}
      {settings.address && <span><MapPin/> {settings.address}</span>}
    </div>}
    <header className="bowling-nav">
      <button className="brand" onClick={() => { location.hash = ''; }}><SiteLogo className="header-logo" /></button>
      <button className="menu-trigger" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}<span>MENU</span></button>
      <form className="search navbar-search" onSubmit={(event) => event.preventDefault()}><Search/><input aria-label="Search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search bowling balls, shoes, bags and accessories"/><button type="submit" aria-label="Submit search"><Search/></button></form>
      <div className="actions"><button className="icon cart" aria-label="Cart" onClick={() => { location.hash = '#checkout'; }}><ShoppingCart/><b>{cart}</b></button></div>
    </header>
    <div className="announcement coupon-bar"><div><strong>Take $5 off your purchase of $50+ today!</strong><button>Apply Coupon <ChevronRight/></button></div><small>Coupon exclusions may apply.</small></div>
    <nav className={open ? 'open bowling-nav-menu' : 'bowling-nav-menu'}><button onClick={() => location.hash = '#category/Bowling Balls'}>Bowling Balls <ChevronRight/></button><button onClick={() => location.hash = '#category/Accessories'}>Accessories <ChevronRight/></button><button onClick={() => location.hash = '#category/Accessories/Bowling Bags'}>Bowling Bags <ChevronRight/></button><button onClick={() => location.hash = '#category/Accessories/Bowling Shoes'}>Bowling Shoes <ChevronRight/></button><button onClick={() => location.hash = '#new-arrivals'}>New Arrivals</button><button onClick={() => location.hash = '#category/Accessories'}>Deals</button></nav>
  </>;
}

export function ProductCard({ product, add, sale, quickBuyItem, onQuickBuyToggle, onQuickBuyWeightChange }) {
  const [localWeight, setLocalWeight] = useState(isBowlingBall(product) ? '' : product.weightOptions?.[0] || '');
  const selectedWeight = quickBuyItem?.weight ?? localWeight;
  const weightOptions = productWeightOptions(product);
  const image = product.imageUrl || product.images?.[0]?.url;
  const selectedPrice = product.weightPrices?.find((item) => String(item.weight) === String(selectedWeight))?.price ?? product.price;
  function changeWeight(weight) {
    setLocalWeight(weight);
    onQuickBuyWeightChange?.(product, weight);
  }
  const comparePrice = Number(product.compareAtPrice || 0);
  const hasPromo = (sale || product.sale) && comparePrice > Number(selectedPrice || 0);
  return <article className="product-card">{hasPromo && <span className="sale">PROMO</span>}<label className="quick-buy-option"><input type="checkbox" checked={!!quickBuyItem} disabled={product.availability === 'out_of_stock'} onChange={(event) => onQuickBuyToggle?.(product, selectedWeight, event.target.checked)} /><span>Select for Quick Buy</span></label>{image ? <div className="product-image"><img src={image} alt={product.name} loading="lazy" /></div> : <div className={`ball ${product.color || 'blue'}`}><div className="holes"><i/><i/><i/></div></div>}<div className="product-info"><button className="product-name-button" onClick={() => { location.hash = `#product/${product._id}`; }}>{product.name}</button><div className="price-row"><strong className="current-price">{formatPrice(selectedPrice)}</strong>{hasPromo && <del className="original-price">{formatPrice(comparePrice)}</del>}</div><div className="product-status">{product.availability === 'out_of_stock' ? 'Out of stock' : product.availability === 'low_stock' ? 'Low stock' : 'In stock'}</div>{weightOptions.length > 0 && <label className="weight-selector"><span>Weight:</span><select aria-label={`Choose weight for ${product.name}`} value={selectedWeight} onChange={(event) => changeWeight(event.target.value)}><option value="" disabled>Select weight</option>{weightOptions.map((weight) => <option key={weight} value={weight}>{weight} lbs</option>)}</select></label>}<button className="add-button" disabled={product.availability === 'out_of_stock' || (weightOptions.length > 0 && !selectedWeight)} onClick={() => {
      if (weightOptions.length > 0 && !selectedWeight) return;
      window.dispatchEvent(new CustomEvent('bowlerx-cart-add', { detail: { productId: product._id, name: product.name, price: selectedPrice, weight: selectedWeight || '', quantity: 1 } }));
      add(selectedWeight || '');
    }}>{product.availability === 'out_of_stock' ? 'OUT OF STOCK' : 'ADD TO CART'}</button></div></article>;
}

export function QuickBuyBar({ selection, onBuy, onClear }) {
  const items = Object.values(selection);
  if (!items.length) return null;
  const needsWeight = items.some(({ product, weight }) => productWeightOptions(product).length > 0 && !weight);
  return <aside className="quick-buy-bar" aria-live="polite"><div><strong>{items.length} {items.length === 1 ? 'item' : 'items'} selected</strong>{needsWeight && <small>Choose a weight for each bowling ball.</small>}</div><button type="button" className="quick-buy-clear" onClick={onClear}>CLEAR</button><button type="button" className="quick-buy-submit" disabled={needsWeight} onClick={onBuy}>QUICK BUY SELECTED</button></aside>;
}

function CatalogSection({ title, eyebrow, products, setCart, sale, showViewAll = true, quickBuySelection, onQuickBuyToggle, onQuickBuyWeightChange }) {
  if (!products?.length) return null;
  return <section className="catalog"><div className="section-title"><div><span>{eyebrow}</span><h2>{title}</h2></div>{showViewAll && <button>VIEW ALL <ChevronRight/></button>}</div><div className="product-grid">{products.map((product) => <ProductCard key={product._id} product={product} sale={sale} add={() => setCart((value) => value + 1)} quickBuyItem={quickBuySelection[product._id]} onQuickBuyToggle={onQuickBuyToggle} onQuickBuyWeightChange={onQuickBuyWeightChange} />)}</div></section>;
}

export default function Storefront({ setCart, cartCount, quickBuySelection, onQuickBuyToggle, onQuickBuyWeightChange, onQuickBuy, onClearQuickBuy }) {
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ homepage: [], newArrivals: [], featured: [], bestSellers: [], accessories: [], balls: [], shoes: [], bags: [], brands: [], categories: [] });
  const [catalog, setCatalog] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [settings, setSettings] = useState({ phone: '', email: '', address: '' });

  useEffect(() => {
    Promise.all([fetch(apiUrl('/api/public/homepage')), fetch(apiUrl('/api/catalog')), fetch(apiUrl('/api/public/settings'))]).then(async ([homeResponse, catalogResponse, settingsResponse]) => {
      if (homeResponse.ok) setData(await homeResponse.json());
      if (catalogResponse.ok) setCatalog(await catalogResponse.json());
      if (settingsResponse.ok) setSettings(await settingsResponse.json());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!search) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => fetch(apiUrl(`/api/catalog?search=${encodeURIComponent(search)}`)).then((response) => response.ok ? response.json() : []).then(setSearchResults).catch(() => {}), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const homeSection = (key) => data.homepage.find((section) => section.key === key);
  const slides = [
    homeSection('hero') || { title: 'EVERYTHING BOWLERS NEED.', subtitle: 'Shop the latest bowling balls, shoes and bags.', buttonText: 'SHOP NOW', imageUrl: '' },
    { title: 'DOMINATE THE LANES.', subtitle: 'Premium performance gear for every style.', buttonText: 'SHOP BALLS', imageUrl: '' },
  ];
  const heroEnabled = homeSection('hero')?.enabled !== false;

  return <><Header cart={cartCount} onSearch={setSearch} search={search} settings={settings} /><main>
    {heroEnabled && <section className="hero"><div className="hero-copy"><span>NEW SEASON COLLECTION</span><h1>{slides[slide].title}</h1><p>{slides[slide].subtitle}</p><button onClick={() => { if (slides[slide].buttonUrl) location.hash = slides[slide].buttonUrl; }}>{slides[slide].buttonText || 'SHOP NOW'} <ChevronRight/></button></div>{slides[slide].imageUrl ? <div className="hero-orbit"><img className="hero-banner-image" src={slides[slide].imageUrl} alt={slides[slide].title}/></div> : <div className="hero-orbit"><div className="giant-ball"><div className="ball-holes"><i/><i/><i/></div></div></div>}<button className="slider prev" onClick={() => setSlide(slide ? 0 : 1)}><ChevronLeft/></button><button className="slider next" onClick={() => setSlide(slide ? 0 : 1)}><ChevronRight/></button></section>}
    <section className="trust"><span><Truck/> FAST, INSURED SHIPPING</span><span><ShieldCheck/> 100% FACTORY FIRST QUALITY</span><span><Star/> PBA & PWBA TRUSTED</span></section>
    {search && <CatalogSection title="Search results" eyebrow="STORE SEARCH" products={searchResults} setCart={setCart} showViewAll={false} quickBuySelection={quickBuySelection} onQuickBuyToggle={onQuickBuyToggle} onQuickBuyWeightChange={onQuickBuyWeightChange} />}
    {!search && <CatalogSection title="SHOP ALL PRODUCTS" eyebrow="ALL PUBLISHED PRODUCTS" products={catalog} setCart={setCart} showViewAll={false} quickBuySelection={quickBuySelection} onQuickBuyToggle={onQuickBuyToggle} onQuickBuyWeightChange={onQuickBuyWeightChange} />}
    {homeSection('categories')?.enabled !== false && data.categories.length > 0 && <section className="catalog category-section"><div className="section-title"><div><span>{homeSection('categories')?.subtitle || 'EXPLORE THE PRO SHOP'}</span><h2>{homeSection('categories')?.title || 'SHOP BY CATEGORY'}</h2></div></div><div className="category-grid">{data.categories.filter((category) => !category.parent).map((category) => <button key={category._id} onClick={() => { location.hash = `#category/${encodeURIComponent(category.name)}`; }}><div>{category.imageUrl ? <img src={category.imageUrl} alt=""/> : <span>{category.name.slice(0,1)}</span>}</div><strong>{category.name}</strong></button>)}</div></section>}
    {homeSection('newArrivals')?.enabled !== false && <CatalogSection title={homeSection('newArrivals')?.title || 'NEW ARRIVALS'} eyebrow={homeSection('newArrivals')?.subtitle || 'JUST LANDED'} products={data.newArrivals} setCart={setCart} quickBuySelection={quickBuySelection} onQuickBuyToggle={onQuickBuyToggle} onQuickBuyWeightChange={onQuickBuyWeightChange} />}
    {homeSection('featured')?.enabled !== false && <CatalogSection title={homeSection('featured')?.title || 'FEATURED BOWLING BALLS'} eyebrow="PRO SHOP PICKS" products={data.featured.length ? data.featured : data.balls} setCart={setCart} quickBuySelection={quickBuySelection} onQuickBuyToggle={onQuickBuyToggle} onQuickBuyWeightChange={onQuickBuyWeightChange} />}
    {homeSection('brands')?.enabled !== false && data.brands.length > 0 && <section className="catalog brand-section"><div className="section-title"><div><span>TOP MANUFACTURERS</span><h2>{homeSection('brands')?.title || 'SHOP BY BRAND'}</h2></div></div><div className="brand-grid">{data.brands.map((brand) => <button key={brand._id} onClick={() => { location.hash = `#brand/${encodeURIComponent(brand.name)}`; }}><span className="taxonomy-mark">{brand.logoUrl ? <img src={brand.logoUrl} alt=""/> : <span>{brand.name.slice(0,1)}</span>}</span><strong>{brand.name}</strong></button>)}</div></section>}
    {homeSection('accessories')?.enabled !== false && <CatalogSection title={homeSection('accessories')?.title || 'BOWLING ACCESSORIES'} eyebrow="COMPLETE YOUR GAME" products={data.accessories} setCart={setCart} quickBuySelection={quickBuySelection} onQuickBuyToggle={onQuickBuyToggle} onQuickBuyWeightChange={onQuickBuyWeightChange} />}
    {homeSection('promotions')?.enabled !== false && <section className="promo"><div><span>MEMBER EXCLUSIVE</span><h2>ENJOY ADDED SAVINGS<br/>AND FREE SHIPPING</h2><button>EXPLORE MEMBERSHIP</button></div><div className="lane-art">🎳</div></section>}
    {homeSection('bestSellers')?.enabled !== false && <CatalogSection title={homeSection('bestSellers')?.title || 'BEST SELLERS'} eyebrow="MOST POPULAR" products={data.bestSellers} setCart={setCart} sale quickBuySelection={quickBuySelection} onQuickBuyToggle={onQuickBuyToggle} onQuickBuyWeightChange={onQuickBuyWeightChange} />}
    {homeSection('bowlingShoes')?.enabled !== false && <CatalogSection title={homeSection('bowlingShoes')?.title || 'BOWLING SHOES'} eyebrow={homeSection('bowlingShoes')?.subtitle || 'FOOTWEAR'} products={data.shoes} setCart={setCart} quickBuySelection={quickBuySelection} onQuickBuyToggle={onQuickBuyToggle} onQuickBuyWeightChange={onQuickBuyWeightChange} />}
    {homeSection('bowlingBags')?.enabled !== false && <CatalogSection title={homeSection('bowlingBags')?.title || 'BOWLING BAGS'} eyebrow={homeSection('bowlingBags')?.subtitle || 'GEAR STORAGE'} products={data.bags} setCart={setCart} quickBuySelection={quickBuySelection} onQuickBuyToggle={onQuickBuyToggle} onQuickBuyWeightChange={onQuickBuyWeightChange} />}
  </main><Footer settings={settings} /><QuickBuyBar selection={quickBuySelection} onBuy={onQuickBuy} onClear={onClearQuickBuy} /></>;
}

function Footer({ settings }){return <footer><div className="footer-brand"><SiteLogo className="footer-logo" /><h3>FOR THE LOVE OF BOWLING</h3><p>100% Factory First Quality Products. No Seconds or Blems.</p></div><div><h4>SHOP</h4><a>Bowling Balls</a><a>Bowling Shoes</a><a>Bags & Accessories</a><a>Closeout Deals</a></div><div><h4>HELP</h4><a>Shipping Information</a><a>Returns & Exchanges</a><a>Contact Us</a><a>Protection Plans</a></div><div><h4>CONTACT</h4>{settings.phone && <a className="footer-contact-link" href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}><Phone/> {settings.phone}</a>}{settings.email && <a className="footer-contact-link" href={`mailto:${settings.email}`}><Mail/> {settings.email}</a>}{settings.address && <p className="footer-contact-address"><MapPin/> {settings.address}</p>}<div className="social"><a>FB</a><a>IG</a><a>YT</a></div></div><div className="copyright">© 2026 BOWLER X PRO SHOP, LLC · ALL RIGHTS RESERVED</div></footer>}
