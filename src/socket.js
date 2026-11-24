import { io } from 'socket.io-client';
import { apiUrl } from './api.js';

const socketUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
  || (import.meta.env.DEV ? '' : 'https://bowlersxbackend-1.onrender.com');

export function getSocketBaseUrl() {
  // apiUrl('/') would append slash; derive origin/base from configured API
  const base = socketUrl || window.location.origin;
  return base;
}

export function createChatSocket(token) {
  if (!token) return null;
  const url = getSocketBaseUrl();
  const socket = io(url, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    auth: { token },
  });
  return socket;
}
