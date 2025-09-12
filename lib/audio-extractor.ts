// lib/audio-extractor.ts

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export class AudioExtractor {
  /**
   * Downloads a video, extracts the audio using FFmpeg, and returns the audio data as a Buffer.
   * @param videoUrl The public URL of the video to process.
   * @returns A Promise that resolves to a Buffer containing the MP3 audio data.
   */
  public async extractAudio(videoUrl: string): Promise<Buffer> {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tempVideoPath = path.join(os.tmpdir(), `${uniqueId}.mp4`);

    try {
      // Step 1: Download the video to a temporary file
      // console.log(`Downloading video from ${videoUrl}...`);
      const response = await fetch(videoUrl);
      if (!response.ok || !response.body) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }
      const videoBuffer = await response.arrayBuffer();
      await fs.writeFile(tempVideoPath, Buffer.from(videoBuffer));
      // console.log(`Video downloaded to ${tempVideoPath}`);

      // Step 2: Run FFmpeg to extract audio and pipe the output to stdout
      const audioBuffer = await this.runFfmpeg(tempVideoPath);
      // console.log(`Audio extracted successfully. Buffer size: ${audioBuffer.length} bytes.`);
      
      return audioBuffer;

    } catch (error) {
      console.error('Error during audio extraction:', error);
      // Re-throw the error to be caught by the API route's error handler
      throw new Error('Failed to process video and extract audio.');
    } finally {
      // Step 3: Clean up the temporary video file
      try {
        await fs.unlink(tempVideoPath);
        // console.log(`Cleaned up temporary video file: ${tempVideoPath}`);
      } catch (cleanupError) {
        // Log cleanup error but don't let it hide the main error
        console.warn(`Failed to clean up temporary file ${tempVideoPath}:`, cleanupError);
      }
    }
  }

  /**
   * Spawns an FFmpeg process to convert a video file to an MP3 audio Buffer.
   * @param inputPath The local file system path to the input video.
   * @returns A Promise that resolves to a Buffer of the MP3 audio.
   */
  private runFfmpeg(inputPath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-i', inputPath,        // Input file
        '-vn',                  // No video
        '-f', 'mp3',            // Output format is MP3
        '-acodec', 'libmp3lame', // Use LAME MP3 encoder
        '-ab', '192k',           // Audio bitrate of 192kbps
        'pipe:1',               // Output to stdout (standard output)
      ];

      const ffmpeg = spawn('ffmpeg', ffmpegArgs);

      const audioChunks: Buffer[] = [];
      
      // Listen to the data from stdout
      ffmpeg.stdout.on('data', (chunk: Buffer) => {
        audioChunks.push(chunk);
      });

      // Log any errors from stderr
      ffmpeg.stderr.on('data', (data: Buffer) => {
        console.error(`ffmpeg stderr: ${data.toString()}`);
      });

      // Handle process exit
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          // Success! Concatenate all chunks into a single Buffer.
          const completeAudioBuffer = Buffer.concat(audioChunks);
          resolve(completeAudioBuffer);
        } else {
          // Failure
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      // Handle spawn error
      ffmpeg.on('error', (err) => {
        reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
      });
    });
  }
}