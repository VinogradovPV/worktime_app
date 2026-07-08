# MVP План - WorkTime App

**Дата:** 8 июля 2026  
**Статус:** Активная разработка  
**Версия:** 5.0 (исправленная структура)

---

## 📋 Обзор

Минимально жизнеспособный продукт (MVP) WorkTime App включает:
- ✅ Аутентификацию с JWT токенами (access + refresh)
- ✅ Управление пользователями (регистрация, подтверждение, роли)
- ✅ Справочники (подразделения, должности) - публичные для регистрации
- ✅ Синхронизацию рабочих дней с REST API
- ✅ Административные функции с логированием
- ✅ Аудит всех действий администратора

**Backend Stack:** Express/TypeScript сервер в этом репозитории (server/_core/)

---

## 🎯 Фазы реализации

### Фаза 1: Критические Auth endpoints (ПРИОРИТЕТ 1)

**Статус:** ⏳ В разработке  
**Сроки:** 2-3 дня

Эта фаза включает все критические endpoints аутентификации и регистрации, необходимые для работы приложения.

#### 1.1 POST /api/v1/auth/register
- **Request:** `{ login, password, passwordConfirm, displayName, orgUnitId, positionId, comment? }`
- **Response:** `{ ok: true, status: "pending", message }`
- **Логика:**
  - Создать пользователя со статусом "pending"
  - Роль = "user" (не выбирается пользователем)
  - managedOrgUnitId = null
  - **НЕ возвращать токены** (только { ok, status, message })
  - Отправить уведомление администратору
  - Требует подтверждения admin перед активацией

#### 1.2 POST /api/v1/auth/login
- **Request:** `{ login, password }`
- **Response (active):** `{ ok: true, access_token, refresh_token, user }`
- **Response (password_reset_required):** `{ ok: true, requiresPasswordChange: true, access_token, user }`
- **Логика:**
  - Проверить credentials в БД (bcrypt)
  - **Статус active:** Выдать полные JWT токены (access: 15-30 мин, refresh: 7 дней)
  - **Статус password_reset_required:** Выдать access_token (ограниченный), requiresPasswordChange=true, НЕ выдавать refresh_token
  - **Статус pending:** Вернуть 403 Forbidden (ожидание подтверждения admin)
  - **Статус blocked:** Вернуть 403 Forbidden (пользователь заблокирован)
  - **Статус rejected:** Вернуть 403 Forbidden (заявка отклонена)
  - Вернуть информацию о пользователе

#### 1.3 POST /api/v1/auth/refresh
- **Request:** `{ refresh_token }`
- **Response:** `{ ok: true, access_token, refresh_token }`
- **Логика:**
  - Проверить валидность refresh token
  - Выдать новые токены
  - Сохранить в клиенте

#### 1.4 POST /api/v1/auth/logout
- **Request:** Bearer token
- **Response:** `{ ok: true }`
- **Логика:**
  - Инвалидировать токены на клиенте
  - Опционально: добавить в blacklist на сервере

#### 1.5 GET /api/v1/auth/me
- **Request:** Bearer token в заголовке
- **Response:** `{ ok: true, user }`
- **Логика:**
  - Проверить валидность токена
  - Вернуть информацию о текущем пользователе

#### 1.6 POST /api/v1/auth/change-password
- **Request:** `{ current_password, new_password }`
- **Response:** `{ ok: true, access_token, refresh_token, user }`
- **Логика:**
  - Проверить текущий пароль (используя старый пароль)
  - Обновить пароль с bcrypt
  - Если status = "password_reset_required" → изменить на "active"
  - Выдать новые полные токены (access + refresh)
  - Инвалидировать старые токены
  - Вернуть обновленную информацию о пользователе

**Ограничение доступа для password_reset_required:**
- Пользователь с requiresPasswordChange=true может вызвать ТОЛЬКО POST /api/v1/auth/change-password
- Все остальные endpoints должны проверить status и вернуть 403 если status != "active"
- После успешной смены пароля status = "active" и доступ полностью восстанавливается

---

### Фаза 2: Справочники (ПРИОРИТЕТ 2)

**Статус:** Планирование  
**Сроки:** 1-2 дня

#### 2.1 GET /api/v1/directories/org-units (публичный)
- **Request:** Без аутентификации
- **Response:** `{ ok, org_units: [], total }`
- **Логика:** Получить список активных подразделений (isActive=true)
- **Использование:** Форма регистрации, выбор подразделения

#### 2.2 GET /api/v1/directories/positions (публичный)
- **Request:** Без аутентификации
- **Response:** `{ ok, positions: [], total }`
- **Логика:** Получить список активных должностей (isActive=true)
- **Использование:** Форма регистрации, выбор должности

