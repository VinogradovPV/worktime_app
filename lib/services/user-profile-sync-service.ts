/**
 * User Profile Sync Service
 * Сервис для синхронизации профиля пользователя с backend API
 */

import { UserProfile, getUserProfile as getLocalUserProfile, saveUserProfile as saveLocalUserProfile } from '@/lib/storage/userProfileStorage';
import { getBackendApiClient } from './backend-api-client';

interface ProfileSyncResult {
  success: boolean;
  message: string;
}

class UserProfileSyncService {
  private apiClient = getBackendApiClient();
  private userId: string = 'default_user'; // TODO: получать из аутентификации

  /**
   * Синхронизировать профиль пользователя с backend
   */
  async syncUserProfile(): Promise<ProfileSyncResult> {
    try {
      console.log('[ProfileSync] Starting profile sync');

      // Получаем локальный профиль
      const localProfile = await getLocalUserProfile();

      if (!localProfile) {
        return {
          success: false,
          message: 'Local profile not found',
        };
      }

      // Отправляем профиль на backend
      const result = await this.apiClient.updateUserProfile(
        this.userId,
        localProfile
      );

      console.log('[ProfileSync] Profile synced successfully');

      return {
        success: true,
        message: 'Profile synced successfully',
      };
    } catch (error) {
      console.error('[ProfileSync] Sync failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  /**
   * Получить профиль пользователя с backend
   */
  async fetchUserProfile(): Promise<UserProfile | null> {
    try {
      console.log('[ProfileSync] Fetching user profile from backend');

      const remoteProfile = await this.apiClient.getUserProfile(this.userId);

      // Сохраняем полученный профиль локально
      if (remoteProfile) {
        await saveLocalUserProfile(remoteProfile);
        console.log('[ProfileSync] Profile fetched and saved locally');
      }

      return remoteProfile as UserProfile;
    } catch (error) {
      console.error('[ProfileSync] Fetch failed:', error);
      return null;
    }
  }

  /**
   * Обновить поле профиля и синхронизировать
   */
  async updateProfileField(field: keyof UserProfile, value: any): Promise<ProfileSyncResult> {
    try {
      console.log('[ProfileSync] Updating profile field:', field);

      // Получаем локальный профиль
      const localProfile = await getLocalUserProfile();

      if (!localProfile) {
        return {
          success: false,
          message: 'Local profile not found',
        };
      }

      // Обновляем поле
      const updatedProfile = {
        ...localProfile,
        [String(field)]: value,
        updatedAt: new Date().toISOString(),
      };

      // Сохраняем локально
      await saveLocalUserProfile(updatedProfile);

      // Синхронизируем с backend
      await this.apiClient.updateUserProfile(this.userId, updatedProfile);

      console.log('[ProfileSync] Profile field updated and synced');

      return {
        success: true,
        message: `${field} updated successfully`,
      };
    } catch (error) {
      console.error('[ProfileSync] Update failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  /**
   * Установить userId
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Получить текущий userId
   */
  getUserId(): string {
    return this.userId;
  }
}

// Создаем и экспортируем синглтон
let syncServiceInstance: UserProfileSyncService | null = null;

export function getUserProfileSyncService(): UserProfileSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new UserProfileSyncService();
  }
  return syncServiceInstance;
}

export type { ProfileSyncResult };
