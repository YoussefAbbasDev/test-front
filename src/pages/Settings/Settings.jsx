import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Save, Trash2, KeyRound, ShieldCheck, Upload } from 'lucide-react';
import { PageHeader, Card, StatusBadge, ActivityTimeline } from '../../components/common/Display';
import { QueryState, LoadingState } from '../../components/common/Feedback';
import { SearchInput, ExportButton, DateRangePicker } from '../../components/common/Controls';
import { Modal, ConfirmDialog } from '../../components/common/Overlay';
import { Checkbox, Field, Input, MultiCheck, Select } from '../../components/forms/Fields';
import DataTable from '../../components/tables/DataTable';
import ResourceForm from '../../components/forms/ResourceForm';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { api, notifyError, fetchObjectUrl } from '../../services/api';
import { dateTime, empName, nm } from '../../utils/format';

const crumbs = (t, label) => [{ label: t('nav.settings'), to: '/settings' }, { label }];

export function CompanySettings() {
  const { t } = useTranslation();
  const { can, reload } = useAuth();
  const qc = useQueryClient();
  const q = useGet(['company'], '/settings/company');
  const [logo, setLogo] = useState(null);
  const fileRef = useRef();
  const save = useSend('put', '/settings/company', { invalidate: ['company'], onSuccess: () => reload() });
  useEffect(() => { if (q.data?.logoFileId) fetchObjectUrl(`/files/${q.data.logoFileId}`).then(setLogo).catch(() => {}); }, [q.data?.logoFileId]);
  const days = t('enums.weekday', { returnObjects: true });
  const upload = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    try { await api.post('/settings/company/logo', fd); toast.success(t('common.saved')); qc.invalidateQueries({ queryKey: ['company'] }); } catch (e) { notifyError(e); }
  };
  return (
    <div>
      <PageHeader title={t('settings.company')} description={t('settings.subtitle')}
        actions={can('settings.settings') && <button type="submit" form="company-form" className="btn-primary" disabled={save.isPending}><Save className="h-4 w-4" />{t('common.save')}</button>} />
      <QueryState query={q}>
        {(c) => (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <ResourceForm id="company-form" defaultValues={c} onSubmit={(v) => save.mutate({ ...v, weekendDays: (v.weekendDays || []).map(Number), documentAlertDays: Number(v.documentAlertDays), contractAlertDays: Number(v.contractAlertDays) })} fields={[
                { name: 'nameAr', label: t('fields.nameAr'), required: true }, { name: 'nameEn', label: t('fields.nameEn'), required: true },
                { name: 'defaultLanguage', label: t('fields.defaultLanguage'), type: 'select', placeholder: false, options: [{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }] },
                { name: 'currency', label: t('fields.currency'), ltr: true, required: true }, { name: 'timezone', label: t('fields.timezone'), ltr: true, required: true }, { name: 'country', label: t('fields.country'), ltr: true },
                { name: 'documentAlertDays', label: `${t('dashboard.kpis.documentsExpiring')} (${t('common.days')})`, type: 'number', integer: true, min: 1 },
                { name: 'contractAlertDays', label: `${t('dashboard.kpis.contractsExpiring')} (${t('common.days')})`, type: 'number', integer: true, min: 1 },
                { name: 'weekendDays', label: t('fields.weekendDays'), type: 'multiselect', options: days.map((d, i) => ({ value: i, label: d })) },
              ]} />
            </Card>
            <Card title={t('settings.logo')}>
              <div className="flex flex-col items-center gap-4">
                <div className="grid h-32 w-full place-items-center rounded-xl border border-dashed border-line bg-canvas">{logo ? <img src={logo} alt="logo" className="max-h-28" /> : <span className="text-xs text-ink-muted">—</span>}</div>
                {can('settings.settings') && <><button type="button" className="btn-outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />{t('common.upload')}</button><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && upload(e.target.files[0])} /></>}
              </div>
            </Card>
          </div>
        )}
      </QueryState>
    </div>
  );
}

