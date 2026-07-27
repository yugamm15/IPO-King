import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Layers, FileSpreadsheet, Wallet, FileText, Settings, LogOut, TrendingUp } from 'lucide-react';

export default function Sidebar({ onLogout, user, initials }) {
  const displayName = user?.full_name || user?.email || 'Super Admin';
  const displayRole = user?.role ? String(user.role).replace(/_/g, ' ') : 'Super Admin';

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-brand">
        <TrendingUp className="brand-icon" />
        <div className="brand-details">
          <span className="brand-name">IPO KING</span>
          <span className="brand-badge-sm">ADMIN v1.0</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        <NavLink to="/dashboard" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/customers" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
          <Users size={18} />
          <span>Customers (17 Fields)</span>
        </NavLink>
        <NavLink to="/ipos" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
          <Layers size={18} />
          <span>IPO Master</span>
        </NavLink>
        <NavLink to="/applications" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
          <FileSpreadsheet size={18} />
          <span>Applications</span>
        </NavLink>
        <NavLink to="/payments" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
          <Wallet size={18} />
          <span>Payments & Profits</span>
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
          <FileText size={18} />
          <span>10 Reports</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
          <Settings size={18} />
          <span>System Settings</span>
        </NavLink>
      </nav>

      <div className="sidebar-user">
        <div className="user-avatar">{initials || 'AD'}</div>
        <div className="user-info">
          <span className="user-name">{displayName}</span>
          <span className="user-role">{displayRole}</span>
        </div>
        <button onClick={onLogout} className="btn-logout" title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
