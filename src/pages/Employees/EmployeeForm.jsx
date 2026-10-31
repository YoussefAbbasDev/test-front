import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { PageHeader, Card } from '../../components/common/Display';
import { LoadingState } from '../../components/common/Feedback';
import ResourceForm from '../../components/forms/ResourceForm';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { empName, nm, ttl } from '../../utils/format';

const ibanPattern = /^$|^[A-Za-z]{2}\d{2}[A-Za-z0-9 ]{10,34}$/;

export default function EmployeeForm() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useAuth();
  const isNew = !id;
  const existing = useGet(['employee', id], id ? `/employees/${id}` : null);
  const comps = useOptions('/payroll/components', can('employees.financial'));
  const e = (k, keys) => keys.map((x) => ({ value: x, label: t(`enums.${k}.${x}`) }));
  const src = (url, label) => ({ url, label });

  const personal = [
    { name: 'firstName', label: t('fields.firstName'), required: true },
    { name: 'middleName', label: t('fields.middleName') },
    { name: 'lastName', label: t('fields.lastName'), required: true },
    { name: 'fullNameAr', label: t('fields.fullNameAr') },
    { name: 'fullNameEn', label: t('fields.fullNameEn') },
    { name: 'gender', label: t('fields.gender'), type: 'select', options: e('gender', ['MALE', 'FEMALE']) },
    { name: 'dateOfBirth', label: t('fields.dateOfBirth'), type: 'date' },
    { name: 'nationality', label: t('fields.nationality') },
    { name: 'maritalStatus', label: t('fields.maritalStatus'), type: 'select', options: e('maritalStatus', ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']) },
    { name: 'nationalId', label: t('fields.nationalId'), ltr: true },
    { name: 'passportNumber', label: t('fields.passportNumber'), ltr: true },
    { name: 'passportExpiry', label: t('fields.passportExpiry'), type: 'date' },
    { name: 'mobile', label: t('fields.mobile'), ltr: true, pattern: /^$|^[+\d\s()-]{6,30}$/ },
    { name: 'altMobile', label: t('fields.altMobile'), ltr: true, pattern: /^$|^[+\d\s()-]{6,30}$/ },
    { name: 'email', label: t('fields.email'), type: 'email', ltr: true },
    { name: 'country', label: t('fields.country') },
    { name: 'city', label: t('fields.city') },
    { name: 'address', label: t('fields.address'), type: 'textarea' },
  ];
  const employment = [
    { name: 'employeeNumber', label: t('fields.employeeNumber'), hint: isNew ? 'EMP-0001 …' : undefined, ltr: true },
    { name: 'hireDate', label: t('fields.hireDate'), type: 'date', required: true },
    { name: 'branchId', label: t('common.branch'), type: 'select', source: src('/organization/branches', nm) },
    { name: 'departmentId', label: t('common.department'), type: 'select', source: { url: '/organization/departments', label: nm, filter: (d) => d.type !== 'SECTION' } },
    { name: 'sectionId', label: t('fields.section'), type: 'select', source: { url: '/organization/departments', label: nm, filter: (d) => d.type === 'SECTION' } },
    { name: 'teamId', label: t('fields.team'), type: 'select', source: src('/organization/teams', nm) },
    { name: 'positionId', label: t('fields.position'), type: 'select', source: src('/organization/positions', ttl) },
    { name: 'gradeId', label: t('fields.grade'), type: 'select', source: src('/organization/grades', (g) => `${g.code} — ${g.name}`) },
    { name: 'managerId', label: t('fields.manager'), type: 'select', source: { url: '/employees?pageSize=200', label: (x) => `${x.employeeNumber} — ${empName(x)}`, filter: (x) => x.id !== id } },
    { name: 'employmentType', label: t('fields.employmentType'), type: 'select', options: e('employmentType', ['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY', 'INTERN']), default: 'FULL_TIME', placeholder: false },
    { name: 'contractType', label: t('fields.contractType'), type: 'select', options: e('contractType', ['LIMITED', 'UNLIMITED', 'PROJECT', 'SEASONAL']), default: 'LIMITED', placeholder: false },
    { name: 'workLocation', label: t('fields.workLocation') },
    { name: 'probationStart', label: t('fields.probationStart'), type: 'date' },
    { name: 'probationEnd', label: t('fields.probationEnd'), type: 'date' },
    { name: 'contractStart', label: t('fields.contractStart'), type: 'date' },
    { name: 'contractEnd', label: t('fields.contractEnd'), type: 'date' },
    { name: 'noticePeriodDays', label: t('fields.noticePeriodDays'), type: 'number', integer: true, min: 0 },
    { name: 'defaultShiftId', label: t('fields.defaultShift'), type: 'select', source: src('/shifts/definitions', (s) => `${nm(s)} (${s.startTime}–${s.endTime})`) },
    { name: 'attendancePolicyId', label: t('fields.attendancePolicy'), type: 'select', source: src('/attendance/policies', (p) => p.name) },
    { name: 'jobLevel', label: t('fields.jobLevel') },
  ];
  const financial = can('employees.financial') ? [
    { name: 'paymentFrequency', label: t('fields.paymentFrequency'), type: 'select', options: e('frequency', ['MONTHLY', 'WEEKLY', 'BIWEEKLY']), default: 'MONTHLY', placeholder: false },
    { name: 'paymentMethod', label: t('fields.paymentMethod'), type: 'select', options: e('paymentMethod', ['BANK', 'CASH', 'CHEQUE']), default: 'BANK', placeholder: false },
    { name: 'bankName', label: t('fields.bankName') },
    { name: 'iban', label: t('fields.iban'), ltr: true, pattern: ibanPattern, patternMessage: t('fields.iban') },
    { name: 'accountHolder', label: t('fields.accountHolder') },
    { name: 'salaryStructureId', label: t('fields.salaryStructure'), type: 'select', source: src('/payroll/structures', (s) => s.name) },
    { name: 'gosiApplicable', label: t('fields.gosiApplicable'), type: 'checkbox' },
    { name: 'gosiNumber', label: t('fields.gosiNumber'), ltr: true },
  ] : [];
  const salaryComps = (comps.data?.items || []).filter((c) => c.type === 'EARNING' && c.calculationMethod === 'EMPLOYEE_AMOUNT');
  const salary = isNew && can('employees.financial') ? [
    { name: '_salaryEffective', label: t('fields.effectiveFrom'), type: 'date', hint: t('fields.hireDate') },
    ...salaryComps.map((c) => ({ name: `_salary_${c.id}`, label: nm(c), type: 'number', min: 0 })),
  ] : [];
  const emergency = isNew ? [
    { name: '_emName', label: t('fields.emergencyName') }, { name: '_emRel', label: t('fields.emergencyRelationship') }, { name: '_emPhone', label: t('fields.emergencyPhone'), ltr: true },
  ] : [];
  const all = useMemo(() => [...personal, ...employment, ...financial, ...salary, ...emergency], [comps.data, t, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useSend(isNew ? 'post' : 'put', isNew ? '/employees' : `/employees/${id}`, {
    invalidate: ['employees', ['employee', id]],
    onSuccess: (emp) => navigate(`/employees/${emp.id}`),
  });

  const submit = (v) => {
    const payload = {};
    for (const [k, val] of Object.entries(v)) if (!k.startsWith('_')) payload[k] = val;
    if (payload.iban) payload.iban = payload.iban.replace(/\s/g, '').toUpperCase();
    if (isNew) {
      const lines = salaryComps.filter((c) => v[`_salary_${c.id}`] !== null && v[`_salary_${c.id}`] !== '' && v[`_salary_${c.id}`] !== undefined).map((c) => ({ componentId: c.id, amount: String(v[`_salary_${c.id}`]) }));
      if (lines.length) payload.salary = { effectiveFrom: v._salaryEffective || v.hireDate, lines };
      if (v._emName && v._emPhone) payload.emergencyContact = { name: v._emName, relationship: v._emRel || '-', phone: v._emPhone };
      for (const k of Object.keys(payload)) if (payload[k] === null) delete payload[k];
    }
    if (!can('employees.financial')) for (const f of ['paymentFrequency', 'paymentMethod', 'bankName', 'iban', 'accountHolder', 'gosiApplicable', 'gosiNumber', 'salaryStructureId']) delete payload[f];
    save.mutate(payload);
  };

  if (!isNew && existing.isLoading) return <LoadingState />;
  return (
    <div>
      <PageHeader title={isNew ? t('employees.newTitle') : `${t('employees.editTitle')} — ${empName(existing.data)}`}
        breadcrumbs={[{ label: t('nav.employees'), to: '/employees' }, { label: isNew ? t('employees.newTitle') : empName(existing.data) }]}
        actions={<button type="submit" form="employee-form" className="btn-primary" disabled={save.isPending}><Save className="h-4 w-4" />{t('common.save')}</button>} />
      <Card>
        <ResourceForm id="employee-form" fields={all} columns={3} defaultValues={existing.data || {}} onSubmit={submit} />
      </Card>
      <p className="mt-3 text-xs text-ink-muted">{isNew ? t('employees.salaryHint') : t('employees.transferHint')}</p>
    </div>
  );
}
