import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Api from "@/lib/_core/api";
import { WorkDay } from "@/shared/types/workday";
import { getAllWorkDays, saveWorkDay } from "@/lib/storage/workdayService";

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  error: string | null;
  syncProgress: number; // 0-100
}

const SYNC_STATUS_KEY = "@worktime_sync_status";
const LAST_SYNC_TIME_KEY = "@worktime_last_sync_time";
const PENDING_SYNC_QUEUE_KEY = "@worktime_pending_sync_queue";

class SyncService {
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    error: null,
    syncProgress: 0,
  };

  private syncListeners: Set<(status: SyncStatus) => void> = new Set();

  /**
   * Initialize sync service
   */
  async init() {
    try {
      const savedStatus = await AsyncStorage.getItem(SYNC_STATUS_KEY);
      if (savedStatus) {
        const parsed = JSON.parse(savedStatus);
        this.syncStatus = {
          ...this.syncStatus,
          ...parsed,
          lastSyncTime: parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : null,
        };
      }

      const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);
      if (lastSyncStr) {
        this.syncStatus.lastSyncTime = new Date(lastSyncStr);
      }

      await this.updatePendingChangesCount();
    } catch (error) {
      console.error("Failed to init sync service:", error);
    }
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void) {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Sync work days with server
   */
  async syncWorkDays() {
    if (this.syncStatus.isSyncing) {
      console.warn("Sync already in progress");
      return;
    }

    this.updateStatus({ isSyncing: true, error: null, syncProgress: 0 });

    try {
      // Get all local work days
      const allWorkDays: WorkDay[] = await getAllWorkDays();
      this.updateStatus({ syncProgress: 10 });

      // Get pending changes (modified since last sync)
      const lastSyncTime = this.syncStatus.lastSyncTime || new Date(0);
      const pendingChanges = allWorkDays.filter(
        (day: WorkDay) => new Date(day.updatedAt) > lastSyncTime
      );

      if (pendingChanges.length === 0) {
        console.log("[Sync] No pending changes, checking sync status");
        try {
          // Check sync status from server
          const statusResponse = await Api.getSyncStatus();
          this.updateStatus({
            isSyncing: false,
            syncProgress: 100,
            lastSyncTime: new Date(),
            pendingChanges: statusResponse.pendingCount || 0,
          });
        } catch (err) {
          console.warn("[Sync] Failed to check sync status:", err);
          this.updateStatus({
            isSyncing: false,
            syncProgress: 100,
            lastSyncTime: new Date(),
          });
        }
        await this.saveSyncStatus();
        return;
      }

      this.updateStatus({ syncProgress: 20 });

      // Upload changes to server
      console.log("[Sync] Uploading", pendingChanges.length, "work days");
      const uploadResult = await Api.uploadWorkDays({
        workdays: pendingChanges.map((day: WorkDay) => ({
          date: day.date,
          status: day.status || "working",
          hours: day.totalWorkMs ? day.totalWorkMs / (1000 * 60 * 60) : 0,
          created_at: day.createdAt,
          updated_at: day.updatedAt,
        })),
      });

      console.log("[Sync] Upload result:", uploadResult);
      this.updateStatus({ syncProgress: 60 });

      // Download latest data from server
      console.log("[Sync] Downloading work days since", lastSyncTime.toISOString());
      const downloadResult = await Api.downloadWorkDays({
        from_date: lastSyncTime.toISOString().split("T")[0],
        to_date: new Date().toISOString().split("T")[0],
      }) as any;

      this.updateStatus({ syncProgress: 80 });

      // Merge downloaded data with local
      if (downloadResult.workdays && downloadResult.workdays.length > 0) {
        console.log("[Sync] Merging", downloadResult.workdays.length, "downloaded work days");
        for (const serverDay of downloadResult.workdays) {
          const localDay = allWorkDays.find((d: WorkDay) => d.date === serverDay.date);

          if (!localDay) {
            // Server version is newer, use it
            await saveWorkDay({
              date: serverDay.date,
              businessDate: serverDay.date,
              status: serverDay.status || "working",
              workStartAt: null,
              workEndAt: null,
              breakIntervals: [],
              temporaryExitIntervals: [],
              totalWorkMs: (serverDay.hours || 0) * (1000 * 60 * 60),
              totalBreakMs: 0,
              totalTemporaryExitMs: 0,
              work95Ms: 0,
              events: [],
              crossesMidnight: false,
              requires_review: false,
              createdAt: serverDay.created_at || new Date().toISOString(),
              updatedAt: serverDay.updated_at || new Date().toISOString(),
              id: `${serverDay.date}-sync`,
            } as any);
          }
        }
      }

      this.updateStatus({ syncProgress: 100 });

      // Update sync time
      const newSyncTime = new Date();
      this.updateStatus({
        isSyncing: false,
        lastSyncTime: newSyncTime,
        pendingChanges: 0,
      });

      await this.saveSyncStatus();
      await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, newSyncTime.toISOString());

      console.log("[Sync] Sync completed successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Sync] Sync failed:", errorMessage);
      this.updateStatus({
        isSyncing: false,
        error: errorMessage,
      });
      await this.saveSyncStatus();
    }
  }

  /**
   * Update pending changes count
   */
  private async updatePendingChangesCount() {
    try {
      const allWorkDays: WorkDay[] = await getAllWorkDays();
      const lastSyncTime = this.syncStatus.lastSyncTime || new Date(0);
      const pendingCount = allWorkDays.filter(
        (day: WorkDay) => new Date(day.updatedAt) > lastSyncTime
      ).length;

      this.updateStatus({ pendingChanges: pendingCount });
    } catch (error) {
      console.error("Failed to update pending changes count:", error);
    }
  }

  /**
   * Mark a work day as modified (for pending sync)
   */
  async markWorkDayModified(date: string) {
    await this.updatePendingChangesCount();
  }

  /**
   * Clear sync error
   */
  clearError() {
    this.updateStatus({ error: null });
  }

  /**
   * Update sync status and notify listeners
   */
  private updateStatus(partial: Partial<SyncStatus>) {
    this.syncStatus = { ...this.syncStatus, ...partial };
    this.notifyListeners();
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners() {
    this.syncListeners.forEach((listener) => {
      try {
        listener({ ...this.syncStatus });
      } catch (error) {
        console.error("Error in sync listener:", error);
      }
    });
  }

  /**
   * Save sync status to storage
   */
  private async saveSyncStatus() {
    try {
      await AsyncStorage.setItem(
        SYNC_STATUS_KEY,
        JSON.stringify({
          ...this.syncStatus,
          lastSyncTime: this.syncStatus.lastSyncTime?.toISOString(),
        })
      );
    } catch (error) {
      console.error("Failed to save sync status:", error);
    }
  }
}

export const syncService = new SyncService();
