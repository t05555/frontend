import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, X, WifiOff } from 'lucide-react';
import { apiUrl } from '../api.js';
import { createChatSocket } from '../socket.js';
import { playChatNotification } from '../utils/chatNotification.js';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

function messageTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function toDisplayMessage(item) {
  return {
    _id: item._id || item.id || undefined,
    sender: item.sender || item.senderRole,
    senderRole: item.senderRole || item.sender,
    text: item.text || item.message || '',
    message: item.message || item.text || '',
    createdAt: item.createdAt,
    read: !!item.read,
    clientMessageId: item.clientMessageId,
  };
}

export default function OrderChat({ order, conversationToken, adminToken, onClose, onMessagesRead }) {
  const isAdmin = Boolean(adminToken);
  const authToken = adminToken || conversationToken;
  const orderId = order?._id;
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [typingRole, setTypingRole] = useState('');
  const messagesEnd = useRef(null);
  const messageInput = useRef(null);
  const socketRef = useRef(null);
  const typingTimeout = useRef(null);
  const stopTypingTimeout = useRef(null);
  const lastTypingSent = useRef(0);
  const seenMessageKeysRef = useRef(new Set());
  const historyReadyRef = useRef(false);
  const orderItems = Array.isArray(order?.items) ? order.items : [];

  const legacyEndpoint = isAdmin ? `/api/admin/orders/${orderId}/messages` : `/api/orders/${orderId}/messages`;

  function getMessageKey(m) {
    return m?._id || m?.clientMessageId || `${m?.sender || m?.senderRole}-${m?.createdAt}-${m?.text || m?.message}`;
  }

  function mergeMessages(next, { notifyIncoming = true } = {}) {
    const normalized = (next || []).map(toDisplayMessage);
    setMessages((current) => {
      const byKey = new Map();
      [...current, ...normalized].forEach((m) => {
        const key = getMessageKey(m);
        if (!key) return;
        byKey.set(key, { ...byKey.get(key), ...m });
      });
      const merged = [...byKey.values()].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      if (historyReadyRef.current && notifyIncoming) {
        const myRole = isAdmin ? 'admin' : 'customer';
        const hasNewIncoming = merged.some((m) => {
          const key = getMessageKey(m);
          if (!key || seenMessageKeysRef.current.has(key)) return false;
          const role = m.senderRole || m.sender;
          return role && role !== myRole;
        });
        if (hasNewIncoming) playChatNotification();
      }
      merged.forEach((m) => {
        const key = getMessageKey(m);
        if (key) seenMessageKeysRef.current.add(key);
      });
      return merged;
    });
  }

  async function markRead(cid = conversationId) {
    if (!authToken || !cid) return;
    try {
      const res = await fetch(apiUrl(`/api/order-chat/${cid}/read`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) onMessagesRead?.();
    } catch { /* ignore */ }
  }

  async function loadConversation() {
    if (!authToken || !orderId) return;
    try {
      const res = await fetch(apiUrl(`/api/order-chat/${orderId}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to load conversation');
      const cid = data.conversation?._id || data.conversationId || '';
      if (cid) setConversationId(cid);
      mergeMessages(data.messages || []);
      setError('');
      if (cid) markRead(cid);
      return { conversationId: cid, messages: data.messages || [] };
    } catch (e) {
      // fallback to legacy endpoint
      try {
        const res = await fetch(apiUrl(legacyEndpoint), { headers: { Authorization: `Bearer ${authToken}` } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || e.message || 'Unable to load order messages');
        mergeMessages(data.messages || []);
        setError('');
        return { conversationId: '', messages: data.messages || [] };
      } catch (fallbackErr) {
        setError(fallbackErr.message || e.message);
        return null;
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessages([]);
    setConversationId('');
    setError('');
    seenMessageKeysRef.current = new Set();
    historyReadyRef.current = false;
    (async () => {
      if (!active) return;
      await loadConversation();
      if (!active) return;
      historyReadyRef.current = true;
      if (!authToken || !orderId) return;
      const socket = createChatSocket(authToken);
      socketRef.current = socket;
      if (!socket) return;

      socket.on('connect', () => {
        setConnected(true);
        setError('');
        socket.emit('chat:join', { orderId }, (ack) => {
          if (ack?.ok) {
            if (ack.conversationId) setConversationId(ack.conversationId);
            if (Array.isArray(ack.messages)) mergeMessages(ack.messages, { notifyIncoming: false });
            historyReadyRef.current = true;
            if (ack.conversationId) {
              markRead(ack.conversationId);
              socket.emit('chat:read', { conversationId: ack.conversationId });
            }
          } else if (ack?.error) {
            // keep REST fallback usable
          }
        });
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));
      socket.on('chat:new-message', (payload) => {
        if (!payload?.message) return;
        const payloadOrder = String(payload.orderId || '');
        const payloadConv = String(payload.conversationId || '');
        if (payloadOrder && String(orderId) !== payloadOrder) return;
        mergeMessages([payload.message]);
        const incomingRole = payload.message.senderRole || payload.message.sender;
        const mine = isAdmin ? incomingRole === 'admin' : incomingRole === 'customer';
        if (!mine) {
          const cid = payloadConv || conversationId;
          if (cid) {
            socket.emit('chat:read', { conversationId: cid });
            markRead(cid);
          }
          onMessagesRead?.();
        }
      });
      socket.on('chat:typing', (payload) => {
        const payloadConv = String(payload?.conversationId || '');
        if (conversationId && payloadConv && payloadConv !== conversationId) return;
        if (payload?.role && payload.role !== (isAdmin ? 'admin' : 'customer')) setTypingRole(payload.role);
      });
      socket.on('chat:stop-typing', (payload) => {
        const payloadConv = String(payload?.conversationId || '');
        if (conversationId && payloadConv && payloadConv !== conversationId) return;
        setTypingRole('');
      });
      socket.on('chat:read', () => onMessagesRead?.());
    })();

    // REST fallback polling when socket disconnected/unavailable
    const interval = window.setInterval(() => {
      if (!socketRef.current?.connected) loadConversation();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
      if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
      if (stopTypingTimeout.current) window.clearTimeout(stopTypingTimeout.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [authToken, orderId, isAdmin]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typingRole]);

  useEffect(() => {
    if (authToken && !loading) messageInput.current?.focus();
  }, [authToken, loading]);

  async function sendViaRest(text) {
    const endpoint = conversationId ? `/api/order-chat/${orderId}/messages` : legacyEndpoint;
    const response = await fetch(apiUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ message: text }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to send message');
    mergeMessages(data.messages || (data.message ? [data.message] : []));
  }

  async function sendMessage(event) {
    event?.preventDefault?.();
    const text = message.trim();
    if (!text || sending || !authToken) return;
    setSending(true);
    setError('');
    const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = { _id: clientMessageId, clientMessageId, sender: isAdmin ? 'admin' : 'customer', senderRole: isAdmin ? 'admin' : 'customer', text, message: text, createdAt: new Date().toISOString(), read: false };
    mergeMessages([optimistic]);
    setMessage('');
    try {
      const socket = socketRef.current;
      if (socket?.connected) {
        await new Promise((resolve, reject) => {
          socket.emit('chat:send', { orderId, conversationId, message: text, clientMessageId }, (ack) => {
            if (ack?.ok) {
              if (ack.message) mergeMessages([ack.message]);
              resolve();
            } else reject(new Error(ack?.error || 'Unable to send message'));
          });
          window.setTimeout(() => reject(new Error('Send timed out')), 8000);
        });
      } else {
        await sendViaRest(text);
      }
      if (conversationId && socket?.connected) socket.emit('chat:stop-typing', { conversationId });
    } catch (requestError) {
      setError(requestError.message);
      setMessages((current) => current.filter((m) => m.clientMessageId !== clientMessageId && m._id !== clientMessageId));
      setMessage(text);
    } finally {
      setSending(false);
      window.setTimeout(() => messageInput.current?.focus(), 0);
    }
  }

  function emitTyping() {
    const socket = socketRef.current;
    if (!socket?.connected || !conversationId) return;
    const now = Date.now();
    if (now - lastTypingSent.current > 1500) {
      socket.emit('chat:typing', { conversationId });
      lastTypingSent.current = now;
    }
    if (stopTypingTimeout.current) window.clearTimeout(stopTypingTimeout.current);
    stopTypingTimeout.current = window.setTimeout(() => {
      socket.emit('chat:stop-typing', { conversationId });
      lastTypingSent.current = 0;
    }, 2000);
  }

  function onComposeKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (message.trim() && !sending && authToken) sendMessage(event);
    }
  }

  const canSend = Boolean(message.trim() && !sending && authToken);
  const typingLabel = typingRole ? (typingRole === 'admin' ? 'BowlersX Support is typing…' : 'Customer is typing…') : '';

  const shipping = order?.shippingAddress || {};
  const customerName = [shipping.firstName, shipping.lastName].filter(Boolean).join(' ').trim() || order?.customer || '';
  const addressParts = [shipping.address, shipping.apartment, [shipping.city, shipping.state].filter(Boolean).join(', '), shipping.zip, shipping.country].map((part) => String(part || '').trim()).filter(Boolean);
  const paymentLabels = { paypal: 'PayPal', cashapp: 'Cash App', chime: 'Chime', zelle: 'Zelle', card: 'Card', manual: 'Manual' };
  const paymentMethod = paymentLabels[order?.paymentMethod] || order?.paymentMethod || '';
  const orderDate = order?.createdAt && !Number.isNaN(new Date(order.createdAt).getTime()) ? new Date(order.createdAt).toLocaleString() : '';
  const itemCount = orderItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const company = String(shipping.company || '').trim();

  return (
    <section className={`order-chat ${isAdmin ? 'order-chat-admin' : 'order-chat-customer'}`} aria-label="Order conversation">
      <header className="order-chat-header">
        <div className="order-chat-title">
          <span className="order-chat-icon"><MessageCircle aria-hidden="true" /></span>
          <div>
            <h2>{isAdmin ? `Order #${String(order?._id || '').slice(-8).toUpperCase()}` : 'Order chat'}</h2>
            <p>
              {isAdmin ? `${order?.customer || 'Customer'} · ${order?.status || 'Order'}` : 'Chat with BowlersX Support about your order'}
              {' · '}
              <span className={`order-chat-connection ${connected ? 'is-connected' : 'is-disconnected'}`}>{connected ? 'Live' : 'Reconnecting'}</span>
            </p>
          </div>
        </div>
        {onClose && <button className="order-chat-close" type="button" aria-label="Close conversation" onClick={onClose}><X /></button>}
      </header>

      <div className="order-chat-order" aria-label="Your order">
        <div className="order-chat-order-head">
          <strong>Order #{String(order?._id || '').slice(-8).toUpperCase()}</strong>
          {order?.status && <span className="order-chat-status">{order.status}</span>}
        </div>
        {(customerName || order?.email || order?.phone || paymentMethod || orderDate || addressParts.length > 0) && (
          <dl className="order-chat-order-details">
            {customerName && <><dt>Name</dt><dd>{customerName}</dd></>}
            {order?.email && <><dt>Email</dt><dd>{order.email}</dd></>}
            {order?.phone && <><dt>Phone</dt><dd>{order.phone}</dd></>}
            {company && <><dt>Company</dt><dd>{company}</dd></>}
            {paymentMethod && <><dt>Payment</dt><dd>{paymentMethod}</dd></>}
            {addressParts.length > 0 && <><dt>Shipping address</dt><dd>{addressParts.join(', ')}</dd></>}
            {orderDate && <><dt>Placed</dt><dd>{orderDate}</dd></>}
            {order?.status && <><dt>Status</dt><dd>{order.status}</dd></>}
            {itemCount > 0 && <><dt>Items</dt><dd>{itemCount}</dd></>}
          </dl>
        )}
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
        <p className="order-chat-support-note">You can reply here anytime. {isAdmin ? 'Customer replies appear live in this conversation.' : 'BowlersX Support will respond in this chat.'}</p>
      </div>

      <div className="order-chat-messages" role="log" aria-live="polite" aria-label="Messages">
        {!connected && !loading && <p className="order-chat-connection-banner"><WifiOff size={14} /> Connection lost. Reconnecting automatically…</p>}
        {loading && messages.length === 0 && <p className="order-chat-empty">Loading conversation…</p>}
        {!loading && messages.length === 0 && <p className="order-chat-empty">{isAdmin ? 'No messages yet. Send a reply to start the conversation.' : 'Your order was placed. Send a message below if you have any questions — our team will reply here.'}</p>}
        {messages.map((item, index) => {
          const senderRole = item.senderRole || item.sender;
          const ownMessage = isAdmin ? senderRole === 'admin' : senderRole === 'customer';
          const author = ownMessage ? 'You' : isAdmin ? 'Customer' : 'BowlersX Support';
          const text = item.text || item.message || '';
          return (
            <article className={`order-chat-message ${ownMessage ? 'is-own' : ''}`} key={item._id || item.clientMessageId || `${item.createdAt}-${index}`}>
              <span>{author}</span>
              <p>{text}</p>
              <time dateTime={item.createdAt}>{messageTime(item.createdAt)}</time>
            </article>
          );
        })}
        {typingLabel && <p className="order-chat-typing">{typingLabel}</p>}
        <div ref={messagesEnd} />
      </div>

      {error && <p className="order-chat-error" role="alert">{error}</p>}
      <form className="order-chat-compose" onSubmit={sendMessage}>
        <label className="visually-hidden" htmlFor={`order-message-${orderId}`}>Message</label>
        <textarea
          id={`order-message-${orderId}`}
          ref={messageInput}
          value={message}
          maxLength={1000}
          rows={2}
          placeholder={isAdmin ? 'Reply to customer… (Enter to send, Shift+Enter for a new line)' : 'Write a message to BowlersX Support… (Enter to send, Shift+Enter for a new line)'}
          onChange={(event) => { setMessage(event.target.value); emitTyping(); }}
          onKeyDown={onComposeKeyDown}
        />
        <button type="submit" disabled={!canSend}>
          <Send aria-hidden="true" />
          <span>{sending ? 'Sending…' : 'Send'}</span>
        </button>
      </form>
    </section>
  );
}
