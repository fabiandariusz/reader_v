export interface TranscriptionSegment {
  start: number; // seconds
  end: number;   // seconds
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
}

export interface TranscriptionProvider {
  transcribe(filePath: string): Promise<TranscriptionResult>;
}

export interface TranscriptionSettings {
  provider:         'whisper' | 'assemblyai' | 'openai-whisper';
  whisperModel:     string;
  assemblyaiApiKey: string;
  openaiApiKey:     string;
}
