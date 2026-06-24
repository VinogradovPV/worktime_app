# Инструкция по синхронизации

Инструкция по настройке API и переходу Worktime на безопасную синхронизацию с PostgreSQL
Схема: Mobile App → HTTPS API → PostgreSQL. Версия 1.0
Содержание
Целевая архитектура и почему прямой PostgreSQL нужно убрать
Настройка Yandex Cloud, Security Group и сервера
Пошаговая настройка FastAPI backend
Docker Compose, nginx и HTTPS
Минимальная схема БД и API-контракт
Логика синхронизации мобильного приложения
Команда для Мануса по изменению синхронизации
Проверки, приемка, безопасность и дальнейшее развитие
1. Целевая архитектура
Текущая схема Mobile App → PostgreSQL через публичный порт 5432 является проблемной даже при исправной сети. В мобильном приложении нельзя хранить учетные данные БД, нельзя давать клиенту прямой доступ к таблицам и нельзя строить синхронизацию на прямых SQL-запросах из приложения.
Правильная схема для MVP:
React Native App
  ↓ HTTPS
Backend API на VM
  ↓ localhost или Docker network
PostgreSQL в Docker
Целевая production-схема после стабилизации MVP:
React Native App
  ↓ HTTPS
Backend API
  ↓ private network / SSL
Yandex Managed Service for PostgreSQL
2. Настройка Yandex Cloud и сервера
2.1. Security Group
В Security Group для VM оставить только необходимые публичные входящие правила. PostgreSQL не должен быть доступен из интернета.
TCP 443 с 0.0.0.0/0 — публичный HTTPS API.
TCP 80 с 0.0.0.0/0 — только для выпуска сертификата и редиректа на HTTPS.
TCP 22 — только с вашего IP или через VPN.
TCP 5432 — закрыть для публичного интернета.
# Проверка публикации PostgreSQL на VM
docker ps
docker port sync-db

# Проверка с внешней машины: должно быть закрыто
nc -vz 158.160.165.2 5432
2.2. Принцип доступа к БД
PostgreSQL должен быть доступен только backend API. Если API и БД находятся в одной Docker network, API подключается к service name контейнера БД. Если API запущен на хосте, можно подключаться к 127.0.0.1:5432 при условии, что порт проброшен только на localhost.
3. Пошаговая настройка backend API на FastAPI
Подготовить домен: создать A-запись api.example.com → публичный IP VM.
Установить Docker, Docker Compose, nginx и certbot.
Создать каталог /opt/worktime-api.
Создать FastAPI-проект и файл requirements.txt.
Настроить .env с DATABASE_URL, JWT_SECRET и параметрами API.
Запустить API локально и проверить /health.
Настроить Docker Compose или systemd-запуск.
Настроить nginx reverse proxy.
Выпустить HTTPS-сертификат.
Проверить API через curl.
# Установка пакетов на Ubuntu
sudo apt update
sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx git
sudo systemctl enable --now docker nginx
# Создание структуры проекта
sudo mkdir -p /opt/worktime-api
sudo chown -R $USER:$USER /opt/worktime-api
cd /opt/worktime-api
mkdir -p app/{api,core,db,models,schemas,services}
touch app/main.py app/core/config.py app/db/session.py app/services/time_tracking.py
# requirements.txt
fastapi==0.115.6
uvicorn[standard]==0.34.0
SQLAlchemy==2.0.36
psycopg2-binary==2.9.10
pydantic-settings==2.7.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
alembic==1.14.0
# .env пример
APP_ENV=production
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql+psycopg2://sync_user:CHANGE_ME@sync-db:5432/sync_database
JWT_SECRET=CHANGE_ME_LONG_RANDOM_SECRET
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=*
# app/main.py минимальный старт
from fastapi import FastAPI

app = FastAPI(title="Worktime API", version="1.0.0")

@app.get("/health")
def health():
    return {"status": "ok"}
# Локальный запуск
cd /opt/worktime-api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
4. Docker Compose, nginx и HTTPS
Для MVP удобно запускать API и PostgreSQL в Docker Compose. Если БД уже существует, не переносить данные вслепую: адаптировать service name, network и volume под текущую конфигурацию.
version: "3.9"