#### 2.3 POST /api/v1/directories/org-units (admin only)
- **Request:** `{ name, short_name, type, parent_id? }`
- **Response:** `{ ok, org_unit }`
- **Логика:** Создать новое подразделение
- **Логирование:** Записать в audit_logs

#### 2.4 PATCH /api/v1/directories/org-units/{id} (admin only)
- **Request:** `{ name?, short_name?, type?, parent_id?, isActive? }`
- **Response:** `{ ok, org_unit }`
- **Логика:** Обновить подразделение
- **Логирование:** Записать в audit_logs

#### 2.5 POST /api/v1/directories/positions (admin only)
- **Request:** `{ name, short_name }`
- **Response:** `{ ok, position }`
- **Логика:** Создать новую должность
- **Логирование:** Записать в audit_logs

#### 2.6 PATCH /api/v1/directories/positions/{id} (admin only)
- **Request:** `{ name?, short_name?, isActive? }`
- **Response:** `{ ok, position }`
- **Логика:** Обновить должность
- **Логирование:** Записать в audit_logs

---

### Фаза 3: Admin endpoints (ПРИОРИТЕТ 3)

**Статус:** Планирование  
**Сроки:** 2-3 дня

#### 3.1 GET /api/v1/admin/registration-requests
- **Request:** Bearer token (admin only)
- **Response:** `{ ok, requests: [], total }`
- **Логика:** Получить список заявок на регистрацию (status="pending")

#### 3.2 POST /api/v1/admin/users/{id}/approve
- **Request:** `{ role? }`
- **Response:** `{ ok, user }`
- **Логика:**
  - Изменить status с "pending" на "active"
  - Назначить роль (по умолчанию "user")
  - Логировать в audit_logs

#### 3.3 POST /api/v1/admin/users/{id}/reject
- **Request:** `{ reason? }`
- **Response:** `{ ok }`
- **Логика:**
  - Изменить status на "rejected"
  - Логировать в audit_logs

#### 3.4 GET /api/v1/admin/users
- **Request:** Bearer token (admin only)
- **Response:** `{ ok, users: [], total }`
- **Логика:** Получить список всех пользователей

#### 3.5 POST /api/v1/admin/users/{id}/reset-password
- **Request:** Bearer token (admin only)
- **Response:** `{ ok, temp_password }`
- **Логика:**
  - Генерировать временный пароль (8-12 символов)
  - Хешировать временный пароль через bcrypt
  - Установить status = "password_reset_required"
  - Вернуть temp_password только в ответе (никогда не логировать)
  - Пользователь должен вызвать POST /api/v1/auth/change-password после входа
  - После смены пароля status = "active"
  - Логировать в audit_logs

#### 3.6 POST /api/v1/admin/users/{id}/assign-role
- **Request:** `{ role }`
- **Response:** `{ ok, user }`
- **Логика:**
  - Назначить роль пользователю
  - Установить managedOrgUnitId:
    - unit_manager: managedOrgUnitId = указанное подразделение
    - department_manager: managedOrgUnitId = указанный департамент
    - admin: managedOrgUnitId = null
    - user: managedOrgUnitId = null
  - Логировать в audit_logs

#### 3.7 POST /api/v1/admin/users/{id}/block
- **Request:** Bearer token (admin only)
- **Response:** `{ ok }`
- **Логика:**
  - Установить status = "blocked"
  - Логировать в audit_logs

#### 3.8 POST /api/v1/admin/users/{id}/unblock
- **Request:** Bearer token (admin only)
- **Response:** `{ ok }`
- **Логика:**
  - Установить status = "active"
  - Логировать в audit_logs

#### 3.9 PATCH /api/v1/admin/users/{id}
- **Request:** `{ displayName?, orgUnitId?, positionId? }`
- **Response:** `{ ok, user }`
- **Логика:**
  - Обновить профиль пользователя
  - Логировать изменения в audit_logs

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
- **Response:** `{ ok, last_sync_at, pending_count }`

---

### Фаза 5: Аудит (ПРИОРИТЕТ 5)

**Статус:** Планирование  
**Сроки:** 1-2 дня

#### 5.1 GET /api/v1/admin/audit-logs
- **Request:** Bearer token (admin only)
- **Response:** `{ ok, logs: [], total }`
- **Фильтры:** userId, action, startDate, endDate

#### 5.2 Audit Log Schema
```typescript
{
  id: number,
  userId: number,        // Who performed the action
  action: string,        // approve, reject, block, unblock, reset-password, assign-role, etc.
  targetUserId?: number, // Who was affected
  changes?: object,      // What changed
  timestamp: Date,
  ipAddress?: string,
  userAgent?: string
}
```

