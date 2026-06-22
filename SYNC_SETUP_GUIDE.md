# Полная инструкция по синхронизации Worktime App с облачным сервером

Этот документ содержит пошаговую инструкцию по настройке и использованию синхронизации рабочих дней с облачным сервером.

## Оглавление

1. [Архитектура системы](#архитектура-системы)
2. [Подготовка сервера](#подготовка-сервера)
3. [Настройка базы данных](#настройка-базы-данных)
4. [Конфигурация API](#конфигурация-api)
5. [Настройка мобильного приложения](#настройка-мобильного-приложения)
6. [Тестирование синхронизации](#тестирование-синхронизации)
7. [Решение проблем](#решение-проблем)

---

## Архитектура системы

### Компоненты системы

```
┌─────────────────────────────────────────────────────────────┐
│                    Мобильное приложение (Expo)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  UI слой (React Native компоненты)                   │   │
│  │  - SyncStatusIndicator (индикатор статуса)           │   │
│  │  - useSyncStatus (хук для управления)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Сервис синхронизации (lib/sync/)                    │   │
│  │  - syncService.ts (основной сервис)                 │   │
│  │  - autoSyncService.ts (автоматическая синхр.)       │   │
│  │  - conflictResolutionService.ts (разрешение конфл.) │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Локальное хранилище (AsyncStorage)                  │   │
│  │  - Рабочие дни                                       │   │
│  │  - Статус синхронизации                              │   │
│  │  - Время последней синхронизации                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓ (HTTPS/tRPC)
┌─────────────────────────────────────────────────────────────┐
│                    Облачный сервер (Node.js)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  tRPC API эндпоинты (server/routers.ts)              │   │
│  │  - sync.uploadWorkDays                               │   │
│  │  - sync.downloadWorkDays                             │   │
│  │  - sync.getSyncStatus                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Бизнес-логика (server/db.ts)                        │   │
│  │  - Обработка рабочих дней                            │   │
│  │  - Версионирование                                  │   │
│  │  - Разрешение конфликтов                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  База данных (MySQL/PostgreSQL)                      │   │
│  │  - Таблица workDays                                  │   │
│  │  - Таблица syncLogs                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Поток данных

1. **Мобильное приложение** собирает данные о рабочих днях в локальное хранилище (AsyncStorage)
2. **Сервис синхронизации** проверяет наличие интернета и отправляет данные на сервер
3. **Сервер** получает данные, проверяет версии, разрешает конфликты и сохраняет в БД
4. **Сервер** отправляет обновленные данные обратно на мобильное приложение
5. **Мобильное приложение** обновляет локальное хранилище и отображает статус синхронизации

---

## Подготовка сервера

### Шаг 1: Проверка окружения сервера

Убедитесь, что на сервере установлены:

```bash
# Проверка Node.js
node --version  # Должна быть версия 18+ (рекомендуется 20+)

# Проверка npm/pnpm
npm --version
pnpm --version

# Проверка базы данных
mysql --version  # Если используется MySQL
# или
psql --version  # Если используется PostgreSQL
```

### Шаг 2: Переменные окружения

Создайте файл `.env` в корне проекта с следующими переменными:

```bash
# Сервер
NODE_ENV=production
PORT=3000

# База данных
DB_HOST=localhost
DB_PORT=3306
DB_USER=worktime_user
DB_PASSWORD=secure_password_here
DB_NAME=worktime_db

# Аутентификация
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=7d

# API
API_URL=https://your-server-domain.com
CORS_ORIGIN=https://your-app-domain.com

# Синхронизация
SYNC_TIMEOUT=30000  # 30 секунд
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY=5000    # 5 секунд
```

**Важно:** Никогда не коммитьте `.env` файл в git. Добавьте его в `.gitignore`:

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

---

## Настройка базы данных

### Шаг 1: Создание базы данных

#### Для MySQL:

```bash
# Подключитесь к MySQL
mysql -u root -p

# Создайте базу данных
CREATE DATABASE worktime_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Создайте пользователя
CREATE USER 'worktime_user'@'localhost' IDENTIFIED BY 'secure_password_here';

# Дайте права
GRANT ALL PRIVILEGES ON worktime_db.* TO 'worktime_user'@'localhost';
FLUSH PRIVILEGES;

# Выйдите
EXIT;
```

#### Для PostgreSQL:

```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE worktime_db;

# Создайте пользователя
CREATE USER worktime_user WITH PASSWORD 'secure_password_here';

# Дайте права
ALTER ROLE worktime_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE worktime_db TO worktime_user;

# Выйдите
\q
```

### Шаг 2: Проверка подключения

```bash
# Для MySQL
mysql -u worktime_user -p -h localhost worktime_db

# Для PostgreSQL
psql -U worktime_user -h localhost worktime_db
```

### Шаг 3: Применение миграций Drizzle

```bash
# Перейдите в директорию проекта
cd /path/to/worktime_app

# Установите зависимости (если еще не установлены)
pnpm install

# Сгенерируйте миграции
pnpm run db:push

# Проверьте, что таблицы созданы
# Для MySQL:
mysql -u worktime_user -p worktime_db -e "SHOW TABLES;"

# Для PostgreSQL:
psql -U worktime_user -d worktime_db -c "\dt"
```

### Шаг 4: Структура таблиц

После применения миграций в БД должны быть созданы следующие таблицы:

#### Таблица `users`

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openId VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Таблица `workDays`

```sql
CREATE TABLE workDays (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'not_started',
  events JSON,
  version INT DEFAULT 1,
  lastModified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  UNIQUE KEY unique_user_date (userId, date)
);
```

#### Таблица `syncLogs`

```sql
CREATE TABLE syncLogs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  action VARCHAR(50),
  status VARCHAR(50),
  conflictResolved BOOLEAN DEFAULT FALSE,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

**Проверьте структуру таблиц:**

```bash
# Для MySQL
mysql -u worktime_user -p worktime_db -e "DESCRIBE workDays;"
mysql -u worktime_user -p worktime_db -e "DESCRIBE syncLogs;"

# Для PostgreSQL
psql -U worktime_user -d worktime_db -c "\d workDays"
psql -U worktime_user -d worktime_db -c "\d syncLogs"
```

---

## Конфигурация API

### Шаг 1: Проверка API эндпоинтов

Убедитесь, что в файле `server/routers.ts` определены следующие эндпоинты:

```typescript
// Эндпоинты синхронизации
export const syncRouter = router({
  // Загрузить рабочие дни на сервер
  uploadWorkDays: protectedProcedure
    .input(z.object({
      workDays: z.array(WorkDaySchema),
      lastSyncTime: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Логика загрузки
    }),

  // Скачать обновленные рабочие дни с сервера
  downloadWorkDays: protectedProcedure
    .input(z.object({
      lastSyncTime: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      // Логика скачивания
    }),

  // Получить статус синхронизации
  getSyncStatus: protectedProcedure
    .query(async ({ ctx }) => {
      // Логика получения статуса
    }),
});
```

### Шаг 2: Запуск сервера

```bash
# Перейдите в директорию проекта
cd /path/to/worktime_app

# Установите зависимости
pnpm install

# Запустите сервер в режиме разработки
pnpm run dev

# Или запустите в режиме production
pnpm run build
pnpm run start
```

**Ожидаемый вывод:**

```
> worktime_app@1.0.0 dev
> concurrently -k "pnpm dev:server" "pnpm dev:metro"

[0] > worktime_app@1.0.0 dev:server
[0] > cross-env NODE_ENV=development tsx watch server/_core/index.ts
[0] 
[0] ✓ Server running at http://localhost:3000
[1] 
[1] > worktime_app@1.0.0 dev:metro
[1] > cross-env EXPO_USE_METRO_WORKSPACE_ROOT=1 npx expo start --web --port 8081
[1] 
[1] ✓ Metro bundler ready
[1] ✓ Expo app ready at http://localhost:8081
```

### Шаг 3: Проверка API

Откройте браузер и перейдите на:

```
http://localhost:3000/trpc/sync.getSyncStatus
```

Вы должны получить ответ (может потребоваться аутентификация):

```json
{
  "result": {
    "data": {
      "status": "synced",
      "lastSyncTime": 1624000000000,
      "pendingChanges": 0
    }
  }
}
```

### Шаг 4: Документирование API

Создайте файл `API_DOCUMENTATION.md` с описанием всех эндпоинтов:

```markdown
# API Documentation

## Синхронизация рабочих дней

### POST /trpc/sync.uploadWorkDays

Загрузить рабочие дни на сервер.

**Параметры:**
- `workDays`: Array<WorkDay> - Массив рабочих дней
- `lastSyncTime`: number (опционально) - Время последней синхронизации

**Ответ:**
```json
{
  "result": {
    "data": {
      "uploaded": 5,
      "conflicts": 0,
      "errors": []
    }
  }
}
```

### GET /trpc/sync.downloadWorkDays

Скачать обновленные рабочие дни с сервера.

**Параметры:**
- `lastSyncTime`: number - Время последней синхронизации
- `startDate`: string - Начальная дата (YYYY-MM-DD)
- `endDate`: string - Конечная дата (YYYY-MM-DD)

**Ответ:**
```json
{
  "result": {
    "data": {
      "workDays": [...],
      "lastSyncTime": 1624000000000
    }
  }
}
```

### GET /trpc/sync.getSyncStatus

Получить статус синхронизации.

**Ответ:**
```json
{
  "result": {
    "data": {
      "status": "synced",
      "lastSyncTime": 1624000000000,
      "pendingChanges": 0
    }
  }
}
```
```

---

## Настройка мобильного приложения

### Шаг 1: Конфигурация API клиента

Отредактируйте файл `lib/trpc.ts`:

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../server/routers';

// Установите URL вашего сервера
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const trpc = createTRPCReact<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: `${API_URL}/trpc`,
          async headers() {
            return {
              // Добавьте токен аутентификации, если требуется
              'Authorization': `Bearer ${await getAuthToken()}`,
            };
          },
        }),
      ],
    };
  },
});
```

### Шаг 2: Инициализация синхронизации

В файле `app/_layout.tsx` добавьте инициализацию:

```typescript
import { useEffect } from 'react';
import { syncService } from '@/lib/sync/syncService';
import { autoSyncService } from '@/lib/sync/autoSyncService';