export function Users() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [params, setParams] = useState({ page: 1, search: '' });
  const [edit, setEdit] = useState(null);
  const [reset, setReset] = useState(null);
  const [pw, setPw] = useState('');
  const q = useGet(['users', params], '/settings/users', params);
  const roles = useGet(['roles'], '/settings/roles');
  const save = useSend(edit?.id ? 'put' : 'post', () => (edit?.id ? `/settings/users/${edit.id}` : '/settings/users'), { invalidate: ['users'], onSuccess: () => setEdit(null) });
  const resetSend = useSend('post', () => `/settings/users/${reset.id}/reset-password`, { onSuccess: () => { setReset(null); setPw(''); } });
  const roleOptions = (roles.data?.items || []).map((r) => ({ value: r.id, label: nm(r) }));
  return (
    <div>
      <PageHeader title={t('nav.users')} description={t('settings.escalationHint')} breadcrumbs={crumbs(t, t('nav.users'))}
        actions={can('users.create') && <button type="button" className="btn-primary" onClick={() => setEdit({ roleIds: [] })}><Plus className="h-4 w-4" />{t('settings.newUser')}</button>} />
      <div className="card">
        <div className="border-b border-line p-3"><SearchInput className="w-full sm:w-72" value={params.search} onChange={(search) => setParams({ page: 1, search })} /></div>
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))}
          onRowClick={(u) => can('users.edit') && setEdit({ ...u, roleIds: u.roles.map((r) => r.role.id) })}
          columns={[
            { key: 'n', header: t('fields.displayName'), render: (u) => <div><p className="font-medium">{u.displayName}</p><p className="text-xs text-ink-muted" dir="ltr">{u.email}</p></div> },
            { key: 'e', header: t('common.employee'), render: (u) => (u.employee ? `${u.employee.employeeNumber} — ${u.employee.firstName} ${u.employee.lastName}` : '—') },
            { key: 'r', header: t('fields.roles'), render: (u) => <div className="flex flex-wrap gap-1">{u.roles.map((r) => <span key={r.role.id} className="chip bg-brand-50 text-brand-700">{nm(r.role)}</span>)}</div> },
            { key: 'l', header: t('fields.lastLogin'), render: (u) => dateTime(u.lastLoginAt) }, { key: 's', header: t('common.status'), render: (u) => <StatusBadge status={u.status} /> },
            { key: 'x', header: '', render: (u) => can('users.edit') && <button type="button" className="btn-ghost h-8 w-8 p-0" title={t('settings.resetPassword')} onClick={(e) => { e.stopPropagation(); setReset(u); }}><KeyRound className="h-4 w-4" /></button> },
          ]} />
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? edit.email : t('settings.newUser')} size="lg" footer={<button type="submit" form="user-form" className="btn-primary" disabled={save.isPending}>{t('common.save')}</button>}>
        {edit && <ResourceForm id="user-form" defaultValues={edit} onSubmit={(v) => save.mutate(edit.id ? { displayName: v.displayName, status: v.status, roleIds: v.roleIds, employeeId: v.employeeId || null } : { ...v, employeeId: v.employeeId || undefined })} fields={[
          ...(edit.id ? [] : [{ name: 'email', label: t('fields.email'), type: 'email', required: true, ltr: true }, { name: 'password', label: t('auth.password'), required: true, ltr: true, hint: '≥ 10, letters + digits' }]),
          { name: 'displayName', label: t('fields.displayName'), required: true },
          { name: 'employeeId', label: t('common.employee'), type: 'select', source: { url: '/employees?pageSize=200', label: (x) => `${x.employeeNumber} — ${empName(x)}` } },
          ...(edit.id ? [{ name: 'status', label: t('common.status'), type: 'select', placeholder: false, options: [{ value: 'ACTIVE', label: t('status.ACTIVE') }, { value: 'DISABLED', label: t('status.DISABLED') }] }] : []),
          { name: 'roleIds', label: t('fields.roles'), type: 'multiselect', required: true, options: roleOptions },
        ]} />}
      </Modal>
      <Modal open={!!reset} onClose={() => setReset(null)} size="sm" title={t('settings.resetPassword')} footer={<button type="button" className="btn-primary" disabled={pw.length < 10 || resetSend.isPending} onClick={() => resetSend.mutate({ password: pw })}>{t('common.save')}</button>}>
        <Field label={t('auth.newPassword')} hint="≥ 10, letters + digits"><Input type="password" dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
      </Modal>
    </div>
  );
}

