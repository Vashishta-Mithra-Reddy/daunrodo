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
  videoUrl: string;
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

    const allowedOrigins = ['http://localhost:5678', 'https://saransha.vercel.app','https://saramsha.vercel.app','https://saramsham.vercel.app'];
    const origin = request.headers.get('origin');
    const headers = new Headers();
    headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (origin && allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
    } else {
      // Fallback for origins not explicitly allowed, or if origin header is missing
      // You might want to handle this more strictly based on your security requirements
      headers.set('Access-Control-Allow-Origin', allowedOrigins[0]); // Default to first allowed origin
    }

    // Validate input
    if (!url || typeof url !== 'string') {
      return new NextResponse(JSON.stringify({ error: 'Missing or invalid url parameter' }), {
        status: 400,
        headers: headers,
      });
    }

    if (!validateInstagramUrl(url)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid Instagram Reel URL' }), {
        status: 400,
        headers: headers,
      });
    }

    // Step 1: Fetch Reel data using working method
    const scraper = new InstagramScraper();
    const reelData = await scraper.fetchReel(url);

    if (!reelData) {
      return new NextResponse(JSON.stringify({ error: 'Reel not found or inaccessible' }), {
        status: 404,
        headers: headers,
      });
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
      videoUrl: reelData.videoUrl, 
      metadata: {
        author: reelData.author,
        hashtags: reelData.hashtags,
        duration_seconds: reelData.duration,
        language: detectedLanguage,
        view_count: reelData.viewCount,
        like_count: reelData.likeCount,
      }
    };

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('API Error:', error);
    const headers = new Headers();
    headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    const allowedOrigins = ['http://localhost:5678', 'https://saransha.vercel.app', 'https://saramsha.vercel.app', 'https://saramsham.vercel.app'];
    const origin = request.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
    } else {
      headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: headers,
    });
  }
}

export async function OPTIONS(request: NextRequest) {
  const allowedOrigins = ['http://localhost:5678', 'https://saransha.vercel.app', 'https://saramsha.vercel.app', 'https://saramsham.vercel.app'];
  const origin = request.headers.get('origin');

  const headers = new Headers();
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else {
    headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  return new NextResponse(null, { status: 204, headers: headers });
}

