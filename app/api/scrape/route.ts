import { NextRequest, NextResponse } from 'next/server';
import { ScraperFactory } from '@/lib/scrapers/factory';
import { AudioExtractor } from '@/lib/audio-extractor';
import { TranscriptionService } from '@/lib/transcription-service';
import { getCorsHeaders } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);
  return new NextResponse(null, { status: 200, headers });
}

export async function POST(request: NextRequest) {
  // CORS setup
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return new NextResponse(JSON.stringify({ error: 'Missing or invalid url parameter' }), {
        status: 400,
        headers,
      });
    }

    const factory = new ScraperFactory();
    const scraper = factory.getScraper(url);

    if (!scraper) {
      return new NextResponse(JSON.stringify({ error: 'Unsupported platform or invalid URL' }), {
        status: 400,
        headers,
      });
    }

    const scrapedData = await scraper.scrape(url);

    if (!scrapedData) {
      return new NextResponse(JSON.stringify({ error: 'Content not found or inaccessible' }), {
        status: 404,
        headers,
      });
    }

    let transcript = '';
    let detectedLanguage = 'en';

    if (scrapedData.videoUrl) {
      try {
        const audioExtractor = new AudioExtractor();
        const audioBuffer = await audioExtractor.extractAudio(scrapedData.videoUrl);

        const transcriptionService = new TranscriptionService();
        const transcriptionResult = await transcriptionService.transcribe(audioBuffer);
        
        transcript = transcriptionResult.text;
        detectedLanguage = transcriptionResult.language || 'en';
      } catch (audioError) {
        console.warn('Audio processing failed:', audioError);
        transcript = 'Audio transcription unavailable';
      }
    }

    // Assemble response
    const response = {
      source_url: scrapedData.url,
      platform: scrapedData.platform,
      caption: scrapedData.caption,
      content: scrapedData.content, // Include the new content field
      transcript: transcript,
      videoUrl: scrapedData.videoUrl,
      title: scrapedData.title,
      thumbnailUrl: scrapedData.thumbnailUrl,
      metadata: {
        author: scrapedData.author,
        hashtags: scrapedData.hashtags,
        duration_seconds: scrapedData.duration,
        language: detectedLanguage,
        view_count: scrapedData.viewCount,
        like_count: scrapedData.likeCount,
      }
    };

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers,
    });
  }
}
