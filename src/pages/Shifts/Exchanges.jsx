import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { PageHeader, PersonCell, StatusBadge } from '../../components/common/Display';
import DataTable from '../../components/tables/DataTable';
import { useGet, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { date } from '../../utils/format';

export default function Exchanges() {
  const { t } = useTranslation();
  const { employeeId } = useAuth();
  const q = useGet(['exchanges'], '/shifts/exchanges', { pageSize: 50 });
  const respond = useSend('post', (r) => `/shifts/exchanges/${r.id}/respond`, { invalidate: ['exchanges'] });
  const shift = (a) => (a ? `${a.shift.code} ${a.shift.startTime}–${a.shift.endTime}` : '—');
  return (
    <div>
      <PageHeader title={t('nav.exchanges')} breadcrumbs={[{ label: t('nav.shifts'), to: '/shifts' }, { label: t('nav.exchanges') }]} />
      <div className="card">
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} columns={[
          { key: 'd', header: t('common.date'), render: (r) => date(r.date) }, { key: 'r', header: t('approvals.requester'), render: (r) => <PersonCell person={r.requester} sub={shift(r.requesterAssignment)} /> },
          { key: 'p', header: t('shifts.replacement'), render: (r) => <PersonCell person={r.replacement} sub={shift(r.replacementAssignment)} /> }, { key: 'reason', header: t('common.reason'), render: (r) => r.reason || '—' },
          { key: 'c', header: t('shifts.accept'), render: (r) => <StatusBadge status={r.replacementConsent} /> }, { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
          { key: 'a', header: '', render: (r) => (r.replacementId === employeeId && r.replacementConsent === 'PENDING' ? (
            <div className="flex gap-1">
              <button type="button" className="btn-primary btn-sm" onClick={() => respond.mutate({ id: r.id, accept: true })}><Check className="h-4 w-4" />{t('shifts.accept')}</button>
              <button type="button" className="btn-outline btn-sm" onClick={() => respond.mutate({ id: r.id, accept: false })}><X className="h-4 w-4" />{t('shifts.decline')}</button>
            </div>
          ) : null) },
        ]} />
      </div>
    </div>
  );
}
