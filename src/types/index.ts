export interface Store {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  created_at: string;
  payment_status: 'active' | 'suspended' | 'inactive';
  latitude?: number;
  longitude?: number;
  place_id?: string;
  formatted_address?: string;
  ip_address?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  is_private?: boolean;
  created_at: string;
  updated_at: string;
  store_id?: string;
}

export interface Track {
  id: string;
  title: string;
  artist?: string;
  album_artist?: string;
  duration: number;
  file_url: string;
  genre?: string;
  release_year?: number;
  created_at: string;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  position: number;
  created_at: string;
}

export interface Schedule {
  id: string;
  playlist_id: string;
  store_id: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface TrackPlay {
  id: string;
  track_id: string;
  store_id: string;
  playlist_id?: string;
  played_at: string;
  created_at: string;
}

export interface StoreAnalytics {
  store_id: string;
  total_plays: number;
  unique_tracks: number;
  peak_hours: number[];
  popular_genres: { genre: string; count: number }[];
  updated_at: string;
}

export interface PlaylistAnalytics {
  playlist_id: string;
  total_plays: number;
  avg_completion_rate: number;
  skip_rate: number;
  genre_distribution: Record<string, number>;
  peak_play_hours: number[];
  updated_at: string;
}

export interface Advertisement {
  id: string;
  title: string;
  file_url: string;
  duration: number;
  priority: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface AdSchedule {
  id: string;
  playlist_id?: string;
  interval_minutes?: number;
  specific_times?: string[];
  slot_duration: number;
  is_enabled: boolean;
  created_at: string;
}

export interface AdSlot {
  id: string;
  ad_schedule_id: string;
  advertisement_id: string;
  position: number;
  created_at: string;
}

export interface AdPlay {
  id: string;
  advertisement_id: string;
  store_id: string;
  played_at: string;
  created_at: string;
}

export interface RadioStation {
  id: string;
  name: string;
  logo: string;
  status: string;
  currentTrack?: {
    title: string;
    artist: string;
  };
}

export interface Interview {
  id: string;
  title: string;
  duration: string;
  image: string;
  description: string;
}

export interface PlayerSession {
  id: string;
  store_id: string;
  current_track_id: string | null;
  status: 'playing' | 'paused' | 'stopped' | 'loading';
  volume: number;
  is_muted: boolean;
  last_updated: string;
  created_at: string;
}

export interface EmergencyBroadcast {
  id: string;
  store_id: string;
  message: string;
  audio_url?: string;
  priority: number;
  start_time: string;
  end_time?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}