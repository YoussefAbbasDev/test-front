import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, Copy, Plus, AlertTriangle, X } from 'lucide-react';
import { PageHeader, PersonCell } from '../../components/common/Display';
import { QueryState } from '../../components/common/Feedback';
import { Modal, ConfirmDialog } from '../../components/common/Overlay';
import { Select } from '../../components/forms/Fields';
import ResourceForm from '../../components/forms/ResourceForm';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { empName, nm } from '../../utils/format';

export function AssignResult({ result, onClose }) {
  const { t } = useTranslation();
  return (
    <Modal open={!!result} onClose={onClose} title={t('shifts.assign')} size="md">
      <p className="mb-3 text-sm"><b>{result?.created}</b> {t('shifts.created')}</p>
      {result?.skipped?.length > 0 && (
        <>
          <p className="mb-2 text-sm font-medium text-warning">{t('shifts.conflicts')} ({result.skipped.length})</p>
          <ul className="max-h-72 space-y-1 overflow-y-auto text-xs">
            {result.skipped.map((s, i) => <li key={i} className="rounded-lg bg-canvas px-3 py-1.5">{s.employee} · {s.date} · {t(`shifts.conflictCodes.${s.code}`)}</li>)}
          </ul>
        </>
      )}
    </Modal>
  );
}

