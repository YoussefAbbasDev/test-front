import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Activity, Briefcase, Camera, CalendarCheck, ChevronDown, Clock, HandCoins, Pencil, Percent, Plane, Wallet, Download } from 'lucide-react';
import { PageHeader, Avatar, StatusBadge, Tabs, Card, InfoGrid, StatCard, ActivityTimeline } from '../../components/common/Display';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/Feedback';
import { Modal, ConfirmDialog } from '../../components/common/Overlay';
import DataTable from '../../components/tables/DataTable';
import ResourceForm from '../../components/forms/ResourceForm';
import { Field, Input } from '../../components/forms/Fields';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { api, download, notifyError } from '../../services/api';
import { date, empName, money, nm, ttl, today, minutes, time } from '../../utils/format';
import dayjs from 'dayjs';

const STATUS_ACTIONS = ['suspend', 'reactivate', 'resign', 'terminate', 'archive'];

function ActionsMenu({ emp, onAction }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const items = [
    can('employees.edit') && ['transfer', 'employees.actions.transfer'],
    can('employees.edit') && ['changeManager', 'employees.actions.changeManager'],
    can('employees.financial') && ['changeSalary', 'employees.actions.changeSalary'],
    (can('employees.documents') || can('employees.edit')) && ['uploadDocument', 'employees.actions.uploadDocument'],
    can('attendance.manual') && ['setPin', 'employees.actions.setPin'],
    ...(can('employees.edit') ? STATUS_ACTIONS.map((a) => [a, `employees.actions.${a}`]) : []),
    can('employees.delete') && ['delete', 'employees.actions.delete'],
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="relative">
      <button type="button" className="btn-outline" onClick={() => setOpen((o) => !o)}>{t('common.actions')}<ChevronDown className="h-4 w-4" /></button>
      {open && (
        <div className="absolute end-0 z-30 mt-1 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop" onMouseLeave={() => setOpen(false)}>
          {items.map(([k, label]) => (
            <button key={k} type="button" className={`block w-full px-4 py-2 text-start text-sm hover:bg-canvas ${['terminate', 'delete', 'suspend'].includes(k) ? 'text-danger' : 'text-ink-soft'}`}
              onClick={() => { setOpen(false); onAction(k); }}>{t(label)}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function SalaryModal({ emp, open, onClose }) {
  const { t } = useTranslation();
  const comps = useOptions('/payroll/components');
  const current = useGet(['salary', emp.id], `/employees/${emp.id}/salary`);
  const earnings = (comps.data?.items || []).filter((c) => c.calculationMethod === 'EMPLOYEE_AMOUNT');
  const curBy = Object.fromEntries((current.data?.current?.lines || []).map((l) => [l.componentId, String(l.amount)]));
  const fields = [
    { name: 'effectiveFrom', label: t('fields.effectiveFrom'), type: 'date', required: true },
    { name: 'reason', label: t('common.reason'), required: true },
    ...earnings.map((c) => ({ name: `c_${c.id}`, label: nm(c), type: 'number', min: 0 })),
  ];
  const send = useSend('post', `/employees/${emp.id}/salary`, { invalidate: [['salary', emp.id], ['employee', emp.id]], onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} title={t('employees.actions.changeSalary')}
      footer={<><button type="button" className="btn-outline" onClick={onClose}>{t('common.cancel')}</button><button type="submit" form="salary-form" className="btn-primary" disabled={send.isPending}>{t('common.submit')}</button></>}>
      <p className="mb-4 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">{t('employees.salaryHint')}</p>
      <ResourceForm id="salary-form" fields={fields} defaultValues={{ effectiveFrom: today(), ...Object.fromEntries(earnings.map((c) => [`c_${c.id}`, curBy[c.id] || ''])) }}
        onSubmit={(v) => send.mutate({ effectiveFrom: v.effectiveFrom, reason: v.reason, lines: earnings.filter((c) => v[`c_${c.id}`] !== null && v[`c_${c.id}`] !== '').map((c) => ({ componentId: c.id, amount: String(v[`c_${c.id}`]) })) })} />
    </Modal>
  );
}

function TransferModal({ emp, mode, open, onClose }) {
  const { t } = useTranslation();
  const src = (url, label, filter) => ({ url, label, filter });
  const fields = mode === 'changeManager'
    ? [{ name: 'managerId', label: t('fields.manager'), type: 'select', source: src('/employees?pageSize=200', (x) => `${x.employeeNumber} — ${empName(x)}`, (x) => x.id !== emp.id) }]
    : [
      { name: 'branchId', label: t('common.branch'), type: 'select', source: src('/organization/branches', nm) },
      { name: 'departmentId', label: t('common.department'), type: 'select', source: src('/organization/departments', nm, (d) => d.type !== 'SECTION') },
      { name: 'sectionId', label: t('fields.section'), type: 'select', source: src('/organization/departments', nm, (d) => d.type === 'SECTION') },
      { name: 'teamId', label: t('fields.team'), type: 'select', source: src('/organization/teams', nm) },
      { name: 'positionId', label: t('fields.position'), type: 'select', source: src('/organization/positions', ttl) },
    ];
  const all = [...fields, { name: 'effectiveDate', label: t('employees.effectiveDate'), type: 'date', required: true }, { name: 'reason', label: t('common.reason'), required: true, type: 'textarea' }];
  const send = useSend('post', `/employees/${emp.id}/transfer`, { invalidate: [['employee', emp.id], ['emp-history', emp.id]], onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} title={t(`employees.actions.${mode === 'changeManager' ? 'changeManager' : 'transfer'}`)}
      footer={<><button type="button" className="btn-outline" onClick={onClose}>{t('common.cancel')}</button><button type="submit" form="transfer-form" className="btn-primary" disabled={send.isPending}>{t('common.save')}</button></>}>
      <p className="mb-4 text-xs text-ink-muted">{t('employees.transferHint')}</p>
      <ResourceForm id="transfer-form" fields={all} defaultValues={{ ...emp, effectiveDate: today() }} onSubmit={(v) => send.mutate(Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null)))} />
    </Modal>
  );
}

function DocumentModal({ emp, open, onClose }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const types = ['NATIONAL_ID', 'IQAMA', 'PASSPORT', 'CONTRACT', 'CERTIFICATE', 'LICENSE', 'TRAINING', 'MEDICAL_INSURANCE', 'OTHER'];
  const fields = [
    { name: 'type', label: t('fields.documentType'), type: 'select', required: true, options: types.map((x) => ({ value: x, label: t(`enums.docType.${x}`) })) },
    { name: 'name', label: t('common.name'), required: true }, { name: 'number', label: t('fields.number'), ltr: true },
    { name: 'issueDate', label: t('fields.issueDate'), type: 'date' }, { name: 'expiryDate', label: t('fields.expiryDate'), type: 'date' },
    { name: 'alertDaysBefore', label: `${t('fields.expiryDate')} — alert (days)`, type: 'number', integer: true, min: 0 }, { name: 'notes', label: t('common.notes'), type: 'textarea' },
  ];
  const submit = async (v) => {
    const fd = new FormData();
    Object.entries(v).forEach(([k, x]) => { if (x !== null && x !== undefined && x !== '') fd.append(k, x); });
    if (fileRef.current?.files?.[0]) fd.append('file', fileRef.current.files[0]);
    setBusy(true);
    try {
      await api.post(`/employees/${emp.id}/documents`, fd);
      toast.success(t('common.saved'));
      qc.invalidateQueries({ queryKey: ['docs', emp.id] });
      onClose();
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={t('employees.actions.uploadDocument')}
      footer={<><button type="button" className="btn-outline" onClick={onClose}>{t('common.cancel')}</button><button type="submit" form="doc-form" className="btn-primary" disabled={busy}>{t('common.upload')}</button></>}>
      <ResourceForm id="doc-form" fields={fields} defaultValues={{}} onSubmit={submit} />
      <Field label={`${t('common.attachment')} (PDF / JPG / PNG)`} className="mt-4"><input ref={fileRef} type="file" accept=".pdf,image/*" className="input py-1.5" /></Field>
    </Modal>
  );
}

// ── Tabs ──
function OverviewTab({ emp }) {
  const { t } = useTranslation();
  const q = useGet(['emp-overview', emp.id], `/employees/${emp.id}/overview`);
  const o = q.data || {};
  const years = Math.floor((o.serviceDays || 0) / 365);
  const months = Math.floor(((o.serviceDays || 0) % 365) / 30);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t('employees.stats.attendanceRate')} value={o.attendanceRate != null ? `${o.attendanceRate}%` : '—'} icon={CalendarCheck} tone="success" />
        <StatCard label={t('employees.stats.leaveBalance')} value={o.leaveBalance ?? '—'} icon={Plane} tone="info" hint={t('common.days')} />
        <StatCard label={t('employees.stats.totalCommission')} value={money(o.totalCommission)} icon={Percent} tone="navy" />
        <StatCard label={t('employees.stats.currentSalary')} value={o.currentSalary != null ? money(o.currentSalary) : t('employees.sensitiveHidden')} icon={Wallet} />
        <StatCard label={t('employees.stats.pendingRequests')} value={o.pendingRequests ?? 0} icon={Clock} tone="warning" />
        <StatCard label={t('employees.stats.performanceScore')} value={t('common.notAvailable')} hint={t('employees.performanceNA')} icon={Activity} />
      </div>
      <Card title={t('employees.tabs.overview')}>
        <InfoGrid cols={4} items={[
          [t('fields.employeeNumber'), emp.employeeNumber], [t('fields.jobTitle'), ttl(emp.position)], [t('common.department'), nm(emp.department)], [t('common.branch'), nm(emp.branch)],
          [t('fields.manager'), emp.manager ? <Link className="text-brand-600 hover:underline" to={`/employees/${emp.manager.id}`}>{empName(emp.manager)}</Link> : null],
          [t('fields.hireDate'), date(emp.hireDate)], [t('fields.contractType'), t(`enums.contractType.${emp.contractType}`)], [t('fields.serviceLength'), `${years} ${t('common.year')} ${months} ${t('common.month')}`],
        ]} />
      </Card>
      <Card title={t('employees.emergency')}>
        {emp.emergencyContacts?.length ? <InfoGrid items={emp.emergencyContacts.flatMap((c) => [[t('fields.emergencyName'), c.name], [t('fields.emergencyRelationship'), c.relationship], [t('fields.emergencyPhone'), <span dir="ltr">{c.phone}</span>]])} /> : <p className="text-sm text-ink-muted">—</p>}
      </Card>
    </div>
  );
}

function PersonalTab({ emp }) {
  const { t } = useTranslation();
  return (
    <Card title={t('employees.tabs.personal')}>
      <InfoGrid cols={3} items={[
        [t('fields.firstName'), emp.firstName], [t('fields.middleName'), emp.middleName], [t('fields.lastName'), emp.lastName], [t('fields.fullNameAr'), emp.fullNameAr], [t('fields.fullNameEn'), emp.fullNameEn],
        [t('fields.gender'), emp.gender && t(`enums.gender.${emp.gender}`)], [t('fields.dateOfBirth'), date(emp.dateOfBirth)], [t('fields.nationality'), emp.nationality],
        [t('fields.maritalStatus'), emp.maritalStatus && t(`enums.maritalStatus.${emp.maritalStatus}`)], [t('fields.nationalId'), <span dir="ltr">{emp.nationalId}</span>],
        [t('fields.passportNumber'), emp.passportNumber], [t('fields.passportExpiry'), date(emp.passportExpiry)], [t('fields.mobile'), <span dir="ltr">{emp.mobile}</span>],
        [t('fields.altMobile'), <span dir="ltr">{emp.altMobile}</span>], [t('fields.email'), emp.email], [t('fields.country'), emp.country], [t('fields.city'), emp.city], [t('fields.address'), emp.address],
      ]} />
    </Card>
  );
}

function EmploymentTab({ emp }) {
  const { t } = useTranslation();
  const h = useGet(['emp-history', emp.id], `/employees/${emp.id}/history`);
  return (
    <div className="space-y-6">
      <Card title={t('employees.tabs.employment')}>
        <InfoGrid cols={4} items={[
          [t('fields.employeeNumber'), emp.employeeNumber], [t('fields.jobTitle'), ttl(emp.position)], [t('common.department'), nm(emp.department)], [t('fields.section'), nm(emp.section)],
          [t('common.branch'), nm(emp.branch)], [t('fields.team'), nm(emp.team)], [t('fields.manager'), empName(emp.manager)], [t('fields.employmentType'), t(`enums.employmentType.${emp.employmentType}`)],
          [t('fields.contractType'), t(`enums.contractType.${emp.contractType}`)], [t('fields.workLocation'), emp.workLocation], [t('fields.hireDate'), date(emp.hireDate)],
          [t('fields.probationStart'), date(emp.probationStart)], [t('fields.probationEnd'), date(emp.probationEnd)], [t('fields.contractStart'), date(emp.contractStart)],
          [t('fields.contractEnd'), date(emp.contractEnd)], [t('fields.noticePeriodDays'), emp.noticePeriodDays], [t('fields.workSchedule'), emp.defaultShift ? `${nm(emp.defaultShift)} ${emp.defaultShift.startTime}–${emp.defaultShift.endTime}` : null],
          [t('common.status'), <StatusBadge status={emp.status} />], [t('fields.grade'), emp.grade ? `${emp.grade.code} — ${emp.grade.name}` : null], [t('fields.jobLevel'), emp.jobLevel],
        ]} />
      </Card>
      <Card title={t('employees.employmentHistory')} bodyClass="p-0">
        <DataTable rows={h.data?.items} loading={h.isLoading} error={h.error} dense columns={[
          { key: 'd', header: t('employees.effectiveDate'), render: (r) => date(r.effectiveDate) }, { key: 'c', header: t('common.type'), render: (r) => r.changeType.replace(/_/g, ' ').toLowerCase() },
          { key: 'o', header: t('fields.oldValue'), render: (r) => r.oldLabel || r.oldValue || '—' }, { key: 'n', header: t('fields.newValue'), render: (r) => r.newLabel || r.newValue || '—' }, { key: 'r', header: t('common.reason'), render: (r) => r.reason || '—' },
        ]} />
      </Card>
    </div>
  );
}

function FinancialTab({ emp, onChangeSalary }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const q = useGet(['salary', emp.id], `/employees/${emp.id}/salary`, undefined, { retry: false });
  return (
    <div className="space-y-6">
      <Card title={t('employees.tabs.financial')} actions={can('employees.financial') && <button type="button" className="btn-secondary btn-sm" onClick={onChangeSalary}>{t('employees.actions.changeSalary')}</button>}>
        {emp.paymentMethod === undefined ? <p className="text-sm text-ink-muted">{t('employees.sensitiveHidden')}</p> : (
          <InfoGrid cols={4} items={[
            [t('fields.paymentFrequency'), emp.paymentFrequency && t(`enums.frequency.${emp.paymentFrequency}`)], [t('fields.paymentMethod'), emp.paymentMethod && t(`enums.paymentMethod.${emp.paymentMethod}`)],
            [t('fields.bankName'), emp.bankName], [t('fields.iban'), <span dir="ltr" className="font-mono text-xs">{emp.iban}</span>], [t('fields.accountHolder'), emp.accountHolder],
            [t('fields.salaryStructure'), emp.salaryStructure?.name], [t('fields.gosiApplicable'), emp.gosiApplicable ? t('common.yes') : t('common.no')], [t('fields.gosiNumber'), emp.gosiNumber],
          ]} />
        )}
      </Card>
      {q.isError ? null : (
        <Card title={t('employees.salaryHistory')} bodyClass="p-0">
          {q.isLoading ? <LoadingState /> : !q.data?.revisions?.length ? <EmptyState title={t('employees.noSalary')} /> : (
            <div className="divide-y divide-line">
              {q.data.revisions.map((r) => (
                <div key={r.id} className="px-5 py-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{t('fields.effectiveFrom')}: {date(r.effectiveFrom)}</span><StatusBadge status={r.status} />
                    {q.data.current?.id === r.id && <span className="chip bg-success/10 text-success">{t('common.active')}</span>}
                    <span className="ms-auto font-semibold text-navy-700">{money(r.total)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">{r.lines.map((l) => <span key={l.id} className="rounded-lg bg-canvas px-2 py-1">{nm(l.component)}: {money(l.amount)}</span>)}</div>
                  {r.reason && <p className="mt-1 text-xs text-ink-muted">{r.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function DocumentsTab({ emp, onUpload }) {
  const { t } = useTranslation();
  const q = useGet(['docs', emp.id], `/employees/${emp.id}/documents`, undefined, { retry: false });
  const del = useSend('delete', (d) => `/employees/${emp.id}/documents/${d.id}`, { invalidate: [['docs', emp.id]], success: t('common.deleted') });
  return (
    <Card title={t('employees.tabs.documents')} bodyClass="p-0" actions={<button type="button" className="btn-secondary btn-sm" onClick={onUpload}>{t('employees.actions.uploadDocument')}</button>}>
      <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} columns={[
        { key: 'type', header: t('fields.documentType'), render: (r) => t(`enums.docType.${r.type}`) }, { key: 'name', header: t('common.name') },
        { key: 'number', header: t('fields.number'), render: (r) => <span dir="ltr">{r.number || '—'}</span> }, { key: 'issue', header: t('fields.issueDate'), render: (r) => date(r.issueDate) },
        { key: 'exp', header: t('fields.expiryDate'), render: (r) => date(r.expiryDate) }, { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
        { key: 'file', header: t('common.attachment'), render: (r) => (r.file ? <button type="button" className="inline-flex items-center gap-1 text-brand-600 hover:underline" onClick={() => download(`/files/${r.file.id}`, { download: 1 }, r.file.originalName)}><Download className="h-3.5 w-3.5" />{r.file.originalName}</button> : '—') },
        { key: 'x', header: '', render: (r) => <button type="button" className="text-xs text-danger hover:underline" onClick={() => del.mutate(r)}>{t('common.delete')}</button> },
      ]} />
    </Card>
  );
}

function AttendanceTab({ emp }) {
  const { t } = useTranslation();
  const tz = useAuth().user?.company?.timezone;
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const from = dayjs(`${month}-01`).format('YYYY-MM-DD');
  const to = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');
  const q = useGet(['emp-att', emp.id, month], '/attendance/records', { employeeId: emp.id, from, to, pageSize: 100 });
  const rows = q.data?.items || [];
  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
  const count = (s) => rows.filter((r) => r.status === s).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input type="month" className="input w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
        <div className="flex flex-wrap gap-2 text-xs">
          {['PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE', 'INCOMPLETE'].map((s) => <span key={s} className="chip bg-surface shadow-card"><StatusBadge status={s} /> {count(s)}</span>)}
          <span className="chip bg-surface shadow-card">{t('fields.lateMinutes')}: {minutes(sum('lateMinutes'))}</span>
          <span className="chip bg-surface shadow-card">{t('fields.worked')}: {minutes(sum('workedMinutes'))}</span>
          <span className="chip bg-surface shadow-card">{t('fields.overtime')}: {minutes(sum('overtimeApprovedMinutes'))}</span>
        </div>
      </div>
      <div className="card"><DataTable rows={rows} loading={q.isLoading} error={q.error} dense columns={[
        { key: 'd', header: t('common.date'), render: (r) => date(r.date) }, { key: 's', header: t('fields.shift'), render: (r) => r.shift?.code || '—' },
        { key: 'i', header: t('fields.checkIn'), render: (r) => time(r.firstCheckIn, tz) }, { key: 'o', header: t('fields.checkOut'), render: (r) => time(r.lastCheckOut, tz) },
        { key: 'l', header: t('fields.lateMinutes'), render: (r) => (r.lateMinutes ? minutes(r.lateMinutes) : '—') }, { key: 'w', header: t('fields.worked'), render: (r) => minutes(r.workedMinutes) },
        { key: 'ot', header: t('fields.overtime'), render: (r) => (r.overtimeMinutes ? <span>{minutes(r.overtimeMinutes)} <StatusBadge status={r.overtimeStatus} /></span> : '—') },
        { key: 'st', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
      ]} /></div>
    </div>
  );
}

function LeavesTab({ emp }) {
  const { t } = useTranslation();
  const b = useGet(['emp-bal', emp.id], '/leaves/balances', { employeeId: emp.id });
  const r = useGet(['emp-leaves', emp.id], '/leaves/requests', { employeeId: emp.id, pageSize: 50 });
  return (
    <div className="space-y-6">
      <Card title={t('nav.balances')} bodyClass="p-0">
        <DataTable rows={b.data?.items} loading={b.isLoading} error={b.error} dense columns={[
          { key: 't', header: t('fields.leaveType'), render: (x) => nm(x.leaveType) }, { key: 'o', header: t('fields.opening'), render: (x) => x.openingBalance },
          { key: 'a', header: t('fields.accrued'), render: (x) => x.accrued }, { key: 'c', header: t('fields.carried'), render: (x) => x.carriedForward },
          { key: 'ad', header: t('fields.adjustments'), render: (x) => x.adjustments }, { key: 'u', header: t('fields.used'), render: (x) => x.used },
          { key: 'p', header: t('fields.pending'), render: (x) => x.pending }, { key: 'cur', header: t('fields.current'), render: (x) => <b>{x.current}</b> }, { key: 'av', header: t('fields.available'), render: (x) => x.available },
        ]} />
      </Card>
      <Card title={t('nav.requests')} bodyClass="p-0">
        <DataTable rows={r.data?.items} loading={r.isLoading} error={r.error} dense columns={[
          { key: 't', header: t('fields.leaveType'), render: (x) => nm(x.leaveType) }, { key: 's', header: t('fields.startDate'), render: (x) => date(x.startDate) },
          { key: 'e', header: t('fields.endDate'), render: (x) => date(x.endDate) }, { key: 'd', header: t('leaves.days'), render: (x) => x.days }, { key: 'st', header: t('common.status'), render: (x) => <StatusBadge status={x.status} /> },
        ]} />
      </Card>
    </div>
  );
}

function PayrollTab({ emp }) {
  const { t } = useTranslation();
  const q = useGet(['emp-payslips', emp.id], '/payslips', { employeeId: emp.id, pageSize: 24 }, { retry: false });
  const navigate = useNavigate();
  if (q.isError) return <ErrorState error={q.error} />;
  return (
    <Card title={t('payslips.title')} bodyClass="p-0">
      <DataTable rows={q.data?.items} loading={q.isLoading} onRowClick={(r) => navigate(`/payslips/${r.id}`)} columns={[
        { key: 'n', header: t('fields.number'), render: (r) => <span dir="ltr">{r.number}</span> }, { key: 'p', header: t('fields.period'), render: (r) => `${date(r.periodStart)} → ${date(r.periodEnd)}` },
        { key: 'g', header: t('fields.gross'), render: (r) => money(r.grossEarnings) }, { key: 'd', header: t('fields.deductions'), render: (r) => money(r.totalDeductions) },
        { key: 'net', header: t('fields.net'), render: (r) => <b>{money(r.netSalary)}</b> }, { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
      ]} />
    </Card>
  );
}

function CommissionsTab({ emp }) {
  const { t } = useTranslation();
  const q = useGet(['emp-comm', emp.id], '/commissions', { employeeId: emp.id, pageSize: 100 }, { retry: false });
  if (q.isError) return <ErrorState error={q.error} />;
  const totals = q.data?.totals || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['commissions.approved', ['APPROVED', 'PAYABLE']], ['commissions.pending', ['CALCULATED', 'PENDING_APPROVAL', 'ON_HOLD']], ['status.INCLUDED_IN_PAYROLL', ['INCLUDED_IN_PAYROLL']], ['commissions.paid', ['PAID']]].map(([k, st]) => (
          <StatCard key={k} label={t(k)} value={money(st.reduce((s, x) => s + Number(totals[x] || 0), 0))} icon={Percent} />
        ))}
      </div>
      <div className="card"><DataTable rows={q.data?.items} loading={q.isLoading} dense columns={[
        { key: 'd', header: t('common.date'), render: (r) => date(r.earnedDate) }, { key: 'r', header: t('fields.rule'), render: (r) => (r.rule ? nm(r.rule) : t('commissions.manual')) },
        { key: 'e', header: t('commissions.entryType'), render: (r) => r.entryType }, { key: 's', header: t('fields.serviceCode'), render: (r) => r.serviceCode || r.periodKey || '—' },
        { key: 'b', header: t('fields.calculationBase'), render: (r) => money(r.calculationBase) }, { key: 'sh', header: t('fields.share'), render: (r) => `${Number(r.sharePercent)}%` },
        { key: 'n', header: t('fields.commission'), render: (r) => <b>{money(r.netAmount)}</b> }, { key: 'st', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
      ]} /></div>
    </div>
  );
}

export function LoansTab({ emp }) {
  const { t } = useTranslation();
  const q = useGet(['statement', emp.id], `/finance/statement/${emp.id}`, undefined, { retry: false });
  const navigate = useNavigate();
  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} />;
  const s = q.data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Object.entries(s.totals).map(([k, v]) => <StatCard key={k} label={t(`loans.totals.${k}`)} value={money(v)} icon={HandCoins} tone={k === 'overdue' && Number(v) > 0 ? 'danger' : 'brand'} />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t('loans.upcoming')} bodyClass="p-0">
          <DataTable rows={s.upcoming} dense columns={[{ key: 'n', header: '#', render: (r) => r.number }, { key: 'd', header: t('fields.dueDate'), render: (r) => date(r.dueDate) }, { key: 'a', header: t('common.amount'), render: (r) => money(r.amount) }, { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> }]} />
        </Card>
        <Card title={`${t('loans.advance')} / ${t('loans.loan')}`} bodyClass="p-0">
          <DataTable rows={[...s.advances.map((a) => ({ ...a, kind: 'advances' })), ...s.loans.map((l) => ({ ...l, kind: 'loans' }))]} dense onRowClick={(r) => navigate(`/finance/${r.kind}/${r.id}`)}
            columns={[{ key: 'n', header: t('fields.number'), render: (r) => r.number }, { key: 'a', header: t('common.amount'), render: (r) => money(r.amount) }, { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> }]} />
        </Card>
      </div>
      <Card title={t('loans.ledger')} bodyClass="p-0">
        <DataTable rows={s.ledger} dense columns={[
          { key: 'd', header: t('common.date'), render: (r) => date(r.createdAt) }, { key: 't', header: t('common.type'), render: (r) => r.type.replace(/_/g, ' ').toLowerCase() },
          { key: 'db', header: '+', render: (r) => (Number(r.debit) ? money(r.debit) : '') }, { key: 'cr', header: '−', render: (r) => (Number(r.credit) ? money(r.credit) : '') },
          { key: 'b', header: t('fields.remaining'), render: (r) => money(r.balanceAfter) }, { key: 'n', header: t('common.notes'), render: (r) => r.note || '—' },
        ]} />
      </Card>
    </div>
  );
}

function ActivityTab({ emp }) {
  const q = useGet(['emp-activity', emp.id], `/employees/${emp.id}/activity`);
  return <div className="card p-5">{q.isLoading ? <LoadingState /> : <ActivityTimeline items={q.data?.items} />}</div>;
}

export default function EmployeeProfile() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can, employeeId } = useAuth();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'overview';
  const [modal, setModal] = useState(null);
  const [pin, setPin] = useState('');
  const photoRef = useRef();
  const q = useGet(['employee', id], `/employees/${id}`);
  const statusSend = useSend('post', ({ action }) => `/employees/${id}/${action}`, { invalidate: [['employee', id], 'employees'], onSuccess: () => setModal(null) });
  const del = useSend('delete', `/employees/${id}`, { invalidate: ['employees'], success: t('common.deleted'), onSuccess: () => navigate('/employees') });
  const pinSend = useSend('put', `/employees/${id}/kiosk-pin`, { onSuccess: () => { setModal(null); setPin(''); } });

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const emp = q.data;
  const self = employeeId === emp.id;
  const tabs = [
    'overview', 'personal', 'employment', 'financial', 'documents', 'attendance', 'leaves',
    (self || can('payslips.view')) && 'payroll', (self || can('commissions.view')) && 'commissions', (self || can(['advances.view', 'loans.view'])) && 'loans', 'activity',
  ].filter(Boolean).map((k) => ({ key: k, label: t(`employees.tabs.${k}`) }));

  const uploadPhoto = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    try { await api.post(`/employees/${id}/photo`, fd); toast.success(t('common.saved')); qc.invalidateQueries({ queryKey: ['employee', id] }); } catch (e) { notifyError(e); }
  };

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: t('nav.employees'), to: '/employees' }, { label: empName(emp) }]} title=""
        actions={<>
          {can('employees.edit') && <button type="button" className="btn-outline" onClick={() => navigate(`/employees/${id}/edit`)}><Pencil className="h-4 w-4" />{t('common.edit')}</button>}
          <ActionsMenu emp={emp} onAction={(a) => (a === 'delete' ? setModal('delete') : setModal(a))} />
        </>} />
      <div className="card mb-6 -mt-4 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-600 via-brand-700 to-navy-700" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
          <div className="relative -mt-10">
            <Avatar person={emp} size={88} className="ring-4" />
            {can('employees.edit') && <>
              <button type="button" className="absolute bottom-0 end-0 grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-white shadow" onClick={() => photoRef.current?.click()}><Camera className="h-4 w-4" /></button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0])} />
            </>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold text-navy-700">{empName(emp)}</h1><StatusBadge status={emp.status} /></div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
              <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{ttl(emp.position) || '—'}</span>
              <span>{nm(emp.department)}</span><span>{nm(emp.branch)}</span><span dir="ltr" className="font-mono text-xs">{emp.employeeNumber}</span>
            </p>
          </div>
        </div>
      </div>
      <Tabs tabs={tabs} active={tab} onChange={(k) => setSp({ tab: k }, { replace: true })} />
      {tab === 'overview' && <OverviewTab emp={emp} />}
      {tab === 'personal' && <PersonalTab emp={emp} />}
      {tab === 'employment' && <EmploymentTab emp={emp} />}
      {tab === 'financial' && <FinancialTab emp={emp} onChangeSalary={() => setModal('changeSalary')} />}
      {tab === 'documents' && <DocumentsTab emp={emp} onUpload={() => setModal('uploadDocument')} />}
      {tab === 'attendance' && <AttendanceTab emp={emp} />}
      {tab === 'leaves' && <LeavesTab emp={emp} />}
      {tab === 'payroll' && <PayrollTab emp={emp} />}
      {tab === 'commissions' && <CommissionsTab emp={emp} />}
      {tab === 'loans' && <LoansTab emp={emp} />}
      {tab === 'activity' && <ActivityTab emp={emp} />}

      {(modal === 'transfer' || modal === 'changeManager') && <TransferModal emp={emp} mode={modal} open onClose={() => setModal(null)} />}
      {modal === 'changeSalary' && <SalaryModal emp={emp} open onClose={() => setModal(null)} />}
      {modal === 'uploadDocument' && <DocumentModal emp={emp} open onClose={() => setModal(null)} />}
      {STATUS_ACTIONS.includes(modal) && (
        <ConfirmDialog open onClose={() => setModal(null)} title={t(`employees.actions.${modal}`)} message={t('employees.statusHint')} requireReason danger={modal !== 'reactivate'} busy={statusSend.isPending}
          onConfirm={(reason) => statusSend.mutate({ action: modal, effectiveDate: today(), reason })} />
      )}
      {modal === 'delete' && <ConfirmDialog open danger onClose={() => setModal(null)} message={t('common.confirmDelete')} confirmLabel={t('common.yesDelete')} busy={del.isPending} onConfirm={() => del.mutate()} />}
      {modal === 'setPin' && (
        <Modal open onClose={() => setModal(null)} size="sm" title={t('employees.actions.setPin')}
          footer={<button type="button" className="btn-primary" disabled={!/^\d{4,8}$/.test(pin) || pinSend.isPending} onClick={() => pinSend.mutate({ pin })}>{t('common.save')}</button>}>
          <Field label={`${t('attendance.kioskPin')} (4–8)`}><Input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" dir="ltr" maxLength={8} /></Field>
        </Modal>
      )}
    </div>
  );
}
