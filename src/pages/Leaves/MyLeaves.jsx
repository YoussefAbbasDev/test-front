import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { PageHeader, StatusBadge, Card } from '../../components/common/Display';
import { QueryState } from '../../components/common/Feedback';
import DataTable from '../../components/tables/DataTable';
import { useGet } from '../../hooks/useApi';
import { date, nm } from '../../utils/format';
import LeaveRequestModal from './LeaveRequestModal';
import { LeaveDetail } from './LeaveRequests';

export default function MyLeaves() {
  const { t } = useTranslation();
  const [create, setCreate] = useState(false);
  const [open, setOpen] = useState(null);
  const year = new Date().getFullYear();
  const bal = useGet(['my-balances', year], '/leaves/balances', { mine: 'true', year });
  const reqs = useGet(['leave-requests', 'mine'], '/leaves/requests', { mine: 'true', pageSize: 50 });
  return (
    <div>
      <PageHeader title={t('leaves.myTitle')} description={t('leaves.balanceFormula')}
        actions={<button type="button" className="btn-primary" onClick={() => setCreate(true)}><Plus className="h-4 w-4" />{t('leaves.request')}</button>} />
      <QueryState query={bal}>
        {(d) => (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {d.items.map((b) => (
              <div key={b.id} className="card p-4">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: b.leaveType.color }} /><span className="truncate text-xs text-ink-muted">{nm(b.leaveType)}</span></div>
                <p className="mt-2 text-2xl font-semibold text-navy-700 tabular-nums">{Number(b.available)}</p>
                <p className="text-[11px] text-ink-muted">{t('fields.available')} · {t('fields.used')} {Number(b.used)} · {t('fields.pending')} {Number(b.pending)}</p>
              </div>
            ))}
          </div>
        )}
      </QueryState>
      <Card title={t('nav.myRequests')} bodyClass="p-0">
        <DataTable rows={reqs.data?.items} loading={reqs.isLoading} error={reqs.error} onRowClick={(r) => setOpen(r.id)} columns={[
          { key: 't', header: t('fields.leaveType'), render: (r) => nm(r.leaveType) }, { key: 's', header: t('fields.startDate'), render: (r) => date(r.startDate) },
          { key: 'e', header: t('fields.endDate'), render: (r) => date(r.endDate) }, { key: 'd', header: t('leaves.days'), render: (r) => r.days }, { key: 'st', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
        ]} />
      </Card>
      {create && <LeaveRequestModal open onClose={() => setCreate(false)} />}
      <LeaveDetail id={open} onClose={() => setOpen(null)} />
    </div>
  );
}
