import React, { useMemo, useState } from 'react';
import { ChevronRight, ShoppingCart, Trash2, Truck, ShieldCheck } from 'lucide-react';
import SiteLogo from './SiteLogo.jsx';
import OrderChat from './OrderChat.jsx';
import { apiUrl } from '../api.js';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const orderChatStorageKey = 'bowlerx-active-order-chat';

function restoreOrderChat() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(orderChatStorageKey) || 'null');
    return saved?.order?._id ? saved : null;
  } catch {
    return null;
  }
}

export function CheckoutSteps({ current }) {
  const steps = ['Shopping Cart', 'Checkout Details', 'Order Complete'];
  return <div className="checkout-steps">{steps.map((step, index) => <React.Fragment key={step}><div className={index <= current ? 'active' : ''}><b>{index + 1}</b><span>{step}</span></div>{index < 2 && <ChevronRight />}</React.Fragment>)}</div>;
}

export default function Checkout({ cartItems, setCartItems, setCart, directItems, setDirectItems }) {
  const isDirectCheckout = directItems !== null;
  const checkoutItems = isDirectCheckout ? directItems : cartItems;
  const [complete, setComplete] = useState(restoreOrderChat);
  const [stage, setStage] = useState(() => restoreOrderChat() ? 'complete' : isDirectCheckout ? 'details' : 'cart');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [chatPersistenceWarning, setChatPersistenceWarning] = useState('');
  const [form, setForm] = useState({
    email:'', firstName:'', lastName:'', company:'', address:'', apartment:'', city:'', state:'', zip:'', country:'United States', phone:'', saveAddress:false,
  });

  const subtotal = useMemo(() => checkoutItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0), [checkoutItems]);
  const shippingReady = Boolean(form.country && form.address && form.city && form.state && form.zip);
  const shippingCost = !checkoutItems.length ? 0 : (form.country === 'United States' ? 0 : 12.95);
  const shipping = shippingReady ? shippingCost : 0;
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
          paymentMethod: 'manual',
          items: checkoutItems.map((item) => ({ product: item.productId, name: item.name, quantity:item.quantity, price:item.price, weight:item.weight || '' })),
          total,
        }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Unable to place order');
      const { chatToken = '', ...order } = await response.json();
      const orderChat = { order, conversationToken: chatToken };
      try {
        sessionStorage.setItem(orderChatStorageKey, JSON.stringify(orderChat));
      } catch {
        setChatPersistenceWarning('This conversation may not be available if you leave or refresh this page.');
      }
      setComplete(orderChat);
      if (isDirectCheckout) setDirectItems(null);
      else { setCartItems([]); setCart(0); }
      setStage('complete');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  if (stage === 'complete' && complete) {
    const orderNumber = `#${String(complete.order._id).slice(-8).toUpperCase()}`;
    const leaveOrderChat = () => {
      sessionStorage.removeItem(orderChatStorageKey);
      location.hash = '';
    };
    return <main className="checkout-page checkout-chat-page"><div className="checkout-brand"><button onClick={leaveOrderChat}><SiteLogo className="checkout-logo" /></button></div><CheckoutSteps current={2}/><div className="order-chat-screen"><div className="order-chat-screen-head"><span className="order-chat-badge">ORDER PLACED</span><h1>Order chat</h1><p>Your order <b>{orderNumber}</b> was placed successfully. You can see your order below and chat with BowlersX Support — our team will reply here and you can reply anytime.</p></div>{chatPersistenceWarning && <p className="order-chat-unavailable">{chatPersistenceWarning}</p>}{complete.conversationToken ? <OrderChat order={complete.order} conversationToken={complete.conversationToken} /> : <div className="order-chat-fallback"><p className="order-chat-unavailable">Your order is confirmed, but a secure chat session could not be started. Contact support with order number {orderNumber}.</p></div>}<button className="order-chat-return" onClick={leaveOrderChat}>CONTINUE SHOPPING</button></div></main>;
  }
  const shippingLabel = !checkoutItems.length ? 'FREE' : (shippingReady ? (shippingCost ? money(shippingCost) : 'FREE') : 'Calculated after shipping address');
  const orderSummary = (
    <aside className="checkout-summary"><h2>Order summary</h2>{checkoutItems.map((item,index)=><div className="summary-item" key={`${item.productId}-${index}`}><div className="summary-thumb"><ShoppingCart /></div><div><b>{item.name}</b>{item.weight&&<small>{item.weight} lb</small>}<small>Qty {item.quantity}</small></div><strong>{money(item.price*item.quantity)}</strong></div>)}<div className="summary-row"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="summary-row"><span>Shipping</span><b>{shippingLabel}</b></div>{!shippingReady && checkoutItems.length > 0 && <p className="summary-shipping-note">Free shipping in USA. Shipping fee applies to other countries after you complete the shipping address.</p>}<div className="summary-row total"><span>Total</span><b>{money(total)}</b></div><div className="summary-trust"><span><Truck/> {shippingReady && form.country === 'United States' ? 'Free shipping in USA' : 'Shipping calculated by country'}</span><span><ShieldCheck/> Secure checkout</span></div></aside>
  );

  if (stage === 'details') {
    return <main className="checkout-page"><div className="checkout-brand"><button onClick={() => { location.hash = ''; }}><SiteLogo className="checkout-logo" /></button></div><CheckoutSteps current={1}/><form className="checkout-layout checkout-details-layout" onSubmit={submitOrder}>
      {error && <div className="checkout-error checkout-error-block">{error}</div>}
      <div className="checkout-form checkout-form-block checkout-contact-block">
        <div className="checkout-section"><div className="checkout-heading"><span>1</span><h2>Contact information</h2></div><label>Email address<input required type="email" value={form.email} onChange={(e)=>update('email',e.target.value)} placeholder="you@example.com" /></label><label><input type="checkbox" checked={form.saveAddress} onChange={(e)=>update('saveAddress',e.target.checked)} /> Keep me updated about my order</label></div>
      </div>
      {orderSummary}
      <div className="checkout-form checkout-form-block checkout-shipping-block">
        <div className="checkout-section"><div className="checkout-heading"><span>2</span><h2>Shipping address</h2></div><div className="checkout-grid"><label>First name<input required value={form.firstName} onChange={(e)=>update('firstName',e.target.value)} /></label><label>Last name<input required value={form.lastName} onChange={(e)=>update('lastName',e.target.value)} /></label></div><label>Company (optional)<input value={form.company} onChange={(e)=>update('company',e.target.value)} /></label><label>Street address<input required value={form.address} onChange={(e)=>update('address',e.target.value)} placeholder="Street address" /></label><label>Apartment, suite, etc. (optional)<input value={form.apartment} onChange={(e)=>update('apartment',e.target.value)} /></label><div className="checkout-grid three"><label>City<input required value={form.city} onChange={(e)=>update('city',e.target.value)} /></label><label>State<input required value={form.state} onChange={(e)=>update('state',e.target.value)} /></label><label>ZIP code<input required value={form.zip} onChange={(e)=>update('zip',e.target.value)} /></label></div><div className="checkout-grid"><label>Country<select value={form.country} onChange={(e)=>update('country',e.target.value)}><option>United States</option><option>Canada</option></select></label><label>Phone number<input required type="tel" value={form.phone} onChange={(e)=>update('phone',e.target.value)} /></label></div></div>
      </div>
      <div className="checkout-form checkout-form-block checkout-payment-block">
        <div className="checkout-section"><div className="checkout-heading"><span>3</span><h2>Payment arrangement</h2></div><div className="checkout-payment-note"><ShieldCheck/><p><b>Payment is arranged after order confirmation.</b><br/>Our team will contact you using the details above to confirm your order and arrange payment.</p></div></div>
        <button className="place-order-button" type="submit" disabled={submitting || !checkoutItems.length}>{submitting?'PLACING ORDER...':'PLACE ORDER'}</button>
      </div>
    </form></main>;
  }

  const cartSummary = (
    <aside className="checkout-summary cart-summary-block"><h2>Order summary</h2><div className="summary-row"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="summary-row"><span>Shipping</span><b>{shippingLabel}</b></div>{!shippingReady && cartItems.length > 0 && <p className="summary-shipping-note">Shipping is calculated after you fill in your shipping address: free in USA, fee for other countries.</p>}<div className="summary-row total"><span>{shippingReady ? 'Estimated total' : 'Estimated total (before shipping)'}</span><b>{money(total)}</b></div><button className="place-order-button" disabled={!cartItems.length} onClick={()=>setStage('details')}>PROCEED TO CHECKOUT <ChevronRight /></button><div className="summary-trust"><span><Truck/> Free shipping in USA</span><span><ShieldCheck/> Secure checkout</span></div></aside>
  );

  return <main className="checkout-page"><div className="checkout-brand"><button onClick={() => { location.hash = ''; }}><SiteLogo className="checkout-logo" /></button></div><CheckoutSteps current={0}/><div className="checkout-layout cart-layout">{cartSummary}<section className="cart-items"><div className="cart-title"><h1>Shopping Cart</h1><span>{cartItems.length} {cartItems.length===1?'item':'items'}</span></div>{cartItems.length ? cartItems.map((item,index)=><article className="cart-item" key={`${item.productId}-${index}`}><div className="cart-thumb"><ShoppingCart /></div><div className="cart-item-info"><h2>{item.name}</h2>{item.weight&&<p>Weight: {item.weight} lb</p>}<p>Quantity: {item.quantity}</p><button onClick={()=>removeItem(index)}><Trash2/> Remove</button></div><strong>{money(item.price*item.quantity)}</strong></article>) : <div className="empty-cart"><ShoppingCart/><h2>Your cart is currently empty</h2><button onClick={()=>{location.hash='';}}>RETURN TO SHOP</button></div>}</section></div></main>;
}
