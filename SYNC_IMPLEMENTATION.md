# Реализация синхронизации API в Worktime

## Обзор

Реализована полная система синхронизации между мобильным приложением и backend API. Система использует **local-first подход**: события сохраняются локально, затем отправляются на сервер при наличии сети.

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                  React Native App                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  UI Компоненты (Home, Calendar, Reports)        │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │                                        │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │  useSync Hook                                    │   │
│  │  - Управление синхронизацией                     │   │
│  │  - Отслеживание статуса                          │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │                                        │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │  SyncService                                     │   │
│  │  - Отправка батчей событий                      │   │
│  │  - Retry логика                                 │   │
│  │  - Обработка конфликтов                         │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │                                        │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │  SyncStorage (AsyncStorage)                      │   │
│  │  - Очередь pending_sync событий                  │   │
│  │  - Статистика синхронизации                      │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │                                        │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │  WorkDayStorage (AsyncStorage)                   │   │
│  │  - Локальные рабочие дни                         │   │
│  │  - События рабочего времени                      │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │                                        │
└─────────────────┼────────────────────────────────────────┘
                  │ HTTPS
                  │ POST /api/v1/sync/events
                  │ GET /api/v1/workdays/{date}
                  ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (FastAPI)                       │
├─────────────────────────────────────────────────────────┤
│  - Валидация событий                                    │
│  - Идемпотентный upsert по client_event_id             │
│  - Пересчет рабочего дня                               │
│  - Обнаружение конфликтов                              │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL Database                         │
├─────────────────────────────────────────────────────────┤
│  - users, devices, workdays, events, sync_log          │
└─────────────────────────────────────────────────────────┘
```

## Структура данных

### WorkEvent (локальное событие)

```typescript
interface WorkEvent {
  id: string;                    // UUID
  client_event_id: string;       // Для идемпотентности
  type: WorkEventType;           // start, break_start, break_end, etc.
  timestamp: string;             // ISO 8601
  duration_seconds?: number;     // Для перерывов
  sync_status: SyncStatus;       // pending_sync, synced, error, etc.
  server_event_id?: string;      // ID на сервере
  sync_error?: string;           // Текст ошибки
  created_at: string;
  updated_at: string;
}
```

### SyncStatus (статусы синхронизации)

- **pending_sync** — событие ожидает отправки на сервер
- **synced** — событие успешно синхронизировано
- **error** — ошибка при синхронизации (сеть, валидация)
- **requires_review** — конфликт, требуется проверка
- **conflict** — обнаружен конфликт данных

## Использование

### 1. Инициализация в приложении

```typescript
import { useSync } from '@/hooks/use-sync';

export default function HomeScreen() {
  const { status, pending_count, error_count, sync } = useSync(userId);

  return (
    <View>
      <SyncStatusBadge 
        status={status}
        pending_count={pending_count}
        error_count={error_count}
      />
      
      <Button title="Синхронизировать" onPress={() => sync()} />
    </View>
  );
}
```

### 2. Добавление события в очередь

```typescript
import { addEventToSyncQueue } from '@/lib/services/sync-storage';

