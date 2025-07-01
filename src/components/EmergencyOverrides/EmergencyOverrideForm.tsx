import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { EmergencyOverride } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  override?: EmergencyOverride;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function EmergencyOverrideForm({ override, onSubmit, onCancel }: Props) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 1,
    start_time: '',
    end_time: '',
    repeat_interval: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (override) {
      setFormData({
        title: override.title,
        message: override.message,
        priority: override.priority,
        start_time: new Date(override.start_time).toISOString().slice(0, 16),
        end_time: override.end_time ? new Date(override.end_time).toISOString().slice(0, 16) : '',
        repeat_interval: override.repeat_interval || '',
        is_active: override.is_active,
      });
    }
  }, [override]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (override) {
        const { error } = await supabase
          .from('emergency_overrides')
          .update({
            ...formData,
            end_time: formData.end_time || null,
            repeat_interval: formData.repeat_interval || null,
          })
          .eq('id', override.id);

        if (error) throw error;
        toast.success('Emergency override updated successfully');
      } else {
        const { error } = await supabase
          .from('emergency_overrides')
          .insert([{
            ...formData,
            end_time: formData.end_time || null,
            repeat_interval: formData.repeat_interval || null,
          }]);

        if (error) throw error;
        toast.success('Emergency override created successfully');
      }

      onSubmit();
    } catch (error) {
      console.error('Error saving emergency override:', error);
      toast.error('Failed to save emergency override');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-primary-200">
          Title
        </label>
        <div className="mt-1">
          <input
            type="text"
            name="title"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-primary-200">
          Message
        </label>
        <div className="mt-1">
          <textarea
            name="message"
            id="message"
            rows={3}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
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
          <label htmlFor="repeat_interval" className="block text-sm font-medium text-primary-200">
            Repeat Interval
          </label>
          <div className="mt-1">
            <select
              id="repeat_interval"
              name="repeat_interval"
              value={formData.repeat_interval}
              onChange={(e) => setFormData({ ...formData, repeat_interval: e.target.value })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
            >
              <option value="">No repeat</option>
              <option value="15 minutes">Every 15 minutes</option>
              <option value="30 minutes">Every 30 minutes</option>
              <option value="1 hour">Every hour</option>
              <option value="2 hours">Every 2 hours</option>
              <option value="4 hours">Every 4 hours</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-primary-200">
            Start Time
          </label>
          <div className="mt-1">
            <input
              type="datetime-local"
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
            End Time (optional)
          </label>
          <div className="mt-1">
            <input
              type="datetime-local"
              name="end_time"
              id="end_time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="is_active"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="h-4 w-4 rounded border-primary-600 text-primary-500 focus:ring-primary-500"
        />
        <label htmlFor="is_active" className="ml-2 block text-sm text-primary-200">
          Active
        </label>
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
          className="rounded-md bg-status-errorBg px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-status-error/80"
          disabled={loading}
        >
          {loading ? 'Saving...' : (override ? 'Update Override' : 'Create Override')}
        </button>
      </div>
    </form>
  );
}