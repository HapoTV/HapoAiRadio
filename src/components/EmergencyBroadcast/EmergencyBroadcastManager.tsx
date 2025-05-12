import { useState } from 'react';
import { ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline';
import EmergencyBroadcastForm from './EmergencyBroadcastForm';
import EmergencyBroadcastList from './EmergencyBroadcastList';

interface Props {
  storeId: string;
}

export default function EmergencyBroadcastManager({ storeId }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon className="h-6 w-6 text-status-error" />
          <h3 className="text-lg font-medium text-primary-50">Emergency Broadcasts</h3>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center rounded-md bg-status-errorBg px-3 py-2 text-sm font-semibold text-status-error shadow-sm hover:bg-status-error/20"
        >
          <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
          New Broadcast
        </button>
      </div>

      {showForm ? (
        <div className="bg-primary-700 p-6 rounded-lg">
          <EmergencyBroadcastForm
            storeId={storeId}
            onSuccess={() => {
              setShowForm(false);
            }}
            onCancel={() => {
              setShowForm(false);
            }}
          />
        </div>
      ) : (
        <EmergencyBroadcastList
          storeId={storeId}
        />
      )}
    </div>
  );
}