import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgePercent, Clock, CheckCircle2, Banknote, Calculator } from 'lucide-react';
import { PageHeader, StatCard, Card } from '../../components/common/Display';
import { QueryState } from '../../components/common/Feedback';
import { Modal } from '../../components/common/Overlay';
import ResourceForm from '../../components/forms/ResourceForm';
import { BarsChart, DonutChart, TrendChart } from '../../components/charts/Charts';
import { useGet, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { money, nm } from '../../utils/format';
import dayjs from 'dayjs';

export function CalculateModal({ open, onClose }) {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);
  const send = useSend('post', '/commissions/calculate', { invalidate: ['comm-dash', 'commissions'], silent: true, onSuccess: setResult });
  return (
    <Modal open={open} onClose={() => { setResult(null); onClose(); }} title={t('commissions.calculate')}
      footer={!result && <button type="submit" form="calc-form" className="btn-primary" disabled={send.isPending}>{t('common.calculate')}</button>}>
      {result ? (
        <div className="space-y-3 text-sm">
          <p><b>{result.created}</b> · {money(result.total)}</p>
          {result.skipped.length > 0 && <><p className="text-warning">{t('commissions.skipped')} ({result.skipped.length})</p>
            <ul className="max-h-60 space-y-1 overflow-y-auto text-xs">{result.skipped.slice(0, 100).map((s, i) => <li key={i} className="rounded bg-canvas px-2 py-1">{s.rule} · {s.source} · {s.reasons.join(', ')}</li>)}</ul></>}
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-ink-muted">{t('commissions.dedupeHint')}</p>
          <ResourceForm id="calc-form" defaultValues={{ from: dayjs().startOf('month').format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD') }} onSubmit={(v) => send.mutate(v)} fields={[
            { name: 'from', label: t('common.from'), type: 'date', required: true }, { name: 'to', label: t('common.to'), type: 'date', required: true },
            { name: 'branchId', label: t('common.branch'), type: 'select', placeholder: t('common.all'), source: { url: '/organization/branches', label: nm } },
          ]} />
        </>
      )}
    </Modal>
  );
}

export default function CommissionsDashboard() {
  const { t, i18n } = useTranslation();
  const { can } = useAuth();
  const [calc, setCalc] = useState(false);
  const q = useGet(['comm-dash'], '/commissions/dashboard');
  const L = (x) => (typeof x === 'string' ? x : (i18n.language === 'ar' ? x?.ar : x?.en) || '—');
  return (
    <div>
      <PageHeader title={t('commissions.title')} description={t('commissions.subtitle')}
        actions={can('commissions.create') && <button type="button" className="btn-primary" onClick={() => setCalc(true)}><Calculator className="h-4 w-4" />{t('commissions.calculate')}</button>} />
      <QueryState query={q}>
        {(d) => (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label={t('commissions.total')} value={money(d.total)} icon={BadgePercent} />
              <StatCard label={t('commissions.pending')} value={money(d.pending)} icon={Clock} tone="warning" to="/commissions/ledger?status=PENDING_APPROVAL" />
              <StatCard label={t('commissions.approved')} value={money(d.approved)} icon={CheckCircle2} tone="success" />
              <StatCard label={t('commissions.paid')} value={money(d.paid)} icon={Banknote} tone="navy" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title={t('commissions.ranking')}><BarsChart horizontal data={d.ranking.map((r) => ({ name: L(r.label), amount: Number(r.amount) }))} x="name" series={[{ key: 'amount', label: t('fields.commission') }]} /></Card>
              <Card title={t('commissions.trend')}><TrendChart data={d.trend.map((r) => ({ month: r.key, amount: Number(r.amount) }))} x="month" series={[{ key: 'amount', label: t('fields.commission') }]} /></Card>
              <Card title={t('commissions.byBranch')}><DonutChart data={d.byBranch.map((r) => ({ name: L(r.label), value: Number(r.amount) }))} /></Card>
              <Card title={t('commissions.byService')}><BarsChart data={d.byService.slice(0, 10).map((r) => ({ name: L(r.label), amount: Number(r.amount) }))} x="name" series={[{ key: 'amount', label: t('fields.commission') }]} /></Card>
            </div>
          </div>
        )}
      </QueryState>
      <CalculateModal open={calc} onClose={() => setCalc(false)} />
    </div>
  );
}