export function Roles() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const q = useGet(['roles'], '/settings/roles');
  const perms = useGet(['permissions'], '/settings/permissions');
  const save = useSend(edit?.id ? 'put' : 'post', () => (edit?.id ? `/settings/roles/${edit.id}` : '/settings/roles'), { invalidate: ['roles'], onSuccess: () => setEdit(null) });
  const remove = useSend('delete', (r) => `/settings/roles/${r.id}`, { invalidate: ['roles'], onSuccess: () => setDel(null), success: t('common.deleted') });
  const matrix = useMemo(() => {
    const m = {};
    (perms.data?.items || []).forEach((p) => { const [mod, act] = p.split('.'); (m[mod] = m[mod] || []).push(act); });
    return m;
  }, [perms.data]);
  const toggle = (code) => setEdit((e) => ({ ...e, permissions: e.permissions.includes(code) ? e.permissions.filter((x) => x !== code) : [...e.permissions, code] }));
  return (
    <div>
      <PageHeader title={t('nav.roles')} description={t('settings.escalationHint')} breadcrumbs={crumbs(t, t('nav.roles'))}
        actions={can('users.settings') && <button type="button" className="btn-primary" onClick={() => setEdit({ code: '', nameAr: '', nameEn: '', dataScope: 'OWN', permissions: [] })}><Plus className="h-4 w-4" />{t('settings.newRole')}</button>} />
      <div className="card">
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} onRowClick={(r) => can('users.settings') && setEdit({ ...r })} columns={[
          { key: 'n', header: t('common.name'), render: (r) => <div className="flex items-center gap-2">{r.isSystem && <ShieldCheck className="h-4 w-4 text-brand-500" title={t('settings.systemRole')} />}<span>{nm(r)}</span></div> },
          { key: 'c', header: t('common.code'), render: (r) => <span dir="ltr" className="font-mono text-xs">{r.code}</span> }, { key: 's', header: t('fields.dataScope'), render: (r) => t(`enums.scope.${r.dataScope}`) },
          { key: 'p', header: t('fields.permissions'), render: (r) => r.permissions.length }, { key: 'u', header: t('nav.users'), render: (r) => r._count.users },
          { key: 'x', header: '', render: (r) => !r.isSystem && can('users.settings') && <button type="button" className="btn-ghost h-8 w-8 p-0 text-danger" onClick={(e) => { e.stopPropagation(); setDel(r); }}><Trash2 className="h-4 w-4" /></button> },
        ]} />
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? nm(edit) : t('settings.newRole')} size="xl"
        footer={<button type="button" className="btn-primary" disabled={save.isPending} onClick={() => save.mutate({ ...(edit.isSystem ? {} : { code: edit.code }), nameAr: edit.nameAr, nameEn: edit.nameEn, dataScope: edit.dataScope, permissions: edit.permissions })}>{t('common.save')}</button>}>
        {edit && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label={t('common.code')}><Input dir="ltr" disabled={edit.isSystem} value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} /></Field>
              <Field label={t('fields.nameAr')}><Input value={edit.nameAr} onChange={(e) => setEdit({ ...edit, nameAr: e.target.value })} /></Field>
              <Field label={t('fields.nameEn')}><Input value={edit.nameEn} onChange={(e) => setEdit({ ...edit, nameEn: e.target.value })} /></Field>
              <Field label={t('fields.dataScope')}><Select placeholder={false} value={edit.dataScope} onChange={(e) => setEdit({ ...edit, dataScope: e.target.value })} options={['COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM', 'ASSIGNED', 'OWN'].map((s) => ({ value: s, label: t(`enums.scope.${s}`) }))} /></Field>
            </div>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-xs">
                <thead className="bg-canvas"><tr><th className="table-head" />{['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'print', 'settings', 'financial', 'documents', 'manual', 'review'].map((a) => <th key={a} className="table-head text-center">{t(`settings.actions.${a}`)}</th>)}</tr></thead>
                <tbody className="divide-y divide-line">
                  {Object.entries(matrix).map(([mod, acts]) => (
                    <tr key={mod}>
                      <td className="table-cell font-medium">{t(`settings.modules.${mod}`)}</td>
                      {['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'print', 'settings', 'financial', 'documents', 'manual', 'review'].map((a) => (
                        <td key={a} className="text-center">{acts.includes(a) ? <input type="checkbox" className="h-4 w-4 rounded text-brand-600" checked={edit.permissions.includes(`${mod}.${a}`)} onChange={() => toggle(`${mod}.${a}`)} /> : null}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} danger onClose={() => setDel(null)} message={t('common.confirmDelete')} busy={remove.isPending} onConfirm={() => remove.mutate(del)} />
    </div>
  );
}

export function Workflows() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [edit, setEdit] = useState(null);
  const q = useGet(['workflows'], '/settings/workflows');
  const roles = useGet(['roles'], '/settings/roles', undefined, { retry: false });
  const save = useSend(edit?.id ? 'put' : 'post', () => (edit?.id ? `/settings/workflows/${edit.id}` : '/settings/workflows'), { invalidate: ['workflows'], onSuccess: () => setEdit(null) });
  const ENTITY = ['LEAVE', 'LEAVE_CANCELLATION', 'ATTENDANCE_CORRECTION', 'SHIFT_EXCHANGE', 'ADVANCE', 'LOAN', 'PAYROLL', 'SALARY_CHANGE'];
  const setStep = (i, k, v) => setEdit((e) => ({ ...e, steps: e.steps.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const submit = () => save.mutate({
    code: edit.code, name: edit.name, entityType: edit.entityType, isDefault: !!edit.isDefault, priority: Number(edit.priority || 0), status: edit.status || 'ACTIVE',
    conditions: edit.minAmount || edit.maxAmount ? { ...(edit.minAmount ? { minAmount: Number(edit.minAmount) } : {}), ...(edit.maxAmount ? { maxAmount: Number(edit.maxAmount) } : {}) } : null,
    steps: edit.steps.map((s) => ({ name: s.name, approverType: s.approverType, roleCode: s.approverType === 'ROLE' ? s.roleCode : null, mode: s.mode || 'ANY', pendingStatus: s.pendingStatus || null, condition: s.minAmount ? { minAmount: Number(s.minAmount) } : null })),
  });
  return (
    <div>
      <PageHeader title={t('nav.workflows')} breadcrumbs={crumbs(t, t('nav.workflows'))}
        actions={can('settings.settings') && <button type="button" className="btn-primary" onClick={() => setEdit({ code: '', name: '', entityType: 'LEAVE', steps: [{ name: '', approverType: 'DIRECT_MANAGER', mode: 'ANY' }] })}><Plus className="h-4 w-4" />{t('settings.newWorkflow')}</button>} />
      <QueryState query={q}>
        {(d) => (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {d.items.map((w) => (
              <button key={w.id} type="button" onClick={() => can('settings.settings') && setEdit({ ...w, minAmount: w.conditions?.minAmount ?? '', maxAmount: w.conditions?.maxAmount ?? '', steps: w.steps.map((s) => ({ ...s, minAmount: s.condition?.minAmount ?? '' })) })} className="card p-4 text-start hover:shadow-pop">
                <div className="mb-2 flex items-center justify-between"><span className="chip bg-brand-50 text-brand-700">{t(`enums.entityType.${w.entityType}`)}</span><StatusBadge status={w.status} /></div>
                <p className="font-medium text-navy-700">{w.name}{w.isDefault && ' ★'}</p>
                {(w.conditions?.minAmount != null || w.conditions?.maxAmount != null) && <p className="text-xs text-ink-muted">{t('fields.minAmount')} {w.conditions.minAmount ?? 0} · {t('fields.maxAmount')} {w.conditions.maxAmount ?? '∞'}</p>}
                <ol className="mt-3 space-y-1 text-xs">{w.steps.map((s) => <li key={s.id} className="flex gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[10px] text-white">{s.stepOrder}</span>{s.name} · {t(`enums.approverType.${s.approverType}`)}{s.roleCode ? ` (${s.roleCode})` : ''}{s.mode === 'ALL' ? ' · ALL' : ''}</li>)}</ol>
              </button>
            ))}
          </div>
        )}
      </QueryState>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.name || t('settings.newWorkflow')} size="lg" footer={<button type="button" className="btn-primary" disabled={save.isPending} onClick={submit}>{t('common.save')}</button>}>
        {edit && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t('common.code')}><Input dir="ltr" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></Field>
              <Field label={t('common.name')}><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label={t('common.type')}><Select placeholder={false} value={edit.entityType} onChange={(e) => setEdit({ ...edit, entityType: e.target.value })} options={ENTITY.map((v) => ({ value: v, label: t(`enums.entityType.${v}`) }))} /></Field>
              <Field label={t('fields.minAmount')}><Input type="number" value={edit.minAmount ?? ''} onChange={(e) => setEdit({ ...edit, minAmount: e.target.value })} /></Field>
              <Field label={t('fields.maxAmount')}><Input type="number" value={edit.maxAmount ?? ''} onChange={(e) => setEdit({ ...edit, maxAmount: e.target.value })} /></Field>
              <Field label={t('fields.priority')}><Input type="number" value={edit.priority ?? 0} onChange={(e) => setEdit({ ...edit, priority: e.target.value })} /></Field>
              <Checkbox label={t('cfg.isDefault')} checked={!!edit.isDefault} onChange={(e) => setEdit({ ...edit, isDefault: e.target.checked })} />
              <Field label={t('common.status')}><Select placeholder={false} value={edit.status || 'ACTIVE'} onChange={(e) => setEdit({ ...edit, status: e.target.value })} options={['ACTIVE', 'INACTIVE'].map((v) => ({ value: v, label: t(`status.${v}`) }))} /></Field>
            </div>
            <p className="text-sm font-medium text-navy-700">{t('fields.steps')}</p>
            {edit.steps.map((s, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-line p-3 sm:grid-cols-6">
                <Input className="sm:col-span-2" placeholder={t('common.name')} value={s.name} onChange={(e) => setStep(i, 'name', e.target.value)} />
                <Select placeholder={false} value={s.approverType} onChange={(e) => setStep(i, 'approverType', e.target.value)} options={['DIRECT_MANAGER', 'DEPARTMENT_MANAGER', 'BRANCH_MANAGER', 'ROLE'].map((v) => ({ value: v, label: t(`enums.approverType.${v}`) }))} />
                {s.approverType === 'ROLE' ? <Select value={s.roleCode || ''} onChange={(e) => setStep(i, 'roleCode', e.target.value)} placeholder="—" options={(roles.data?.items || []).map((r) => ({ value: r.code, label: nm(r) }))} /> : <span />}
                <Select placeholder={false} value={s.mode || 'ANY'} onChange={(e) => setStep(i, 'mode', e.target.value)} options={[{ value: 'ANY', label: 'ANY' }, { value: 'ALL', label: 'ALL' }]} />
                <div className="flex gap-1"><Input type="number" placeholder={t('fields.minAmount')} value={s.minAmount ?? ''} onChange={(e) => setStep(i, 'minAmount', e.target.value)} /><button type="button" className="btn-ghost text-danger" onClick={() => setEdit((x) => ({ ...x, steps: x.steps.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
            <button type="button" className="btn-secondary btn-sm" onClick={() => setEdit((x) => ({ ...x, steps: [...x.steps, { name: '', approverType: 'ROLE', mode: 'ANY' }] }))}><Plus className="h-4 w-4" />{t('settings.addStep')}</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function SystemLimits() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const q = useGet(['sys-limits'], '/settings/system');
  const [v, setV] = useState({});
  useEffect(() => { if (q.data) setV(q.data); }, [q.data]);
  const save = useSend('put', '/settings/system', { invalidate: ['sys-limits'] });
  return (
    <div>
      <PageHeader title={t('nav.systemSettings')} description={t('settings.limitsHint')} breadcrumbs={crumbs(t, t('nav.systemSettings'))}
        actions={can('settings.settings') && <button type="button" className="btn-primary" onClick={() => save.mutate(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'loans.feesEnabled' ? !!x : x === '' || x === null ? null : Number(x)])))}><Save className="h-4 w-4" />{t('common.save')}</button>} />
      {q.isLoading ? <LoadingState /> : (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.keys(q.data || {}).map((k) => (k === 'loans.feesEnabled'
              ? <Checkbox key={k} label={t(`settings.limits.${k}`)} checked={!!v[k]} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.checked }))} />
              : <Field key={k} label={t(`settings.limits.${k}`)}><Input type="number" value={v[k] ?? ''} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} /></Field>))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function AuditLog() {
  const { t } = useTranslation();
  const [params, setParams] = useState({ page: 1, pageSize: 50, search: '', from: '', to: '' });
  const [view, setView] = useState('table');
  const q = useGet(['audit', params], '/audit', params, { keepPreviousData: true });
  return (
    <div>
      <PageHeader title={t('nav.audit')} description={t('settings.auditHint')} breadcrumbs={crumbs(t, t('nav.audit'))}
        actions={<><ExportButton url="/audit" params={params} filename="audit-log" formats={['xlsx', 'csv']} /><Select className="w-36" placeholder={false} value={view} onChange={(e) => setView(e.target.value)} options={[{ value: 'table', label: t('cfg.table') }, { value: 'timeline', label: t('cfg.timeline') }]} /></>} />
      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <SearchInput className="w-full sm:w-72" value={params.search} onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))} />
          <DateRangePicker from={params.from} to={params.to} onChange={(r) => setParams((p) => ({ ...p, ...r, page: 1 }))} />
        </div>
        {view === 'timeline' ? <div className="p-5">{q.isLoading ? <LoadingState /> : <ActivityTimeline items={q.data?.items} />}</div> : (
          <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} dense page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))} columns={[
            { key: 'w', header: t('fields.when'), render: (a) => dateTime(a.createdAt) }, { key: 'u', header: t('fields.user'), render: (a) => a.userName || '—' },
            { key: 'a', header: t('fields.action'), render: (a) => <span className="font-mono text-xs">{a.action}</span> }, { key: 'e', header: t('fields.entity'), render: (a) => a.entityType },
            { key: 'o', header: t('fields.oldValue'), render: (a) => <span className="line-clamp-2 max-w-[18rem] whitespace-normal font-mono text-[11px] text-danger/80">{a.oldValue ? JSON.stringify(a.oldValue) : ''}</span> },
            { key: 'n', header: t('fields.newValue'), render: (a) => <span className="line-clamp-2 max-w-[18rem] whitespace-normal font-mono text-[11px] text-success">{a.newValue ? JSON.stringify(a.newValue) : ''}</span> },
            { key: 'r', header: t('common.reason'), render: (a) => a.reason || '—' }, { key: 'ip', header: t('fields.ip'), render: (a) => <span dir="ltr">{a.ip || '—'}</span> },
          ]} />
        )}
      </div>
    </div>
  );
}

export function Account() {
  const { t } = useTranslation();
  const [v, setV] = useState({ currentPassword: '', newPassword: '' });
  const send = useSend('post', '/auth/change-password', { onSuccess: () => setV({ currentPassword: '', newPassword: '' }) });
  return (
    <div className="max-w-lg">
      <PageHeader title={t('auth.changePassword')} />
      <Card>
        <div className="space-y-4">
          <Field label={t('auth.currentPassword')}><Input type="password" dir="ltr" value={v.currentPassword} onChange={(e) => setV((x) => ({ ...x, currentPassword: e.target.value }))} /></Field>
          <Field label={t('auth.newPassword')} hint="≥ 10, letters + digits"><Input type="password" dir="ltr" value={v.newPassword} onChange={(e) => setV((x) => ({ ...x, newPassword: e.target.value }))} /></Field>
          <button type="button" className="btn-primary" disabled={!v.currentPassword || v.newPassword.length < 10 || send.isPending} onClick={() => send.mutate(v)}>{t('common.save')}</button>
        </div>
      </Card>
    </div>
  );
}

