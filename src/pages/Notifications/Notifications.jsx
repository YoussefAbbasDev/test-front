import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { PageHeader, Card } from '../../components/common/Display';
import { LoadingState } from '../../components/common/Feedback';
import { useGet, useSend } from '../../hooks/useApi';
import { ago } from '../../utils/format';

export default function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const list = useGet(['notifications', 'page'], '/notifications', { pageSize: 100 });
  const prefs = useGet(['notif-prefs'], '/notifications/preferences');
  const [items, setItems] = useState([]);
  useEffect(() => { if (prefs.data) setItems(prefs.data.items); }, [prefs.data]);
  const read = useSend('post', '/notifications/read', { invalidate: ['notifications', 'notif-count'], silent: true });
  const save = useSend('put', '/notifications/preferences', { invalidate: ['notif-prefs'] });
  const ch = ['inApp', 'email', 'sms', 'whatsapp', 'push'];
  const provider = { inApp: true, ...(prefs.data?.providers || {}) };
  return (
    <div>
      <PageHeader title={t('notifications.title')} actions={<button type="button" className="btn-outline" onClick={() => read.mutate({})}>{t('common.readAll')}</button>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t('notifications.title')} bodyClass="p-0">
          {list.isLoading ? <LoadingState /> : !list.data?.items.length ? <p className="p-8 text-center text-sm text-ink-muted">{t('notifications.empty')}</p> : (
            <ul className="divide-y divide-line">
              {list.data.items.map((n) => (
                <li key={n.id}>
                  <button type="button" className={clsx('flex w-full gap-3 px-5 py-3 text-start hover:bg-canvas', !n.readAt && 'bg-brand-50/50')} onClick={() => { read.mutate({ ids: [n.id] }); if (n.link) navigate(n.link); }}>
                    <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-line' : 'bg-brand-600')} />
                    <span><span className="block text-sm">{t(`notifications.types.${n.type}`, n.params || {})}</span><span className="text-xs text-ink-muted">{ago(n.createdAt)}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={t('notifications.preferences')} actions={<button type="button" className="btn-primary btn-sm" onClick={() => save.mutate({ items })}>{t('common.save')}</button>} bodyClass="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas/60"><tr><th className="table-head" />{ch.map((c) => <th key={c} className="table-head text-center">{c}{!provider[c] && <span className="block text-[10px] font-normal text-warning">{t('notifications.providerMissing')}</span>}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {items.map((p, i) => (
                  <tr key={p.type}>
                    <td className="table-cell whitespace-normal text-xs">{t(`notifications.types.${p.type}`).replace(/\{\{.*?\}\}/g, '…')}</td>
                    {ch.map((c) => <td key={c} className="text-center"><input type="checkbox" className="h-4 w-4 rounded text-brand-600" checked={!!p[c]} disabled={!provider[c] && !p[c]} onChange={(e) => setItems((x) => x.map((y, j) => (j === i ? { ...y, [c]: e.target.checked } : y)))} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
