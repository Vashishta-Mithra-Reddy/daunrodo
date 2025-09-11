// lib/audio-extractor.ts
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

export class AudioExtractor {
  async extractAudio(videoUrl: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const audioChunks: Buffer[] = [];
      
      ffmpeg(videoUrl)
        .audioCodec('libmp3lame')
        .format('mp3')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('error', (error) => {
          console.error('FFmpeg error:', error);
          reject(error);
        })
        .pipe()
        .on('data', (chunk: Buffer) => {
          audioChunks.push(chunk);
        })
        .on('end', () => {
          const audioBuffer = Buffer.concat(audioChunks);
          resolve(audioBuffer);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  // Alternative method using fetch for smaller files
  async extractAudioSimple(videoUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }
      
      const videoBuffer = Buffer.from(await response.arrayBuffer());
      
      // For simple implementation, you might want to use a service
      // that accepts video buffer directly for transcription
      return videoBuffer;
    } catch (error) {
      throw new Error(`Failed to extract audio: ${error}`);
    }
  }
}
