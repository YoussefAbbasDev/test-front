import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { CalendarPlus, Plus } from 'lucide-react';
import { PageHeader, StatusBadge, Card } from '../../components/common/Display';
import { FilterPanel } from '../../components/common/Controls';
import { Modal } from '../../components/common/Overlay';
import DataTable from '../../components/tables/DataTable';
import ResourceForm from '../../components/forms/ResourceForm';
import { useGet, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { date, money, nm } from '../../utils/format';

const STATUSES = ['DRAFT', 'CALCULATED', 'IN_REVIEW', 'APPROVED', 'LOCKED', 'PAID', 'PARTIALLY_PAID', 'REVERSED', 'CANCELLED'];

export default function Runs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [sp] = useSearchParams();
  const [params, setParams] = useState({ page: 1, status: sp.get('status') || '' });
  const [modal, setModal] = useState(null);
  const q = useGet(['runs', params], '/payroll/runs', params);
  const periods = useGet(['periods'], '/payroll/periods');
  const createPeriod = useSend('post', '/payroll/periods', { invalidate: ['periods', ['options', '/payroll/periods']], onSuccess: () => setModal(null) });
  const createRun = useSend('post', '/payroll/runs', { invalidate: ['runs'], onSuccess: (r) => navigate(`/payroll/runs/${r.id}`) });
  const m = dayjs().startOf('month');
  return (
    <div>
      <PageHeader title={t('nav.runs')} breadcrumbs={[{ label: t('nav.payroll'), to: '/payroll' }, { label: t('nav.runs') }]}
        actions={can('payroll.create') && <>
          <button type="button" className="btn-outline" onClick={() => setModal('period')}><CalendarPlus className="h-4 w-4" />{t('payroll.newPeriod')}</button>
          <button type="button" className="btn-primary" onClick={() => setModal('run')}><Plus className="h-4 w-4" />{t('payroll.newRun')}</button>
        </>} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="border-b border-line p-3">
            <FilterPanel values={params} onChange={(k, v) => setParams((p) => ({ ...p, [k]: v, page: 1 }))} onClear={() => setParams({ page: 1, status: '' })}
              filters={[{ key: 'status', label: t('common.status'), options: STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) }]} />
          </div>
          <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} onRowClick={(r) => navigate(`/payroll/runs/${r.id}`)}
            page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))}
            columns={[
              { key: 'n', header: t('fields.runNumber'), render: (r) => <span dir="ltr" className="font-medium">{r.runNumber}</span> }, { key: 'p', header: t('fields.period'), render: (r) => r.period.name },
              { key: 'type', header: t('common.type'), render: (r) => r.type }, { key: 'e', header: t('fields.employees'), render: (r) => r.employeesCount },
              { key: 'g', header: t('payroll.totalEarnings'), render: (r) => money(r.totalEarnings), hideOnMobile: true }, { key: 'net', header: t('payroll.totalNet'), render: (r) => <b>{money(r.totalNet)}</b> },
              { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
            ]} />
        </div>
        <Card title={t('fields.period')} bodyClass="p-0">
          <DataTable rows={periods.data?.items} loading={periods.isLoading} dense columns={[
            { key: 'n', header: t('common.name'), render: (r) => r.name }, { key: 'd', header: t('common.from'), render: (r) => `${date(r.startDate)} → ${date(r.endDate)}` },
            { key: 'r', header: t('nav.runs'), render: (r) => r._count.runs }, { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
          ]} />
        </Card>
      </div>
      <Modal open={modal === 'period'} onClose={() => setModal(null)} title={t('payroll.newPeriod')} footer={<button type="submit" form="period-form" className="btn-primary" disabled={createPeriod.isPending}>{t('common.create')}</button>}>
        <ResourceForm id="period-form" onSubmit={(v) => createPeriod.mutate(v)} defaultValues={{ name: m.format('MMMM YYYY'), startDate: m.format('YYYY-MM-DD'), endDate: m.endOf('month').format('YYYY-MM-DD'), paymentDate: m.date(27).format('YYYY-MM-DD'), frequency: 'MONTHLY' }} fields={[
          { name: 'name', label: t('common.name'), required: true }, { name: 'frequency', label: t('fields.paymentFrequency'), type: 'select', placeholder: false, options: ['MONTHLY', 'WEEKLY', 'BIWEEKLY', 'CUSTOM'].map((v) => ({ value: v, label: t(`enums.frequency.${v}`) })) },
          { name: 'startDate', label: t('fields.startDate'), type: 'date', required: true }, { name: 'endDate', label: t('fields.endDate'), type: 'date', required: true }, { name: 'paymentDate', label: t('fields.paymentDate'), type: 'date', required: true },
        ]} />
      </Modal>
      <Modal open={modal === 'run'} onClose={() => setModal(null)} title={t('payroll.newRun')} footer={<button type="submit" form="run-form" className="btn-primary" disabled={createRun.isPending}>{t('common.create')}</button>}>
        <ResourceForm id="run-form" onSubmit={(v) => createRun.mutate({ ...v, departmentIds: v.departmentIds?.length ? v.departmentIds : undefined })} defaultValues={{ type: 'REGULAR' }} fields={[
          { name: 'periodId', label: t('fields.period'), type: 'select', required: true, options: (periods.data?.items || []).filter((p) => p.status === 'OPEN').map((p) => ({ value: p.id, label: p.name })) },
          { name: 'type', label: t('common.type'), type: 'select', placeholder: false, options: [{ value: 'REGULAR', label: 'REGULAR' }, { value: 'OFF_CYCLE', label: 'OFF_CYCLE' }] },
          { name: 'branchId', label: t('common.branch'), type: 'select', placeholder: t('common.all'), source: { url: '/organization/branches', label: nm } }, { name: 'notes', label: t('common.notes') },
          { name: 'departmentIds', label: t('nav.departments'), type: 'multiselect', source: { url: '/organization/departments', label: nm } },
        ]} />
      </Modal>
    </div>
  );
}
