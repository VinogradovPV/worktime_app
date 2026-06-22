# Полная инструкция по синхронизации Worktime App с облачным сервером

> **Статус выполнения:** Обновлено 2026-06-22. Шаги, выполненные автоматически, отмечены ✅. Шаги, требующие доступа к серверу, отмечены ⏳.

Этот документ содержит пошаговую инструкцию по настройке и использованию синхронизации рабочих дней с облачным сервером.

## Оглавление

1. [Архитектура системы](#архитектура-системы)
2. [Подготовка сервера](#подготовка-сервера) ⏳
3. [Настройка базы данных](#настройка-базы-данных) ⏳
4. [Конфигурация API](#конфигурация-api) ✅
5. [Настройка мобильного приложения](#настройка-мобильного-приложения) ✅
6. [Тестирование синхронизации](#тестирование-синхронизации) ⏳
7. [Решение проблем](#решение-проблем)

---

## Архитектура системы

### Компоненты системы

```
┌─────────────────────────────────────────────────────────────┐
│                    Мобильное приложение (Expo)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  UI слой (React Native компоненты)                   │   │
│  │  - SyncStatusIndicator (индикатор статуса)     ✅    │   │
│  │  - useSyncStatus (хук для управления)          ✅    │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Сервис синхронизации (lib/sync/)                    │   │
│  │  - syncService.ts (основной сервис)            ✅    │   │
│  │  - autoSyncService.ts (автоматическая синхр.)  ✅    │   │
│  │  - conflictResolutionService.ts (конфликты)    ✅    │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Локальное хранилище (AsyncStorage)                  │   │
│  │  - Рабочие дни                                 ✅    │   │
│  │  - Статус синхронизации                        ✅    │   │
│  │  - Время последней синхронизации               ✅    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓ (HTTPS/tRPC)
┌─────────────────────────────────────────────────────────────┐
│                    Облачный сервер (Node.js)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  tRPC API эндпоинты (server/routers.ts)              │   │
│  │  - sync.uploadWorkDays                         ✅    │   │
│  │  - sync.downloadWorkDays                       ✅    │   │
│  │  - sync.getSyncStatus                          ✅    │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Бизнес-логика (server/db.ts)                        │   │
│  │  - Обработка рабочих дней                      ✅    │   │
│  │  - Версионирование                             ✅    │   │
│  │  - Разрешение конфликтов                       ✅    │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  База данных (MySQL)                                 │   │
│  │  - Таблица workDays (схема готова)             ✅    │   │
│  │  - Таблица syncLogs (схема готова)             ✅    │   │
│  │  - Создание БД и применение миграций           ⏳    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Поток данных

1. Мобильное приложение собирает данные о рабочих днях в локальное хранилище (AsyncStorage)
2. Сервис синхронизации проверяет наличие интернета и отправляет данные на сервер
3. Сервер получает данные, проверяет версии, разрешает конфликты и сохраняет в БД
4. Сервер отправляет обновлённые данные обратно на мобильное приложение
5. Мобильное приложение обновляет локальное хранилище и отображает статус синхронизации

---

## Подготовка сервера ⏳

> **Статус:** Требует доступа к серверу. Выполните эти шаги на вашем облачном сервере.

### Шаг 1: Проверка окружения сервера ⏳

Убедитесь, что на сервере установлены:

```bash
# Проверка Node.js (требуется версия 18+, рекомендуется 20+)
node --version

# Проверка pnpm
pnpm --version

# Проверка базы данных
mysql --version
```

### Шаг 2: Переменные окружения ⏳

> **Важно:** Правильное название переменной для URL API — `EXPO_PUBLIC_API_BASE_URL` (не `EXPO_PUBLIC_API_URL`). На web-платформе URL определяется автоматически из hostname, поэтому для web-превью эта переменная не обязательна.

Создайте файл `.env` в корне проекта с следующими переменными:

```env
# Сервер
NODE_ENV=production
PORT=3000

# База данных (используется сервером в runtime)
DB_HOST=localhost
DB_PORT=3306
DB_USER=worktime_user
DB_PASSWORD=secure_password_here
DB_NAME=worktime_db

# База данных (используется Drizzle CLI для миграций)
DATABASE_URL=mysql://worktime_user:secure_password_here@localhost:3306/worktime_db

# Аутентификация
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=7d

# API (используется мобильным приложением на нативных платформах iOS/Android)
# На web-платформе URL определяется автоматически из hostname — эта переменная не нужна
EXPO_PUBLIC_API_BASE_URL=https://your-server-domain.com

# CORS
CORS_ORIGIN=https://your-app-domain.com

# Синхронизация
SYNC_TIMEOUT=30000
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY=5000
```

Добавьте `.env` в `.gitignore`:

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

---

## Настройка базы данных ⏳

> **Статус:** Схема таблиц готова (`drizzle/schema.ts` ✅). Требуется создать БД и применить миграции на сервере.

### Шаг 1: Создание базы данных ⏳

Для MySQL:

```sql
-- Подключитесь к MySQL
mysql -u root -p

-- Создайте базу данных
CREATE DATABASE worktime_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Создайте пользователя
CREATE USER 'worktime_user'@'localhost' IDENTIFIED BY 'secure_password_here';

-- Дайте права
GRANT ALL PRIVILEGES ON worktime_db.* TO 'worktime_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Шаг 2: Проверка подключения ⏳

```bash
mysql -u worktime_user -p -h localhost worktime_db
```

### Шаг 3: Применение миграций Drizzle ⏳

> **Предварительное условие:** Переменная `DATABASE_URL` должна быть установлена в `.env`.

```bash
cd /path/to/worktime_app
pnpm install

# Применить миграции
pnpm run db:push

# Проверить, что таблицы созданы
mysql -u worktime_user -p worktime_db -e "SHOW TABLES;"
```

Ожидаемый результат:

```
+------------------------+
| Tables_in_worktime_db  |
+------------------------+
| users                  |
| workDays               |
| syncLogs               |
+------------------------+
```

### Шаг 4: Структура таблиц ✅

> **Статус:** Схема таблиц реализована в `drizzle/schema.ts`. Актуальная структура:

**Таблица `workDays`** — хранит рабочие дни, синхронизированные с мобильного приложения:

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | `INT PK AI` | Суррогатный первичный ключ |
| `userId` | `INT FK` | Ссылка на `users.id` |
| `date` | `VARCHAR(10)` | Дата в формате `YYYY-MM-DD` |
| `dayType` | `ENUM` | Тип дня: `workday`, `weekend`, `holiday`, `vacation`, `shortened_workday` |
| `totalWorkedMs` | `INT` | Рабочее время в мс |
| `totalBreakMs` | `INT` | Время перерывов в мс |
| `totalTemporaryExitMs` | `INT` | Время временных выходов в мс |
| `eventsJson` | `TEXT` | JSON-массив событий рабочего дня |
| `syncedAt` | `TIMESTAMP` | Время синхронизации |
| `version` | `INT` | Версия для разрешения конфликтов |
| `createdAt` | `TIMESTAMP` | Дата создания |
| `updatedAt` | `TIMESTAMP` | Дата обновления |

**Уникальный индекс:** `(userId, date)` — один рабочий день на пользователя.

**Таблица `syncLogs`** — журнал событий синхронизации:

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | `INT PK AI` | Суррогатный первичный ключ |
| `userId` | `INT FK` | Ссылка на `users.id` |
| `action` | `ENUM` | Тип: `upload`, `download`, `conflict`, `error` |
| `workDayId` | `INT` | ID рабочего дня (опционально) |
| `date` | `VARCHAR(10)` | Дата рабочего дня (опционально) |
| `status` | `ENUM` | Статус: `success`, `failed`, `pending` |
| `errorMessage` | `TEXT` | Сообщение об ошибке |
| `createdAt` | `TIMESTAMP` | Время события |

---

## Конфигурация API ✅

> **Статус:** Полностью реализовано. Все эндпоинты готовы к работе.

### Шаг 1: Проверка API эндпоинтов ✅

В файле `server/routers.ts` определены следующие эндпоинты синхронизации:

```typescript
sync: router({
  // Загрузить рабочие дни на сервер
  uploadWorkDays: protectedProcedure
    .input(z.object({
      workDays: z.array(z.object({
        date: z.string(),
        dayType: z.enum(["workday", "weekend", "holiday", "vacation", "shortened_workday"]),
        totalWorkedMs: z.number(),
        totalBreakMs: z.number(),
        totalTemporaryExitMs: z.number(),
        eventsJson: z.string(),
        version: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Upsert каждого рабочего дня + логирование в syncLogs
    }),

  // Скачать обновлённые рабочие дни с сервера
  downloadWorkDays: protectedProcedure
    .input(z.object({ since: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // Возвращает дни, изменённые после указанного времени
    }),

  // Получить статус синхронизации
  getSyncStatus: protectedProcedure
    .query(async ({ ctx }) => {
      // Возвращает lastSyncTime и syncHistory (последние 10 событий)
    }),
}),
```

Полная документация API — в файле `API_DOCUMENTATION.md`.

### Шаг 2: Запуск сервера ⏳

```bash
cd /path/to/worktime_app
pnpm install

# Режим разработки
pnpm run dev

# Режим production
pnpm run build
pnpm run start
```

Ожидаемый вывод:

```
[0] ✓ Server running at http://localhost:3000
[1] ✓ Metro bundler ready
[1] ✓ Expo app ready at http://localhost:8081
```

### Шаг 3: Проверка API ⏳

```bash
curl -X GET http://localhost:3000/api/trpc/sync.getSyncStatus \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Шаг 4: Документирование API ✅

Файл `API_DOCUMENTATION.md` создан и содержит полное описание всех эндпоинтов, схему БД, коды ошибок и пример полного цикла синхронизации.

---

## Настройка мобильного приложения ✅

> **Статус:** Полностью реализовано. Все компоненты готовы.

### Шаг 1: Конфигурация API клиента ✅

Файл `lib/trpc.ts` уже настроен. API URL определяется через `getApiBaseUrl()` из `constants/oauth.ts`:

- **На web:** URL определяется автоматически из hostname (заменяет порт `8081-` на `3000-`)
- **На iOS/Android:** Используется переменная `EXPO_PUBLIC_API_BASE_URL` из `.env`

```typescript
// lib/trpc.ts — уже реализовано
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        transformer: superjson,
        async headers() {
          const token = await Auth.getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        fetch(url, options) {
          return fetch(url, { ...options, credentials: "include" });
        },
      }),
    ],
  });
}
```

### Шаг 2: Инициализация синхронизации ✅

В файле `app/_layout.tsx` уже добавлена инициализация:

```typescript
// app/_layout.tsx — уже реализовано
useEffect(() => {
  const initSync = async () => {
    await syncService.init();
    await autoSyncService.init({
      enableAutoSync: true,
      syncOnWifiOnly: false,
      syncInterval: 5 * 60 * 1000, // 5 минут
    });
  };
  initSync().catch(console.error);

  return () => {
    autoSyncService.stop();
  };
}, []);
```

### Шаг 3: Отображение статуса синхронизации ✅

Компонент `SyncStatusIndicator` создан в `components/SyncStatusIndicator.tsx`. Для добавления в header вкладок отредактируйте `app/(tabs)/_layout.tsx`:

```typescript
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => (
          <SyncStatusIndicator
            onSyncPress={() => syncService.syncWorkDays()}
          />
        ),
      }}
    >
      {/* Вкладки */}
    </Tabs>
  );
}
```

### Шаг 4: Переменные окружения мобильного приложения ⏳

> **Важно:** Переменная называется `EXPO_PUBLIC_API_BASE_URL`, а не `EXPO_PUBLIC_API_URL`.

Для нативных платформ (iOS/Android) создайте `.env.local`:

```env
# Для локальной разработки (iOS/Android)
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000

