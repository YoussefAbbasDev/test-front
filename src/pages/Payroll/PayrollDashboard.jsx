import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, UserCheck, UserMinus, Wallet, TrendingDown, TrendingUp, Timer, BadgePercent, Clock4, Banknote } from 'lucide-react';
import { PageHeader, StatCard, Card, StatusBadge } from '../../components/common/Display';
import { QueryState } from '../../components/common/Feedback';
import { BarsChart } from '../../components/charts/Charts';
import { useGet } from '../../hooks/useApi';
import { money } from '../../utils/format';

export default function PayrollDashboard() {
  const { t } = useTranslation();
  const q = useGet(['payroll-dash'], '/payroll/dashboard');
  return (
    <div>
      <PageHeader title={t('payroll.title')} description={t('payroll.subtitle')} actions={<Link to="/payroll/runs" className="btn-primary">{t('nav.runs')}</Link>} />
      <QueryState query={q}>
        {(d) => {
          const r = d.latestRun;
          return (
            <div className="space-y-6">
              {r && (
                <div className="card flex flex-wrap items-center gap-3 p-4">
                  <span className="text-sm text-ink-muted">{t('payroll.latestRun')}:</span>
                  <Link to={`/payroll/runs/${r.id}`} className="font-medium text-brand-700 hover:underline" dir="ltr">{r.runNumber}</Link>
                  <span className="text-sm">{r.period.name}</span><StatusBadge status={r.status} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <StatCard label={t('attendance.totalEmployees')} value={d.totalEmployees} icon={Users} />
                <StatCard label={t('payroll.included')} value={d.employeesIncluded} icon={UserCheck} tone="success" />
                <StatCard label={t('payroll.excluded')} value={d.employeesExcluded} icon={UserMinus} tone="warning" />
                <StatCard label={t('payroll.totalBasic')} value={money(r?.totalBasic)} icon={Banknote} tone="navy" />
                <StatCard label={t('payroll.totalEarnings')} value={money(r?.totalEarnings)} icon={TrendingUp} tone="success" />
                <StatCard label={t('payroll.totalDeductions')} value={money(r?.totalDeductions)} icon={TrendingDown} tone="danger" />
                <StatCard label={t('payroll.totalCommissions')} value={money(r?.totalCommissions)} icon={BadgePercent} />
                <StatCard label={t('payroll.totalOvertime')} value={money(r?.totalOvertime)} icon={Timer} tone="info" />
                <StatCard label={t('payroll.totalNet')} value={money(r?.totalNet)} icon={Wallet} tone="brand" />
                <StatCard label={t('payroll.pendingApprovals')} value={d.pendingApprovals} icon={Clock4} tone="warning" to="/payroll/runs?status=IN_REVIEW" />
                <StatCard label={t('payslips.paymentStatus')} value={r ? t(`status.${r.status}`) : '—'} icon={Banknote} tone="navy" />
              </div>
              <Card title={t('payroll.trend')}>
                <BarsChart data={d.trend.map((x) => ({ ...x, net: Number(x.net), earnings: Number(x.earnings), deductions: Number(x.deductions) }))} x="month"
                  series={[{ key: 'earnings', label: t('payroll.totalEarnings') }, { key: 'deductions', label: t('payroll.totalDeductions') }, { key: 'net', label: t('payroll.totalNet') }]} />
              </Card>
            </div>
          );
        }}
      </QueryState>
    </div>
  );
}
