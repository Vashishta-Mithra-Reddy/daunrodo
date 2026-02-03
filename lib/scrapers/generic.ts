import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import path from 'path';
import { Scraper, ScrapedData } from './types';

export class GenericScraper implements Scraper {
  canHandle(url: string): boolean {
    // This is a catch-all scraper, so it handles everything that is a valid URL
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<ScrapedData | null> {
    try {
      // 1. Check if the URL itself looks like a video file
      const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.mkv'];
      const urlPath = new URL(url).pathname.toLowerCase();
      if (videoExtensions.some(ext => urlPath.endsWith(ext))) {
        console.log('Detected direct video URL:', url);
        return {
          url: url,
          platform: 'other',
          title: path.basename(urlPath),
          videoUrl: url,
          content: 'Direct video file',
        };
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
      });

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      
      // 2. Check Content-Type header
      if (contentType.startsWith('video/') || contentType.startsWith('application/octet-stream')) {
         console.log('Detected video content-type:', contentType);
         return {
            url: url,
            platform: 'other',
            title: 'Video File',
            videoUrl: url,
            content: 'Direct video file',
         };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $('script, style, nav, footer, header, aside, iframe, noscript, .ad, .ads, .advertisement').remove();

      // Extract metadata
      const title = $('meta[property="og:title"]').attr('content') || 
                    $('meta[name="twitter:title"]').attr('content') || 
                    $('title').text() || 
                    $('h1').first().text();

      const description = $('meta[property="og:description"]').attr('content') || 
                          $('meta[name="twitter:description"]').attr('content') || 
                          $('meta[name="description"]').attr('content');

      const image = $('meta[property="og:image"]').attr('content') || 
                    $('meta[name="twitter:image"]').attr('content') ||
                    $('link[rel="image_src"]').attr('href');

      const video = $('meta[property="og:video"]').attr('content') || 
                    $('meta[property="og:video:url"]').attr('content') ||
                    $('meta[property="og:video:secure_url"]').attr('content') ||
                    $('meta[name="twitter:player:stream"]').attr('content') ||
                    $('video source').attr('src') ||
                    $('video').attr('src');

      const author = $('meta[property="og:site_name"]').attr('content') || 
                     $('meta[name="author"]').attr('content') ||
                     new URL(url).hostname;
      
      const keywords = $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || [];

      // Extract Main Content
      // Try to find the main content area
      let contentHtml = '';
      const contentSelectors = ['article', 'main', '.post-content', '.entry-content', '#content', '.content'];
      
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          contentHtml = element.html() || '';
          break;
        }
      }

      // Fallback: If no main content found, use body
      if (!contentHtml) {
        contentHtml = $('body').html() || '';
      }

      // Convert to Markdown
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
      });
      const markdown = turndownService.turndown(contentHtml);

      // Try to determine platform
      let platform: ScrapedData['platform'] = 'other';
      const hostname = new URL(url).hostname;
      if (hostname.includes('tiktok')) platform = 'tiktok';
      else if (hostname.includes('twitter') || hostname.includes('x.com')) platform = 'twitter';
      else if (hostname.includes('linkedin')) platform = 'linkedin';
      
      return {
        url: url,
        platform: platform,
        title: title?.trim(),
        caption: description?.trim(),
        content: markdown, // Added full content
        videoUrl: video,
        thumbnailUrl: image,
        author: author?.trim(),
        hashtags: keywords,
      };

    } catch (error) {
      console.error('Generic scraping error:', error);
      return null;
    }
  }
}
