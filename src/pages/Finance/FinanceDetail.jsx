import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X, Banknote, HandCoins, Ban, CalendarClock } from 'lucide-react';
import { PageHeader, PersonCell, StatusBadge, Card, InfoGrid, ApprovalTimeline, StatCard } from '../../components/common/Display';
import { LoadingState, ErrorState } from '../../components/common/Feedback';
import { ConfirmDialog, Modal } from '../../components/common/Overlay';
import { Field, Input, Textarea } from '../../components/forms/Fields';
import DataTable from '../../components/tables/DataTable';
import { useGet, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { date, dateTime, money } from '../../utils/format';

export default function FinanceDetail() {
  const { kind, id } = useParams();
  const { t } = useTranslation();
  const { can, user, employeeId } = useAuth();
  const [action, setAction] = useState(null);
  const [repay, setRepay] = useState({ amount: '', note: '' });
  const q = useGet([kind, 'detail', id], `/${kind}/${id}`);
  const send = useSend('post', ({ path }) => `/${kind}/${id}/${path}`, { invalidate: [[kind, 'detail', id], kind, 'approvals-count'], onSuccess: () => setAction(null) });
  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} />;
  const r = q.data;
  const p = kind === 'loans' ? 'loans' : 'advances';
  const myTask = (r.approvals || []).some((i) => i.status === 'PENDING' && i.tasks.some((tk) => tk.status === 'PENDING' && tk.approverUserId === user?.id));
  const paid = r.installments.reduce((s, i) => s + Number(i.paidAmount), 0);
  return (
    <div>
      <PageHeader title={<span dir="ltr">{r.number}</span>} breadcrumbs={[{ label: t('loans.title'), to: '/finance' }, { label: r.number }]}
        actions={<>
          <StatusBadge status={r.status} />
          {myTask && <><button type="button" className="btn-primary" onClick={() => setAction('approve')}><Check className="h-4 w-4" />{t('common.approve')}</button><button type="button" className="btn-outline" onClick={() => setAction('reject')}><X className="h-4 w-4" />{t('common.reject')}</button></>}
          {r.status === 'APPROVED' && can(`${p}.edit`) && <button type="button" className="btn-primary" onClick={() => setAction('disburse')}><Banknote className="h-4 w-4" />{t('loans.disburse')}</button>}
          {['DISBURSED', 'REPAYING'].includes(r.status) && can(`${p}.edit`) && <button type="button" className="btn-secondary" onClick={() => setAction('repay')}><HandCoins className="h-4 w-4" />{t('loans.repay')}</button>}
          {['PENDING', 'APPROVED'].includes(r.status) && (r.employeeId === employeeId ? r.status === 'PENDING' : can(`${p}.edit`)) && <button type="button" className="btn-outline text-danger" onClick={() => setAction('cancel')}><Ban className="h-4 w-4" />{t('common.cancel')}</button>}
        </>} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t('common.amount')} value={money(r.approvedAmount || r.amount)} />
        <StatCard label={t('fields.paid')} value={money(paid)} tone="success" />
        <StatCard label={t('loans.outstanding')} value={money(r.outstanding)} tone="warning" />
        <StatCard label={t('fields.installments')} value={r.installmentCount} tone="navy" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title={t('common.details')}>
            <div className="mb-4"><PersonCell person={r.employee} sub={r.employee.employeeNumber} /></div>
            <InfoGrid items={[
              [t('fields.requestDate'), date(r.requestDate)], [t('fields.firstDeductionDate'), date(r.firstDeductionDate)], [t('fields.repaymentMethod'), r.repaymentMethod],
              kind === 'loans' && [t('fields.loanType'), t(`enums.loanType.${r.loanType}`)], kind === 'loans' && [t('fields.monthlyInstallment'), money(r.monthlyInstallment)],
              kind === 'loans' && Number(r.feeAmount) > 0 && [t('fields.fee'), money(r.feeAmount)], [t('common.reason'), r.reason], r.notes && [t('common.notes'), r.notes],
            ]} />
          </Card>
          <Card title={t('loans.schedule')} bodyClass="p-0">
            <DataTable rows={r.installments} dense columns={[
              { key: 'n', header: '#', render: (x) => x.number }, { key: 'd', header: t('fields.dueDate'), render: (x) => date(x.dueDate) }, { key: 'a', header: t('common.amount'), render: (x) => money(x.amount) },
              { key: 'p', header: t('fields.paid'), render: (x) => money(x.paidAmount) }, { key: 'r', header: t('fields.remaining'), render: (x) => money(Number(x.amount) - Number(x.paidAmount)) },
              { key: 's', header: t('common.status'), render: (x) => <StatusBadge status={x.status} /> },
              { key: 'x', header: '', render: (x) => (['UPCOMING', 'DUE', 'OVERDUE'].includes(x.status) && Number(x.paidAmount) === 0 && can(`${p}.approve`) ? <button type="button" className="btn-ghost btn-sm" onClick={() => setAction({ defer: x })}><CalendarClock className="h-4 w-4" />{t('loans.defer')}</button> : null) },
            ]} />
          </Card>
          <Card title={t('loans.ledger')} bodyClass="p-0">
            <DataTable rows={r.ledger} dense columns={[
              { key: 'd', header: t('fields.when'), render: (x) => dateTime(x.createdAt) }, { key: 't', header: t('common.type'), render: (x) => x.type.replace(/_/g, ' ').toLowerCase() },
              { key: 'db', header: '+', render: (x) => (Number(x.debit) ? money(x.debit) : '') }, { key: 'cr', header: '−', render: (x) => (Number(x.credit) ? money(x.credit) : '') },
              { key: 'b', header: t('loans.outstanding'), render: (x) => money(x.balanceAfter) }, { key: 'n', header: t('common.notes'), render: (x) => x.note || '—' },
            ]} />
          </Card>
        </div>
        <Card title={t('approvals.timeline')}><ApprovalTimeline instances={r.approvals} /></Card>
      </div>
      {['approve', 'reject', 'disburse', 'cancel'].includes(action) && (
        <ConfirmDialog open onClose={() => setAction(null)} title={action === 'disburse' ? t('loans.disburse') : t(`common.${action}`)} danger={['reject', 'cancel'].includes(action)}
          requireReason={['reject', 'cancel'].includes(action) ? true : action === 'disburse' ? false : undefined} busy={send.isPending}
          onConfirm={(reason) => send.mutate({ path: action, __body: action === 'disburse' ? { note: reason || undefined } : action === 'cancel' ? { reason } : { comment: reason || undefined } })} />
      )}
      {action?.defer && <ConfirmDialog open onClose={() => setAction(null)} title={t('loans.defer')} message={`#${action.defer.number} · ${date(action.defer.dueDate)}`} requireReason busy={send.isPending} onConfirm={(reason) => send.mutate({ path: `installments/${action.defer.id}/defer`, __body: { reason } })} />}
      <Modal open={action === 'repay'} onClose={() => setAction(null)} size="sm" title={t('loans.repay')} footer={<button type="button" className="btn-primary" disabled={!repay.amount || !repay.note || send.isPending} onClick={() => send.mutate({ path: 'repay', __body: repay })}>{t('common.save')}</button>}>
        <div className="space-y-3">
          <Field label={`${t('common.amount')} (≤ ${money(r.outstanding)})`}><Input type="number" value={repay.amount} onChange={(e) => setRepay((x) => ({ ...x, amount: e.target.value }))} /></Field>
          <Field label={t('common.notes')}><Textarea value={repay.note} onChange={(e) => setRepay((x) => ({ ...x, note: e.target.value }))} /></Field>
        </div>
      </Modal>
    </div>
  );
}
