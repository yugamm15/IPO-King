const SESSION_STORAGE_KEY = 'ipo-king-session';
const LEGACY_AUTH_KEY = 'authToken';
const LEGACY_REFRESH_KEY = 'refreshToken';
const LEGACY_IS_AUTH_KEY = 'isAuth';

function safeParse(jsonValue) {
  try {
    return JSON.parse(jsonValue);
  } catch (_) {
    return null;
  }
}

export function loadSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedSession = safeParse(localStorage.getItem(SESSION_STORAGE_KEY));
  if (storedSession && storedSession.token && storedSession.expiresAt && Date.now() < storedSession.expiresAt) {
    return storedSession;
  }

  const legacyToken = localStorage.getItem(LEGACY_AUTH_KEY);
  if (legacyToken) {
    return {
      token: legacyToken,
      refreshToken: localStorage.getItem(LEGACY_REFRESH_KEY) || '',
      user: null,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };
  }

  return null;
}

export function saveSession(session) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session || !session.token) {
    clearSession();
    return;
  }

  const normalizedSession = {
    token: session.token,
    refreshToken: session.refreshToken || '',
    user: session.user || null,
    expiresAt: session.expiresAt || Date.now() + 24 * 60 * 60 * 1000
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalizedSession));
  localStorage.setItem(LEGACY_AUTH_KEY, normalizedSession.token);
  localStorage.setItem(LEGACY_IS_AUTH_KEY, 'true');

  if (normalizedSession.refreshToken) {
    localStorage.setItem(LEGACY_REFRESH_KEY, normalizedSession.refreshToken);
  } else {
    localStorage.removeItem(LEGACY_REFRESH_KEY);
  }
}

export function clearSession() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_AUTH_KEY);
  localStorage.removeItem(LEGACY_REFRESH_KEY);
  localStorage.removeItem(LEGACY_IS_AUTH_KEY);
}

export function getSessionStorageKey() {
  return SESSION_STORAGE_KEY;
}
