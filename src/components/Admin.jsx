import React, { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, Boxes, CircleDot, Package, Tag, Layers, ShoppingBag, Users, Warehouse, House, Settings, Search, Plus, Edit3, Trash2, LogOut, X, Upload, MessageCircle } from 'lucide-react';
import SiteLogo from './SiteLogo.jsx';
import OrderChat from './OrderChat.jsx';
import { apiUrl } from '../api.js';

const sections = [
  ['Dashboard Overview', LayoutDashboard], ['All Products', Boxes], ['Bowling Balls', CircleDot],
  ['Bowling Shoes', ShoppingBag], ['Bowling Bags', Package], ['Accessories', ShoppingBag],
  ['New Arrivals', Tag], ['Brands', Tag], ['Categories', Layers], ['Orders', Package], ['Customers', Users],
  ['Inventory', Warehouse], ['Homepage Management', House], ['Website Settings', Settings],
];
const navigationGroups = [
  { title: 'WORKSPACE', sections: sections.slice(0, 7) },
  { title: 'CATALOG', sections: sections.slice(7, 9) },
  { title: 'STORE', sections: sections.slice(9) },
];

async function api(path, options = {}, token) {
  const response = await fetch(apiUrl(path), { ...options, headers: { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Request failed');
  return response.status === 204 ? null : response.json();
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ username: 'admin', password: '' });
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    try { const data = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); onLogin(data.token); }
    catch (err) { setError(err.message); }
  }
  return <div className="admin-login"><form onSubmit={submit}><SiteLogo className="login-logo" /><h1>BowlerX Admin</h1><p>Sign in to manage the store.</p>{error && <div className="form-error">{error}</div>}<label>Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label><label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><button type="submit">SIGN IN</button></form></div>;
}

