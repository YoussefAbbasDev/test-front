import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, Printer } from 'lucide-react';
import { PageHeader, StatusBadge } from '../../components/common/Display';
import { LoadingState, ErrorState } from '../../components/common/Feedback';
import { useGet } from '../../hooks/useApi';
import { download } from '../../services/api';
import { date, money } from '../../utils/format';
import logo from '../../assets/logo-horizontal.png';

// Printable bilingual payslip (RTL/LTR follows the UI language). Lines are the locked payroll lines from the server.
export default function PayslipView() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const q = useGet(['payslip', id], `/payslips/${id}`);
  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} />;
  const p = q.data;
  const s = p.runEmployee.snapshot;
  const ar = i18n.language === 'ar';
  const group = (type) => {
    const m = new Map();
    p.runEmployee.lines.filter((l) => l.type === type).forEach((l) => { const a = m.get(l.code) || { ...l, amount: 0 }; a.amount += Number(l.amount); m.set(l.code, a); });
    return [...m.values()];
  };
  const Table = ({ title, rows, tone }) => (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className={`px-4 py-2 text-sm font-medium text-white ${tone}`}>{title}</div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-line">
          {rows.map((l) => <tr key={l.code}><td className="px-4 py-2">{ar ? l.nameAr : l.nameEn}</td><td className="px-4 py-2 text-end tabular-nums">{money(l.amount, p.currency)}</td></tr>)}
          {!rows.length && <tr><td className="px-4 py-2 text-ink-muted">—</td></tr>}
        </tbody>
      </table>
    </div>
  );
  return (
    <div>
      <div className="no-print">
        <PageHeader title={`${t('payslips.payslip')} ${p.number}`} breadcrumbs={[{ label: t('payslips.title'), to: '/payslips' }, { label: p.number }]}
          actions={<>
            <button type="button" className="btn-outline" onClick={() => window.print()}><Printer className="h-4 w-4" />{t('common.print')}</button>
            <button type="button" className="btn-primary" onClick={() => download(`/payslips/${p.id}/pdf`, {}, `payslip-${p.number}.pdf`)}><Download className="h-4 w-4" />{t('payslips.downloadPdf')}</button>
          </>} />
        <p className="mb-4 text-xs text-ink-muted">{t('payslips.printHint')}</p>
      </div>
      <article className="print-area card relative mx-auto max-w-4xl overflow-hidden p-8">
        <div className="absolute inset-y-0 start-0 w-2 bg-gradient-to-b from-brand-600 via-brand-600 to-navy-700" />
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <h1 className="text-2xl font-semibold text-navy-700">{t('payslips.payslip')}</h1>
            <p className="mt-1 text-sm text-ink-muted">{ar ? p.company.nameAr : p.company.nameEn}</p>
            <p className="text-sm text-ink-muted">{t('fields.number')}: <span dir="ltr">{p.number}</span></p>
          </div>
          <img src={logo} alt="SEEDA" className="h-12" />
        </header>
        <section className="grid gap-4 py-6 text-sm sm:grid-cols-3">
          {[
            [t('common.employee'), ar ? s.nameAr : s.nameEn], [t('fields.employeeNumber'), s.employeeNumber], [t('fields.jobTitle'), ar ? s.titleAr : s.titleEn],
            [t('common.department'), ar ? s.departmentAr : s.departmentEn], [t('common.branch'), ar ? s.branchAr : s.branchEn], [t('payslips.bankAccount'), <span dir="ltr">{s.ibanMasked || t(`enums.paymentMethod.${s.paymentMethod}`)}</span>],
            [t('fields.period'), `${date(p.periodStart)} → ${date(p.periodEnd)}`], [t('fields.paymentDate'), date(p.paymentDate)], [t('payslips.paymentStatus'), <StatusBadge status={p.status} />],
          ].map(([k, v], i) => <div key={i}><p className="text-xs text-ink-muted">{k}</p><p className="font-medium text-ink">{v || '—'}</p></div>)}
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <Table title={t('fields.earnings')} rows={group('EARNING')} tone="bg-brand-600" />
          <Table title={t('fields.deductions')} rows={group('DEDUCTION')} tone="bg-navy-700" />
        </section>
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-canvas p-4"><p className="text-xs text-ink-muted">{t('payroll.totalEarnings')}</p><p className="text-lg font-semibold">{money(p.grossEarnings, p.currency)}</p></div>
          <div className="rounded-xl bg-canvas p-4"><p className="text-xs text-ink-muted">{t('payroll.totalDeductions')}</p><p className="text-lg font-semibold text-danger">{money(p.totalDeductions, p.currency)}</p></div>
          <div className="rounded-xl bg-gradient-to-r from-brand-600 to-navy-700 p-4 text-white"><p className="text-xs text-white/70">{t('payslips.netPay')}</p><p className="text-xl font-semibold">{money(p.netSalary, p.currency)}</p></div>
        </section>
        <footer className="mt-8 flex h-3 overflow-hidden rounded-full"><div className="w-[45%] bg-brand-600" /><div className="w-[25%] bg-navy-700" /><div className="w-[30%] bg-[#D0D2D3]" /></footer>
        <p className="mt-3 text-center text-[11px] text-ink-muted">{t('common.generatedFrom')} {p.runEmployee.run.runNumber} · SEEDA HRMS</p>
      </article>
    </div>
  );
}
