import React from 'react';

export default function SiteLogo({ className = '', alt = 'BowlersX' }) {
  return <img className={`site-logo ${className}`} src="/snapshots/logo/logo.jpeg" alt={alt} />;
}
