import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Ban, Plus, Trash2 } from 'lucide-react';
import ResourcePage, { statusColumn } from '../ResourcePage';
import { PageHeader, PersonCell, StatusBadge } from '../../components/common/Display';
import { Modal } from '../../components/common/Overlay';
import { Field, Input, Select } from '../../components/forms/Fields';
import DataTable from '../../components/tables/DataTable';
import ResourceForm from '../../components/forms/ResourceForm';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { date, empName, money, nm } from '../../utils/format';

const perms = { create: 'payroll.settings', edit: 'payroll.settings', delete: 'payroll.settings' };
const crumbs = (t, label) => [{ label: t('nav.payroll'), to: '/payroll' }, { label }];
const CATEGORIES = ['BASIC', 'HOUSING', 'TRANSPORT', 'ALLOWANCE', 'VARIABLE_ALLOWANCE', 'OVERTIME', 'COMMISSION', 'BONUS', 'OTHER_EARNING', 'ABSENCE', 'LATE', 'EARLY_LEAVE', 'UNPAID_LEAVE', 'ADVANCE', 'LOAN', 'PENALTY', 'GOSI', 'OTHER_DEDUCTION'];
const METHODS = ['EMPLOYEE_AMOUNT', 'FIXED', 'PERCENT_OF_BASIC', 'PERCENT_OF_COMPONENT', 'ATTENDANCE_BASED', 'WORKING_DAYS', 'HOURLY', 'FORMULA', 'SYSTEM'];

export function Components() {
  const { t } = useTranslation();
  return (
    <ResourcePage title={t('nav.components')} description={t('payroll.formulaHelp')} endpoint="/payroll/components" perms={perms} breadcrumbs={crumbs(t, t('nav.components'))} formColumns={3} defaultSort="sortOrder"
      filters={[{ key: 'type', label: t('common.type'), options: ['EARNING', 'DEDUCTION'].map((v) => ({ value: v, label: t(`enums.componentType.${v}`) })) }]}
      columns={[
        { key: 'code', header: t('common.code'), render: (r) => <span dir="ltr" className="font-mono text-xs">{r.code}</span> }, { key: 'name', header: t('common.name'), render: (r) => nm(r) },
        { key: 'type', header: t('common.type'), render: (r) => <span className={r.type === 'EARNING' ? 'text-success' : 'text-danger'}>{t(`enums.componentType.${r.type}`)}</span> },
        { key: 'm', header: t('fields.calculationMethod'), render: (r) => t(`enums.calcMethod.${r.calculationMethod}`) },
        { key: 'v', header: t('fields.value'), render: (r) => (r.formula ? <span dir="ltr" className="font-mono text-xs">{r.formula}</span> : r.value != null ? Number(r.value) : '—') },
        { key: 'flags', header: '', render: (r) => <span className="text-[11px] text-ink-muted">{[r.includeInOvertimeBase && 'OT', r.includeInGosiBase && 'GOSI', r.includeInEosBase && 'EOS', r.includeInAbsenceBase && 'ABS', r.isSystem && 'SYS'].filter(Boolean).join(' · ')}</span> },
        statusColumn(t),
      ]}
      fields={[
        { name: 'code', label: t('common.code'), required: true, ltr: true, pattern: /^[A-Z][A-Z0-9_]*$/, patternMessage: 'A-Z 0-9 _' },
        { name: 'nameAr', label: t('fields.nameAr'), required: true }, { name: 'nameEn', label: t('fields.nameEn'), required: true },
        { name: 'type', label: t('common.type'), type: 'select', required: true, options: ['EARNING', 'DEDUCTION'].map((v) => ({ value: v, label: t(`enums.componentType.${v}`) })) },
        { name: 'category', label: t('fields.category'), type: 'select', required: true, options: CATEGORIES.map((v) => ({ value: v, label: v })) },
        { name: 'calculationMethod', label: t('fields.calculationMethod'), type: 'select', placeholder: false, default: 'EMPLOYEE_AMOUNT', options: METHODS.map((v) => ({ value: v, label: t(`enums.calcMethod.${v}`) })) },
        { name: 'value', label: t('fields.value'), type: 'number', show: (v) => ['FIXED', 'PERCENT_OF_BASIC', 'PERCENT_OF_COMPONENT', 'ATTENDANCE_BASED', 'WORKING_DAYS', 'HOURLY'].includes(v.calculationMethod) },
        { name: 'baseComponentCode', label: t('cfg.baseComponent'), ltr: true, show: (v) => v.calculationMethod === 'PERCENT_OF_COMPONENT' },
        { name: 'formula', label: t('fields.formula'), ltr: true, span: 'full', show: (v) => v.calculationMethod === 'FORMULA', hint: t('payroll.formulaHelp') },
        { name: 'sortOrder', label: t('fields.sortOrder'), type: 'number', integer: true },
        { name: 'status', label: t('common.status'), type: 'select', placeholder: false, default: 'ACTIVE', options: [{ value: 'ACTIVE', label: t('status.ACTIVE') }, { value: 'INACTIVE', label: t('status.INACTIVE') }] },
        { name: 'prorate', label: t('fields.prorate'), type: 'checkbox', default: true }, { name: 'isTaxable', label: t('fields.isTaxable'), type: 'checkbox' },
        { name: 'includeInOvertimeBase', label: t('fields.includeInOvertimeBase'), type: 'checkbox' }, { name: 'includeInEosBase', label: t('fields.includeInEosBase'), type: 'checkbox' },
        { name: 'includeInGosiBase', label: t('fields.includeInGosiBase'), type: 'checkbox' }, { name: 'includeInAbsenceBase', label: t('fields.includeInAbsenceBase'), type: 'checkbox' },
      ]}
      transformIn={(r) => ({ ...r, value: r.value != null ? String(r.value) : '' })}
      transformOut={(v, row) => {
        const out = { ...v, sortOrder: v.sortOrder === null ? undefined : Number(v.sortOrder) };
        if (row?.isSystem) { delete out.code; delete out.type; delete out.category; }
        return out;
      }} />
  );
}

