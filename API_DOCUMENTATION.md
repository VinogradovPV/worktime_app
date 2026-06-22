# API Documentation — Worktime App

Документация по API эндпоинтам синхронизации рабочих дней с облачным сервером.

**Версия:** 1.0  
**Дата обновления:** 2026-06-22  
**Протокол:** tRPC v11 + SuperJSON через HTTP Batch Link  
**Базовый URL:** `https://<your-server-domain>/api/trpc`

---

## Аутентификация

Все защищённые эндпоинты (`protectedProcedure`) требуют передачи токена сессии в заголовке:

```
Authorization: Bearer <session_token>
```

Токен сессии получается после OAuth-авторизации через Manus и хранится в `SecureStore` (нативные платформы) или cookie `app_session_id` (web).

---

## Эндпоинты синхронизации

### POST `/api/trpc/sync.uploadWorkDays`

Загружает рабочие дни с мобильного устройства на сервер. Выполняет upsert (создание или обновление) каждого переданного дня. При обновлении автоматически увеличивает версию записи для разрешения конфликтов.

**Требует аутентификации:** да

**Тело запроса:**

```json
{
  "workDays": [
    {
      "date": "2026-06-22",
      "dayType": "workday",
      "totalWorkedMs": 28800000,
      "totalBreakMs": 3600000,
      "totalTemporaryExitMs": 0,
      "eventsJson": "[{\"type\":\"work_start\",\"createdAt\":\"2026-06-22T09:00:00.000Z\"}]",
      "version": 1
    }
  ]
}
```

**Параметры `workDays[*]`:**

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `date` | `string` | да | Дата в формате `YYYY-MM-DD` |
| `dayType` | `enum` | да | Тип дня: `workday`, `weekend`, `holiday`, `vacation`, `shortened_workday` |
| `totalWorkedMs` | `number` | да | Суммарное рабочее время в миллисекундах |
| `totalBreakMs` | `number` | да | Суммарное время перерывов в миллисекундах |
| `totalTemporaryExitMs` | `number` | да | Суммарное время временных выходов в миллисекундах |
| `eventsJson` | `string` | да | JSON-строка с массивом событий рабочего дня |
| `version` | `number` | да | Версия записи для разрешения конфликтов |

**Ответ (200 OK):**

```json
{
  "result": {
    "data": {
      "success": true,
      "count": 5
    }
  }
}
```

**Поля ответа:**

| Поле | Тип | Описание |
|------|-----|----------|
| `success` | `boolean` | Признак успешной загрузки |
| `count` | `number` | Количество обработанных рабочих дней |

---

### GET `/api/trpc/sync.downloadWorkDays`

Скачивает рабочие дни с сервера, изменённые после указанного времени. Используется для получения данных, изменённых на других устройствах.

**Требует аутентификации:** да

**Параметры запроса (query string):**

| Параметр | Тип | Обязательно | Описание |
|----------|-----|-------------|----------|
| `since` | `string` | нет | ISO 8601 дата-время. Если не указано — возвращаются все записи |

**Пример запроса:**

```
GET /api/trpc/sync.downloadWorkDays?input={"since":"2026-06-01T00:00:00.000Z"}
```

**Ответ (200 OK):**

```json
{
  "result": {
    "data": {
      "workDays": [
        {
          "id": 42,
          "date": "2026-06-22",
          "dayType": "workday",
          "totalWorkedMs": 28800000,
          "totalBreakMs": 3600000,
          "totalTemporaryExitMs": 0,
          "eventsJson": "[...]",
          "version": 2,
          "syncedAt": "2026-06-22T18:00:00.000Z",
          "updatedAt": "2026-06-22T18:00:00.000Z"
        }
      ]
    }
  }
}
```

**Поля `workDays[*]`:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `number` | Серверный идентификатор записи |
| `date` | `string` | Дата в формате `YYYY-MM-DD` |
| `dayType` | `string` | Тип дня |
| `totalWorkedMs` | `number` | Рабочее время в мс |
| `totalBreakMs` | `number` | Время перерывов в мс |
| `totalTemporaryExitMs` | `number` | Время временных выходов в мс |
| `eventsJson` | `string` | JSON-строка событий |
| `version` | `number` | Версия для разрешения конфликтов |
| `syncedAt` | `string` | Время последней синхронизации (ISO 8601) |
| `updatedAt` | `string` | Время последнего обновления (ISO 8601) |

---

### GET `/api/trpc/sync.getSyncStatus`

Возвращает статус синхронизации текущего пользователя: время последней синхронизации и историю последних 10 событий.

**Требует аутентификации:** да

**Ответ (200 OK):**

```json
{
  "result": {
    "data": {
      "lastSyncTime": "2026-06-22T18:00:00.000Z",
      "syncHistory": [
        {
          "id": 101,
          "action": "upload",
          "status": "success",
          "errorMessage": null,
          "createdAt": "2026-06-22T18:00:00.000Z"
        }
      ]
    }
  }
}
```

