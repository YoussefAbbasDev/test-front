import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X, ExternalLink, Inbox } from 'lucide-react';
import { PageHeader, PersonCell, StatusBadge, Tabs } from '../../components/common/Display';
import { ConfirmDialog } from '../../components/common/Overlay';
import { EmptyState } from '../../components/common/Feedback';
import DataTable from '../../components/tables/DataTable';
import { useGet, useSend } from '../../hooks/useApi';
import { ago, money } from '../../utils/format';

const LINK = { LEAVE: () => '/leaves', LEAVE_CANCELLATION: () => '/leaves', ATTENDANCE_CORRECTION: () => '/attendance/corrections', SHIFT_EXCHANGE: () => '/shifts/exchanges', ADVANCE: (id) => `/finance/advances/${id}`, LOAN: (id) => `/finance/loans/${id}`, PAYROLL: (id) => `/payroll/runs/${id}`, SALARY_CHANGE: () => null };

export default function Approvals() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending');
  const [decision, setDecision] = useState(null);
  const q = useGet(['approvals', tab], '/approvals/tasks', { status: tab === 'done' ? 'done' : undefined });
  const act = useSend('post', ({ id, d }) => `/approvals/tasks/${id}/${d}`, { invalidate: ['approvals', 'approvals-count', 'leave-requests', 'corrections', 'runs'], onSuccess: () => setDecision(null) });
  return (
    <div>
      <PageHeader title={t('approvals.title')} description={t('approvals.subtitle')} />
      <Tabs tabs={[{ key: 'pending', label: t('approvals.pending'), count: tab === 'pending' ? q.data?.items?.length : undefined }, { key: 'done', label: t('approvals.done') }]} active={tab} onChange={setTab} />
      <div className="card">
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} empty={<EmptyState icon={Inbox} title={t('approvals.empty')} hint=" " />} columns={[
          { key: 'type', header: t('common.type'), render: (r) => t(`enums.entityType.${r.instance.entityType}`) },
          { key: 'req', header: t('approvals.requester'), render: (r) => (r.requester ? <PersonCell person={r.requester} sub={r.requester.employeeNumber} /> : '—') },
          { key: 'sum', header: t('common.details'), render: (r) => <span className="whitespace-normal text-sm">{r.instance.summary}{r.instance.amount ? <span className="text-ink-muted"> · {money(r.instance.amount)}</span> : ''}</span> },
          { key: 'step', header: t('approvals.step'), render: (r) => r.stepName }, { key: 'when', header: t('fields.when'), render: (r) => ago(r.createdAt) },
          { key: 'st', header: t('common.status'), render: (r) => <StatusBadge status={tab === 'pending' ? r.instance.status : r.status} /> },
          { key: 'x', header: '', render: (r) => (
            <div className="flex justify-end gap-1">
              {LINK[r.instance.entityType]?.(r.instance.entityId) && <button type="button" className="btn-ghost h-8 w-8 p-0" onClick={() => navigate(LINK[r.instance.entityType](r.instance.entityId))}><ExternalLink className="h-4 w-4" /></button>}
              {tab === 'pending' && <>
                <button type="button" className="btn-primary btn-sm" onClick={() => setDecision({ id: r.id, d: 'approve' })}><Check className="h-4 w-4" />{t('common.approve')}</button>
                <button type="button" className="btn-outline btn-sm" onClick={() => setDecision({ id: r.id, d: 'reject' })}><X className="h-4 w-4" /></button>
              </>}
            </div>
          ) },
        ]} />
      </div>
      {decision && <ConfirmDialog open onClose={() => setDecision(null)} title={t(`common.${decision.d}`)} danger={decision.d === 'reject'} requireReason={decision.d === 'reject' ? true : false} busy={act.isPending}
        onConfirm={(comment) => act.mutate({ ...decision, __body: { comment: comment || undefined } })} />}
    </div>
  );
}
