import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { PageHeader, PersonCell, StatusBadge, Tabs } from '../../components/common/Display';
import { SearchInput } from '../../components/common/Controls';
import { Select } from '../../components/forms/Fields';
import DataTable from '../../components/tables/DataTable';
import { useGet } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { download } from '../../services/api';
import { date, money } from '../../utils/format';

export default function PayslipsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { employeeId, can } = useAuth();
  const canAll = can('payslips.export') || can('payroll.view');
  const [tab, setTab] = useState(canAll ? 'all' : 'mine');
  const [params, setParams] = useState({ page: 1, year: String(new Date().getFullYear()), month: '', search: '' });
  const q = useGet(['payslips', tab, params], '/payslips', { ...params, mine: tab === 'mine' ? 'true' : undefined });
  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));
  return (
    <div>
      <PageHeader title={t('payslips.title')} description={t('payslips.subtitle')} />
      {canAll && employeeId && <Tabs tabs={[{ key: 'all', label: t('common.all') }, { key: 'mine', label: t('nav.myPayslips') }]} active={tab} onChange={setTab} />}
      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          {tab === 'all' && <SearchInput className="w-full sm:w-64" value={params.search} onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))} />}
          <Select className="w-32" value={params.year} onChange={(e) => setParams((p) => ({ ...p, year: e.target.value, page: 1 }))} placeholder={t('common.year')} options={years.map((y) => ({ value: y, label: y }))} />
          <Select className="w-40" value={params.month} onChange={(e) => setParams((p) => ({ ...p, month: e.target.value, page: 1 }))} placeholder={t('common.month')} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Date(2026, i, 1).toLocaleString(undefined, { month: 'long' }) }))} />
        </div>
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} onRowClick={(r) => navigate(`/payslips/${r.id}`)}
          page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))}
          columns={[
            { key: 'n', header: t('fields.number'), render: (r) => <span dir="ltr" className="font-mono text-xs">{r.number}</span> },
            ...(tab === 'all' ? [{ key: 'e', header: t('common.employee'), render: (r) => <PersonCell person={r.employee} sub={r.employee.employeeNumber} /> }] : []),
            { key: 'p', header: t('fields.period'), render: (r) => `${date(r.periodStart)} → ${date(r.periodEnd)}` }, { key: 'g', header: t('fields.gross'), render: (r) => money(r.grossEarnings), hideOnMobile: true },
            { key: 'd', header: t('fields.deductions'), render: (r) => money(r.totalDeductions), hideOnMobile: true }, { key: 'net', header: t('fields.net'), render: (r) => <b>{money(r.netSalary)}</b> },
            { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
            { key: 'x', header: '', render: (r) => <button type="button" className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); download(`/payslips/${r.id}/pdf`, {}, `payslip-${r.number}.pdf`); }}><Download className="h-4 w-4" /></button> },
          ]} />
      </div>
    </div>
  );
}
