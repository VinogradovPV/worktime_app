# Оптимизация потребления батареи в Worktime

## Проблема

Синхронизация каждые 30 секунд потребляет много батареи:
- **2880 синхронизаций в день** (24ч × 60мин × 60сек ÷ 30сек)
- Каждая синхронизация: пробуждение CPU, включение радио, HTTP запрос, парсинг JSON
- Даже если нет данных, это потребляет энергию

## Решение: AdaptiveSyncManager

Адаптивный менеджер синхронизации автоматически выбирает оптимальный интервал в зависимости от активности пользователя.

### Режимы синхронизации

| Режим | Интервал | Условие | Потребление |
|-------|----------|---------|-------------|
| **Активный** | 60 сек | Пользователь создает события | Нормальное |
| **Неактивный** | 5 мин | Нет событий 5+ минут | Низкое |
| **Ночной** | Отключено | 00:00-06:00 | Минимальное |
| **Offline** | 15 мин | Нет интернета | Очень низкое |

### Экономия батареи

**Сравнение потребления:**

```
Рабочий день (8 часов активности):
  Старый способ: 960 запросов
  Новый способ: 480 запросов
  Экономия: 50%

Ночь (8 часов сна):
  Старый способ: 960 запросов
  Новый способ: 0 запросов
  Экономия: 100%

Неактивность (8 часов перерыва):
  Старый способ: 960 запросов
  Новый способ: 96 запросов
  Экономия: 90%

ИТОГО за день:
  Старый способ: 2880 запросов
  Новый способ: 576 запросов
  Экономия: 80%
```

## Использование

### Инициализация

```typescript
import { initializeAdaptiveSyncManager } from '@/lib/services/adaptive-sync-manager';

// В app/_layout.tsx
useEffect(() => {
  const initialize = async () => {
    await initializeAdaptiveSyncManager(userId, {
      active_sync_interval_ms: 60000,    // 60 сек при активности
      idle_sync_interval_ms: 300000,     // 5 мин при неактивности
      idle_threshold_ms: 300000,         // 5 мин без событий
      enable_night_sync: false,          // Отключить ночью
    });
  };
  
  initialize();
}, [userId]);
```

### Запись события

При создании нового события вызовите `recordSyncEvent()`:

```typescript
import { recordSyncEvent } from '@/lib/services/adaptive-sync-manager';

// После создания события
await addEventToSyncQueue(userId, event);
recordSyncEvent(); // Переход в активный режим + немедленная синхронизация
```

### Получение статистики

```typescript
import { getAdaptiveSyncManager } from '@/lib/services/adaptive-sync-manager';

const manager = getAdaptiveSyncManager();
const stats = manager?.getStats();

console.log('Режим:', stats?.mode);           // 'active', 'idle', 'night', 'offline'
console.log('Интервал:', stats?.interval_ms); // Текущий интервал в мс
console.log('Сеть:', stats?.is_online);       // true/false
console.log('Время с события:', stats?.time_since_last_event_ms); // мс
```

## Конфигурация

### Параметры AdaptiveSyncManager

```typescript
interface AdaptiveSyncConfig {
  // Интервал синхронизации при активности (мс)
  active_sync_interval_ms: number;

  // Интервал синхронизации при неактивности (мс)
  idle_sync_interval_ms: number;

  // Порог неактивности (мс) — если нет событий дольше, переход в idle режим
  idle_threshold_ms: number;

  // Начало ночного режима (час)
  night_start_hour: number;

  // Конец ночного режима (час)
  night_end_hour: number;

  // Отключить синхронизацию ночью
  enable_night_sync: boolean;

  // Синхронизировать немедленно при создании события
  enable_event_driven_sync: boolean;

  // Синхронизировать при восстановлении сети
  enable_network_change_sync: boolean;
}
```

### Рекомендуемые значения

**Для экономии батареи (по умолчанию):**
```typescript
{
  active_sync_interval_ms: 60000,       // 60 сек
  idle_sync_interval_ms: 300000,        // 5 мин
  idle_threshold_ms: 300000,            // 5 мин
  night_start_hour: 0,
  night_end_hour: 6,
  enable_night_sync: false,
  enable_event_driven_sync: true,
  enable_network_change_sync: true,
}
```

