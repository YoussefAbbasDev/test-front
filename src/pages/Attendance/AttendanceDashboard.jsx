import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserCheck, UserX, Clock, LogOut, Plane, AlertTriangle, Timer, Percent, ShieldAlert, CalendarCheck2 } from 'lucide-react';
import { PageHeader, StatCard, Card } from '../../components/common/Display';
import { QueryState } from '../../components/common/Feedback';
import { ConfirmDialog } from '../../components/common/Overlay';
import { Select } from '../../components/forms/Fields';
import { TrendChart } from '../../components/charts/Charts';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { nm, today } from '../../utils/format';
import dayjs from 'dayjs';

export default function AttendanceDashboard() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [params, setParams] = useState({ date: today(), branchId: '' });
  const [finalize, setFinalize] = useState(false);
  const branches = useOptions('/organization/branches');
  const q = useGet(['att-dash', params], '/attendance/dashboard', params);
  const fin = useSend('post', '/attendance/finalize', { invalidate: ['att-dash'], onSuccess: () => setFinalize(false) });
  return (
    <div>
      <PageHeader title={t('attendance.title')} description={t('attendance.subtitle')}
        actions={<>
          <Select className="w-44" value={params.branchId} onChange={(e) => setParams((p) => ({ ...p, branchId: e.target.value }))} options={(branches.data?.items || []).map((b) => ({ value: b.id, label: nm(b) }))} placeholder={t('common.branch')} />
          <input type="date" className="input w-40" value={params.date} onChange={(e) => setParams((p) => ({ ...p, date: e.target.value }))} />
          {can('attendance.settings') && <button type="button" className="btn-outline" onClick={() => setFinalize(true)}><CalendarCheck2 className="h-4 w-4" />{t('attendance.finalize')}</button>}
        </>} />
      <QueryState query={q}>
        {(d) => (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              <StatCard label={t('attendance.totalEmployees')} value={d.totalEmployees} icon={Users} />
              <StatCard label={t('attendance.presentToday')} value={d.presentToday} icon={UserCheck} tone="success" to={`/attendance/records?date=${d.date}`} />
              <StatCard label={t('attendance.absentToday')} value={d.absentToday} icon={UserX} tone="danger" to={`/attendance/records?date=${d.date}&status=ABSENT`} />
              <StatCard label={t('attendance.lateArrivals')} value={d.lateArrivals} icon={Clock} tone="warning" to={`/attendance/records?date=${d.date}&status=LATE`} />
              <StatCard label={t('attendance.earlyDepartures')} value={d.earlyDepartures} icon={LogOut} tone="warning" />
              <StatCard label={t('attendance.onLeave')} value={d.onLeave} icon={Plane} tone="info" />
              <StatCard label={t('attendance.missingCheckouts')} value={d.missingCheckouts} icon={AlertTriangle} tone="danger" to="/attendance/records?missingCheckout=true" />
              <StatCard label={t('attendance.overtimeHours')} value={d.overtimeHours} icon={Timer} tone="navy" />
              <StatCard label={t('attendance.attendancePercentage')} value={`${d.attendancePercentage}%`} icon={Percent} tone="success" />
              <StatCard label={t('attendance.suspicious')} value={d.suspicious} icon={ShieldAlert} tone="danger" to="/attendance/records?suspicious=true" />
            </div>
            <Card title={t('attendance.trend')}>
              <TrendChart data={d.trend.map((x) => ({ ...x, date: dayjs(x.date).format('MM-DD') }))} x="date"
                series={[{ key: 'present', label: t('status.PRESENT') }, { key: 'late', label: t('status.LATE') }, { key: 'absent', label: t('status.ABSENT') }, { key: 'leave', label: t('status.ON_LEAVE') }]} />
            </Card>
          </div>
        )}
      </QueryState>
      <ConfirmDialog open={finalize} onClose={() => setFinalize(false)} title={t('attendance.finalize')} message={`${params.date} — ${t('attendance.finalizeHint')}`} busy={fin.isPending} onConfirm={() => fin.mutate({ date: params.date })} />
    </div>
  );
}