export default function Scheduler() {
  const { t, i18n } = useTranslation();
  const { can } = useAuth();
  const rtl = i18n.dir() === 'rtl';
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(dayjs().startOf('week'));
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assign, setAssign] = useState(null);
  const [result, setResult] = useState(null);
  const [copy, setCopy] = useState(false);
  const [cancel, setCancel] = useState(null);
  const branches = useOptions('/organization/branches');
  const depts = useOptions('/organization/departments');
  const range = useMemo(() => {
    if (view === 'day') return { from: anchor, to: anchor };
    if (view === 'month') return { from: anchor.startOf('month'), to: anchor.endOf('month') };
    return { from: anchor.startOf('week'), to: anchor.startOf('week').add(6, 'day') };
  }, [view, anchor]);
  const days = [];
  for (let d = range.from; !d.isAfter(range.to, 'day'); d = d.add(1, 'day')) days.push(d);
  const params = { from: range.from.format('YYYY-MM-DD'), to: range.to.format('YYYY-MM-DD'), branchId: branchId || undefined, departmentId: departmentId || undefined };
  const q = useGet(['schedule', params], '/shifts/schedule', params, { keepPreviousData: true });
  const send = useSend('post', '/shifts/assignments', { invalidate: ['schedule'], silent: true, onSuccess: (r) => { setAssign(null); setResult(r); } });
  const copySend = useSend('post', '/shifts/assignments/copy-week', { invalidate: ['schedule'], silent: true, onSuccess: (r) => { setCopy(false); setResult(r); } });
  const cancelSend = useSend('delete', (a) => `/shifts/assignments/${a.id}?reason=${encodeURIComponent(a.reason || '')}`, { invalidate: ['schedule'], onSuccess: () => setCancel(null) });
  const step = (dir) => setAnchor((a) => a.add(dir, view === 'month' ? 'month' : view === 'week' ? 'week' : 'day'));

  return (
    <div>
      <PageHeader title={t('shifts.title')} description={t('shifts.subtitle')}
        actions={can('shifts.create') && <>
          <button type="button" className="btn-outline" onClick={() => setCopy(true)}><Copy className="h-4 w-4" />{t('shifts.copyWeek')}</button>
          <button type="button" className="btn-primary" onClick={() => setAssign({ from: params.from, to: params.to })}><Plus className="h-4 w-4" />{t('shifts.assign')}</button>
        </>} />
      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="flex items-center gap-1">
          <button type="button" className="btn-outline btn-sm" onClick={() => step(-1)}>{rtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
          <button type="button" className="btn-outline btn-sm" onClick={() => setAnchor(view === 'week' ? dayjs().startOf('week') : dayjs())}>{t('common.today')}</button>
          <button type="button" className="btn-outline btn-sm" onClick={() => step(1)}>{rtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
        </div>
        <span className="px-2 text-sm font-medium text-navy-700">{range.from.format('DD MMM')} – {range.to.format('DD MMM YYYY')}</span>
        <div className="flex rounded-xl bg-canvas p-1">
          {['day', 'week', 'month'].map((v) => <button key={v} type="button" className={clsx('rounded-lg px-3 py-1 text-xs', view === v ? 'bg-surface font-medium text-brand-700 shadow-card' : 'text-ink-muted')} onClick={() => { setView(v); if (v === 'week') setAnchor((a) => a.startOf('week')); }}>{t(`shifts.views.${v}`)}</button>)}
        </div>
        <div className="ms-auto flex flex-wrap gap-2">
          <Select className="w-44" value={branchId} onChange={(e) => setBranchId(e.target.value)} options={(branches.data?.items || []).map((b) => ({ value: b.id, label: nm(b) }))} placeholder={t('common.branch')} />
          <Select className="w-44" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} options={(depts.data?.items || []).map((b) => ({ value: b.id, label: nm(b) }))} placeholder={t('common.department')} />
        </div>
      </div>
      <QueryState query={q}>
        {(d) => {
          const byCell = new Map();
          d.assignments.forEach((a) => { const k = `${a.employeeId}|${a.date.slice(0, 10)}`; byCell.set(k, [...(byCell.get(k) || []), a]); });
          const leaveOn = (empId, day) => d.leaves.find((l) => l.employeeId === empId && dayjs(l.startDate.slice(0, 10)) <= day && dayjs(l.endDate.slice(0, 10)) >= day);
          const holiday = (day) => d.holidays.find((h) => h.date.slice(0, 10) === day.format('YYYY-MM-DD'));
          const shortage = (day) => d.coverage.filter((c) => c.date === day.format('YYYY-MM-DD'));
          return (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-canvas/70">
                      <th className="sticky start-0 z-10 min-w-[220px] bg-canvas px-4 py-3 text-start text-xs font-medium text-ink-muted">{t('fields.employees')} ({d.employees.length})</th>
                      {days.map((day) => {
                        const short = shortage(day);
                        return (
                          <th key={day.toString()} className={clsx('min-w-[118px] px-2 py-2 text-center text-xs font-medium', day.isSame(dayjs(), 'day') ? 'text-brand-700' : 'text-ink-muted')}>
                            <div>{day.format('ddd')}</div><div className={clsx('text-lg', day.isSame(dayjs(), 'day') && 'text-brand-600')}>{day.format('D')}</div>
                            {holiday(day) && <div className="chip mt-1 bg-brand-100 text-brand-700">{nm(holiday(day))}</div>}
                            {short.length > 0 && <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-danger" title={short.map((s) => `${s.shift.code}: ${s.scheduled}/${s.required}`).join(' · ')}><AlertTriangle className="h-3 w-3" />{t('shifts.coverageShortage')}</div>}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {d.employees.map((e) => (
                      <tr key={e.id}>
                        <td className="sticky start-0 z-10 bg-surface px-4 py-2"><PersonCell person={e} sub={e.position ? (i18n.language === 'ar' ? e.position.titleAr : e.position.titleEn) : e.employeeNumber} to={`/employees/${e.id}`} /></td>
                        {days.map((day) => {
                          const cell = byCell.get(`${e.id}|${day.format('YYYY-MM-DD')}`) || [];
                          const lv = leaveOn(e.id, day);
                          return (
                            <td key={day.toString()} className="h-16 border-s border-line p-1 align-top">
                              {lv && <div className="mb-1 truncate rounded-lg px-2 py-1 text-[11px] text-white" style={{ background: lv.leaveType.color }} title={nm(lv.leaveType)}>{nm(lv.leaveType)}{lv.status !== 'APPROVED' ? ' ?' : ''}</div>}
                              {cell.map((a) => (
                                <div key={a.id} className="group relative mb-1 rounded-lg px-2 py-1 text-[11px] text-white" style={{ background: a.shift.color }}>
                                  <div className="font-medium">{a.shift.code}</div><div className="opacity-80" dir="ltr">{a.shift.startTime}–{a.shift.endTime}</div>
                                  {can('shifts.edit') && <button type="button" className="absolute end-1 top-1 hidden rounded bg-black/20 p-0.5 group-hover:block" onClick={() => setCancel(a)}><X className="h-3 w-3" /></button>}
                                </div>
                              ))}
                              {!cell.length && !lv && can('shifts.create') && (
                                <button type="button" className="grid h-full min-h-[44px] w-full place-items-center rounded-lg text-ink-muted opacity-0 transition hover:bg-brand-50 hover:opacity-100" onClick={() => setAssign({ employeeIds: [e.id], from: day.format('YYYY-MM-DD'), to: day.format('YYYY-MM-DD') })}><Plus className="h-4 w-4" /></button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }}
      </QueryState>
      <Modal open={!!assign} onClose={() => setAssign(null)} title={t('shifts.assign')} size="lg"
        footer={<><button type="button" className="btn-outline" onClick={() => setAssign(null)}>{t('common.cancel')}</button><button type="submit" form="assign-form" className="btn-primary" disabled={send.isPending}>{t('common.save')}</button></>}>
        {assign && (
          <ResourceForm id="assign-form" defaultValues={assign} onSubmit={(v) => send.mutate({ ...v, employeeIds: v.employeeIds?.length ? v.employeeIds : undefined, weekdays: v.weekdays?.length ? v.weekdays : undefined, dryRun: !!v.dryRun })} fields={[
            { name: 'shiftId', label: t('fields.shift'), type: 'select', required: true, source: { url: '/shifts/definitions', label: (s) => `${s.code} — ${nm(s)} (${s.startTime}–${s.endTime})` } },
            { name: 'teamId', label: t('fields.team'), type: 'select', source: { url: '/organization/teams', label: nm } },
            { name: 'from', label: t('common.from'), type: 'date', required: true }, { name: 'to', label: t('common.to'), type: 'date', required: true },
            { name: 'branchId', label: t('common.branch'), type: 'select', source: { url: '/organization/branches', label: nm } }, { name: 'notes', label: t('common.notes') },
            { name: 'weekdays', label: t('fields.workingDays'), type: 'weekdays', hint: t('fields.shift') }, { name: 'dryRun', label: t('shifts.dryRun'), type: 'checkbox' },
            { name: 'employeeIds', label: t('fields.employees'), type: 'multiselect', source: { url: `/employees?pageSize=200${branchId ? `&branchId=${branchId}` : ''}`, label: (x) => `${x.employeeNumber} — ${empName(x)}` } },
          ]} />
        )}
      </Modal>
      <ConfirmDialog open={copy} onClose={() => setCopy(false)} title={t('shifts.copyWeek')} busy={copySend.isPending}
        message={`${range.from.subtract(1, 'week').format('DD MMM')} → ${range.from.format('DD MMM')}`}
        onConfirm={() => copySend.mutate({ fromWeekStart: range.from.subtract(1, 'week').format('YYYY-MM-DD'), toWeekStart: range.from.format('YYYY-MM-DD'), branchId: branchId || undefined })} />
      <ConfirmDialog open={!!cancel} onClose={() => setCancel(null)} danger requireReason={false} title={t('common.cancel')} busy={cancelSend.isPending}
        message={cancel && `${cancel.shift.code} · ${cancel.date.slice(0, 10)}`} onConfirm={(reason) => cancelSend.mutate({ ...cancel, reason })} />
      <AssignResult result={result} onClose={() => setResult(null)} />
    </div>
  );
}