export default function RootLayout() {
  useEffect(() => {
    // Инициализируйте сервис синхронизации
    syncService.init();
    
    // Запустите автоматическую синхронизацию
    autoSyncService.start();
    
    return () => {
      autoSyncService.stop();
    };
  }, []);

  // ... остальной код
}
```

### Шаг 3: Отображение статуса синхронизации

В файле `app/(tabs)/_layout.tsx` добавьте индикатор:

```typescript
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerRight: () => <SyncStatusIndicator />,
        // ... остальные опции
      }}
    >
      {/* Вкладки */}
    </Tabs>
  );
}
```

### Шаг 4: Переменные окружения мобильного приложения

Создайте файл `.env.local` в корне проекта:

```bash
# Для локальной разработки
EXPO_PUBLIC_API_URL=http://localhost:3000

# Для production
# EXPO_PUBLIC_API_URL=https://your-server-domain.com
```

**Важно:** Переменные с префиксом `EXPO_PUBLIC_` доступны в приложении.

### Шаг 5: Проверка подключения

Откройте приложение и проверьте:

1. **Индикатор синхронизации** в header должен показывать статус
2. **Консоль** должна показывать логи синхронизации
3. **Локальное хранилище** должно содержать рабочие дни

```bash
# Проверьте логи в консоли Expo
# Должны быть сообщения вида:
# [Sync] Initializing sync service
# [Sync] Starting auto sync service
# [Sync] Syncing work days...
```

---

## Тестирование синхронизации

### Тест 1: Проверка подключения к БД

```bash
# Подключитесь к БД и проверьте таблицы
mysql -u worktime_user -p worktime_db

