import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, KeyRound, Copy } from 'lucide-react';
import ResourcePage from '../ResourcePage';
import { PageHeader, StatusBadge } from '../../components/common/Display';
import { Modal } from '../../components/common/Overlay';
import DataTable from '../../components/tables/DataTable';
import ResourceForm from '../../components/forms/ResourceForm';
import { useGet, useSend } from '../../hooks/useApi';
import { dateTime, nm } from '../../utils/format';

const perms = { create: 'attendance.settings', edit: 'attendance.settings', delete: 'attendance.settings' };
const crumbs = (t, label) => [{ label: t('nav.attendance'), to: '/attendance' }, { label }];
const METHODS = ['GPS', 'QR', 'KIOSK', 'MANUAL', 'BIOMETRIC', 'NFC', 'FACE'];

export function Policies() {
  const { t } = useTranslation();
  const yes = (v) => (v ? t('common.yes') : t('common.no'));
  return (
    <ResourcePage title={t('nav.policies')} endpoint="/attendance/policies" perms={perms} breadcrumbs={crumbs(t, t('nav.policies'))} formColumns={3}
      columns={[
        { key: 'name', header: t('common.name') }, { key: 'scope', header: t('fields.dataScope'), render: (r) => r.scope }, { key: 'def', header: '★', render: (r) => (r.isDefault ? '★' : '') },
        { key: 'grace', header: t('fields.graceMinutes'), render: (r) => r.graceMinutes }, { key: 'ot', header: t('fields.overtime'), render: (r) => yes(r.overtimeEnabled) },
        { key: 'geo', header: t('nav.locations'), render: (r) => yes(r.requireGeofence) }, { key: 'm', header: t('attendance.methodsAllowed'), render: (r) => (r.allowedMethods || []).join(', ') },
      ]}
      fields={[
        { name: 'name', label: t('common.name'), required: true }, { name: 'scope', label: t('fields.dataScope'), type: 'select', placeholder: false, default: 'COMPANY', options: ['COMPANY', 'BRANCH', 'DEPARTMENT', 'GROUP'].map((v) => ({ value: v, label: v })) },
        { name: 'isDefault', label: t('cfg.isDefault'), type: 'checkbox' },
        { name: 'branchId', label: t('common.branch'), type: 'select', source: { url: '/organization/branches', label: nm }, show: (v) => v.scope === 'BRANCH' },
        { name: 'departmentId', label: t('common.department'), type: 'select', source: { url: '/organization/departments', label: nm }, show: (v) => v.scope === 'DEPARTMENT' },
        { name: 'graceMinutes', label: t('fields.graceMinutes'), type: 'number', integer: true, min: 0, default: 10 }, { name: 'earlyLeaveGraceMinutes', label: `${t('fields.earlyLeave')} — grace`, type: 'number', integer: true, min: 0, default: 5 },
        { name: 'halfDayThresholdMinutes', label: `${t('status.HALF_DAY')} (late > min)`, type: 'number', integer: true, min: 0 }, { name: 'minWorkingMinutes', label: t('cfg.minWorkingMinutes'), type: 'number', integer: true, min: 0 },
        { name: 'breakMinutes', label: t('fields.breakMinutes'), type: 'number', integer: true, min: 0, default: 60 }, { name: 'lateCountFromShiftStart', label: t('cfg.lateFromStart'), type: 'checkbox', default: true },
        { name: 'overtimeEnabled', label: t('fields.overtime'), type: 'checkbox', default: true }, { name: 'overtimeMinMinutes', label: t('cfg.otMin'), type: 'number', integer: true, min: 0, default: 30 },
        { name: 'overtimeRequiresApproval', label: t('cfg.otApproval'), type: 'checkbox', default: true }, { name: 'weekendWorkIsOvertime', label: t('cfg.weekendOt'), type: 'checkbox', default: true },
        { name: 'holidayWorkIsOvertime', label: t('cfg.holidayOt'), type: 'checkbox', default: true },
        { name: 'missingCheckoutAction', label: t('attendance.missingCheckouts'), type: 'select', placeholder: false, default: 'MARK_INCOMPLETE', options: [{ value: 'MARK_INCOMPLETE', label: t('status.INCOMPLETE') }, { value: 'AUTO_SHIFT_END', label: t('cfg.autoCheckout') }] },
        { name: 'allowMultipleSessions', label: t('cfg.multiSessions'), type: 'checkbox', default: true }, { name: 'correctionWindowDays', label: t('cfg.correctionWindow'), type: 'number', integer: true, min: 0, default: 7 },
        { name: 'requireGeofence', label: t('cfg.requireGeofence'), type: 'checkbox', default: true }, { name: 'rejectOutsideGeofence', label: t('cfg.rejectOutside'), type: 'checkbox', default: true },
        { name: 'maxGpsAccuracyMeters', label: t('cfg.maxAccuracy'), type: 'number', integer: true, min: 5, default: 100 }, { name: 'minMinutesBetweenEvents', label: t('cfg.minBetween'), type: 'number', integer: true, min: 0, default: 1 },
        { name: 'allowedMethods', label: t('attendance.methodsAllowed'), type: 'multiselect', required: true, default: ['GPS', 'QR', 'KIOSK', 'MANUAL'], options: METHODS.map((m) => ({ value: m, label: t(`enums.method.${m}`) })) },
      ]} />
  );
}

