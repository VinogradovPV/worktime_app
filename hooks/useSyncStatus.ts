import { useEffect, useState } from "react";
import { syncService, SyncStatus } from "@/lib/sync/syncService";

/**
 * Hook for managing sync status
 */
export function useSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize sync service
    syncService.init().then(() => {
      setSyncStatus(syncService.getStatus());
      setIsInitialized(true);
    });

    // Subscribe to status changes
    const unsubscribe = syncService.subscribe((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  const triggerSync = async () => {
    await syncService.syncWorkDays();
  };

  const clearError = () => {
    syncService.clearError();
  };

  return {
    syncStatus,
    isInitialized,
    triggerSync,
    clearError,
  };
}
