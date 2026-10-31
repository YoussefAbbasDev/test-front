import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X, ShieldAlert, Plus } from 'lucide-react';
import { PageHeader, PersonCell, StatusBadge } from '../../components/common/Display';
import { SearchInput, FilterPanel, ExportButton, DateRangePicker } from '../../components/common/Controls';
import { Drawer, Modal } from '../../components/common/Overlay';
import DataTable from '../../components/tables/DataTable';
import ResourceForm from '../../components/forms/ResourceForm';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { date, dateTime, empName, minutes, nm, time, today } from '../../utils/format';

const STATUSES = ['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'INCOMPLETE', 'HOLIDAY', 'DAY_OFF'];

export function ManualEntryModal({ open, onClose }) {
  const { t } = useTranslation();
  const send = useSend('post', '/attendance/manual', { invalidate: ['att-records', 'corrections'], onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} title={t('attendance.manualEntry')}
      footer={<><button type="button" className="btn-outline" onClick={onClose}>{t('common.cancel')}</button><button type="submit" form="manual-form" className="btn-primary" disabled={send.isPending}>{t('common.submit')}</button></>}>
      <ResourceForm id="manual-form" defaultValues={{ date: today() }} onSubmit={(v) => send.mutate({ ...v, checkOutNextDay: !!v.checkOutNextDay })} fields={[
        { name: 'employeeId', label: t('common.employee'), type: 'select', required: true, source: { url: '/employees?pageSize=200', label: (x) => `${x.employeeNumber} — ${empName(x)}` } },
        { name: 'date', label: t('common.date'), type: 'date', required: true }, { name: 'checkIn', label: t('fields.checkIn'), type: 'time' }, { name: 'checkOut', label: t('fields.checkOut'), type: 'time' },
        { name: 'checkOutNextDay', label: t('attendance.nextDay'), type: 'checkbox' }, { name: 'reason', label: t('common.reason'), type: 'textarea', required: true },
      ]} />
    </Modal>
  );
}

export default function Records() {
  const { t } = useTranslation();
  const { can, user } = useAuth();
  const tz = user?.company?.timezone;
  const [sp] = useSearchParams();
  const [params, setParams] = useState({
    page: 1, pageSize: 50, search: '', date: sp.get('date') || (sp.get('from') ? '' : today()), from: '', to: '', status: sp.get('status') || '',
    branchId: '', suspicious: sp.get('suspicious') || '', missingCheckout: sp.get('missingCheckout') || '', overtime: sp.get('overtime') || '',
  });
  const [open, setOpen] = useState(null);
  const [manual, setManual] = useState(false);
  const branches = useOptions('/organization/branches');
  const q = useGet(['att-records', params], '/attendance/records', params, { keepPreviousData: true });
  const detail = useGet(['att-record', open], open ? `/attendance/records/${open}` : null);
  const ot = useSend('post', ({ id }) => `/attendance/records/${id}/overtime`, { invalidate: ['att-records', ['att-record', open]] });

  const columns = [
    { key: 'date', header: t('common.date'), render: (r) => date(r.date) },
    { key: 'emp', header: t('common.employee'), render: (r) => <PersonCell person={r.employee} sub={nm(r.employee.branch)} /> },
    { key: 'shift', header: t('fields.shift'), render: (r) => r.shift?.code || '—', hideOnMobile: true },
    { key: 'in', header: t('fields.checkIn'), render: (r) => <span>{time(r.firstCheckIn, tz)} {r.checkInMethod && <span className="text-[11px] text-ink-muted">{t(`enums.method.${r.checkInMethod}`)}</span>}</span> },
    { key: 'out', header: t('fields.checkOut'), render: (r) => time(r.lastCheckOut, tz) },
    { key: 'late', header: t('fields.lateMinutes'), render: (r) => (r.lateMinutes ? <span className="text-warning">{minutes(r.lateMinutes)}</span> : '—') },
    { key: 'early', header: t('fields.earlyLeave'), render: (r) => (r.earlyLeaveMinutes ? minutes(r.earlyLeaveMinutes) : '—'), hideOnMobile: true },
    { key: 'worked', header: t('fields.worked'), render: (r) => minutes(r.workedMinutes) },
    { key: 'ot', header: t('fields.overtime'), render: (r) => (r.overtimeMinutes ? <span className="flex items-center gap-1">{minutes(r.overtimeMinutes)}<StatusBadge status={r.overtimeStatus} /></span> : '—') },
    { key: 'status', header: t('common.status'), render: (r) => <span className="flex items-center gap-1"><StatusBadge status={r.status} />{r.isSuspicious && <ShieldAlert className="h-4 w-4 text-danger" title={t('attendance.suspicious')} />}</span> },
  ];
  const rec = detail.data;
  return (
    <div>
      <PageHeader title={t('nav.records')} breadcrumbs={[{ label: t('nav.attendance'), to: '/attendance' }, { label: t('nav.records') }]}
        actions={<>
          {can('attendance.export') && <ExportButton url="/attendance/records" params={params} filename="attendance" />}
          {can('attendance.manual') && <button type="button" className="btn-primary" onClick={() => setManual(true)}><Plus className="h-4 w-4" />{t('attendance.manualEntry')}</button>}
        </>} />
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput className="w-full sm:w-64" value={params.search} onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))} />
          <input type="date" className="input w-40" value={params.date} onChange={(e) => setParams((p) => ({ ...p, date: e.target.value, from: '', to: '', page: 1 }))} />
          <DateRangePicker from={params.from} to={params.to} onChange={(r) => setParams((p) => ({ ...p, ...r, date: '', page: 1 }))} />
          <FilterPanel values={params} onChange={(k, v) => setParams((p) => ({ ...p, [k]: v, page: 1 }))} onClear={() => setParams((p) => ({ ...p, status: '', branchId: '', suspicious: '', missingCheckout: '', overtime: '', page: 1 }))}
            filters={[
              { key: 'status', label: t('common.status'), options: STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) },
              { key: 'branchId', label: t('common.branch'), options: (branches.data?.items || []).map((b) => ({ value: b.id, label: nm(b) })) },
              { key: 'overtime', label: t('fields.overtime'), options: [{ value: 'pending', label: t('status.PENDING') }] },
              { key: 'suspicious', label: t('attendance.suspicious'), options: [{ value: 'true', label: t('common.yes') }] },
              { key: 'missingCheckout', label: t('attendance.missingCheckouts'), options: [{ value: 'true', label: t('common.yes') }] },
            ]} />
        </div>
        <DataTable columns={columns} rows={q.data?.items} loading={q.isLoading} error={q.error} onRetry={q.refetch} onRowClick={(r) => setOpen(r.id)}
          page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))} />
      </div>
      <Drawer open={!!open} onClose={() => setOpen(null)} title={rec ? `${empName(rec.employee)} — ${date(rec.date)}` : ''} width="max-w-lg">
        {rec && (
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap gap-2"><StatusBadge status={rec.status} />{rec.isManual && <span className="chip bg-canvas text-ink-soft">{t('enums.method.MANUAL')}</span>}<span className="chip bg-canvas text-ink-soft">{t(`enums.dayType.${rec.dayType}`)}</span></div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-ink-muted">{t('fields.shift')}</dt><dd>{rec.shift ? `${rec.shift.code} ${rec.shift.startTime}–${rec.shift.endTime}` : '—'}</dd></div>
              <div><dt className="text-xs text-ink-muted">{t('fields.worked')}</dt><dd>{minutes(rec.workedMinutes)}</dd></div>
              <div><dt className="text-xs text-ink-muted">{t('fields.lateMinutes')}</dt><dd>{minutes(rec.lateMinutes)}</dd></div>
              <div><dt className="text-xs text-ink-muted">{t('fields.overtime')}</dt><dd>{minutes(rec.overtimeMinutes)} <StatusBadge status={rec.overtimeStatus} /></dd></div>
            </dl>
            {rec.overtimeStatus === 'PENDING' && can('attendance.approve') && (
              <div className="flex gap-2">
                <button type="button" className="btn-primary btn-sm" onClick={() => ot.mutate({ id: rec.id, approve: true })}><Check className="h-4 w-4" />{t('attendance.overtimeApprove')}</button>
                <button type="button" className="btn-outline btn-sm" onClick={() => ot.mutate({ id: rec.id, approve: false })}><X className="h-4 w-4" />{t('attendance.overtimeReject')}</button>
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-medium text-navy-700">{t('attendance.events')}</p>
              <ul className="space-y-2">
                {rec.events.map((ev) => (
                  <li key={ev.id} className={`rounded-xl border px-3 py-2 text-sm ${ev.isVoided ? 'border-dashed border-line opacity-60 line-through' : ev.isSuspicious ? 'border-danger/40 bg-danger/5' : 'border-line'}`}>
                    <div className="flex justify-between"><span className="font-medium">{ev.type.replace('_', ' ')}</span><span>{dateTime(ev.occurredAt, tz)}</span></div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      {t(`enums.method.${ev.method}`)}{ev.distanceMeters != null && ` · ${t('fields.distance')}: ${ev.distanceMeters}m`}{ev.accuracy != null && ` · ±${Number(ev.accuracy)}m`}
                      {ev.flags && ` · ${t('fields.flags')}: ${ev.flags.join(', ')}`}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Drawer>
      {manual && <ManualEntryModal open onClose={() => setManual(false)} />}
    </div>
  );
}
