import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Helper to get the correct ffmpeg path
const getFfmpegPath = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  
  // 1. Try the path from ffmpeg-static package
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }

  // 2. Try common locations relative to CWD
  const possiblePaths = [
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
    // In case we are in a monorepo or weird structure
    path.join(process.cwd(), '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'), 
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  // 3. If nothing found, return the original static path and hope for the best (or null)
  return ffmpegStatic || null;
};

const ffmpegPath = getFfmpegPath();

// Set the path to the ffmpeg binary
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log(`AudioExtractor: Using ffmpeg at ${ffmpegPath}`);
} else {
  console.error('AudioExtractor: FFmpeg binary not found!');
}

export class AudioExtractor {
  /**
   * Downloads a video, extracts the audio using FFmpeg, and returns the audio data as a Buffer.
   * @param videoUrl The public URL of the video to process.
   * @returns A Promise that resolves to a Buffer containing the MP3 audio data.
   */
  public async extractAudio(videoUrl: string): Promise<Buffer> {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tempVideoPath = path.join(os.tmpdir(), `${uniqueId}.mp4`);
    const tempAudioPath = path.join(os.tmpdir(), `${uniqueId}.mp3`);

    try {
      // Step 1: Download the video to a temporary file
      const response = await fetch(videoUrl);
      if (!response.ok || !response.body) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }
      const videoBuffer = await response.arrayBuffer();
      await fs.writeFile(tempVideoPath, Buffer.from(videoBuffer));

      // Step 2: Run FFmpeg to extract audio
      // We write to a temp file because fluent-ffmpeg is easier to manage with files than streams for this use case
      await this.runFfmpeg(tempVideoPath, tempAudioPath);
      
      // Read the resulting audio file
      const audioBuffer = await fs.readFile(tempAudioPath);
      return audioBuffer;

    } catch (error) {
      console.error('Error during audio extraction:', error);
      throw new Error('Failed to process video and extract audio.');
    } finally {
      // Step 3: Clean up temporary files
      await this.cleanup(tempVideoPath);
      await this.cleanup(tempAudioPath);
    }
  }

  /**
   * Spawns an FFmpeg process to convert a video file to an MP3 audio file.
   */
  private runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Set a timeout to prevent hanging processes
      const timeout = setTimeout(() => {
        reject(new Error('FFmpeg process timed out after 30 seconds'));
      }, 30000);

      ffmpeg(inputPath)
        .noVideo()
        .format('mp3')
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .on('end', () => {
          clearTimeout(timeout);
          resolve();
        })
        .on('error', (err) => {
          clearTimeout(timeout);
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  private async cleanup(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore errors if file doesn't exist
    }
  }
}
