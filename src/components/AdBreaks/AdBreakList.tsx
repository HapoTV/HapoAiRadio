import { format } from 'date-fns';
import { ClockIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { AdBreak } from '../../types';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  adBreaks: AdBreak[];
  onUpdate: () => void;
}

export default function AdBreakList({ adBreaks, onUpdate }: Props) {
  const handleDelete = async (adBreak: AdBreak) => {
    if (!confirm('Are you sure you want to delete this ad break?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ad_breaks')
        .delete()
        .eq('id', adBreak.id);

      if (error) throw error;

      toast.success('Ad break deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Error deleting ad break:', error);
      toast.error('Failed to delete ad break');
    }
  };

  return (
    <div className="space-y-4">
      {adBreaks.map(adBreak => (
        <div
          key={adBreak.id}
          className="bg-primary-700 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <ClockIcon className="h-5 w-5 text-primary-400" />
            <div>
              <p className="text-primary-50 font-medium">
                {format(new Date(`2000-01-01T${adBreak.start_time}`), 'h:mm a')} - 
                {format(new Date(`2000-01-01T${adBreak.end_time}`), 'h:mm a')}
              </p>
              <p className="text-sm text-primary-400">
                Max Duration: {adBreak.max_duration}s • Priority: {adBreak.priority}
                {adBreak.max_daily_plays && ` • Max Plays: ${adBreak.max_daily_plays}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDelete(adBreak)}
            className="p-2 text-primary-400 hover:text-status-error"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ))}

      {adBreaks.length === 0 && (
        <p className="text-center text-primary-400 py-4">
          No ad breaks configured
        </p>
      )}
    </div>
  );
}