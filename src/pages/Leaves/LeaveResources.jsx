import { useTranslation } from 'react-i18next';
import ResourcePage, { statusColumn } from '../ResourcePage';
import { date, nm } from '../../utils/format';

const perms = { create: 'leaves.settings', edit: 'leaves.settings', delete: 'leaves.settings' };
const crumbs = (t, label) => [{ label: t('nav.leaves'), to: '/leaves' }, { label }];
const CATS = ['ANNUAL', 'SICK', 'EMERGENCY', 'MARRIAGE', 'BEREAVEMENT', 'MATERNITY', 'PATERNITY', 'UNPAID', 'PUBLIC_HOLIDAY', 'CUSTOM'];

export function LeaveTypes() {
  const { t } = useTranslation();
  return (
    <ResourcePage title={t('nav.types')} endpoint="/leaves/types" perms={perms} breadcrumbs={crumbs(t, t('nav.types'))}
      columns={[
        { key: 'c', header: '', render: (r) => <span className="inline-block h-3 w-3 rounded-full" style={{ background: r.color }} /> }, { key: 'code', header: t('common.code') },
        { key: 'name', header: t('common.name'), render: (r) => nm(r) }, { key: 'cat', header: t('fields.category'), render: (r) => t(`enums.leaveCategory.${r.category}`) },
        { key: 'paid', header: t('fields.isPaid'), render: (r) => (r.isPaid ? `${Number(r.payPercent)}%` : t('common.no')) }, statusColumn(t),
      ]}
      fields={[
        { name: 'code', label: t('common.code'), required: true, ltr: true }, { name: 'category', label: t('fields.category'), type: 'select', placeholder: false, default: 'CUSTOM', options: CATS.map((c) => ({ value: c, label: t(`enums.leaveCategory.${c}`) })) },
        { name: 'nameAr', label: t('fields.nameAr'), required: true }, { name: 'nameEn', label: t('fields.nameEn'), required: true },
        { name: 'isPaid', label: t('fields.isPaid'), type: 'checkbox', default: true }, { name: 'payPercent', label: t('fields.payPercent'), type: 'number', min: 0, default: 100 },
        { name: 'color', label: t('fields.color'), type: 'color', default: '#5A4293' },
        { name: 'status', label: t('common.status'), type: 'select', placeholder: false, default: 'ACTIVE', options: [{ value: 'ACTIVE', label: t('status.ACTIVE') }, { value: 'INACTIVE', label: t('status.INACTIVE') }] },
      ]}
      transformOut={(v) => ({ ...v, payPercent: Number(v.payPercent ?? 100) })} />
  );
}