# Выполните запрос
SELECT COUNT(*) FROM workDays;
SELECT COUNT(*) FROM syncLogs;
```

### Тест 2: Проверка API эндпоинтов

Используйте инструмент `curl` или Postman:

```bash
# Проверьте доступность сервера
curl -X GET http://localhost:3000/health

# Проверьте API эндпоинт (может потребоваться токен)
curl -X GET http://localhost:3000/trpc/sync.getSyncStatus \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Тест 3: Синхронизация рабочих дней

1. Откройте приложение на мобильном устройстве
2. Нажмите "Начать работу"
3. Добавьте перерыв и выход
4. Завершите рабочий день
5. Проверьте, что индикатор синхронизации показывает "Синхронизируется"
6. После завершения должно показывать "Синхронизировано"

### Тест 4: Проверка данных в БД

```bash
# Проверьте, что рабочие дни сохранены
mysql -u worktime_user -p worktime_db

SELECT * FROM workDays WHERE date = CURDATE();
SELECT * FROM syncLogs ORDER BY created_at DESC LIMIT 5;
```

### Тест 5: Разрешение конфликтов

1. Откройте приложение на двух устройствах
2. На первом устройстве: добавьте рабочий день
3. На втором устройстве: добавьте другой рабочий день на ту же дату
4. Синхронизируйте оба устройства
5. Проверьте, что конфликт разрешен (последнее изменение побеждает)

### Тест 6: Офлайн-синхронизация

1. Отключите интернет на мобильном устройстве
2. Добавьте рабочий день
3. Включите интернет
4. Проверьте, что данные синхронизированы

---

## Решение проблем

### Проблема 1: Ошибка подключения к БД

**Симптомы:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Решение:**

1. Проверьте, что БД запущена:
```bash
# Для MySQL
systemctl status mysql
# или
brew services list | grep mysql

# Для PostgreSQL
systemctl status postgresql
# или
brew services list | grep postgres
```

