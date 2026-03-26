import client from './client';

export interface AISettings {
  provider:      'claude' | 'ollama';
  claudeApiKey:  string;
  claudeModel:   string;
  ollamaBaseUrl: string;
  ollamaModel:   string;
}

export const settingsApi = {
  get: () =>
    client.get<AISettings>('/settings').then((r) => r.data),

  update: (payload: Partial<Record<string, string>>) =>
    client.put('/settings', payload).then((r) => r.data),

  test: (payload: Partial<AISettings> & { provider: string }) =>
    client.post<{ ok: boolean; message: string }>('/settings/test', payload).then((r) => r.data),
};
