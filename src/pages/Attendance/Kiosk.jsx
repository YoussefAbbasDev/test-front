// Kiosk mode: a fixed device inside the premises. Authenticated by a device key (not a user session), so it
// cannot reach any other part of the system. The key is kept in this browser's storage only.
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Delete, LogIn, LogOut, Coffee, Globe } from 'lucide-react';
import logo from '../../assets/logo-horizontal.png';
import { setLanguage } from '../../i18n';
import { API_BASE_URL } from '../../services/api';

const KEY = 'seeda.kioskKey';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

export default function Kiosk() {
  const { t, i18n } = useTranslation();
  const [key, setKey] = useState(read);
  const [keyInput, setKeyInput] = useState('');
  const [info, setInfo] = useState(null);
  const [empNo, setEmpNo] = useState('');
  const [pin, setPin] = useState('');
  const [field, setField] = useState('emp');
  const [msg, setMsg] = useState(null);
  const [now, setNow] = useState(new Date());
  const client = axios.create({ baseURL: `${API_BASE_URL}/attendance/kiosk`, headers: { 'X-Device-Key': key || '', 'Accept-Language': i18n.language } });

  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (!key) return;
    client.get('/me').then((r) => setInfo(r.data)).catch(() => { setInfo(null); setMsg({ ok: false, text: t('errors.forbidden') }); });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (msg) { const i = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(i); } return undefined; }, [msg]);

  const press = (d) => {
    if (field === 'emp') setEmpNo((v) => (d === 'del' ? v.slice(0, -1) : `${v}${d}`.slice(0, 20)));
    else setPin((v) => (d === 'del' ? v.slice(0, -1) : `${v}${d}`.slice(0, 8)));
  };
  const punch = async (type) => {
    try {
      const { data } = await client.post('/punch', { employeeNumber: empNo, pin, type });
      setMsg({ ok: true, text: `${i18n.language === 'ar' ? data.employee.nameAr || data.employee.name : data.employee.name} — ${t(`attendance.${{ CHECK_IN: 'checkIn', CHECK_OUT: 'checkOut', BREAK_START: 'breakStart', BREAK_END: 'breakEnd' }[type]}`)} ${new Date(data.at).toLocaleTimeString()}` });
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error?.message || t('common.error') });
    }
    setEmpNo(''); setPin(''); setField('emp');
  };

  if (!key || !info) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-600 to-navy-800 p-6">
        <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-pop">
          <img src={logo} alt="SEEDA" className="mx-auto mb-6 h-10" />
          <h1 className="mb-1 text-center text-lg font-semibold text-navy-700">{t('attendance.kioskConnect')}</h1>
          <p className="mb-4 text-center text-xs text-ink-muted">{t('attendance.deviceCreated')}</p>
          <input className="input mb-3 font-mono" dir="ltr" placeholder="sdk_…" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
          {msg && <p className="mb-3 text-sm text-danger">{msg.text}</p>}
          <button type="button" className="btn-primary w-full" onClick={() => { try { localStorage.setItem(KEY, keyInput.trim()); } catch { /* ignore */ } setKey(keyInput.trim()); }}>{t('attendance.kioskConnect')}</button>
        </div>
      </div>
    );
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-navy-700 px-6 py-4 text-white">
        <img src={logo} alt="SEEDA" className="h-8 rounded bg-white/90 px-2 py-1" />
        <div className="text-center"><p className="text-sm text-white/70">{i18n.language === 'ar' ? info.branch?.nameAr : info.branch?.nameEn}</p><p className="text-2xl font-semibold tabular-nums">{now.toLocaleTimeString()}</p></div>
        <button type="button" className="rounded-lg bg-white/15 px-3 py-1.5 text-xs" onClick={() => setLanguage(i18n.language === 'ar' ? 'en' : 'ar')}><Globe className="inline h-4 w-4" /> {t('common.switchLang')}</button>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <p className="text-center text-ink-soft">{t('attendance.kioskWelcome')}</p>
          {msg && <div className={clsx('rounded-2xl px-4 py-3 text-center font-medium', msg.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>{msg.text}</div>}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setField('emp')} className={clsx('card h-16 px-4 text-start', field === 'emp' && 'ring-2 ring-brand-500')}><span className="block text-xs text-ink-muted">{t('fields.employeeNumber')}</span><span className="font-mono text-lg" dir="ltr">{empNo || '—'}</span></button>
            <button type="button" onClick={() => setField('pin')} className={clsx('card h-16 px-4 text-start', field === 'pin' && 'ring-2 ring-brand-500')}><span className="block text-xs text-ink-muted">{t('attendance.kioskPin')}</span><span className="font-mono text-lg">{'•'.repeat(pin.length) || '—'}</span></button>
          </div>
          <div className="grid grid-cols-3 gap-3" dir="ltr">
            {keys.map((k, i) => (k === '' ? <span key={i} /> : (
              <button key={k} type="button" onClick={() => press(k)} className="card h-16 text-2xl font-medium text-navy-700 active:bg-brand-50">{k === 'del' ? <Delete className="mx-auto h-6 w-6" /> : k}</button>
            )))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn-primary h-14 text-base" disabled={!empNo || pin.length < 4} onClick={() => punch('CHECK_IN')}><LogIn className="h-5 w-5" />{t('attendance.checkIn')}</button>
            <button type="button" className="btn-danger h-14 text-base" disabled={!empNo || pin.length < 4} onClick={() => punch('CHECK_OUT')}><LogOut className="h-5 w-5" />{t('attendance.checkOut')}</button>
            <button type="button" className="btn-secondary h-12" disabled={!empNo || pin.length < 4} onClick={() => punch('BREAK_START')}><Coffee className="h-4 w-4" />{t('attendance.breakStart')}</button>
            <button type="button" className="btn-secondary h-12" disabled={!empNo || pin.length < 4} onClick={() => punch('BREAK_END')}><Coffee className="h-4 w-4" />{t('attendance.breakEnd')}</button>
          </div>
        </div>
      </main>
    </div>
  );
}