# Для production (iOS/Android)
# EXPO_PUBLIC_API_BASE_URL=https://your-server-domain.com
```

> **Примечание:** На web-платформе эта переменная не нужна — URL определяется автоматически.

### Шаг 5: Проверка подключения ⏳

После запуска сервера откройте приложение и проверьте:

- Индикатор синхронизации в header показывает статус
- В консоли Expo присутствуют логи: `[Sync] Initializing sync service`
- При наличии несинхронизированных данных индикатор показывает жёлтый счётчик

---

## Тестирование синхронизации ⏳

> **Статус:** Все тесты требуют запущенного сервера и БД.

### Тест 1: Проверка подключения к БД ⏳

```sql
mysql -u worktime_user -p worktime_db
SELECT COUNT(*) FROM workDays;
SELECT COUNT(*) FROM syncLogs;
```

### Тест 2: Проверка API эндпоинтов ⏳

```bash
# Проверьте доступность сервера
curl -X GET http://localhost:3000/health

# Проверьте API эндпоинт
curl -X GET "http://localhost:3000/api/trpc/sync.getSyncStatus" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Тест 3: Синхронизация рабочих дней ⏳

1. Откройте приложение на мобильном устройстве
2. Нажмите «Начать работу»
3. Добавьте перерыв и выход
4. Завершите рабочий день
5. Проверьте, что индикатор синхронизации показывает «Синхронизируется»
6. После завершения должно показывать «Синхронизировано»

