import { useTranslation } from 'react-i18next';
import ResourcePage, { statusColumn } from '../ResourcePage';
import { money, nm, ttl, empName } from '../../utils/format';

const perms = { create: 'organization.create', edit: 'organization.edit', delete: 'organization.delete' };
const status = (t) => ({ name: 'status', label: t('common.status'), type: 'select', placeholder: false, default: 'ACTIVE', options: [{ value: 'ACTIVE', label: t('status.ACTIVE') }, { value: 'INACTIVE', label: t('status.INACTIVE') }] });
const empSrc = { url: '/employees?pageSize=200', label: (x) => `${x.employeeNumber} — ${empName(x)}` };
const crumbs = (t, label) => [{ label: t('nav.organization'), to: '/organization' }, { label }];

export function Branches() {
  const { t } = useTranslation();
  return (
    <ResourcePage title={t('nav.branches')} endpoint="/organization/branches" perms={perms} exportable breadcrumbs={crumbs(t, t('nav.branches'))}
      columns={[
        { key: 'code', header: t('common.code'), sortKey: 'code' }, { key: 'name', header: t('common.name'), render: (r) => nm(r) }, { key: 'city', header: t('fields.city') },
        { key: 'manager', header: t('fields.manager'), render: (r) => empName(r.manager) || '—' }, { key: 'count', header: t('fields.employees'), render: (r) => r._count?.employees ?? 0 }, statusColumn(t),
      ]}
      fields={[
        { name: 'code', label: t('common.code'), required: true, ltr: true }, { name: 'nameAr', label: t('fields.nameAr'), required: true }, { name: 'nameEn', label: t('fields.nameEn'), required: true },
        { name: 'city', label: t('fields.city') }, { name: 'phone', label: t('fields.phone'), ltr: true }, { name: 'address', label: t('fields.address') },
        { name: 'latitude', label: t('fields.latitude'), type: 'number' }, { name: 'longitude', label: t('fields.longitude'), type: 'number' },
        { name: 'managerId', label: t('fields.manager'), type: 'select', source: empSrc }, status(t),
      ]} />
  );
}

export function Departments() {
  const { t } = useTranslation();
  const types = ['EXECUTIVE', 'DEPARTMENT', 'SECTION'].map((v) => ({ value: v, label: t(`enums.unitType.${v}`) }));
  return (
    <ResourcePage title={t('nav.departments')} endpoint="/organization/departments" perms={perms} exportable breadcrumbs={crumbs(t, t('nav.departments'))}
      filters={[{ key: 'type', label: t('common.type'), options: types }]}
      columns={[
        { key: 'code', header: t('common.code'), sortKey: 'code' }, { key: 'name', header: t('common.name'), render: (r) => nm(r) }, { key: 'type', header: t('common.type'), render: (r) => t(`enums.unitType.${r.type}`) },
        { key: 'parent', header: t('fields.parent'), render: (r) => nm(r.parent) || '—' }, { key: 'manager', header: t('fields.manager'), render: (r) => empName(r.manager) || '—' },
        { key: 'count', header: t('fields.employees'), render: (r) => r._count?.employees ?? 0 }, statusColumn(t),
      ]}
      fields={[
        { name: 'code', label: t('common.code'), required: true, ltr: true }, { name: 'type', label: t('common.type'), type: 'select', options: types, default: 'DEPARTMENT', placeholder: false },
        { name: 'nameAr', label: t('fields.nameAr'), required: true }, { name: 'nameEn', label: t('fields.nameEn'), required: true },
        { name: 'parentId', label: t('fields.parent'), type: 'select', source: { url: '/organization/departments', label: nm } },
        { name: 'branchId', label: t('common.branch'), type: 'select', source: { url: '/organization/branches', label: nm } },
        { name: 'managerId', label: t('fields.manager'), type: 'select', source: empSrc }, { name: 'sortOrder', label: t('fields.sortOrder'), type: 'number', integer: true },
        { name: 'description', label: t('common.description'), type: 'textarea' }, status(t),
      ]} />
  );
}

