import React from 'react';
import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { StoreAnalytics } from '../../types';

interface Props {
  analytics: StoreAnalytics[];
}

export default function StorePerformance({ analytics }: Props) {
  const chartData = useMemo(() => {
    return analytics.map(store => ({
      name: store.store_id,
      plays: store.total_plays,
      uniqueTracks: store.unique_tracks,
    }));
  }, [analytics]);

  return (
    <div className="bg-primary-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-primary-50 mb-6">Store Performance</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
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
            <Line 
              type="monotone" 
              dataKey="plays" 
              name="Total Plays"
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={{ fill: '#3B82F6' }}
            />
            <Line 
              type="monotone" 
              dataKey="uniqueTracks" 
              name="Unique Tracks"
              stroke="#10B981" 
              strokeWidth={2}
              dot={{ fill: '#10B981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}