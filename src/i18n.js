import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import ar from './locales/ar';
import en from './locales/en';

const STORAGE_KEY = 'seeda.lang';
const stored = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();

export const applyDirection = (lng) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
  dayjs.locale(lng === 'ar' ? 'ar' : 'en');
};

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: stored || 'ar',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
  // humanize keys that have no translation instead of showing "a.b.c"
  parseMissingKeyHandler: (key) => key.split('.').pop().replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
});
applyDirection(i18n.language);

export const setLanguage = (lng) => {
  i18n.changeLanguage(lng);
  applyDirection(lng);
  try { localStorage.setItem(STORAGE_KEY, lng); } catch { /* storage unavailable */ }
};

export default i18n;
