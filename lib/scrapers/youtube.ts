import ytdl from '@distube/ytdl-core';
import { Scraper, ScrapedData } from './types';

export class YoutubeScraper implements Scraper {
  canHandle(url: string): boolean {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return pattern.test(url);
  }

  async scrape(url: string): Promise<ScrapedData | null> {
    try {
      if (!ytdl.validateURL(url)) {
        return null;
      }

      const info = await ytdl.getInfo(url);
      
      // Get best format with audio and video if possible
      // prioritize mp4 for compatibility
      const formats = ytdl.filterFormats(info.formats, 'audioandvideo');
      const format = formats.find(f => f.container === 'mp4') || formats[0] || ytdl.chooseFormat(info.formats, { quality: 'highest' });
      
      return {
        url: url,
        videoUrl: format.url,
        title: info.videoDetails.title,
        caption: info.videoDetails.description || '',
        author: info.videoDetails.author.name,
        duration: parseInt(info.videoDetails.lengthSeconds),
        viewCount: parseInt(info.videoDetails.viewCount),
        thumbnailUrl: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url,
        platform: 'youtube',
        hashtags: info.videoDetails.keywords || []
      };
    } catch (error) {
      console.error('YouTube scraping error:', error);
      return null;
    }
  }
}
