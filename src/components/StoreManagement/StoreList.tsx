import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BuildingStorefrontIcon, 
  PencilIcon, 
  TrashIcon,
  SignalIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import type { Store } from '../../types';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  stores: Store[];
  onUpdate: () => void;
}

export default function StoreList({ stores, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async (store: Store) => {
    if (!confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', store.id);

      if (error) throw error;

      toast.success('Store deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error('Failed to delete store');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <WifiIcon className="h-5 w-5 text-green-400" />;
      case 'offline':
        return <SignalIcon className="h-5 w-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-400/10 text-green-400',
      suspended: 'bg-yellow-400/10 text-yellow-400',
      inactive: 'bg-gray-400/10 text-gray-400',
    };

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="bg-primary-800 shadow-sm ring-1 ring-primary-700 rounded-xl overflow-hidden">
      <table className="min-w-full divide-y divide-primary-700">
        <thead>
          <tr>
            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-primary-50 sm:pl-6">Store</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Location</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Status</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Payment</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">IP Address</th>
            <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-primary-700">
          {stores.map((store) => (
            <tr key={store.id} className="hover:bg-primary-700/50">
              <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                <div className="flex items-center">
                  <BuildingStorefrontIcon className="h-5 w-5 text-primary-400 mr-3" />
                  <div>
                    <div className="font-medium text-primary-50">{store.name}</div>
                    {store.formatted_address && (
                      <div className="text-sm text-primary-400">{store.formatted_address}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-primary-400">
                {store.location}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm">
                <div className="flex items-center">
                  {getStatusIcon(store.status)}
                  <span className="ml-2 text-primary-400">{store.status}</span>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm">
                {getPaymentStatusBadge(store.payment_status)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-primary-400">
                {store.ip_address || '-'}
              </td>
              <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => navigate(`/stores/${store.id}`)}
                    className="text-primary-400 hover:text-primary-300"
                    disabled={loading}
                  >
                    <PencilIcon className="h-5 w-5" />
                    <span className="sr-only">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(store)}
                    className="text-red-400 hover:text-red-300"
                    disabled={loading}
                  >
                    <TrashIcon className="h-5 w-5" />
                    <span className="sr-only">Delete</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}