**Поля ответа:**

| Поле | Тип | Описание |
|------|-----|----------|
| `lastSyncTime` | `string \| null` | Время последней успешной синхронизации (ISO 8601) |
| `syncHistory` | `array` | Последние 10 событий синхронизации |
| `syncHistory[*].action` | `string` | Тип действия: `upload`, `download`, `conflict`, `error` |
| `syncHistory[*].status` | `string` | Статус: `success`, `failed`, `pending` |
| `syncHistory[*].errorMessage` | `string \| null` | Сообщение об ошибке (если есть) |

---

## Схема базы данных

### Таблица `users`

Хранит пользователей, авторизованных через Manus OAuth.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | `INT PK AI` | Суррогатный первичный ключ |
| `openId` | `VARCHAR(64) UNIQUE` | Manus OAuth идентификатор |
| `name` | `TEXT` | Имя пользователя |
| `email` | `VARCHAR(320)` | Email пользователя |
| `loginMethod` | `VARCHAR(64)` | Метод входа |
| `role` | `ENUM('user','admin')` | Роль пользователя |
| `createdAt` | `TIMESTAMP` | Дата создания |
| `updatedAt` | `TIMESTAMP` | Дата обновления |
| `lastSignedIn` | `TIMESTAMP` | Последний вход |

### Таблица `workDays`

Хранит рабочие дни, синхронизированные с мобильного приложения.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | `INT PK AI` | Суррогатный первичный ключ |
| `userId` | `INT FK` | Ссылка на `users.id` |
| `date` | `VARCHAR(10)` | Дата в формате `YYYY-MM-DD` |
| `dayType` | `ENUM` | Тип дня (workday, weekend, holiday, vacation, shortened_workday) |
| `totalWorkedMs` | `INT` | Рабочее время в мс |
| `totalBreakMs` | `INT` | Время перерывов в мс |
| `totalTemporaryExitMs` | `INT` | Время временных выходов в мс |
| `eventsJson` | `TEXT` | JSON-массив событий |
| `syncedAt` | `TIMESTAMP` | Время синхронизации |
| `version` | `INT` | Версия для разрешения конфликтов |
| `createdAt` | `TIMESTAMP` | Дата создания |
| `updatedAt` | `TIMESTAMP` | Дата обновления |

**Уникальный индекс:** `(userId, date)` — один рабочий день на пользователя.

### Таблица `syncLogs`

Журнал событий синхронизации для отладки и мониторинга.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | `INT PK AI` | Суррогатный первичный ключ |
| `userId` | `INT FK` | Ссылка на `users.id` |
| `action` | `ENUM` | Тип действия: `upload`, `download`, `conflict`, `error` |
| `workDayId` | `INT` | ID рабочего дня (опционально) |
| `date` | `VARCHAR(10)` | Дата рабочего дня (опционально) |
| `status` | `ENUM` | Статус: `success`, `failed`, `pending` |
| `errorMessage` | `TEXT` | Сообщение об ошибке |
| `createdAt` | `TIMESTAMP` | Время события |

---

## Коды ошибок

| HTTP код | tRPC код | Описание |
|----------|----------|----------|
| 401 | `UNAUTHORIZED` | Токен отсутствует или недействителен |
| 403 | `FORBIDDEN` | Доступ запрещён |
| 404 | `NOT_FOUND` | Ресурс не найден |
| 429 | `TOO_MANY_REQUESTS` | Превышен лимит запросов |
| 500 | `INTERNAL_SERVER_ERROR` | Внутренняя ошибка сервера |

---

## Пример полного цикла синхронизации

```typescript
// 1. Получить все локальные рабочие дни
const allWorkDays = await getAllWorkDays();

// 2. Отфильтровать изменённые после последней синхронизации
const lastSyncTime = await AsyncStorage.getItem('@worktime_last_sync_time');
const pending = allWorkDays.filter(d => 
  new Date(d.updatedAt) > new Date(lastSyncTime ?? 0)
);

// 3. Загрузить изменения на сервер
await trpc.sync.uploadWorkDays.mutate({
  workDays: pending.map(d => ({
    date: d.date,
    dayType: 'workday',
    totalWorkedMs: d.totalWorkMs,
    totalBreakMs: d.totalBreakMs,
    totalTemporaryExitMs: d.totalTemporaryExitMs,
    eventsJson: JSON.stringify(d.events),
    version: 1,
  }))
});

// 4. Скачать обновления с сервера
const { workDays: serverDays } = await trpc.sync.downloadWorkDays.query({
  since: lastSyncTime ?? undefined
});

// 5. Сохранить серверные данные локально
for (const serverDay of serverDays) {
  await saveWorkDay({ ...serverDay, events: JSON.parse(serverDay.eventsJson) });
}

// 6. Обновить время последней синхронизации
await AsyncStorage.setItem('@worktime_last_sync_time', new Date().toISOString());
```