function LegacyProductForm({ product, brands, categories, token, onSaved, onClose }) {
  const [data, setData] = useState(product || { name: '', description: '', price: '', sku: '', stock: 0, brand: '', category: '', subcategory: '', weightOptions: '', published: false, featured: false, newArrival: false, bestSeller: false, availability: 'in_stock' });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState(product?.images?.map((image) => image.url) || []);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setData((current) => ({ ...current, [key]: value }));

  function chooseFiles(event) {
    const chosen = [...event.target.files].slice(0, 12);
    setFiles(chosen);
    setPreviews(chosen.map((file) => URL.createObjectURL(file)));
  }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    const body = new FormData();
    Object.entries(data).forEach(([key, value]) => { if (value !== null && value !== undefined && typeof value !== 'object') body.append(key, value); });
    if (product?.images) body.append('existingImages', JSON.stringify(previews.length === 0 ? [] : product.images.filter((image) => previews.includes(image.url))));
    files.forEach((file) => body.append('images', file));
    if (data.weightPrices) {
      const weightPricesValue = Array.isArray(data.weightPrices)
        ? data.weightPrices.map((item) => `${item.weight}:${item.price}`).join(',')
        : data.weightPrices;
      body.append('weightPrices', weightPricesValue);
    }
    try {
      await api(product ? `/api/admin/products/${product._id}` : '/api/admin/products', { method: product ? 'PUT' : 'POST', body }, token);
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop"><form className="product-modal" onSubmit={submit}><div className="modal-head"><div><span>{product ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</span><h2>{product ? product.name : 'Add product'}</h2></div><button type="button" onClick={onClose}><X /></button></div><div className="modal-body"><div className="form-column"><label>Product name<input required value={data.name} onChange={(e) => set('name', e.target.value)} /></label><label>Description<textarea rows="5" value={data.description} onChange={(e) => set('description', e.target.value)} /></label><div className="form-grid"><label>Price<input required type="number" min="0" step="0.01" value={data.price} onChange={(e) => set('price', e.target.value)} /></label><label>SKU<input value={data.sku || ''} onChange={(e) => set('sku', e.target.value)} /></label><label>Stock<input type="number" min="0" value={data.stock} onChange={(e) => set('stock', e.target.value)} /></label><label>Weights<input placeholder="12, 13, 14, 15" value={data.weightOptions?.join?.(',') || data.weightOptions || ''} onChange={(e) => set('weightOptions', e.target.value)} /></label></div></div><div className="form-column"><div className="form-grid"><label>Brand<select value={data.brand?._id || data.brand || ''} onChange={(e) => set('brand', e.target.value)}><option value="">Select brand</option>{brands.map((brand) => <option key={brand._id} value={brand.name}>{brand.name}</option>)}</select></label><label>Main category<select value={data.category?._id || data.category || ''} onChange={(e) => set('category', e.target.value)}><option value="">Select category</option>{categories.filter((category) => !category.parent).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label>Subcategory<select value={data.subcategory?._id || data.subcategory || ''} onChange={(e) => set('subcategory', e.target.value)}><option value="">Select subcategory</option>{categories.filter((category) => category.parent).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label>Availability<select value={data.availability} onChange={(e) => set('availability', e.target.value)}><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option><option value="preorder">Preorder</option></select></label></div><div className="toggle-grid"><label><input type="checkbox" checked={!!data.published} onChange={(e) => set('published', e.target.checked)} /> Published</label><label><input type="checkbox" checked={!!data.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured</label><label><input type="checkbox" checked={!!data.newArrival} onChange={(e) => set('newArrival', e.target.checked)} /> New arrival</label><label><input type="checkbox" checked={!!data.bestSeller} onChange={(e) => set('bestSeller', e.target.checked)} /> Best seller</label></div><label className="upload-box"><Upload /><span>Upload multiple product images</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={chooseFiles} /></label><div className="image-previews">{previews.map((url, index) => <div key={url}><img src={url} alt="Product preview" /><button type="button" onClick={() => setPreviews((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>{index === 0 && <span>COVER</span>}</div>)}</div></div></div>{error && <div className="form-error modal-error">{error}</div>}<div className="modal-actions"><button type="button" onClick={onClose}>CANCEL</button><button type="submit" disabled={saving}>{saving ? 'SAVING...' : 'SAVE PRODUCT'}</button></div></form></div>;
}

function ProductForm({ product, brands, categories, token, onSaved, onClose }) {
  const [data, setData] = useState(product ? {
    ...product,
    brand: product.brand?._id || product.brand || '',
    category: product.category?._id || product.category || '',
    subcategory: product.subcategory?._id || product.subcategory || '',
  } : { name:'', description:'', price:'', sku:'', stock:0, brand:'', category:'', subcategory:'', weightOptions:'', published:false, featured:false, newArrival:false, newArrivalUntil:'', bestSeller:false, availability:'in_stock', displayOrder:0 });
  const [existingImages, setExistingImages] = useState((product?.images?.length ? product.images : product?.imageUrl ? [{url:product.imageUrl,key:product.imageKey,position:0}] : []).sort((a,b)=>(a.position||0)-(b.position||0)));
  const [newFiles, setNewFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key,value) => setData((current)=>({...current,[key]:value}));

  function chooseFiles(event) {
    setNewFiles([...event.target.files].slice(0, Math.max(0,12-existingImages.length)));
  }
  function moveImage(index,direction) {
    setExistingImages((current)=>{
      const copy=[...current]; const target=index+direction;
      if(target<0 || target>=copy.length) return copy;
      [copy[index],copy[target]]=[copy[target],copy[index]];
      return copy.map((image,position)=>({...image,position}));
    });
  }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    const body=new FormData();
    Object.entries(data).forEach(([key,value])=>{
      if(['images','_id','createdAt','updatedAt','__v','brandName','categoryName','subcategoryName','imageUrl','imageKey'].includes(key)) return;
      if(key==='newArrivalUntil' && !value) return;
      if(value!==null && value!==undefined && typeof value !== 'object') body.append(key,value);
    });
    body.append('existingImages',JSON.stringify(existingImages.map((image,index)=>({...image,position:index}))));
    newFiles.forEach((file)=>body.append('images',file));
    try { await api(product ? `/api/admin/products/${product._id}` : '/api/admin/products',{method:product?'PUT':'POST',body},token); onSaved(); }
    catch(err){setError(err.message);} finally {setSaving(false);}
  }

  return (
    <div className="modal-backdrop">
      <form className="product-modal" onSubmit={submit}>
        <div className="modal-head">
          <div><span>{product ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</span><h2>{product?.name || 'Add product'}</h2></div>
          <button type="button" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <div className="form-column">
            <label>Product name<input required value={data.name || ''} onChange={(event) => set('name', event.target.value)} /></label>
            <label>Description<textarea rows="5" value={data.description || ''} onChange={(event) => set('description', event.target.value)} /></label>
            <div className="form-grid">
              <label>Price<input required type="number" min="0" step="0.01" value={data.price || ''} onChange={(event) => set('price', event.target.value)} /></label>
              <label>SKU<input value={data.sku || ''} onChange={(event) => set('sku', event.target.value)} /></label>
              <label>Stock<input type="number" min="0" value={data.stock ?? 0} onChange={(event) => set('stock', event.target.value)} /></label>
              <label>Weights<input placeholder="12, 13, 14, 15" value={Array.isArray(data.weightOptions) ? data.weightOptions.join(',') : (data.weightOptions || '')} onChange={(event) => set('weightOptions', event.target.value)} /></label>
              <label>Display order<input type="number" value={data.displayOrder || 0} onChange={(event) => set('displayOrder', event.target.value)} /></label>
              <label>New arrival until<input type="datetime-local" value={data.newArrivalUntil ? String(data.newArrivalUntil).slice(0, 16) : ''} onChange={(event) => set('newArrivalUntil', event.target.value)} /></label>
            </div>
          </div>
          <div className="form-column">
            <div className="form-grid">
              <label>Brand<select value={data.brand || ''} onChange={(event) => set('brand', event.target.value)}><option value="">Select brand</option>{brands.map((brand) => <option key={brand._id} value={brand._id}>{brand.name}</option>)}</select></label>
              <label>Main category<select value={data.category || ''} onChange={(event) => set('category', event.target.value)}><option value="">Select category</option>{categories.filter((category) => !category.parent).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
              <label>Subcategory<select value={data.subcategory || ''} onChange={(event) => set('subcategory', event.target.value)}><option value="">Select subcategory</option>{categories.filter((category) => category.parent).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
              <label>Availability<select value={data.availability || 'in_stock'} onChange={(event) => set('availability', event.target.value)}><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option><option value="preorder">Preorder</option></select></label>
            </div>
            <div className="toggle-grid">
              <label><input type="checkbox" checked={!!data.published} onChange={(event) => set('published', event.target.checked)} /> Published</label>
              <label><input type="checkbox" checked={!!data.featured} onChange={(event) => set('featured', event.target.checked)} /> Featured</label>
              <label><input type="checkbox" checked={!!data.newArrival} onChange={(event) => set('newArrival', event.target.checked)} /> New arrival</label>
              <label><input type="checkbox" checked={!!data.bestSeller} onChange={(event) => set('bestSeller', event.target.checked)} /> Best seller</label>
            </div>
            <label className="upload-box"><Upload /><span>Upload multiple product images</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={chooseFiles} /></label>
            <div className="image-previews">
              {existingImages.map((image, index) => <div key={image.key || image.url}><img src={image.url} alt="Product preview" /><button type="button" onClick={() => setExistingImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button><button type="button" className="move-left" onClick={() => moveImage(index, -1)}>‹</button><button type="button" className="move-right" onClick={() => moveImage(index, 1)}>›</button>{index === 0 && <span>COVER</span>}</div>)}
              {newFiles.map((file, index) => <div key={`${file.name}-${index}`}><img src={URL.createObjectURL(file)} alt="New product preview" /><button type="button" onClick={() => setNewFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>{existingImages.length === 0 && index === 0 && <span>COVER</span>}</div>)}
            </div>
          </div>
        </div>
        {error && <div className="form-error modal-error">{error}</div>}
        <div className="modal-actions"><button type="button" onClick={onClose}>CANCEL</button><button type="submit" disabled={saving}>{saving ? 'SAVING...' : 'SAVE PRODUCT'}</button></div>
      </form>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('bowlerx-admin-token') || '');
  const [active, setActive] = useState('Dashboard Overview');
  const [stats, setStats] = useState({});
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('bowlerx-browser-notifications') === 'enabled');
  const [visitorNotice, setVisitorNotice] = useState('');
  const [systemStatus, setSystemStatus] = useState({ mongoDb: false, r2: false });
  const visitorBaseline = useRef(null);

  async function load() {
    if (!token) return;
    try {
      const [statsData, productsData, brandsData, categoriesData, ordersData, customersData] = await Promise.all([
        api('/api/admin/dashboard', {}, token), api('/api/admin/products', {}, token), api('/api/admin/brands', {}, token),
        api('/api/admin/categories', {}, token), api('/api/admin/orders', {}, token).catch(() => []), api('/api/admin/customers', {}, token).catch(() => []),
      ]);
      setStats(statsData); setProducts(productsData); setBrands(brandsData); setCategories(categoriesData); setOrders(ordersData); setCustomers(customersData);
    } catch { sessionStorage.removeItem('bowlerx-admin-token'); setToken(''); }
  }
  useEffect(() => { load(); }, [token]);
  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    let requestPending = false;
    const refreshOrders = async () => {
      if (requestPending) return;
      requestPending = true;
      try {
        const latestOrders = await api('/api/admin/orders', {}, token);
        if (active) {
          setOrders(latestOrders);
          setStats((current) => ({ ...current, orderCount: latestOrders.length }));
          setOrdersError('');
        }
      } catch (error) {
        if (active) setOrdersError(error.message);
      } finally {
        requestPending = false;
      }
    };
    const interval = window.setInterval(refreshOrders, 8000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [token]);
  function login(nextToken) { sessionStorage.setItem('bowlerx-admin-token', nextToken); setToken(nextToken); }
  function logout() { sessionStorage.removeItem('bowlerx-admin-token'); setToken(''); }

  useEffect(() => {
    fetch(apiUrl('/api/health')).then((response) => response.ok ? response.json() : null).then((data) => {
      if (data) setSystemStatus({ mongoDb: data.mongoDb === true, r2: data.r2 === true });
    }).catch(() => setSystemStatus({ mongoDb: false, r2: false }));
  }, [token]);

  useEffect(() => {
    document.body.classList.toggle('admin-menu-open', menuOpen);
    return () => document.body.classList.remove('admin-menu-open');
  }, [menuOpen]);

  if (!token) return <Login onLogin={login} />;

  const filtered = products.filter((product) => {
    const matchesSearch = !search || product.name.toLower?.().includes(search.toLowerCase());
    const categoryName = product.categoryName || product.category?.name || '';
    const subcategoryName = product.subcategoryName || product.subcategory?.name || '';
    const matchesCategory = active !== 'Bowling Balls' || categoryName === 'Bowling Balls';
    const matchesShoes = active !== 'Bowling Shoes' || /shoe/i.test(subcategoryName) || /shoe/i.test(categoryName);
    const matchesBags = active !== 'Bowling Bags' || /bag/i.test(subcategoryName) || /bag/i.test(categoryName);
    const matchesAccessories = active !== 'Accessories' || categoryName === 'Accessories' || /shoe|bag/i.test(subcategoryName);
    const matchesNew = active !== 'New Arrivals' || product.newArrival;
    const matchesFilter = filter === 'all' || (filter === 'published' ? product.published : !product.published);
    const matchesBrand = brandFilter === 'all' || product.brandName === brandFilter;
    const matchesCategoryFilter = categoryFilter === 'all' || product.categoryName === categoryFilter || product.category?._id === categoryFilter;
    const matchesAvailability = availabilityFilter === 'all' || product.availability === availabilityFilter;
    const matchesInventory = active !== 'Inventory' || product.availability === 'out_of_stock' || product.availability === 'low_stock' || Number(product.stock || 0) <= 5;
    return matchesSearch && matchesCategory && matchesShoes && matchesBags && matchesAccessories && matchesNew && matchesFilter && matchesBrand && matchesCategoryFilter && matchesAvailability && matchesInventory;
  });

  async function deleteProduct(product) {
    if (!window.confirm(`Delete “${product.name}”? This will also remove its R2 images.`)) return;
    await api(`/api/admin/products/${product._id}`, { method: 'DELETE' }, token); await load();
  }

  async function toggleStatus(product, key) {
    await api(`/api/admin/products/${product._id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: !product[key] }) }, token); await load();
  }

  const mobileBarTitle = active === 'Dashboard Overview' ? 'DASHBOARD' : active.toUpperCase();
  const sidebarStatus = systemStatus.mongoDb ? 'Database connected' : 'Database disconnected';

  return (
    <div className={`admin ${menuOpen ? 'menu-open' : ''}`}>
      <div className="mobile-admin-bar"><button className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>☰</button><div><span>BOWLERSX</span><b>/</b><strong>{mobileBarTitle}</strong></div><span className="mobile-owner-label">Store owner</span><button className="mobile-signout" type="button" onClick={logout}>Sign out <span>↗</span></button></div>
      {menuOpen && <button className="mobile-menu-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <div className="wp-admin-bar"><button onClick={() => { location.hash = ''; }}>◉ BowlerX</button><button onClick={() => { location.hash = ''; }}>View Store</button><button className="wp-user">Howdy, Admin ▾</button></div>
      <aside>
        <button className="mobile-menu-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>×</button>
        <button className="brand admin-brand" onClick={() => { location.hash = ''; }}><SiteLogo className="sidebar-logo" /><strong>BOWLERX<small>ADMIN</small></strong></button>
        <nav>{navigationGroups.map((group) => <div className="nav-group" key={group.title}><span className="nav-group-label">{group.title}</span>{group.sections.map(([name, Icon]) => <button key={name} className={active === name ? 'active' : ''} onClick={() => { setActive(name); setMenuOpen(false); }}><Icon /> <span>{name}</span>{name === 'Orders' && stats.orderCount > 0 && <b className="mobile-nav-badge">{stats.orderCount}</b>}</button>)}</div>)}</nav>
        <div className="sidebar-account-label">ACCOUNT</div>
        <button className="logout-button" onClick={logout}><LogOut /> <span>Sign out</span></button>
        <div className="sidebar-footer"><div className={systemStatus.mongoDb ? 'connected' : 'disconnected'}><i/><span>{sidebarStatus}</span></div><button type="button" onClick={() => { location.hash = ''; setMenuOpen(false); }}>View storefront <b>↗</b></button></div>
      </aside>
      <section className="admin-main">
        <header><div><span>ADMIN PANEL</span><h1>{active}</h1></div><div className="admin-actions"><button className="wp-add-button" onClick={() => { setEditing(null); setFormOpen(true); }}>Add New</button><div className="avatar">AD</div></div></header>

  {active === 'Dashboard Overview' && <AnalyticsPanel stats={stats} systemStatus={systemStatus} />}

  {['All Products','Bowling Balls','Bowling Shoes','Bowling Bags','Accessories','New Arrivals','Inventory'].includes(active) && <><div className="table-toolbar"><div className="table-search"><Search /><input placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} /></div>{active === 'All Products' && <><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All status</option><option value="published">Published</option><option value="draft">Draft</option></select><select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}><option value="all">All brands</option>{brands.map((brand) => <option key={brand._id} value={brand.name}>{brand.name}</option>)}</select><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category._id} value={category.name}>{category.name}</option>)}</select><select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}><option value="all">All availability</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option><option value="preorder">Preorder</option></select></>}
  <button className="primary-button" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus /> ADD PRODUCT</button></div><div className="admin-table"><table><thead><tr><th>Product</th><th>Brand</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((product) => <tr key={product._id}><td><div className="product-table-name">{product.imageUrl || product.images?.[0]?.url ? <img src={product.imageUrl || product.images[0].url} alt="" /> : <div className="image-fallback" />}<div><strong>{product.name}</strong><small>{product.sku || 'No SKU'}</small></div></div></td><td>{product.brandName || '—'}</td><td>{product.subcategoryName || product.categoryName || '—'}</td><td>${Number(product.price).toFixed(2)}</td><td>{product.stock ?? 0}</td><td><button className={`status-pill ${product.published ? 'published' : ''}`} onClick={() => toggleStatus(product, 'published')}>{product.published ? 'Published' : 'Draft'}</button></td><td><div className="row-actions"><button title="Edit" onClick={() => { setEditing(product); setFormOpen(true); }}><Edit3 /></button><button title="Delete" onClick={() => deleteProduct(product)}><Trash2 /></button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state">No products match this view.</div>}</div></>}

  {active === 'Brands' && <ManagementList title="Brands" items={brands} token={token} type="brands" onRefresh={load} />}
  {active === 'Categories' && <ManagementList title="Categories" items={categories} token={token} type="categories" onRefresh={load} />}
  {active === 'Orders' && <>{ordersError && <p className="order-chat-error" role="alert">Could not refresh orders: {ordersError}</p>}<div className="admin-table"><table><thead><tr><th>Order</th><th>Customer / delivery</th><th>Total / payment</th><th>Status</th><th>Conversation</th><th>Date</th></tr></thead><tbody>{orders.map((order) => <tr key={order._id}><td>#{order._id.slice(-6)}</td><td><strong>{order.customer}</strong><small>{order.email}</small>{order.phone && <small>{order.phone}</small>}<small>{[order.shippingAddress?.address, order.shippingAddress?.apartment, order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.zip, order.shippingAddress?.country].filter(Boolean).join(', ')}</small></td><td>${Number(order.total).toFixed(2)}<small>Contact customer to arrange payment</small></td><td><select value={order.status} onChange={async (e) => { await api(`/api/admin/orders/${order._id}/status`, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ status:e.target.value }) }, token); await load(); }}><option>Processing</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option></select></td><td><button className="order-chat-action" type="button" onClick={() => setSelectedOrder(order)}><MessageCircle />{order.chatMessageCount ? `Chat (${order.chatMessageCount})` : 'Open chat'}</button>{order.latestMessage && <small className="order-list-message">{order.latestMessage.sender === 'customer' ? 'Customer' : 'Admin'}: {order.latestMessage.text}</small>}</td><td>{new Date(order.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>{orders.length === 0 && <div className="empty-state">No orders yet</div>}</div></>}
  {active === 'Customers' && <div className="admin-table"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer._id}><td>{customer.name}</td><td>{customer.email}</td><td>{customer.phone || '—'}</td><td>{customer.active ? 'Active' : 'Inactive'}</td></tr>)}</tbody></table>{customers.length === 0 && <div className="empty-state">No customer records yet</div>}</div>}
  {active === 'Homepage Management' && <HomepageManager active={active} token={token} />}
  {active === 'Website Settings' && <WebsiteSettings token={token} />}
      </section>
      {formOpen && <ProductForm product={editing} brands={brands} categories={categories} token={token} onClose={() => setFormOpen(false)} onSaved={async () => { setFormOpen(false); await load(); }} />}
      {selectedOrder && <div className="modal-backdrop order-chat-backdrop" role="presentation" onClick={() => setSelectedOrder(null)}><div role="dialog" aria-modal="true" aria-label="Order conversation" onClick={(event) => event.stopPropagation()}><OrderChat order={orders.find((order) => order._id === selectedOrder._id) || selectedOrder} adminToken={token} onClose={() => setSelectedOrder(null)} /></div></div>}
    </div>
  );
}

function DollarIcon(){ return <span>$</span>; }

function ManagementList({ title, items, token, type, onRefresh, categories }) {
  const [open,setOpen]=useState(false); const [editing,setEditing]=useState(null); const [file,setFile]=useState(null);
  const [form,setForm]=useState({name:'',description:'',active:true,sortOrder:0,parent:''});
  function openCreate(){setEditing(null);setFile(null);setForm({name:'',description:'',active:true,sortOrder:0,parent:''});setOpen(true);}
  function openEdit(item){setEditing(item);setFile(null);setForm({name:item.name||'',description:item.description||'',active:item.active!==false,sortOrder:item.sortOrder||0,parent:item.parent?._id||item.parent||''});setOpen(true);}
  async function save(event){
    event.preventDefault();
    const body=new FormData();
    Object.entries(form).forEach(([key,value])=>{if(value!==''&&value!==null)body.append(key,value);});
    if(file)body.append('image',file);
    await api(`/api/admin/${type}${editing?`/${editing._id}`:''}`,{method:editing?'PUT':'POST',body},token);
    setOpen(false);
    await onRefresh();
  }
  async function remove(item){if(window.confirm(`Delete ${item.name}? Existing product assignments will remain on the product record.`)){await api(`/api/admin/${type}/${item._id}`,{method:'DELETE'},token);await onRefresh();}}
  return <><div className="table-toolbar"><h2>{title}</h2><button className="primary-button" onClick={openCreate}><Plus/> ADD {title==='Brands'?'BRAND':'CATEGORY'}</button></div><div className="admin-table"><table><thead><tr><th>{title==='Brands'?'Brand':'Category'}</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead><tbody>{items.map((item)=><tr key={item._id}><td><div className="product-table-name">{(item.logoUrl||item.imageUrl)&&<img src={item.logoUrl||item.imageUrl} alt=""/>}<strong>{item.name}</strong></div></td><td><button className={`status-pill ${item.active?'published':''}`} onClick={async()=>{await api(`/api/admin/${type}/${item._id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({active:!item.active})},token);await onRefresh();}}>{item.active?'Active':'Inactive'}</button></td><td>{item.sortOrder||0}</td><td><div className="row-actions"><button title="Edit" onClick={()=>openEdit(item)}><Edit3/></button><button title="Delete" onClick={()=>remove(item)}><Trash2/></button></div></td></tr>)}</tbody></table>{items.length===0&&<div className="empty-state">No {title.toLowerCase()} created yet</div>}</div>{open&&<div className="modal-backdrop"><form className="simple-modal" onSubmit={save}><div className="modal-head"><h2>{editing?'Edit':'Add'} {title==='Brands'?'brand':'category'}</h2><button type="button" onClick={()=>setOpen(false)}><X/></button></div><label>Name<input required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></label><label>Description<textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label>{type==='categories'&&<label>Parent category<select value={form.parent} onChange={(e)=>setForm({...form,parent:e.target.value})}><option value="">Top level</option>{items.filter((item)=>item._id!==editing?._id).map((item)=><option key={item._id} value={item._id}>{item.name}</option>)}</select></label>}<label>Sort order<input type="number" value={form.sortOrder} onChange={(e)=>setForm({...form,sortOrder:e.target.value})}/></label><label className="upload-box"><Upload/><span>Upload {title==='Brands'?'logo':'image'} (optional)</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e)=>setFile(e.target.files[0]||null)}/></label><div className="toggle-grid"><label><input type="checkbox" checked={form.active} onChange={(e)=>setForm({...form,active:e.target.checked})}/> Active</label></div><div className="modal-actions"><button type="button" onClick={()=>setOpen(false)}>CANCEL</button><button type="submit">SAVE</button></div></form></div>}</>;
}

