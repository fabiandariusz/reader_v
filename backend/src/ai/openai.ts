import OpenAI from 'openai';
import type { AIProvider } from './types';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
    this.model  = model;
  }

  async *stream(system: string, prompt: string): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model:    this.model,
      stream:   true,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: prompt  },
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
  }

  async test(): Promise<void> {
    await this.client.chat.completions.create({
      model:      this.model,
      max_tokens: 1,
      messages:   [{ role: 'user', content: 'hi' }],
    });
  }
}
