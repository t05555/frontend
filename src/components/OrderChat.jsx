import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { apiUrl } from '../api.js';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

function messageTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function OrderChat({ order, conversationToken, adminToken, onClose }) {
  const isAdmin = Boolean(adminToken);
  const authToken = adminToken || conversationToken;
  const endpoint = isAdmin
    ? `/api/admin/orders/${order._id}/messages`
    : `/api/orders/${order._id}/messages`;
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEnd = useRef(null);
  const messageInput = useRef(null);
  const orderItems = Array.isArray(order?.items) ? order.items : [];

  useEffect(() => {
    let active = true;
    let requestPending = false;

    async function refreshMessages() {
      if (requestPending || !authToken) return;
      requestPending = true;
      try {
        const response = await fetch(apiUrl(endpoint), {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Unable to load order messages');
        if (active) {
          const nextMessages = data.messages || [];
          setMessages((current) => current.length === nextMessages.length && current.every((item, index) => (
            item._id === nextMessages[index]._id &&
            item.text === nextMessages[index].text &&
            item.sender === nextMessages[index].sender
          )) ? current : nextMessages);
          setError('');
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        requestPending = false;
        if (active) setLoading(false);
      }
    }

    refreshMessages();
    const interval = window.setInterval(refreshMessages, 4000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [authToken, endpoint]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    if (authToken && !loading) messageInput.current?.focus();
  }, [authToken, loading]);

  async function sendMessage(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending) return;

    setSending(true);
    setError('');
    try {
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to send message');
      setMessages(data.messages || []);
      setMessage('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
      window.setTimeout(() => messageInput.current?.focus(), 0);
    }
  }

  function onComposeKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (message.trim() && !sending && authToken) sendMessage(event);
    }
  }

  return (
    <section className={`order-chat ${isAdmin ? 'order-chat-admin' : 'order-chat-customer'}`} aria-label="Order conversation">
      <header className="order-chat-header">
        <div className="order-chat-title">
          <span className="order-chat-icon"><MessageCircle aria-hidden="true" /></span>
          <div>
            <h2>{isAdmin ? `Order #${String(order._id).slice(-8).toUpperCase()}` : 'Order chat'}</h2>
            <p>{isAdmin ? `${order.customer} · ${order.status}` : 'Chat with BowlersX Support about your order'}</p>
          </div>
        </div>
        {onClose && <button className="order-chat-close" type="button" aria-label="Close conversation" onClick={onClose}><X /></button>}
      </header>

      <div className="order-chat-order" aria-label="Your order">
        <div className="order-chat-order-head">
          <strong>Order #{String(order?._id || '').slice(-8).toUpperCase()}</strong>
          {order?.status && <span className="order-chat-status">{order.status}</span>}
        </div>
        {orderItems.length > 0 ? (
          <ul className="order-chat-items">
            {orderItems.map((item, index) => (
              <li key={item._id || `${item.product || item.name}-${index}`}>
                <span>{item.name || 'Item'}{item.weight ? ` (${item.weight} lb)` : ''} × {item.quantity || 1}</span>
                <b>{money(Number(item.price || 0) * Number(item.quantity || 1))}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="order-chat-empty-order">Your order details will appear here once available.</p>
        )}
        <div className="order-chat-total"><span>Total</span><b>{money(order?.total)}</b></div>
        <p className="order-chat-support-note">You can reply here anytime. BowlersX Support will respond in this chat.</p>
      </div>

      <div className="order-chat-messages" role="log" aria-live="polite" aria-label="Messages">
        {loading && messages.length === 0 && <p className="order-chat-empty">Loading conversation…</p>}
        {!loading && messages.length === 0 && <p className="order-chat-empty">Your order was placed. Send a message below if you have any questions — our team will reply here.</p>}
        {messages.map((item, index) => {
          const ownMessage = isAdmin ? item.sender === 'admin' : item.sender === 'customer';
          const author = ownMessage ? 'You' : isAdmin ? 'Customer' : 'BowlersX Support';
          return (
            <article className={`order-chat-message ${ownMessage ? 'is-own' : ''}`} key={item._id || `${item.createdAt}-${index}`}>
              <span>{author}</span>
              <p>{item.text}</p>
              <time dateTime={item.createdAt}>{messageTime(item.createdAt)}</time>
            </article>
          );
        })}
        <div ref={messagesEnd} />
      </div>

      {error && <p className="order-chat-error" role="alert">{error}</p>}
      <form className="order-chat-compose" onSubmit={sendMessage}>
        <label className="visually-hidden" htmlFor={`order-message-${order._id}`}>Message</label>
        <textarea
          id={`order-message-${order._id}`}
          ref={messageInput}
          value={message}
          maxLength={1000}
          rows={2}
          placeholder="Write a message to BowlersX Support… (Enter to send, Shift+Enter for a new line)"
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={onComposeKeyDown}
        />
        <button type="submit" disabled={!message.trim() || sending || !authToken}>
          <Send aria-hidden="true" />
          <span>{sending ? 'Sending…' : 'Send'}</span>
        </button>
      </form>
    </section>
  );
}