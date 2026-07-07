# MVP План - WorkTime App

**Дата:** 2026-07-07  
**Статус:** Активная разработка  
**Версия:** 3.0 (финальная с исправлениями)

---

## 📋 Обзор

Минимально жизнеспособный продукт (MVP) WorkTime App включает:
- ✅ Аутентификацию с JWT токенами (access + refresh)
- ✅ Управление пользователями (регистрация, подтверждение, роли)
- ✅ Справочники (подразделения, должности)
- ✅ Синхронизацию рабочих дней с REST API
- ✅ Базовые административные функции

---

## 🎯 Фазы реализации

### Фаза 1: Критические Auth endpoints (ПРИОРИТЕТ 1)

**Статус:** ✅ Клиент готов, ожидает server endpoints  
**Сроки:** 1-2 дня

#### 1.1 POST /api/v1/auth/login
- **Request:** `{ login, password }`
- **Response:** `{ ok: true, access_token, refresh_token, user }`
- **Логика:**
  - Проверить credentials в БД (bcrypt)
  - Если статус != "active" → ошибка 401
  - Выдать JWT токены (access: 15-30 мин, refresh: 7 дней)
  - Вернуть информацию о пользователе

#### 1.2 POST /api/v1/auth/refresh
- **Request:** `{ refresh_token }`
- **Response:** `{ ok: true, access_token, refresh_token }`
- **Логика:**
  - Проверить валидность refresh token
  - Выдать новые токены
  - Сохранить в клиенте

#### 1.3 POST /api/v1/auth/logout
- **Request:** Bearer token
- **Response:** `{ ok: true }`
- **Логика:**
  - Инвалидировать токены на клиенте
  - Опционально: добавить в blacklist на сервере

#### 1.4 GET /api/v1/auth/me
- **Request:** Bearer token в заголовке
- **Response:** `{ ok: true, user }`
- **Логика:**
  - Проверить валидность токена
  - Вернуть информацию о текущем пользователе

#### 1.5 POST /api/v1/auth/register
- **Request:** `{ login, password, passwordConfirm, displayName, orgUnitId, positionId, comment? }`
- **Response:** `{ ok: true, status: "pending", message }`
- **Логика:**
  - Создать пользователя со статусом "pending"
  - Роль = "user" (не выбирается пользователем)
  - managedOrgUnitId = null
  - **НЕ возвращать токены** (только { ok, status, message })
  - Отправить уведомление администратору
  - Требует подтверждения admin перед активацией

---

### Фаза 2: Admin endpoints (ПРИОРИТЕТ 2)

**Статус:** Планирование  
**Сроки:** 2-3 дня

#### 2.1 GET /api/v1/admin/registration-requests
- **Request:** Bearer token (admin only)
- **Response:** `{ ok, requests: [], total }`
- **Логика:** Получить список заявок на регистрацию

#### 2.2 POST /api/v1/admin/users/{id}/approve
- **Request:** `{ role }`
- **Response:** `{ ok, user }`
- **Логика:** Подтвердить регистрацию и назначить роль

#### 2.3 POST /api/v1/admin/users/{id}/reject
- **Request:** `{ reason? }`
- **Response:** `{ ok }`
- **Логика:** Отклонить регистрацию

#### 2.4 GET /api/v1/admin/users
- **Request:** Bearer token (admin only)
- **Response:** `{ ok, users: [], total }`
- **Логика:** Получить список всех пользователей

#### 2.5 POST /api/v1/admin/users/{id}/reset-password
- **Request:** Bearer token (admin only)
- **Response:** `{ ok, tempPassword }`
- **Логика:** 
  - Сбросить пароль пользователя
  - Генерировать временный пароль
  - Вернуть временный пароль администратору
  - Пользователь должен изменить пароль при первом входе

---

### Фаза 3: Справочники (ПРИОРИТЕТ 3)

**Статус:** Планирование  
**Сроки:** 1 день

#### 3.1 GET /api/v1/directories/org-units
- **Request:** Bearer token
- **Response:** `{ ok, orgUnits: [], total }`

#### 3.2 POST /api/v1/directories/org-units
- **Request:** `{ name, shortName, type, parentId? }` (admin only)
- **Response:** `{ ok, orgUnit }`

#### 3.3 GET /api/v1/directories/positions
- **Request:** Bearer token
- **Response:** `{ ok, positions: [], total }`

#### 3.4 POST /api/v1/directories/positions
- **Request:** `{ name, shortName }` (admin only)
- **Response:** `{ ok, position }`

---

### Фаза 4: Синхронизация (ПРИОРИТЕТ 4)

**Статус:** ✅ Клиент готов  
**Сроки:** 1-2 дня

#### 4.1 POST /api/v1/sync/upload-workdays
- **Request:** `{ workdays: [] }`
- **Response:** `{ ok, synced_count }`

#### 4.2 GET /api/v1/sync/download-workdays
- **Request:** Query params: `from_date`, `to_date`
- **Response:** `{ ok, workdays: [] }`

#### 4.3 GET /api/v1/sync/status
- **Request:** Bearer token
- **Response:** `{ ok, lastSyncAt, pendingCount }`

---

## 📊 Статус реализации

| Компонент | Статус | Комментарий |
|-----------|--------|-----------|
| **Клиент** | ✅ Готов | API типы, auth flow, sync service |
| **Auth endpoints** | ⏳ Ожидает | Нужно реализовать на Express |
| **Admin endpoints** | ⏳ Ожидает | Нужно реализовать на Express |
| **Справочники** | ⏳ Ожидает | Нужно реализовать на Express |
| **Синхронизация** | ⏳ Ожидает | Нужно реализовать на Express |
| **TypeScript** | ✅ 0 ошибок | Все исправлено |
| **Git** | ✅ Синхронизирован | Все изменения запушены |
| **Registration** | ✅ Контракт | Не возвращает токены, требует admin approval |
| **Reset Password** | ✅ Контракт | Возвращает tempPassword, требует смены при входе |

---

## 🔐 Требования безопасности

1. **JWT токены:**
   - Access token: 15-30 минут
   - Refresh token: 7 дней
   - Алгоритм: HS256

2. **Пароли:**
   - Хеширование: bcrypt
   - Никогда не хранить в открытом виде

3. **Аутентификация:**
   - Все endpoints требуют Bearer token (кроме login, register, health)
   - Проверка статуса пользователя (active/pending/blocked)

4. **Авторизация:**
   - Admin endpoints: только для role="admin"
   - User endpoints: для role="user" и role="admin"

---

## 📝 Контрольный список

- [x] Удалены все ссылки на drizzle/db из Expo приложения
- [x] Создан REST API клиент (lib/_core/api.ts)
- [x] Создана конфигурация API (lib/_core/api-config.ts)
- [x] Обновлены типы данных (shared/api-types.ts)
- [x] Переписан syncService для REST API
- [x] Исправлены все TypeScript ошибки
- [x] Git репозиторий синхронизирован
- [ ] Реализованы Auth endpoints на сервере
- [ ] Протестирована аутентификация end-to-end
- [ ] Реализованы Admin endpoints
- [ ] Реализованы Справочники endpoints
- [ ] Протестирована синхронизация
- [ ] Развернуто на production

---

## 🚀 Следующие шаги

1. **Реализовать Auth endpoints** на FastAPI сервере (server/_core/auth-api.ts)
2. **Протестировать login/logout flow** с реальными credentials
3. **Реализовать Admin endpoints** для управления пользователями
4. **Реализовать Справочники endpoints**
5. **Протестировать end-to-end синхронизацию**