#### 5.3 Логируемые действия
- approve user
- reject user
- block user
- unblock user
- reset password
- assign role
- change orgUnitId
- change positionId
- create org unit
- update org unit
- create position
- update position

---

## 📊 Статус реализации

| Компонент | Статус | Комментарий |
|-----------|--------|-----------|
| **Клиент** | ✅ Готов | API типы, auth flow, sync service |
| **Auth endpoints** | ⏳ Ожидает | Нужно реализовать на Express |
| **Admin endpoints** | ⏳ Ожидает | Нужно реализовать на Express |
| **Справочники** | ⏳ Ожидает | Нужно реализовать на Express |
| **Синхронизация** | ⏳ Ожидает | Нужно реализовать на Express |
| **Аудит** | ⏳ Ожидает | Нужно реализовать на Express |
| **TypeScript** | ✅ 0 ошибок | Все исправлено |
| **Git** | ✅ Синхронизирован | Все изменения запушены |
| **Registration** | ✅ Контракт | Не возвращает токены, требует admin approval |
| **Reset Password** | ✅ Контракт | Возвращает tempPassword, требует смены при входе |
| **Seed скрипт** | ✅ Восстановлен | scripts/create-first-admin.ts готов |
| **Backend Stack** | ✅ Express/TS | Все endpoints в server/_core/ |
| **Public Directories** | ✅ Контракт | GET endpoints доступны без auth |
| **Audit Logging** | ✅ Контракт | Все admin действия логируются |

---

## 🔐 Требования безопасности

1. **JWT токены:**
   - Access token: 15-30 минут
   - Refresh token: 7 дней
   - Алгоритм: HS256

2. **Пароли:**
   - Хеширование: bcrypt
   - Никогда не хранить в открытом виде
   - Временные пароли генерируются и хешируются

3. **Аутентификация:**
   - Все endpoints требуют Bearer token (кроме login, register, health, public directories)
   - Проверка статуса пользователя (active/pending/blocked/password_reset_required)

4. **Авторизация:**
   - Admin endpoints: только для role="admin"
   - User endpoints: для role="user" и role="admin"
   - Public endpoints: доступны без аутентификации

5. **Аудит:**
   - Все admin действия логируются
   - Логи неизменяемы
   - Включают userId, action, targetUserId, changes, timestamp

---

## 📝 Контрольный список

- [x] Удалены все ссылки на drizzle/db из Expo приложения
- [x] Создан REST API клиент (lib/_core/api.ts)
- [x] Создана конфигурация API (lib/_core/api-config.ts)
- [x] Обновлены типы данных (shared/api-types.ts)
- [x] Переписан syncService для REST API
- [x] Исправлены все TypeScript ошибки
- [x] Восстановлен seed скрипт (scripts/create-first-admin.ts)
- [x] Исправлены планы (MVP_PLAN.md, MVP_TASKS.md)
- [x] Удалены реальные пароли из документации
- [x] Зафиксирован backend stack (Express/TypeScript)
- [ ] Реализованы Auth endpoints на сервере
- [ ] Протестирована аутентификация end-to-end
- [ ] Реализованы Admin endpoints
- [ ] Реализованы Справочники endpoints
- [ ] Реализовано Аудит логирование
- [ ] Протестирована синхронизация
- [ ] Развернуто на production

---

## 🚀 Следующие шаги

1. **Реализовать Auth endpoints** на Express сервере (server/_core/auth-api.ts)
   - Включает регистрацию, логин, refresh, logout, me, change-password
   - Используйте правильные endpoints из api-config.ts
   - Проверьте, что register НЕ возвращает токены
   - Проверьте, что resetPassword возвращает tempPassword

2. **Протестировать login/logout flow** с реальными credentials через seed скрипт

3. **Реализовать Admin endpoints** для управления пользователями

4. **Реализовать Справочники endpoints** (публичные для регистрации)

5. **Реализовать Аудит логирование** для всех admin действий

6. **Протестировать end-to-end синхронизацию**

---

## 📌 Важные примечания

- **Backend Stack:** Все endpoints реализуются в Express/TypeScript сервере в этом репозитории (server/_core/)
- **Внешний API:** Внешний backend (https://worktimeapi.duckdns.org) выходит за рамки этой задачи
- **Публичные справочники:** GET endpoints для org-units и positions доступны БЕЗ аутентификации (нужны для формы регистрации)
- **Регистрация:** НЕ возвращает токены, требует подтверждения администратором
- **Сброс пароля:** Генерирует временный пароль, требует смены при входе
- **Аудит:** Все admin действия должны логироваться в audit_logs
- **Роли:** user, unit_manager, department_manager, admin (с правильным managedOrgUnitId)
- **Забытый пароль:** Перемещен в Post-MVP (требует email/SMS)
