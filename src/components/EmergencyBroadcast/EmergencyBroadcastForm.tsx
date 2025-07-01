import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { createEmergencyBroadcast } from '../../lib/playerSync';
import toast from 'react-hot-toast';

interface Props {
  storeId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EmergencyBroadcastForm({ storeId, onSuccess, onCancel }: Props) {
  const [message, setMessage] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [priority, setPriority] = useState(10);
  const [duration, setDuration] = useState(30); // Duration in minutes
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    setLoading(true);
    
    try {
      // Calculate end time based on duration
      const endTime = new Date();
      endTime.setMinutes(endTime.getMinutes() + duration);
      
      // Create emergency broadcast
      const { error } = await supabase
        .from('emergency_queue')
        .insert([{
          store_id: storeId,
          message,
          audio_url: audioUrl || null,
          priority,
          start_time: new Date().toISOString(),
          end_time: endTime.toISOString(),
          is_active: true,
          created_by: supabase.auth.user()?.id
        }]);
      
      if (error) throw error;
      
      toast.success('Emergency broadcast created');
      onSuccess();
    } catch (error) {
      console.error('Error creating emergency broadcast:', error);
      toast.error('Failed to create emergency broadcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-primary-200">
          Emergency Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
          placeholder="Enter emergency message to broadcast"
          required
        />
      </div>
      
      <div>
        <label htmlFor="audioUrl" className="block text-sm font-medium text-primary-200">
          Audio URL (optional)
        </label>
        <input
          type="url"
          id="audioUrl"
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
          placeholder="https://example.com/emergency-audio.mp3"
        />
        <p className="mt-1 text-xs text-primary-400">
          If provided, this audio will play instead of the message being displayed
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-primary-200">
            Priority (1-10)
          </label>
          <input
            type="number"
            id="priority"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value))}
            min={1}
            max={10}
            className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
          />
          <p className="mt-1 text-xs text-primary-400">
            Higher priority broadcasts will override lower priority ones
          </p>
        </div>
        
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-primary-200">
            Duration (minutes)
          </label>
          <input
            type="number"
            id="duration"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            min={1}
            className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
          />
          <p className="mt-1 text-xs text-primary-400">
            How long the broadcast should remain active
          </p>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm font-medium text-primary-200 hover:text-primary-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-2 bg-status-errorBg text-status-error rounded-md hover:bg-status-error/20 text-sm font-medium"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Emergency Broadcast'}
        </button>
      </div>
    </form>
  );
}