2. Проверьте учетные данные в `.env`:
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=worktime_user
DB_PASSWORD=correct_password
```

3. Проверьте, что пользователь БД существует:
```bash
mysql -u root -p -e "SELECT user FROM mysql.user;"
```

### Проблема 2: Ошибка аутентификации

**Симптомы:**
```
Error: Authentication failed
```

**Решение:**

1. Проверьте, что токен JWT правильно сгенерирован
2. Проверьте, что токен не истек
3. Проверьте, что токен передается в заголовке `Authorization: Bearer TOKEN`

### Проблема 3: Конфликты синхронизации

**Симптомы:**
```
Conflict detected: Local version 2, Server version 3
```

**Решение:**

1. Проверьте логи в `syncLogs`:
```bash
mysql -u worktime_user -p worktime_db -e "SELECT * FROM syncLogs WHERE conflictResolved = TRUE;"
```

2. Используйте стратегию разрешения конфликтов "последнее изменение побеждает"
3. Проверьте, что версионирование работает правильно

### Проблема 4: Медленная синхронизация

**Симптомы:**
```
Sync taking more than 30 seconds
```

**Решение:**

1. Увеличьте `SYNC_TIMEOUT` в `.env`:
```bash
SYNC_TIMEOUT=60000  # 60 секунд
```

2. Оптимизируйте запросы к БД:
```bash
# Добавьте индексы
mysql -u worktime_user -p worktime_db -e "CREATE INDEX idx_user_date ON workDays(userId, date);"
```

3. Проверьте производительность сети

### Проблема 5: Данные не синхронизируются

**Симптомы:**
```
Sync status: pending
Pending changes: 5
```

**Решение:**

1. Проверьте, что интернет подключен:
```typescript
import { useNetInfo } from '@react-native-community/netinfo';

const netInfo = useNetInfo();
console.log('Is connected:', netInfo.isConnected);
```

2. Проверьте логи синхронизации в консоли Expo
3. Проверьте, что API эндпоинты доступны
4. Попробуйте ручную синхронизацию через UI

### Проблема 6: Ошибка CORS

**Симптомы:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Решение:**

1. Проверьте конфигурацию CORS на сервере в `server/_core/index.ts`:
```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
```

2. Убедитесь, что `CORS_ORIGIN` правильно установлен в `.env`:
```bash
CORS_ORIGIN=http://localhost:8081
```

---

## Мониторинг и логирование

### Логирование на сервере

Добавьте логирование в `server/db.ts`:

```typescript
import { logger } from '@/server/_core/logger';

export async function uploadWorkDays(userId: number, workDays: WorkDay[]) {
  logger.info(`[Sync] Uploading ${workDays.length} work days for user ${userId}`);
  
  try {
    // Логика загрузки
    logger.info(`[Sync] Successfully uploaded work days`);
  } catch (error) {
    logger.error(`[Sync] Error uploading work days: ${error.message}`);
    throw error;
  }
}
```

### Логирование на клиенте

Добавьте логирование в `lib/sync/syncService.ts`:

```typescript
import { logger } from '@/lib/logger';

export async function syncWorkDays() {
  logger.info('[Sync] Starting sync...');
  
  try {
    // Логика синхронизации
    logger.info('[Sync] Sync completed successfully');
  } catch (error) {
    logger.error(`[Sync] Sync failed: ${error.message}`);
  }
}
```

### Просмотр логов

```bash
# Логи сервера (в консоли)
tail -f /var/log/worktime-server.log

# Логи приложения (в консоли Expo)
# Откройте Developer Menu (Cmd+D на iOS, Cmd+M на Android)
# Выберите "Show developer menu"
# Нажмите "Show logs"
```

---

## Чеклист развертывания

Перед развертыванием в production убедитесь:

- [ ] База данных создана и протестирована
- [ ] Переменные окружения установлены в `.env`
- [ ] API эндпоинты работают и протестированы
- [ ] Мобильное приложение подключено к API
- [ ] Синхронизация работает локально
- [ ] Конфликты разрешаются правильно
- [ ] Логирование настроено
- [ ] Сервер запущен в режиме production
- [ ] SSL/TLS сертификаты установлены
- [ ] Резервные копии БД настроены
- [ ] Мониторинг и алерты настроены

---

## Дополнительные ресурсы

- [tRPC документация](https://trpc.io/docs)
- [Drizzle ORM документация](https://orm.drizzle.team)
- [Expo документация](https://docs.expo.dev)
- [React Native документация](https://reactnative.dev)
- [MySQL документация](https://dev.mysql.com/doc)
- [PostgreSQL документация](https://www.postgresql.org/docs)

---

**Версия документа:** 1.0  
**Дата обновления:** 2026-06-22  
**Автор:** Manus AI Assistant
