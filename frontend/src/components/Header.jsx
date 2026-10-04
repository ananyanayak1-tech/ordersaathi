import React from 'react';

export default function Header({ activeTab, onTabChange, extractedCount = 0, totalOrdersCount = 0, catalogCount = 0 }) {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="brand-section">
          <div className="brand-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              <path d="M16 11l-4 4-2-2" stroke="white" strokeWidth="2.5"></path>
            </svg>
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <h1 className="brand-name">OrderSaathi</h1>
              <span className="brand-badge">WhatsApp AI</span>
            </div>
            <p className="brand-tagline">Turn messy WhatsApp chats into clean orders</p>
          </div>
        </div>

        <nav className="header-nav" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => onTabChange('new')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <line x1="12" y1="8" x2="12" y2="14"></line>
              <line x1="9" y1="11" x2="15" y2="11"></line>
            </svg>
            <span>New Orders</span>
            {extractedCount > 0 && <span className="tab-pill">{extractedCount}</span>}
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onTabChange('dashboard')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9"></rect>
              <rect x="14" y="3" width="7" height="5"></rect>
              <rect x="14" y="12" width="7" height="9"></rect>
              <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
            <span>Dashboard</span>
            {totalOrdersCount > 0 && <span className="tab-pill gray">{totalOrdersCount}</span>}
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => onTabChange('catalog')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <span>My Items</span>
            {catalogCount > 0 && <span className="tab-pill gray">{catalogCount}</span>}
          </button>
        </nav>
      </div>
    </header>
  );
}
