import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getStorePermissions, updateStorePermissions } from '../../lib/permissions';
import type { StorePermission } from '../../lib/permissions';
import type { Store } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  userId: string;
  userName: string;
}

export default function StorePermissionManager({ userId, userName }: Props) {
  const [stores, setStores] = useState<Store[]>([]);
  const [storePermissions, setStorePermissions] = useState<Record<string, StorePermission>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .order('name');
      
      if (storesError) throw storesError;
      
      // Fetch user's store permissions
      const permissions = await getStorePermissions(userId);
      
      // Convert to record for easier access
      const permissionsRecord: Record<string, StorePermission> = {};
      permissions.forEach(perm => {
        permissionsRecord[perm.store_id] = perm;
      });
      
      setStores(storesData || []);
      setStorePermissions(permissionsRecord);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load permissions data');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (
    storeId: string,
    field: keyof Omit<StorePermission, 'id' | 'user_id' | 'store_id'>,
    value: boolean
  ) => {
    setStorePermissions(prev => {
      const updatedPerms = { ...prev };
      
      if (updatedPerms[storeId]) {
        // Update existing permission
        updatedPerms[storeId] = {
          ...updatedPerms[storeId],
          [field]: value
        };
      } else {
        // Create new permission object
        updatedPerms[storeId] = {
          id: '',
          user_id: userId,
          store_id: storeId,
          can_upload_music: false,
          can_edit_playlists: false,
          can_edit_schedules: false,
          can_control_playback: false,
          can_send_emergency: false,
          can_view_analytics: false,
          [field]: value
        };
      }
      
      return updatedPerms;
    });
  };

  const handleSavePermissions = async () => {
    try {
      setSaving(true);
      
      // Save each store permission
      for (const storeId in storePermissions) {
        await updateStorePermissions(storePermissions[storeId]);
      }
      
      toast.success('Permissions saved successfully');
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-primary-700 rounded"></div>
        <div className="h-64 bg-primary-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-primary-50">Store Permissions for {userName}</h3>
        <button
          type="button"
          onClick={handleSavePermissions}
          disabled={saving}
          className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>
      
      <div className="overflow-hidden shadow ring-1 ring-primary-700 rounded-lg">
        <table className="min-w-full divide-y divide-primary-700">
          <thead className="bg-primary-800">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-primary-50 sm:pl-6">Store</th>
              <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-primary-50">Upload Music</th>
              <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-primary-50">Edit Playlists</th>
              <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-primary-50">Edit Schedules</th>
              <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-primary-50">Control Playback</th>
              <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-primary-50">Send Emergency</th>
              <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-primary-50">View Analytics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-700 bg-primary-800">
            {stores.map((store) => {
              const permissions = storePermissions[store.id] || {
                user_id: userId,
                store_id: store.id,
                can_upload_music: false,
                can_edit_playlists: false,
                can_edit_schedules: false,
                can_control_playback: false,
                can_send_emergency: false,
                can_view_analytics: false
              };
              
              return (
                <tr key={store.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-primary-50 sm:pl-6">
                    {store.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <input
                      type="checkbox"
                      checked={permissions.can_upload_music}
                      onChange={(e) => handlePermissionChange(store.id, 'can_upload_music', e.target.checked)}
                      className="h-4 w-4 rounded border-primary-600 text-primary-500 focus:ring-primary-500"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <input
                      type="checkbox"
                      checked={permissions.can_edit_playlists}
                      onChange={(e) => handlePermissionChange(store.id, 'can_edit_playlists', e.target.checked)}
                      className="h-4 w-4 rounded border-primary-600 text-primary-500 focus:ring-primary-500"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <input
                      type="checkbox"
                      checked={permissions.can_edit_schedules}
                      onChange={(e) => handlePermissionChange(store.id, 'can_edit_schedules', e.target.checked)}
                      className="h-4 w-4 rounded border-primary-600 text-primary-500 focus:ring-primary-500"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <input
                      type="checkbox"
                      checked={permissions.can_control_playback}
                      onChange={(e) => handlePermissionChange(store.id, 'can_control_playback', e.target.checked)}
                      className="h-4 w-4 rounded border-primary-600 text-primary-500 focus:ring-primary-500"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <input
                      type="checkbox"
                      checked={permissions.can_send_emergency}
                      onChange={(e) => handlePermissionChange(store.id, 'can_send_emergency', e.target.checked)}
                      className="h-4 w-4 rounded border-primary-600 text-primary-500 focus:ring-primary-500"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <input
                      type="checkbox"
                      checked={permissions.can_view_analytics}
                      onChange={(e) => handlePermissionChange(store.id, 'can_view_analytics', e.target.checked)}
                      className="h-4 w-4 rounded border-primary-600 text-primary-500 focus:ring-primary-500"
                    />
                  </td>
                </tr>
              );
            })}
            
            {stores.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-sm text-center text-primary-400">
                  No stores available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}