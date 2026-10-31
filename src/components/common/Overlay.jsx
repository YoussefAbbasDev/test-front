import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div role="dialog" aria-modal="true" className={clsx('flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl', widths[size])}>
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-semibold text-navy-700">{title}</h3>
          <button type="button" className="btn-ghost h-8 w-8 p-0" onClick={onClose} aria-label="close"><X className="h-4 w-4" /></button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

// Form inside a modal: children receive the form; submit button wired to `form` id
export function FormModal({ open, onClose, title, onSubmit, submitting, children, size, submitLabel }) {
  const { t } = useTranslation();
  const id = `form-${title?.replace(/\s/g, '') || 'modal'}`;
  return (
    <Modal open={open} onClose={onClose} title={title} size={size}
      footer={<>
        <button type="button" className="btn-outline" onClick={onClose}>{t('common.cancel')}</button>
        <button type="submit" form={id} className="btn-primary" disabled={submitting}>{submitting ? t('common.loading') : submitLabel || t('common.save')}</button>
      </>}>
      <form id={id} onSubmit={onSubmit} noValidate>{children}</form>
    </Modal>
  );
}

/** ConfirmDialog — optional reason input for sensitive actions */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, danger, requireReason, busy, children }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  return (
    <Modal open={open} onClose={onClose} size="sm" title={title || t('common.confirmTitle')}
      footer={<>
        <button type="button" className="btn-outline" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} disabled={busy || (requireReason && reason.trim().length < 2)} onClick={() => onConfirm(reason)}>{confirmLabel || t('common.confirm')}</button>
      </>}>
      <div className="flex gap-3">
        {danger && <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger"><AlertTriangle className="h-5 w-5" /></div>}
        <div className="flex-1 space-y-3">
          {message && <p className="text-sm text-ink-soft">{message}</p>}
          {children}
          {requireReason !== undefined && (
            <div>
              <label className="label">{t('common.reason')}{requireReason ? ' *' : ''}</label>
              <textarea className="input h-20 py-2" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function Drawer({ open, onClose, title, children, width = 'max-w-md' }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 bg-navy-900/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={clsx('absolute inset-y-0 end-0 flex w-full flex-col bg-surface shadow-pop', width)}>
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-semibold text-navy-700">{title}</h3>
          <button type="button" className="btn-ghost h-8 w-8 p-0" onClick={onClose}><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
