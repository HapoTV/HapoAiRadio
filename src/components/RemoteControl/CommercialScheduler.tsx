import React from 'react';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext'; // Updated this path as well since it's at the same level

export default function CommercialScheduler({ storeId }: { storeId: string }) {
  const [commercials, setCommercials] = useState<CommercialAd[]>([]);
  const [selectedAd, setSelectedAd] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCommercials = async () => {
      try {
        const { data, error } = await supabase
          .from('commercial_ads')
          .select('*');
        if (error) {
          console.error('Error fetching ads:', error);
          return;
        }
        setCommercials(data);
      } catch (error) {
        console.error('Error fetching ads:', error);
      }
    };

    fetchCommercials();
  }, []);

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

  return (
    <div className="space-y-4 p-4 bg-primary-800 rounded-lg">
      <h2 className="text-lg font-bold text-primary-50">Schedule Commercial</h2>

      <select
        value={selectedAd || ''}
        onChange={(e) => setSelectedAd(e.target.value)}
        className="w-full px-4 py-2 bg-primary-700 rounded-md text-primary-50"
      >
        <option value="">Select an ad</option>
        {commercials.map((ad) => (
          <option key={ad.id} value={ad.id}>
            {ad.title}
          </option>
        ))}
      </select>

      <input
        type="time"
        value={timeOfDay}
        onChange={(e) => setTimeOfDay(e.target.value)}
        className="w-full px-4 py-2 bg-primary-700 rounded-md text-primary-50"
      />

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

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-md"
      >
        {loading ? 'Scheduling...' : 'Schedule Ad'}
      </button>
    </div>
  );
}

export { CommercialScheduler }