export function Teams() {
  const { t } = useTranslation();
  return (
    <ResourcePage title={t('nav.teams')} endpoint="/organization/teams" perms={perms} breadcrumbs={crumbs(t, t('nav.teams'))}
      columns={[
        { key: 'code', header: t('common.code') }, { key: 'name', header: t('common.name'), render: (r) => nm(r) }, { key: 'dept', header: t('common.department'), render: (r) => nm(r.department) },
        { key: 'leader', header: t('fields.manager'), render: (r) => empName(r.leader) || '—' }, { key: 'count', header: t('fields.employees'), render: (r) => r._count?.employees ?? 0 }, statusColumn(t),
      ]}
      fields={[
        { name: 'code', label: t('common.code'), required: true, ltr: true }, { name: 'departmentId', label: t('common.department'), type: 'select', required: true, source: { url: '/organization/departments', label: nm } },
        { name: 'nameAr', label: t('fields.nameAr'), required: true }, { name: 'nameEn', label: t('fields.nameEn'), required: true },
        { name: 'leaderId', label: t('fields.manager'), type: 'select', source: empSrc }, status(t),
      ]} />
  );
}

export function Positions() {
  const { t } = useTranslation();
  return (
    <ResourcePage title={t('nav.positions')} endpoint="/organization/positions" perms={perms} exportable breadcrumbs={crumbs(t, t('nav.positions'))}
      columns={[
        { key: 'code', header: t('common.code'), sortKey: 'code' }, { key: 'title', header: t('fields.jobTitle'), render: (r) => ttl(r) }, { key: 'dept', header: t('common.department'), render: (r) => nm(r.department) || '—' },
        { key: 'grade', header: t('fields.grade'), render: (r) => r.grade?.code || '—' }, { key: 'level', header: t('fields.level'), render: (r) => r.level ?? '—' },
        { key: 'range', header: t('fields.salaryRange'), render: (r) => (r.salaryMin || r.salaryMax ? `${money(r.salaryMin)} – ${money(r.salaryMax)}` : '—') },
        { key: 'count', header: t('fields.employees'), render: (r) => r._count?.employees ?? 0 },
      ]}
      fields={[
        { name: 'code', label: t('common.code'), required: true, ltr: true }, { name: 'titleAr', label: t('fields.titleAr'), required: true }, { name: 'titleEn', label: t('fields.titleEn'), required: true },
        { name: 'departmentId', label: t('common.department'), type: 'select', source: { url: '/organization/departments', label: nm } },
        { name: 'gradeId', label: t('fields.grade'), type: 'select', source: { url: '/organization/grades', label: (g) => `${g.code} — ${g.name}` } },
        { name: 'reportsToPositionId', label: t('fields.manager'), type: 'select', source: { url: '/organization/positions', label: ttl } },
        { name: 'level', label: t('fields.level'), type: 'number', integer: true }, { name: 'salaryMin', label: t('fields.salaryMin'), type: 'number', min: 0 }, { name: 'salaryMax', label: t('fields.salaryMax'), type: 'number', min: 0 },
        { name: 'description', label: t('common.description'), type: 'textarea' }, { name: 'requiredSkills', label: t('fields.requiredSkills'), type: 'textarea' },
      ]} />
  );
}

export function Grades() {
  const { t } = useTranslation();
  return (
    <ResourcePage title={t('nav.grades')} endpoint="/organization/grades" perms={perms} breadcrumbs={crumbs(t, t('nav.grades'))} defaultSort="level"
      columns={[{ key: 'code', header: t('common.code') }, { key: 'name', header: t('common.name') }, { key: 'level', header: t('fields.level'), sortKey: 'level' }, { key: 'min', header: t('fields.salaryMin'), render: (r) => money(r.minSalary) }, { key: 'max', header: t('fields.salaryMax'), render: (r) => money(r.maxSalary) }]}
      fields={[{ name: 'code', label: t('common.code'), required: true, ltr: true }, { name: 'name', label: t('common.name'), required: true }, { name: 'level', label: t('fields.level'), type: 'number', integer: true, required: true, min: 1 }, { name: 'minSalary', label: t('fields.salaryMin'), type: 'number', min: 0 }, { name: 'maxSalary', label: t('fields.salaryMax'), type: 'number', min: 0 }]} />
  );
}
