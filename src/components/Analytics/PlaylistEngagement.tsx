import React from 'react';
import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PlaylistAnalytics } from '../../types';

interface Props {
  analytics: PlaylistAnalytics[];
}

export default function PlaylistEngagement({ analytics }: Props) {
  const chartData = useMemo(() => {
    return analytics.map(playlist => ({
      name: playlist.playlist_id,
      plays: playlist.total_plays,
      completion: Math.round(playlist.avg_completion_rate * 100),
      skips: Math.round(playlist.skip_rate * 100),
    }));
  }, [analytics]);

  return (
    <div className="bg-primary-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-primary-50 mb-6">Playlist Engagement</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '0.5rem',
                color: '#F9FAFB',
              }}
            />
            <Bar dataKey="plays" name="Total Plays" fill="#3B82F6" />
            <Bar dataKey="completion" name="Completion Rate %" fill="#10B981" />
            <Bar dataKey="skips" name="Skip Rate %" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}