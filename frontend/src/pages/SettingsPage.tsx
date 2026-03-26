import { useState, useEffect } from 'react';
import { settingsApi, type AISettings } from '@/api/settings';
import { useSettings } from '@/hooks/useSettings';

export default function SettingsPage() {
  const { settings, loading, error: loadError, save } = useSettings();

  const [form, setForm] = useState<Partial<AISettings>>({});
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (settings) {
      setForm({
        provider:      settings.provider,
        claudeModel:   settings.claudeModel,
        ollamaBaseUrl: settings.ollamaBaseUrl,
        ollamaModel:   settings.ollamaModel,
      });
    }
  }, [settings]);

  const set = (key: keyof AISettings, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const payload: Record<string, string> = {
        ai_provider:    form.provider      ?? 'claude',
        claude_model:   form.claudeModel   ?? 'claude-opus-4-6',
        ollama_base_url:form.ollamaBaseUrl ?? 'http://localhost:11434',
        ollama_model:   form.ollamaModel   ?? 'llama3.2',
      };
      // Only update key if user typed a new one (not the masked placeholder)
      if (apiKeyInput && !apiKeyInput.startsWith('•')) {
        payload.claude_api_key = apiKeyInput;
      }
      await save(payload);
      setSaveMsg('Settings saved.');
      setApiKeyInput('');
    } catch {
      setSaveMsg('Failed to save settings.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestMsg(null);
    try {
      const apiKey = (apiKeyInput && !apiKeyInput.startsWith('•'))
        ? apiKeyInput
        : settings?.claudeApiKey ?? '';

      const result = await settingsApi.test({
        provider:      form.provider ?? 'claude',
        claudeApiKey:  apiKey,
        claudeModel:   form.claudeModel,
        ollamaBaseUrl: form.ollamaBaseUrl,
        ollamaModel:   form.ollamaModel,
      });
      setTestMsg({ ok: result.ok, text: result.message });
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'Connection failed.';
      setTestMsg({ ok: false, text: msg });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="settings-page"><div className="spinner spinner--center" /></div>;

  return (
    <div className="settings-page">
      <div className="settings-card">
        <h1 className="settings-title">AI Settings</h1>
        {loadError && <div className="error-banner">{loadError}</div>}

        {/* Provider selector */}
        <div className="settings-section">
          <div className="settings-section__label">AI Provider</div>
          <div className="provider-toggle">
            {(['claude', 'ollama'] as const).map((p) => (
              <button
                key={p}
                className={`provider-btn${form.provider === p ? ' provider-btn--active' : ''}`}
                onClick={() => { set('provider', p); setTestMsg(null); }}
              >
                {p === 'claude' ? '◆ Claude (Anthropic)' : '⬡ Ollama (Local)'}
              </button>
            ))}
          </div>
        </div>

        {/* Claude settings */}
        {form.provider === 'claude' && (
          <div className="settings-section">
            <div className="settings-section__label">Claude Configuration</div>
            <div className="form-group">
              <label className="form-label" htmlFor="claude-key">API Key</label>
              <input
                id="claude-key"
                className="form-input"
                type="password"
                placeholder={settings?.claudeApiKey || 'sk-ant-api…'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                autoComplete="off"
              />
              <span className="settings-hint">
                Get your key at{' '}
                <span className="settings-link">console.anthropic.com</span>
              </span>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="claude-model">Model</label>
              <select
                id="claude-model"
                className="form-input"
                value={form.claudeModel ?? 'claude-opus-4-6'}
                onChange={(e) => set('claudeModel', e.target.value)}
              >
                <option value="claude-opus-4-6">Claude Opus 4.6 (recommended)</option>
                <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                <option value="claude-haiku-4-5">Claude Haiku 4.5 (fastest)</option>
              </select>
            </div>
          </div>
        )}

        {/* Ollama settings */}
        {form.provider === 'ollama' && (
          <div className="settings-section">
            <div className="settings-section__label">Ollama Configuration</div>
            <div className="form-group">
              <label className="form-label" htmlFor="ollama-url">Base URL</label>
              <input
                id="ollama-url"
                className="form-input"
                type="text"
                value={form.ollamaBaseUrl ?? 'http://localhost:11434'}
                onChange={(e) => set('ollamaBaseUrl', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ollama-model">Model</label>
              <input
                id="ollama-model"
                className="form-input"
                type="text"
                placeholder="llama3.2"
                value={form.ollamaModel ?? ''}
                onChange={(e) => set('ollamaModel', e.target.value)}
              />
              <span className="settings-hint">
                Pull a model first: <code>ollama pull llama3.2</code>
              </span>
            </div>
          </div>
        )}

        {/* Test result */}
        {testMsg && (
          <div className={testMsg.ok ? 'settings-ok' : 'error-banner'}>
            {testMsg.text}
          </div>
        )}

        {/* Actions */}
        <div className="settings-actions">
          <button
            className="btn btn--secondary"
            onClick={handleTest}
            disabled={testing || saving}
          >
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          <div className="settings-actions__right">
            {saveMsg && <span className="settings-save-msg">{saveMsg}</span>}
            <button
              className="btn btn--primary"
              onClick={handleSave}
              disabled={saving || testing}
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
