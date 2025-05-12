import { ComponentType } from 'react';
import { Track, Playlist, Store } from './index';

export type SearchResultType = 'track' | 'playlist' | 'store';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  icon?: ComponentType<{ className?: string }>;
  data: Track | Playlist | Store;
}

export interface SearchAnalytics {
  query: string;
  resultCount: number;
  duration: number;
  selectedResult?: string;
  timestamp: string;
}

export interface SearchMetrics {
  averageResponseTime: number;
  successRate: number;
  popularQueries: Array<{
    query: string;
    count: number;
  }>;
  failedQueries: Array<{
    query: string;
    error: string;
    count: number;
  }>;
}