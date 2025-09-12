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
      
      // FIX: The original code used `new File([audioBuffer], ...)` which causes a type error.
      // This is because the Web API's `File` constructor isn't directly compatible
      // with the Node.js `Buffer` type.
      // The correct approach is to first create a `Blob` from the buffer and then
      // use the `FormData.append()` method that accepts a Blob and a filename.
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
      formData.append('file', audioBlob, 'audio.mp3');
      
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
        // Provide more detailed error info from the API response
        const errorBody = await response.text();
        throw new Error(`OpenAI API error: ${response.statusText} - ${errorBody}`);
      }

      const result = await response.json();
      
      return {
        text: result.text || '',
        language: result.language || 'en'
      };

    } catch (error) {
      console.error('Transcription error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to transcribe audio: ${errorMessage}`);
    }
  }

  // Alternative: Free local transcription using Web Speech API (client-side only)
  async transcribeLocal(audioBuffer: Buffer): Promise<TranscriptionResult> {
    // This would require client-side implementation
    // For server-side, you'd need to implement Whisper.cpp or similar
    throw new Error('Local transcription not implemented for server-side');
  }
}