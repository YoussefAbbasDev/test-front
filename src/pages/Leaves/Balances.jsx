import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, Forward } from 'lucide-react';
import { PageHeader, PersonCell } from '../../components/common/Display';
import { ExportButton, FilterPanel } from '../../components/common/Controls';
import { Modal, ConfirmDialog } from '../../components/common/Overlay';
import DataTable from '../../components/tables/DataTable';
import ResourceForm from '../../components/forms/ResourceForm';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { empName, nm } from '../../utils/format';

export default function Balances() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [params, setParams] = useState({ year: new Date().getFullYear(), leaveTypeId: '' });
  const [adjust, setAdjust] = useState(null);
  const [cf, setCf] = useState(false);
  const types = useOptions('/leaves/types');
  const q = useGet(['balances', params], '/leaves/balances', params);
  const send = useSend('post', '/leaves/balances/adjust', { invalidate: ['balances'], onSuccess: () => setAdjust(null) });
  const carry = useSend('post', '/leaves/balances/carry-forward', { invalidate: ['balances'], onSuccess: () => setCf(false) });
  return (
    <div>
      <PageHeader title={t('nav.balances')} description={t('leaves.balanceFormula')} breadcrumbs={[{ label: t('nav.leaves'), to: '/leaves' }, { label: t('nav.balances') }]}
        actions={<>
          <ExportButton url="/leaves/balances" params={params} filename="leave-balances" />
          {can('leaves.edit') && <button type="button" className="btn-outline" onClick={() => setAdjust({ year: params.year })}><SlidersHorizontal className="h-4 w-4" />{t('leaves.adjust')}</button>}
          {can('leaves.settings') && <button type="button" className="btn-outline" onClick={() => setCf(true)}><Forward className="h-4 w-4 rtl:-scale-x-100" />{t('leaves.carryForward')}</button>}
        </>} />
      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <input type="number" className="input w-28" value={params.year} onChange={(e) => setParams((p) => ({ ...p, year: e.target.value }))} />
          <FilterPanel values={params} onChange={(k, v) => setParams((p) => ({ ...p, [k]: v }))} onClear={() => setParams((p) => ({ ...p, leaveTypeId: '' }))}
            filters={[{ key: 'leaveTypeId', label: t('fields.leaveType'), options: (types.data?.items || []).map((x) => ({ value: x.id, label: nm(x) })) }]} />
        </div>
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} dense columns={[
          { key: 'e', header: t('common.employee'), render: (r) => <PersonCell person={r.employee} sub={r.employee.employeeNumber} /> }, { key: 't', header: t('fields.leaveType'), render: (r) => nm(r.leaveType) },
          { key: 'o', header: t('fields.opening'), render: (r) => Number(r.openingBalance) }, { key: 'a', header: t('fields.accrued'), render: (r) => Number(r.accrued) },
          { key: 'c', header: t('fields.carried'), render: (r) => Number(r.carriedForward) }, { key: 'ad', header: t('fields.adjustments'), render: (r) => Number(r.adjustments) },
          { key: 'u', header: t('fields.used'), render: (r) => Number(r.used) }, { key: 'p', header: t('fields.pending'), render: (r) => Number(r.pending) },
          { key: 'cur', header: t('fields.current'), render: (r) => <b className="text-navy-700">{r.current}</b> }, { key: 'av', header: t('fields.available'), render: (r) => r.available },
        ]} />
      </div>
      <Modal open={!!adjust} onClose={() => setAdjust(null)} title={t('leaves.adjust')} footer={<button type="submit" form="adj-form" className="btn-primary" disabled={send.isPending}>{t('common.save')}</button>}>
        {adjust && <ResourceForm id="adj-form" defaultValues={{ ...adjust, type: 'ADJUSTMENT' }} onSubmit={(v) => send.mutate({ ...v, year: Number(v.year) })} fields={[
          { name: 'employeeId', label: t('common.employee'), type: 'select', required: true, source: { url: '/employees?pageSize=200', label: (x) => `${x.employeeNumber} — ${empName(x)}` } },
          { name: 'leaveTypeId', label: t('fields.leaveType'), type: 'select', required: true, source: { url: '/leaves/types', label: nm } },
          { name: 'year', label: t('common.year'), type: 'number', integer: true, required: true }, { name: 'type', label: t('common.type'), type: 'select', placeholder: false, options: [{ value: 'ADJUSTMENT', label: t('fields.adjustments') }, { value: 'OPENING', label: t('fields.opening') }] },
          { name: 'days', label: `${t('leaves.days')} (±)`, type: 'number', required: true }, { name: 'reason', label: t('common.reason'), required: true },
        ]} />}
      </Modal>
      <ConfirmDialog open={cf} onClose={() => setCf(false)} title={t('leaves.carryForward')} message={`${params.year} → ${Number(params.year) + 1}`} busy={carry.isPending} onConfirm={() => carry.mutate({ fromYear: Number(params.year) })} />
    </div>
  );
}
