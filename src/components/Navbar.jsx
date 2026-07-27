import React from 'react';
import { Search, Bell, Database, Moon, Sun } from 'lucide-react';

export default function Navbar({ isDark, onToggleTheme, user }) {
  const displayName = user?.full_name || user?.email || 'IPO KING Admin';

  return (
    <header className="topbar glass-panel">
      <div className="topbar-search">
        <Search size={16} />
        <input type="text" placeholder="Search customer PAN, IPO name, Application ID..." />
      </div>

      <div className="topbar-actions">
        <div className="system-status">
          <span className="status-indicator online"></span>
          <span>Node.js Live Sync Active</span>
        </div>

        <button type="button" className="theme-toggle-btn" onClick={onToggleTheme}>
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button className="icon-btn" title="Notifications">
          <Bell size={18} />
          <span className="badge">3</span>
        </button>

        <div className="db-pill" title={displayName}>
          <span>{displayName}</span>
        </div>

        <div className="db-pill">
          <Database size={14} />
          <span>DB: Supabase</span>
        </div>
      </div>
    </header>
  );
}