function StructureLines({ value, onChange }) {
  const { t } = useTranslation();
  const comps = useOptions('/payroll/components');
  const list = comps.data?.items || [];
  const set = (i, k, v) => onChange(value.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  return (
    <div className="space-y-2">
      {value.map((l, i) => (
        <div key={i} className="grid grid-cols-12 gap-2">
          <Select className="col-span-4" value={l.componentId} onChange={(e) => set(i, 'componentId', e.target.value)} placeholder="—" options={list.map((c) => ({ value: c.id, label: `${c.code} — ${nm(c)}` }))} />
          <Select className="col-span-3" value={l.calculationMethod || ''} onChange={(e) => set(i, 'calculationMethod', e.target.value || null)} placeholder={t('fields.calculationMethod')} options={['FIXED', 'PERCENT_OF_BASIC', 'PERCENT_OF_COMPONENT', 'FORMULA'].map((v) => ({ value: v, label: t(`enums.calcMethod.${v}`) }))} />
          <Input className="col-span-4" dir="ltr" value={l.calculationMethod === 'FORMULA' ? l.formula || '' : l.value ?? ''} placeholder={l.calculationMethod === 'FORMULA' ? 'BASIC * 0.25' : t('fields.value')}
            onChange={(e) => (l.calculationMethod === 'FORMULA' ? set(i, 'formula', e.target.value) : set(i, 'value', e.target.value))} />
          <button type="button" className="btn-ghost col-span-1 text-danger" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button type="button" className="btn-secondary btn-sm" onClick={() => onChange([...value, { componentId: '', calculationMethod: 'PERCENT_OF_BASIC', value: '' }])}><Plus className="h-4 w-4" />{t('common.add')}</button>
    </div>
  );
}

export function Structures() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [edit, setEdit] = useState(null);
  const q = useGet(['structures'], '/payroll/structures', { all: 'true' });
  const save = useSend(edit?.id ? 'put' : 'post', () => (edit?.id ? `/payroll/structures/${edit.id}` : '/payroll/structures'), { invalidate: ['structures', ['options', '/payroll/structures']], onSuccess: () => setEdit(null) });
  return (
    <div>
      <PageHeader title={t('nav.structures')} breadcrumbs={crumbs(t, t('nav.structures'))} actions={can('payroll.settings') && <button type="button" className="btn-primary" onClick={() => setEdit({ code: '', name: '', lines: [] })}><Plus className="h-4 w-4" />{t('common.add')}</button>} />
      <div className="card">
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} onRowClick={(r) => can('payroll.settings') && setEdit({ ...r, lines: r.lines.map((l) => ({ componentId: l.componentId, calculationMethod: l.calculationMethod, value: l.value != null ? String(l.value) : '', formula: l.formula })) })} columns={[
          { key: 'code', header: t('common.code') }, { key: 'name', header: t('common.name') }, { key: 'def', header: '★', render: (r) => (r.isDefault ? '★' : '') },
          { key: 'lines', header: t('nav.components'), render: (r) => r.lines.map((l) => `${l.component.code}${l.calculationMethod === 'PERCENT_OF_BASIC' ? ` ${Number(l.value)}%` : ''}`).join(' · ') || '—' },
          { key: 'emps', header: t('fields.employees'), render: (r) => r._count.employees }, statusColumn(t),
        ]} />
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={t('nav.structures')} size="lg" footer={<button type="button" className="btn-primary" disabled={save.isPending} onClick={() => save.mutate({ code: edit.code, name: edit.name, isDefault: !!edit.isDefault, lines: edit.lines.filter((l) => l.componentId).map((l) => ({ ...l, value: l.value === '' ? null : l.value })) })}>{t('common.save')}</button>}>
        {edit && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t('common.code')} required><Input dir="ltr" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></Field>
              <Field label={t('common.name')} required><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={!!edit.isDefault} onChange={(e) => setEdit({ ...edit, isDefault: e.target.checked })} />Default</label>
            </div>
            <StructureLines value={edit.lines} onChange={(lines) => setEdit({ ...edit, lines })} />
            <p className="text-xs text-ink-muted">{t('payroll.formulaHelp')}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function Adjustments() {
  const { t } = useTranslation();
  const { can, user } = useAuth();
  const [params, setParams] = useState({ page: 1, status: '' });
  const [create, setCreate] = useState(false);
  const q = useGet(['adjustments', params], '/payroll/adjustments', params);
  const send = useSend('post', '/payroll/adjustments', { invalidate: ['adjustments'], onSuccess: () => setCreate(false) });
  const decide = useSend('post', ({ id, d }) => `/payroll/adjustments/${id}/${d}`, { invalidate: ['adjustments'] });
  return (
    <div>
      <PageHeader title={t('nav.adjustments')} breadcrumbs={crumbs(t, t('nav.adjustments'))} actions={can('payroll.create') && <button type="button" className="btn-primary" onClick={() => setCreate(true)}><Plus className="h-4 w-4" />{t('common.add')}</button>} />
      <div className="card">
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))} columns={[
          { key: 'e', header: t('common.employee'), render: (r) => <PersonCell person={r.employee} sub={r.employee.employeeNumber} /> },
          { key: 't', header: t('common.type'), render: (r) => <span className={r.type === 'EARNING' ? 'text-success' : 'text-danger'}>{t(`enums.componentType.${r.type}`)} · {r.category}</span> },
          { key: 'a', header: t('common.amount'), render: (r) => money(r.amount) }, { key: 'd', header: t('fields.effectiveFrom'), render: (r) => date(r.effectiveDate) },
          { key: 'r', header: t('common.reason'), render: (r) => r.reason }, { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
          { key: 'x', header: '', render: (r) => (r.status === 'PENDING' && can('payroll.approve') && r.createdById !== user?.id ? (
            <div className="flex gap-1"><button type="button" className="btn-primary btn-sm" onClick={() => decide.mutate({ id: r.id, d: 'approve' })}><Check className="h-4 w-4" /></button><button type="button" className="btn-outline btn-sm" onClick={() => decide.mutate({ id: r.id, d: 'cancel' })}><Ban className="h-4 w-4" /></button></div>
          ) : null) },
        ]} />
      </div>
      <Modal open={create} onClose={() => setCreate(false)} title={t('nav.adjustments')} footer={<button type="submit" form="adj-pay" className="btn-primary" disabled={send.isPending}>{t('common.save')}</button>}>
        <ResourceForm id="adj-pay" defaultValues={{ type: 'EARNING', category: 'BONUS' }} onSubmit={(v) => send.mutate(v)} fields={[
          { name: 'employeeId', label: t('common.employee'), type: 'select', required: true, source: { url: '/employees?pageSize=200', label: (x) => `${x.employeeNumber} — ${empName(x)}` } },
          { name: 'type', label: t('common.type'), type: 'select', placeholder: false, options: ['EARNING', 'DEDUCTION'].map((v) => ({ value: v, label: t(`enums.componentType.${v}`) })) },
          { name: 'category', label: t('fields.category'), type: 'select', placeholder: false, options: ['BONUS', 'OTHER_EARNING', 'PENALTY', 'OTHER_DEDUCTION'].map((v) => ({ value: v, label: v })) },
          { name: 'amount', label: t('common.amount'), type: 'number', required: true, min: 0.01 }, { name: 'effectiveDate', label: t('fields.effectiveFrom'), type: 'date', required: true },
          { name: 'originalRunId', label: `${t('fields.runNumber')} (${t('common.optional')})`, type: 'select', source: { url: '/payroll/runs?status=LOCKED,PAID,PARTIALLY_PAID', label: (r) => r.runNumber } },
          { name: 'reason', label: t('common.reason'), required: true, type: 'textarea' },
        ]} />
      </Modal>
    </div>
  );
}
