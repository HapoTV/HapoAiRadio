import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { EmergencyOverride } from '../../types';
import { PlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import EmergencyOverrideForm from './EmergencyOverrideForm';
import EmergencyOverrideList from './EmergencyOverrideList';
import toast from 'react-hot-toast';

export default function EmergencyOverrideManager() {
  const [overrides, setOverrides] = useState<EmergencyOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<EmergencyOverride | undefined>();

  useEffect(() => {
    fetchOverrides();
  }, []);

  const fetchOverrides = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_overrides')
        .select('*')
        .order('priority', { ascending: false })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setOverrides(data || []);
    } catch (error) {
      console.error('Error fetching emergency overrides:', error);
      toast.error('Failed to load emergency overrides');
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
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon className="h-6 w-6 text-status-warning" />
          <h3 className="text-lg font-medium text-primary-50">Emergency Overrides</h3>
        </div>
        <button
          onClick={() => {
            setSelectedOverride(undefined);
            setShowForm(true);
          }}
          className="inline-flex items-center rounded-md bg-status-errorBg px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-status-error/80"
        >
          <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
          Add Override
        </button>
      </div>

      {showForm ? (
        <div className="bg-primary-700 p-6 rounded-lg">
          <EmergencyOverrideForm
            override={selectedOverride}
            onSubmit={() => {
              setShowForm(false);
              setSelectedOverride(undefined);
              fetchOverrides();
            }}
            onCancel={() => {
              setShowForm(false);
              setSelectedOverride(undefined);
            }}
          />
        </div>
      ) : (
        <EmergencyOverrideList
          overrides={overrides}
          onUpdate={fetchOverrides}
        />
      )}
    </div>
  );
}