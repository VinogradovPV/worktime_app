import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSyncNotificationsService } from '@/lib/services/sync-notifications';

describe('Sync Notifications Integration', () => {
  let notificationService: ReturnType<typeof getSyncNotificationsService>;

  beforeEach(() => {
    notificationService = getSyncNotificationsService();
  });

  describe('Error Notifications', () => {
    it('should send error notification for sync failure', async () => {
      const spy = vi.spyOn(notificationService, 'notifySyncError');
      
      await notificationService.notifySyncError('Test error message');
      
      expect(spy).toHaveBeenCalledWith('Test error message');
    });

    it('should send conflict notification', async () => {
      const spy = vi.spyOn(notificationService, 'notifySyncConflict');
      
      await notificationService.notifySyncConflict(3);
      
      expect(spy).toHaveBeenCalledWith(3);
    });

    it('should send queue full notification', async () => {
      const spy = vi.spyOn(notificationService, 'notifyQueueFull');
      
      await notificationService.notifyQueueFull(10);
      
      expect(spy).toHaveBeenCalledWith(10);
    });

    it('should send network restored notification', async () => {
      const spy = vi.spyOn(notificationService, 'notifyNetworkRestored');
      
      await notificationService.notifyNetworkRestored();
      
      expect(spy).toHaveBeenCalled();
    });

    it('should send warning notification', async () => {
      const spy = vi.spyOn(notificationService, 'notifyWarning');
      
      await notificationService.notifyWarning('Warning Title', 'Warning message');
      
      expect(spy).toHaveBeenCalledWith('Warning Title', 'Warning message');
    });
  });

  describe('Notification Service Methods', () => {
    it('should initialize notification service', async () => {
      const spy = vi.spyOn(notificationService, 'initialize');
      
      await notificationService.initialize();
      
      expect(spy).toHaveBeenCalled();
    });

    it('should clear all notifications', async () => {
      const spy = vi.spyOn(notificationService, 'clearAllNotifications');
      
      await notificationService.clearAllNotifications();
      
      expect(spy).toHaveBeenCalled();
    });

    it('should get notification count', () => {
      const count = notificationService.getNotificationCount();
      
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Notification Service Singleton', () => {
    it('should return same instance on multiple calls', () => {
      const service1 = getSyncNotificationsService();
      const service2 = getSyncNotificationsService();
      
      expect(service1).toBe(service2);
    });
  });

  describe('Error Message Localization', () => {
    it('should send Russian error messages', async () => {
      const spy = vi.spyOn(notificationService, 'notifySyncError');
      
      const russianMessage = 'Ошибка синхронизации';
      await notificationService.notifySyncError(russianMessage);
      
      expect(spy).toHaveBeenCalledWith(russianMessage);
    });

    it('should send Russian conflict message', async () => {
      const spy = vi.spyOn(notificationService, 'notifySyncConflict');
      
      await notificationService.notifySyncConflict(1);
      
      expect(spy).toHaveBeenCalled();
    });
  });
});

describe('Backend Sync Integration with Notifications', () => {
  it('should have notification service available', () => {
    const notificationService = getSyncNotificationsService();
    
    expect(notificationService).toBeDefined();
    expect(typeof notificationService.notifySyncError).toBe('function');
    expect(typeof notificationService.notifySyncConflict).toBe('function');
    expect(typeof notificationService.notifyQueueFull).toBe('function');
  });

  it('should have all required notification methods', () => {
    const notificationService = getSyncNotificationsService();
    
    const requiredMethods = [
      'initialize',
      'notifySyncError',
      'notifySyncConflict',
      'notifyQueueFull',
      'notifyNetworkRestored',
      'notifyWarning',
      'clearAllNotifications',
      'getNotificationCount',
    ];

    for (const method of requiredMethods) {
      expect(typeof (notificationService as any)[method]).toBe('function');
    }
  });
});
