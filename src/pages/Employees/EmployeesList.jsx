import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, UserMinus, UserCheck, Archive } from 'lucide-react';
import { PageHeader, PersonCell, StatusBadge } from '../../components/common/Display';
import { SearchInput, FilterPanel, ExportButton } from '../../components/common/Controls';
import { ConfirmDialog } from '../../components/common/Overlay';
import DataTable from '../../components/tables/DataTable';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { date, empName, nm, ttl, today } from '../../utils/format';

const STATUSES = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'PROBATION', 'RESIGNED', 'TERMINATED', 'INACTIVE'];

export default function EmployeesList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [sp] = useSearchParams();
  const [params, setParams] = useState({ page: 1, pageSize: 20, search: '', sort: 'employeeNumber', status: sp.get('status') || '', contractExpiringDays: sp.get('contractExpiringDays') || '' });
  const [selected, setSelected] = useState([]);
  const [bulk, setBulk] = useState(null);
  const q = useGet(['employees', params], '/employees', params, { keepPreviousData: true });
  const branches = useOptions('/organization/branches');
  const depts = useOptions('/organization/departments');
  const positions = useOptions('/organization/positions');
  const bulkSend = useSend('post', '/employees/bulk', { invalidate: ['employees'], onSuccess: () => { setBulk(null); setSelected([]); } });

  const columns = [
    { key: 'employeeNumber', header: t('fields.employeeNumber'), sortKey: 'employeeNumber', render: (r) => <span className="font-mono text-xs text-ink-soft" dir="ltr">{r.employeeNumber}</span> },
    { key: 'name', header: t('fields.fullName'), sortKey: 'firstName', render: (r) => <PersonCell person={r} sub={r.email} /> },
    { key: 'title', header: t('fields.jobTitle'), render: (r) => ttl(r.position) || '—' },
    { key: 'dept', header: t('common.department'), render: (r) => nm(r.department) || '—' },
    { key: 'branch', header: t('common.branch'), render: (r) => nm(r.branch) || '—', hideOnMobile: true },
    { key: 'manager', header: t('fields.manager'), render: (r) => empName(r.manager) || '—', hideOnMobile: true },
    { key: 'type', header: t('fields.employmentType'), render: (r) => t(`enums.employmentType.${r.employmentType}`), hideOnMobile: true },
    { key: 'hire', header: t('fields.hireDate'), sortKey: 'hireDate', render: (r) => date(r.hireDate), hideOnMobile: true },
    { key: 'contract', header: t('fields.contractEnd'), sortKey: 'contractEnd', render: (r) => date(r.contractEnd), hideOnMobile: true },
    { key: 'status', header: t('common.status'), sortKey: 'status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'mobile', header: t('fields.mobile'), render: (r) => <span dir="ltr">{r.mobile || '—'}</span>, hideOnMobile: true },
  ];

  return (
    <div>
      <PageHeader title={t('employees.title')} description={t('employees.subtitle')}
        actions={<>
          {can('employees.export') && <ExportButton url="/employees" params={params} filename="employees" />}
          {can('employees.create') && <button type="button" className="btn-primary" onClick={() => navigate('/employees/new')}><Plus className="h-4 w-4" />{t('employees.add')}</button>}
        </>} />
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput className="w-full sm:w-80" value={params.search} onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))} placeholder={`${t('common.search')}: ${t('fields.fullName')}, ${t('fields.employeeNumber')}, ${t('fields.nationalId')}, ${t('fields.mobile')}`} />
          <FilterPanel values={params} onChange={(k, v) => setParams((p) => ({ ...p, [k]: v, page: 1 }))} onClear={() => setParams((p) => ({ ...p, branchId: '', departmentId: '', positionId: '', status: '', contractType: '', contractExpiringDays: '', page: 1 }))}
            filters={[
              { key: 'branchId', label: t('common.branch'), options: (branches.data?.items || []).map((b) => ({ value: b.id, label: nm(b) })) },
              { key: 'departmentId', label: t('common.department'), options: (depts.data?.items || []).map((b) => ({ value: b.id, label: nm(b) })) },
              { key: 'positionId', label: t('fields.jobTitle'), options: (positions.data?.items || []).map((b) => ({ value: b.id, label: ttl(b) })) },
              { key: 'status', label: t('common.status'), options: STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) },
              { key: 'contractType', label: t('fields.contractType'), options: ['LIMITED', 'UNLIMITED', 'PROJECT', 'SEASONAL'].map((s) => ({ value: s, label: t(`enums.contractType.${s}`) })) },
            ]} />
          {selected.length > 0 && can('employees.edit') && (
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-1.5 text-sm text-brand-700 lg:ms-auto">
              <span>{selected.length} {t('common.selected')}</span>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setBulk('suspend')}><UserMinus className="h-4 w-4" />{t('employees.actions.suspend')}</button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setBulk('reactivate')}><UserCheck className="h-4 w-4" />{t('employees.actions.reactivate')}</button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setBulk('archive')}><Archive className="h-4 w-4" />{t('employees.actions.archive')}</button>
            </div>
          )}
        </div>
        <DataTable columns={columns} rows={q.data?.items} loading={q.isLoading} error={q.error} onRetry={q.refetch}
          page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))}
          sort={params.sort} onSort={(sort) => setParams((p) => ({ ...p, sort }))} onRowClick={(r) => navigate(`/employees/${r.id}`)}
          selectable={can('employees.edit')} selected={selected} onSelect={setSelected} />
      </div>
      <ConfirmDialog open={!!bulk} onClose={() => setBulk(null)} requireReason danger={bulk !== 'reactivate'} title={bulk && t(`employees.actions.${bulk}`)}
        message={`${selected.length} ${t('common.selected')} — ${t('employees.statusHint')}`} busy={bulkSend.isPending}
        onConfirm={(reason) => bulkSend.mutate({ ids: selected, action: bulk, effectiveDate: today(), reason })} />
    </div>
  );
}
