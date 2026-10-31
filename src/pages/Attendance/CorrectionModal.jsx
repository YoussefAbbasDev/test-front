import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/common/Overlay';
import ResourceForm from '../../components/forms/ResourceForm';
import { useSend } from '../../hooks/useApi';
import { today } from '../../utils/format';

export default function CorrectionModal({ open, onClose, initialDate }) {
  const { t } = useTranslation();
  const send = useSend('post', '/attendance/corrections', { invalidate: ['corrections', 'att-today', 'att-mine'], onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} title={t('attendance.requestCorrection')}
      footer={<><button type="button" className="btn-outline" onClick={onClose}>{t('common.cancel')}</button><button type="submit" form="corr-form" className="btn-primary" disabled={send.isPending}>{t('common.submit')}</button></>}>
      <p className="mb-4 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">{t('attendance.correctionHint')}</p>
      <ResourceForm id="corr-form" defaultValues={{ date: initialDate || today() }} onSubmit={(v) => send.mutate({ ...v, checkOutNextDay: !!v.checkOutNextDay })} fields={[
        { name: 'date', label: t('common.date'), type: 'date', required: true }, { name: 'checkIn', label: t('attendance.requestedIn'), type: 'time' },
        { name: 'checkOut', label: t('attendance.requestedOut'), type: 'time' }, { name: 'checkOutNextDay', label: t('attendance.nextDay'), type: 'checkbox' },
        { name: 'reason', label: t('common.reason'), type: 'textarea', required: true },
      ]} />
    </Modal>
  );
}
