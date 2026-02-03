import { Scraper } from './types';
import { InstagramScraper } from './instagram';
import { YoutubeScraper } from './youtube';
import { GenericScraper } from './generic';

export class ScraperFactory {
  private scrapers: Scraper[];

  constructor() {
    this.scrapers = [
      new InstagramScraper(),
      new YoutubeScraper(),
      new GenericScraper()
    ];
  }

  getScraper(url: string): Scraper | null {
    return this.scrapers.find(scraper => scraper.canHandle(url)) || null;
  }
}
