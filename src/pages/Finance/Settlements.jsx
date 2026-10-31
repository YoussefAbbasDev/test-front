import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Check, Lock, ClipboardCheck } from 'lucide-react';
import { PageHeader, PersonCell, StatusBadge, InfoGrid } from '../../components/common/Display';
import { Drawer } from '../../components/common/Overlay';
import { Field, Input, Textarea } from '../../components/forms/Fields';
import DataTable from '../../components/tables/DataTable';
import { useGet, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { date, money } from '../../utils/format';

export default function Settlements() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({});
  const q = useGet(['settlements'], '/finance/settlements');
  const inv = { invalidate: ['settlements'], onSuccess: (s) => { setOpen(s); setForm(s); } };
  const save = useSend('put', () => `/finance/settlements/${open.id}`, inv);
  const step = useSend('post', ({ path }) => `/finance/settlements/${open.id}/${path}`, inv);
  const s = open;
  const editable = s && ['DRAFT', 'REVIEWED'].includes(s.status) && can('loans.edit');
  return (
    <div>
      <PageHeader title={t('nav.settlements')} description={t('loans.settlementHint')} breadcrumbs={[{ label: t('loans.title'), to: '/finance' }, { label: t('nav.settlements') }]} />
      <div className="card">
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error} onRowClick={(r) => { setOpen(r); setForm(r); }} columns={[
          { key: 'e', header: t('common.employee'), render: (r) => <PersonCell person={r.employee} sub={r.employee.employeeNumber} /> }, { key: 'd', header: t('fields.endDate'), render: (r) => date(r.terminationDate) },
          { key: 'o', header: t('loans.outstanding'), render: (r) => money(r.outstandingBalance) }, { key: 'eos', header: t('loans.eos'), render: (r) => money(r.eosAmount) },
          { key: 'n', header: t('loans.netSettlement'), render: (r) => <b>{money(r.netSettlement)}</b> }, { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
        ]} />
      </div>
      <Drawer open={!!s} onClose={() => setOpen(null)} title={t('loans.settlement')} width="max-w-xl">
        {s && (
          <div className="space-y-5 p-5">
            <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">{t('loans.settlementHint')}</p>
            <InfoGrid cols={2} items={[[t('common.status'), <StatusBadge status={s.status} />], [t('loans.outstanding'), money(s.outstandingBalance)], [t('fields.installments'), s.unpaidInstallments], [t('fields.available'), `${s.details?.annualLeaveDaysRemaining ?? '—'} ${t('common.days')}`]]} />
            {s.details?.installments?.length > 0 && <ul className="space-y-1 text-xs">{s.details.installments.map((i) => <li key={i.id} className="flex justify-between rounded-lg bg-canvas px-3 py-1.5"><span>{i.ref} #{i.number} · {i.dueDate}</span><span>{money(i.remaining)}</span></li>)}</ul>}
            <div className="grid gap-3 sm:grid-cols-2">
              {[['eosAmount', t('loans.eos')], ['leaveEncashment', t('loans.leaveEncashment')], ['otherDues', t('loans.otherDues')], ['agreedDeduction', t('loans.agreedDeduction')]].map(([k, label]) => (
                <Field key={k} label={label}><Input type="number" disabled={!editable} value={form[k] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} /></Field>
              ))}
              <Field label={t('common.notes')} className="sm:col-span-2"><Textarea disabled={!editable} value={form.notes || ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
            </div>
            <div className="rounded-xl bg-gradient-to-r from-brand-600 to-navy-700 p-4 text-white"><p className="text-xs text-white/70">{t('loans.netSettlement')}</p><p className="text-xl font-semibold">{money(s.netSettlement)}</p></div>
            <div className="flex flex-wrap gap-2">
              {editable && <button type="button" className="btn-outline btn-sm" onClick={() => step.mutate({ path: 'refresh' })}><RefreshCw className="h-4 w-4" />{t('common.refresh')}</button>}
              {editable && <button type="button" className="btn-secondary btn-sm" onClick={() => save.mutate({ eosAmount: String(form.eosAmount || 0), leaveEncashment: String(form.leaveEncashment || 0), otherDues: String(form.otherDues || 0), agreedDeduction: String(form.agreedDeduction || 0), notes: form.notes || null })}>{t('common.save')}</button>}
              {s.status === 'DRAFT' && can('loans.edit') && <button type="button" className="btn-primary btn-sm" onClick={() => step.mutate({ path: 'review' })}><ClipboardCheck className="h-4 w-4" />{t('loans.review')}</button>}
              {s.status === 'REVIEWED' && can('loans.approve') && <button type="button" className="btn-primary btn-sm" onClick={() => step.mutate({ path: 'approve' })}><Check className="h-4 w-4" />{t('loans.approveSettlement')}</button>}
              {s.status === 'APPROVED' && can('loans.approve') && <button type="button" className="btn-primary btn-sm" onClick={() => step.mutate({ path: 'close' })}><Lock className="h-4 w-4" />{t('loans.close')}</button>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
