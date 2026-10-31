import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, FileText, Printer, Search, SlidersHorizontal, X } from 'lucide-react';
import clsx from 'clsx';
import { download } from '../../services/api';
import { Select } from '../forms/Fields';

export function SearchInput({ value, onChange, placeholder, className }) {
  const { t } = useTranslation();
  const [v, setV] = useState(value || '');
  const timer = useRef();
  useEffect(() => setV(value || ''), [value]);
  const change = (next) => {
    setV(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), 300);
  };
  return (
    <div className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input className="input ps-9" value={v} onChange={(e) => change(e.target.value)} placeholder={placeholder || t('common.search')} />
      {v && <button type="button" className="absolute end-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink" onClick={() => change('')}><X className="h-4 w-4" /></button>}
    </div>
  );
}

/** FilterPanel — filters: [{ key, label, options }] ; values object ; onChange(key, value) */
export function FilterPanel({ filters, values, onChange, onClear, children }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const active = filters.filter((f) => values[f.key]).length;
  return (
    <>
      <button type="button" className={clsx('btn-outline lg:hidden', active && 'border-brand-300 text-brand-700')} onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal className="h-4 w-4" />{t('common.filters')}{active > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{active}</span>}
      </button>
      <div className={clsx('w-full flex-wrap items-center gap-2 lg:flex lg:w-auto', open ? 'flex' : 'hidden')}>
        {filters.map((f) => (
          <Select key={f.key} className="h-10 w-full sm:w-44" value={values[f.key] || ''} onChange={(e) => onChange(f.key, e.target.value)} options={f.options} placeholder={f.label} aria-label={f.label} />
        ))}
        {children}
        {active > 0 && <button type="button" className="btn-ghost btn-sm" onClick={onClear}>{t('common.clear')}</button>}
      </div>
    </>
  );
}

export function DateRangePicker({ from, to, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <input type="date" className="input h-10 w-[9.5rem]" value={from || ''} onChange={(e) => onChange({ from: e.target.value, to })} aria-label={t('common.from')} />
      <span className="text-ink-muted">–</span>
      <input type="date" className="input h-10 w-[9.5rem]" value={to || ''} onChange={(e) => onChange({ from, to: e.target.value })} aria-label={t('common.to')} />
    </div>
  );
}

// Export menu calling the same endpoint with format=xlsx|pdf|csv (server-side export, permission checked)
export function ExportButton({ url, params = {}, filename = 'export', formats = ['xlsx', 'pdf'], onPrint }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const icons = { xlsx: FileSpreadsheet, pdf: FileText, csv: FileSpreadsheet };
  const labels = { xlsx: t('common.exportExcel'), pdf: t('common.exportPdf'), csv: t('common.exportCsv') };
  return (
    <div className="relative" ref={ref}>
      <button type="button" className="btn-outline" onClick={() => setOpen((o) => !o)}><Download className="h-4 w-4" />{t('common.export')}</button>
      {open && (
        <div className="absolute end-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop">
          {formats.map((f) => {
            const Icon = icons[f];
            return (
              <button key={f} type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-soft hover:bg-canvas" onClick={() => { setOpen(false); download(url, { ...params, format: f, pageSize: undefined, page: undefined }, `${filename}.${f}`); }}>
                <Icon className="h-4 w-4" />{labels[f]}
              </button>
            );
          })}
          <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-soft hover:bg-canvas" onClick={() => { setOpen(false); (onPrint || window.print)(); }}>
            <Printer className="h-4 w-4" />{t('common.print')}
          </button>
        </div>
      )}
    </div>
  );
}