services:
  api:
    build: .
    container_name: worktime-api
    env_file: .env
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16
    container_name: sync-db
    environment:
      POSTGRES_DB: sync_database
      POSTGRES_USER: sync_user
      POSTGRES_PASSWORD: CHANGE_ME
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
# Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# nginx site: /etc/nginx/sites-available/worktime-api
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
sudo ln -s /etc/nginx/sites-available/worktime-api /etc/nginx/sites-enabled/worktime-api
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.example.com
5. Минимальная схема БД для синхронизации
Для MVP нужны таблицы пользователей, устройств, рабочих дней, событий и журнала синхронизации. Клиент отправляет события, сервер сохраняет их идемпотентно и пересчитывает рабочий день.
-- users
id uuid primary key
email text null
name text not null
role text not null default 'employee'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()

-- devices
id uuid primary key
user_id uuid references users(id)
device_id text not null
platform text not null
last_seen_at timestamptz
created_at timestamptz not null default now()

-- workdays
id uuid primary key
user_id uuid references users(id)
date date not null
status text not null
work_start_at timestamptz null
work_end_at timestamptz null
total_work_ms bigint not null default 0
total_break_ms bigint not null default 0
total_temporary_exit_ms bigint not null default 0
work_95_ms bigint not null default 0
requires_review boolean not null default false
updated_at timestamptz not null default now()
unique(user_id, date)

-- work_events
id uuid primary key
user_id uuid references users(id)
workday_id uuid references workdays(id)
client_event_id text not null
type text not null
timestamp timestamptz not null
source text not null
is_manual boolean not null default false
is_cancelled boolean not null default false
comment text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
unique(user_id, client_event_id)

-- sync_log
id uuid primary key
user_id uuid references users(id)
device_id text not null
client_event_id text not null
operation text not null
status text not null
error_message text null
created_at timestamptz not null default now()
6. Минимальный API-контракт
6.1. Пример отправки событий
POST /api/sync/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceId": "ios-abc-123",
  "events": [
    {
      "clientEventId": "local-uuid-1",
      "type": "work_start",
      "timestamp": "2026-06-22T07:17:11Z",
      "source": "button",
      "isManual": false,
      "comment": null
    }
  ]
}
{
  "status": "ok",
  "results": [
    {
      "clientEventId": "local-uuid-1",
      "serverEventId": "server-uuid-1",
      "syncStatus": "synced",
      "workDay": {
        "date": "2026-06-22",
        "status": "working",
        "totalWorkMs": 4500000,
        "totalBreakMs": 60000,
        "totalTemporaryExitMs": 0,
        "work95Ms": 4275000,
        "requiresReview": false
      }
    }
  ]
}
7. Логика синхронизации мобильного приложения
Приложение должно работать local-first: действие пользователя сохраняется локально сразу, а отправка на сервер происходит в фоне. UI не должен ждать ответа API, иначе кнопка Начать будет зависеть от качества интернета, что звучит как способ сделать людей несчастными.
type SyncStatus =
  | 'local_only'
  | 'pending_sync'
  | 'synced'
  | 'sync_error'
  | 'conflict';

type WorkEvent = {
  id: string;
  serverId?: string;
  clientEventId: string;
  type: WorkEventType;
  timestamp: string;
  source: 'button' | 'manual' | 'geofence_confirmed' | 'system';
  syncStatus: SyncStatus;
  lastSyncAttemptAt?: string;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
};
1. Пользователь нажимает кнопку учета времени.
2. Клиент создает локальное событие с clientEventId.
3. Событие сохраняется локально со статусом pending_sync.
4. UI и таймер обновляются сразу.
5. syncService отправляет пачку pending событий на POST /api/sync/events.
6. Backend валидирует последовательность, сохраняет события и пересчитывает день.
7. Клиент получает serverEventId, syncStatus и пересчитанный WorkDay.
8. Клиент обновляет локальные данные.
9. При ошибке сети событие остается pending_sync и отправляется позже.
10. При конфликте день получает conflict / requires_review.
8. Команда для Мануса
# Команда для Мануса: перейти с прямого PostgreSQL на HTTPS API sync

Нужно изменить архитектуру синхронизации приложения Worktime.

Текущая проблема: приложение пытается синхронизироваться напрямую с PostgreSQL/Yandex Cloud PostgreSQL. Это нужно убрать. Мобильное приложение не должно подключаться к PostgreSQL напрямую.

Целевая схема:

Mobile App → HTTPS REST API → PostgreSQL

## 1. Удалить прямое подключение к PostgreSQL из мобильного приложения

1. Найти весь код, где приложение подключается к PostgreSQL напрямую.
2. Удалить из мобильного приложения DB host, DB port, DB user, DB password, DB name.
3. Удалить или отключить pg-клиент на стороне React Native, если он есть.
4. Убедиться, что в мобильном приложении не осталось секретов БД.
5. Оставить в приложении только API_BASE_URL и токен авторизации.

