import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader, StatusBadge } from '../../components/common/Display';
import { Modal } from '../../components/common/Overlay';
import DataTable from '../../components/tables/DataTable';
import { Checkbox, Field, Input, MultiCheck, Select } from '../../components/forms/Fields';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { date, money, nm, ttl } from '../../utils/format';

const TYPES = ['FIXED_PER_SERVICE', 'PERCENT_SALES', 'PERCENT_COLLECTED', 'PERCENT_NET_PROFIT', 'PER_TASK', 'TARGET', 'TIERED', 'TEAM', 'SUPERVISOR', 'BRANCH_MANAGER', 'MONTHLY_BONUS', 'PERFORMANCE_BONUS'];
const BASES = ['SALES_AMOUNT', 'COLLECTED_AMOUNT', 'NET_PROFIT', 'TASK_COUNT', 'FIXED'];
const CONDITIONS = ['requireCompleted', 'requireQuality', 'requireInvoice', 'requireCollection', 'excludeCancelled', 'excludeRefunded', 'requireActiveEmployee'];
const blank = { code: '', nameAr: '', nameEn: '', type: 'PERCENT_SALES', calculationBase: 'SALES_AMOUNT', value: '', tierMode: '', tiers: [], participantRole: 'ANY', requiresApproval: true, effectiveFrom: new Date().toISOString().slice(0, 10), conditions: { requireCompleted: true, excludeCancelled: true, excludeRefunded: true, requireActiveEmployee: true }, branchIds: [], positionIds: [], departmentIds: [], status: 'ACTIVE' };

