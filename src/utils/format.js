import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import i18n from '../i18n';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

const locale = () => (i18n.language === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US');

// Money is displayed from server-calculated decimal strings; the UI never computes salaries.
export const money = (v, currency = 'SAR') => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `${n.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${i18n.language === 'ar' && currency === 'SAR' ? 'ر.س' : currency}`;
};
export const num = (v, digits = 0) => (v === null || v === undefined ? '—' : Number(v).toLocaleString(locale(), { maximumFractionDigits: digits }));
// date-only values are stored as UTC midnight
export const date = (v) => (v ? dayjs.utc(v).format('YYYY-MM-DD') : '—');
export const dateLong = (v) => (v ? new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(v)) : '—');
export const time = (v, tz) => (v ? (tz ? dayjs(v).tz(tz) : dayjs(v)).format('HH:mm') : '—');
export const dateTime = (v, tz) => (v ? (tz ? dayjs(v).tz(tz) : dayjs(v)).format('YYYY-MM-DD HH:mm') : '—');
export const ago = (v) => (v ? dayjs(v).fromNow() : '');
export const minutes = (m) => {
  if (!m) return '0';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? `${h}:${String(mm).padStart(2, '0')}` : `${mm}${i18n.language === 'ar' ? 'د' : 'm'}`;
};
export const today = () => dayjs().format('YYYY-MM-DD');

// bilingual entity name helpers
export const nm = (o) => (o ? (i18n.language === 'ar' ? o.nameAr || o.nameEn : o.nameEn || o.nameAr) || o.name || '' : '');
export const ttl = (o) => (o ? (i18n.language === 'ar' ? o.titleAr || o.titleEn : o.titleEn || o.titleAr) : '');
export const empName = (e) => {
  if (!e) return '';
  if (i18n.language === 'ar' && e.fullNameAr) return e.fullNameAr;
  return e.fullNameEn || [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
};
export const initials = (e) => (empName(e) || '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
