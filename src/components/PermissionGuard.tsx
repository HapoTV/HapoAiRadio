import { ReactNode } from 'react';
import { usePermission } from '../hooks/usePermission';

interface PermissionGuardProps {
  permissionName: string;
  storeId?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function PermissionGuard({
  permissionName,
  storeId,
  children,
  fallback = null
}: PermissionGuardProps) {
  const { permitted, loading } = usePermission(permissionName, storeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!permitted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}