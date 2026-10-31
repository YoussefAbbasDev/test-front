import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { api, refreshAccess, setAccessToken, setSessionExpiredHandler, API_BASE_URL } from '../services/api';
import { setLanguage } from '../i18n';
import i18n from '../i18n';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  const loadMe = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data);
    if (data.language && data.language !== i18n.language) setLanguage(data.language);
    return data;
  }, []);

  // restore the session from the refresh cookie on first load
  useEffect(() => {
    setSessionExpiredHandler(() => { setAccessToken(null); setUser(null); qc.clear(); });
    refreshAccess().then(loadMe).catch(() => setUser(null)).finally(() => setReady(true));
  }, [loadMe, qc]);

  const login = useCallback(async (email, password) => {
    const { data } = await axios.post(`${API_BASE_URL}/auth/login`, { email, password }, { withCredentials: true, headers: { 'Accept-Language': i18n.language } });
    setAccessToken(data.accessToken);
    return loadMe();
  }, [loadMe]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  const changeLanguage = useCallback(async (lng) => {
    setLanguage(lng);
    if (user) {
      try { await api.patch('/auth/preferences', { language: lng }); } catch { /* preference save is best effort */ }
    }
  }, [user]);

  const value = useMemo(() => {
    const perms = new Set(user?.permissions || []);
    const can = (code) => perms.has('*') || (Array.isArray(code) ? code.some((c) => perms.has(c)) : perms.has(code));
    return { user, ready, login, logout, can, reload: loadMe, changeLanguage, employeeId: user?.employee?.id || null };
  }, [user, ready, login, logout, loadMe, changeLanguage]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