function LegacyHomepageManager({ active, token }) {
  const defaults = ['hero','categories','newArrivals','featured','brands','accessories','bestSellers','promotions'].map((key,index)=>({ key,title:'',subtitle:'',enabled:true,sortOrder:index,buttonText:'',buttonUrl:'' }));
  const [sections, setSections] = useState(defaults);
  useEffect(()=>{fetch(apiUrl('/api/admin/homepage'),{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():null).then(data=>{if(data?.sections?.length)setSections(data.sections);}).catch(()=>{});},[token]);
  async function save(){await api('/api/admin/homepage',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({sections})},token);}
  return <><div className="homepage-manager"><div className="section-list">{sections.map((section,index)=><article key={section.key}><div className="drag-order">{index+1}</div><div className="homepage-fields"><strong>{section.key}</strong><input placeholder="Section title" value={section.title} onChange={(e)=>setSections((current)=>current.map((item)=>item.key===section.key?{...item,title:e.target.value}:item))}/><input placeholder="Button text" value={section.buttonText} onChange={(e)=>setSections((current)=>current.map((item)=>item.key===section.key?{...item,buttonText:e.target.value}:item))}/><input placeholder="Button URL" value={section.buttonUrl} onChange={(e)=>setSections((current)=>current.map((item)=>item.key===section.key?{...item,buttonUrl:e.target.value}:item))}/></div><label className="switch"><input type="checkbox" checked={section.enabled} onChange={(e)=>setSections((current)=>current.map((item)=>item.key===section.key?{...item,enabled:e.target.checked}:item))}/><span /></label></article>)}</div><button className="primary-button" onClick={save}>SAVE HOMEPAGE</button></div></>;
}

