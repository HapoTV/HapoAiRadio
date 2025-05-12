import { format } from 'date-fns';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { EmergencyOverride } from '../../types';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  overrides: EmergencyOverride[];
  onUpdate: () => void;
}

export default function EmergencyOverrideList({ overrides, onUpdate }: Props) {
  const handleDelete = async (override: EmergencyOverride) => {
    if (!confirm('Are you sure you want to delete this emergency override?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('emergency_overrides')
        .delete()
        .eq('id', override.id);

      if (error) throw error;

      toast.success('Emergency override deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Error deleting emergency override:', error);
      toast.error('Failed to delete emergency override');
    }
  };

  return (
    <div className="space-y-4">
      {overrides.map(override => (
        <div
          key={override.id}
          className={`
            bg-primary-700 rounded-lg p-4 flex items-center justify-between
            ${override.is_active ? 'border border-status-error' : ''}
          `}
        >
          <div className="flex items-center space-x-4">
            <ExclamationTriangleIcon className={`
              h-5 w-5 
              ${override.is_active ? 'text-status-error' : 'text-primary-400'}
            `} />
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-primary-50 font-medium">{override.title}</p>
                <span className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${override.is_active 
                    ? 'bg-status-errorBg text-status-error' 
                    : 'bg-primary-600 text-primary-300'
                  }
                `}>
                  {override.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-primary-400 mt-1">{override.message}</p>
              <p className="text-xs text-primary-400 mt-1">
                Priority: {override.priority} •
                Start: {format(new Date(override.start_time), 'MMM d, h:mm a')}
                {override.end_time && ` • End: ${format(new Date(override.end_time), 'MMM d, h:mm a')}`}
                {override.repeat_interval && ` • Repeats: ${override.repeat_interval}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDelete(override)}
            className="p-2 text-primary-400 hover:text-status-error"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ))}

      {overrides.length === 0 && (
        <p className="text-center text-primary-400 py-4">
          No emergency overrides configured
        </p>
      )}
    </div>
  );
}