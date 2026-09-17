import { useState, useEffect } from 'react';

export interface OfflineQueueItem {
  id: string;
  type: 'ORDER' | 'RECOVERY' | 'VISIT';
  payload: any;
  timestamp: string;
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('nlink_offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToOfflineQueue = (item: Omit<OfflineQueueItem, 'id' | 'timestamp'>) => {
    const newItem: OfflineQueueItem = {
      ...item,
      id: `OFFLINE-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    const updated = [...offlineQueue, newItem];
    setOfflineQueue(updated);
    try {
      localStorage.setItem('nlink_offline_queue', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save to offline storage', e);
    }
    return newItem;
  };

  const clearOfflineQueue = () => {
    setOfflineQueue([]);
    try {
      localStorage.removeItem('nlink_offline_queue');
    } catch (e) {
      console.error('Failed to clear offline storage', e);
    }
  };

  return {
    isOnline,
    offlineQueue,
    addToOfflineQueue,
    clearOfflineQueue,
  };
}