function HomepageManager({ active, token }) {
  const defaults=['hero','categories','newArrivals','featured','bowlingShoes','bowlingBags','brands','accessories','bestSellers','promotions'].map((key,index)=>({key,title:'',subtitle:'',enabled:true,sortOrder:index,buttonText:'',buttonUrl:'',imageUrl:'',imageKey:''}));
  const [sections,setSections]=useState(defaults); const [files,setFiles]=useState({}); const [saved,setSaved]=useState(false);
  useEffect(()=>{fetch(apiUrl('/api/admin/homepage'),{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():null).then(data=>{if(data?.sections?.length)setSections(data.sections.sort((a,b)=>a.sortOrder-b.sortOrder));}).catch(()=>{});},[token]);
  function update(key,field,value){setSections((current)=>current.map((item)=>item.key===key?{...item,[field]:value}:item));}
  function move(index,direction){setSections((current)=>{const copy=[...current];const target=index+direction;if(target<0||target>=copy.length)return copy;[copy[index],copy[target]]=[copy[target],copy[index]];return copy.map((item,position)=>({...item,sortOrder:position}));});}
  async function save(){const body=new FormData();body.append('sections',JSON.stringify(sections));Object.entries(files).forEach(([key,file])=>body.append(key,file));await api('/api/admin/homepage',{method:'PUT',body},token);setSaved(true);setTimeout(()=>setSaved(false),2000);}
  return <div className="homepage-manager"><div className="section-list">{sections.map((section,index)=><article key={section.key}><div className="homepage-order"><button type="button" onClick={()=>move(index,-1)}>‹</button><strong>{index+1}</strong><button type="button" onClick={()=>move(index,1)}>›</button></div><div className="homepage-fields"><strong>{section.key}</strong><input placeholder="Section title" value={section.title||''} onChange={(e)=>update(section.key,'title',e.target.value)}/><input placeholder="Subtitle" value={section.subtitle||''} onChange={(e)=>update(section.key,'subtitle',e.target.value)}/><input placeholder="Button text" value={section.buttonText||''} onChange={(e)=>update(section.key,'buttonText',e.target.value)}/><input placeholder="Button URL or hash" value={section.buttonUrl||''} onChange={(e)=>update(section.key,'buttonUrl',e.target.value)}/>{section.key==='hero'&&<label className="homepage-upload">Banner image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>setFiles((current)=>({...current,[section.key]:e.target.files[0]}))}/></label>}</div><label className="switch"><input type="checkbox" checked={section.enabled} onChange={(e)=>update(section.key,'enabled',e.target.checked)}/><span/></label></article>)}</div><button className="primary-button" onClick={save}>{saved?'SAVED':'SAVE HOMEPAGE'}</button></div>;
}

