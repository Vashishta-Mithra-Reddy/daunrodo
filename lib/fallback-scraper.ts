// lib/fallback-scraper.ts
export class FallbackScraper {
  async fetchReelMetadata(url: string) {
    try {
      // Use Instagram's oEmbed API (limited but free)
      const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(oembedUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch oembed data');
      }

      const data = await response.json();
      
      return {
        author: data.author_name || '',
        caption: data.title || '',
        // Limited data available through oEmbed
      };
    } catch (error) {
      console.error('Fallback scraper error:', error);
      return null;
    }
  }
}