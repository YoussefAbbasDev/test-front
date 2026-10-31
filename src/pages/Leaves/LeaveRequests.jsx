import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Check, X, Download } from 'lucide-react';
import { PageHeader, PersonCell, StatusBadge, ApprovalTimeline, InfoGrid } from '../../components/common/Display';
import { SearchInput, FilterPanel, ExportButton } from '../../components/common/Controls';
import { Drawer, ConfirmDialog } from '../../components/common/Overlay';
import DataTable from '../../components/tables/DataTable';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { download } from '../../services/api';
import { date, dateTime, nm } from '../../utils/format';
import LeaveRequestModal from './LeaveRequestModal';

const STATUSES = ['SUBMITTED', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN', 'CANCELLATION_PENDING', 'DRAFT'];

export function LeaveDetail({ id, onClose }) {
  const { t } = useTranslation();
  const { employeeId, user } = useAuth();
  const [decision, setDecision] = useState(null);
  const q = useGet(['leave', id], id ? `/leaves/requests/${id}` : null);
  const act = useSend('post', ({ d }) => `/leaves/requests/${id}/${d}`, { invalidate: ['leave-requests', ['leave', id], 'approvals-count'], onSuccess: () => setDecision(null) });
  const withdraw = useSend('post', `/leaves/requests/${id}/withdraw`, { invalidate: ['leave-requests', ['leave', id], 'my-balances'] });
  const submitDraft = useSend('post', `/leaves/requests/${id}/submit`, { invalidate: ['leave-requests', ['leave', id], 'my-balances'] });
  const cancel = useSend('post', `/leaves/requests/${id}/cancel`, { invalidate: ['leave-requests', ['leave', id]], onSuccess: () => setDecision(null) });
  const r = q.data;
  const pendingMine = r && [...(r.approvals || []), ...(r.cancellation || [])].some((i) => i.status === 'PENDING' && i.tasks.some((tk) => tk.status === 'PENDING' && tk.approverUserId === user?.id));
  return (
    <Drawer open={!!id} onClose={onClose} title={t('leaves.request')} width="max-w-lg">
      {r && (
        <div className="space-y-5 p-5">
          <PersonCell person={r.employee} sub={nm(r.employee.department)} />
          <div className="flex items-center gap-2"><StatusBadge status={r.status} /><span className="chip text-white" style={{ background: r.leaveType.color }}>{nm(r.leaveType)}</span></div>
          <InfoGrid cols={2} items={[
            [t('fields.startDate'), date(r.startDate)], [t('fields.endDate'), date(r.endDate)], [t('leaves.days'), r.days], [t('fields.halfDay'), r.halfDay ? t('common.yes') : t('common.no')],
            [t('common.reason'), r.reason], [t('fields.emergencyContact'), r.emergencyContact], [t('fields.handoverNotes'), r.handoverNotes], [t('common.date'), dateTime(r.submittedAt || r.createdAt)],
            r.attachmentId && [t('common.attachment'), <button type="button" className="inline-flex items-center gap-1 text-brand-600" onClick={() => download(`/files/${r.attachmentId}`, { download: 1 })}><Download className="h-3.5 w-3.5" />{t('common.download')}</button>],
            r.cancelReason && [t('leaves.cancelLeave'), r.cancelReason],
          ]} />
          <div className="flex flex-wrap gap-2">
            {pendingMine && <>
              <button type="button" className="btn-primary btn-sm" onClick={() => setDecision('approve')}><Check className="h-4 w-4" />{t('common.approve')}</button>
              <button type="button" className="btn-outline btn-sm" onClick={() => setDecision('reject')}><X className="h-4 w-4" />{t('common.reject')}</button>
            </>}
            {r.employeeId === employeeId && r.status === 'DRAFT' && <button type="button" className="btn-primary btn-sm" onClick={() => submitDraft.mutate()}>{t('common.submit')}</button>}
            {r.employeeId === employeeId && ['DRAFT', 'SUBMITTED', 'PENDING_MANAGER', 'PENDING_HR'].includes(r.status) && <button type="button" className="btn-outline btn-sm" onClick={() => withdraw.mutate()}>{t('leaves.withdraw')}</button>}
            {r.status === 'APPROVED' && <button type="button" className="btn-outline btn-sm" onClick={() => setDecision('cancel')}>{t('leaves.cancelLeave')}</button>}
          </div>
          <div><p className="mb-2 text-sm font-medium text-navy-700">{t('approvals.timeline')}</p><ApprovalTimeline instances={[...(r.approvals || []), ...(r.cancellation || [])]} /></div>
        </div>
      )}
      <ConfirmDialog open={!!decision} onClose={() => setDecision(null)} title={decision === 'cancel' ? t('leaves.cancelLeave') : t(`common.${decision}`)} requireReason={decision !== 'approve'} danger={decision !== 'approve'}
        busy={act.isPending || cancel.isPending}
        onConfirm={(reason) => (decision === 'cancel' ? cancel.mutate({ reason }) : act.mutate({ d: decision, __body: { comment: reason || undefined } }))} />
    </Drawer>
  );
}

export default function LeaveRequests() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [params, setParams] = useState({ page: 1, pageSize: 20, search: '', status: 'SUBMITTED,PENDING_MANAGER,PENDING_HR,CANCELLATION_PENDING' });
  const [open, setOpen] = useState(null);
  const [create, setCreate] = useState(false);
  const types = useOptions('/leaves/types');
  const branches = useOptions('/organization/branches');
  const q = useGet(['leave-requests', params], '/leaves/requests', params, { keepPreviousData: true });
  return (
    <div>
      <PageHeader title={t('leaves.title')} description={t('leaves.subtitle')}
        actions={<>
          {can('leaves.export') && <ExportButton url="/leaves/requests" params={params} filename="leave-requests" />}
          <button type="button" className="btn-primary" onClick={() => setCreate(true)}><Plus className="h-4 w-4" />{t('leaves.request')}</button>
        </>} />
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput className="w-full sm:w-64" value={params.search} onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))} />
          <FilterPanel values={params} onChange={(k, v) => setParams((p) => ({ ...p, [k]: v, page: 1 }))} onClear={() => setParams((p) => ({ ...p, status: '', leaveTypeId: '', branchId: '', page: 1 }))}
            filters={[
              { key: 'status', label: t('common.status'), options: [{ value: 'SUBMITTED,PENDING_MANAGER,PENDING_HR,CANCELLATION_PENDING', label: t('status.PENDING') }, ...STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))] },
              { key: 'leaveTypeId', label: t('fields.leaveType'), options: (types.data?.items || []).map((x) => ({ value: x.id, label: nm(x) })) },
              { key: 'branchId', label: t('common.branch'), options: (branches.data?.items || []).map((x) => ({ value: x.id, label: nm(x) })) },
            ]} />
        </div>
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} onRetry={q.refetch} onRowClick={(r) => setOpen(r.id)}
          page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))}
          columns={[
            { key: 'e', header: t('common.employee'), render: (r) => <PersonCell person={r.employee} sub={nm(r.employee.department)} /> },
            { key: 't', header: t('fields.leaveType'), render: (r) => <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: r.leaveType.color }} />{nm(r.leaveType)}</span> },
            { key: 's', header: t('fields.startDate'), render: (r) => date(r.startDate) }, { key: 'en', header: t('fields.endDate'), render: (r) => date(r.endDate) },
            { key: 'd', header: t('leaves.days'), render: (r) => r.days }, { key: 'st', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
          ]} />
      </div>
      <LeaveDetail id={open} onClose={() => setOpen(null)} />
      {create && <LeaveRequestModal open forOthers={can('leaves.edit')} onClose={() => setCreate(false)} />}
    </div>
  );
}
