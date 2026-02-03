export interface ApiRequest {
  url: string;
}

export interface ApiResponse {
  source_url: string;
  platform: string;
  caption?: string;
  transcript?: string;
  videoUrl?: string;
  title?: string;
  thumbnailUrl?: string;
  metadata: {
    author?: string;
    hashtags?: string[];
    duration_seconds?: number;
    language?: string;
    view_count?: number;
    like_count?: number;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}
