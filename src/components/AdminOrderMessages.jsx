import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Search, RefreshCw } from 'lucide-react';
import OrderChat from './OrderChat.jsx';
import { apiUrl } from '../api.js';
import { createChatSocket } from '../socket.js';

export default function AdminOrderMessages({ token }) {
  const [inbox, setInbox] = useState({ conversations: [], total: 0, page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [unread, setUnread] = useState({ adminUnread: 0, adminUnreadConversations: 0 });
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  async function loadInbox(opts = {}) {
    const q = typeof opts.search === 'string' ? opts.search : search;
    try {
      const qs = new URLSearchParams({ page: '1', limit: '50' });
      if (q.trim()) qs.set('search', q.trim());
      const [inboxRes, unreadRes] = await Promise.all([
        fetch(apiUrl(`/api/admin/order-chats?${qs.toString()}`), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl('/api/admin/order-chats/unread'), { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const inboxData = await inboxRes.json().catch(() => ({}));
      const unreadData = await unreadRes.json().catch(() => ({}));
      if (!inboxRes.ok) throw new Error(inboxData.error || 'Unable to load order messages');
      setInbox(inboxData);
      setUnread({ adminUnread: unreadData.adminUnread || 0, adminUnreadConversations: unreadData.adminUnreadConversations || 0 });
      setError('');
      setSelected((current) => {
        if (!current) return null;
        const updated = (inboxData.conversations || []).find((c) => c._id === current._id || c.orderId === current.orderId);
        return updated || current;
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadInbox(); }, []);
  useEffect(() => {
    const t = window.setTimeout(() => loadInbox({ search }), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!token) return;
    const socket = createChatSocket(token);
    socketRef.current = socket;
    if (!socket) return;
    const onConnect = () => { setConnected(true); loadInbox(); };
    const onDisconnect = () => setConnected(false);
    const refresh = () => loadInbox();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat:new-message', refresh);
    socket.on('chat:conversation-updated', refresh);
    socket.on('chat:read', refresh);
    socket.on('chat:unread-updated', (data) => {
      if (data) setUnread((u) => ({ ...u, adminUnread: data.adminUnread ?? u.adminUnread, adminUnreadConversations: data.adminUnreadConversations ?? u.adminUnreadConversations }));
      loadInbox();
    });
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat:new-message', refresh);
      socket.off('chat:conversation-updated', refresh);
      socket.off('chat:read', refresh);
      socket.off('chat:unread-updated');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const selectedOrder = useMemo(() => {
    if (!selected) return null;
    return {
      _id: selected.orderId,
      customer: selected.customerName,
      email: selected.customerEmail,
      phone: selected.customerPhone,
      status: selected.orderStatus,
      total: selected.orderTotal,
      createdAt: selected.orderCreatedAt,
    };
  }, [selected]);

  return (
    <section className="admin-order-messages">
      <div className="admin-order-messages-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>Order Messages</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b' }}>
            {connected ? 'Real-time connected' : 'Reconnecting…'} · {unread.adminUnread || 0} unread message{(unread.adminUnread || 0) === 1 ? '' : 's'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="table-search"><Search /><input placeholder="Search customer, email, phone, order" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button type="button" className="secondary-btn" onClick={() => loadInbox()} title="Refresh"><RefreshCw size={16} /> Refresh</button>
        </div>
      </div>
      {error && <p className="order-chat-error" role="alert">{error}</p>}
      <div className="admin-order-messages-layout">
        <div className="admin-order-messages-inbox">
          {loading && inbox.conversations.length === 0 && <div className="empty-state">Loading conversations…</div>}
          {!loading && inbox.conversations.length === 0 && <div className="empty-state">No order conversations yet.</div>}
          {inbox.conversations.map((conv) => (
            <button
              key={conv._id}
              type="button"
              className={`admin-order-messages-item ${selected?._id === conv._id ? 'active' : ''}`}
              onClick={() => setSelected(conv)}
            >
              <div className="admin-order-messages-item-head">
                <strong>{conv.customerName || 'Customer'} · #{conv.orderNumber || String(conv.orderId).slice(-6).toUpperCase()}</strong>
                {conv.adminUnread > 0 && <span className="admin-order-messages-badge">{conv.adminUnread}</span>}
              </div>
              <small>{conv.customerEmail}{conv.customerPhone ? ` · ${conv.customerPhone}` : ''}</small>
              <p>{conv.lastMessage || 'No messages yet'}</p>
              <time>{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleString() : (conv.updatedAt ? new Date(conv.updatedAt).toLocaleString() : '')}</time>
            </button>
          ))}
        </div>
        <div className="admin-order-messages-panel">
          {selectedOrder ? (
            <OrderChat
              order={selectedOrder}
              adminToken={token}
              onClose={() => setSelected(null)}
              onMessagesRead={() => loadInbox()}
            />
          ) : (
            <div className="empty-state" style={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center', color: '#64748b' }}><MessageCircle size={28} /><p>Select a conversation to view and reply.</p></div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
