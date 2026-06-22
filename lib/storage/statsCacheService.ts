import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReportPeriodStats, ReportDayStats } from './reportStatsService';

/**
 * Интерфейс для кэшированной статистики
 */
interface CachedStats {
  data: ReportPeriodStats;
  timestamp: number;
  ttl: number; // Time to live в миллисекундах
}

/**
 * Интерфейс для кэшированных дневных статистик
 */
interface CachedDayStats {
  data: ReportDayStats[];
  timestamp: number;
  ttl: number;
}

/**
 * Сервис кэширования статистики
 * 
 * Использует AsyncStorage для сохранения результатов расчетов
 * и предотвращает повторные вычисления для одних и тех же периодов.
 */
class StatsCacheService {
  private readonly CACHE_PREFIX = 'stats_cache_';
  private readonly DAY_STATS_PREFIX = 'day_stats_cache_';
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 минут
  private memoryCache: Map<string, CachedStats> = new Map();
  private dayStatsMemoryCache: Map<string, CachedDayStats> = new Map();

  /**
   * Генерирует ключ кэша на основе параметров периода
   */
  private generateCacheKey(
    startDate: string,
    endDate: string,
    mode: 'day' | 'week' | 'month' | 'quarter' | 'year'
  ): string {
    return `${this.CACHE_PREFIX}${mode}_${startDate}_${endDate}`;
  }

  /**
   * Генерирует ключ кэша для дневной статистики
   */
  private generateDayStatsCacheKey(
    startDate: string,
    endDate: string
  ): string {
    return `${this.DAY_STATS_PREFIX}${startDate}_${endDate}`;
  }

  /**
   * Проверяет, истек ли кэш
   */
  private isExpired(cached: CachedStats | CachedDayStats): boolean {
    const now = Date.now();
    return now - cached.timestamp > cached.ttl;
  }

  /**
   * Получает кэшированную статистику периода
   */
  async getCachedPeriodStats(
    startDate: string,
    endDate: string,
    mode: 'day' | 'week' | 'month' | 'quarter' | 'year'
  ): Promise<ReportPeriodStats | null> {
    const key = this.generateCacheKey(startDate, endDate, mode);

    // Проверяем кэш в памяти
    const memCached = this.memoryCache.get(key);
    if (memCached && !this.isExpired(memCached)) {
      return memCached.data;
    }

    // Проверяем AsyncStorage
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedStats;
        if (!this.isExpired(parsed)) {
          // Восстанавливаем в кэш памяти
          this.memoryCache.set(key, parsed);
          return parsed.data;
        } else {
          // Удаляем истекший кэш
          await AsyncStorage.removeItem(key);
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Ошибка при чтении кэша статистики:', error);
    }

    return null;
  }

  /**
   * Сохраняет кэшированную статистику периода
   */
  async setCachedPeriodStats(
    startDate: string,
    endDate: string,
    mode: 'day' | 'week' | 'month' | 'quarter' | 'year',
    stats: ReportPeriodStats,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    const key = this.generateCacheKey(startDate, endDate, mode);
    const cached: CachedStats = {
      data: stats,
      timestamp: Date.now(),
      ttl,
    };

    // Сохраняем в кэш памяти
    this.memoryCache.set(key, cached);

    // Сохраняем в AsyncStorage
    try {
      await AsyncStorage.setItem(key, JSON.stringify(cached));
    } catch (error) {
      console.error('Ошибка при сохранении кэша статистики:', error);
    }
  }

  /**
   * Получает кэшированную дневную статистику
   */
  async getCachedDayStats(
    startDate: string,
    endDate: string
  ): Promise<ReportDayStats[] | null> {
    const key = this.generateDayStatsCacheKey(startDate, endDate);

    // Проверяем кэш в памяти
    const memCached = this.dayStatsMemoryCache.get(key);
    if (memCached && !this.isExpired(memCached)) {
      return memCached.data;
    }

    // Проверяем AsyncStorage
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedDayStats;
        if (!this.isExpired(parsed)) {
          // Восстанавливаем в кэш памяти
          this.dayStatsMemoryCache.set(key, parsed);
          return parsed.data;
        } else {
          // Удаляем истекший кэш
          await AsyncStorage.removeItem(key);
          this.dayStatsMemoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Ошибка при чтении кэша дневной статистики:', error);
    }

    return null;
  }

  /**
   * Сохраняет кэшированную дневную статистику
   */
  async setCachedDayStats(
    startDate: string,
    endDate: string,
    stats: ReportDayStats[],
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    const key = this.generateDayStatsCacheKey(startDate, endDate);
    const cached: CachedDayStats = {
      data: stats,
      timestamp: Date.now(),
      ttl,
    };

    // Сохраняем в кэш памяти
    this.dayStatsMemoryCache.set(key, cached);

    // Сохраняем в AsyncStorage
    try {
      await AsyncStorage.setItem(key, JSON.stringify(cached));
    } catch (error) {
      console.error('Ошибка при сохранении кэша дневной статистики:', error);
    }
  }

  /**
   * Инвалидирует кэш для конкретного периода
   */
  async invalidatePeriodCache(
    startDate: string,
    endDate: string,
    mode?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  ): Promise<void> {
    if (mode) {
      const key = this.generateCacheKey(startDate, endDate, mode);
      this.memoryCache.delete(key);
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.error('Ошибка при инвалидации кэша периода:', error);
      }
    } else {
      // Инвалидируем все режимы для этого периода
      const modes: Array<'day' | 'week' | 'month' | 'quarter' | 'year'> = [
        'day',
        'week',
        'month',
        'quarter',
        'year',
      ];
      for (const m of modes) {
        const key = this.generateCacheKey(startDate, endDate, m);
        this.memoryCache.delete(key);
        try {
          await AsyncStorage.removeItem(key);
        } catch (error) {
          console.error('Ошибка при инвалидации кэша периода:', error);
        }
      }
    }
  }

  /**
   * Инвалидирует кэш дневной статистики
   */
  async invalidateDayStatsCache(startDate: string, endDate: string): Promise<void> {
    const key = this.generateDayStatsCacheKey(startDate, endDate);
    this.dayStatsMemoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Ошибка при инвалидации кэша дневной статистики:', error);
    }
  }

  /**
   * Очищает весь кэш
   */
  async clearAllCache(): Promise<void> {
    this.memoryCache.clear();
    this.dayStatsMemoryCache.clear();

    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(
        (k) => k.startsWith(this.CACHE_PREFIX) || k.startsWith(this.DAY_STATS_PREFIX)
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Ошибка при очистке кэша:', error);
    }
  }

  /**
   * Получает информацию о размере кэша
   */
  async getCacheInfo(): Promise<{
    memoryCacheSize: number;
    dayStatsCacheSize: number;
    totalCachedPeriods: number;
  }> {
    return {
      memoryCacheSize: this.memoryCache.size,
      dayStatsCacheSize: this.dayStatsMemoryCache.size,
      totalCachedPeriods: this.memoryCache.size + this.dayStatsMemoryCache.size,
    };
  }
}

// Экспортируем синглтон
export const statsCacheService = new StatsCacheService();
