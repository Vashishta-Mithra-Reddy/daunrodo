// types/api.ts
export interface ApiRequest {
  url: string;
}

export interface ApiResponse {
  instagram_url: string;
  caption: string;
  transcript: string;
  metadata: {
    author: string;
    hashtags: string[];
    duration_seconds: number;
    language: string;
    view_count?: number;
    like_count?: number;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}
