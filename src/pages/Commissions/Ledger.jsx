import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X, Pause, Play, Undo2, Plus, Wallet } from 'lucide-react';
import { PageHeader, PersonCell, StatusBadge, StatCard } from '../../components/common/Display';
import { FilterPanel, ExportButton, DateRangePicker } from '../../components/common/Controls';
import { Modal, ConfirmDialog } from '../../components/common/Overlay';
import DataTable from '../../components/tables/DataTable';
import ResourceForm from '../../components/forms/ResourceForm';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { date, empName, money, nm } from '../../utils/format';

const STATUSES = ['CALCULATED', 'PENDING_APPROVAL', 'APPROVED', 'ON_HOLD', 'PAYABLE', 'INCLUDED_IN_PAYROLL', 'PAID', 'REVERSED', 'CANCELLED'];

export default function Ledger({ mine }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [sp] = useSearchParams();
  const [params, setParams] = useState({ page: 1, pageSize: 50, status: sp.get('status') || '', branchId: '', ruleId: '', from: '', to: '', mine: mine ? 'true' : undefined });
  const [selected, setSelected] = useState([]);
  const [action, setAction] = useState(null);
  const [manual, setManual] = useState(false);
  const branches = useOptions('/organization/branches');
  const rules = useOptions('/commissions/rules');
  const q = useGet(['commissions', params], '/commissions', params, { keepPreviousData: true });
  const bulk = useSend('post', ({ a }) => `/commissions/bulk/${a}`, { invalidate: ['commissions', 'comm-dash'], onSuccess: () => { setSelected([]); setAction(null); } });
  const single = useSend('post', ({ id, a }) => `/commissions/${id}/${a}`, { invalidate: ['commissions', 'comm-dash'], onSuccess: () => setAction(null) });
  const manualSend = useSend('post', '/commissions/manual', { invalidate: ['commissions'], onSuccess: () => setManual(false) });
  const totals = q.data?.totals || {};
  const sumOf = (list) => list.reduce((s, k) => s + Number(totals[k] || 0), 0);
  const ACTIONS = { approve: [Check, 'common.approve'], reject: [X, 'common.reject'], hold: [Pause, 'commissions.hold'], release: [Play, 'commissions.release'], payable: [Wallet, 'commissions.payable'] };

  return (
    <div>
      <PageHeader title={mine ? t('nav.myCommissions') : t('nav.ledger')} description={t('commissions.dedupeHint')} breadcrumbs={[{ label: t('nav.commissions'), to: '/commissions' }, { label: mine ? t('nav.myCommissions') : t('nav.ledger') }]}
        actions={!mine && <>
          {can('commissions.export') && <ExportButton url="/commissions" params={params} filename="commissions" />}
          {can('commissions.create') && <button type="button" className="btn-outline" onClick={() => setManual(true)}><Plus className="h-4 w-4" />{t('commissions.manual')}</button>}
        </>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t('commissions.pending')} value={money(sumOf(['CALCULATED', 'PENDING_APPROVAL', 'ON_HOLD']))} />
        <StatCard label={t('commissions.approved')} value={money(sumOf(['APPROVED', 'PAYABLE']))} tone="success" />
        <StatCard label={t('status.INCLUDED_IN_PAYROLL')} value={money(sumOf(['INCLUDED_IN_PAYROLL']))} tone="navy" />
        <StatCard label={t('commissions.paid')} value={money(sumOf(['PAID']))} tone="info" />
      </div>
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <DateRangePicker from={params.from} to={params.to} onChange={(r) => setParams((p) => ({ ...p, ...r, page: 1 }))} />
          <FilterPanel values={params} onChange={(k, v) => setParams((p) => ({ ...p, [k]: v, page: 1 }))} onClear={() => setParams((p) => ({ ...p, status: '', branchId: '', ruleId: '', page: 1 }))}
            filters={[
              { key: 'status', label: t('common.status'), options: STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) },
              ...(!mine ? [{ key: 'branchId', label: t('common.branch'), options: (branches.data?.items || []).map((b) => ({ value: b.id, label: nm(b) })) }] : []),
              { key: 'ruleId', label: t('fields.rule'), options: (rules.data?.items || []).map((b) => ({ value: b.id, label: nm(b) })) },
            ]} />
          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-brand-50 px-3 py-1.5 text-sm text-brand-700 lg:ms-auto">
              <span className="me-1">{selected.length} {t('common.selected')}</span>
              {Object.entries(ACTIONS).filter(([k]) => can(k === 'reject' ? 'commissions.reject' : 'commissions.approve')).map(([k, [Icon, label]]) => <button key={k} type="button" className="btn-ghost btn-sm" onClick={() => setAction({ bulk: true, a: k })}><Icon className="h-4 w-4" />{t(label)}</button>)}
            </div>
          )}
        </div>
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))}
          selectable={!mine && can('commissions.approve')} selected={selected} onSelect={setSelected}
          columns={[
            { key: 'd', header: t('common.date'), render: (r) => date(r.earnedDate) },
            ...(!mine ? [{ key: 'e', header: t('common.employee'), render: (r) => <PersonCell person={r.employee} sub={r.employee.employeeNumber} /> }] : []),
            { key: 'rule', header: t('fields.rule'), render: (r) => (r.rule ? nm(r.rule) : t('commissions.manual')) }, { key: 'type', header: t('commissions.entryType'), render: (r) => r.entryType },
            { key: 'svc', header: t('fields.serviceCode'), render: (r) => r.serviceCode || r.periodKey || '—', hideOnMobile: true },
            { key: 'base', header: t('fields.calculationBase'), render: (r) => money(r.calculationBase), hideOnMobile: true },
            { key: 'rate', header: t('fields.rate'), render: (r) => (r.rate != null ? Number(r.rate) : '—'), hideOnMobile: true }, { key: 'share', header: t('fields.share'), render: (r) => `${Number(r.sharePercent)}%`, hideOnMobile: true },
            { key: 'net', header: t('fields.commission'), render: (r) => <b className={Number(r.netAmount) < 0 ? 'text-danger' : ''}>{money(r.netAmount)}</b> },
            { key: 's', header: t('common.status'), render: (r) => <span title={r.holdReason || ''}><StatusBadge status={r.status} /></span> },
            ...(!mine && can('commissions.approve') ? [{ key: 'x', header: '', render: (r) => (!['REVERSED', 'CANCELLED'].includes(r.status) && r.entryType !== 'REVERSAL' ? <button type="button" className="btn-ghost h-8 w-8 p-0" title={t('commissions.reverse')} onClick={() => setAction({ id: r.id, a: 'reverse' })}><Undo2 className="h-4 w-4" /></button> : null) }] : []),
          ]} />
      </div>
      {action && (
        <ConfirmDialog open onClose={() => setAction(null)} title={action.a === 'reverse' ? t('commissions.reverse') : t(ACTIONS[action.a][1])} danger={['reject', 'reverse', 'hold'].includes(action.a)}
          requireReason={['reject', 'reverse', 'hold'].includes(action.a) ? true : undefined} busy={bulk.isPending || single.isPending}
          onConfirm={(reason) => (action.bulk ? bulk.mutate({ a: action.a, __body: { ids: selected, reason } }) : single.mutate({ id: action.id, a: action.a, __body: { reason } }))} />
      )}
      <Modal open={manual} onClose={() => setManual(false)} title={t('commissions.manual')} footer={<button type="submit" form="man-form" className="btn-primary" disabled={manualSend.isPending}>{t('common.save')}</button>}>
        <ResourceForm id="man-form" defaultValues={{}} onSubmit={(v) => manualSend.mutate(v)} fields={[
          { name: 'employeeId', label: t('common.employee'), type: 'select', required: true, source: { url: '/employees?pageSize=200', label: (x) => `${x.employeeNumber} — ${empName(x)}` } },
          { name: 'amount', label: `${t('common.amount')} (±)`, type: 'number', required: true }, { name: 'earnedDate', label: t('common.date'), type: 'date' },
          { name: 'ruleId', label: t('fields.rule'), type: 'select', source: { url: '/commissions/rules', label: nm } }, { name: 'reason', label: t('common.reason'), type: 'textarea', required: true },
        ]} />
      </Modal>
    </div>
  );
}
