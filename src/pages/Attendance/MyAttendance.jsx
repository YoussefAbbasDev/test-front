import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { LogIn, LogOut, Coffee, MapPin, QrCode, Loader2, Clock } from 'lucide-react';
import { PageHeader, Card, StatusBadge } from '../../components/common/Display';
import { QueryState } from '../../components/common/Feedback';
import { Modal } from '../../components/common/Overlay';
import { Field, Textarea } from '../../components/forms/Fields';
import DataTable from '../../components/tables/DataTable';
import { useGet } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { api, notifyError } from '../../services/api';
import { date, minutes, time } from '../../utils/format';
import dayjs from 'dayjs';
import CorrectionModal from './CorrectionModal';

const getPosition = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error('unsupported'));
  navigator.geolocation.getCurrentPosition((p) => resolve(p.coords), reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
});

// A short device fingerprint used only for the shared-device fraud heuristic
const deviceInfo = () => `${navigator.userAgent.slice(0, 120)}|${screen.width}x${screen.height}`;

export default function MyAttendance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const tz = user?.company?.timezone;
  const qc = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [qrOpen, setQrOpen] = useState(null);
  const [qrText, setQrText] = useState('');
  const [corr, setCorr] = useState(null);
  const q = useGet(['att-today'], '/attendance/me/today');
  const month = dayjs().format('YYYY-MM');
  const history = useGet(['att-mine', month], '/attendance/records', { employeeId: user?.employee?.id, from: `${month}-01`, to: dayjs().endOf('month').format('YYYY-MM-DD'), pageSize: 31 }, { enabled: !!user?.employee });

  const punch = async (type, method, extra = {}) => {
    setBusy(type);
    try {
      let body = { method, deviceInfo: deviceInfo(), ...extra };
      if (method === 'GPS') {
        toast(t('attendance.locating'), { icon: '📍', id: 'loc' });
        try {
          const c = await getPosition();
          body = { ...body, latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy };
        } catch {
          toast.error(t('attendance.locationDenied'), { id: 'loc' });
          return;
        }
        toast.dismiss('loc');
      }
      const path = { CHECK_IN: 'check-in', CHECK_OUT: 'check-out', BREAK_START: 'break-start', BREAK_END: 'break-end' }[type];
      await api.post(`/attendance/${path}`, body);
      toast.success(t('common.done'));
      qc.invalidateQueries({ queryKey: ['att-today'] });
      qc.invalidateQueries({ queryKey: ['att-mine'] });
    } catch (e) { notifyError(e); } finally { setBusy(null); }
  };

  const submitQr = () => {
    let token = qrText.trim();
    try { token = JSON.parse(token).t || token; } catch { /* plain token */ }
    const type = qrOpen;
    setQrOpen(null);
    setQrText('');
    punch(type, 'QR', { qrToken: token });
  };

  return (
    <div>
      <PageHeader title={t('nav.myAttendance')} description={dayjs().format('dddd, YYYY-MM-DD')} />
      <QueryState query={q}>
        {(d) => {
          const methods = d.allowedMethods || [];
          const a = d.allowed || {};
          const actions = [
            ['CHECK_IN', a.checkIn, LogIn, 'attendance.checkIn', 'btn-primary'],
            ['BREAK_START', a.breakStart, Coffee, 'attendance.breakStart', 'btn-secondary'],
            ['BREAK_END', a.breakEnd, Coffee, 'attendance.breakEnd', 'btn-secondary'],
            ['CHECK_OUT', a.checkOut, LogOut, 'attendance.checkOut', 'btn-danger'],
          ].filter(([, ok]) => ok);
          return (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <div className="flex flex-col items-center gap-6 py-6 text-center">
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-navy-700 text-white shadow-pop">
                    <Clock className="h-12 w-12" />
                  </div>
                  <div>
                    <p className="text-3xl font-semibold tabular-nums text-navy-700">{dayjs().format('HH:mm')}</p>
                    <p className="mt-1 text-sm text-ink-muted">{d.schedule?.shift ? `${t('attendance.yourShift')}: ${d.schedule.shift.startTime} – ${d.schedule.shift.endTime}` : t('attendance.noShift')}</p>
                    {d.record && <div className="mt-2"><StatusBadge status={d.record.status} /></div>}
                  </div>
                  <div className="flex w-full max-w-md flex-col gap-3">
                    {actions.map(([type, , Icon, label, cls]) => (
                      <div key={type} className="flex gap-2">
                        {methods.includes('GPS') && (
                          <button type="button" className={clsx(cls, 'h-12 flex-1 text-base')} disabled={!!busy} onClick={() => punch(type, 'GPS')}>
                            {busy === type ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}{t(label)}<MapPin className="h-4 w-4 opacity-70" />
                          </button>
                        )}
                        {methods.includes('QR') && <button type="button" className="btn-outline h-12 px-4" disabled={!!busy} onClick={() => setQrOpen(type)} title={t('attendance.scanQr')}><QrCode className="h-5 w-5" /></button>}
                      </div>
                    ))}
                  </div>
                  <button type="button" className="text-sm text-brand-600 hover:underline" onClick={() => setCorr({ date: d.date })}>{t('attendance.requestCorrection')}</button>
                </div>
              </Card>
              <Card title={t('attendance.events')}>
                {!d.record?.events?.length ? <p className="text-sm text-ink-muted">{t('common.noData')}</p> : (
                  <ol className="space-y-3">
                    {d.record.events.map((ev) => (
                      <li key={ev.id} className={clsx('flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-sm', ev.isVoided && 'line-through opacity-50')}>
                        <span>{ev.type.replace('_', ' ')}</span><span className="text-ink-muted">{time(ev.occurredAt, tz)} · {t(`enums.method.${ev.method}`)}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {d.record && <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-ink-muted"><span>{t('fields.worked')}: {minutes(d.record.workedMinutes)}</span><span>{t('fields.lateMinutes')}: {minutes(d.record.lateMinutes)}</span></div>}
              </Card>
              <Card title={dayjs().format('MMMM YYYY')} className="lg:col-span-3" bodyClass="p-0">
                <DataTable rows={history.data?.items} loading={history.isLoading} dense onRowClick={(r) => setCorr({ date: date(r.date) })} columns={[
                  { key: 'd', header: t('common.date'), render: (r) => date(r.date) }, { key: 'i', header: t('fields.checkIn'), render: (r) => time(r.firstCheckIn, tz) },
                  { key: 'o', header: t('fields.checkOut'), render: (r) => time(r.lastCheckOut, tz) }, { key: 'l', header: t('fields.lateMinutes'), render: (r) => (r.lateMinutes ? minutes(r.lateMinutes) : '—') },
                  { key: 'w', header: t('fields.worked'), render: (r) => minutes(r.workedMinutes) }, { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
                ]} />
              </Card>
            </div>
          );
        }}
      </QueryState>
      <Modal open={!!qrOpen} onClose={() => setQrOpen(null)} size="sm" title={t('attendance.scanQr')}
        footer={<button type="button" className="btn-primary" disabled={!qrText.trim()} onClick={submitQr}>{t('common.submit')}</button>}>
        <Field label={t('attendance.pasteQr')} hint={t('attendance.qrHint')}><Textarea value={qrText} onChange={(e) => setQrText(e.target.value)} dir="ltr" /></Field>
      </Modal>
      {corr && <CorrectionModal open initialDate={corr.date} onClose={() => setCorr(null)} />}
    </div>
  );
}
