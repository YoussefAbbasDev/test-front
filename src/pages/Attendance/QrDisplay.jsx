import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize } from 'lucide-react';
import { PageHeader } from '../../components/common/Display';
import { Select } from '../../components/forms/Fields';
import { useOptions, useGet } from '../../hooks/useApi';
import { api, notifyError } from '../../services/api';
import { nm } from '../../utils/format';
import logo from '../../assets/logo-horizontal.png';

// Rotating branch QR: a new short-lived token is requested before the current one expires.
export default function QrDisplay() {
  const { t } = useTranslation();
  const branches = useOptions('/organization/branches');
  const limits = useGet(['sys-limits'], '/settings/system', undefined, { retry: false });
  const ttl = Number(limits.data?.['attendance.qrTtlSeconds']) || 60;
  const [branchId, setBranchId] = useState('');
  const [qr, setQr] = useState(null);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!branchId) return undefined;
    let timer;
    const load = async () => {
      try {
        const { data } = await api.post(`/attendance/qr/${branchId}`, null, { params: { ttl } });
        setQr(data);
        timer = setTimeout(load, Math.max(5, ttl - 5) * 1000);
      } catch (e) { notifyError(e); }
    };
    load();
    return () => clearTimeout(timer);
  }, [branchId, ttl]);
  useEffect(() => {
    const i = setInterval(() => setLeft(qr ? Math.max(0, Math.round((new Date(qr.expiresAt) - Date.now()) / 1000)) : 0), 1000);
    return () => clearInterval(i);
  }, [qr]);

  return (
    <div>
      <PageHeader title={t('attendance.qrTitle')} description={t('attendance.qrHint')}
        actions={<>
          <Select className="w-56" value={branchId} onChange={(e) => setBranchId(e.target.value)} options={(branches.data?.items || []).map((b) => ({ value: b.id, label: nm(b) }))} placeholder={t('common.branch')} />
          {qr && <button type="button" className="btn-outline" onClick={() => document.getElementById('qr-stage')?.requestFullscreen?.()}><Maximize className="h-4 w-4" /></button>}
        </>} />
      <div id="qr-stage" className="card flex min-h-[460px] flex-col items-center justify-center gap-5 bg-surface p-8 text-center">
        {!qr ? <p className="text-ink-muted">{t('common.branch')} …</p> : (
          <>
            <img src={logo} alt="SEEDA" className="h-10" />
            <p className="text-lg font-semibold text-navy-700">{nm(qr.branch)}</p>
            <img src={qr.dataUrl} alt="QR" className="h-80 w-80 rounded-2xl border border-line p-3" />
            <p className="text-sm text-ink-muted">{t('attendance.expiresIn')} <span className="font-semibold tabular-nums text-brand-600">{left}s</span></p>
          </>
        )}
      </div>
    </div>
  );
}
