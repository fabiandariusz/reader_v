import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from './types';

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-opus-4-6') {
    this.client = new Anthropic({ apiKey });
    this.model  = model;
  }

  async *stream(system: string, prompt: string): AsyncGenerator<string> {
    const stream = this.client.messages.stream({
      model:      this.model,
      max_tokens: 64000,
      thinking:   { type: 'adaptive' },
      system,
      messages:   [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }

  async test(): Promise<void> {
    // Minimal call to verify key and connectivity
    await this.client.messages.create({
      model:      this.model,
      max_tokens: 1,
      messages:   [{ role: 'user', content: 'hi' }],
    });
  }
}
