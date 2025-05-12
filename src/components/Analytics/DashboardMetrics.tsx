import React from 'react';
import { useMemo } from 'react';
import {
  ChartBarIcon,
  MusicalNoteIcon,
  BuildingStorefrontIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import type { StoreAnalytics, PlaylistAnalytics } from '../../types';

interface Props {
  storeAnalytics: StoreAnalytics[];
  playlistAnalytics: PlaylistAnalytics[];
}

export default function DashboardMetrics({ storeAnalytics, playlistAnalytics }: Props) {
  const metrics = useMemo(() => {
    const totalPlays = storeAnalytics.reduce((sum, store) => sum + store.total_plays, 0);
    const totalStores = storeAnalytics.length;
    const avgCompletionRate = playlistAnalytics.reduce((sum, playlist) => 
      sum + playlist.avg_completion_rate, 0) / playlistAnalytics.length;
    const totalGenres = new Set(
      playlistAnalytics.flatMap(playlist => 
        Object.keys(playlist.genre_distribution)
      )
    ).size;

    return {
      totalPlays,
      totalStores,
      avgCompletionRate,
      totalGenres,
    };
  }, [storeAnalytics, playlistAnalytics]);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-primary-800 overflow-hidden rounded-lg shadow">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-6 w-6 text-primary-400" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-primary-400 truncate">Total Plays</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-primary-50">
                    {metrics.totalPlays.toLocaleString()}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary-800 overflow-hidden rounded-lg shadow">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BuildingStorefrontIcon className="h-6 w-6 text-primary-400" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-primary-400 truncate">Active Stores</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-primary-50">
                    {metrics.totalStores}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary-800 overflow-hidden rounded-lg shadow">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MusicalNoteIcon className="h-6 w-6 text-primary-400" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-primary-400 truncate">Completion Rate</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-primary-50">
                    {(metrics.avgCompletionRate * 100).toFixed(1)}%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary-800 overflow-hidden rounded-lg shadow">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-6 w-6 text-primary-400" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-primary-400 truncate">Unique Genres</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-primary-50">
                    {metrics.totalGenres}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}