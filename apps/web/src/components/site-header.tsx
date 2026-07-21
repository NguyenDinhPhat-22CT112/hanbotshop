'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HeaderActions } from './header-actions';
import { ProductSearch } from './product-search';

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <header className={`site-header${menuOpen ? ' mobile-menu-open' : ''}`}>
      <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>Hanbotorder</Link>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <div className="header-nav-area">
        <nav id="primary-navigation" aria-label="Điều hướng chính" onClick={() => setMenuOpen(false)}>
          <a href="/order">Order</a>
          <a href="/resin">Resin</a>
          <a href="/yeu-cau-in">Yêu cầu in</a>
          <a href="/lien-he">Liên hệ</a>
        </nav>
        <ProductSearch redirectOnSubmit={true} />
        <HeaderActions />
      </div>
    </header>
  );
}