function RuleForm({ rule, onChange }) {
  const { t } = useTranslation();
  const branches = useOptions('/organization/branches');
  const positions = useOptions('/organization/positions');
  const [preview, setPreview] = useState({ amount: '25000', result: null });
  const set = (k, v) => onChange({ ...rule, [k]: v });
  const tiered = rule.type === 'TIERED';
  useEffect(() => {
    if (!tiered || !rule.tierMode || !rule.tiers.length || rule.tiers.some((x) => x.fromAmount === '' || x.rate === '')) { setPreview((p) => ({ ...p, result: null })); return; }
    const h = setTimeout(() => api.post('/commissions/rules/preview', { amount: preview.amount || '0', tierMode: rule.tierMode, tiers: rule.tiers.map((x) => ({ ...x, toAmount: x.toAmount === '' ? null : x.toAmount })) })
      .then((r) => setPreview((p) => ({ ...p, result: r.data.commission }))).catch(() => setPreview((p) => ({ ...p, result: null }))), 300);
    return () => clearTimeout(h);
  }, [tiered, rule.tierMode, rule.tiers, preview.amount]);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('common.code')} required><Input dir="ltr" value={rule.code} onChange={(e) => set('code', e.target.value)} /></Field>
        <Field label={t('fields.nameAr')} required><Input value={rule.nameAr} onChange={(e) => set('nameAr', e.target.value)} /></Field>
        <Field label={t('fields.nameEn')} required><Input value={rule.nameEn} onChange={(e) => set('nameEn', e.target.value)} /></Field>
        <Field label={t('common.type')}><Select placeholder={false} value={rule.type} onChange={(e) => set('type', e.target.value)} options={TYPES.map((v) => ({ value: v, label: t(`enums.commissionType.${v}`) }))} /></Field>
        <Field label={t('fields.calculationBase')}><Select placeholder={false} value={rule.calculationBase} onChange={(e) => set('calculationBase', e.target.value)} options={BASES.map((v) => ({ value: v, label: t(`enums.calcBase.${v}`) }))} /></Field>
        {!tiered && <Field label={`${t('fields.value')} (${['FIXED_PER_SERVICE', 'PER_TASK', 'MONTHLY_BONUS', 'PERFORMANCE_BONUS'].includes(rule.type) || rule.calculationBase === 'FIXED' ? t('common.amount') : '%'})`} required><Input type="number" step="any" value={rule.value} onChange={(e) => set('value', e.target.value)} /></Field>}
        <Field label={t('fields.participantRole')}><Select placeholder={false} value={rule.participantRole} onChange={(e) => set('participantRole', e.target.value)} options={['ANY', 'TECHNICIAN', 'SALES', 'SUPERVISOR', 'MANAGER'].map((v) => ({ value: v, label: t(`enums.role.${v}`) }))} /></Field>
        <Field label={t('fields.effectiveFrom')} required><Input type="date" value={rule.effectiveFrom} onChange={(e) => set('effectiveFrom', e.target.value)} /></Field>
        <Field label={t('fields.expiryDate')}><Input type="date" value={rule.expiryDate || ''} onChange={(e) => set('expiryDate', e.target.value)} /></Field>
        <Field label={t('fields.minTarget')}><Input type="number" value={rule.minTarget ?? ''} onChange={(e) => set('minTarget', e.target.value)} /></Field>
        <Field label={t('fields.maxTarget')}><Input type="number" value={rule.maxTarget ?? ''} onChange={(e) => set('maxTarget', e.target.value)} /></Field>
        <Field label={t('fields.maxCommission')}><Input type="number" value={rule.maxCommission ?? ''} onChange={(e) => set('maxCommission', e.target.value)} /></Field>
        <Field label={t('fields.serviceCategory')}><Input dir="ltr" value={rule.serviceCategory || ''} onChange={(e) => set('serviceCategory', e.target.value)} /></Field>
        <Field label={t('fields.serviceCode')}><Input dir="ltr" value={rule.serviceCode || ''} onChange={(e) => set('serviceCode', e.target.value)} /></Field>
        <Field label={t('fields.priority')}><Input type="number" value={rule.priority ?? 0} onChange={(e) => set('priority', e.target.value)} /></Field>
        <Field label={t('common.status')}><Select placeholder={false} value={rule.status} onChange={(e) => set('status', e.target.value)} options={['ACTIVE', 'INACTIVE'].map((v) => ({ value: v, label: t(`status.${v}`) }))} /></Field>
        <div className="flex items-end pb-2"><Checkbox label={t('fields.requiresApproval')} checked={!!rule.requiresApproval} onChange={(e) => set('requiresApproval', e.target.checked)} /></div>
      </div>
      {tiered && (
        <div className="rounded-2xl border border-line p-4">
          <p className="mb-3 text-sm font-medium text-navy-700">{t('fields.tiers')}</p>
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            {['WHOLE_AMOUNT', 'INCREMENTAL'].map((m) => <label key={m} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${rule.tierMode === m ? 'border-brand-400 bg-brand-50' : 'border-line'}`}><input type="radio" checked={rule.tierMode === m} onChange={() => set('tierMode', m)} />{t(`enums.tierMode.${m}`)}</label>)}
          </div>
          {!rule.tierMode && <p className="mb-2 text-xs text-danger">{t('fields.tierMode')} *</p>}
          {rule.tiers.map((tier, i) => (
            <div key={i} className="mb-2 grid grid-cols-7 gap-2">
              <Input className="col-span-2" type="number" placeholder={t('common.from')} value={tier.fromAmount} onChange={(e) => set('tiers', rule.tiers.map((x, j) => (j === i ? { ...x, fromAmount: e.target.value } : x)))} />
              <Input className="col-span-2" type="number" placeholder={`${t('common.to')} (∞)`} value={tier.toAmount ?? ''} onChange={(e) => set('tiers', rule.tiers.map((x, j) => (j === i ? { ...x, toAmount: e.target.value } : x)))} />
              <Input className="col-span-2" type="number" step="any" placeholder="%" value={tier.rate} onChange={(e) => set('tiers', rule.tiers.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))} />
              <button type="button" className="btn-ghost text-danger" onClick={() => set('tiers', rule.tiers.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" className="btn-secondary btn-sm" onClick={() => set('tiers', [...rule.tiers, { fromAmount: rule.tiers.at(-1)?.toAmount || '0', toAmount: '', rate: '' }])}><Plus className="h-4 w-4" />{t('commissions.addTier')}</button>
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-sm">
            <span>{t('commissions.tierPreview')}:</span><Input className="w-36" type="number" value={preview.amount} onChange={(e) => setPreview((p) => ({ ...p, amount: e.target.value }))} />
            <span>→ <b>{preview.result != null ? money(preview.result) : '—'}</b></span>
          </div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label={t('nav.branches')}><MultiCheck options={(branches.data?.items || []).map((b) => ({ value: b.id, label: nm(b) }))} value={rule.branchIds || []} onChange={(v) => set('branchIds', v)} /></Field>
        <Field label={t('nav.positions')}><MultiCheck options={(positions.data?.items || []).map((b) => ({ value: b.id, label: ttl(b) }))} value={rule.positionIds || []} onChange={(v) => set('positionIds', v)} /></Field>
      </div>
      <Field label={t('fields.conditions')}>
        <MultiCheck columns={3} options={CONDITIONS.map((c) => ({ value: c, label: c.replace(/([A-Z])/g, ' $1').toLowerCase() }))} value={CONDITIONS.filter((c) => rule.conditions?.[c])} onChange={(v) => set('conditions', Object.fromEntries(CONDITIONS.map((c) => [c, v.includes(c)])))} />
      </Field>
    </div>
  );
}

export default function Rules() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [edit, setEdit] = useState(null);
  const q = useGet(['comm-rules'], '/commissions/rules', { all: 'true' });
  const save = useSend(edit?.id ? 'put' : 'post', () => (edit?.id ? `/commissions/rules/${edit.id}` : '/commissions/rules'), { invalidate: ['comm-rules', ['options', '/commissions/rules']], onSuccess: () => setEdit(null) });
  const nul = (v) => (v === '' || v === undefined ? null : v);
  const submit = () => {
    const r = edit;
    save.mutate({
      code: r.code, nameAr: r.nameAr, nameEn: r.nameEn, type: r.type, calculationBase: r.calculationBase, value: r.type === 'TIERED' ? '0' : String(r.value || '0'), tierMode: nul(r.tierMode),
      minTarget: nul(r.minTarget), maxTarget: nul(r.maxTarget), maxCommission: nul(r.maxCommission), serviceCategory: nul(r.serviceCategory), serviceCode: nul(r.serviceCode),
      branchIds: r.branchIds?.length ? r.branchIds : null, positionIds: r.positionIds?.length ? r.positionIds : null, departmentIds: r.departmentIds?.length ? r.departmentIds : null,
      conditions: r.conditions, requiresApproval: !!r.requiresApproval, participantRole: r.participantRole, effectiveFrom: r.effectiveFrom, expiryDate: nul(r.expiryDate),
      priority: Number(r.priority || 0), status: r.status, ...(r.type === 'TIERED' ? { tiers: r.tiers.map((x) => ({ fromAmount: String(x.fromAmount || 0), toAmount: nul(x.toAmount), rate: String(x.rate || 0) })) } : {}),
    });
  };
  return (
    <div>
      <PageHeader title={t('nav.rules')} breadcrumbs={[{ label: t('nav.commissions'), to: '/commissions' }, { label: t('nav.rules') }]}
        actions={can('commissions.settings') && <button type="button" className="btn-primary" onClick={() => setEdit({ ...blank })}><Plus className="h-4 w-4" />{t('commissions.newRule')}</button>} />
      <div className="card">
        <DataTable rows={q.data?.items} loading={q.isLoading} error={q.error}
          onRowClick={(r) => can('commissions.settings') && setEdit({ ...blank, ...r, value: String(r.value), effectiveFrom: r.effectiveFrom?.slice(0, 10), expiryDate: r.expiryDate?.slice(0, 10) || '', tierMode: r.tierMode || '', tiers: (r.tiers || []).map((x) => ({ fromAmount: String(x.fromAmount), toAmount: x.toAmount != null ? String(x.toAmount) : '', rate: String(x.rate) })), branchIds: r.branchIds || [], positionIds: r.positionIds || [], minTarget: r.minTarget ?? '', maxTarget: r.maxTarget ?? '', maxCommission: r.maxCommission ?? '' })}
          columns={[
            { key: 'code', header: t('common.code'), render: (r) => <span dir="ltr" className="font-mono text-xs">{r.code}</span> }, { key: 'n', header: t('common.name'), render: (r) => nm(r) },
            { key: 't', header: t('common.type'), render: (r) => t(`enums.commissionType.${r.type}`) }, { key: 'b', header: t('fields.calculationBase'), render: (r) => t(`enums.calcBase.${r.calculationBase}`) },
            { key: 'v', header: t('fields.value'), render: (r) => (r.type === 'TIERED' ? `${r.tiers.length} ${t('fields.tiers')} · ${r.tierMode === 'INCREMENTAL' ? '↗' : '■'}` : Number(r.value)) },
            { key: 'p', header: t('fields.participantRole'), render: (r) => t(`enums.role.${r.participantRole}`) }, { key: 'e', header: t('fields.effectiveFrom'), render: (r) => date(r.effectiveFrom) },
            { key: 's', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
          ]} />
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? nm(edit) : t('commissions.newRule')} size="xl"
        footer={<><button type="button" className="btn-outline" onClick={() => setEdit(null)}>{t('common.cancel')}</button><button type="button" className="btn-primary" disabled={save.isPending} onClick={submit}>{t('common.save')}</button></>}>
        {edit && <RuleForm rule={edit} onChange={setEdit} />}
      </Modal>
    </div>
  );
}
