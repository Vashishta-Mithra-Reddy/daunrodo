export interface ScrapedData {
  url: string;
  videoUrl?: string;
  caption?: string;
  author?: string;
  hashtags?: string[];
  duration?: number;
  viewCount?: number;
  likeCount?: number;
  thumbnailUrl?: string;
  title?: string;
  content?: string; // Main text content or Markdown
  platform: 'instagram' | 'youtube' | 'twitter' | 'tiktok' | 'linkedin' | 'other';
}

export interface Scraper {
  canHandle(url: string): boolean;
  scrape(url: string): Promise<ScrapedData | null>;
}
