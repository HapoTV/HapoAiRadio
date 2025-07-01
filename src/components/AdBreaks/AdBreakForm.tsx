import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { AdBreak, PlaylistSegment } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  segmentId: string;
  adBreak?: AdBreak;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function AdBreakForm({ segmentId, adBreak, onSubmit, onCancel }: Props) {
  const [formData, setFormData] = useState({
    start_time: '09:00',
    end_time: '17:00',
    max_duration: 30,
    buffer_time: 3,
    priority: 1,
    max_daily_plays: undefined as number | undefined,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (adBreak) {
      setFormData({
        start_time: adBreak.start_time,
        end_time: adBreak.end_time,
        max_duration: adBreak.max_duration,
        buffer_time: adBreak.buffer_time,
        priority: adBreak.priority,
        max_daily_plays: adBreak.max_daily_plays,
      });
    }
  }, [adBreak]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (adBreak) {
        const { error } = await supabase
          .from('ad_breaks')
          .update({
            ...formData,
            segment_id: segmentId,
          })
          .eq('id', adBreak.id);

        if (error) throw error;
        toast.success('Ad break updated successfully');
      } else {
        const { error } = await supabase
          .from('ad_breaks')
          .insert([{
            ...formData,
            segment_id: segmentId,
          }]);

        if (error) throw error;
        toast.success('Ad break created successfully');
      }

      onSubmit();
    } catch (error) {
      console.error('Error saving ad break:', error);
      toast.error('Failed to save ad break');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-primary-200">
            Start Time
          </label>
          <div className="mt-1">
            <input
              type="time"
              name="start_time"
              id="start_time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="end_time" className="block text-sm font-medium text-primary-200">
            End Time
          </label>
          <div className="mt-1">
            <input
              type="time"
              name="end_time"
              id="end_time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="max_duration" className="block text-sm font-medium text-primary-200">
            Maximum Duration (seconds)
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="max_duration"
              id="max_duration"
              min="1"
              value={formData.max_duration}
              onChange={(e) => setFormData({ ...formData, max_duration: parseInt(e.target.value) })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="buffer_time" className="block text-sm font-medium text-primary-200">
            Buffer Time (seconds)
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="buffer_time"
              id="buffer_time"
              min="0"
              value={formData.buffer_time}
              onChange={(e) => setFormData({ ...formData, buffer_time: parseInt(e.target.value) })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-primary-200">
            Priority (1-10)
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="priority"
              id="priority"
              min="1"
              max="10"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="max_daily_plays" className="block text-sm font-medium text-primary-200">
            Maximum Daily Plays (optional)
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="max_daily_plays"
              id="max_daily_plays"
              min="1"
              value={formData.max_daily_plays || ''}
              onChange={(e) => setFormData({ ...formData, max_daily_plays: e.target.value ? parseInt(e.target.value) : undefined })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-primary-700 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm hover:bg-primary-600"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          disabled={loading}
        >
          {loading ? 'Saving...' : (adBreak ? 'Update Ad Break' : 'Create Ad Break')}
        </button>
      </div>
    </form>
  );
}