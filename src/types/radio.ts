import { Track, Playlist } from './index';

export interface SchedulingRule {
  id: string;
  type: 'maxPlays' | 'artistSpacing' | 'songSpacing' | 'genreMix' | 'daypart';
  value: number;
  timeUnit?: 'hour' | 'day' | 'minutes';
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  genres?: string[];
  minPercentage?: number;
  maxPercentage?: number;
}

export interface QueuedTrack extends Track {
  queueId: string;
  position: number;
  sourceType: 'user' | 'auto' | 'store';
  sourcePlaylist?: Playlist;
  scheduledTime?: string;
  conflicts?: SchedulingConflict[];
}

export interface SchedulingConflict {
  type: 'maxPlays' | 'artistSpacing' | 'songSpacing' | 'genreMix' | 'daypart';
  message: string;
  severity: 'warning' | 'error';
}

export interface PlaylistTemplate {
  id: string;
  name: string;
  rules: SchedulingRule[];
  created_at: string;
  updated_at: string;
}

export interface RadioQueue {
  id: string;
  name: string;
  playlistId: string;
  storeId: string;
  tracks: QueuedTrack[];
  rules: SchedulingRule[];
  duration: number;
  startTime: string;
  endTime: string;
  created_at: string;
  updated_at: string;
}

export interface DaypartSettings {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  rules: SchedulingRule[];
}

export interface GenreRotation {
  genre: string;
  minPercentage: number;
  maxPercentage: number;
  peakHourBoost: number;
}

export interface RotationCategory {
  id: string;
  name: string;
  maxPlaysPerHour: number;
  minSpacingMinutes: number;
  genres: string[];
  dayparts: DaypartSettings[];
}

export interface PlaylistRelationship {
  sourcePlaylistId: string;
  relatedPlaylistId: string;
  relationshipType: 'similar' | 'inspired' | 'store_specific' | 'auto_generated';
  relationshipStrength: number;
  metadata?: Record<string, any>;
}