import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clearSession, loadSession, saveSession } from '../services/session';

const SessionContext = createContext(null);
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());
  const idleTimerRef = useRef(null);

  const stopIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const startIdleTimer = () => {
    stopIdleTimer();

    if (!session?.token) {
      return;
    }

    idleTimerRef.current = setTimeout(() => {
      clearSession();
      setSession(null);
    }, IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    const checkExpiryTimer = setInterval(() => {
      setSession((current) => {
        if (!current) return current;
        if (current.expiresAt && Date.now() >= current.expiresAt) {
          clearSession();
          return null;
        }
        return current;
      });
    }, 30000);

    return () => clearInterval(checkExpiryTimer);
  }, []);

  useEffect(() => {
    const handleActivity = () => {
      if (session?.token) {
        startIdleTimer();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleActivity();
      }
    };

    if (session?.token) {
      ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));
      window.addEventListener('focus', handleActivity);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      startIdleTimer();
    } else {
      stopIdleTimer();
    }

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      window.removeEventListener('focus', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopIdleTimer();
    };
  }, [session?.token]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (!event.key || event.key === 'ipo-king-session' || event.key === 'authToken' || event.key === 'refreshToken' || event.key === 'isAuth') {
        setSession(loadSession());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = (nextSession) => {
    const normalizedSession = {
      token: nextSession.token,
      refreshToken: nextSession.refreshToken || '',
      user: nextSession.user || null,
      expiresAt: nextSession.expiresAt || Date.now() + 24 * 60 * 60 * 1000
    };
    setSession(normalizedSession);
    saveSession(normalizedSession);
    startIdleTimer();
    return normalizedSession;
  };

  const logout = () => {
    stopIdleTimer();
    clearSession();
    setSession(null);
  };

  const refresh = (partialSession) => {
    setSession((current) => {
      if (!current) return current;
      const next = {
        ...current,
        ...partialSession
      };
      saveSession(next);
      startIdleTimer();
      return next;
    });
  };

  const value = useMemo(() => {
    const isAuthenticated = Boolean(session?.token) && (!session?.expiresAt || Date.now() < session.expiresAt);
    return {
      session,
      isAuthenticated,
      login,
      logout,
      refresh,
      token: session?.token || '',
      user: session?.user || null
    };
  }, [session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
