// Generic master-data page: list + search + filters + create/edit modal + delete, all via the real API.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader, StatusBadge } from '../components/common/Display';
import { SearchInput, FilterPanel, ExportButton } from '../components/common/Controls';
import { Modal, ConfirmDialog } from '../components/common/Overlay';
import DataTable from '../components/tables/DataTable';
import ResourceForm from '../components/forms/ResourceForm';
import { useGet, useSend } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

export default function ResourcePage({
  title, description, endpoint, columns, fields, filters = [], perms = {}, breadcrumbs, exportable, transformIn = (r) => r, transformOut = (v) => v,
  formColumns = 2, extraActions, rowActions, header = true, defaultSort,
}) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [params, setParams] = useState({ page: 1, pageSize: 20, search: '', sort: defaultSort });
  const [editing, setEditing] = useState(null); // null | {} (new) | row
  const [deleting, setDeleting] = useState(null);
  const key = ['resource', endpoint, params];
  const q = useGet(key, endpoint, params, { keepPreviousData: true });
  const save = useSend(editing?.id ? 'put' : 'post', () => (editing?.id ? `${endpoint}/${editing.id}` : endpoint), { invalidate: [['resource', endpoint], ['options', endpoint]], onSuccess: () => setEditing(null) });
  const remove = useSend('delete', (row) => `${endpoint}/${row.id}`, { invalidate: [['resource', endpoint], ['options', endpoint]], success: t('common.deleted'), onSuccess: () => setDeleting(null) });

  const canEdit = !perms.edit || can(perms.edit);
  const canDelete = perms.delete && can(perms.delete);
  const allColumns = [
    ...columns,
    ...(canEdit || canDelete || rowActions ? [{
      key: '_actions', header: '', className: 'w-24 text-end',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {rowActions?.(r)}
          {canEdit && <button type="button" className="btn-ghost h-8 w-8 p-0" title={t('common.edit')} onClick={() => setEditing(transformIn(r))}><Pencil className="h-4 w-4" /></button>}
          {canDelete && <button type="button" className="btn-ghost h-8 w-8 p-0 text-danger" title={t('common.delete')} onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></button>}
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      {header && (
        <PageHeader title={title} description={description} breadcrumbs={breadcrumbs}
          actions={<>
            {extraActions}
            {exportable && <ExportButton url={endpoint} params={params} filename={endpoint.split('/').pop()} />}
            {(!perms.create || can(perms.create)) && fields && <button type="button" className="btn-primary" onClick={() => setEditing({})}><Plus className="h-4 w-4" />{t('common.add')}</button>}
          </>} />
      )}
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput className="w-full sm:w-72" value={params.search} onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))} />
          {filters.length > 0 && <FilterPanel filters={filters} values={params} onChange={(k, v) => setParams((p) => ({ ...p, [k]: v, page: 1 }))} onClear={() => setParams((p) => ({ ...p, ...Object.fromEntries(filters.map((f) => [f.key, ''])), page: 1 }))} />}
          {!header && (!perms.create || can(perms.create)) && fields && <button type="button" className="btn-primary ms-auto" onClick={() => setEditing({})}><Plus className="h-4 w-4" />{t('common.add')}</button>}
        </div>
        <DataTable columns={allColumns} rows={q.data?.items} loading={q.isLoading} error={q.error} onRetry={q.refetch}
          page={q.data?.page} pages={q.data?.pages} total={q.data?.total} onPage={(page) => setParams((p) => ({ ...p, page }))}
          sort={params.sort} onSort={(sort) => setParams((p) => ({ ...p, sort }))} />
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `${t('common.edit')} — ${title}` : `${t('common.add')} — ${title}`} size={formColumns === 3 ? 'lg' : 'md'}
        footer={<>
          <button type="button" className="btn-outline" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
          <button type="submit" form="resource-form" className="btn-primary" disabled={save.isPending}>{save.isPending ? t('common.loading') : t('common.save')}</button>
        </>}>
        {editing && <ResourceForm id="resource-form" fields={fields} columns={formColumns} defaultValues={editing} onSubmit={(v) => save.mutate(transformOut(v, editing))} />}
      </Modal>
      <ConfirmDialog open={!!deleting} danger onClose={() => setDeleting(null)} message={t('common.confirmDelete')} confirmLabel={t('common.yesDelete')} busy={remove.isPending} onConfirm={() => remove.mutate(deleting)} />
    </div>
  );
}

export const statusColumn = (t) => ({ key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> });
