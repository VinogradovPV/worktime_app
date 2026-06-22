import * as Network from "expo-network";
import { syncService } from "./syncService";

export interface AutoSyncConfig {
  enableAutoSync: boolean;
  syncOnWifiOnly: boolean;
  syncInterval: number; // milliseconds
}

class AutoSyncService {
  private config: AutoSyncConfig = {
    enableAutoSync: true,
    syncOnWifiOnly: false,
    syncInterval: 5 * 60 * 1000, // 5 minutes
  };

  private syncTimer: NodeJS.Timeout | null = null;
  private lastNetworkState: boolean = false;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  /**
   * Initialize auto sync service
   */
  async init(config?: Partial<AutoSyncConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Check initial network state
    await this.checkNetworkState();

    // Start monitoring network changes
    this.startNetworkMonitoring();

    // Start periodic sync
    if (this.config.enableAutoSync) {
      this.startPeriodicSync();
    }
  }

  /**
   * Check current network state
   */
  private async checkNetworkState() {
    try {
      const state = await Network.getNetworkStateAsync();
      const isOnline = state.isInternetReachable === true;

      if (isOnline && !this.lastNetworkState) {
        // Just came online
        await this.triggerSync();
      }

      this.lastNetworkState = isOnline;
      this.notifyListeners(isOnline);
    } catch (error) {
      console.error("Failed to check network state:", error);
    }
  }

  /**
   * Start monitoring network changes
   */
  private startNetworkMonitoring() {
    // Check network state periodically
    setInterval(() => {
      this.checkNetworkState();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync() {
    this.syncTimer = setInterval(async () => {
      const state = await Network.getNetworkStateAsync();
      const isOnline = state.isInternetReachable === true;

      if (!isOnline) {
        return; // Skip if offline
      }

      if (this.config.syncOnWifiOnly) {
        const type = await Network.getNetworkAsync();
        if (type.type !== Network.NetworkStateType.WIFI) {
          return; // Skip if not on WiFi
        }
      }

      await this.triggerSync();
    }, this.config.syncInterval);
  }

  /**
   * Trigger sync
   */
  private async triggerSync() {
    try {
      const status = syncService.getStatus();
      if (!status.isSyncing && status.pendingChanges > 0) {
        await syncService.syncWorkDays();
      }
    } catch (error) {
      console.error("Auto sync failed:", error);
    }
  }

  /**
   * Subscribe to network state changes
   */
  subscribe(listener: (isOnline: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach((listener) => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error("Error in network listener:", error);
      }
    });
  }

  /**
   * Stop auto sync
   */
  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<AutoSyncConfig>) {
    this.config = { ...this.config, ...config };

    // Restart periodic sync if needed
    if (this.config.enableAutoSync && !this.syncTimer) {
      this.startPeriodicSync();
    } else if (!this.config.enableAutoSync && this.syncTimer) {
      this.stop();
    }
  }

  /**
   * Get current config
   */
  getConfig(): AutoSyncConfig {
    return { ...this.config };
  }
}

export const autoSyncService = new AutoSyncService();
