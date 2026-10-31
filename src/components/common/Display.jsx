import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock3, XCircle, MinusCircle } from 'lucide-react';
import { fetchObjectUrl } from '../../services/api';
import { initials, dateTime, empName } from '../../utils/format';

export function PageHeader({ title, description, actions, breadcrumbs = [] }) {
  const { i18n } = useTranslation();
  const Sep = i18n.dir() === 'rtl' ? ChevronLeft : ChevronRight;
  return (
    <div className="mb-6">
      {breadcrumbs.length > 0 && (
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-ink-muted" aria-label="breadcrumb">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <Sep className="h-3 w-3" />}
              {b.to ? <Link to={b.to} className="hover:text-brand-600">{b.label}</Link> : <span>{b.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-navy-700 sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'brand', hint, to }) {
  const tones = { brand: 'bg-brand-50 text-brand-600', navy: 'bg-navy-700/10 text-navy-700', success: 'bg-success/10 text-success', warning: 'bg-warning/10 text-warning', danger: 'bg-danger/10 text-danger', info: 'bg-info/10 text-info' };
  const body = (
    <div className="card flex items-start gap-3 p-4 transition-shadow hover:shadow-pop">
      {Icon && <div className={clsx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', tones[tone])}><Icon className="h-5 w-5" /></div>}
      <div className="min-w-0">
        <p className="truncate text-xs text-ink-muted">{label}</p>
        <p className="mt-0.5 text-xl font-semibold text-ink tabular-nums">{value ?? '—'}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

const STATUS_TONE = {
  ACTIVE: 'green', PRESENT: 'green', APPROVED: 'green', PAID: 'green', VALID: 'green', LOCKED: 'navy', SETTLED: 'green', ISSUED: 'blue', INCLUDED: 'green', ACCEPTED: 'green', PROCESSED: 'green', SCHEDULED: 'blue', OPEN: 'blue', CLOSED: 'gray',
  PROBATION: 'blue', ON_LEAVE: 'purple', HOLIDAY: 'purple', DAY_OFF: 'gray', INCLUDED_IN_PAYROLL: 'navy', DISBURSED: 'blue', REPAYING: 'blue', CALCULATED: 'blue', PAYABLE: 'blue', REVIEWED: 'blue',
  LATE: 'amber', HALF_DAY: 'amber', INCOMPLETE: 'amber', PENDING: 'amber', PENDING_APPROVAL: 'amber', SUBMITTED: 'amber', PENDING_MANAGER: 'amber', PENDING_HR: 'amber', PENDING_FINANCE: 'amber', PENDING_FINAL: 'amber',
  IN_REVIEW: 'amber', CANCELLATION_PENDING: 'amber', ON_HOLD: 'amber', DUE: 'amber', EXPIRING: 'amber', PARTIALLY_PAID: 'amber', UPCOMING: 'gray', DRAFT: 'gray', WAITING: 'gray', SKIPPED: 'gray', NOT_REQUIRED: 'gray', NONE: 'gray',
  ABSENT: 'red', REJECTED: 'red', TERMINATED: 'red', SUSPENDED: 'red', EXPIRED: 'red', OVERDUE: 'red', FAILED: 'red', VOID: 'red', REVERSED: 'red', DECLINED: 'red',
  RESIGNED: 'gray', INACTIVE: 'gray', CANCELLED: 'gray', WITHDRAWN: 'gray', ARCHIVED: 'gray', DEFERRED: 'gray', UNPAID: 'gray', EXCLUDED: 'gray', DISABLED: 'gray',
};
const TONE_CLASS = { green: 'bg-success/10 text-success', amber: 'bg-warning/10 text-warning', red: 'bg-danger/10 text-danger', blue: 'bg-info/10 text-info', purple: 'bg-brand-100 text-brand-700', navy: 'bg-navy-700/10 text-navy-700', gray: 'bg-canvas text-ink-soft border border-line' };

export function StatusBadge({ status, className }) {
  const { t } = useTranslation();
  if (!status) return null;
  return <span className={clsx('chip', TONE_CLASS[STATUS_TONE[status] || 'gray'], className)}>{t(`status.${status}`)}</span>;
}

const photoCache = new Map();
export function Avatar({ person, size = 36, className }) {
  const [src, setSrc] = useState(person?.photoFileId ? photoCache.get(person.photoFileId) : null);
  useEffect(() => {
    let alive = true;
    const id = person?.photoFileId;
    if (id && !photoCache.has(id)) {
      fetchObjectUrl(`/files/${id}`).then((u) => { photoCache.set(id, u); if (alive) setSrc(u); }).catch(() => {});
    } else setSrc(id ? photoCache.get(id) : null);
    return () => { alive = false; };
  }, [person?.photoFileId]);
  const style = { width: size, height: size, fontSize: size * 0.36 };
  return src
    ? <img src={src} alt="" style={style} className={clsx('shrink-0 rounded-full object-cover ring-2 ring-white', className)} />
    : <div style={style} className={clsx('grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-navy-700 font-medium text-white ring-2 ring-white', className)}>{initials(person)}</div>;
}

export function PersonCell({ person, sub, to }) {
  const content = (
    <div className="flex items-center gap-3">
      <Avatar person={person} size={34} />
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{empName(person)}</p>
        {sub && <p className="truncate text-xs text-ink-muted">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="hover:opacity-80">{content}</Link> : content;
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="mb-5 overflow-x-auto border-b border-line">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => onChange(tab.key)}
            className={clsx('relative px-4 py-2.5 text-sm transition-colors', active === tab.key ? 'font-medium text-brand-700' : 'text-ink-muted hover:text-ink')}>
            {tab.label}
            {tab.count != null && <span className="ms-1.5 rounded-full bg-brand-50 px-1.5 text-xs text-brand-600">{tab.count}</span>}
            {active === tab.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Card({ title, actions, children, className, bodyClass = 'p-5' }) {
  return (
    <section className={clsx('card', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-navy-700">{title}</h2>
          {actions}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function InfoGrid({ items, cols = 3 }) {
  return (
    <dl className={clsx('grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2', cols === 3 && 'lg:grid-cols-3', cols === 4 && 'lg:grid-cols-4')}>
      {items.filter(Boolean).map(([label, value], i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs text-ink-muted">{label}</dt>
          <dd className="mt-0.5 break-words text-sm text-ink">{value === null || value === undefined || value === '' ? '—' : value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Approval timeline (generic approval engine instances)
export function ApprovalTimeline({ instances = [] }) {
  const { t } = useTranslation();
  if (!instances.length) return <p className="text-sm text-ink-muted">{t('common.none')}</p>;
  const icon = { APPROVED: <CheckCircle2 className="h-4 w-4 text-success" />, REJECTED: <XCircle className="h-4 w-4 text-danger" />, PENDING: <Clock3 className="h-4 w-4 text-warning" />, SKIPPED: <MinusCircle className="h-4 w-4 text-ink-muted" />, CLOSED: <MinusCircle className="h-4 w-4 text-ink-muted" /> };
  return (
    <div className="space-y-4">
      {instances.map((inst) => (
        <div key={inst.id}>
          <div className="mb-2 flex items-center gap-2 text-xs text-ink-muted"><span>{inst.workflow?.name}</span><StatusBadge status={inst.status} /></div>
          <ol className="relative space-y-3 border-s border-line ps-5">
            {inst.tasks.map((task) => (
              <li key={task.id} className="relative">
                <span className="absolute -start-[27px] top-0.5 grid h-5 w-5 place-items-center rounded-full bg-surface">{icon[task.status] || <Circle className="h-4 w-4 text-line" />}</span>
                <p className="text-sm text-ink">{task.stepName}{task.approverName && <span className="text-ink-muted"> — {task.approverName}</span>}</p>
                <p className="text-xs text-ink-muted"><StatusBadge status={task.status} className="me-2" />{task.actedAt && dateTime(task.actedAt)}</p>
                {task.comment && !['NO_APPROVER', 'CONDITION_NOT_MET'].includes(task.comment) && <p className="mt-1 rounded-lg bg-canvas px-3 py-1.5 text-xs text-ink-soft">{task.comment}</p>}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

// Audit/activity feed
export function ActivityTimeline({ items = [] }) {
  const { t } = useTranslation();
  if (!items.length) return <p className="text-sm text-ink-muted">{t('common.noData')}</p>;
  const fmt = (v) => (v && typeof v === 'object' ? Object.entries(v).map(([k, x]) => `${k}: ${x === null ? '—' : typeof x === 'object' ? JSON.stringify(x) : x}`).join(' · ') : '');
  return (
    <ol className="relative space-y-4 border-s border-line ps-5">
      {items.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -start-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-brand-50" />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-medium text-ink">{a.action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</span>
            <span className="text-xs text-ink-muted">{a.userName || t('nav.system')} · {dateTime(a.createdAt)}{a.ip ? ` · ${a.ip}` : ''}</span>
          </div>
          {(a.oldValue || a.newValue) && (
            <div className="mt-1 space-y-0.5 text-xs">
              {a.oldValue && Object.keys(a.oldValue).length > 0 && <p className="text-danger/80 line-through decoration-danger/30">{fmt(a.oldValue)}</p>}
              {a.newValue && Object.keys(a.newValue).length > 0 && <p className="text-success">{fmt(a.newValue)}</p>}
            </div>
          )}
          {a.reason && <p className="mt-1 text-xs text-ink-soft">{t('common.reason')}: {a.reason}</p>}
        </li>
      ))}
    </ol>
  );
}