### Тест 4: Проверка данных в БД ⏳

```sql
SELECT * FROM workDays WHERE date = CURDATE();
SELECT * FROM syncLogs ORDER BY created_at DESC LIMIT 5;
```

### Тест 5: Разрешение конфликтов ⏳

1. Откройте приложение на двух устройствах
2. На первом устройстве: добавьте рабочий день
3. На втором устройстве: добавьте другой рабочий день на ту же дату
4. Синхронизируйте оба устройства
5. Проверьте, что конфликт разрешён (последнее изменение побеждает)

### Тест 6: Офлайн-синхронизация ⏳

1. Отключите интернет на мобильном устройстве
2. Добавьте рабочий день
3. Включите интернет
4. Проверьте, что данные синхронизированы

---

## Решение проблем

### Проблема 1: Ошибка подключения к БД

**Симптомы:** `Error: connect ECONNREFUSED 127.0.0.1:3306`

**Решение:**

```bash
# Проверьте, что БД запущена
systemctl status mysql
# или
brew services list | grep mysql

# Проверьте учётные данные в .env
DB_HOST=localhost
DB_PORT=3306
DB_USER=worktime_user
DB_PASSWORD=correct_password
```

### Проблема 2: Ошибка аутентификации

**Симптомы:** `Error: Authentication failed`

