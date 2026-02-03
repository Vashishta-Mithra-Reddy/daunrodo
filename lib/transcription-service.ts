// lib/transcription-service.ts
export interface TranscriptionResult {
  text: string;
  language?: string;
}

export class TranscriptionService {
  private openaiApiKey: string;
  private maxRetries = 3;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
  }

  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.performTranscription(audioBuffer);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Transcription attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          // Exponential backoff: 1000ms, 2000ms, etc.
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    console.error('All transcription attempts failed:', lastError);
    throw new Error(`Failed to transcribe audio after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  private async performTranscription(audioBuffer: Buffer): Promise<TranscriptionResult> {
    const formData = new FormData();
    
    // Explicitly convert the Node.js Buffer to a Uint8Array.
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mp3' });
    formData.append('file', audioBlob, 'audio.mp3');
    
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    // formData.append('language', 'en'); // Allow auto-detect by not enforcing 'en' unless needed

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      // If 429 (Rate Limit) or 5xx (Server Error), these are good candidates for retry.
      // 400 or 401 might not be recoverable, but we'll retry all for simplicity unless specific handling is added.
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    
    return {
      text: result.text || '',
      language: result.language || 'en' // Whisper usually returns 'language' in verbose_json mode, but 'json' mode just returns text. 
      // To get language, we might need response_format='verbose_json'. 
      // The previous code assumed result.language exists. Default response is json with just text.
    };
  }
}
