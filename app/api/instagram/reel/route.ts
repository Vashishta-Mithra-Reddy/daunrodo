// app/api/instagram/reel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { InstagramScraper } from '@/lib/instagram-scraper';
import { AudioExtractor } from '@/lib/audio-extractor';
import { TranscriptionService } from '@/lib/transcription-service';
import { validateInstagramUrl } from '@/lib/utils';

export interface ReelResponse {
  instagram_url: string;
  caption: string;
  transcript: string;
  metadata: {
    author: string;
    hashtags: string[];
    duration_seconds: number;
    language: string;
    view_count?: number;
    like_count?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    // Validate input
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid url parameter' },
        { status: 400 }
      );
    }

    if (!validateInstagramUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid Instagram Reel URL' },
        { status: 400 }
      );
    }

    // Step 1: Fetch Reel data using working method
    const scraper = new InstagramScraper();
    const reelData = await scraper.fetchReel(url);

    if (!reelData) {
      return NextResponse.json(
        { error: 'Reel not found or inaccessible' },
        { status: 404 }
      );
    }

    let transcript = '';
    let detectedLanguage = 'en';

    // Step 2 & 3: Extract audio and transcribe (only if video URL available)
    if (reelData.videoUrl) {
      try {
        const audioExtractor = new AudioExtractor();
        const audioBuffer = await audioExtractor.extractAudio(reelData.videoUrl);

        const transcriptionService = new TranscriptionService();
        const transcriptionResult = await transcriptionService.transcribe(audioBuffer);
        
        transcript = transcriptionResult.text;
        detectedLanguage = transcriptionResult.language || 'en';
      } catch (audioError) {
        console.warn('Audio processing failed:', audioError);
        transcript = 'Audio transcription unavailable';
      }
    }

    // Step 4: Assemble response
    const response: ReelResponse = {
      instagram_url: url,
      caption: reelData.caption,
      transcript: transcript,
      metadata: {
        author: reelData.author,
        hashtags: reelData.hashtags,
        duration_seconds: reelData.duration,
        language: detectedLanguage,
        view_count: reelData.viewCount,
        like_count: reelData.likeCount,
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

