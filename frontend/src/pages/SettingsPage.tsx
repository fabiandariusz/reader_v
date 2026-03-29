import { useState, useEffect } from 'react';
import { settingsApi, type AISettings } from '@/api/settings';
import { useSettings } from '@/hooks/useSettings';

const PROVIDERS: { id: AISettings['provider']; label: string }[] = [
  { id: 'claude',  label: '◆ Claude (Anthropic)' },
  { id: 'openai',  label: '⬡ OpenAI'             },
  { id: 'gemini',  label: '✦ Gemini (Google)'     },
  { id: 'ollama',  label: '⬡ Ollama (Local)'      },
];

export default function SettingsPage() {
  const { settings, loading, error: loadError, save } = useSettings();

  const [form, setForm]                   = useState<Partial<AISettings>>({});
  const [claudeKeyInput,  setClaudeKey]   = useState('');
  const [openaiKeyInput,  setOpenaiKey]   = useState('');
  const [geminiKeyInput,  setGeminiKey]   = useState('');
  const [assemblyKeyInput, setAssemblyKey] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (settings) {
      setForm({
        provider:              settings.provider,
        claudeModel:           settings.claudeModel,
        ollamaBaseUrl:         settings.ollamaBaseUrl,
        ollamaModel:           settings.ollamaModel,
        openaiModel:           settings.openaiModel,
        geminiModel:           settings.geminiModel,
        transcriptionProvider: settings.transcriptionProvider,
        whisperModel:          settings.whisperModel,
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
        ai_provider:            form.provider              ?? 'claude',
        claude_model:           form.claudeModel           ?? 'claude-opus-4-6',
        ollama_base_url:        form.ollamaBaseUrl         ?? 'http://localhost:11434',
        ollama_model:           form.ollamaModel           ?? 'llama3.2',
        openai_model:           form.openaiModel           ?? 'gpt-4o',
        gemini_model:           form.geminiModel           ?? 'gemini-2.0-flash',
        transcription_provider: form.transcriptionProvider ?? 'whisper',
        whisper_model:          form.whisperModel          ?? 'base',
      };
      if (claudeKeyInput  && !claudeKeyInput.startsWith('•'))  payload.claude_api_key  = claudeKeyInput;
      if (openaiKeyInput  && !openaiKeyInput.startsWith('•'))  payload.openai_api_key  = openaiKeyInput;
      if (geminiKeyInput  && !geminiKeyInput.startsWith('•'))  payload.gemini_api_key  = geminiKeyInput;
      if (assemblyKeyInput && !assemblyKeyInput.startsWith('•')) payload.assemblyai_api_key = assemblyKeyInput;

      await save(payload);
      setSaveMsg('Settings saved.');
      setClaudeKey('');
      setOpenaiKey('');
      setGeminiKey('');
      setAssemblyKey('');
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
      const provider = form.provider ?? 'claude';
      const result = await settingsApi.test({
        provider,
        claudeApiKey:  (claudeKeyInput && !claudeKeyInput.startsWith('•'))   ? claudeKeyInput  : settings?.claudeApiKey,
        claudeModel:   form.claudeModel,
        ollamaBaseUrl: form.ollamaBaseUrl,
        ollamaModel:   form.ollamaModel,
        openaiApiKey:  (openaiKeyInput && !openaiKeyInput.startsWith('•'))   ? openaiKeyInput  : settings?.openaiApiKey,
        openaiModel:   form.openaiModel,
        geminiApiKey:  (geminiKeyInput && !geminiKeyInput.startsWith('•'))   ? geminiKeyInput  : settings?.geminiApiKey,
        geminiModel:   form.geminiModel,
      });
      setTestMsg({ ok: result.ok, text: result.message });
    } catch (err: unknown) {
      setTestMsg({ ok: false, text: (err as { message?: string }).message ?? 'Connection failed.' });
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
            {PROVIDERS.map(({ id, label }) => (
              <button
                key={id}
                className={`provider-btn${form.provider === id ? ' provider-btn--active' : ''}`}
                onClick={() => { set('provider', id); setTestMsg(null); }}
              >
                {label}
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
                value={claudeKeyInput}
                onChange={(e) => setClaudeKey(e.target.value)}
                autoComplete="off"
              />
              <span className="settings-hint">Get your key at <span className="settings-link">console.anthropic.com</span></span>
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

        {/* OpenAI settings */}
        {form.provider === 'openai' && (
          <div className="settings-section">
            <div className="settings-section__label">OpenAI Configuration</div>
            <div className="form-group">
              <label className="form-label" htmlFor="openai-key">API Key</label>
              <input
                id="openai-key"
                className="form-input"
                type="password"
                placeholder={settings?.openaiApiKey || 'sk-…'}
                value={openaiKeyInput}
                onChange={(e) => setOpenaiKey(e.target.value)}
                autoComplete="off"
              />
              <span className="settings-hint">Get your key at <span className="settings-link">platform.openai.com</span></span>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="openai-model">Model</label>
              <input
                id="openai-model"
                className="form-input"
                type="text"
                placeholder="gpt-4o"
                value={form.openaiModel ?? ''}
                onChange={(e) => set('openaiModel', e.target.value)}
              />
              <span className="settings-hint">e.g. gpt-4o, gpt-4o-mini, o3, o4-mini</span>
            </div>
          </div>
        )}

        {/* Gemini settings */}
        {form.provider === 'gemini' && (
          <div className="settings-section">
            <div className="settings-section__label">Gemini Configuration</div>
            <div className="form-group">
              <label className="form-label" htmlFor="gemini-key">API Key</label>
              <input
                id="gemini-key"
                className="form-input"
                type="password"
                placeholder={settings?.geminiApiKey || 'AIza…'}
                value={geminiKeyInput}
                onChange={(e) => setGeminiKey(e.target.value)}
                autoComplete="off"
              />
              <span className="settings-hint">Get your key at <span className="settings-link">aistudio.google.com</span></span>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gemini-model">Model</label>
              <input
                id="gemini-model"
                className="form-input"
                type="text"
                placeholder="gemini-2.0-flash"
                value={form.geminiModel ?? ''}
                onChange={(e) => set('geminiModel', e.target.value)}
              />
              <span className="settings-hint">e.g. gemini-2.0-flash, gemini-2.5-pro, gemini-1.5-flash</span>
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
              <span className="settings-hint">Pull a model first: <code>ollama pull llama3.2</code></span>
            </div>
          </div>
        )}

        {/* Transcription settings */}
        <div className="settings-section">
          <div className="settings-section__label">Transcription Provider</div>
          <div className="provider-toggle">
            <button
              className={`provider-btn${form.transcriptionProvider === 'whisper' ? ' provider-btn--active' : ''}`}
              onClick={() => set('transcriptionProvider', 'whisper')}
            >
              🎙 Whisper (Local)
            </button>
            <button
              className={`provider-btn${form.transcriptionProvider === 'openai-whisper' ? ' provider-btn--active' : ''}`}
              onClick={() => set('transcriptionProvider', 'openai-whisper')}
            >
              ⬡ OpenAI Whisper (Cloud)
            </button>
            <button
              className={`provider-btn${form.transcriptionProvider === 'assemblyai' ? ' provider-btn--active' : ''}`}
              onClick={() => set('transcriptionProvider', 'assemblyai')}
            >
              ☁ AssemblyAI (Cloud)
            </button>
          </div>
        </div>

        {form.transcriptionProvider === 'whisper' && (
          <div className="settings-section">
            <div className="settings-section__label">Whisper Configuration</div>
            <div className="form-group">
              <label className="form-label" htmlFor="whisper-model">Model</label>
              <select
                id="whisper-model"
                className="form-input"
                value={form.whisperModel ?? 'base'}
                onChange={(e) => set('whisperModel', e.target.value)}
              >
                <option value="tiny">tiny (fastest, least accurate)</option>
                <option value="base">base (recommended)</option>
                <option value="small">small</option>
                <option value="medium">medium</option>
                <option value="large">large (slowest, most accurate)</option>
              </select>
              <span className="settings-hint">Requires Python 3.8–3.11 + <code>pip install openai-whisper</code></span>
            </div>
          </div>
        )}

        {form.transcriptionProvider === 'openai-whisper' && (
          <div className="settings-section">
            <div className="settings-section__label">OpenAI Whisper Configuration</div>
            <div className="form-group">
              <span className="settings-hint">
                Uses the <strong>OpenAI API key</strong> configured above under AI Provider → OpenAI.
                Model: <code>whisper-1</code>. No local Python required.
              </span>
            </div>
          </div>
        )}

        {form.transcriptionProvider === 'assemblyai' && (
          <div className="settings-section">
            <div className="settings-section__label">AssemblyAI Configuration</div>
            <div className="form-group">
              <label className="form-label" htmlFor="assemblyai-key">API Key</label>
              <input
                id="assemblyai-key"
                className="form-input"
                type="password"
                placeholder={settings?.assemblyaiApiKey || 'Enter AssemblyAI API key…'}
                value={assemblyKeyInput}
                onChange={(e) => setAssemblyKey(e.target.value)}
                autoComplete="off"
              />
              <span className="settings-hint">Get your key at <span className="settings-link">assemblyai.com</span></span>
            </div>
          </div>
        )}

        {/* Test result */}
        {testMsg && (
          <div className={testMsg.ok ? 'settings-ok' : 'error-banner'}>{testMsg.text}</div>
        )}

        {/* Actions */}
        <div className="settings-actions">
          <button className="btn btn--secondary" onClick={handleTest} disabled={testing || saving}>
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          <div className="settings-actions__right">
            {saveMsg && <span className="settings-save-msg">{saveMsg}</span>}
            <button className="btn btn--primary" onClick={handleSave} disabled={saving || testing}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
