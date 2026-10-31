import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { PageHeader, PersonCell, StatusBadge, Tabs } from '../../components/common/Display';
import { SearchInput, FilterPanel, ExportButton } from '../../components/common/Controls';
import { Modal } from '../../components/common/Overlay';
import DataTable from '../../components/tables/DataTable';
import ResourceForm from '../../components/forms/ResourceForm';
import { useGet, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { date, empName, money } from '../../utils/format';
import { LoansTab } from '../Employees/EmployeeProfile';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'DISBURSED', 'REPAYING', 'SETTLED', 'CANCELLED'];

export function RequestModal({ kind, onClose, forOthers }) {
  const { t } = useTranslation();
  const send = useSend('post', `/${kind}`, { invalidate: [kind, 'statement'], onSuccess: onClose });
  const emp = forOthers ? [{ name: 'employeeId', label: t('common.employee'), type: 'select', placeholder: t('nav.myRequests'), source: { url: '/employees?pageSize=200', label: (x) => `${x.employeeNumber} — ${empName(x)}` } }] : [];
  const fields = kind === 'advances' ? [
    ...emp, { name: 'amount', label: t('common.amount'), type: 'number', required: true, min: 1 }, { name: 'installmentCount', label: t('fields.installments'), type: 'number', integer: true, min: 1, default: 1 },
    { name: 'requestedPaymentDate', label: t('fields.paymentDate'), type: 'date' }, { name: 'firstDeductionDate', label: t('fields.firstDeductionDate'), type: 'date' },
    { name: 'repaymentMethod', label: t('fields.repaymentMethod'), type: 'select', placeholder: false, default: 'PAYROLL', options: [{ value: 'PAYROLL', label: t('nav.payroll') }, { value: 'MANUAL', label: t('enums.method.MANUAL') }] },
    { name: 'reason', label: t('common.reason'), type: 'textarea' }, { name: 'notes', label: t('common.notes'), type: 'textarea' },
  ] : [
    ...emp, { name: 'amount', label: t('common.amount'), type: 'number', required: true, min: 1 },
    { name: 'loanType', label: t('fields.loanType'), type: 'select', placeholder: false, default: 'PERSONAL', options: ['PERSONAL', 'HOUSING', 'EDUCATION', 'MEDICAL', 'OTHER'].map((v) => ({ value: v, label: t(`enums.loanType.${v}`) })) },
    { name: 'installmentCount', label: t('fields.installments'), type: 'number', integer: true, required: true, min: 1, default: 12 }, { name: 'monthlyInstallment', label: t('fields.monthlyInstallment'), type: 'number', min: 0 },
    { name: 'firstDeductionDate', label: t('fields.firstDeductionDate'), type: 'date' },
    { name: 'repaymentMethod', label: t('fields.repaymentMethod'), type: 'select', placeholder: false, default: 'PAYROLL', options: [{ value: 'PAYROLL', label: t('nav.payroll') }, { value: 'MANUAL', label: t('enums.method.MANUAL') }] },
    { name: 'reason', label: t('common.reason'), type: 'textarea' },
  ];
  return (
    <Modal open onClose={onClose} title={kind === 'advances' ? t('loans.newAdvance') : t('loans.newLoan')} footer={<button type="submit" form="fin-form" className="btn-primary" disabled={send.isPending}>{t('common.submit')}</button>}>
      <ResourceForm id="fin-form" fields={fields} defaultValues={{}} onSubmit={(v) => send.mutate({ ...Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null)), installmentCount: Number(v.installmentCount || 1) })} />
    </Modal>
  );
}

export default function FinanceList({ mine }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can, employeeId } = useAuth();
  const [sp] = useSearchParams();
  const [kind, setKind] = useState(sp.get('tab') === 'loans' ? 'loans' : 'advances');
  const [params, setParams] = useState({ page: 1, search: '', status: mine ? '' : 'PENDING' });
  const [create, setCreate] = useState(null);
  const q = useGet([kind, mine, params], `/${kind}`, { ...params, mine: mine ? 'true' : undefined });
  const tabs = [{ key: 'advances', label: t('loans.advance') }, { key: 'loans', label: t('loans.loan') }, ...(mine && employeeId ? [{ key: 'statement', label: t('loans.statement') }] : [])];
  return (
    <div>
      <PageHeader title={mine ? t('nav.myRequests') : t('loans.title')} description={t('loans.subtitle')}
        actions={<>
          {!mine && can(`${kind}.export`) && kind !== 'statement' && <ExportButton url={`/${kind}`} params={params} filename={kind} />}
          {can('advances.create') && <button type="button" className="btn-outline" onClick={() => setCreate('advances')}><Plus className="h-4 w-4" />{t('loans.newAdvance')}</button>}
          {can('loans.create') && <button type="button" className="btn-primary" onClick={() => setCreate('loans')}><Plus className="h-4 w-4" />{t('loans.newLoan')}</button>}
        </>} />
      <Tabs tabs={tabs} active={kind} onChange={(k) => { setKind(k); setParams((p) => ({ ...p, page: 1 })); }} />
      {kind === 'statement' ? <LoansTab emp={{ id: employeeId }} /> : (
        <div className="card">
          {!mine && (
            <div className="flex flex-wrap gap-2 border-b border-line p-3">
              <SearchInput className="w-full sm:w-64" value={params.search} onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))} />
              <FilterPanel values={params} onChange={(k, v) => setParams((p) => ({ ...p, [k]: v, page: 1 }))} onClear={() => setParams((p) => ({ ...p, status: '', page: 1 }))}
                filters={[{ key: 'status', label: t('common.status'), options: STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) }]} />
            </div>
          )}
          <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} onRowClick={(r) => navigate(`/finance/${kind}/${r.id}`)}
            page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))}
            columns={[
              { key: 'n', header: t('fields.number'), render: (r) => <span dir="ltr" className="font-mono text-xs">{r.number}</span> },
              ...(!mine ? [{ key: 'e', header: t('common.employee'), render: (r) => <PersonCell person={r.employee} sub={r.employee.employeeNumber} /> }] : []),
              { key: 'a', header: t('common.amount'), render: (r) => money(r.amount) }, { key: 'i', header: t('fields.installments'), render: (r) => r.installmentCount },
              { key: 'p', header: t('fields.paid'), render: (r) => money(r.paid) }, { key: 'd', header: t('fields.requestDate'), render: (r) => date(r.requestDate) },
              { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
            ]} />
        </div>
      )}
      {create && <RequestModal kind={create} forOthers={!mine && can(`${create}.edit`)} onClose={() => setCreate(null)} />}
    </div>
  );
}
