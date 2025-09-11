// lib/instagram-scraper.ts
import { extractHashtags, cleanCaption, getInstagramIdFromUrl } from './utils';

export interface ReelData {
  videoUrl: string;
  caption: string;
  author: string;
  hashtags: string[];
  duration: number;
  viewCount?: number;
  likeCount?: number;
}

export class InstagramScraper {
  private userAgent: string;
  private xIgAppId: string;

  constructor() {
    // These headers are required for Instagram's API
    this.userAgent = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.xIgAppId = process.env.X_IG_APP_ID || '936619743392459'; // Default IG app ID
  }

  async fetchReel(url: string): Promise<ReelData | null> {
    try {
      // Try GraphQL method first (most reliable)
      const graphqlResult = await this.fetchWithGraphQL(url);
      if (graphqlResult) return graphqlResult;

      // Fallback to magic parameters method
      const magicResult = await this.fetchWithMagicParams(url);
      if (magicResult) return magicResult;

      // Final fallback to oEmbed
      const oembedResult = await this.fetchWithOEmbed(url);
      return oembedResult;

    } catch (error) {
      console.error('Scraping error:', error);
      return null;
    }
  }

  private async fetchWithGraphQL(url: string): Promise<ReelData | null> {
    try {
      const igId = getInstagramIdFromUrl(url);
      if (!igId) return null;

      const graphqlUrl = new URL('https://www.instagram.com/api/graphql');
      graphqlUrl.searchParams.set('variables', JSON.stringify({ shortcode: igId }));
      graphqlUrl.searchParams.set('doc_id', '10015901848480474');
      graphqlUrl.searchParams.set('lsd', 'AVqbxe3J_YA');

      const response = await fetch(graphqlUrl.toString(), {
        method: 'POST',
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-IG-App-ID': this.xIgAppId,
          'X-FB-LSD': 'AVqbxe3J_YA',
          'X-ASBD-ID': '129477',
          'Sec-Fetch-Site': 'same-origin'
        }
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const json = await response.json();
      const items = json?.data?.xdt_shortcode_media;

      if (!items) return null;

      const caption = items?.edge_media_to_caption?.edges[0]?.node?.text || '';
      const author = items?.owner?.username || '';
      const videoUrl = items?.video_url || '';
      const duration = items?.video_duration || 0;
      const viewCount = items?.video_view_count || items?.video_play_count || 0;

      return {
        videoUrl,
        caption: cleanCaption(caption),
        author,
        hashtags: extractHashtags(caption),
        duration: Math.round(duration),
        viewCount,
        likeCount: 0 // Not available in this endpoint
      };

    } catch (error) {
      console.error('GraphQL method failed:', error);
      return null;
    }
  }

  private async fetchWithMagicParams(url: string): Promise<ReelData | null> {
    try {
      const igId = getInstagramIdFromUrl(url);
      if (!igId) return null;

      // This method requires cookies, but we can try without for public posts
      const response = await fetch(`https://www.instagram.com/p/${igId}/?__a=1&__d=dis`, {
        headers: {
          'User-Agent': this.userAgent,
          'X-IG-App-ID': this.xIgAppId,
          'Sec-Fetch-Site': 'same-origin'
        }
      });

      if (!response.ok) {
        throw new Error(`Magic params request failed: ${response.status}`);
      }

      const json = await response.json();
      const items = json?.items?.[0];

      if (!items) return null;

      const caption = items?.caption?.text || '';
      const author = items?.user?.username || '';
      const videoUrl = items?.video_versions?.[0]?.url || '';
      const duration = items?.video_duration || 0;
      const viewCount = items?.view_count || items?.play_count || 0;
      const likeCount = items?.like_count || 0;

      return {
        videoUrl,
        caption: cleanCaption(caption),
        author,
        hashtags: extractHashtags(caption),
        duration: Math.round(duration),
        viewCount,
        likeCount
      };

    } catch (error) {
      console.error('Magic params method failed:', error);
      return null;
    }
  }

  private async fetchWithOEmbed(url: string): Promise<ReelData | null> {
    try {
      const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}`;
      console.log('oembedUrl', oembedUrl);
      const response = await fetch(oembedUrl);

      if (!response.ok) {
        throw new Error(`OEmbed request failed: ${response.status}`);
      }

      const data = await response.json();

      // oEmbed provides limited data
      return {
        videoUrl: '', // Not available in oEmbed
        caption: cleanCaption(data.title || ''),
        author: data.author_name || '',
        hashtags: extractHashtags(data.title || ''),
        duration: 0, // Not available in oEmbed
        viewCount: 0,
        likeCount: 0
      };

    } catch (error) {
      console.error('OEmbed method failed:', error);
      return null;
    }
  }
}

