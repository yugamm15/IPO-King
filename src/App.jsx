import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ExcelImportModal from './components/ExcelImportModal';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import IpoMaster from './pages/IpoMaster';
import Applications from './pages/Applications';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuth') === 'true';
  });
  const [isDark, setIsDark] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('isAuth', isAuthenticated ? 'true' : 'false');
  }, [isAuthenticated]);

  const handleToggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuth', 'true');
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('isAuth', 'false');
    navigate('/login');
  };

  // If on /login page or not authenticated, render standalone clean Login screen
  if (!isAuthenticated || location.pathname === '/login') {
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

  return (
    <div className="dashboard-wrapper">
      <div className="bg-blur blur-1"></div>
      <div className="bg-blur blur-2"></div>

      <Sidebar onLogout={handleLogout} />

      <main className="main-content">
        <Navbar isDark={isDark} onToggleTheme={handleToggleTheme} />

        <div className="content-body">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={<Dashboard onOpenExcelModal={() => setIsExcelModalOpen(true)} />}
            />
            <Route
              path="/customers"
              element={<Customers onOpenExcelModal={() => setIsExcelModalOpen(true)} />}
            />
            <Route path="/ipos" element={<IpoMaster />} />
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
    </div>
  );
}
