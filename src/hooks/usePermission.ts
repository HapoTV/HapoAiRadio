import React from 'react';
import { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';

export function usePermission(permissionName: string, storeId?: string) {
  const [permitted, setPermitted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await hasPermission(permissionName, storeId);
        setPermitted(result);
      } catch (err) {
        console.error('Error checking permission:', err);
        setError(err as Error);
        setPermitted(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permissionName, storeId]);

  return { permitted, loading, error };
}