// lib/transcription-service.ts
export interface TranscriptionResult {
  text: string;
  language?: string;
}

export class TranscriptionService {
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
  }

  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const formData = new FormData();
      const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mp3' });
      
      formData.append('file', audioFile);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // Auto-detect or specify

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        text: result.text || '',
        language: result.language || 'en'
      };

    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error}`);
    }
  }

  // Alternative: Free local transcription using Web Speech API (client-side only)
  async transcribeLocal(audioBuffer: Buffer): Promise<TranscriptionResult> {
    // This would require client-side implementation
    // For server-side, you'd need to implement Whisper.cpp or similar
    throw new Error('Local transcription not implemented for server-side');
  }
}