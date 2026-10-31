import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { Modal } from '../../components/common/Overlay';
import { Checkbox, Field, Input, Select, Textarea } from '../../components/forms/Fields';
import { useOptions, useSend } from '../../hooks/useApi';
import { api, notifyError } from '../../services/api';
import { empName, nm } from '../../utils/format';

// Leave request with a server-side day count preview (the frontend never calculates balances)
export default function LeaveRequestModal({ open, onClose, forOthers }) {
  const { t } = useTranslation();
  const types = useOptions('/leaves/types');
  const emps = useOptions('/employees?pageSize=200', !!forOthers);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { halfDay: false } });
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();
  const v = watch();
  const send = useSend('post', '/leaves/requests', { invalidate: ['leave-requests', 'my-balances', 'leave-cal'], onSuccess: onClose });

  useEffect(() => {
    if (!v.leaveTypeId || !v.startDate || !v.endDate || v.endDate < v.startDate) { setPreview(null); return; }
    const h = setTimeout(() => api.post('/leaves/requests/preview', { leaveTypeId: v.leaveTypeId, startDate: v.startDate, endDate: v.endDate, halfDay: !!v.halfDay, employeeId: v.employeeId || undefined })
      .then((r) => setPreview(r.data)).catch(() => setPreview(null)), 300);
    return () => clearTimeout(h);
  }, [v.leaveTypeId, v.startDate, v.endDate, v.halfDay, v.employeeId]);

  const submit = async (values, draft) => {
    let attachmentId;
    const file = fileRef.current?.files?.[0];
    if (file) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('entityType', 'LeaveAttachment');
        attachmentId = (await api.post('/files', fd)).data.id;
      } catch (e) { notifyError(e); return; }
    }
    send.mutate({ ...values, employeeId: values.employeeId || undefined, attachmentId, draft, halfDay: !!values.halfDay });
  };

  return (
    <Modal open={open} onClose={onClose} title={t('leaves.request')}
      footer={<>
        <button type="button" className="btn-outline" onClick={handleSubmit((x) => submit(x, true))} disabled={send.isPending}>{t('leaves.saveDraft')}</button>
        <button type="button" className="btn-primary" onClick={handleSubmit((x) => submit(x, false))} disabled={send.isPending}>{t('common.submit')}</button>
      </>}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        {forOthers && <Field label={t('common.employee')} className="sm:col-span-2"><Select {...register('employeeId')} placeholder={`— ${t('nav.myLeaves')} —`} options={(emps.data?.items || []).map((x) => ({ value: x.id, label: `${x.employeeNumber} — ${empName(x)}` }))} /></Field>}
        <Field label={t('fields.leaveType')} required error={errors.leaveTypeId && t('common.required')} className="sm:col-span-2">
          <Select {...register('leaveTypeId', { required: true })} placeholder="—" options={(types.data?.items || []).filter((x) => x.status === 'ACTIVE').map((x) => ({ value: x.id, label: nm(x) }))} />
        </Field>
        <Field label={t('fields.startDate')} required error={errors.startDate && t('common.required')}><Input type="date" {...register('startDate', { required: true })} /></Field>
        <Field label={t('fields.endDate')} required error={errors.endDate && t('common.required')}><Input type="date" {...register('endDate', { required: true, validate: (x, all) => !all.startDate || x >= all.startDate })} /></Field>
        <div className="sm:col-span-2"><Checkbox label={t('fields.halfDay')} {...register('halfDay')} /></div>
        {preview && (
          <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 sm:col-span-2">
            {t('leaves.computed')}: <b>{preview.days}</b>
            {preview.available != null && <> · {t('fields.available')}: <b>{preview.available}</b></>}
            {!preview.policy && <span className="block text-danger">{t('common.error')}: NO_LEAVE_POLICY</span>}
            {preview.policy?.attachmentRequired && <span className="block text-xs">{t('fields.attachmentRequired')}</span>}
          </div>
        )}
        <Field label={t('common.reason')} className="sm:col-span-2"><Textarea {...register('reason')} /></Field>
        <Field label={t('fields.emergencyContact')}><Input {...register('emergencyContact')} /></Field>
        <Field label={t('common.attachment')}><input ref={fileRef} type="file" accept=".pdf,image/*" className="input py-1.5" /></Field>
        <Field label={t('fields.handoverNotes')} className="sm:col-span-2"><Textarea {...register('handoverNotes')} /></Field>
      </form>
    </Modal>
  );
}
