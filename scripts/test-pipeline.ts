
import fs from 'fs';
import path from 'path';
import { ScraperFactory } from '../lib/scrapers/factory';
import { AudioExtractor } from '../lib/audio-extractor';
import { TranscriptionService } from '../lib/transcription-service';

// Simple .env loader
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    console.log('Looking for .env at:', envPath);
    
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf-8');
      // Strip BOM if present
      if (envContent.charCodeAt(0) === 0xFEFF) {
        envContent = envContent.slice(1);
        console.log('Detected and removed BOM from .env file');
      }
      
      console.log('Found .env file. Parsing...');
      
      let loadedCount = 0;
      // Handle different line endings (Windows \r\n, Unix \n, Mac \r)
      const lines = envContent.split(/\r?\n|\r/);
      
      lines.forEach((line, index) => {
        if (!line.trim() || line.startsWith('#')) return; // Skip empty lines and comments

        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          
          // Remove surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          process.env[key] = value;
          loadedCount++;
          console.log(`[Line ${index + 1}] Loaded key: ${key}`);
        } else {
          console.log(`[Line ${index + 1}] Failed to parse: "${line}"`);
        }
      });
      console.log(`Loaded ${loadedCount} environment variables from .env`);
      
      if (process.env.OPENAI_API_KEY) {
        console.log('✅ OPENAI_API_KEY is set.');
      } else {
        console.error('❌ OPENAI_API_KEY is MISSING after parsing.');
      }
    } else {
      console.warn('Warning: .env file not found at', envPath);
      console.log('Current directory contents:', fs.readdirSync(process.cwd()));
    }
  } catch (error) {
    console.error('Error loading .env:', error);
  }
}

async function runTest(url: string) {
  loadEnv();

  console.log(`\n--- Starting Test Pipeline for URL: ${url} ---\n`);

  // 1. Scrape
  console.log('1. Testing Scraper...');
  const factory = new ScraperFactory();
  const scraper = factory.getScraper(url);
  
  if (!scraper) {
    console.error('❌ No suitable scraper found for this URL.');
    return;
  }
  
  if (!scraper.canHandle(url)) {
    console.error('❌ Scraper factory returned a scraper that claims it cannot handle this URL (Unexpected).');
    return;
  }

  const scrapedData = await scraper.scrape(url);
  
  if (!scrapedData) {
    console.error('❌ Scraping failed. No data returned.');
    return;
  }
  console.log('✅ Scraping successful!');
  console.log('   Platform:', scrapedData.platform);
  console.log('   Title:', (scrapedData.title || scrapedData.caption)?.substring(0, 50) + '...');
  console.log('   Author:', scrapedData.author);
  console.log('   Video URL:', scrapedData.videoUrl ? 'Found' : 'Not Found');
  if (scrapedData.videoUrl) {
    console.log('   Video URL Preview:', scrapedData.videoUrl.substring(0, 100) + '...');
  }

  if (!scrapedData.videoUrl) {
    console.log('⚠️ No video URL found, skipping audio/transcription test.');
    return;
  }

  // 2. Audio Extraction
  console.log('\n2. Testing Audio Extraction...');
  const audioExtractor = new AudioExtractor();
  let audioBuffer: Buffer;
  
  try {
    const startTime = Date.now();
    audioBuffer = await audioExtractor.extractAudio(scrapedData.videoUrl);
    const duration = Date.now() - startTime;
    console.log(`✅ Audio extracted successfully! (${(audioBuffer.length / 1024).toFixed(2)} KB in ${duration}ms)`);
  } catch (error) {
    console.error('❌ Audio extraction failed:', error);
    return;
  }

  // 3. Transcription
  console.log('\n3. Testing Transcription...');
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY not found in environment. Skipping transcription.');
    return;
  }

  const transcriptionService = new TranscriptionService();
  
  try {
    const startTime = Date.now();
    const result = await transcriptionService.transcribe(audioBuffer);
    const duration = Date.now() - startTime;
    console.log(`✅ Transcription successful! (${duration}ms)`);
    console.log('   Language:', result.language);
    console.log('   Transcript:', result.text);
  } catch (error) {
    console.error('❌ Transcription failed:', error);
  }
  
  console.log('\n--- Test Complete ---');
}

// Get URL from command line args
const url = process.argv[2];

if (!url) {
  console.log('Usage: npx tsx scripts/test-pipeline.ts <instagram-reel-url>');
  console.log('Example: npx tsx scripts/test-pipeline.ts https://www.instagram.com/reel/C-xyz123/');
} else {
  runTest(url);
}
