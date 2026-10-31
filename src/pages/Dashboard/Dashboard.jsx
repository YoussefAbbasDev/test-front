import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, UserCheck, UserX, Clock, Plane, FileClock, Wallet, BadgePercent, HandCoins, FileWarning, ScrollText, ChevronLeft, ChevronRight, UserRoundCheck } from 'lucide-react';
import { PageHeader, StatCard, Card } from '../../components/common/Display';
import { DateRangePicker, FilterPanel } from '../../components/common/Controls';
import { QueryState } from '../../components/common/Feedback';
import { TrendChart, BarsChart, DonutChart } from '../../components/charts/Charts';
import { useGet, useOptions } from '../../hooks/useApi';
import { money, num, nm } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [filters, setFilters] = useState({});
  const branches = useOptions('/organization/branches');
  const departments = useOptions('/organization/departments');
  const q = useGet(['dashboard', filters], '/dashboard', filters);
  const Arrow = i18n.dir() === 'rtl' ? ChevronLeft : ChevronRight;
  const loc = (o) => (i18n.language === 'ar' ? o?.ar : o?.en) || '—';

  return (
    <div>
      <PageHeader title={`${t('common.welcome')}${user?.employee ? `${i18n.language === 'ar' ? '،' : ','} ${i18n.language === 'ar' && user.employee.fullNameAr ? user.employee.fullNameAr.split(' ')[0] : user.employee.firstName}` : ''}`} description={t('dashboard.subtitle')}
        actions={<>
          <FilterPanel values={filters} onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))} onClear={() => setFilters({})}
            filters={[
              { key: 'branchId', label: t('common.branch'), options: (branches.data?.items || []).map((b) => ({ value: b.id, label: nm(b) })) },
              { key: 'departmentId', label: t('common.department'), options: (departments.data?.items || []).map((d) => ({ value: d.id, label: nm(d) })) },
              { key: 'status', label: t('common.status'), options: ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED'].map((s) => ({ value: s, label: t(`status.${s}`) })) },
            ]} />
          <DateRangePicker from={filters.from} to={filters.to} onChange={(r) => setFilters((f) => ({ ...f, ...r }))} />
        </>} />
      <QueryState query={q}>
        {(d) => (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatCard label={t('dashboard.kpis.totalEmployees')} value={num(d.kpis.totalEmployees)} icon={Users} to="/employees" />
              <StatCard label={t('dashboard.kpis.activeEmployees')} value={num(d.kpis.activeEmployees)} icon={UserRoundCheck} tone="navy" to="/employees?status=ACTIVE" />
              <StatCard label={t('dashboard.kpis.presentToday')} value={num(d.kpis.presentToday)} icon={UserCheck} tone="success" to="/attendance/records" />
              <StatCard label={t('dashboard.kpis.absentToday')} value={num(d.kpis.absentToday)} icon={UserX} tone="danger" />
              <StatCard label={t('dashboard.kpis.lateToday')} value={num(d.kpis.lateToday)} icon={Clock} tone="warning" />
              <StatCard label={t('dashboard.kpis.onLeave')} value={num(d.kpis.onLeave)} icon={Plane} tone="info" to="/leaves/calendar" />
              <StatCard label={t('dashboard.kpis.pendingLeaveRequests')} value={num(d.kpis.pendingLeaveRequests)} icon={FileClock} tone="warning" to="/leaves" />
              <StatCard label={t('dashboard.kpis.payrollThisMonth')} value={d.kpis.payrollThisMonth != null ? money(d.kpis.payrollThisMonth) : t('dashboard.restricted')} icon={Wallet} to="/payroll" />
              <StatCard label={t('dashboard.kpis.totalCommissions')} value={d.kpis.totalCommissions != null ? money(d.kpis.totalCommissions) : '—'} icon={BadgePercent} tone="navy" to="/commissions" />
              <StatCard label={t('dashboard.kpis.pendingAdvances')} value={num(d.kpis.pendingAdvances)} icon={HandCoins} tone="warning" to="/finance" />
              <StatCard label={t('dashboard.kpis.contractsExpiring')} value={num(d.kpis.contractsExpiring)} icon={ScrollText} tone="danger" to={`/employees?contractExpiringDays=${user?.company?.contractAlertDays || 60}`} />
              <StatCard label={t('dashboard.kpis.documentsExpiring')} value={num(d.kpis.documentsExpiring)} icon={FileWarning} tone="danger" />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card title={t('dashboard.charts.attendanceTrend')} className="xl:col-span-2">
                <TrendChart data={d.charts.attendanceTrend.map((x) => ({ ...x, date: x.date.slice(5) }))} x="date"
                  series={[{ key: 'present', label: t('status.PRESENT') }, { key: 'late', label: t('status.LATE') }, { key: 'absent', label: t('status.ABSENT') }, { key: 'onLeave', label: t('status.ON_LEAVE') }]} />
              </Card>
              <Card title={t('dashboard.pending.title')} bodyClass="p-2">
                <ul className="divide-y divide-line">
                  {[
                    ['approvalsAssignedToMe', '/approvals'], ['leaveApprovals', '/leaves'], ['attendanceCorrections', '/attendance/corrections'], ['payrollApprovals', '/payroll/runs'],
                    ['commissionApprovals', '/commissions/ledger?status=PENDING_APPROVAL'], ['advanceRequests', '/finance'], ['loanRequests', '/finance?tab=loans'],
                    ['contractExpiry', '/employees'], ['documentExpiry', '/employees'],
                  ].map(([k, to]) => (
                    <li key={k}>
                      <Link to={to} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-canvas">
                        <span className="text-ink-soft">{t(`dashboard.pending.${k}`)}</span>
                        <span className="flex items-center gap-2"><span className={d.pending[k] ? 'chip bg-brand-50 text-brand-700' : 'text-ink-muted'}>{d.pending[k] ?? 0}</span><Arrow className="h-4 w-4 text-ink-muted" /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <Card title={t('dashboard.charts.byDepartment')}><BarsChart horizontal data={d.charts.byDepartment.map((x) => ({ name: loc(x.name), count: x.count }))} x="name" series={[{ key: 'count', label: t('fields.employees') }]} /></Card>
              <Card title={t('dashboard.charts.byBranch')}><DonutChart data={d.charts.byBranch.map((x) => ({ name: loc(x.name), value: x.count }))} /></Card>
              <Card title={t('dashboard.charts.statusDistribution')}><DonutChart data={d.charts.statusDistribution.map((x) => ({ name: t(`status.${x.status}`), value: x.count }))} /></Card>
              {d.charts.payrollByMonth && <Card title={t('dashboard.charts.payrollByMonth')}><BarsChart data={d.charts.payrollByMonth} x="month" series={[{ key: 'net', label: t('fields.net') }]} /></Card>}
              {d.charts.salaryCostByDepartment && <Card title={t('dashboard.charts.salaryCost')}><BarsChart horizontal data={d.charts.salaryCostByDepartment.map((x) => ({ name: loc(x.name), amount: x.amount }))} x="name" series={[{ key: 'amount', label: t('fields.gross') }]} /></Card>}
              <Card title={t('dashboard.charts.absenceRate')}><TrendChart area={false} data={d.charts.attendanceTrend.map((x) => ({ date: x.date.slice(5), rate: x.absenceRate }))} x="date" series={[{ key: 'rate', label: '%' }]} /></Card>
              <Card title={t('dashboard.charts.overtimeTrend')}><BarsChart data={d.charts.attendanceTrend.map((x) => ({ date: x.date.slice(5), h: x.overtimeHours }))} x="date" series={[{ key: 'h', label: t('common.hours') }]} /></Card>
              {d.charts.commissionDistribution && <Card title={t('dashboard.charts.commissionDistribution')}><DonutChart data={d.charts.commissionDistribution.map((x) => ({ name: loc(x), value: x.amount }))} /></Card>}
              <Card title={t('dashboard.charts.leaveUtilization')}><BarsChart data={d.charts.leaveUtilization.map((x) => ({ name: loc(x), entitled: x.entitled, used: x.used }))} x="name" series={[{ key: 'entitled', label: t('fields.accrued') }, { key: 'used', label: t('fields.used') }]} /></Card>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}
