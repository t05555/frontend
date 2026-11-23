// Production entrypoint - BowlersX storefront and admin.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './admin.css';
import './admin-responsive.css';
import './admin-premium.css';
import './admin-polish.css';
import './admin-mobile-dashboard.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
