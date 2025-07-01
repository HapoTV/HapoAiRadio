import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext'; 
import CommercialSelector from '../../components/CommercialLibrary/CommercialSelector';

export default function CommercialScheduler({ storeId }: { storeId: string }) {
  const [selectedAd, setSelectedAd] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!storeId || !selectedAd || !timeOfDay || weekdays.length === 0) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('commercial_schedules').insert([
        {
          store_id: storeId,
          ad_id: selectedAd,
          time_of_day: timeOfDay,
          weekdays,
        },
      ]);

      if (error) {
        console.error('Error scheduling ad:', error);
        toast.error('Failed to schedule ad');
        return;
      }
      toast.success('Ad scheduled successfully');
    } catch (error) {
      console.error('Error scheduling ad:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommercialSelect = (commercialIds: string[]) => {
    if (commercialIds.length > 0) {
      setSelectedAd(commercialIds[0]);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-primary-800 rounded-lg">
      <h2 className="text-lg font-bold text-primary-50">Schedule Commercial</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary-200 mb-1">
            Select Commercial
          </label>
          <CommercialSelector
            selectedCommercials={selectedAd ? [selectedAd] : []}
            onCommercialSelect={handleCommercialSelect}
            mode="single"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-200 mb-1">
            Time of Day
          </label>
          <input
            type="time"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
            className="w-full px-4 py-2 bg-primary-700 rounded-md text-primary-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-200 mb-1">
            Days of Week
          </label>
          <div className="flex flex-wrap gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <button
                key={day}
                onClick={() =>
                  setWeekdays((prev) =>
                    prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
                  )
                }
                className={`px-3 py-1 rounded-lg ${
                  weekdays.includes(day)
                    ? 'bg-status-success text-green-800'
                    : 'bg-primary-700 text-primary-50'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          {loading ? 'Scheduling...' : 'Schedule Ad'}
        </button>
      </div>
    </div>
  );
}

export { CommercialScheduler }