**Решение:** Проверьте, что токен JWT правильно сгенерирован, не истёк и передаётся в заголовке `Authorization: Bearer TOKEN`.

### Проблема 3: Конфликты синхронизации

**Симптомы:** `Conflict detected: Local version 2, Server version 3`

**Решение:**

```sql
-- Проверьте логи конфликтов
SELECT * FROM syncLogs WHERE action = 'conflict' ORDER BY createdAt DESC LIMIT 10;
```

Стратегия разрешения конфликтов — «последнее изменение побеждает» (реализована в `conflictResolutionService.ts`).

### Проблема 4: Медленная синхронизация

**Симптомы:** Синхронизация занимает более 30 секунд.

**Решение:**

```env
# Увеличьте таймаут в .env
SYNC_TIMEOUT=60000
```

```sql
-- Добавьте индексы для ускорения запросов
CREATE INDEX idx_user_date ON workDays(userId, date);
CREATE INDEX idx_user_updated ON workDays(userId, updatedAt);
```

### Проблема 5: Данные не синхронизируются

**Симптомы:** `Sync status: pending`, `Pending changes: 5`

**Решение:** Проверьте подключение к интернету, доступность API эндпоинтов и попробуйте ручную синхронизацию через UI (нажмите на индикатор синхронизации).