// После создания события рабочего времени
const event: WorkEvent = {
  id: generateUUID(),
  client_event_id: generateUUID(),
  type: 'start',
  timestamp: new Date().toISOString(),
  sync_status: 'pending_sync',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

await addEventToSyncQueue(userId, event);
```

### 3. Выполнение синхронизации

```typescript
const { sync } = useSync(userId);

const result = await sync();

if (result?.success) {
  console.log(`Синхронизировано: ${result.synced_count}`);
  console.log(`Ошибок: ${result.failed_count}`);
  console.log(`Конфликтов: ${result.conflict_count}`);
}
```

### 4. Отслеживание статуса

```typescript
const { status, is_syncing, api_available, last_sync_at } = useSync(userId);

// Отображение статуса
<SyncStatusDetails
  status={status}
  pending_count={pending_count}
  error_count={error_count}
  last_sync_at={last_sync_at}
/>
```

## Конфигурация

### Environment переменные

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
EXPO_PUBLIC_API_TOKEN=your_bearer_token
```

### Параметры синхронизации

```typescript
const config: SyncConfig = {
  api_base_url: 'https://api.example.com',
  api_timeout_ms: 30000,           // 30 секунд
  max_retry_attempts: 3,           // 3 попытки
  retry_delay_ms: 1000,            // Начальная задержка 1 сек
  retry_backoff_multiplier: 2,     // Экспоненциальная задержка
  batch_size: 50,                  // 50 событий за раз
  auto_sync_enabled: true,         // Автосинхронизация
  auto_sync_interval_ms: 30000,    // Каждые 30 секунд
  sync_on_network_change: true,    // При восстановлении сети
};
```

## API Контракт

### Отправка событий

**POST /api/v1/sync/events**

```json
{
  "user_id": "uuid",
  "device_id": "uuid",
  "events": [
    {
      "client_event_id": "uuid",
      "user_id": "uuid",
      "date": "2026-06-24",
      "type": "start",
      "timestamp": "2026-06-24T09:00:00Z",
      "duration_seconds": null,
      "device_id": "uuid",
      "app_version": "1.0.0"
    }
  ],
  "app_version": "1.0.0",
  "timestamp": "2026-06-24T09:00:00Z"
}
```

### Ответ сервера

```json
{
  "success": true,
  "events": [
    {
      "server_event_id": "uuid",
      "client_event_id": "uuid",
      "status": "accepted"
    }
  ],
  "workday_summary": {
    "date": "2026-06-24",
    "status": "working",
    "total_work_seconds": 3600,
    "total_break_seconds": 0,
    "total_temporary_exit_seconds": 0,
    "work_intervals": [
      {
        "start": "2026-06-24T09:00:00Z",
        "end": null,
        "duration_seconds": 3600
      }
    ],
    "last_sync_at": "2026-06-24T09:00:00Z",
    "requires_review": false
  },
  "server_timestamp": "2026-06-24T09:00:00Z"
}
```

## Обработка ошибок

### Сетевые ошибки

- Автоматический retry с экспоненциальной задержкой
- События остаются в очереди
- Синхронизация повторяется при восстановлении сети

### Конфликты данных

- Сервер обнаруживает конфликты (например, невозможно начать перерыв если не в работе)
- Событие получает статус `requires_review`
- Пользователю показывается уведомление о необходимости проверки

### Валидационные ошибки

- Сервер возвращает статус `rejected`
- Событие получает статус `error` с описанием ошибки
- Пользователю показывается ошибка

## Тестирование

### Тестирование offline режима

```typescript
// Отключить сеть в приложении
// События продолжат сохраняться локально
// При восстановлении сети синхронизация произойдет автоматически
```

### Тестирование конфликтов

```typescript
// Попытаться начать перерыв без начала работы
// Сервер вернет конфликт
// Событие получит статус requires_review
```

### Тестирование retry логики

```typescript
// Отключить API сервер
// Приложение будет повторять попытки синхронизации
// При включении сервера синхронизация произойдет
```

## Troubleshooting

### События не синхронизируются

1. Проверить наличие сети: `useSync().api_available`
2. Проверить наличие pending событий: `useSync().pending_count`
3. Проверить логи: `console.log('[SyncService]')`
4. Проверить конфигурацию API: `EXPO_PUBLIC_API_BASE_URL`

### Конфликты при синхронизации

1. Проверить статус рабочего дня на сервере
2. Проверить последовательность событий
3. Разрешить конфликт вручную или автоматически

### Высокое потребление трафика

1. Увеличить `auto_sync_interval_ms` (например, до 60000)
2. Уменьшить `batch_size` если много событий
3. Отключить `sync_on_network_change` если часто меняется сеть

## Дальнейшее развитие

1. **Сжатие данных** — использовать gzip для больших батчей
2. **Кэширование** — кэшировать рабочие дни на клиенте
3. **Шифрование** — шифровать чувствительные данные
4. **Аналитика** — отслеживать метрики синхронизации
5. **Оффлайн-первый** — полная поддержка работы без сети
6. **Синхронизация конфликтов** — автоматическое разрешение конфликтов

## Файлы реализации

- `shared/types/sync.ts` — типы данных
- `lib/_core/sync-config.ts` — конфигурация
- `lib/services/sync-storage.ts` — локальное хранилище
- `lib/services/sync-service.ts` — главный сервис
- `components/sync-status-badge.tsx` — UI компоненты
- `hooks/use-sync.ts` — хук для использования
