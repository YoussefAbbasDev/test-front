// Config-driven form (React Hook Form + Zod). Field config:
// { name, label, type: text|number|date|time|select|multiselect|checkbox|textarea|color|weekdays|email, required, options | source:{url,label}, span, hint, show(values) }
import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Checkbox, Field, Input, MultiCheck, Select, Textarea } from './Fields';
import { useOptions } from '../../hooks/useApi';

const buildSchema = (fields, t) => {
  const shape = {};
  for (const f of fields) {
    let s;
    const req = t('common.required');
    if (f.type === 'checkbox') s = z.boolean().optional();
    else if (f.type === 'multiselect' || f.type === 'weekdays') s = f.required ? z.array(z.any()).min(1, req) : z.array(z.any()).optional();
    else if (f.type === 'number') {
      s = z.union([z.string(), z.number()]).optional().refine((v) => v === undefined || v === '' || !Number.isNaN(Number(v)), t('common.error'));
      if (f.required) s = s.refine((v) => v !== undefined && v !== '', req);
      if (f.min !== undefined) s = s.refine((v) => v === undefined || v === '' || Number(v) >= f.min, `≥ ${f.min}`);
    } else {
      s = z.string().trim().optional().or(z.literal(''));
      if (f.required) s = z.string({ required_error: req }).trim().min(1, req);
      if (f.type === 'email') s = s.refine((v) => !v || /.+@.+\..+/.test(v), t('fields.email'));
      if (f.pattern) s = s.refine((v) => !v || f.pattern.test(v), f.patternMessage || t('common.error'));
      if (f.max) s = s.refine((v) => !v || v.length <= f.max, `≤ ${f.max}`);
    }
    shape[f.name] = s;
  }
  return z.object(shape).passthrough();
};

function SourceSelect({ field, ...props }) {
  const q = useOptions(field.source.url);
  const items = q.data?.items || [];
  const options = items.filter(field.source.filter || (() => true)).map((x) => ({ value: x.id, label: field.source.label(x) }));
  return <Select options={options} placeholder={`— ${field.placeholder || ''} —`} {...props} />;
}

function SourceMulti({ field, value, onChange }) {
  const q = useOptions(field.source.url);
  const options = (q.data?.items || []).map((x) => ({ value: x.id, label: field.source.label(x) }));
  return <MultiCheck options={options} value={value || []} onChange={onChange} />;
}

export const toFormValues = (fields, row = {}) => Object.fromEntries(fields.map((f) => {
  let v = row?.[f.name];
  if (f.type === 'date' && v) v = String(v).slice(0, 10);
  if (f.type === 'checkbox') v = !!v;
  if (f.type === 'multiselect' || f.type === 'weekdays') v = Array.isArray(v) ? v : f.default ?? [];
  if (v === null || v === undefined) v = f.default ?? (f.type === 'checkbox' ? false : '');
  if (typeof v === 'object' && v && typeof v.toString === 'function' && !Array.isArray(v)) v = String(v);
  return [f.name, v];
}));

// Drop empty strings to null; numbers stay strings for decimals (backend parses with Decimal)
export const toPayload = (fields, values) => {
  const out = {};
  for (const f of fields) {
    if (f.readOnly) continue;
    let v = values[f.name];
    if (f.type === 'number' && v !== '' && v !== undefined && f.integer) v = Number(v);
    if (v === '') v = null;
    if (f.type === 'weekdays' && Array.isArray(v)) v = v.map(Number);
    out[f.name] = v;
  }
  return out;
};

export default function ResourceForm({ id, fields, defaultValues, onSubmit, columns = 2 }) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildSchema(fields, t), [fields, t]);
  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(fields, defaultValues) });
  useEffect(() => { reset(toFormValues(fields, defaultValues)); }, [defaultValues, fields, reset]);
  const values = watch();
  const weekdays = (t('enums.weekdayShort', { returnObjects: true }) || []).map((label, i) => ({ value: i, label }));

  return (
    <form id={id} onSubmit={handleSubmit((v) => onSubmit(toPayload(fields, v)))} noValidate className={clsx('grid gap-4', columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-3' : '')}>
      {fields.filter((f) => !f.show || f.show(values)).map((f) => {
        const err = errors[f.name]?.message;
        const span = f.span === 'full' || ['textarea', 'multiselect', 'weekdays'].includes(f.type) ? 'sm:col-span-full' : '';
        if (f.type === 'checkbox') return <div key={f.name} className={clsx('flex items-end pb-2', span)}><Checkbox label={f.label} {...register(f.name)} disabled={f.readOnly} /></div>;
        return (
          <Field key={f.name} label={f.label} required={f.required} error={err} hint={f.hint} className={span}>
            {f.type === 'select' && f.source && <SourceSelect field={f} {...register(f.name)} disabled={f.readOnly} />}
            {f.type === 'select' && !f.source && <Select options={f.options} placeholder={f.placeholder ?? '—'} {...register(f.name)} disabled={f.readOnly} />}
            {f.type === 'textarea' && <Textarea {...register(f.name)} disabled={f.readOnly} />}
            {f.type === 'multiselect' && <Controller control={control} name={f.name} render={({ field }) => (f.source ? <SourceMulti field={f} value={field.value} onChange={field.onChange} /> : <MultiCheck options={f.options} value={field.value} onChange={field.onChange} />)} />}
            {f.type === 'weekdays' && <Controller control={control} name={f.name} render={({ field }) => <MultiCheck columns={7} options={weekdays} value={(field.value || []).map(Number)} onChange={field.onChange} />} />}
            {['text', 'email', 'date', 'time', 'number', 'color', undefined].includes(f.type) && (
              <Input type={f.type === 'number' ? 'number' : f.type || 'text'} step={f.step || (f.type === 'number' ? 'any' : undefined)} dir={f.ltr ? 'ltr' : undefined} {...register(f.name)} disabled={f.readOnly} placeholder={f.placeholder} />
            )}
          </Field>
        );
      })}
    </form>
  );
}
