import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import ResourcePage, { statusColumn } from '../ResourcePage';
import { Modal } from '../../components/common/Overlay';
import ResourceForm from '../../components/forms/ResourceForm';
import { useSend } from '../../hooks/useApi';
import { empName, nm } from '../../utils/format';
import { AssignResult } from './Scheduler';

const perms = { create: 'shifts.settings', edit: 'shifts.settings', delete: 'shifts.settings' };
const crumbs = (t, label) => [{ label: t('nav.shifts'), to: '/shifts' }, { label }];

export function ShiftDefinitions() {
  const { t } = useTranslation();
  const days = t('enums.weekdayShort', { returnObjects: true });
  return (
    <ResourcePage title={t('nav.definitions')} endpoint="/shifts/definitions" perms={perms} breadcrumbs={crumbs(t, t('nav.definitions'))} defaultSort="code"
      columns={[
        { key: 'c', header: '', render: (r) => <span className="inline-block h-3 w-3 rounded-full" style={{ background: r.color }} /> }, { key: 'code', header: t('common.code'), sortKey: 'code' },
        { key: 'name', header: t('common.name'), render: (r) => nm(r) }, { key: 'type', header: t('common.type'), render: (r) => t(`enums.shiftType.${r.type}`) },
        { key: 'time', header: `${t('fields.startTime')} – ${t('fields.endTime')}`, render: (r) => <span dir="ltr">{r.startTime} – {r.endTime}{r.crossesMidnight ? ' (+1)' : ''}</span> },
        { key: 'exp', header: t('fields.expectedMinutes'), render: (r) => `${(r.expectedMinutes / 60).toFixed(1)} h` },
        { key: 'days', header: t('fields.workingDays'), render: (r) => (r.workingDays || []).map((d) => days[d]).join('، ') }, statusColumn(t),
      ]}
      fields={[
        { name: 'code', label: t('common.code'), required: true, ltr: true }, { name: 'nameAr', label: t('fields.nameAr'), required: true }, { name: 'nameEn', label: t('fields.nameEn'), required: true },
        { name: 'type', label: t('common.type'), type: 'select', placeholder: false, default: 'FIXED', options: ['FIXED', 'FLEXIBLE', 'NIGHT', 'ROTATING'].map((v) => ({ value: v, label: t(`enums.shiftType.${v}`) })) },
        { name: 'startTime', label: t('fields.startTime'), type: 'time', required: true }, { name: 'endTime', label: t('fields.endTime'), type: 'time', required: true },
        { name: 'breakMinutes', label: t('fields.breakMinutes'), type: 'number', integer: true, min: 0, default: 60 }, { name: 'graceMinutes', label: t('fields.graceMinutes'), type: 'number', integer: true, min: 0 },
        { name: 'expectedMinutes', label: t('fields.expectedMinutes'), type: 'number', integer: true, min: 1, hint: '= duration − break' },
        { name: 'branchId', label: t('common.branch'), type: 'select', source: { url: '/organization/branches', label: nm } }, { name: 'color', label: t('fields.color'), type: 'color', default: '#5A4293' },
        { name: 'status', label: t('common.status'), type: 'select', placeholder: false, default: 'ACTIVE', options: [{ value: 'ACTIVE', label: t('status.ACTIVE') }, { value: 'INACTIVE', label: t('status.INACTIVE') }] },
        { name: 'workingDays', label: t('fields.workingDays'), type: 'weekdays', required: true, default: [0, 1, 2, 3, 4] },
      ]}
      transformOut={(v) => ({ ...v, expectedMinutes: v.expectedMinutes ? Number(v.expectedMinutes) : undefined, breakMinutes: Number(v.breakMinutes || 0), graceMinutes: v.graceMinutes === null ? null : Number(v.graceMinutes) })} />
  );
}

