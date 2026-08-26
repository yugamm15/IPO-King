import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Layers,
  FileSpreadsheet,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Moon,
  Sun
} from 'lucide-react';

/**
 * Top Navigation Header matching Hero-11 aesthetic
 * Locked floating luxury bar with fixed height, fixed width constraints, and zero layout shifting.
 */
export default function Navbar({ onLogout, user, initials }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(document.body.classList.contains('dark-theme'));

  const toggleTheme = () => {
    if (document.body.classList.contains('dark-theme')) {
      document.body.classList.remove('dark-theme');
      setIsDarkTheme(false);
    } else {
      document.body.classList.add('dark-theme');
      setIsDarkTheme(true);
    }
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/ipos', label: 'IPO Master', icon: Layers },
    { to: '/applications', label: 'Applications', icon: FileSpreadsheet },
    { to: '/payments', label: 'Payments & Profits', icon: Wallet },
    { to: '/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand Identity */}
        <div
          onClick={() => navigate('/dashboard')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}
        >
          <img
            src="/final_logo.png"
            alt="IPO KING Logo"
            style={{ height: '42px', width: 'auto', objectFit: 'contain', display: 'block', flexShrink: 0 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                color: 'var(--text-main)',
                fontWeight: 800,
                fontSize: '19px',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '-0.04em',
                lineHeight: 1,
                whiteSpace: 'nowrap'
              }}>
                IPO KING
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'rgba(4, 47, 46, 0.08)',
                color: 'var(--primary)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                PRO
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
              Institutional IPO Desk
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links (Hero-11 Nav) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} className="desktop-nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Right Controls & User Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '1px solid var(--panel-border)',
              background: 'var(--panel-bg)',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
            title={isDarkTheme ? 'Switch to Warm Stone Theme' : 'Switch to Dark Theme'}
          >
            {isDarkTheme ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* User Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px 4px 6px',
            borderRadius: '12px',
            background: 'rgba(4, 47, 46, 0.05)',
            border: '1px solid var(--panel-border)',
            flexShrink: 0
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'var(--primary)',
              color: '#FAF6EC',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {initials || 'AD'}
            </div>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
              {user?.full_name || user?.email?.split('@')[0] || 'Administrator'}
            </span>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-secondary"
            style={{
              padding: '7px 12px',
              borderRadius: '10px',
              fontSize: '13px',
              gap: '6px',
              flexShrink: 0
            }}
            title="Sign out"
          >
            <LogOut size={15} />
            <span style={{ display: 'none' }} className="logout-text">Exit</span>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-main)',
              flexShrink: 0
            }}
            className="mobile-menu-btn"
            aria-label="Toggle Mobile Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '72px',
          left: 0,
          right: 0,
          background: 'var(--panel-bg)',
          borderBottom: '1px solid var(--panel-border)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 100,
          boxShadow: '0 12px 30px rgba(4, 47, 46, 0.12)'
        }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
                style={{ padding: '12px 16px', borderRadius: '10px' }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .desktop-nav-links { display: none !important; }
          .mobile-menu-btn { display: inline-flex !important; }
        }
        @media (min-width: 1025px) {
          .logout-text { display: inline !important; }
        }
      `}</style>
    </header>
  );
}
