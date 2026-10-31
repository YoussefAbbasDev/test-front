import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { PageHeader, Card } from '../../components/common/Display';
import { QueryState } from '../../components/common/Feedback';
import { Select } from '../../components/forms/Fields';
import { useGet, useOptions } from '../../hooks/useApi';
import { empName, nm } from '../../utils/format';
import { LeaveDetail } from './LeaveRequests';

export default function LeaveCalendar() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const [month, setMonth] = useState(dayjs().startOf('month'));
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [open, setOpen] = useState(null);
  const branches = useOptions('/organization/branches');
  const depts = useOptions('/organization/departments');
  const gridStart = month.startOf('week');
  const gridEnd = month.endOf('month').endOf('week');
  const params = { from: gridStart.format('YYYY-MM-DD'), to: gridEnd.format('YYYY-MM-DD'), branchId: branchId || undefined, departmentId: departmentId || undefined };
  const q = useGet(['leave-cal', params], '/leaves/calendar', params);
  const days = [];
  for (let d = gridStart; !d.isAfter(gridEnd, 'day'); d = d.add(1, 'day')) days.push(d);
  const wd = t('enums.weekdayShort', { returnObjects: true });
  return (
    <div>
      <PageHeader title={t('nav.calendar')} breadcrumbs={[{ label: t('nav.leaves'), to: '/leaves' }, { label: t('nav.calendar') }]}
        actions={<>
          <Select className="w-44" value={branchId} onChange={(e) => setBranchId(e.target.value)} options={(branches.data?.items || []).map((b) => ({ value: b.id, label: nm(b) }))} placeholder={t('common.branch')} />
          <Select className="w-44" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} options={(depts.data?.items || []).map((b) => ({ value: b.id, label: nm(b) }))} placeholder={t('common.department')} />
        </>} />
      <QueryState query={q}>
        {(d) => (
          <div className="space-y-4">
            <Card bodyClass="p-0" title={<span className="flex items-center gap-2">
              <button type="button" className="btn-ghost h-8 w-8 p-0" onClick={() => setMonth((m) => m.subtract(1, 'month'))}>{rtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
              {month.format('MMMM YYYY')}
              <button type="button" className="btn-ghost h-8 w-8 p-0" onClick={() => setMonth((m) => m.add(1, 'month'))}>{rtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
            </span>}>
              <div className="grid grid-cols-7 border-b border-line bg-canvas/60 text-center text-xs text-ink-muted">{wd.map((w) => <div key={w} className="py-2">{w}</div>)}</div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const items = d.items.filter((l) => dayjs(l.startDate.slice(0, 10)) <= day && dayjs(l.endDate.slice(0, 10)) >= day);
                  const hol = d.holidays.find((h) => h.date.slice(0, 10) === day.format('YYYY-MM-DD'));
                  return (
                    <div key={day.toString()} className={clsx('min-h-[104px] border-b border-e border-line p-1.5', !day.isSame(month, 'month') && 'bg-canvas/40 text-ink-muted', hol && 'bg-brand-50/60')}>
                      <div className={clsx('mb-1 text-xs', day.isSame(dayjs(), 'day') && 'inline-grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white')}>{day.date()}</div>
                      {hol && <div className="mb-1 truncate text-[10px] text-brand-700">{nm(hol)}</div>}
                      {items.slice(0, 3).map((l) => (
                        <button key={l.id} type="button" onClick={() => setOpen(l.id)} className={clsx('mb-0.5 block w-full truncate rounded px-1.5 py-0.5 text-start text-[10px] text-white', l.status !== 'APPROVED' && 'opacity-60')} style={{ background: l.leaveType.color }}>
                          {empName(l.employee)}
                        </button>
                      ))}
                      {items.length > 3 && <span className="text-[10px] text-ink-muted">+{items.length - 3}</span>}
                    </div>
                  );
                })}
              </div>
            </Card>
            {d.conflicts.length > 0 && (
              <Card title={<span className="flex items-center gap-2 text-warning"><AlertTriangle className="h-4 w-4" />{t('leaves.conflicts')} ({d.conflicts.length})</span>}>
                <ul className="space-y-1 text-sm">
                  {d.conflicts.slice(0, 20).map((c, i) => {
                    const a = d.items.find((x) => x.id === c.a); const b = d.items.find((x) => x.id === c.b);
                    return <li key={i} className="rounded-lg bg-canvas px-3 py-1.5">{c.department} · {empName(a?.employee)} ↔ {empName(b?.employee)} · {c.from} → {c.to}</li>;
                  })}
                </ul>
              </Card>
            )}
          </div>
        )}
      </QueryState>
      <LeaveDetail id={open} onClose={() => setOpen(null)} />
    </div>
  );
}
