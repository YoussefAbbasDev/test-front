import { Fragment, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Calculator, Send, Check, X, Lock, Banknote, FileDown, Undo2, Ban, ChevronDown, AlertTriangle, CircleAlert } from 'lucide-react';
import { PageHeader, StatusBadge, StatCard, Card, ApprovalTimeline } from '../../components/common/Display';
import { LoadingState, ErrorState } from '../../components/common/Feedback';
import { ConfirmDialog } from '../../components/common/Overlay';
import { SearchInput } from '../../components/common/Controls';
import { useGet, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { download } from '../../services/api';
import { date, money, minutes } from '../../utils/format';

export default function RunDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { can, user } = useAuth();
  const [confirm, setConfirm] = useState(null);
  const [open, setOpen] = useState(null);
  const [search, setSearch] = useState('');
  const q = useGet(['run', id], `/payroll/runs/${id}`);
  const inv = { invalidate: [['run', id], 'runs', 'payroll-dash', 'approvals-count'] };
  const act = useSend('post', ({ path }) => `/payroll/runs/${id}/${path}`, { ...inv, onSuccess: () => setConfirm(null) });
  const inclusion = useSend('post', ({ reId, action }) => `/payroll/runs/${id}/employees/${reId}/${action}`, inv);

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const run = q.data;
  const s = run.status;
  const myTask = (run.approvals || []).some((i) => i.status === 'PENDING' && i.tasks.some((tk) => tk.status === 'PENDING' && tk.approverUserId === user?.id));
  const name = (snap) => (i18n.language === 'ar' ? snap.nameAr : snap.nameEn);
  const rows = run.employees.filter((e) => !search || name(e.snapshot).toLowerCase().includes(search.toLowerCase()) || e.snapshot.employeeNumber.includes(search));
  const errCount = run.employees.filter((e) => e.status === 'INCLUDED' && e.errors?.length).length;
  const warnCount = run.employees.filter((e) => e.warnings?.length).length;
  const grouped = (lines, type) => {
    const m = new Map();
    lines.filter((l) => l.type === type).forEach((l) => { const a = m.get(l.code) || { ...l, amount: 0, count: 0 }; a.amount += Number(l.amount); a.count += 1; m.set(l.code, a); });
    return [...m.values()];
  };
  const ACTIONS = {
    calculate: { path: 'calculate', label: s === 'DRAFT' ? t('payroll.calculate') : t('payroll.recalculate'), icon: Calculator },
    submit: { path: 'submit', label: t('payroll.submit'), icon: Send },
    approve: { path: 'approve', label: t('common.approve'), icon: Check, body: true },
    reject: { path: 'reject', label: t('common.reject'), icon: X, reason: true, danger: true },
    lock: { path: 'lock', label: t('payroll.lock'), icon: Lock, message: t('payroll.lockHint') },
    payments: { path: 'payments', label: t('payroll.recordPayment'), icon: Banknote, reference: true },
    reverse: { path: 'reverse', label: t('payroll.reverse'), icon: Undo2, reason: true, danger: true, message: t('payroll.reverseHint') },
    cancel: { path: 'cancel', label: t('common.cancel'), icon: Ban, reason: true, danger: true },
  };
  const available = [
    ['DRAFT', 'CALCULATED'].includes(s) && can('payroll.edit') && 'calculate',
    s === 'CALCULATED' && can('payroll.edit') && 'submit',
    s === 'IN_REVIEW' && myTask && 'approve',
    s === 'IN_REVIEW' && myTask && 'reject',
    s === 'APPROVED' && can('payroll.approve') && 'lock',
    ['LOCKED', 'PARTIALLY_PAID'].includes(s) && can('payroll.approve') && 'payments',
    ['LOCKED', 'PAID', 'PARTIALLY_PAID'].includes(s) && run.type !== 'REVERSAL' && can('payroll.approve') && 'reverse',
    ['DRAFT', 'CALCULATED', 'IN_REVIEW'].includes(s) && can('payroll.edit') && 'cancel',
  ].filter(Boolean);
  const run_ = (key, reason) => {
    const a = ACTIONS[key];
    const body = a.reason ? { reason, comment: reason } : a.reference ? { reference: reason || undefined } : a.body ? { comment: reason || undefined } : {};
    act.mutate({ path: a.path, __body: body });
  };

  return (
    <div>
      <PageHeader title={<span dir="ltr">{run.runNumber}</span>} description={`${run.period.name} · ${date(run.period.startDate)} → ${date(run.period.endDate)}${run.branch ? ` · ${i18n.language === 'ar' ? run.branch.nameAr : run.branch.nameEn}` : ''}`}
        breadcrumbs={[{ label: t('nav.payroll'), to: '/payroll' }, { label: t('nav.runs'), to: '/payroll/runs' }, { label: run.runNumber }]}
        actions={<>
          <StatusBadge status={s} className="text-sm" />
          {available.map((k) => { const A = ACTIONS[k]; return <button key={k} type="button" className={A.danger ? 'btn-outline text-danger' : k === 'approve' || k === 'lock' || k === 'calculate' ? 'btn-primary' : 'btn-secondary'} onClick={() => (k === 'calculate' || k === 'submit' ? run_(k) : setConfirm(k))} disabled={act.isPending}><A.icon className="h-4 w-4" />{A.label}</button>; })}
          {['LOCKED', 'PAID', 'PARTIALLY_PAID'].includes(s) && can('payroll.export') && <button type="button" className="btn-outline" onClick={() => download(`/payroll/runs/${id}/bank-file`, { format: 'xlsx' }, `bank-${run.runNumber}.xlsx`)}><FileDown className="h-4 w-4" />{t('payroll.bankFile')}</button>}
        </>} />
      {['LOCKED', 'PAID', 'PARTIALLY_PAID', 'REVERSED'].includes(s) && <p className="mb-4 rounded-xl bg-navy-700/5 px-4 py-2 text-sm text-navy-700"><Lock className="me-1 inline h-4 w-4" />{t('payroll.lockedNote')}{run.reversal && <> · <Link className="underline" to={`/payroll/runs/${run.reversal.id}`}>{run.reversal.runNumber}</Link></>}</p>}
      {(errCount > 0 || warnCount > 0) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {errCount > 0 && <span className="chip bg-danger/10 px-3 py-1 text-danger"><CircleAlert className="h-4 w-4" />{t('payroll.errors')}: {errCount}</span>}
          {warnCount > 0 && <span className="chip bg-warning/10 px-3 py-1 text-warning"><AlertTriangle className="h-4 w-4" />{t('payroll.warnings')}: {warnCount}</span>}
        </div>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t('fields.employees')} value={run.employeesCount} />
        <StatCard label={t('payroll.totalBasic')} value={money(run.totalBasic)} />
        <StatCard label={t('payroll.totalEarnings')} value={money(run.totalEarnings)} tone="success" />
        <StatCard label={t('payroll.totalDeductions')} value={money(run.totalDeductions)} tone="danger" />
        <StatCard label={t('payroll.totalOvertime')} value={money(run.totalOvertime)} tone="info" />
        <StatCard label={t('payroll.totalNet')} value={money(run.totalNet)} tone="navy" />
      </div>
      <div className="grid gap-6 xl:grid-cols-4">
        <div className="card xl:col-span-3">
          <div className="border-b border-line p-3"><SearchInput className="w-full sm:w-72" value={search} onChange={setSearch} /></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line bg-canvas/60"><tr>
                {['', t('fields.employeeNumber'), t('common.employee'), t('payroll.paidDays'), t('fields.basicSalary'), t('fields.gross'), t('fields.deductions'), t('fields.net'), t('common.status'), ''].map((h, i) => <th key={i} className="table-head">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((e) => (
                  <Fragment key={e.id}>
                    <tr className={clsx('cursor-pointer hover:bg-brand-50/40', e.status !== 'INCLUDED' && 'opacity-60')} onClick={() => setOpen(open === e.id ? null : e.id)}>
                      <td className="table-cell w-8"><ChevronDown className={clsx('h-4 w-4 transition-transform', open === e.id && 'rotate-180')} /></td>
                      <td className="table-cell font-mono text-xs" dir="ltr">{e.snapshot.employeeNumber}</td>
                      <td className="table-cell"><div className="font-medium">{name(e.snapshot)}</div><div className="text-xs text-ink-muted">{i18n.language === 'ar' ? e.snapshot.departmentAr : e.snapshot.departmentEn}</div></td>
                      <td className="table-cell">{Number(e.paidDays)}</td>
                      <td className="table-cell">{money(e.basicSalary)}</td><td className="table-cell">{money(e.grossEarnings)}</td><td className="table-cell text-danger">{money(e.totalDeductions)}</td>
                      <td className="table-cell font-semibold">{money(e.netSalary)}</td>
                      <td className="table-cell"><div className="flex items-center gap-1"><StatusBadge status={e.status} />{e.paymentStatus !== 'UNPAID' && <StatusBadge status={e.paymentStatus} />}{e.errors?.length > 0 && <CircleAlert className="h-4 w-4 text-danger" />}{e.warnings?.length > 0 && <AlertTriangle className="h-4 w-4 text-warning" />}</div></td>
                      <td className="table-cell" onClick={(ev) => ev.stopPropagation()}>
                        {['DRAFT', 'CALCULATED'].includes(s) && can('payroll.edit') && (
                          e.status === 'INCLUDED'
                            ? <button type="button" className="text-xs text-danger hover:underline" onClick={() => setConfirm({ exclude: e })}>{t('payroll.exclude')}</button>
                            : <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => inclusion.mutate({ reId: e.id, action: 'include' })}>{t('payroll.include')}</button>
                        )}
                        {e.payslip && <Link to={`/payslips/${e.payslip.id}`} className="ms-2 text-xs text-brand-600 hover:underline">{t('payslips.payslip')}</Link>}
                      </td>
                    </tr>
                    {open === e.id && (
                      <tr className="bg-canvas/50"><td colSpan={10} className="px-6 py-4">
                        <div className="grid gap-6 md:grid-cols-2">
                          {['EARNING', 'DEDUCTION'].map((type) => (
                            <div key={type}>
                              <p className="mb-2 text-xs font-semibold uppercase text-ink-muted">{type === 'EARNING' ? t('fields.earnings') : t('fields.deductions')}</p>
                              <ul className="space-y-1 text-sm">
                                {grouped(e.lines, type).map((l) => (
                                  <li key={l.code} className="flex justify-between rounded-lg bg-surface px-3 py-1.5">
                                    <span>{i18n.language === 'ar' ? l.nameAr : l.nameEn}{l.count > 1 ? ` ×${l.count}` : ''}{l.quantity && l.count === 1 ? <span className="text-xs text-ink-muted"> ({Number(l.quantity)})</span> : ''}</span>
                                    <span className={type === 'DEDUCTION' ? 'text-danger' : ''}>{money(l.amount)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-muted">
                          <span>{t('payroll.absentDays')}: {Number(e.absentDays)}</span><span>· {t('fields.lateMinutes')}: {minutes(e.lateMinutes)}</span><span>· {t('fields.overtime')}: {minutes(e.overtimeMinutes)}</span>
                          {e.excludeReason && <span>· {t('common.reason')}: {e.excludeReason}</span>}
                        </div>
                        {(e.errors?.length > 0 || e.warnings?.length > 0) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(e.errors || []).map((x) => <span key={x} className="chip bg-danger/10 text-danger">{t(`payroll.errorCodes.${x}`)}</span>)}
                            {(e.warnings || []).map((w, i) => <span key={i} className="chip bg-warning/10 text-warning">{t(`payroll.warningCodes.${w.code}`)}{w.count ? ` (${w.count})` : ''}{w.deducted ? ` ${money(w.deducted)} / ${money(w.due)}` : ''}</span>)}
                          </div>
                        )}
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-6">
          <Card title={t('payroll.approvalChain')}><ApprovalTimeline instances={run.approvals} /></Card>
          <Card title={t('fields.category')}>
            <ul className="space-y-1.5 text-sm">{Object.entries(run.byCategory || {}).map(([k, v]) => <li key={k} className="flex justify-between"><span className="text-ink-soft">{k}</span><span>{money(v)}</span></li>)}</ul>
          </Card>
        </div>
      </div>
      {confirm && typeof confirm === 'string' && (
        <ConfirmDialog open onClose={() => setConfirm(null)} title={ACTIONS[confirm].label} message={ACTIONS[confirm].message} danger={ACTIONS[confirm].danger} busy={act.isPending}
          requireReason={ACTIONS[confirm].reason ? true : ACTIONS[confirm].body || ACTIONS[confirm].reference ? false : undefined} onConfirm={(r) => run_(confirm, r)} />
      )}
      {confirm?.exclude && (
        <ConfirmDialog open onClose={() => setConfirm(null)} title={t('payroll.exclude')} message={name(confirm.exclude.snapshot)} requireReason danger
          onConfirm={(reason) => { inclusion.mutate({ reId: confirm.exclude.id, action: 'exclude', __body: { reason } }); setConfirm(null); }} />
      )}
    </div>
  );
}
