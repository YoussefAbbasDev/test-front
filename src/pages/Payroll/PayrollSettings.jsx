import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Plus, Trash2 } from 'lucide-react';
import { PageHeader, Card } from '../../components/common/Display';
import { QueryState } from '../../components/common/Feedback';
import { Checkbox, Field, Input, Select } from '../../components/forms/Fields';
import { useGet, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';

export default function PayrollSettings() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const q = useGet(['payroll-settings'], '/payroll/settings');
  const workflows = useGet(['workflows'], '/settings/workflows', undefined, { retry: false });
  const [s, setS] = useState(null);
  useEffect(() => { if (q.data) setS({ ...q.data, eosRules: q.data.eosRules || [], gosiNationalities: (q.data.gosiNationalities || []).join(', ') }); }, [q.data]);
  const save = useSend('put', '/payroll/settings', { invalidate: ['payroll-settings'] });
  const ro = !can('payroll.settings');
  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const num = (k, label, extra = {}) => <Field label={label}><Input type="number" step="any" disabled={ro} value={s[k] ?? ''} onChange={set(k)} {...extra} /></Field>;
  const submit = () => {
    const body = {
      frequency: s.frequency, cutoffDay: Number(s.cutoffDay), paymentDay: Number(s.paymentDay), daysBasis: s.daysBasis, fixedDaysPerMonth: Number(s.fixedDaysPerMonth),
      standardDailyHours: String(s.standardDailyHours), overtimeBase: s.overtimeBase, overtimeRateWeekday: String(s.overtimeRateWeekday), overtimeRateWeekend: String(s.overtimeRateWeekend),
      overtimeRateHoliday: String(s.overtimeRateHoliday), absenceDeductionEnabled: !!s.absenceDeductionEnabled, absenceDeductionBase: s.absenceDeductionBase, lateDeductionMode: s.lateDeductionMode,
      lateFreeMinutesPerPeriod: Number(s.lateFreeMinutesPerPeriod), earlyLeaveDeduction: !!s.earlyLeaveDeduction, unpaidLeaveDeduction: !!s.unpaidLeaveDeduction, roundingDecimals: Number(s.roundingDecimals),
      roundingMode: s.roundingMode, maxDeductionPercent: s.maxDeductionPercent === '' || s.maxDeductionPercent === null ? null : String(s.maxDeductionPercent),
      gosiEmployeeRate: String(s.gosiEmployeeRate), gosiEmployerRate: String(s.gosiEmployerRate), gosiNationalities: s.gosiNationalities ? s.gosiNationalities.split(',').map((x) => x.trim()).filter(Boolean) : null,
      commissionInclusion: s.commissionInclusion, workflowId: s.workflowId || null,
      eosRules: s.eosRules.length ? s.eosRules.map((r) => ({ fromYears: Number(r.fromYears), toYears: r.toYears === '' || r.toYears == null ? null : Number(r.toYears), monthsPerYear: Number(r.monthsPerYear), base: r.base })) : null,
    };
    save.mutate(body);
  };
  const G = t('payroll.settingsGroups', { returnObjects: true });
  return (
    <div>
      <PageHeader title={t('nav.payrollSettings')} breadcrumbs={[{ label: t('nav.payroll'), to: '/payroll' }, { label: t('nav.payrollSettings') }]}
        actions={!ro && <button type="button" className="btn-primary" onClick={submit} disabled={save.isPending || !s}><Save className="h-4 w-4" />{t('common.save')}</button>} />
      <QueryState query={q}>
        {() => s && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title={G.general}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('fields.paymentFrequency')}><Select disabled={ro} value={s.frequency} onChange={set('frequency')} placeholder={false} options={['MONTHLY', 'WEEKLY', 'BIWEEKLY', 'CUSTOM'].map((v) => ({ value: v, label: t(`enums.frequency.${v}`) }))} /></Field>
                <Field label={t('cfg.daysBasis')}><Select disabled={ro} value={s.daysBasis} onChange={set('daysBasis')} placeholder={false} options={[{ value: 'FIXED', label: t('cfg.fixedDays') }, { value: 'CALENDAR', label: t('cfg.calendarDays') }]} /></Field>
                {num('fixedDaysPerMonth', t('cfg.fixedDaysPerMonth'))}{num('standardDailyHours', t('cfg.dailyHours'))}
                {num('cutoffDay', t('cfg.cutoffDay'))}{num('paymentDay', t('fields.paymentDate'))}
                {num('roundingDecimals', t('cfg.roundingDecimals'))}
                <Field label={t('cfg.roundingMode')}><Select disabled={ro} value={s.roundingMode} onChange={set('roundingMode')} placeholder={false} options={['HALF_UP', 'DOWN', 'UP'].map((v) => ({ value: v, label: v }))} /></Field>
                <Field label={t('nav.commissions')}><Select disabled={ro} value={s.commissionInclusion} onChange={set('commissionInclusion')} placeholder={false} options={[{ value: 'APPROVED_BY_PERIOD_END', label: t('cfg.approvedByEnd') }, { value: 'ALL_PAYABLE', label: t('cfg.allPayable') }]} /></Field>
                <Field label={t('nav.workflows')}><Select disabled={ro} value={s.workflowId || ''} onChange={set('workflowId')} placeholder={t('common.all')} options={(workflows.data?.items || []).filter((w) => w.entityType === 'PAYROLL').map((w) => ({ value: w.id, label: w.name }))} /></Field>
              </div>
            </Card>
            <Card title={G.overtime}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('cfg.otBase')}><Select disabled={ro} value={s.overtimeBase} onChange={set('overtimeBase')} placeholder={false} options={[{ value: 'BASIC', label: t('fields.basicSalary') }, { value: 'FLAGGED_COMPONENTS', label: t('fields.includeInOvertimeBase') }]} /></Field>
                {num('overtimeRateWeekday', `× ${t('enums.dayType.WORKDAY')}`)}{num('overtimeRateWeekend', `× ${t('enums.dayType.WEEKEND')}`)}{num('overtimeRateHoliday', `× ${t('enums.dayType.HOLIDAY')}`)}
              </div>
            </Card>
            <Card title={G.deductions}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Checkbox label={t('cfg.absenceDeduction')} checked={!!s.absenceDeductionEnabled} disabled={ro} onChange={set('absenceDeductionEnabled')} />
                <Field label={t('cfg.absenceBase')}><Select disabled={ro} value={s.absenceDeductionBase} onChange={set('absenceDeductionBase')} placeholder={false} options={[{ value: 'BASIC', label: t('fields.basicSalary') }, { value: 'FLAGGED_COMPONENTS', label: t('fields.includeInAbsenceBase') }]} /></Field>
                <Field label={t('cfg.lateDeduction')}><Select disabled={ro} value={s.lateDeductionMode} onChange={set('lateDeductionMode')} placeholder={false} options={[{ value: 'NONE', label: t('status.NONE') }, { value: 'PER_MINUTE', label: t('cfg.perMinute') }]} /></Field>
                {num('lateFreeMinutesPerPeriod', t('cfg.freeLate'))}
                <Checkbox label={t('cfg.earlyDeduction')} checked={!!s.earlyLeaveDeduction} disabled={ro} onChange={set('earlyLeaveDeduction')} />
                <Checkbox label={t('leaves.reports.unpaid')} checked={!!s.unpaidLeaveDeduction} disabled={ro} onChange={set('unpaidLeaveDeduction')} />
                {num('maxDeductionPercent', t('cfg.maxDeduction'), { placeholder: '—' })}
              </div>
            </Card>
            <Card title={G.statutory}>
              <div className="grid gap-4 sm:grid-cols-2">
                {num('gosiEmployeeRate', t('cfg.gosiEmp'))}{num('gosiEmployerRate', t('cfg.gosiEmployer'))}
                <Field label={t('fields.nationality')} className="sm:col-span-2" hint="Saudi, …"><Input disabled={ro} value={s.gosiNationalities} onChange={set('gosiNationalities')} /></Field>
              </div>
            </Card>
            <Card title={G.eos} className="lg:col-span-2">
              <div className="space-y-2">
                {s.eosRules.map((r, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <Input type="number" placeholder={t('cfg.fromYears')} value={r.fromYears} onChange={(e) => setS((x) => ({ ...x, eosRules: x.eosRules.map((y, j) => (j === i ? { ...y, fromYears: e.target.value } : y)) }))} />
                    <Input type="number" placeholder={t('cfg.toYears')} value={r.toYears ?? ''} onChange={(e) => setS((x) => ({ ...x, eosRules: x.eosRules.map((y, j) => (j === i ? { ...y, toYears: e.target.value } : y)) }))} />
                    <Input type="number" step="any" placeholder={t('cfg.monthsPerYear')} value={r.monthsPerYear} onChange={(e) => setS((x) => ({ ...x, eosRules: x.eosRules.map((y, j) => (j === i ? { ...y, monthsPerYear: e.target.value } : y)) }))} />
                    <Select value={r.base} placeholder={false} options={[{ value: 'BASIC', label: t('fields.basicSalary') }, { value: 'FLAGGED', label: t('fields.includeInEosBase') }]} onChange={(e) => setS((x) => ({ ...x, eosRules: x.eosRules.map((y, j) => (j === i ? { ...y, base: e.target.value } : y)) }))} />
                    <button type="button" className="btn-ghost text-danger" onClick={() => setS((x) => ({ ...x, eosRules: x.eosRules.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                {!ro && <button type="button" className="btn-secondary btn-sm" onClick={() => setS((x) => ({ ...x, eosRules: [...x.eosRules, { fromYears: 0, toYears: '', monthsPerYear: 0.5, base: 'FLAGGED' }] }))}><Plus className="h-4 w-4" />{t('common.add')}</button>}
                <p className="text-xs text-ink-muted">{t('loans.settlementHint')}</p>
              </div>
            </Card>
          </div>
        )}
      </QueryState>
    </div>
  );
}
