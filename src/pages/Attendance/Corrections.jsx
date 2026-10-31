import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { PageHeader, PersonCell, StatusBadge, ApprovalTimeline } from '../../components/common/Display';
import { FilterPanel } from '../../components/common/Controls';
import { Drawer } from '../../components/common/Overlay';
import DataTable from '../../components/tables/DataTable';
import { useGet, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { date, dateTime } from '../../utils/format';
import CorrectionModal from './CorrectionModal';
import { ManualEntryModal } from './Records';

export default function Corrections() {
  const { t } = useTranslation();
  const { can, user, employeeId } = useAuth();
  const tz = user?.company?.timezone;
  const [params, setParams] = useState({ page: 1, status: '' });
  const [modal, setModal] = useState(null);
  const [open, setOpen] = useState(null);
  const q = useGet(['corrections', params], '/attendance/corrections', params);
  const tl = useGet(['timeline', open?.id], open ? `/approvals/timeline/ATTENDANCE_CORRECTION/${open.id}` : null);
  const cancel = useSend('post', (c) => `/attendance/corrections/${c.id}/cancel`, { invalidate: ['corrections'], onSuccess: () => setOpen(null) });
  return (
    <div>
      <PageHeader title={t('nav.corrections')} description={t('attendance.correctionHint')} breadcrumbs={[{ label: t('nav.attendance'), to: '/attendance' }, { label: t('nav.corrections') }]}
        actions={<>
          {can('attendance.manual') && <button type="button" className="btn-outline" onClick={() => setModal('manual')}>{t('attendance.manualEntry')}</button>}
          {employeeId && <button type="button" className="btn-primary" onClick={() => setModal('corr')}><Plus className="h-4 w-4" />{t('attendance.requestCorrection')}</button>}
        </>} />
      <div className="card">
        <div className="border-b border-line p-3">
          <FilterPanel values={params} onChange={(k, v) => setParams((p) => ({ ...p, [k]: v, page: 1 }))} onClear={() => setParams({ page: 1, status: '' })}
            filters={[{ key: 'status', label: t('common.status'), options: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => ({ value: s, label: t(`status.${s}`) })) }]} />
        </div>
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} onRowClick={setOpen}
          page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))}
          columns={[
            { key: 'emp', header: t('common.employee'), render: (r) => <PersonCell person={r.employee} /> }, { key: 'd', header: t('common.date'), render: (r) => date(r.date) },
            { key: 'type', header: t('common.type'), render: (r) => (r.type === 'MANUAL_ENTRY' ? t('attendance.manualEntry') : t('nav.corrections')) },
            { key: 'o', header: t('attendance.original'), render: (r) => `${dateTime(r.originalCheckIn, tz)} / ${dateTime(r.originalCheckOut, tz)}`, hideOnMobile: true },
            { key: 'r', header: t('attendance.requestedIn'), render: (r) => dateTime(r.requestedCheckIn, tz) }, { key: 'ro', header: t('attendance.requestedOut'), render: (r) => dateTime(r.requestedCheckOut, tz) },
            { key: 'reason', header: t('common.reason'), render: (r) => <span className="line-clamp-1 max-w-xs whitespace-normal">{r.reason}</span>, hideOnMobile: true },
            { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
          ]} />
      </div>
      <Drawer open={!!open} onClose={() => setOpen(null)} title={t('approvals.timeline')}>
        {open && (
          <div className="space-y-4 p-5">
            <p className="text-sm text-ink-soft">{open.reason}</p>
            <ApprovalTimeline instances={tl.data?.items} />
            {open.status === 'PENDING' && (open.employeeId === employeeId) && <button type="button" className="btn-outline btn-sm" onClick={() => cancel.mutate(open)}>{t('common.cancel')}</button>}
          </div>
        )}
      </Drawer>
      {modal === 'corr' && <CorrectionModal open onClose={() => setModal(null)} />}
      {modal === 'manual' && <ManualEntryModal open onClose={() => setModal(null)} />}
    </div>
  );
}
