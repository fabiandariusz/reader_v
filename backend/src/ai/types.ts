export interface AISettings {
  provider:      'claude' | 'ollama';
  claudeApiKey:  string;
  claudeModel:   string;
  ollamaBaseUrl: string;
  ollamaModel:   string;
}

export interface AIProvider {
  /** Async generator that yields text tokens as they stream in */
  stream(system: string, prompt: string): AsyncGenerator<string>;
  /** Quick connectivity / auth check. Throws on failure. */
  test(): Promise<void>;
}
