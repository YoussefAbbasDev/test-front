import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Building2, ChevronDown, ChevronRight, Minus, Plus, Users, Maximize2, Minimize2, History } from 'lucide-react';
import { PageHeader, Avatar, ActivityTimeline } from '../../components/common/Display';
import { SearchInput } from '../../components/common/Controls';
import { QueryState } from '../../components/common/Feedback';
import { Drawer } from '../../components/common/Overlay';
import { Select } from '../../components/forms/Fields';
import { useGet, useOptions, useSend } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { empName, nm, ttl } from '../../utils/format';

const matches = (s, e) => !s || empName(e).toLowerCase().includes(s) || (e.employeeNumber || '').toLowerCase().includes(s);

function PersonCard({ e, search, onOpen }) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={() => onOpen(e)} className={clsx('flex w-52 items-center gap-2 rounded-xl border bg-surface px-3 py-2 text-start shadow-card transition hover:border-brand-300', search && matches(search, e) ? 'border-brand-500 ring-2 ring-brand-200' : 'border-line')}>
      <Avatar person={e} size={32} />
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-ink">{empName(e)}</span>
        <span className="block truncate text-[11px] text-ink-muted">{ttl(e.position) || t('common.none')}</span>
      </span>
    </button>
  );
}

function UnitNode({ node, expanded, toggle, search, onOpen, canEdit, onDrop }) {
  const { t, i18n } = useTranslation();
  const open = expanded.has(node.id);
  const Chevron = open ? ChevronDown : i18n.dir() === 'rtl' ? ChevronRight : ChevronRight;
  const [over, setOver] = useState(false);
  return (
    <li className="relative">
      <div
        draggable={canEdit}
        onDragStart={(ev) => ev.dataTransfer.setData('unit', node.id)}
        onDragOver={(ev) => { if (canEdit) { ev.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={(ev) => { setOver(false); const id = ev.dataTransfer.getData('unit'); if (id && id !== node.id) onDrop(id, node.id); }}
        className={clsx('inline-flex min-w-[15rem] flex-col rounded-2xl border bg-surface shadow-card transition', over ? 'border-brand-500 ring-2 ring-brand-200' : 'border-line', canEdit && 'cursor-grab')}>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button type="button" className="grid h-6 w-6 place-items-center rounded-lg bg-brand-50 text-brand-600" onClick={() => toggle(node.id)} aria-label="toggle"><Chevron className={clsx('h-4 w-4', !open && 'rtl:rotate-180')} /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy-700">{nm(node)}</p>
            <p className="text-[11px] text-ink-muted">{t(`enums.unitType.${node.type}`)} · <Users className="inline h-3 w-3" /> {node.headcount}</p>
          </div>
        </div>
        {node.manager && (
          <button type="button" onClick={() => onOpen(node.manager)} className="flex items-center gap-2 border-t border-line px-3 py-2 text-start hover:bg-canvas">
            <Avatar person={node.manager} size={26} />
            <span className="min-w-0"><span className="block truncate text-xs text-ink">{empName(node.manager)}</span><span className="block text-[10px] text-ink-muted">{t('fields.manager')}</span></span>
          </button>
        )}
      </div>
      {open && (
        <div className="ms-6 mt-3 space-y-3 border-s-2 border-dashed border-brand-200 ps-6">
          {node.employees.filter((e) => e.id !== node.manager?.id).length > 0 && (
            <div className="flex flex-wrap gap-2">{node.employees.filter((e) => e.id !== node.manager?.id).map((e) => <PersonCard key={e.id} e={e} search={search} onOpen={onOpen} />)}</div>
          )}
          {node.teams.map((team) => (
            <div key={team.id} className="rounded-2xl border border-dashed border-line bg-canvas/60 p-3">
              <p className="mb-2 text-xs font-medium text-ink-soft">{nm(team)} · {t('fields.team')}{team.leader ? ` · ${empName(team.leader)}` : ''}</p>
              <div className="flex flex-wrap gap-2">{team.employees.map((e) => <PersonCard key={e.id} e={e} search={search} onOpen={onOpen} />)}</div>
            </div>
          ))}
          {node.children.length > 0 && <ul className="space-y-4">{node.children.map((c) => <UnitNode key={c.id} node={c} expanded={expanded} toggle={toggle} search={search} onOpen={onOpen} canEdit={canEdit} onDrop={onDrop} />)}</ul>}
        </div>
      )}
    </li>
  );
}

function PeopleNode({ node, search, onOpen, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  return (
    <li>
      <div className="flex items-center gap-1">
        {node.children.length > 0 ? <button type="button" className="grid h-6 w-6 place-items-center rounded-lg text-brand-600 hover:bg-brand-50" onClick={() => setOpen((o) => !o)}>{open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</button> : <span className="w-6" />}
        <PersonCard e={node} search={search} onOpen={onOpen} />
        {node.children.length > 0 && <span className="text-[11px] text-ink-muted">({node.children.length})</span>}
      </div>
      {open && node.children.length > 0 && <ul className="ms-9 mt-2 space-y-2 border-s-2 border-dashed border-brand-200 ps-4">{node.children.map((c) => <PeopleNode key={c.id} node={c} search={search} onOpen={onOpen} depth={depth + 1} />)}</ul>}
    </li>
  );
}

export default function OrgChart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [mode, setMode] = useState('units');
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const branches = useOptions('/organization/branches');
  const q = useGet(['org-chart', mode, branchId], '/organization/chart', { mode, branchId: branchId || undefined });
  const history = useGet(['org-history'], historyOpen ? '/organization/history' : null);
  const move = useSend('patch', ({ id }) => `/organization/departments/${id}/move`, { invalidate: ['org-chart'], success: t('org.moved') });

  const allIds = useMemo(() => {
    const ids = [];
    const walk = (n) => { ids.push(n.id); n.children?.forEach(walk); };
    (q.data?.roots || []).forEach(walk);
    return ids;
  }, [q.data]);
  const exp = expanded || new Set(allIds.slice(0, 8));
  const toggle = (id) => { const s = new Set(exp); s.has(id) ? s.delete(id) : s.add(id); setExpanded(s); };
  const openPerson = (e) => navigate(`/employees/${e.id}`);
  const s = search.trim().toLowerCase();

  return (
    <div>
      <PageHeader title={t('org.title')} description={t('org.subtitle')}
        actions={<>
          <div className="flex rounded-xl bg-canvas p-1">
            {['units', 'people'].map((m) => <button key={m} type="button" className={clsx('rounded-lg px-3 py-1.5 text-sm', mode === m ? 'bg-surface font-medium text-brand-700 shadow-card' : 'text-ink-muted')} onClick={() => setMode(m)}>{t(`org.${m}`)}</button>)}
          </div>
          <button type="button" className="btn-outline" onClick={() => setHistoryOpen(true)}><History className="h-4 w-4" />{t('org.history')}</button>
        </>} />
      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <SearchInput className="w-full sm:w-72" value={search} onChange={setSearch} />
        <Select className="w-full sm:w-52" value={branchId} onChange={(e) => setBranchId(e.target.value)} options={(branches.data?.items || []).map((b) => ({ value: b.id, label: nm(b) }))} placeholder={t('common.branch')} />
        <div className="ms-auto flex items-center gap-1">
          {mode === 'units' && <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setExpanded(new Set(allIds))}><Maximize2 className="h-4 w-4" />{t('org.expandAll')}</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setExpanded(new Set())}><Minimize2 className="h-4 w-4" />{t('org.collapseAll')}</button>
          </>}
          <button type="button" className="btn-outline btn-sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} aria-label={t('org.zoomOut')}><Minus className="h-4 w-4" /></button>
          <span className="w-12 text-center text-xs text-ink-muted">{Math.round(zoom * 100)}%</span>
          <button type="button" className="btn-outline btn-sm" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} aria-label={t('org.zoomIn')}><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      {mode === 'units' && can('organization.edit') && <p className="mb-3 text-xs text-ink-muted">{t('org.moveHint')}</p>}
      <div className="card overflow-auto p-6" style={{ minHeight: 420 }}>
        <QueryState query={q}>
          {(d) => (
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top', width: `${100 / zoom}%` }}>
              <div className="mb-5 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-600 to-navy-700 px-4 py-3 text-white shadow-card">
                <Building2 className="h-5 w-5" /><span className="font-semibold">{nm(d.company)}</span><span className="text-xs text-white/70">{d.company.headcount ?? ''} {t('org.headcount')}</span>
              </div>
              {mode === 'units' ? (
                <ul className="space-y-4">
                  {d.roots.map((n) => <UnitNode key={n.id} node={n} expanded={exp} toggle={toggle} search={s} onOpen={openPerson} canEdit={can('organization.edit')} onDrop={(id, parentId) => move.mutate({ id, parentId })} />)}
                </ul>
              ) : (
                <ul className="space-y-3">{d.roots.map((n) => <PeopleNode key={n.id} node={n} search={s} onOpen={openPerson} />)}</ul>
              )}
              {mode === 'units' && d.unassigned?.length > 0 && (
                <div className="mt-6"><p className="mb-2 text-xs text-ink-muted">{t('org.unassigned')}</p><div className="flex flex-wrap gap-2">{d.unassigned.map((e) => <PersonCard key={e.id} e={e} search={s} onOpen={openPerson} />)}</div></div>
              )}
            </div>
          )}
        </QueryState>
      </div>
      <Drawer open={historyOpen} onClose={() => setHistoryOpen(false)} title={t('org.history')} width="max-w-lg">
        <div className="p-5"><ActivityTimeline items={history.data?.items} /></div>
      </Drawer>
    </div>
  );
}
