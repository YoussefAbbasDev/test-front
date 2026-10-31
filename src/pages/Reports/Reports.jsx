import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { FileBarChart2 } from 'lucide-react';
import { PageHeader, Card } from '../../components/common/Display';
import { DateRangePicker, ExportButton } from '../../components/common/Controls';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/Feedback';
import { Select } from '../../components/forms/Fields';
import { useGet, useOptions } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { nm } from '../../utils/format';

// Every report endpoint returns { columns: [header], rows: [[value]] } and supports format=xlsx|pdf|csv.
const CATALOG = {
  attendance: { perm: 'attendance.view', types: ['daily', 'monthly', 'employee', 'branch', 'late', 'absence', 'overtime', 'missing-checkout', 'corrections', 'suspicious'] },
  shifts: { perm: 'shifts.view', types: ['coverage', 'missing-staff', 'employee-history', 'changes', 'overtime', 'branch'] },
  leaves: { perm: 'leaves.view', types: ['usage', 'pending', 'by-department', 'by-branch', 'forecast', 'unpaid'] },
  payroll: { perm: 'payroll.view', types: ['summary', 'by-branch', 'by-department', 'by-employee', 'earnings', 'deductions', 'overtime', 'commissions', 'bank', 'comparison', 'cost-analysis'] },
};

export default function Reports({ module }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const modules = Object.keys(CATALOG).filter((m) => (!module || m === module) && can(CATALOG[m].perm));
  const [mod, setMod] = useState(modules[0]);
  const [type, setType] = useState(CATALOG[modules[0]]?.types[0]);
  const [params, setParams] = useState({ from: dayjs().startOf('month').format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD'), branchId: '', runId: '' });
  const branches = useOptions('/organization/branches');
  const runs = useGet(['runs', 'report'], mod === 'payroll' ? '/payroll/runs' : null, { pageSize: 50 });
  const url = mod && type ? `/${mod}/reports/${type}` : null;
  const q = useGet(['report', url, params], url, params, { keepPreviousData: true });
  if (!modules.length) return <EmptyState title={t('errors.forbidden')} hint=" " />;
  const label = (m, ty) => t(`${m}.reports.${ty}`);
  return (
    <div>
      <PageHeader title={module ? `${t(`nav.${module}`)} — ${t('nav.reports')}` : t('reports.title')} description={t('reports.subtitle')}
        actions={url && <ExportButton url={url} params={params} filename={`${mod}-${type}`} formats={['xlsx', 'pdf', 'csv']} />} />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card bodyClass="p-2">
          {modules.map((m) => (
            <div key={m} className="mb-2">
              {!module && <p className="px-3 py-2 text-xs font-semibold uppercase text-ink-muted">{t(`nav.${m}`)}</p>}
              {CATALOG[m].types.map((ty) => (
                <button key={ty} type="button" onClick={() => { setMod(m); setType(ty); }} className={clsx('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm', mod === m && type === ty ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-soft hover:bg-canvas')}>
                  <FileBarChart2 className="h-4 w-4 shrink-0" />{label(m, ty)}
                </button>
              ))}
            </div>
          ))}
        </Card>
        <div className="card min-w-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <h2 className="me-auto font-semibold text-navy-700">{label(mod, type)}</h2>
            {mod !== 'payroll' && <DateRangePicker from={params.from} to={params.to} onChange={(r) => setParams((p) => ({ ...p, ...r }))} />}
            {mod !== 'payroll' && <Select className="w-44" value={params.branchId} onChange={(e) => setParams((p) => ({ ...p, branchId: e.target.value }))} options={(branches.data?.items || []).map((b) => ({ value: b.id, label: nm(b) }))} placeholder={t('common.branch')} />}
            {mod === 'payroll' && <Select className="w-56" value={params.runId} onChange={(e) => setParams((p) => ({ ...p, runId: e.target.value }))} options={(runs.data?.items || []).map((r) => ({ value: r.id, label: `${r.runNumber} · ${r.period.name}` }))} placeholder={t('payroll.latestRun')} />}
          </div>
          {q.isLoading ? <LoadingState /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : !q.data?.rows?.length ? <EmptyState /> : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-canvas"><tr>{q.data.columns.map((c) => <th key={c} className="table-head">{c}</th>)}</tr></thead>
                <tbody className="divide-y divide-line">{q.data.rows.map((r, i) => <tr key={i} className="hover:bg-brand-50/40">{r.map((v, j) => <td key={j} className="table-cell">{v === '' || v === null ? '—' : String(v)}</td>)}</tr>)}</tbody>
              </table>
              <p className="border-t border-line px-4 py-2 text-xs text-ink-muted">{q.data.rows.length} {t('common.rows')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
