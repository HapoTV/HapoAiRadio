import Fuse from 'fuse.js';
import { supabase } from '../lib/supabase';
import type { SearchResult } from '../types/search';
import {
  MusicalNoteIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

// Cache for search results
const searchCache = new Map<string, SearchResult[]>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fuse.js options for fuzzy search
const fuseOptions = {
  includeScore: true,
  threshold: 0.3,
  keys: ['title', 'subtitle', 'keywords'],
};

export async function searchItems(query: string): Promise<SearchResult[]> {
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  const cachedResult = searchCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  try {
    // Fetch data from different tables
    const [tracksResponse, playlistsResponse, storesResponse] = await Promise.all([
      supabase
        .from('tracks')
        .select('id, title, artist')
        .textSearch('title', query, { type: 'websearch' })
        .limit(5),
      supabase
        .from('playlists')
        .select('id, name, description')
        .textSearch('name', query, { type: 'websearch' })
        .limit(5),
      supabase
        .from('stores')
        .select('id, name, location')
        .textSearch('name', query, { type: 'websearch' })
        .limit(5),
    ]);

    // Transform results into SearchResult format
    const results: SearchResult[] = [];

    // Add tracks
    if (!tracksResponse.error && tracksResponse.data) {
      results.push(
        ...tracksResponse.data.map((track) => ({
          id: `track-${track.id}`,
          type: 'track',
          title: track.title,
          subtitle: track.artist || 'Unknown Artist',
          icon: MusicalNoteIcon,
          data: track,
        }))
      );
    }

    // Add playlists
    if (!playlistsResponse.error && playlistsResponse.data) {
      results.push(
        ...playlistsResponse.data.map((playlist) => ({
          id: `playlist-${playlist.id}`,
          type: 'playlist',
          title: playlist.name,
          subtitle: playlist.description || 'No description',
          icon: MusicalNoteIcon,
          data: playlist,
        }))
      );
    }

    // Add stores
    if (!storesResponse.error && storesResponse.data) {
      results.push(
        ...storesResponse.data.map((store) => ({
          id: `store-${store.id}`,
          type: 'store',
          title: store.name,
          subtitle: store.location,
          icon: BuildingStorefrontIcon,
          data: store,
        }))
      );
    }

    // Apply fuzzy search using Fuse.js
    const fuse = new Fuse(results, fuseOptions);
    const fuzzyResults = fuse
      .search(query)
      .map((result) => result.item)
      .slice(0, 10); // Limit to top 10 results

    // Cache the results
    searchCache.set(cacheKey, fuzzyResults);
    setTimeout(() => searchCache.delete(cacheKey), CACHE_DURATION);

    return fuzzyResults;
  } catch (error) {
    console.error('Search error:', error);
    throw new Error('Failed to perform search');
  }
}

// Function to clear search cache
export function clearSearchCache() {
  searchCache.clear();
}

// Function to get search suggestions based on popular searches
export async function getSearchSuggestions(query: string): Promise<string[]> {
  // This would typically come from a backend service tracking popular searches
  // For now, we'll return static suggestions
  const commonSearches = [
    'Popular tracks',
    'New releases',
    'Top playlists',
    'Active stores',
    'Recent uploads',
  ];

  return commonSearches.filter((suggestion) =>
    suggestion.toLowerCase().includes(query.toLowerCase())
  );
}

// Analytics tracking function
export function trackSearchAnalytics(query: string, resultCount: number, selectedResult?: SearchResult) {
  // In a real application, this would send analytics data to a backend service
  console.log('Search Analytics:', {
    query,
    resultCount,
    selectedResult: selectedResult?.id,
    timestamp: new Date().toISOString(),
  });
}