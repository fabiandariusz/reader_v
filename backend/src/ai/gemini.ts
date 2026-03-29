import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider } from './types';

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model = 'gemini-2.0-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async *stream(system: string, prompt: string): AsyncGenerator<string> {
    const model  = this.genAI.getGenerativeModel({ model: this.model, systemInstruction: system });
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }

  async test(): Promise<void> {
    const model = this.genAI.getGenerativeModel({ model: this.model });
    await model.generateContent('hi');
  }
}