## 2. Добавить apiClient

Создать сервис: src/services/apiClient.ts

Функции:
- get(path, params?)
- post(path, body?)
- patch(path, body?)
- handleAuthError()
- handleNetworkError()

Все запросы должны идти на API_BASE_URL.

## 3. Добавить syncService

Создать сервис: src/services/syncService.ts

Ответственность:
- найти локальные события со статусом pending_sync;
- отправить их пачкой на POST /api/sync/events;
- принять serverEventId и расчет WorkDay;
- обновить локальные события до synced;
- при ошибке оставить sync_error или pending_sync;
- при конфликте поставить conflict и requires_review.

## 4. Расширить модель WorkEvent

Добавить поля:
- clientEventId
- serverId
- syncStatus
- lastSyncAttemptAt
- syncError

syncStatus:
- local_only
- pending_sync
- synced
- sync_error
- conflict

## 5. Изменить обработку кнопок учета времени

При нажатии Начать / Перерыв / Продолжить / Выйти / Вернуться / Завершить:
1. Создать локальное событие.
2. Сохранить его в AsyncStorage.
3. Обновить UI сразу.
4. Поставить событие в pending_sync.
5. Запустить syncService, если есть интернет.

Нельзя ждать ответа сервера, чтобы обновить таймер.

## 6. Добавить индикатор синхронизации в UI

На главной и в деталях дня показывать статус:
- Синхронизировано
- Ожидает синхронизации
- Ошибка синхронизации
- Конфликт / требуется проверка

## 7. Добавить endpoints в конфиг

.env:
API_BASE_URL=https://api.example.com

Не хранить в .env мобильного приложения DATABASE_URL.

## 8. Обновить календарь и отчеты

Календарь и отчеты должны:
1. использовать локальные данные сразу;
2. после успешной синхронизации обновляться данными сервера;
3. не расходиться с главной страницей;
4. показывать syncStatus, если день не синхронизирован.

## 9. Обработка offline

Если интернета нет:
1. события сохраняются локально;
2. UI работает;
3. события остаются pending_sync;
4. при восстановлении сети syncService отправляет очередь.

## 10. Критерии приемки

1. В мобильном приложении нет прямого подключения к PostgreSQL.
2. В приложении нет DB user/password/host.
3. Все данные уходят через HTTPS API.
4. События сохраняются локально до отправки.
5. События не теряются без интернета.
6. После восстановления сети события синхронизируются.
7. Сервер возвращает пересчитанный WorkDay.
8. UI показывает статус синхронизации.
9. Календарь и отчеты обновляются после синхронизации.
10. Конфликты помечаются как requires_review.
9. Проверка и приемка
9.1. Проверка API
curl -i https://api.example.com/health
curl -i https://api.example.com/api/sync/status
9.2. Проверка закрытия PostgreSQL
# С внешней машины подключение к 5432 должно быть закрыто
nc -vz 158.160.165.2 5432
9.3. Проверка сценариев приложения
Создать событие без интернета: оно остается локально и не теряется.
Включить интернет: событие получает статус synced.
Создать перерыв и завершить перерыв: сервер возвращает корректный пересчет.
Создать конфликт: сервер возвращает requires_review/conflict.
Проверить календарь и отчеты: данные совпадают с главной страницей.
10. Security checklist
PostgreSQL не доступен публично на 5432.
В мобильном приложении нет DATABASE_URL, DB_USER, DB_PASSWORD.
API работает только по HTTPS.
Есть Bearer token или другой механизм авторизации.
Все события привязаны к user_id на сервере.
clientEventId используется для идемпотентности.
Backend валидирует последовательность событий.
Логи не содержат пароли и токены.
CORS настроен осознанно, а не как вечеринка для всего интернета.
11. Дальнейшее развитие
После стабилизации MVP заменить AsyncStorage на SQLite для надежного offline-first хранения.
Добавить refresh tokens и управление устройствами.
Добавить миграции Alembic и CI/CD деплой API.
Перенести БД в Yandex Managed PostgreSQL, когда появится стабильный API-слой.
Добавить резервное копирование и мониторинг API.
12. Использованные публичные источники
Yandex Cloud Managed Service for PostgreSQL: подключение и порт 6432, SSL-сертификаты: https://yandex.cloud/en/docs/managed-postgresql/operations/connect/
Yandex Cloud VPC Security Groups: https://yandex.cloud/en/docs/vpc/concepts/security-groups
Yandex Cloud Certificate Manager / Let's Encrypt certificates: https://yandex.cloud/en/docs/certificate-manager/concepts/managed-certificate