export function LeavePolicies() {
  const { t } = useTranslation();
  return (
    <ResourcePage title={t('nav.policies')} endpoint="/leaves/policies" perms={perms} breadcrumbs={crumbs(t, t('nav.policies'))} formColumns={3}
      columns={[
        { key: 'name', header: t('common.name') }, { key: 'type', header: t('fields.leaveType'), render: (r) => nm(r.leaveType) },
        { key: 'ent', header: t('fields.annualEntitlement'), render: (r) => Number(r.annualEntitlement) }, { key: 'acc', header: t('fields.accrualMethod'), render: (r) => t(`enums.accrual.${r.accrualMethod}`) },
        { key: 'cf', header: t('fields.carryForwardMax'), render: (r) => (r.carryForwardMax != null ? Number(r.carryForwardMax) : '—') }, { key: 'eff', header: t('fields.effectiveFrom'), render: (r) => date(r.effectiveFrom) }, statusColumn(t),
      ]}
      fields={[
        { name: 'name', label: t('common.name'), required: true }, { name: 'leaveTypeId', label: t('fields.leaveType'), type: 'select', required: true, source: { url: '/leaves/types', label: nm } },
        { name: 'effectiveFrom', label: t('fields.effectiveFrom'), type: 'date', required: true }, { name: 'effectiveTo', label: t('fields.endDate'), type: 'date' },
        { name: 'annualEntitlement', label: t('fields.annualEntitlement'), type: 'number', required: true, min: 0 },
        { name: 'accrualMethod', label: t('fields.accrualMethod'), type: 'select', placeholder: false, default: 'UPFRONT', options: ['UPFRONT', 'MONTHLY', 'NONE'].map((v) => ({ value: v, label: t(`enums.accrual.${v}`) })) },
        { name: 'carryForwardMax', label: t('fields.carryForwardMax'), type: 'number', min: 0 }, { name: 'maxBalance', label: t('fields.maxBalance'), type: 'number', min: 0 },
        { name: 'minRequestDays', label: t('fields.minRequestDays'), type: 'number', min: 0 }, { name: 'maxRequestDays', label: t('fields.maxRequestDays'), type: 'number', min: 0 },
        { name: 'attachmentAfterDays', label: `${t('fields.attachmentRequired')} (> ${t('leaves.days')})`, type: 'number', min: 0 },
        { name: 'minServiceMonths', label: t('cfg.minService'), type: 'number', integer: true, min: 0 },
        { name: 'genderRestriction', label: t('fields.gender'), type: 'select', options: [{ value: 'MALE', label: t('enums.gender.MALE') }, { value: 'FEMALE', label: t('enums.gender.FEMALE') }] },
        { name: 'workflowId', label: t('nav.workflows'), type: 'select', source: { url: '/settings/workflows', label: (w) => w.name, filter: (w) => w.entityType === 'LEAVE' } },
        { name: 'attachmentRequired', label: t('fields.attachmentRequired'), type: 'checkbox' }, { name: 'countWeekends', label: t('fields.countWeekends'), type: 'checkbox' },
        { name: 'countHolidays', label: t('fields.countHolidays'), type: 'checkbox' }, { name: 'requiresBalance', label: t('fields.requiresBalance'), type: 'checkbox', default: true },
        { name: 'allowNegativeBalance', label: t('fields.allowNegativeBalance'), type: 'checkbox' }, { name: 'reserveOnPending', label: `${t('fields.pending')} → reserved`, type: 'checkbox', default: true },
        { name: 'prorateFirstYear', label: `${t('fields.prorate')} (1st year)`, type: 'checkbox', default: true }, { name: 'allowCancellationAfterStart', label: `${t('leaves.cancelLeave')} after start`, type: 'checkbox' },
        { name: 'applicableBranchIds', label: t('nav.branches'), type: 'multiselect', source: { url: '/organization/branches', label: nm } },
        { name: 'applicableEmploymentTypes', label: t('fields.employmentType'), type: 'multiselect', options: ['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY', 'INTERN'].map((v) => ({ value: v, label: t(`enums.employmentType.${v}`) })) },
      ]}
      transformOut={(v) => ({ ...v, minServiceMonths: v.minServiceMonths === null ? null : Number(v.minServiceMonths), applicableBranchIds: v.applicableBranchIds?.length ? v.applicableBranchIds : null, applicableEmploymentTypes: v.applicableEmploymentTypes?.length ? v.applicableEmploymentTypes : null })} />
  );
}

export function Holidays() {
  const { t } = useTranslation();
  return (
    <ResourcePage title={t('nav.holidays')} endpoint="/attendance/holidays" perms={perms} breadcrumbs={crumbs(t, t('nav.holidays'))} defaultSort="date"
      columns={[{ key: 'd', header: t('common.date'), sortKey: 'date', render: (r) => date(r.date) }, { key: 'n', header: t('common.name'), render: (r) => nm(r) }, { key: 'p', header: t('fields.isPaid'), render: (r) => (r.isPaid ? t('common.yes') : t('common.no')) }]}
      fields={[
        { name: 'date', label: t('common.date'), type: 'date', required: true }, { name: 'nameAr', label: t('fields.nameAr'), required: true }, { name: 'nameEn', label: t('fields.nameEn'), required: true },
        { name: 'branchId', label: t('common.branch'), type: 'select', placeholder: t('common.all'), source: { url: '/organization/branches', label: nm } }, { name: 'isPaid', label: t('fields.isPaid'), type: 'checkbox', default: true },
      ]} />
  );
}
