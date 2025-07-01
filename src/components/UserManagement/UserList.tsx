import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getUserRoles } from '../../lib/permissions';
import toast from 'react-hot-toast';
import { UserRoleManager, StorePermissionManager } from './';

interface User {
  id: string;
  email: string;
  created_at: string;
  user_metadata: {
    full_name?: string;
  };
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch users from Supabase Auth
      const { data, error } = await supabase.auth.admin.listUsers();
      
      if (error) throw error;
      setUsers(data.users as User[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-primary-800 rounded w-1/4"></div>
        <div className="h-64 bg-primary-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-primary-50">User Management</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-primary-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-primary-700">
              <h3 className="text-lg font-medium text-primary-50">Users</h3>
            </div>
            <ul className="divide-y divide-primary-700">
              {users.map((user) => (
                <li
                  key={user.id}
                  className={`
                    p-4 cursor-pointer hover:bg-primary-700 transition-colors
                    ${selectedUser?.id === user.id ? 'bg-primary-700' : ''}
                  `}
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-primary-50 font-medium">
                        {user.user_metadata?.full_name || 'Unnamed User'}
                      </p>
                      <p className="text-sm text-primary-400">{user.email}</p>
                    </div>
                  </div>
                </li>
              ))}
              
              {users.length === 0 && (
                <li className="p-4 text-center text-primary-400">
                  No users found
                </li>
              )}
            </ul>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-primary-800 rounded-xl overflow-hidden shadow-sm">
              <div className="border-b border-primary-700">
                <nav className="-mb-px flex">
                  <button
                    onClick={() => setActiveTab('roles')}
                    className={`
                      w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm
                      ${activeTab === 'roles'
                        ? 'border-primary-500 text-primary-50'
                        : 'border-transparent text-primary-400 hover:text-primary-300 hover:border-primary-300'
                      }
                    `}
                  >
                    User Roles
                  </button>
                  <button
                    onClick={() => setActiveTab('permissions')}
                    className={`
                      w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm
                      ${activeTab === 'permissions'
                        ? 'border-primary-500 text-primary-50'
                        : 'border-transparent text-primary-400 hover:text-primary-300 hover:border-primary-300'
                      }
                    `}
                  >
                    Store Permissions
                  </button>
                </nav>
              </div>
              
              <div className="p-6">
                {activeTab === 'roles' ? (
                  <UserRoleManager 
                    userId={selectedUser.id} 
                    userName={selectedUser.user_metadata?.full_name || selectedUser.email}
                  />
                ) : (
                  <StorePermissionManager 
                    userId={selectedUser.id} 
                    userName={selectedUser.user_metadata?.full_name || selectedUser.email}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-primary-800 rounded-xl p-6 text-center">
              <p className="text-primary-400">Select a user to manage their roles and permissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}