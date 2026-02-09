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

      const info = await ytdl.getInfo(url, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        }
      });

      const avFormats = ytdl.filterFormats(info.formats, 'audioandvideo');
      const avFormat = avFormats.find(f => f.container === 'mp4') || avFormats[0];
      const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
      const format = avFormat || audioFormat;

      if (!format?.url) {
        return null;
      }

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
