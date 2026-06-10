import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useHistory = () => {
    return useQuery({
        queryKey: ['history'],
        queryFn: async () => {
            const res = await fetch('/api/history');
            if (!res.ok) throw new Error('Failed to fetch history');
            return res.json();
        }
    });
};

export const useSaveSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ activeId, sessions }) => {
            const res = await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active_session: activeId, sessions })
            });
            if (!res.ok) throw new Error('Failed to save session');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['history']);
        }
    });
};

export const useKbDocs = () => {
    return useQuery({
        queryKey: ['kbDocs'],
        queryFn: async () => {
            const res = await fetch('/api/rag/docs');
            if (!res.ok) throw new Error('Failed to fetch kb docs');
            const data = await res.json();
            return data.docs || [];
        }
    });
};

export const useToggleKBDoc = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ filename, active }) => {
            const res = await fetch('/api/rag/docs/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, active })
            });
            if (!res.ok) throw new Error('Failed to toggle kb doc');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['kbDocs']);
        }
    });
};

export const useDeleteKBDoc = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ filename }) => {
            const res = await fetch('/api/rag/docs/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            if (!res.ok) throw new Error('Failed to delete kb doc');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['kbDocs']);
        }
    });
};

export const useModels = () => {
    return useQuery({
        queryKey: ['models'],
        queryFn: async () => {
            const res = await fetch('/v1/models');
            if (!res.ok) throw new Error('Failed to fetch models');
            const data = await res.json();
            return {
                list: data.data || [],
                active: data.active_model || '',
                status: data.status || '',
                is_ready: data.is_ready ?? false,
                logs: data.logs || []
            };
        },
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data && !data.is_ready) {
                return 1000; // poll every 1s when model is loading/busy
            }
            return 5000; // poll every 5s normally
        }
    });
};

export const useChangeModel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ model }) => {
            const res = await fetch('/api/settings/model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model })
            });
            if (!res.ok) throw new Error('Failed to change model');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['models']);
        }
    });
};

export const useSettings = () => {
    return useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/advanced');
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        }
    });
};

export const useSaveSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (settings) => {
            const res = await fetch('/api/settings/advanced', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (!res.ok) throw new Error('Failed to save settings');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['settings']);
        }
    });
};
