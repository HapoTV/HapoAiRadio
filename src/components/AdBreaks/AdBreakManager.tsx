import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { AdBreak } from '../../types';
import { PlusIcon } from '@heroicons/react/24/outline';
import AdBreakForm from './AdBreakForm';
import AdBreakList from './AdBreakList';
import toast from 'react-hot-toast';

interface Props {
  segmentId: string;
}

export default function AdBreakManager({ segmentId }: Props) {
  const [adBreaks, setAdBreaks] = useState<AdBreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedAdBreak, setSelectedAdBreak] = useState<AdBreak | undefined>();

  useEffect(() => {
    fetchAdBreaks();
  }, [segmentId]);

  const fetchAdBreaks = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_breaks')
        .select('*')
        .eq('segment_id', segmentId)
        .order('start_time');

      if (error) throw error;
      setAdBreaks(data || []);
    } catch (error) {
      console.error('Error fetching ad breaks:', error);
      toast.error('Failed to load ad breaks');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-primary-700 rounded"></div>
        <div className="h-32 bg-primary-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-primary-50">Ad Breaks</h3>
        <button
          onClick={() => {
            setSelectedAdBreak(undefined);
            setShowForm(true);
          }}
          className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        >
          <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
          Add Break
        </button>
      </div>

      {showForm ? (
        <div className="bg-primary-700 p-6 rounded-lg">
          <AdBreakForm
            segmentId={segmentId}
            adBreak={selectedAdBreak}
            onSubmit={() => {
              setShowForm(false);
              setSelectedAdBreak(undefined);
              fetchAdBreaks();
            }}
            onCancel={() => {
              setShowForm(false);
              setSelectedAdBreak(undefined);
            }}
          />
        </div>
      ) : (
        <AdBreakList
          adBreaks={adBreaks}
          onUpdate={fetchAdBreaks}
        />
      )}
    </div>
  );
}