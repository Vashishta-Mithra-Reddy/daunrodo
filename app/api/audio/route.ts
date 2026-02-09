import { NextRequest, NextResponse } from 'next/server';
import { ScraperFactory } from '@/lib/scrapers/factory';
import { AudioExtractor } from '@/lib/audio-extractor';
import { getCorsHeaders } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);
  return new NextResponse(null, { status: 200, headers });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);

  let body: { url?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers
    });
  }

  const url = body?.url;

  if (!url || typeof url !== 'string') {
    return new NextResponse(JSON.stringify({ error: 'Missing or invalid url parameter' }), {
      status: 400,
      headers
    });
  }

  const factory = new ScraperFactory();
  const scraper = factory.getScraper(url);

  if (!scraper) {
    return new NextResponse(JSON.stringify({ error: 'Unsupported platform or invalid URL' }), {
      status: 400,
      headers
    });
  }

  const scrapedData = await scraper.scrape(url);

  if (!scrapedData) {
    return new NextResponse(JSON.stringify({ error: 'Content not found or inaccessible' }), {
      status: 404,
      headers
    });
  }

  if (!scrapedData.videoUrl) {
    return new NextResponse(JSON.stringify({ error: 'No audio source found for this URL' }), {
      status: 422,
      headers
    });
  }

  let audioBuffer: Buffer;

  try {
    const audioExtractor = new AudioExtractor();
    audioBuffer = await audioExtractor.extractAudio(scrapedData.videoUrl);
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: 'Failed to extract audio' }), {
      status: 500,
      headers
    });
  }

  const baseName = (scrapedData.title || 'audio')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const fileName = baseName ? `${baseName}.mp3` : 'audio.mp3';

  headers.set('Content-Type', 'audio/mpeg');
  headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

  return new NextResponse(new Uint8Array(audioBuffer), {
    status: 200,
    headers
  });
}
