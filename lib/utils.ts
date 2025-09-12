// lib/utils.ts
export function validateInstagramUrl(url: string): boolean {
  // Strip everything after the question mark (tracking data)
  const cleanUrl = url.split('?')[0];
  const instagramReelPattern = /^https:\/\/(www\.)?instagram\.com\/(reel|p|reels)\/[A-Za-z0-9_-]+\/?$/;
  return instagramReelPattern.test(cleanUrl);
}

export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const hashtagPattern = /#(\w+)/g;
  const matches = text.match(hashtagPattern);
  return matches ? matches.map(tag => tag.slice(1)) : [];
}

export function cleanCaption(caption: string): string {
  if (!caption) return '';
  return caption.trim().replace(/\s+/g, ' ');
}

export function getInstagramIdFromUrl(url: string): string | null {
  const regex = /instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reels|reel|stories)\/([A-Za-z0-9-_]+)/;
  const match = url.match(regex);
  return match && match[2] ? match[2] : null;
}