**Для максимальной актуальности (если критично):**
```typescript
{
  active_sync_interval_ms: 30000,       // 30 сек
  idle_sync_interval_ms: 120000,        // 2 мин
  idle_threshold_ms: 600000,            // 10 мин
  night_start_hour: 0,
  night_end_hour: 6,
  enable_night_sync: false,
  enable_event_driven_sync: true,
  enable_network_change_sync: true,
}
```

## Как это работает

### Алгоритм выбора режима

```
1. Проверить сеть
   ├─ Нет сети? → Режим OFFLINE (15 мин)
   └─ Есть сеть? → Перейти к шагу 2

2. Проверить время
   ├─ Ночное время (00:00-06:00)? → Режим NIGHT (отключено)
   └─ Дневное время? → Перейти к шагу 3

3. Проверить активность
   ├─ Есть события? → Режим ACTIVE (60 сек)
   └─ Нет событий 5+ мин? → Режим IDLE (5 мин)
```

### Переходы между режимами

```
ACTIVE (60s)
  ├─ Новое событие → остаться в ACTIVE
  ├─ 5 мин без событий → перейти в IDLE
  └─ Потеря сети → перейти в OFFLINE

IDLE (5min)
  ├─ Новое событие → перейти в ACTIVE
  ├─ Потеря сети → перейти в OFFLINE
  └─ Ночное время → перейти в NIGHT

NIGHT (отключено)
  ├─ Восстановление сети → перейти в IDLE
  ├─ Новое событие → перейти в ACTIVE
  └─ Конец ночи (06:00) → перейти в IDLE

OFFLINE (15min)
  ├─ Восстановление сети → перейти в IDLE (+ немедленная синхронизация)
  ├─ Новое событие → остаться в OFFLINE (сохранить локально)
  └─ Ночное время → перейти в NIGHT
```

## Мониторинг

### Логирование

AdaptiveSyncManager логирует все переходы режимов:

```
[AdaptiveSyncManager] Инициализация
[AdaptiveSyncManager] Режим: active, интервал: 60s
[AdaptiveSyncManager] Событие записано, переход в активный режим
[AdaptiveSyncManager] Режим: idle, интервал: 300s
[AdaptiveSyncManager] Сеть: отключена
[AdaptiveSyncManager] Режим: offline, интервал: 900s
[AdaptiveSyncManager] Восстановлена сеть, синхронизация...
```

### Метрики для аналитики

Рекомендуется отслеживать:

1. **Режимы синхронизации** — сколько времени в каждом режиме
2. **Количество синхронизаций** — сравнить с ожидаемым
3. **Потребление батареи** — до и после внедрения
4. **Задержка синхронизации** — время между событием и отправкой

## Troubleshooting

### События не синхронизируются

1. Проверить режим: `manager?.getStats().mode`
2. Если NIGHT или OFFLINE — это нормально
3. Если ACTIVE/IDLE — проверить логи SyncService

### Слишком частая синхронизация

1. Увеличить `active_sync_interval_ms` (например, до 120000)
2. Увеличить `idle_threshold_ms` (например, до 600000)

### Слишком редкая синхронизация

1. Уменьшить `idle_sync_interval_ms` (например, до 120000)
2. Отключить `enable_night_sync: false` → `true`

## Интеграция с UI

### Отображение режима синхронизации

```typescript
const manager = getAdaptiveSyncManager();
const stats = manager?.getStats();

<Text>Режим: {stats?.mode}</Text>
<Text>Интервал: {(stats?.interval_ms / 1000).toFixed(0)}s</Text>
<Text>Сеть: {stats?.is_online ? 'Подключена' : 'Отключена'}</Text>
```

### Индикатор режима

```typescript
const getModeColor = (mode: SyncMode) => {
  switch (mode) {
    case 'active': return '#22C55E';  // Зеленый
    case 'idle': return '#F59E0B';    // Желтый
    case 'night': return '#6B7280';   // Серый
    case 'offline': return '#EF4444'; // Красный
  }
};

<View style={{ backgroundColor: getModeColor(stats?.mode) }} />
```

## Дальнейшее развитие

1. **Машинное обучение** — предсказывать активность пользователя
2. **Геолокация** — отключать синхронизацию вне рабочего места
3. **Уровень батареи** — более агрессивная экономия при низком уровне
4. **Приоритеты событий** — синхронизировать важные события немедленно
5. **Кэширование** — кэшировать рабочие дни для offline доступа
