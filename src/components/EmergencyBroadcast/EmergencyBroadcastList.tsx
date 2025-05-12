import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface EmergencyBroadcast {
  id: string;
  store_id: string;
  message: string;
  audio_url?: string;
  priority: number;
  start_time: string;
  end_time?: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  storeId?: string;
  onRefresh?: () => void;
}

export default function EmergencyBroadcastList({ storeId, onRefresh }: Props) {
  const [broadcasts, setBroadcasts] = useState<EmergencyBroadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBroadcasts();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('emergency_queue_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emergency_queue'
      }, () => {
        fetchBroadcasts();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [storeId]);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('emergency_queue')
        .select(`
          id,
          store_id,
          message,
          audio_url,
          priority,
          start_time,
          end_time,
          is_active,
          created_at
        `)
        .order('is_active', { ascending: false })
        .order('priority', { ascending: false })
        .order('start_time', { ascending: false });
      
      // Filter by store if provided
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setBroadcasts(data || []);
    } catch (error) {
      console.error('Error fetching emergency broadcasts:', error);
      toast.error('Failed to load emergency broadcasts');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBroadcast = async (id: string) => {
    try {
      const { error } = await supabase
        .from('emergency_queue')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Broadcast cancelled');
      fetchBroadcasts();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error cancelling broadcast:', error);
      toast.error('Failed to cancel broadcast');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-primary-700 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (broadcasts.length === 0) {
    return (
      <div className="text-center py-8 text-primary-400">
        No emergency broadcasts found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {broadcasts.map((broadcast) => (
        <div 
          key={broadcast.id}
          className={`
            bg-primary-700 rounded-lg p-4
            ${broadcast.is_active ? 'border border-status-error' : ''}
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className={`h-5 w-5 ${
                broadcast.is_active ? 'text-status-error' : 'text-primary-400'
              }`} />
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-primary-50 font-medium">{broadcast.message}</p>
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${broadcast.is_active 
                      ? 'bg-status-errorBg text-status-error' 
                      : 'bg-primary-600 text-primary-300'
                    }
                  `}>
                    {broadcast.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-primary-400 mt-1">
                  Priority: {broadcast.priority} •
                  Started: {format(new Date(broadcast.start_time), 'MMM d, h:mm a')}
                  {broadcast.end_time && ` • Ends: ${format(new Date(broadcast.end_time), 'MMM d, h:mm a')}`}
                </p>
              </div>
            </div>
            
            {broadcast.is_active && (
              <button
                onClick={() => handleCancelBroadcast(broadcast.id)}
                className="p-2 text-primary-400 hover:text-status-error"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}