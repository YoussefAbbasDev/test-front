import { useTranslation } from 'react-i18next';
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { errorMessage } from '../../services/api';

export function LoadingState({ label, className }) {
  const { t } = useTranslation();
  return (
    <div className={clsx('flex items-center justify-center gap-3 py-16 text-ink-muted', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      <span className="text-sm">{label || t('common.loading')}</span>
    </div>
  );
}

export function EmptyState({ title, hint, icon: Icon = Inbox, action }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-500"><Icon className="h-6 w-6" /></div>
      <p className="font-medium text-ink">{title || t('common.noData')}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{hint || t('common.noDataHint')}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-danger/10 text-danger"><AlertTriangle className="h-6 w-6" /></div>
      <p className="font-medium text-ink">{t('common.error')}</p>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{errorMessage(error)}</p>
      {onRetry && <button type="button" className="btn-outline btn-sm mt-4" onClick={onRetry}><RefreshCw className="h-4 w-4" />{t('common.retry')}</button>}
    </div>
  );
}

// Renders loading / error / content for a react-query result
export function QueryState({ query, children, empty }) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (empty && empty(query.data)) return <EmptyState />;
  return children(query.data);
}
