import React, { useMemo, useState } from 'react';
import { ChevronRight, ShoppingCart, Trash2, Truck, ShieldCheck, CreditCard, Lock } from 'lucide-react';
import SiteLogo from './SiteLogo.jsx';
import { apiUrl } from '../api.js';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export function CheckoutSteps({ current }) {
  const steps = ['Shopping Cart', 'Checkout Details', 'Order Complete'];
  return <div className="checkout-steps">{steps.map((step, index) => <React.Fragment key={step}><div className={index <= current ? 'active' : ''}><b>{index + 1}</b><span>{step}</span></div>{index < 2 && <ChevronRight />}</React.Fragment>)}</div>;
}

export default function Checkout({ cartItems, setCartItems, setCart }) {
  const [stage, setStage] = useState(cartItems.length ? 'cart' : 'cart');
  const [complete, setComplete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email:'', firstName:'', lastName:'', company:'', address:'', apartment:'', city:'', state:'', zip:'', country:'United States', phone:'', payment:'card', saveAddress:false,
  });

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0), [cartItems]);
  const shipping = subtotal >= 150 || subtotal === 0 ? 0 : 12.95;
  const tax = subtotal * 0;
  const total = subtotal + shipping + tax;

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function removeItem(index) {
    setCartItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
    setCart((count) => Math.max(0, count - Number(cartItems[index]?.quantity || 1)));
  }

  async function submitOrder(event) {
    event.preventEvent?.();
    event.preventDefault();
    setSubmitting(true); setError('');
    const customerName = `${form.firstName} ${form.lastName}`.trim();
    try {
      const response = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerName,
          email: form.email,
          phone: form.phone,
          shippingAddress: { firstName:form.firstName, lastName:form.lastName, company:form.company, address:form.address, apartment:form.apartment, city:form.city, state:form.state, zip:form.zip, country:form.country },
          paymentMethod: form.payment,
          items: cartItems.map((item) => ({ product: item.productId, name: item.name, quantity:item.quantity, price:item.price, weight:item.weight || '' })),
          total,
        }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Unable to place order');
      const order = await response.json();
      setComplete(order);
      setCartItems([]); setCart(0);
      setStage('complete');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  if (stage === 'complete' && complete) {
    return <main className="checkout-page"><div className="checkout-brand"><button onClick={() => { location.hash = ''; }}><SiteLogo className="checkout-logo" /></button></div><CheckoutSteps current={2}/><div className="order-complete"><div className="complete-icon">✓</div><span>THANK YOU</span><h1>Order received</h1><p>Your order <b>#{String(complete._id).slice(-8).toUpperCase()}</b> has been placed.</p><p className="complete-email">A confirmation will be sent to <b>{form.email}</b>.</p><button onClick={() => { location.hash = ''; }}>CONTINUE SHOPPING</button></div></main>;
  }

  if (stage === 'details') {
    return <main className="checkout-page"><div className="checkout-brand"><button onClick={() => { location.hash = ''; }}><SiteLogo className="checkout-logo" /></button></div><CheckoutSteps current={1}/><form className="checkout-layout" onSubmit={submitOrder}>
      <section className="checkout-form">
        {error && <div className="checkout-error">{error}</div>}
        <div className="checkout-section"><div className="checkout-heading"><span>1</span><h2>Contact information</h2></div><label>Email address<input required type="email" value={form.email} onChange={(e)=>update('email',e.target.value)} placeholder="you@example.com" /></label><label><input type="checkbox" checked={form.saveAddress} onChange={(e)=>update('saveAddress',e.target.checked)} /> Keep me updated about my order</label></div>
        <div className="checkout-section"><div className="checkout-heading"><span>2</span><h2>Shipping address</h2></div><div className="checkout-grid"><label>First name<input required value={form.firstName} onChange={(e)=>update('firstName',e.target.value)} /></label><label>Last name<input required value={form.lastName} onChange={(e)=>update('lastName',e.target.value)} /></label></div><label>Company (optional)<input value={form.company} onChange={(e)=>update('company',e.target.value)} /></label><label>Street address<input required value={form.address} onChange={(e)=>update('address',e.target.value)} placeholder="Street address" /></label><label>Apartment, suite, etc. (optional)<input value={form.apartment} onChange={(e)=>update('apartment',e.target.value)} /></label><div className="checkout-grid three"><label>City<input required value={form.city} onChange={(e)=>update('city',e.target.value)} /></label><label>State<input required value={form.state} onChange={(e)=>update('state',e.target.value)} /></label><label>ZIP code<input required value={form.zip} onChange={(e)=>update('zip',e.target.value)} /></label></div><div className="checkout-grid"><label>Country<select value={form.country} onChange={(e)=>update('country',e.target.value)}><option>United States</option><option>Canada</option></select></label><label>Phone number<input required type="tel" value={form.phone} onChange={(e)=>update('phone',e.target.value)} /></label></div></div>
        <div className="checkout-section"><div className="checkout-heading"><span>3</span><h2>Payment</h2></div><div className="payment-options"><label className={form.payment==='card'?'selected':''}><input type="radio" name="payment" value="card" checked={form.payment==='card'} onChange={(e)=>update('payment',e.target.value)} /><CreditCard/><span><b>Credit or debit card</b><small>Secure card payment</small></span></label><label className={form.payment==='paypal'?'selected':''}><input type="radio" name="payment" value="paypal" checked={form.payment==='paypal'} onChange={(e)=>update('payment',e.target.value)} /><span className="paypal-mark">PayPal</span></label></div>{form.payment==='card'&&<div className="card-fields"><label>Card number<input inputMode="numeric" placeholder="1234 5678 9012 3456" /></label><div className="checkout-grid"><label>Expiration<input placeholder="MM / YY" /></label><label>Security code<input inputMode="numeric" placeholder="CVC" /></label></div></div>}</div>
        <button className="place-order-button" type="submit" disabled={submitting || !cartItems.length}>{submitting?'PLACING ORDER...':'PLACE ORDER'} <Lock /></button>
      </section>
      <aside className="checkout-summary"><h2>Order summary</h2>{cartItems.map((item,index)=><div className="summary-item" key={`${item.productId}-${index}`}><div className="summary-thumb"><ShoppingCart /></div><div><b>{item.name}</b>{item.weight&&<small>{item.weight} lb</small>}<small>Qty {item.quantity}</small></div><strong>{money(item.price*item.quantity)}</strong></div>)}<div className="summary-row"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="summary-row"><span>Shipping</span><b>{shipping ? money(shipping) : 'FREE'}</b></div><div className="summary-row total"><span>Total</span><b>{money(total)}</b></div><div className="summary-trust"><span><Truck/> Free shipping</span><span><ShieldCheck/> Secure checkout</span></div></aside>
    </form></main>;
  }

  return <main className="checkout-page"><div className="checkout-brand"><button onClick={() => { location.hash = ''; }}><SiteLogo className="checkout-logo" /></button></div><CheckoutSteps current={0}/><div className="checkout-layout cart-layout"><section className="cart-items"><div className="cart-title"><h1>Shopping Cart</h1><span>{cartItems.length} {cartItems.length===1?'item':'items'}</span></div>{cartItems.length ? cartItems.map((item,index)=><article className="cart-item" key={`${item.productId}-${index}`}><div className="cart-thumb"><ShoppingCart /></div><div className="cart-item-info"><h2>{item.name}</h2>{item.weight&&<p>Weight: {item.weight} lb</p>}<p>Quantity: {item.quantity}</p><button onClick={()=>removeItem(index)}><Trash2/> Remove</button></div><strong>{money(item.price*item.quantity)}</strong></article>) : <div className="empty-cart"><ShoppingCart/><h2>Your cart is currently empty</h2><button onClick={()=>{location.hash='';}}>RETURN TO SHOP</button></div>}</section><aside className="checkout-summary"><h2>Order summary</h2><div className="summary-row"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="summary-row"><span>Shipping</span><b>{shipping ? money(shipping) : 'FREE'}</b></div><div className="summary-row total"><span>Estimated total</span><b>{money(total)}</b></div><button className="place-order-button" disabled={!cartItems.length} onClick={()=>setStage('details')}>PROCEED TO CHECKOUT <ChevronRight /></button><div className="summary-trust"><span><Truck/> Free shipping $150+</span><span><ShieldCheck/> Secure checkout</span></div></aside></div></main>;
}
