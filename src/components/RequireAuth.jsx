import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

export default function RequireAuth() {
  const { isAuthenticated } = useSession();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
