import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { api, notifyError } from '../services/api';

// GET helper: useGet(['employees', params], '/employees', params)
export const useGet = (key, url, params, options = {}) => useQuery({
  queryKey: Array.isArray(key) ? key : [key],
  queryFn: async () => (await api.get(url, { params })).data,
  enabled: !!url && (options.enabled ?? true),
  ...options,
});

// Mutation helper with toast + cache invalidation
export const useSend = (method, url, { invalidate = [], success, onSuccess, silent } = {}) => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (payload) => {
      const target = typeof url === 'function' ? url(payload) : url;
      const body = payload?.__body ?? payload;
      return (await api[method](target, method === 'delete' ? undefined : body)).data;
    },
    onSuccess: (data, vars) => {
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] }));
      if (!silent) toast.success(success || t('common.saved'));
      onSuccess?.(data, vars);
    },
    onError: notifyError,
  });
};

// Fetch all rows of a master-data resource for selects
export const useOptions = (url, enabled = true) => useGet(['options', url], url, { all: 'true' }, { enabled, staleTime: 60000 });