export function Rotations() {
  const { t } = useTranslation();
  const [apply, setApply] = useState(null);
  const [result, setResult] = useState(null);
  const send = useSend('post', (v) => `/shifts/rotations/${apply.id}/apply`, { silent: true, onSuccess: (r) => { setApply(null); setResult(r); } });
  return (
    <>
      <ResourcePage title={t('nav.rotations')} endpoint="/shifts/rotations" perms={perms} breadcrumbs={crumbs(t, t('nav.rotations'))}
        rowActions={(r) => <button type="button" className="btn-ghost h-8 w-8 p-0" title={t('shifts.applyRotation')} onClick={() => setApply(r)}><Play className="h-4 w-4" /></button>}
        columns={[{ key: 'name', header: t('common.name') }, { key: 'type', header: t('common.type') }, { key: 'block', header: t('shifts.blockDays'), render: (r) => r.blockDays }, { key: 'start', header: t('fields.startDate'), render: (r) => r.startDate?.slice(0, 10) }, { key: 'p', header: t('shifts.pattern'), render: (r) => `${(r.pattern || []).length}` }, statusColumn(t)]}
        fields={[
          { name: 'name', label: t('common.name'), required: true }, { name: 'type', label: t('common.type'), type: 'select', placeholder: false, default: 'WEEKLY', options: ['WEEKLY', 'MONTHLY', 'CUSTOM'].map((v) => ({ value: v, label: v })) },
          { name: 'blockDays', label: t('shifts.blockDays'), type: 'number', integer: true, min: 1, default: 7, show: (v) => v.type === 'CUSTOM' }, { name: 'startDate', label: t('fields.startDate'), type: 'date', required: true },
          { name: 'shift1', label: `${t('shifts.pattern')} 1`, type: 'select', required: true, source: { url: '/shifts/definitions', label: (s) => s.code } },
          { name: 'shift2', label: `${t('shifts.pattern')} 2`, type: 'select', source: { url: '/shifts/definitions', label: (s) => s.code } },
          { name: 'shift3', label: `${t('shifts.pattern')} 3`, type: 'select', source: { url: '/shifts/definitions', label: (s) => s.code } },
        ]}
        transformIn={(r) => ({ ...r, shift1: r.pattern?.[0]?.shiftId, shift2: r.pattern?.[1]?.shiftId, shift3: r.pattern?.[2]?.shiftId })}
        transformOut={(v) => ({ name: v.name, type: v.type, blockDays: Number(v.blockDays || 7), startDate: v.startDate, pattern: [v.shift1, v.shift2, v.shift3].filter(Boolean).map((shiftId) => ({ shiftId })) })} />
      <Modal open={!!apply} onClose={() => setApply(null)} title={t('shifts.applyRotation')} footer={<button type="submit" form="rot-form" className="btn-primary" disabled={send.isPending}>{t('common.apply')}</button>}>
        {apply && <ResourceForm id="rot-form" defaultValues={{}} onSubmit={(v) => send.mutate(v)} fields={[
          { name: 'from', label: t('common.from'), type: 'date', required: true }, { name: 'to', label: t('common.to'), type: 'date', required: true },
          { name: 'employeeIds', label: t('fields.employees'), type: 'multiselect', required: true, source: { url: '/employees?pageSize=200', label: (x) => `${x.employeeNumber} — ${empName(x)}` } },
        ]} />}
      </Modal>
      <AssignResult result={result} onClose={() => setResult(null)} />
    </>
  );
}

export function Coverage() {
  const { t } = useTranslation();
  const days = t('enums.weekday', { returnObjects: true });
  return (
    <ResourcePage title={t('nav.coverage')} endpoint="/shifts/coverage" perms={{ create: 'shifts.create', edit: 'shifts.edit', delete: 'shifts.edit' }} breadcrumbs={crumbs(t, t('nav.coverage'))}
      columns={[{ key: 's', header: t('fields.shift'), render: (r) => `${r.shift?.code} — ${nm(r.shift)}` }, { key: 'd', header: t('fields.dayOfWeek'), render: (r) => (r.dayOfWeek == null ? t('common.all') : days[r.dayOfWeek]) }, { key: 'm', header: t('fields.minEmployees'), render: (r) => r.minEmployees }]}
      fields={[
        { name: 'branchId', label: t('common.branch'), type: 'select', required: true, source: { url: '/organization/branches', label: nm } },
        { name: 'shiftId', label: t('fields.shift'), type: 'select', required: true, source: { url: '/shifts/definitions', label: (s) => s.code } },
        { name: 'dayOfWeek', label: t('fields.dayOfWeek'), type: 'select', placeholder: t('common.all'), options: days.map((d, i) => ({ value: String(i), label: d })) },
        { name: 'minEmployees', label: t('fields.minEmployees'), type: 'number', integer: true, required: true, min: 1 },
      ]}
      transformIn={(r) => ({ ...r, dayOfWeek: r.dayOfWeek == null ? '' : String(r.dayOfWeek) })}
      transformOut={(v) => ({ ...v, dayOfWeek: v.dayOfWeek === null || v.dayOfWeek === '' ? null : Number(v.dayOfWeek), minEmployees: Number(v.minEmployees) })} />
  );
}
