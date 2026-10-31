// Axios client: access token kept in memory only; the refresh token is an httpOnly cookie handled by the browser.
import axios from 'axios';
import toast from 'react-hot-toast';
import i18n from '../i18n';

// Backend API base URL from .env (VITE_API_URL or VITE_BACKEND_URL)
const rawBaseUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').trim();

export const API_BASE_URL = (() => {
  if (!rawBaseUrl) return '/api/v1';
  const clean = rawBaseUrl.replace(/\/+$/, '');
  if (clean.endsWith('/api/v1')) return clean;
  if (clean.endsWith('/api')) return `${clean}/v1`;
  return `${clean}/api/v1`;
})();

let accessToken = null;
let refreshing = null;
let onSessionExpired = () => {};

export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

const companyHeader = () => { try { return localStorage.getItem('seeda.companyId'); } catch { return null; } };

export const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 60000 });

api.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.language;
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  const cid = companyHeader();
  if (cid) config.headers['X-Company-Id'] = cid;
  return config;
});

export const refreshAccess = async () => {
  if (!refreshing) {
    refreshing = axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((r) => { setAccessToken(r.data.accessToken); return r.data.accessToken; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
};

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    if (status === 401 && ['TOKEN_EXPIRED', 'TOKEN_MISSING', 'TOKEN_INVALID'].includes(code) && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      try {
        await refreshAccess();
        return api(original);
      } catch {
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  },
);

export const errorMessage = (error) => {
  if (!error?.response) return i18n.t('errors.network');
  return error.response.data?.error?.message || i18n.t('common.error');
};

export const notifyError = (error) => toast.error(errorMessage(error));

// Downloads a protected file (exports / PDFs) with the bearer token, then saves it locally.
export const download = async (url, params = {}, fallbackName = 'export') => {
  try {
    const res = await api.get(url, { params, responseType: 'blob' });
    const cd = res.headers['content-disposition'] || '';
    const name = decodeURIComponent((cd.match(/filename="?([^"]+)"?/) || [])[1] || fallbackName);
    const href = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 2000);
  } catch (e) {
    // blob error bodies need parsing to show the server message
    if (e.response?.data instanceof Blob) {
      try { e.response.data = JSON.parse(await e.response.data.text()); } catch { /* keep */ }
    }
    notifyError(e);
  }
};

// Object URL for protected images (employee photos, logo)
export const fetchObjectUrl = async (url) => {
  const res = await api.get(url, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
};