### Проблема 6: Ошибка CORS

**Симптомы:** `Access to XMLHttpRequest blocked by CORS policy`

**Решение:** Проверьте конфигурацию CORS в `server/_core/index.ts` и убедитесь, что `CORS_ORIGIN` правильно установлен в `.env`:

```env
CORS_ORIGIN=http://localhost:8081
```

### Проблема 7: Неверная переменная окружения API URL

**Симптомы:** Приложение не подключается к серверу на iOS/Android.

**Решение:** Убедитесь, что используется правильное название переменной:

```env
# ✅ Правильно
EXPO_PUBLIC_API_BASE_URL=https://your-server-domain.com

# ❌ Неправильно (устаревшее название)
EXPO_PUBLIC_API_URL=https://your-server-domain.com
```

---

## Мониторинг и логирование

### Логирование на сервере

Сервер автоматически записывает все события синхронизации в таблицу `syncLogs`. Для просмотра:

```sql
-- Последние 20 событий
SELECT action, status, errorMessage, createdAt
FROM syncLogs
ORDER BY createdAt DESC
LIMIT 20;

-- Ошибки за последние 24 часа
SELECT * FROM syncLogs
WHERE status = 'failed'
AND createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR);
```

### Логирование на клиенте

Сервис синхронизации выводит логи в консоль Expo с префиксом `[Sync]`. Для просмотра откройте Developer Menu (Cmd+D на iOS, Cmd+M на Android) и выберите «Show logs».

---

## Чеклист развёртывания

| Шаг | Статус | Описание |
|-----|--------|----------|
| Схема БД (`drizzle/schema.ts`) | ✅ Готово | Таблицы `workDays`, `syncLogs` определены |
| tRPC роутер `sync` | ✅ Готово | Все 3 эндпоинта реализованы в `server/routers.ts` |
| Функции БД (`server/db.ts`) | ✅ Готово | `upsertWorkDay`, `getUnsyncedWorkDays`, `logSyncEvent` и др. |
| `syncService.ts` | ✅ Готово | Основной сервис синхронизации |
| `autoSyncService.ts` | ✅ Готово | Автоматическая синхронизация каждые 5 минут |
| `conflictResolutionService.ts` | ✅ Готово | Стратегия «последнее изменение побеждает» |
| `useSyncStatus` хук | ✅ Готово | Хук для управления статусом синхронизации |
| `SyncStatusIndicator` компонент | ✅ Готово | Визуальный индикатор статуса |
| Инициализация в `_layout.tsx` | ✅ Готово | Автозапуск синхронизации при старте приложения |
| `API_DOCUMENTATION.md` | ✅ Готово | Полная документация API |
| `getAllWorkDays()` в workdayService | ✅ Готово | Получение всех рабочих дней для синхронизации |
| Создание БД на сервере | ⏳ Требует сервера | Выполнить команды из раздела «Настройка БД» |
| Переменные окружения `.env` | ⏳ Требует сервера | Создать `.env` с реальными значениями |
| Применение миграций (`db:push`) | ⏳ Требует сервера | Выполнить `pnpm run db:push` |
| Запуск сервера | ⏳ Требует сервера | Выполнить `pnpm run start` |
| Тестирование API | ⏳ Требует сервера | Проверить эндпоинты через curl/Postman |
| SSL/TLS сертификаты | ⏳ Требует сервера | Настроить HTTPS для production |
| Резервные копии БД | ⏳ Требует сервера | Настроить автоматические бэкапы |
| Мониторинг и алерты | ⏳ Требует сервера | Настроить уведомления об ошибках |

---

## Дополнительные ресурсы

- [tRPC документация](https://trpc.io/docs)
- [Drizzle ORM документация](https://orm.drizzle.team)
- [Expo документация](https://docs.expo.dev)
- [React Native документация](https://reactnative.dev/docs)
- [MySQL документация](https://dev.mysql.com/doc/)

---

*Версия документа: 2.0 | Обновлено: 2026-06-22*
