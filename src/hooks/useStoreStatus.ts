import React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface RemoteStatus {
  isConnected: boolean;
  lastPing: Date | null;
}

export function useStoreStatus(storeId: string | null) {
  const [status, setStatus] = useState<RemoteStatus>({
    isConnected: false,
    lastPing: null
  });

  useEffect(() => {
    if (!storeId) return;

    const channel = supabase.channel(`store-status:${storeId}`)
      .on('presence', { event: 'sync' }, () => {
        setStatus({ isConnected: true, lastPing: new Date() });
      })
      .on('presence', { event: 'leave' }, () => {
        setStatus((prev) => ({ ...prev, isConnected: false }));
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [storeId]);

  return status;
}