export function Locations() {
  const { t } = useTranslation();
  return (
    <ResourcePage title={t('nav.locations')} endpoint="/attendance/locations" perms={perms} breadcrumbs={crumbs(t, t('nav.locations'))}
      columns={[
        { key: 'name', header: t('common.name') }, { key: 'branch', header: t('common.branch'), render: (r) => nm(r.branch) || '—' }, { key: 'type', header: t('common.type') },
        { key: 'coords', header: `${t('fields.latitude')}, ${t('fields.longitude')}`, render: (r) => <span dir="ltr" className="font-mono text-xs">{Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)}</span> },
        { key: 'radius', header: t('fields.radiusMeters'), render: (r) => r.radiusMeters }, { key: 'active', header: t('common.status'), render: (r) => <StatusBadge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
      ]}
      fields={[
        { name: 'name', label: t('common.name'), required: true }, { name: 'branchId', label: t('common.branch'), type: 'select', source: { url: '/organization/branches', label: nm } },
        { name: 'type', label: t('common.type'), type: 'select', placeholder: false, default: 'BRANCH', options: ['BRANCH', 'FIELD', 'CUSTOMER_SITE'].map((v) => ({ value: v, label: v })) },
        { name: 'radiusMeters', label: t('fields.radiusMeters'), type: 'number', integer: true, required: true, min: 10, default: 150 },
        { name: 'latitude', label: t('fields.latitude'), type: 'number', required: true }, { name: 'longitude', label: t('fields.longitude'), type: 'number', required: true },
        { name: 'isActive', label: t('common.active'), type: 'checkbox', default: true },
      ]} />
  );
}

export function Devices() {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [key, setKey] = useState(null);
  const q = useGet(['devices'], '/attendance/devices');
  const create = useSend('post', '/attendance/devices', { invalidate: ['devices'], onSuccess: (d) => { setCreating(false); setKey(d.apiKey); } });
  const rotate = useSend('post', (d) => `/attendance/devices/${d.id}/rotate-key`, { invalidate: ['devices'], onSuccess: (d) => setKey(d.apiKey) });
  const toggle = useSend('patch', (d) => `/attendance/devices/${d.id}`, { invalidate: ['devices'] });
  return (
    <div>
      <PageHeader title={t('nav.devices')} description={t('attendance.faceNotice')} breadcrumbs={crumbs(t, t('nav.devices'))}
        actions={<button type="button" className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />{t('common.add')}</button>} />
      <div className="card">
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} columns={[
          { key: 'name', header: t('common.name') }, { key: 'type', header: t('common.type'), render: (r) => t(`enums.method.${r.type}`) || r.type },
          { key: 'key', header: t('attendance.deviceKey'), render: (r) => <span className="font-mono text-xs" dir="ltr">{r.apiKeyPrefix}…</span> },
          { key: 'seen', header: 'Last seen', render: (r) => dateTime(r.lastSeenAt) }, { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED'} /> },
          { key: 'a', header: '', render: (r) => (
            <div className="flex justify-end gap-1">
              <button type="button" className="btn-ghost btn-sm" onClick={() => rotate.mutate(r)}><KeyRound className="h-4 w-4" /></button>
              <button type="button" className="btn-outline btn-sm" onClick={() => toggle.mutate({ id: r.id, status: r.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })}>{r.status === 'ACTIVE' ? t('status.DISABLED') : t('common.active')}</button>
            </div>
          ) },
        ]} />
      </div>
      <Modal open={creating} onClose={() => setCreating(false)} title={t('nav.devices')} footer={<button type="submit" form="dev-form" className="btn-primary">{t('common.create')}</button>}>
        <ResourceForm id="dev-form" defaultValues={{ type: 'KIOSK' }} onSubmit={(v) => create.mutate(v)} fields={[
          { name: 'name', label: t('common.name'), required: true }, { name: 'type', label: t('common.type'), type: 'select', placeholder: false, options: ['KIOSK', 'BIOMETRIC', 'NFC', 'FACE'].map((v) => ({ value: v, label: t(`enums.method.${v}`) })) },
          { name: 'branchId', label: t('common.branch'), type: 'select', source: { url: '/organization/branches', label: nm } }, { name: 'serial', label: t('cfg.serial'), ltr: true },
        ]} />
      </Modal>
      <Modal open={!!key} onClose={() => setKey(null)} size="sm" title={t('attendance.deviceKey')}>
        <p className="mb-3 text-sm text-warning">{t('attendance.deviceCreated')}</p>
        <div className="flex gap-2"><input readOnly className="input font-mono text-xs" dir="ltr" value={key || ''} /><button type="button" className="btn-outline" onClick={() => navigator.clipboard?.writeText(key)}><Copy className="h-4 w-4" /></button></div>
        <p className="mt-3 text-xs text-ink-muted">/kiosk</p>
      </Modal>
    </div>
  );
}