function WebsiteSettings({ token }) {
  const [form,setForm]=useState({storeName:'BOWLERX',phone:'',email:'',address:'',currency:'USD',announcement:'',footerText:'',facebookUrl:'',instagramUrl:'',youtubeUrl:''});
  const [saved,setSaved]=useState(false);
  useEffect(()=>{fetch(apiUrl('/api/admin/settings'),{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():{}).then(data=>setForm((current)=>({...current,...data}))).catch(()=>{});},[token]);
  async function save(event){event.preventDefault();await api('/api/admin/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)},token);setSaved(true);setTimeout(()=>setSaved(false),2000);}
  const fields=[['storeName','Store name'],['phone','Phone'],['email','Email'],['address','Contact address'],['currency','Currency'],['announcement','Announcement'],['footerText','Footer text'],['facebookUrl','Facebook URL'],['instagramUrl','Instagram URL'],['youtubeUrl','YouTube URL']];
  return <form className="settings-panel" onSubmit={save}>{fields.map(([key,label])=><label key={key}>{label}{key==='announcement'||key==='footerText'||key==='address'?<textarea rows="3" value={form[key]||''} onChange={(e)=>setForm({...form,[key]:e.target.value})}/>:<input type={key==='phone'?'tel':key==='email'?'email':'text'} value={form[key]||''} onChange={(e)=>setForm({...form,[key]:e.target.value})}/>}</label>)}<button className="primary-button" type="submit">{saved?'SAVED':'SAVE WEBSITE SETTINGS'}</button></form>;
}

function AnalyticsPanel({ stats, systemStatus }) {
  const sales = stats.sales || [];
  const maxRevenue = Math.max(1, ...sales.map((item) => Number(item.revenue || 0)));
  const dayRows = sales.length ? sales : [];
  const traffic = stats.trafficByDay || [];
  const maxVisits = Math.max(1, ...traffic.map((item) => Number(item.visits || 0)));
  const statusCounts = Object.fromEntries((stats.orderStatusCounts || []).map((item) => [String(item._id || '').toLowerCase(), Number(item.count || 0)]));
  const mobileCards = [
    ['Visitors today', stats.visitsToday || 0],
    ['Visitors this week', stats.visitsSevenDays || 0],
    ['Visitors this month', stats.visitsMonth || 0],
    ['Total products', stats.productCount || 0],
    ['Published', stats.publishedCount || 0],
    ['Draft', Math.max(0, (stats.productCount || 0) - (stats.publishedCount || 0))],
    ['Order requests', stats.orderCount || 0],
    ['Pending requests', statusCounts.processing || 0],
    ['Confirmed', statusCounts.confirmed || 0],
    ['Delivered', statusCounts.delivered || 0],
  ];
  return <div className="analytics-panel">
    <div className="mobile-overview-heading"><span>STORE CONTROL / DASHBOARD</span><h2>STORE OVERVIEW</h2><p>A live view of your catalogue and customer requests.</p></div>
    <div className="mobile-status-strip"><span className="status-ok">Website online</span><span className={systemStatus.mongoDb ? 'status-ok' : 'status-down'}>MongoDB {systemStatus.mongoDb ? 'connected' : 'disconnected'}</span><span className={systemStatus.r2 ? 'status-ok' : 'status-down'}>Images: {systemStatus.r2 ? 'Cloudflare R2 / persistent' : 'storage unavailable'}</span></div>
    <div className="mobile-overview-grid">{mobileCards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong><em>live records</em></article>)}</div>
    <div className="desktop-analytics-summary analytics-summary">
      <article><span>Revenue</span><strong>${Number(stats.revenue || 0).toFixed(2)}</strong></article>
      <article><span>Orders</span><strong>{stats.orderCount || 0}</strong></article>
      <article><span>Customers</span><strong>{stats.customerCount || 0}</strong></article>
      <article><span>Low stock</span><strong>{stats.lowStockCount || 0}</strong></article>
      <article><span>Visitors today</span><strong>{stats.visitsToday || 0}</strong></article>
      <article><span>Unique visitors / 7 days</span><strong>{stats.uniqueVisitorsSevenDays || 0}</strong></article>
    </div>
    <div className="desktop-analytics-grid analytics-grid">
      <article className="analytics-chart"><div className="card-head"><div><span>LAST 7 DAYS</span><h3>Sales revenue</h3></div></div>{dayRows.length ? <div className="analytics-bars">{dayRows.map((item) => <div key={item._id}><span>${Number(item.revenue || 0).toFixed(0)}</span><i style={{height:`${Math.max(4,(Number(item.revenue||0)/maxRevenue)*180)}px`}}/><small>{item._id}</small></div>)}</div> : <div className="empty-state">No sales recorded in the last 7 days</div>}</article>
      <article className="analytics-chart"><div className="card-head"><div><span>CATALOG</span><h3>Inventory overview</h3></div></div><div className="overview-bars"><div><strong>{stats.publishedCount||0}</strong><span>Published</span></div><div><strong>{Math.max(0,(stats.productCount||0)-(stats.publishedCount||0))}</strong><span>Draft</span></div><div><strong>{stats.brandCount||0}</strong><span>Brands</span></div><div><strong>{stats.categoryCount||0}</strong><span>Categories</span></div></div></article>
      <article className="analytics-chart"><div className="card-head"><div><span>LAST 7 DAYS</span><h3>Website visitors</h3></div></div>{traffic.length ? <div className="analytics-bars visitor-bars">{traffic.map((item) => <div key={item._id}><span>{item.visits} visits · {item.uniqueVisitors} unique</span><i style={{height:`${Math.max(4,(Number(item.visits||0)/maxVisits)*180)}px`}}/><small>{item._id}</small></div>)}</div> : <div className="empty-state">No visitor activity recorded</div>}</article>
    </div>
  </div>;
}
