import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../common/Feedback';

/**
 * DataTable — columns: [{ key, header, render(row), sortKey, className, hideOnMobile }]
 * Server-side paging: pass `page`, `pages`, `total`, `onPage`. Sorting: `sort` ('field' / '-field'), `onSort`.
 * Rows collapse into cards on small screens.
 */
export default function DataTable({
  columns, rows = [], loading, error, onRetry, page, pages, total, onPage, sort, onSort, onRowClick, rowKey = 'id',
  selectable, selected = [], onSelect, empty, footer, dense,
}) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows.length) return empty || <EmptyState />;

  const allSelected = selectable && rows.length > 0 && rows.every((r) => selected.includes(r[rowKey]));
  const toggleAll = () => onSelect(allSelected ? selected.filter((id) => !rows.some((r) => r[rowKey] === id)) : [...new Set([...selected, ...rows.map((r) => r[rowKey])])]);
  const toggle = (id) => onSelect(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const sortIcon = (key) => {
    if (!sort || !key) return null;
    if (sort === key) return <ArrowUp className="h-3 w-3" />;
    if (sort === `-${key}`) return <ArrowDown className="h-3 w-3" />;
    return null;
  };

  return (
    <div>
      {/* desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="border-b border-line bg-canvas/60">
            <tr>
              {selectable && <th className="w-10 px-4"><input type="checkbox" className="h-4 w-4 rounded text-brand-600" checked={allSelected} onChange={toggleAll} /></th>}
              {columns.map((c) => (
                <th key={c.key} className={clsx('table-head', c.sortKey && 'cursor-pointer select-none hover:text-ink', c.className)}
                  onClick={() => c.sortKey && onSort?.(sort === c.sortKey ? `-${c.sortKey}` : c.sortKey)}>
                  <span className="inline-flex items-center gap-1">{c.header}{sortIcon(c.sortKey)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r[rowKey]} className={clsx('transition-colors hover:bg-brand-50/40', onRowClick && 'cursor-pointer', selected.includes(r[rowKey]) && 'bg-brand-50/60')} onClick={() => onRowClick?.(r)}>
                {selectable && <td className="px-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="h-4 w-4 rounded text-brand-600" checked={selected.includes(r[rowKey])} onChange={() => toggle(r[rowKey])} /></td>}
                {columns.map((c) => <td key={c.key} className={clsx('table-cell', dense && 'py-2', c.className)}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
              </tr>
            ))}
          </tbody>
          {footer}
        </table>
      </div>
      {/* mobile cards */}
      <div className="divide-y divide-line md:hidden">
        {rows.map((r) => (
          <div key={r[rowKey]} className={clsx('space-y-1.5 px-4 py-3', onRowClick && 'cursor-pointer active:bg-brand-50/40')} onClick={() => onRowClick?.(r)}>
            {columns.filter((c) => !c.hideOnMobile).map((c, i) => (
              <div key={c.key} className={clsx('flex items-center justify-between gap-3 text-sm', i === 0 && 'font-medium')}>
                {i > 0 && <span className="shrink-0 text-xs text-ink-muted">{c.header}</span>}
                <span className={clsx('min-w-0 text-ink', i > 0 && 'text-end')}>{c.render ? c.render(r) : r[c.key] ?? '—'}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-ink-muted">
          <span>{t('common.showing')} {page} {t('common.of')} {pages} · {total} {t('common.rows')}</span>
          <div className="flex gap-1">
            <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>{rtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
            <button type="button" className="btn-outline btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>{rtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
          </div>
        </div>
      )}
    </div>
  );
}
