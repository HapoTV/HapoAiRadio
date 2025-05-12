import React from 'react';
import { UserList } from '../components/UserManagement';
import { hasPermission } from '../lib/permissions';
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  
  useEffect(() => {
    checkPermission();
  }, []);
  
  const checkPermission = async () => {
    try {
      const canManageUsers = await hasPermission('manage_users');
      setHasAccess(canManageUsers);
      
      if (!canManageUsers) {
        toast.error('You do not have permission to access this page');
      }
    } catch (error) {
      console.error('Error checking permission:', error);
      setHasAccess(false);
      toast.error('Error checking permissions');
    }
  };
  
  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  if (hasAccess === false) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div>
      <UserList />
    </div>
  );
}