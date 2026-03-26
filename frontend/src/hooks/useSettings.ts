import { useState, useEffect, useCallback } from 'react';
import { settingsApi, type AISettings } from '@/api/settings';

export function useSettings() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await settingsApi.get();
      setSettings(data);
    } catch {
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (payload: Partial<Record<string, string>>) => {
    await settingsApi.update(payload);
    await load();
  }, [load]);

  return { settings, loading, error, reload: load, save };
}
