import { WorkDay } from "@/shared/types/workday";

export interface ConflictResolutionStrategy {
  type: "local-wins" | "server-wins" | "merge" | "manual";
}

export interface ConflictInfo {
  date: string;
  localVersion: number;
  serverVersion: number;
  localData: WorkDay;
  serverData: WorkDay;
}

export interface ConflictResolution {
  date: string;
  resolved: boolean;
  strategy: ConflictResolutionStrategy["type"];
  resolvedData?: WorkDay;
  error?: string;
}

class ConflictResolutionService {
  /**
   * Detect conflicts between local and server versions
   */
  detectConflict(localDay: WorkDay, serverDay: WorkDay): ConflictInfo | null {
    const localVersion = localDay.version || 1;
    const serverVersion = serverDay.version || 1;

    // No conflict if versions match
    if (localVersion === serverVersion) {
      return null;
    }

    // Check if data actually differs
    if (this.dataEquals(localDay, serverDay)) {
      return null;
    }

    return {
      date: localDay.date,
      localVersion,
      serverVersion,
      localData: localDay,
      serverData: serverDay,
    };
  }

  /**
   * Resolve conflict using specified strategy
   */
  resolveConflict(
    conflict: ConflictInfo,
    strategy: ConflictResolutionStrategy["type"]
  ): ConflictResolution {
    try {
      let resolvedData: WorkDay;

      switch (strategy) {
        case "local-wins":
          resolvedData = conflict.localData;
          break;

        case "server-wins":
          resolvedData = conflict.serverData;
          break;

        case "merge":
          resolvedData = this.mergeWorkDays(conflict.localData, conflict.serverData);
          break;

        case "manual":
          // Return unresolved for manual resolution
          return {
            date: conflict.date,
            resolved: false,
            strategy: "manual",
            error: "Manual resolution required",
          };

        default:
          throw new Error(`Unknown resolution strategy: ${strategy}`);
      }

      return {
        date: conflict.date,
        resolved: true,
        strategy,
        resolvedData,
      };
    } catch (error) {
      return {
        date: conflict.date,
        resolved: false,
        strategy,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Merge two work days intelligently
   */
  private mergeWorkDays(localDay: WorkDay, serverDay: WorkDay): WorkDay {
    // Use the version with more recent timestamp
    const localTime = new Date(localDay.updatedAt).getTime();
    const serverTime = new Date(serverDay.updatedAt).getTime();

    if (localTime > serverTime) {
      // Local is more recent, but merge events
      return {
        ...localDay,
        events: this.mergeEvents(localDay.events, serverDay.events),
        version: Math.max(localDay.version || 1, serverDay.version || 1) + 1,
        updatedAt: new Date(),
      };
    } else {
      // Server is more recent
      return {
        ...serverDay,
        events: this.mergeEvents(localDay.events, serverDay.events),
        version: Math.max(localDay.version || 1, serverDay.version || 1) + 1,
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Merge events from two work days
   */
  private mergeEvents(localEvents: any[], serverEvents: any[]) {
    // Create a map of events by timestamp
    const eventMap = new Map<number, any>();

    // Add server events first
    for (const event of serverEvents) {
      const key = this.getEventKey(event);
      eventMap.set(key, event);
    }

    // Add local events, overwriting server events if they're more recent
    for (const event of localEvents) {
      const key = this.getEventKey(event);
      const existing = eventMap.get(key);

      if (!existing || new Date(event.createdAt) > new Date(existing.createdAt)) {
        eventMap.set(key, event);
      }
    }

    // Convert back to array and sort by timestamp
    return Array.from(eventMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * Get unique key for an event
   */
  private getEventKey(event: any): number {
    return new Date(event.createdAt).getTime();
  }

  /**
   * Check if two work days have the same data
   */
  private dataEquals(day1: WorkDay, day2: WorkDay): boolean {
    if (day1.date !== day2.date) return false;
    if (day1.dayType !== day2.dayType) return false;
    if (day1.totalWorkedMs !== day2.totalWorkedMs) return false;
    if (day1.totalBreakMs !== day2.totalBreakMs) return false;
    if (day1.totalTemporaryExitMs !== day2.totalTemporaryExitMs) return false;
    if (day1.events.length !== day2.events.length) return false;

    // Compare events
    for (let i = 0; i < day1.events.length; i++) {
      if (!this.eventsEqual(day1.events[i], day2.events[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if two events are equal
   */
  private eventsEqual(event1: any, event2: any): boolean {
    return (
      event1.type === event2.type &&
      event1.startTime === event2.startTime &&
      event1.endTime === event2.endTime &&
      event1.createdAt === event2.createdAt
    );
  }

  /**
   * Get default resolution strategy based on conflict info
   */
  getDefaultStrategy(conflict: ConflictInfo): ConflictResolutionStrategy["type"] {
    // If server version is significantly newer, use server-wins
    if (conflict.serverVersion > conflict.localVersion + 2) {
      return "server-wins";
    }

    // If local version is newer, use local-wins
    if (conflict.localVersion > conflict.serverVersion) {
      return "local-wins";
    }

    // Otherwise, try to merge
    return "merge";
  }
}

export const conflictResolutionService = new ConflictResolutionService();
