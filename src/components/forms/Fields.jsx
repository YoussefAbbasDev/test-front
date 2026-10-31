import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export function Field({ label, error, required, hint, children, className }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}{required && <span className="text-danger"> *</span>}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export const Input = forwardRef(({ className, ...props }, ref) => <input ref={ref} className={clsx('input', className)} {...props} />);
export const Textarea = forwardRef(({ className, rows = 3, ...props }, ref) => <textarea ref={ref} rows={rows} className={clsx('input h-auto py-2', className)} {...props} />);

export const Select = forwardRef(({ options = [], placeholder, className, ...props }, ref) => {
  const { t } = useTranslation();
  return (
    <select ref={ref} className={clsx('input pe-8', className)} {...props}>
      {placeholder !== false && <option value="">{placeholder || `— ${t('common.all')} —`}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
});

export const Checkbox = forwardRef(({ label, className, ...props }, ref) => (
  <label className={clsx('flex cursor-pointer items-center gap-2 text-sm text-ink-soft', className)}>
    <input ref={ref} type="checkbox" className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-300" {...props} />
    {label}
  </label>
));

export function MultiCheck({ options, value = [], onChange, columns = 2 }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className={clsx('grid gap-2', columns === 7 ? 'grid-cols-4 sm:grid-cols-7' : columns === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
      {options.map((o) => (
        <label key={o.value} className={clsx('flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs', value.includes(o.value) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-line text-ink-soft')}>
          <input type="checkbox" className="h-3.5 w-3.5 rounded text-brand-600" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
          {o.label}
        </label>
      ))}
    </div>
  );
}

// enum helper: options from translation namespace
export const useEnum = (ns, keys) => {
  const { t } = useTranslation();
  return keys.map((k) => ({ value: k, label: t(`enums.${ns}.${k}`) }));
};
