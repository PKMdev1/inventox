import { useState, useEffect } from 'react';
import { isOnline, processQueue } from '../services/offlineQueue';

/**
 * Hook to monitor online/offline status and trigger sync when back online
 */
export const useOnlineStatus = () => {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Trigger sync when back online
      processQueue();
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check on mount
    if (isOnline()) {
      processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
};

