import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  UsersIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import type { Subscriber, SubscriberMetrics } from '../types/subscriber';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function SubscriberDashboard() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [metrics, setMetrics] = useState<SubscriberMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch subscribers
      const { data: subscribersData, error: subscribersError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('subscription_status', 'active')
        .order('created_at', { ascending: false });

      if (subscribersError) throw subscribersError;

      // Fetch metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('subscriber_metrics')
        .select('*');

      if (metricsError) throw metricsError;

      // Process metrics data
      if (metricsData && metricsData.length > 0) {
        const totalSubscribers = metricsData[0].total_subscribers;
        const activeSubscribers = metricsData[0].active_subscribers;
        const averageListeningHours = metricsData[0].average_listening_hours;
        const churnRate = metricsData[0].churn_rate;

        // Transform subscription distribution data
        const subscriptionDistribution = metricsData.map(item => ({
          type: item.subscription_type,
          count: item.type_count
        }));

        setMetrics({
          total_subscribers: totalSubscribers,
          active_subscribers: activeSubscribers,
          average_listening_hours: averageListeningHours,
          churn_rate: churnRate,
          subscription_distribution: subscriptionDistribution,
          popular_content: [] // This would come from a different query
        });
      }

      setSubscribers(subscribersData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-primary-800 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-96 bg-primary-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary-50">Individual Subscribers</h1>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-2 text-primary-50"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-primary-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-400 text-sm">Total Subscribers</p>
              <p className="text-2xl font-semibold text-primary-50 mt-1">
                {metrics?.total_subscribers.toLocaleString() || '0'}
              </p>
            </div>
            <UsersIcon className="h-8 w-8 text-primary-500" />
          </div>
          <div className="mt-4">
            <div className="text-sm text-primary-400">
              Active: {metrics?.active_subscribers.toLocaleString() || '0'}
            </div>
          </div>
        </div>

        <div className="bg-primary-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-400 text-sm">Avg. Listening Hours</p>
              <p className="text-2xl font-semibold text-primary-50 mt-1">
                {metrics?.average_listening_hours.toFixed(1) || '0'}h
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-primary-500" />
          </div>
          <div className="mt-4">
            <div className="text-sm text-primary-400">
              Per active subscriber
            </div>
          </div>
        </div>

        <div className="bg-primary-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-400 text-sm">Churn Rate</p>
              <p className="text-2xl font-semibold text-primary-50 mt-1">
                {metrics?.churn_rate.toFixed(1) || '0'}%
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-primary-500" />
          </div>
          <div className="mt-4">
            <div className="text-sm text-primary-400">
              Last 30 days
            </div>
          </div>
        </div>

        <div className="bg-primary-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-400 text-sm">Growth Rate</p>
              <p className="text-2xl font-semibold text-primary-50 mt-1">
                +12.5%
              </p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-primary-500" />
          </div>
          <div className="mt-4">
            <div className="text-sm text-primary-400">
              Month over month
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Listening Hours Trend */}
        <div className="bg-primary-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-primary-50 mb-6">Listening Hours Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { date: 'Mon', hours: 24 },
                  { date: 'Tue', hours: 32 },
                  { date: 'Wed', hours: 28 },
                  { date: 'Thu', hours: 35 },
                  { date: 'Fri', hours: 40 },
                  { date: 'Sat', hours: 45 },
                  { date: 'Sun', hours: 38 },
                ]}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                  }}
                />
                <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Distribution */}
        <div className="bg-primary-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-primary-50 mb-6">Subscription Types</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics?.subscription_distribution}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label
                >
                  {metrics?.subscription_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Subscribers */}
      <div className="bg-primary-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-primary-700">
          <h3 className="text-lg font-medium text-primary-50">Recent Subscribers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-primary-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-400 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-400 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-400 uppercase tracking-wider">
                  Listening Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-700">
              {subscribers.slice(0, 5).map((subscriber) => (
                <tr key={subscriber.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-50">
                    {subscriber.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-400">
                    {subscriber.subscription_type.charAt(0).toUpperCase() + 
                     subscriber.subscription_type.slice(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-400">
                    {format(new Date(subscriber.start_date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-400">
                    {subscriber.total_listening_hours.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${subscriber.subscription_status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }
                    `}>
                      {subscriber.subscription_status.charAt(0).toUpperCase() + 
                       subscriber.subscription_status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}