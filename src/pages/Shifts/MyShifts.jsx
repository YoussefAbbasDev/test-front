import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Repeat } from 'lucide-react';
import { PageHeader, Card } from '../../components/common/Display';
import { QueryState } from '../../components/common/Feedback';
import { Modal } from '../../components/common/Overlay';
import ResourceForm from '../../components/forms/ResourceForm';
import { useGet, useSend } from '../../hooks/useApi';
import { empName, nm, date } from '../../utils/format';

export default function MyShifts() {
  const { t } = useTranslation();
  const [exchange, setExchange] = useState(null);
  const from = dayjs().startOf('week').format('YYYY-MM-DD');
  const to = dayjs().startOf('week').add(27, 'day').format('YYYY-MM-DD');
  const q = useGet(['my-shifts', from], '/shifts/my', { from, to });
  const send = useSend('post', '/shifts/exchanges', { invalidate: ['exchanges'], onSuccess: () => setExchange(null) });
  return (
    <div>
      <PageHeader title={t('nav.myShifts')} description={`${from} → ${to}`} />
      <QueryState query={q} empty={(d) => !d.items.length}>
        {(d) => (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {d.items.map((a) => (
              <Card key={a.id} bodyClass="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-ink-muted">{dayjs(a.date.slice(0, 10)).format('dddd')}</p>
                    <p className="font-semibold text-navy-700">{date(a.date)}</p>
                  </div>
                  <span className="h-3 w-3 rounded-full" style={{ background: a.shift.color }} />
                </div>
                <p className="mt-3 text-sm">{nm(a.shift)}</p>
                <p className="text-lg font-semibold tabular-nums" dir="ltr">{a.shift.startTime} – {a.shift.endTime}</p>
                {dayjs(a.date.slice(0, 10)).isAfter(dayjs(), 'day') && <button type="button" className="btn-ghost btn-sm mt-2 px-0 text-brand-600" onClick={() => setExchange(a)}><Repeat className="h-4 w-4" />{t('shifts.requestExchange')}</button>}
              </Card>
            ))}
          </div>
        )}
      </QueryState>
      <Modal open={!!exchange} onClose={() => setExchange(null)} title={t('shifts.requestExchange')}
        footer={<button type="submit" form="ex-form" className="btn-primary" disabled={send.isPending}>{t('common.submit')}</button>}>
        {exchange && <ResourceForm id="ex-form" columns={1} defaultValues={{}} onSubmit={(v) => send.mutate({ requesterAssignmentId: exchange.id, replacementId: v.replacementId, reason: v.reason })} fields={[
          { name: 'replacementId', label: t('shifts.replacement'), type: 'select', required: true, source: { url: '/employees?pageSize=200', label: (x) => `${x.employeeNumber} — ${empName(x)}` } },
          { name: 'reason', label: t('common.reason'), type: 'textarea' },
        ]} />}
      </Modal>
    </div>
  );
}
