const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://bowlersxbackend.onrender.com').replace(/\/+$/, '');

export function apiUrl(path) {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}