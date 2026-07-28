import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Layers, FileSpreadsheet, Wallet, FileText, Settings, LogOut, TrendingUp } from 'lucide-react';

export default function Navbar({ onLogout, user, initials }) {
  const displayName = user?.full_name || user?.email || 'Super Admin';

  return (
    <header className="topnav glass-panel">
      <div className="topnav-container">
        <div className="topnav-brand">
          <TrendingUp className="brand-icon" />
          <div className="brand-details">
            <span className="brand-name">IPO KING</span>
          </div>
        </div>

        <nav className="topnav-menu">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={16} />
            <span>Customers (17 Fields)</span>
          </NavLink>
          <NavLink to="/ipos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Layers size={16} />
            <span>IPO Master</span>
          </NavLink>
          <NavLink to="/applications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileSpreadsheet size={16} />
            <span>Applications</span>
          </NavLink>
          <NavLink to="/payments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Wallet size={16} />
            <span>Payments & Profits</span>
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileText size={16} />
            <span>10 Reports</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={16} />
            <span>System Settings</span>
          </NavLink>
        </nav>

        <div className="topnav-user">
          <button onClick={onLogout} className="btn-logout" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
