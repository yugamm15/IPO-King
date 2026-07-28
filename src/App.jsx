import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ExcelImportModal from './components/ExcelImportModal';
import AddIpoModal from './components/AddIpoModal';
import { useSession } from './context/SessionContext.jsx';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import IpoMaster from './pages/IpoMaster';
import Applications from './pages/Applications';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isAddIpoModalOpen, setIsAddIpoModalOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, logout, user } = useSession();

  const handleToggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  const handleLoginSuccess = (sessionData) => {
    login(sessionData);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.full_name || user?.email || 'AD')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const protectedContent = (
    <div className="dashboard-wrapper">
      <div className="bg-blur blur-1"></div>
      <div className="bg-blur blur-2"></div>

      <Navbar onLogout={handleLogout} user={user} initials={initials} />

      <main className="main-content">
        <div className="content-body">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  onOpenExcelModal={() => setIsExcelModalOpen(true)}
                  onOpenAddIpoModal={() => setIsAddIpoModalOpen(true)}
                />
              }
            />
            <Route
              path="/customers"
              element={<Customers onOpenExcelModal={() => setIsExcelModalOpen(true)} />}
            />
            <Route
              path="/ipos"
              element={<IpoMaster onOpenAddIpoModal={() => setIsAddIpoModalOpen(true)} />}
            />
            <Route path="/applications" element={<Applications />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>

      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
      />

      <AddIpoModal
        isOpen={isAddIpoModalOpen}
        onClose={() => setIsAddIpoModalOpen(false)}
      />
    </div>
  );

  if (location.pathname === '/login') {
    if (isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
    }
    return (
      <>
        <div className="bg-blur blur-1"></div>
        <div className="bg-blur blur-2"></div>
        <Routes>
          <Route
            path="/login"
            element={
              <Login
                onLoginSuccess={handleLoginSuccess}
                isDark={isDark}
                onToggleTheme={handleToggleTheme}
              />
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return protectedContent;
}
