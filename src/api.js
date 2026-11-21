const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const apiBaseUrl = import.meta.env.DEV ? configuredApiBase : (configuredApiBase || 'https://bowlersxbackend-1.onrender.com');

export function apiUrl(path) {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}