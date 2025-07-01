import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getRoles, getUserRoles, assignRoleToUser, removeRoleFromUser } from '../../lib/permissions';
import type { Role, UserRole } from '../../lib/permissions';
import toast from 'react-hot-toast';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  userId: string;
  userName: string;
}

export default function UserRoleManager({ userId, userName }: Props) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allRoles, userRoleData] = await Promise.all([
        getRoles(),
        getUserRoles(userId)
      ]);
      
      setRoles(allRoles);
      setUserRoles(userRoleData);
    } catch (error) {
      console.error('Error fetching roles data:', error);
      toast.error('Failed to load roles data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedRoleId) {
      toast.error('Please select a role');
      return;
    }
    
    try {
      await assignRoleToUser(userId, selectedRoleId);
      toast.success('Role assigned successfully');
      fetchData();
      setSelectedRoleId('');
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    }
  };

  const handleRemoveRole = async (userRoleId: string) => {
    try {
      await removeRoleFromUser(userRoleId);
      toast.success('Role removed successfully');
      fetchData();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-primary-700 rounded"></div>
        <div className="h-32 bg-primary-700 rounded"></div>
      </div>
    );
  }

  // Filter out roles that the user already has
  const availableRoles = roles.filter(
    role => !userRoles.some(ur => ur.role_id === role.id)
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-primary-50">Roles for {userName}</h3>
      
      <div className="flex items-end space-x-4">
        <div className="flex-1">
          <label htmlFor="role" className="block text-sm font-medium text-primary-200 mb-1">
            Add Role
          </label>
          <select
            id="role"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
          >
            <option value="">Select a role</option>
            {availableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAddRole}
          disabled={!selectedRoleId}
          className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
        >
          <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
          Add Role
        </button>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-primary-200 mb-2">Current Roles</h4>
        {userRoles.length === 0 ? (
          <p className="text-sm text-primary-400">No roles assigned</p>
        ) : (
          <ul className="space-y-2">
            {userRoles.map((userRole) => (
              <li 
                key={userRole.id}
                className="flex items-center justify-between bg-primary-700 p-3 rounded-lg"
              >
                <div>
                  <p className="text-primary-50 font-medium">
                    {userRole.roles?.name}
                  </p>
                  {userRole.roles?.description && (
                    <p className="text-sm text-primary-400">
                      {userRole.roles.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveRole(userRole.id)}
                  className="text-primary-400 hover:text-status-error"
                  disabled={userRole.roles?.is_system_role}
                  title={userRole.roles?.is_system_role ? "System roles cannot be removed" : "Remove role"}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}