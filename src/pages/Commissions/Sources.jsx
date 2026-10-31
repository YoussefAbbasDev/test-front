import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Calculator, CheckCheck } from 'lucide-react';
import { PageHeader, StatusBadge } from '../../components/common/Display';
import { SearchInput } from '../../components/common/Controls';
import { Modal } from '../../components/common/Overlay';
import DataTable from '../../components/tables/DataTable';
import { Checkbox, Field, Input, Select } from '../../components/forms/Fields';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { date, empName, money, nm } from '../../utils/format';
import { CalculateModal } from './CommissionsDashboard';

const FLAGS = ['isCompleted', 'qualityApproved', 'invoiceIssued', 'invoiceCollected', 'isCancelled', 'isRefunded'];

export default function Sources() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [params, setParams] = useState({ page: 1, search: '' });
  const [create, setCreate] = useState(null);
  const [calc, setCalc] = useState(false);
  const branches = useOptions('/organization/branches');
  const emps = useOptions('/employees?pageSize=200');
  const q = useGet(['sources', params], '/commissions/source-transactions', params);
  const send = useSend('post', '/commissions/source-transactions', { invalidate: ['sources'], onSuccess: () => setCreate(null) });
  const flag = useSend('patch', ({ id }) => `/commissions/source-transactions/${id}`, { invalidate: ['sources', 'commissions'] });
  const total = (create?.participants || []).reduce((s, p) => s + Number(p.sharePercent || 0), 0);
  const set = (k, v) => setCreate((c) => ({ ...c, [k]: v }));
  return (
    <div>
      <PageHeader title={t('nav.sources')} description={t('commissions.dedupeHint')} breadcrumbs={[{ label: t('nav.commissions'), to: '/commissions' }, { label: t('nav.sources') }]}
        actions={can('commissions.create') && <>
          <button type="button" className="btn-outline" onClick={() => setCalc(true)}><Calculator className="h-4 w-4" />{t('commissions.calculate')}</button>
          <button type="button" className="btn-primary" onClick={() => setCreate({ externalRef: '', transactionDate: new Date().toISOString().slice(0, 10), salesAmount: '', collectedAmount: '', netProfit: '', taskCount: 1, isCompleted: true, qualityApproved: false, invoiceIssued: true, invoiceCollected: false, participants: [{ employeeId: '', role: 'TECHNICIAN', sharePercent: '100' }] })}><Plus className="h-4 w-4" />{t('commissions.newSource')}</button>
        </>} />
      <div className="card">
        <div className="border-b border-line p-3"><SearchInput className="w-full sm:w-72" value={params.search} onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))} /></div>
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))}
          columns={[
            { key: 'ref', header: t('fields.externalRef'), render: (r) => <span dir="ltr" className="font-mono text-xs">{r.externalRef}</span> }, { key: 'd', header: t('common.date'), render: (r) => date(r.transactionDate) },
            { key: 'svc', header: t('fields.serviceCode'), render: (r) => r.serviceName || r.serviceCode || '—' }, { key: 's', header: t('fields.salesAmount'), render: (r) => money(r.salesAmount) },
            { key: 'c', header: t('fields.collectedAmount'), render: (r) => money(r.collectedAmount), hideOnMobile: true },
            { key: 'p', header: t('fields.participants'), render: (r) => r.participants.map((p) => `${empName(p.employee)} ${Number(p.sharePercent)}%`).join(' · '), hideOnMobile: true },
            { key: 'f', header: t('fields.flags'), render: (r) => <span className="text-[11px]">{r.qualityApproved ? '✓Q ' : ''}{r.invoiceCollected ? '✓$ ' : ''}{r.isCancelled ? '✕C ' : ''}{r.isRefunded ? '↺R' : ''}</span> },
            { key: 'st', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
            { key: 'x', header: '', render: (r) => can('commissions.edit') && (
              <div className="flex gap-1">
                {!r.qualityApproved && <button type="button" className="btn-ghost btn-sm" title={t('fields.qualityApproved')} onClick={() => flag.mutate({ id: r.id, qualityApproved: true })}><CheckCheck className="h-4 w-4" /></button>}
                {!r.isRefunded && <button type="button" className="btn-ghost btn-sm text-danger" title="Refund" onClick={() => flag.mutate({ id: r.id, isRefunded: true })}>↺</button>}
              </div>
            ) },
          ]} />
      </div>
      <Modal open={!!create} onClose={() => setCreate(null)} title={t('commissions.newSource')} size="lg"
        footer={<button type="button" className="btn-primary" disabled={send.isPending || Math.abs(total - 100) > 0.0001} onClick={() => send.mutate({ ...create, branchId: create.branchId || undefined, salesAmount: create.salesAmount || '0', collectedAmount: create.collectedAmount || '0', netProfit: create.netProfit || '0', taskCount: Number(create.taskCount || 1), participants: create.participants.filter((p) => p.employeeId) })}>{t('common.save')}</button>}>
        {create && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t('fields.externalRef')} required><Input dir="ltr" value={create.externalRef} onChange={(e) => set('externalRef', e.target.value)} /></Field>
              <Field label={t('common.date')} required><Input type="date" value={create.transactionDate} onChange={(e) => set('transactionDate', e.target.value)} /></Field>
              <Field label={t('common.branch')}><Select value={create.branchId || ''} onChange={(e) => set('branchId', e.target.value)} options={(branches.data?.items || []).map((b) => ({ value: b.id, label: nm(b) }))} placeholder="—" /></Field>
              <Field label={t('fields.serviceCode')}><Input dir="ltr" value={create.serviceCode || ''} onChange={(e) => set('serviceCode', e.target.value)} /></Field>
              <Field label={t('common.name')}><Input value={create.serviceName || ''} onChange={(e) => set('serviceName', e.target.value)} /></Field>
              <Field label={t('fields.serviceCategory')}><Input dir="ltr" value={create.serviceCategory || ''} onChange={(e) => set('serviceCategory', e.target.value)} /></Field>
              <Field label={t('fields.salesAmount')}><Input type="number" value={create.salesAmount} onChange={(e) => set('salesAmount', e.target.value)} /></Field>
              <Field label={t('fields.collectedAmount')}><Input type="number" value={create.collectedAmount} onChange={(e) => set('collectedAmount', e.target.value)} /></Field>
              <Field label={t('fields.netProfit')}><Input type="number" value={create.netProfit} onChange={(e) => set('netProfit', e.target.value)} /></Field>
            </div>
            <div className="flex flex-wrap gap-4">{FLAGS.map((f) => <Checkbox key={f} label={f.replace(/([A-Z])/g, ' $1').toLowerCase()} checked={!!create[f]} onChange={(e) => set(f, e.target.checked)} />)}</div>
            <div className="rounded-2xl border border-line p-4">
              <p className="mb-2 text-sm font-medium text-navy-700">{t('fields.participants')} <span className={Math.abs(total - 100) > 0.0001 ? 'text-danger' : 'text-success'}>({total}%)</span></p>
              {create.participants.map((p, i) => (
                <div key={i} className="mb-2 grid grid-cols-12 gap-2">
                  <Select className="col-span-6" value={p.employeeId} onChange={(e) => set('participants', create.participants.map((x, j) => (j === i ? { ...x, employeeId: e.target.value } : x)))} placeholder="—" options={(emps.data?.items || []).map((x) => ({ value: x.id, label: `${x.employeeNumber} — ${empName(x)}` }))} />
                  <Select className="col-span-3" placeholder={false} value={p.role} onChange={(e) => set('participants', create.participants.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} options={['TECHNICIAN', 'SALES', 'SUPERVISOR', 'MANAGER'].map((v) => ({ value: v, label: t(`enums.role.${v}`) }))} />
                  <Input className="col-span-2" type="number" value={p.sharePercent} onChange={(e) => set('participants', create.participants.map((x, j) => (j === i ? { ...x, sharePercent: e.target.value } : x)))} />
                  <button type="button" className="btn-ghost col-span-1 text-danger" onClick={() => set('participants', create.participants.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" className="btn-secondary btn-sm" onClick={() => set('participants', [...create.participants, { employeeId: '', role: 'TECHNICIAN', sharePercent: '' }])}><Plus className="h-4 w-4" />{t('common.add')}</button>
              <p className="mt-2 text-xs text-ink-muted">{t('commissions.shareHint')}</p>
            </div>
          </div>
        )}
      </Modal>
      <CalculateModal open={calc} onClose={() => setCalc(false)} />
    </div>
  );
}
